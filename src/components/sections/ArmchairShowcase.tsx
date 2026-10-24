// @ts-nocheck
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useApp } from '../../context/AppContext'
import { loadArmchair, armchairSource, sourceKey, resolveChapters, resolveLabel, signalArmchairReady } from '../../utils/armchair'

gsap.registerPlugin(ScrollTrigger)

/*
 * Poltrona 3D — attrazione principale del sito.
 * La sezione resta "pinnata" per ~4 schermate: lo scroll guida rotazione e zoom della
 * camera attraverso 4 capitoli (insieme, intagli, tappezzeria, ottone). Si può anche
 * trascinare per ruotare la poltrona in qualsiasi momento.
 */

// Keyframe della camera: p = progresso scroll 0..1
const KEYS = [
  { p: 0.00, yaw: 0.6,  dist: 3.7, ty: 0.62, pitch: 0.12 },
  { p: 0.25, yaw: -0.35, dist: 1.75, ty: 1.04, pitch: 0.04 },
  { p: 0.50, yaw: 0.9,  dist: 1.55, ty: 0.52, pitch: 0.48 },
  { p: 0.75, yaw: 2.3,  dist: 1.7,  ty: 0.24, pitch: 0.08 },
  { p: 1.00, yaw: 0.6 + Math.PI * 2, dist: 3.7, ty: 0.62, pitch: 0.12 },
]
// Desktop (schermo largo): la sedia resta SEMPRE intera nel quadro; cambiano solo rotazione e un lieve zoom.
// Il bersaglio verticale e la distanza minima derivano dalle dimensioni reali del modello (vedi frame()).
const KEYS_DESK = [
  { p: 0.00, yaw: 0.6,  dist: 3.3, ty: 0, pitch: 0.12 },
  { p: 0.25, yaw: -0.35, dist: 3.0, ty: 0, pitch: 0.06 },
  { p: 0.50, yaw: 0.9,  dist: 3.0, ty: 0, pitch: 0.22 },
  { p: 0.75, yaw: 2.3,  dist: 3.1, ty: 0, pitch: 0.08 },
  { p: 1.00, yaw: 0.6 + Math.PI * 2, dist: 3.3, ty: 0, pitch: 0.12 },
]
const REF_H = 1.234   // altezza del modello di default dopo la normalizzazione
const smooth = (t: number) => t * t * (3 - 2 * t)
function sampleKeys(p: number, keys = KEYS) {
  p = Math.min(1, Math.max(0, p))
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1]
    if (p <= b.p) {
      const t = smooth((p - a.p) / (b.p - a.p))
      return { yaw: a.yaw + (b.yaw - a.yaw) * t, dist: a.dist + (b.dist - a.dist) * t, ty: a.ty + (b.ty - a.ty) * t, pitch: a.pitch + (b.pitch - a.pitch) * t }
    }
  }
  return keys[keys.length - 1]
}

export default function ArmchairShowcase() {
  const { lang, settings, setContactTab } = useApp()
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasHostRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const [chapter, setChapter] = useState(0)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [hinted, setHinted] = useState(true)
  const chapterRef = useRef(0)
  const L = lang === 'en' ? 'en' : 'it'
  const chapters = resolveChapters(settings, L)
  const label = resolveLabel(settings, L)
  const src = armchairSource(settings)
  const modelKey = sourceKey(src)

  useEffect(() => {
    const host = canvasHostRef.current, stage = stageRef.current, section = sectionRef.current
    if (!host || !stage || !section) return
    setReady(false)

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    } catch { setFailed(true); signalArmchairReady(); return }

    const isCoarse = window.matchMedia?.('(pointer: coarse)').matches
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isCoarse ? 1.75 : 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab;'
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50)
    const pmrem = new THREE.PMREMGenerator(renderer)
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = envTex
    scene.environmentIntensity = 0.85

    const key = new THREE.DirectionalLight(0xffe0b0, 2.1); key.position.set(2.2, 3.2, 2.6); scene.add(key)
    const rim = new THREE.DirectionalLight(0xffc89a, 1.1); rim.position.set(-3, 2, -2.5); scene.add(rim)
    scene.add(new THREE.HemisphereLight(0xfff2de, 0x3a2515, 0.45))

    // Ombra morbida a terra (texture radiale, nessuna shadow map = leggero)
    const sc = document.createElement('canvas'); sc.width = sc.height = 256
    const sctx = sc.getContext('2d')!
    const grd = sctx.createRadialGradient(128, 128, 8, 128, 128, 128)
    grd.addColorStop(0, 'rgba(20,10,4,0.55)'); grd.addColorStop(0.55, 'rgba(20,10,4,0.2)'); grd.addColorStop(1, 'rgba(20,10,4,0)')
    sctx.fillStyle = grd; sctx.fillRect(0, 0, 256, 256)
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }))
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.002; scene.add(shadow)

    const pivot = new THREE.Group(); scene.add(pivot)

    // ── stato animazione ──
    const st = { progress: 0, shown: 0, userYaw: 0, dragging: false, visible: true, w: 1, h: 1, idleYaw: 0, stacked: false, desktop: false, cy: REF_H / 2, R: 0.75, fy: 1 }
    let disposed = false, raf = 0, last = performance.now(), modelReady = false

    const resize = () => {
      const w = host.clientWidth || 1, h = host.clientHeight || 1
      st.w = w; st.h = h
      st.stacked = !!window.matchMedia?.('(max-width: 860px), (max-aspect-ratio: 1/1)').matches   // stesso criterio del CSS: sedia sopra, testo sotto
      st.desktop = !!window.matchMedia?.('(min-width: 861px)').matches   // anche il "sito desktop" aperto da telefono
      renderer.setSize(w, h, false)
      camera.aspect = w / h; camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize); ro.observe(host); resize()

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      if (!modelReady || !st.visible || document.hidden || document.documentElement.dataset.menu === '1') { last = now; return }
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      // smorzamento esponenziale: rotazione fluida anche con scroll a scatti (rotella del mouse)
      st.shown += (st.progress - st.shown) * (1 - Math.exp(-dt * 5.5))
      if (!st.dragging) st.userYaw *= Math.exp(-dt * 0.9)
      if (reduced) st.idleYaw += dt * 0.25
      const s = sampleKeys(st.shown, st.desktop ? KEYS_DESK : KEYS)
      pivot.rotation.y = s.yaw + st.userYaw + st.idleYaw
      const asp = st.w / st.h
      const wide = !st.stacked && asp > 1.05                         // desktop: sedia a destra, testo a sinistra
      const aspectFit = asp >= 0.9 ? 1 : Math.min(1.5, 0.9 / asp + 0.1)          // stretto: allontana per tenere la sedia nel quadro
      let d = s.dist * aspectFit
      let ty = s.ty * st.fy
      if (st.desktop) {
        // sedia (o qualsiasi modello) sempre intera: la sfera che contiene il modello deve stare nel quadro
        const tanHalf = Math.tan(THREE.MathUtils.degToRad(16))
        d = Math.max(d, (st.R * 1.14) / (tanHalf * Math.min(1, asp)))
        ty = st.cy
      }
      const shiftX = wide ? 0.16 * d : 0                                          // desktop: sedia a destra, testo a sinistra
      const cp = Math.cos(s.pitch), sp = Math.sin(s.pitch)
      camera.position.set(-shiftX, ty + sp * d, cp * d)
      camera.lookAt(-shiftX, ty, 0)
      renderer.render(scene, camera)
    }

    // Modello: già scaricato dal preloader (promise condivisa)
    loadArmchair(src).then(model => {
      if (disposed) return
      pivot.add(model)
      // Misura reale del modello (anche se sostituito da admin): centro verticale e raggio della sfera contenitrice
      try {
        const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3())
        st.cy = Math.max(0.05, size.y / 2)
        st.R = Math.max(0.2, 0.5 * Math.sqrt(size.x * size.x + size.y * size.y + size.z * size.z))
        st.fy = Math.min(1.6, Math.max(0.25, size.y / REF_H))
      } catch {}
      renderer.compile(scene, camera)     // compila gli shader ora (dietro al loader), non al primo scroll
      modelReady = true
      renderer.render(scene, camera)      // primo frame: carica le texture in GPU
      setReady(true)
      signalArmchairReady()               // il loader attende questo segnale prima di aprire il sito
    }).catch(() => { setFailed(true); signalArmchairReady() })
    raf = requestAnimationFrame(frame)

    // Rendering solo quando la sezione è visibile
    const io = new IntersectionObserver(([e]) => { st.visible = e.isIntersecting }, { rootMargin: '200px 0px' })
    io.observe(section)

    // Scroll → progresso (sezione pinnata per 4 schermate)
    let trigger: ScrollTrigger | null = null
    if (!reduced) {
      trigger = ScrollTrigger.create({
        trigger: section, start: 'top top', end: '+=400%', pin: stage, pinSpacing: true, anticipatePin: 1,
        onUpdate: self => {
          st.progress = self.progress
          if (barRef.current) barRef.current.style.transform = `scaleY(${self.progress})`
          const idx = Math.min(3, Math.floor(self.progress * 4))
          if (idx !== chapterRef.current) { chapterRef.current = idx; setChapter(idx) }
          if (self.progress > 0.02) setHinted(false)
        },
      })
    }

    // Drag per ruotare
    let lastX = 0
    const down = (e: PointerEvent) => { st.dragging = true; lastX = e.clientX; renderer.domElement.setPointerCapture(e.pointerId); renderer.domElement.style.cursor = 'grabbing'; setHinted(false) }
    const move = (e: PointerEvent) => { if (!st.dragging) return; st.userYaw += (e.clientX - lastX) * 0.012; lastX = e.clientX }
    const up = (e: PointerEvent) => { st.dragging = false; renderer.domElement.style.cursor = 'grab'; try { renderer.domElement.releasePointerCapture(e.pointerId) } catch {} }
    const el = renderer.domElement
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up)

    return () => {
      disposed = true
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); trigger?.kill()
      el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up)
      pivot.clear()   // il modello è condiviso/cached: non lo distruggiamo
      envTex.dispose(); pmrem.dispose(); shadow.geometry.dispose(); shadow.material.map?.dispose(); shadow.material.dispose()
      renderer.dispose()
      if (host.contains(el)) host.removeChild(el)
    }
  }, [modelKey])

  const goRequest = () => {
    setContactTab('request', { note: L === 'en' ? 'I would like information about a piece similar to the one in the 3D showcase.' : 'Vorrei informazioni su un pezzo simile a quello della vetrina 3D.' })
    setTimeout(() => document.getElementById('contatti')?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  if (failed) return null   // niente WebGL: la landing prosegue senza la sezione

  return (
    <section id="poltrona" ref={sectionRef} style={{ position: 'relative', background: 'var(--color-bg-alt, #140e08)' }}>
      <div ref={stageRef} style={{ position: 'relative', height: '100svh', minHeight: 560, overflow: 'hidden', isolation: 'isolate' }}>
        {/* Spot di luce dietro la sedia */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: -2, background: 'radial-gradient(ellipse 55% 60% at 68% 52%, rgba(var(--color-primary-rgb), 0.20) 0%, transparent 70%)' }} />
        {/* Scritta gigante in outline */}
        <div aria-hidden="true" style={{ position: 'absolute', right: '-2%', bottom: '-6%', zIndex: -1, fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 'clamp(14rem, 38vw, 34rem)', lineHeight: 0.8, color: 'transparent', WebkitTextStroke: '1.5px rgba(var(--color-primary-rgb), 0.18)', userSelect: 'none', pointerEvents: 'none' }}>46</div>

        {/* Canvas WebGL */}
        <div ref={canvasHostRef} className="arm-canvas" style={{ position: 'absolute', inset: 0, opacity: ready ? 1 : 0, transition: 'opacity 0.9s ease' }} />

        {/* Titolo + capitoli */}
        <div className="arm-text" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 clamp(1.5rem,7vw,8rem)' }}>
          <p className="section-label" style={{ marginBottom: '1.2rem' }}>{label}</p>
          <div className="gold-rule" style={{ marginBottom: '1.8rem' }} />
          <div className="arm-copy" style={{ position: 'relative', maxWidth: 440, minHeight: 250 }}>
            {chapters.map((c, i) => (
              <div key={i} style={{ position: i === 0 ? 'relative' : 'absolute', top: 0, left: 0, right: 0, opacity: chapter === i ? 1 : 0, transform: chapter === i ? 'translateY(0)' : 'translateY(18px)', transition: 'opacity 0.6s ease, transform 0.8s cubic-bezier(0.16,1,0.3,1)', pointerEvents: chapter === i ? 'auto' : 'none' }}>
                <p style={{ fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'var(--color-primary-text, var(--color-primary))', marginBottom: '0.9rem' }}>
                  {String(i + 1).padStart(2, '0')} — {c.k}
                </p>
                <h2 className="arm-h2" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem,4.6vw,3.6rem)', fontWeight: 400, lineHeight: 1.08, color: 'var(--color-text)', marginBottom: '1.2rem' }}>{c.t}</h2>
                <p className="arm-desc" style={{ fontFamily: 'var(--font-body)', fontSize: '1.02rem', lineHeight: 1.7, color: 'var(--color-text-muted)' }}>{c.d}</p>
              </div>
            ))}
          </div>
          <button onClick={goRequest} style={{ pointerEvents: 'auto', marginTop: '2rem', alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '0.7rem', padding: '0.95rem 1.8rem', borderRadius: 999, background: 'var(--color-primary)', color: 'var(--color-bg)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-label)', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            {L === 'en' ? 'Ask for a similar piece' : 'Chiedi un pezzo simile'} →
          </button>
        </div>

        {/* Indicatore di avanzamento + hint */}
        <div aria-hidden="true" style={{ position: 'absolute', right: 'clamp(0.8rem,2vw,2rem)', top: '20%', bottom: '20%', width: 2, background: 'rgba(var(--color-primary-rgb), 0.15)' }}>
          <div ref={barRef} style={{ width: '100%', height: '100%', background: 'var(--color-primary)', transformOrigin: 'top', transform: 'scaleY(0)' }} />
        </div>
        <div aria-hidden="true" className="arm-hint" style={{ position: 'absolute', left: '50%', bottom: '1.6rem', transform: 'translateX(-50%)', fontFamily: 'var(--font-label)', fontSize: '0.6rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--color-text-muted)', opacity: hinted && ready ? 0.85 : 0, transition: 'opacity 0.6s', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          {L === 'en' ? 'Scroll or drag to rotate' : 'Scorri o trascina per ruotare'}
        </div>

        <style>{`
          /* Layout "impilato": schermi stretti OPPURE verticali (anche con il sito desktop su telefono/tablet):
             sedia nella parte alta, testo sotto — mai sovrapposti, spazio sempre riempito */
          @media (max-width: 860px), (max-aspect-ratio: 1/1) {
            #poltrona .arm-canvas { inset: 0 0 auto 0 !important; height: 52% !important; }
            #poltrona .arm-text { inset: 52% 0 0 0 !important; justify-content: center !important; padding-top: 0.4rem !important; padding-bottom: 1.4rem !important; }
            #poltrona .arm-copy { max-width: min(100%, 44rem) !important; min-height: 0 !important; height: clamp(14.5rem, 34vw, 19rem); }
            #poltrona .arm-h2 { font-size: clamp(1.5rem, 5.6vw, 3rem) !important; margin-bottom: 0.7rem !important; }
            #poltrona .arm-desc { font-size: clamp(0.9rem, 2vw, 1.1rem) !important; line-height: 1.55 !important; }
            #poltrona .arm-text .section-label { margin-bottom: 0.5rem !important; }
            #poltrona .arm-text .gold-rule { margin-bottom: 0.9rem !important; }
            #poltrona .arm-text button { margin-top: 0.8rem !important; padding: 0.8rem 1.4rem !important; }
            #poltrona .arm-hint { bottom: auto !important; top: calc(52% - 1.8rem) !important; }
          }
          /* Desktop (anche "sito desktop" da telefono) in verticale: più spazio al modello, descrizione più in basso */
          @media (min-width: 861px) and (max-aspect-ratio: 1/1) {
            #poltrona .arm-canvas { height: 64% !important; }
            #poltrona .arm-text { inset: 64% 0 0 0 !important; padding-bottom: 1rem !important; }
            #poltrona .arm-copy { height: clamp(10rem, 22vw, 13.5rem) !important; }
            #poltrona .arm-text .gold-rule { display: none !important; }
            #poltrona .arm-hint { top: calc(64% - 1.8rem) !important; }
          }
          /* Desktop largo: testo in basso a sinistra, modello intero a destra */
          @media (min-width: 861px) and (min-aspect-ratio: 101/100) {
            #poltrona .arm-text { justify-content: flex-end !important; padding-bottom: clamp(2.5rem, 7vh, 5rem) !important; }
          }
        `}</style>
      </div>
    </section>
  )
}
