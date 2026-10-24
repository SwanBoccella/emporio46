import { useEffect, useRef, useState, useCallback, Fragment } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import * as THREE from 'three'
import { useApp } from '../../context/AppContext'
import SectionBackdrop from '../ui/SectionBackdrop'
import HeroOrb from '../ui/HeroOrb'
import { markReady } from '../../utils/warmup'

gsap.registerPlugin(ScrollTrigger)

// Colore principale del tema (hex) -> [r,g,b], per i contesti JS (three.js / canvas)
function hexToRgb(hex: string | undefined, fb: [number, number, number] = [196, 86, 31]): [number, number, number] {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return fb
  const h = m[1].length === 3 ? m[1].split('').map(c => c + c).join('') : m[1]
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function ThreeBackground() {
  const mountRef = useRef<HTMLDivElement>(null)
  const { settings } = useApp()
  useEffect(() => {
    const mount = mountRef.current; if (!mount) return
    const W = mount.clientWidth || 1, H = mount.clientHeight || 1
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ antialias: dpr < 1.5, alpha: true, powerPreference: 'high-performance' }) }
    catch { markReady('hero-three'); return }
    renderer.setSize(W, H); renderer.setPixelRatio(dpr)
    renderer.setClearColor(0x000000, 0); mount.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 100); camera.position.z = 5
    const orbs: { mesh: THREE.Mesh; vx: number; vy: number; vz: number }[] = []
    const [pr, pg, pb] = hexToRgb(settings.primaryColor)
    const gold = new THREE.Color(`rgb(${pr},${pg},${pb})`)
    const orbColors = [gold, gold.clone().lerp(new THREE.Color(0xffffff), 0.32), gold.clone().lerp(new THREE.Color(0x000000), 0.2), new THREE.Color(0xf5ede0), new THREE.Color(0x9a8a78)]
    for (let i = 0; i < 22; i++) {
      const geo = new THREE.SphereGeometry(Math.random() * 0.18 + 0.04, 12, 12)
      const mat = new THREE.MeshBasicMaterial({ color: orbColors[Math.floor(Math.random() * orbColors.length)], transparent: true, opacity: Math.random() * 0.12 + 0.02 })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 7, (Math.random() - 0.5) * 3)
      scene.add(mesh); orbs.push({ mesh, vx: (Math.random() - 0.5) * 0.003, vy: (Math.random() - 0.5) * 0.002, vz: (Math.random() - 0.5) * 0.001 })
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.006, 8, 120), new THREE.MeshBasicMaterial({ color: gold, transparent: true, opacity: 0.07 }))
    ring.rotation.x = Math.PI / 2.4; scene.add(ring)

    // Shader compilati e primo frame disegnato ORA (durante il loader), non quando il sito si apre
    try { renderer.compile(scene, camera) } catch {}
    renderer.render(scene, camera)
    markReady('hero-three')

    let rafId = 0, visible = true
    const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(([e]) => { visible = e.isIntersecting }, { threshold: 0 }) : null
    io?.observe(mount)
    const animate = () => {
      rafId = requestAnimationFrame(animate)
      // fuori dall'Hero (o tab/menu nascosti) non si disegna nulla
      if (!visible || document.hidden || document.documentElement.dataset.menu === '1') return
      const t = Date.now() * 0.0003
      orbs.forEach(({ mesh, vx, vy, vz }) => {
        mesh.position.x += vx; mesh.position.y += vy; mesh.position.z += vz
        if (Math.abs(mesh.position.x) > 7) mesh.position.x *= -0.9
        if (Math.abs(mesh.position.y) > 4.5) mesh.position.y *= -0.9
        if (Math.abs(mesh.position.z) > 2.5) mesh.position.z *= -0.9
      })
      ring.rotation.z = t * 0.3; ring.rotation.y = Math.sin(t * 0.5) * 0.15
      renderer.render(scene, camera)
    }
    rafId = requestAnimationFrame(animate)
    let lw = W, lh = H
    const onResize = () => {
      const nW = mount.clientWidth, nH = mount.clientHeight
      if (!nW || !nH || (nW === lw && nH === lh)) return
      lw = nW; lh = nH
      camera.aspect = nW / nH; camera.updateProjectionMatrix(); renderer.setSize(nW, nH)
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(rafId); io?.disconnect(); window.removeEventListener('resize', onResize)
      scene.traverse((o: any) => { o.geometry?.dispose?.(); o.material?.dispose?.() })
      renderer.dispose(); if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [])
  return <div ref={mountRef} style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }} />
}

function HeroCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  const { settings } = useApp()
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) { markReady('hero-canvas'); return }
    const [gr, gg, gb] = hexToRgb(settings.primaryColor)
    const colA = `rgb(${gr},${gg},${gb})`
    let W = 0, H = 0, rafId = 0, visible = true
    const resize = () => {
      const w = canvas.offsetWidth, h = canvas.offsetHeight
      if (!w || !h || (w === W && h === H)) return
      W = canvas.width = w; H = canvas.height = h
    }
    resize(); window.addEventListener('resize', resize)
    type P = { x: number; y: number; size: number; sx: number; sy: number; alpha: number; gold: boolean; pulse: number }
    const particles: P[] = []
    for (let i = 0; i < 140; i++) particles.push({ x: Math.random() * W, y: Math.random() * H, size: Math.random() * 1.6 + 0.2, sx: (Math.random() - 0.5) * 0.25, sy: -Math.random() * 0.35 - 0.04, alpha: Math.random() * 0.5 + 0.06, gold: Math.random() > 0.5, pulse: Math.random() * Math.PI * 2 })
    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      // un solo fillStyle e globalAlpha per particella: niente stringhe colore ricreate a ogni frame
      ctx.fillStyle = colA
      for (const p of particles) {
        p.x += p.sx; p.y += p.sy; p.pulse += 0.013
        if (p.y < -10) { p.y = H + 5; p.x = Math.random() * W }
        if (p.x < -10) p.x = W + 5; if (p.x > W + 10) p.x = -5
        const a = p.alpha * (0.7 + 0.3 * Math.sin(p.pulse))
        ctx.globalAlpha = p.gold ? a : a * 0.3
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = 1
    }
    const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(([e]) => { visible = e.isIntersecting }, { threshold: 0 }) : null
    io?.observe(canvas)
    draw(); markReady('hero-canvas')      // primo frame durante il loader
    const animate = () => {
      rafId = requestAnimationFrame(animate)
      if (!visible || document.hidden || document.documentElement.dataset.menu === '1') return
      draw()
    }
    rafId = requestAnimationFrame(animate)
    return () => { cancelAnimationFrame(rafId); io?.disconnect(); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 2 }} />
}

// Genera percorso caotico deterministico per ogni lettera
function charChaos(i: number, seed: number) {
  // LCG pseudo-random deterministico (no Math.random per evitare re-render diversi)
  const r = (n: number) => { const x = Math.sin(n * 9301 + seed * 49297 + 233) * 10000; return x - Math.floor(x) }
  const angle  = r(i * 3 + 1) * 720 - 360          // rotazione da -360 a +360
  const scaleI = 0.3 + r(i * 3 + 2) * 1.8           // scala iniziale 0.3–2.1
  const tx     = (r(i * 3 + 3) - 0.5) * 900         // x da -450 a +450
  const ty     = (r(i * 7 + 1) - 0.5) * 700         // y da -350 a +350
  const blur   = 2 + r(i * 2 + 5) * 4               // blur 2–6px (più leggero da animare)
  return { angle, scaleI, tx, ty, blur }
}

function SplitText({ text, style, delay = 0, seed = 42, ready = true }: { text: string; style?: React.CSSProperties; delay?: number; seed?: number; ready?: boolean }) {
  const chars = text.split('')
  // Stagger irregolare: lettere centrali arrivano prima, estreme dopo
  const stagger = (i: number, total: number) => {
    const center = total / 2
    const dist = Math.abs(i - center) / center   // 0=centro, 1=estremo
    const base = delay + i * 0.045
    const jitter = Math.sin(i * 2.4 + seed) * 0.08
    return base + dist * 0.15 + jitter
  }

  const words = text.split(' ')
  let idx = 0
  return (
    <span style={{ display: 'inline-block', maxWidth: '100%', ...style }}>
      {words.map((word, wi) => (
        <Fragment key={wi}>
        <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
          {word.split('').map(char => {
            const i = idx++
            const { angle, scaleI, tx, ty, blur } = charChaos(i, seed)
            const dur = 1.05 + Math.sin(i * 1.7 + seed) * 0.25
            const delayI = stagger(i, chars.length)
            return (
              <motion.span
                key={i}
                style={{ display: 'inline-block', willChange: 'transform, opacity, filter' }}
                initial={{ x: tx, y: ty, rotate: angle, scale: scaleI, opacity: 0, filter: `blur(${blur}px)` }}
                animate={ready ? { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1, filter: 'blur(0px)' } : {}}
                transition={{
                  duration: dur, delay: delayI, ease: [0.12, 0.9, 0.25, 1.02],
                  opacity: { duration: dur * 0.6, delay: delayI },
                  filter: { duration: dur * 0.7, delay: delayI },
                }}
              >
                {char}
              </motion.span>
            )
          })}
        </span>
        {wi < words.length - 1 && ' '}
        </Fragment>
      ))}
    </span>
  )
}

function MagneticButton({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  const ref = useRef<HTMLButtonElement>(null)
  const x = useMotionValue(0); const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 220, damping: 18 }); const sy = useSpring(y, { stiffness: 220, damping: 18 })
  const handleMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current; if (!el) return
    const rect = el.getBoundingClientRect()
    x.set((e.clientX - rect.left - rect.width / 2) * 0.35)
    y.set((e.clientY - rect.top - rect.height / 2) * 0.35)
  }, [x, y])
  const handleLeave = useCallback(() => { x.set(0); y.set(0) }, [x, y])
  return (
    <motion.button ref={ref} className={className} style={{ x: sx, y: sy }}
      onMouseMove={handleMove} onMouseLeave={handleLeave} onClick={onClick} whileTap={{ scale: 0.96 }}>
      {children}
    </motion.button>
  )
}

function ScrollVelocityBar({ ready = true }: { ready?: boolean }) {
  // Nessuno stato React: la barra si aggiorna direttamente sul DOM dal ticker GSAP (prima ogni evento di scroll causava un re-render)
  const fillRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = fillRef.current; if (!el) return
    let lastY = window.scrollY, lastT = performance.now(), v = 0, shown = -1
    const onTick = () => {
      const now = performance.now(), dt = Math.max(1, now - lastT), y = window.scrollY
      const inst = Math.min(Math.abs(y - lastY) / dt * 14, 100)
      lastY = y; lastT = now
      v = inst > v ? inst : v + (inst - v) * 0.18      // sale subito, scende morbida
      if (Math.abs(v - shown) < 0.4) return
      shown = v
      el.style.transform = `scaleY(${Math.max(v + 8, 8) / 100})`
      el.style.opacity = v > 2 ? '1' : '0.2'
    }
    gsap.ticker.add(onTick)
    return () => { gsap.ticker.remove(onTick) }
  }, [])
  return (
    <motion.div style={{ position: 'absolute', bottom: '5rem', left: 'clamp(1.5rem,4vw,4rem)', zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}
      initial={{ opacity: 0, x: -16 }} animate={ready ? { opacity: 1, x: 0 } : {}} transition={{ delay: 1.9, duration: 0.7 }}>
      <div style={{ fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.35em', color: 'var(--color-text-muted)', textTransform: 'uppercase', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Scroll</div>
      <div style={{ width: 1, height: 70, background: 'rgba(var(--color-primary-rgb), 0.1)', position: 'relative', overflow: 'hidden' }}>
        <div ref={fillRef} style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--color-primary), rgba(var(--color-primary-rgb), 0.3))', transformOrigin: 'bottom', transform: 'scaleY(0.08)', opacity: 0.2, willChange: 'transform, opacity', transition: 'opacity .12s' }} />
      </div>
    </motion.div>
  )
}

export default function HeroSection() {
  const { t, lang, setContactTab, settings, settingsEn } = useApp()
  const sectionRef = useRef<HTMLElement>(null)
  const bgRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  // Gate: animations only play after the loader's exit animation has completed
  const [loaderReady, setLoaderReady] = useState(false)

  useEffect(() => {
    const onLoaderDone = () => setLoaderReady(true)
    window.addEventListener('loader-done', onLoaderDone)
    if ((window as any).__e46LoaderDone) setLoaderReady(true)
    // Fallback di sicurezza (il preloader ha un tetto di ~70s + uscita)
    const fallback = setTimeout(() => setLoaderReady(true), 90000)
    return () => {
      window.removeEventListener('loader-done', onLoaderDone)
      clearTimeout(fallback)
    }
  }, [])

  useEffect(() => {
    const section = sectionRef.current, bg = bgRef.current
    if (!section || !bg) return
    const tl = gsap.timeline({ scrollTrigger: { trigger: section, start: 'top top', end: 'bottom top', scrub: true } })
    tl.to(bg, { y: '22%', ease: 'none' }, 0)
    if (contentRef.current) tl.fromTo(contentRef.current, { y: '0%', opacity: 1 }, { y: '12%', opacity: 0.3, ease: 'none' }, 0)
    return () => { tl.kill() }
  }, [])

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const goToContact = (tab: 'book' | 'request' | 'estimate', prefill?: import('../context/AppContext').ContactPrefill) => {
    setContactTab(tab, prefill ?? {})
    setTimeout(() => scrollTo('contatti'), 50)
  }

  return (
    <section id="hero" ref={sectionRef} className="relative flex flex-col items-center justify-center overflow-hidden" style={{ background: 'var(--color-bg, #070503)', isolation: 'isolate', minHeight: 'min(100svh, 58rem)' }}>
      <SectionBackdrop slot="hero" ref={bgRef} scale={1.1} />
      <ThreeBackground />
      <HeroCanvas />
      <div className="absolute inset-0" style={{ zIndex: 2, opacity: 0.07 }}>
        <div style={{ position: 'absolute', left: '14%', top: 0, bottom: 0, width: 1, background: 'linear-gradient(to bottom, transparent, var(--color-primary), transparent)' }} />
        <div style={{ position: 'absolute', right: '14%', top: 0, bottom: 0, width: 1, background: 'linear-gradient(to bottom, transparent, var(--color-primary), transparent)' }} />
        <div style={{ position: 'absolute', top: '18%', left: '14%', right: '14%', height: 1, background: 'linear-gradient(to right, transparent, var(--color-primary), transparent)' }} />
        <div style={{ position: 'absolute', bottom: '18%', left: '14%', right: '14%', height: 1, background: 'linear-gradient(to right, transparent, var(--color-primary), transparent)' }} />
      </div>

      <div className="hero-grid relative" style={{ zIndex: 3, width: '100%', maxWidth: 1320, margin: '0 auto', padding: 'clamp(5.5rem, 11vh, 7.5rem) clamp(1.5rem, 6vw, 5rem) clamp(4.5rem, 9vh, 6rem)', display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 0.65fr)', alignItems: 'center', gap: '2rem' }}>
      <div ref={contentRef} className="relative text-left">
        <motion.p className="section-label mb-8" style={{ justifyContent: 'flex-start' }}
          initial={{ opacity: 0, y: 20 }} animate={loaderReady ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          {t.hero.label}
        </motion.p>

        <h1 style={{ fontFamily: 'var(--font-display)', lineHeight: 0.95, marginBottom: '1.3rem' }}>
          <div style={{ overflow: 'hidden', display: 'block' }}>
            <SplitText text={t.hero.title1} delay={0.18} seed={17} ready={loaderReady} style={{ fontSize: 'clamp(3.4rem, 8.4vw, 8.6rem)', color: 'var(--color-text)', fontWeight: 400, letterSpacing: '-0.01em' }} />
          </div>
          <div style={{ overflow: 'hidden', display: 'block' }}>
            <SplitText text={t.hero.title2} delay={0.52} seed={83} ready={loaderReady} style={{ fontSize: 'clamp(3.4rem, 8.4vw, 8.6rem)', color: 'var(--color-primary-text, var(--color-primary))', fontStyle: 'italic', fontWeight: 400, letterSpacing: '-0.01em' }} />
          </div>
        </h1>

        <motion.p style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(1.05rem, 2vw, 1.35rem)', color: 'var(--color-text)', maxWidth: 500, margin: '0 0 2rem', lineHeight: 1.7, fontStyle: 'italic', fontWeight: 300, textShadow: '0 0 3px rgba(var(--text-halo-rgb), 0.9), 0 1px 14px rgba(var(--text-halo-rgb), 0.7)' }}
          initial={{ opacity: 0, y: 20 }} animate={loaderReady ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.98, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          {(lang === 'en' ? (settingsEn.leadText || t.hero.lead) : (settings.leadText || t.hero.lead)).split('\n').map((line, i) => <span key={i}>{line}{i === 0 && <br />}</span>)}
        </motion.p>

        <motion.div className="flex gap-5 flex-wrap" style={{ justifyContent: 'flex-start' }}
          initial={{ opacity: 0, y: 20 }} animate={loaderReady ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1.18, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          <MagneticButton className="btn-gold" onClick={() => scrollTo('catalogo')}>
            <span>{t.hero.cta1}</span>
          </MagneticButton>
          <MagneticButton className="btn-ghost" onClick={() => goToContact('book', { note: t.catalog.bookPrefill })}>
            {t.hero.cta2}
          </MagneticButton>
        </motion.div>
      </div>
        <HeroOrb label={t.hero.label} />
      </div>

      <ScrollVelocityBar ready={loaderReady} />

      <motion.div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{ zIndex: 3, fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.42em', textTransform: 'uppercase', color: 'var(--color-primary-text, var(--color-primary))' }}
        initial={{ opacity: 0 }} animate={loaderReady ? { opacity: 1 } : {}} transition={{ delay: 1.7, duration: 0.6 }}>
        <span>{t.hero.scroll}</span>
        <div style={{ width: 1, height: 52, overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, var(--color-primary, #c9a84c), transparent)', animation: 'scrollLine 2.4s ease-in-out infinite' }} />
        </div>
        <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}>
          <svg width="14" height="8" viewBox="0 0 14 8" fill="none">
            <path d="M1 1L7 7L13 1" stroke="rgba(var(--color-primary-rgb), 0.55)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      </motion.div>

    </section>
  )
}
