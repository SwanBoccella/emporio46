import { useEffect, useState, useRef, type RefObject } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useApp } from '../../context/AppContext'
import { runPreload } from '../../utils/preload'

const C = 2 * Math.PI * 70   // circonferenza dell'anello di progresso

// Emblema animato: anelli tratteggiati controrotanti, raggi che pulsano, gemme in orbita
// e un anello che si riempie con il progresso REALE del download (aggiornato via ref da Loader).
function Emblem({ ringRef, logoUrl }: { ringRef: RefObject<SVGCircleElement>; logoUrl?: string }) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const ctx = gsap.context(() => {
      gsap.to('#e-ring1', { rotation: 360, transformOrigin: '50% 50%', duration: 14, ease: 'none', repeat: -1 })
      gsap.to('#e-ring2', { rotation: -360, transformOrigin: '50% 50%', duration: 9, ease: 'none', repeat: -1 })
      gsap.to('#e-orbit1', { rotation: 360, transformOrigin: '100px 100px', duration: 3.2, ease: 'none', repeat: -1 })
      gsap.to('#e-orbit2', { rotation: -360, transformOrigin: '100px 100px', duration: 5.1, ease: 'none', repeat: -1 })
      gsap.fromTo('.e-tick', { opacity: 0.12 }, { opacity: 0.95, duration: 0.7, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: { each: 0.06, repeat: -1, yoyo: true } })
      gsap.fromTo('#e-logo', { scale: 0.96 }, { scale: 1.05, duration: 1.2, ease: 'sine.inOut', yoyo: true, repeat: -1, transformOrigin: '50% 50%' })
      gsap.fromTo('#e-glow', { opacity: 0.25, scale: 0.85 }, { opacity: 0.7, scale: 1.15, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1, transformOrigin: '50% 50%' })
    }, svg.parentElement || svg)
    return () => ctx.revert()
  }, [])

  return (
    <div style={{ position: 'relative', width: 200, height: 200 }}>
      <svg ref={svgRef} width="200" height="200" viewBox="0 0 200 200" fill="none" style={{ overflow: 'visible', position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id="e-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-primary-light, var(--color-primary))" />
            <stop offset="100%" stopColor="var(--color-primary)" />
          </linearGradient>
          <radialGradient id="e-rg"><stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.45" /><stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" /></radialGradient>
        </defs>
        <circle id="e-glow" cx="100" cy="100" r="82" fill="url(#e-rg)" />
        <circle id="e-ring1" cx="100" cy="100" r="94" stroke="var(--color-primary)" strokeWidth="1.2" strokeDasharray="5 9" opacity="0.65" />
        <circle id="e-ring2" cx="100" cy="100" r="58" stroke="var(--color-accent, var(--color-primary))" strokeWidth="1" strokeDasharray="2 6" opacity="0.6" />
        {Array.from({ length: 36 }).map((_, i) => (
          <line key={i} className="e-tick" x1="100" y1="1" x2="100" y2={i % 3 === 0 ? 11 : 6} stroke="var(--color-primary)" strokeWidth={i % 3 === 0 ? 2 : 1.2} strokeLinecap="round" transform={`rotate(${i * 10} 100 100)`} opacity="0.3" />
        ))}
        {/* binario + progresso reale */}
        <circle cx="100" cy="100" r="70" stroke="var(--color-primary)" strokeWidth="2" opacity="0.18" />
        <circle ref={ringRef} cx="100" cy="100" r="70" stroke="url(#e-grad)" strokeWidth="4" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C} transform="rotate(-90 100 100)" />
        {/* gemme in orbita */}
        <g id="e-orbit1"><polygon points="100,22 106,30 100,38 94,30" fill="var(--color-primary)" /></g>
        <g id="e-orbit2"><polygon points="100,166 105,172 100,178 95,172" fill="var(--color-primary-light, var(--color-primary))" opacity="0.8" /></g>
      </svg>
      {logoUrl
        ? <img id="e-logo" src={logoUrl} alt="" aria-hidden="true" style={{ position: 'absolute', left: 50, top: 50, width: 100, height: 100, objectFit: 'contain', borderRadius: '50%' }} />
        : <div id="e-logo" style={{ position: 'absolute', left: 50, top: 50, width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '2.4rem', color: 'var(--color-primary-text, var(--color-primary))' }}>46</div>}
    </div>
  )
}

const MIN_VISIBLE_MS = 1900   // abbastanza da far vedere l'animazione anche con cache calda
const STATUS: [number, string][] = [
  [0, 'Apro la bottega…'],
  [0.15, 'Carico le immagini…'],
  [0.45, 'Preparo il catalogo…'],
  [0.75, 'Scaldo la mappa…'],
  [0.95, 'Ultimi ritocchi…'],
]
const LETTERS = 'EMPORIO'.split('')

export default function Loader() {
  const { settings, catalog } = useApp()
  const [visible, setVisible] = useState(true)
  const barRef = useRef<HTMLDivElement>(null)
  const pctRef = useRef<HTMLSpanElement>(null)
  const ringRef = useRef<SVGCircleElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)
  const sparkRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Blocca lo scroll finché tutto non è pronto: le animazioni d'ingresso partono a loader chiuso
    const html = document.documentElement
    const prevOverflow = html.style.overflow
    html.style.overflow = 'hidden'

    const startedAt = performance.now()
    const state = { shown: 0 }          // progresso mostrato (animato con GSAP, mai a scatti)
    let target = 0
    let finished = false
    let tween: gsap.core.Tween | null = null

    const paint = () => {
      if (barRef.current) barRef.current.style.width = `${state.shown * 100}%`
      if (pctRef.current) pctRef.current.textContent = String(Math.round(state.shown * 100))
      if (ringRef.current) ringRef.current.style.strokeDashoffset = String(C * (1 - state.shown))
      if (statusRef.current) {
        const msg = [...STATUS].reverse().find(([t]) => state.shown >= t)?.[1] ?? STATUS[0][1]
        if (statusRef.current.textContent !== msg) statusRef.current.textContent = msg
      }
    }
    const setTarget = (p: number) => {
      target = Math.max(target, p)
      tween?.kill()
      tween = gsap.to(state, { shown: target, duration: 0.5, ease: 'power2.out', onUpdate: paint, onComplete: () => { if (target >= 1) finish() } })
    }
    const finish = () => {
      if (finished) return
      finished = true
      const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - startedAt))
      setTimeout(() => {
        // Ricalcolo posizioni ScrollTrigger e layout QUI, a loader ancora chiuso (non a sipario aperto)
        try { ScrollTrigger.refresh(true) } catch {}
        requestAnimationFrame(() => requestAnimationFrame(() => setVisible(false)))
      }, wait)
    }

    runPreload({ settings, catalog }, setTarget)

    // scintille (bijoux) che salgono dal basso, in loop
    const sparks = sparkRef.current?.querySelectorAll('.l-spark')
    const sctx = gsap.context(() => {
      sparks?.forEach((el, i) => {
        gsap.fromTo(el,
          { y: 30, opacity: 0, scale: 0.4, rotation: 0 },
          { y: -(160 + (i % 5) * 60), opacity: 0.9, scale: 1, rotation: 180, duration: 3.2 + (i % 4) * 0.6, ease: 'power1.out', repeat: -1, delay: (i * 0.37) % 3 })
      })
      gsap.to('.l-blob', { x: 'random(-60,60)', y: 'random(-60,60)', duration: 6, ease: 'sine.inOut', repeat: -1, repeatRefresh: true, yoyo: true })
    }, sparkRef)

    return () => { tween?.kill(); sctx.revert(); html.style.overflow = prevOverflow }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sblocca lo scroll e ricalcola ScrollTrigger quando il loader è uscito
  useEffect(() => {
    if (visible) return
    document.documentElement.style.overflow = ''
  }, [visible])

  return (
    <AnimatePresence
      onExitComplete={() => {
        // Affidabile: scatta quando il loader è davvero uscito dal DOM. Da qui partono titolo e animazioni del sito.
        ;(window as any).__e46LoaderDone = true
        window.dispatchEvent(new CustomEvent('loader-done'))
      }}
    >
      {visible && (
        <motion.div
          initial={{ y: 0 }}
          exit={{ y: '-100%' }}      // tendina che si alza: solo transform → animazione sul compositor, niente repaint
          transition={{ duration: 0.95, ease: [0.76, 0, 0.24, 1] }}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000, overflow: 'hidden', willChange: 'transform',
            background: 'var(--color-bg, #0a0805)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '1.8rem',
          }}
        >
          {/* sfondo vivo: macchie di colore alla deriva + scintille */}
          <div ref={sparkRef} aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            <div className="l-blob" style={{ position: 'absolute', left: '15%', top: '20%', width: '42vmax', height: '42vmax', borderRadius: '50%', background: 'radial-gradient(circle, rgba(var(--color-primary-rgb), 0.18), transparent 65%)' }} />
            <div className="l-blob" style={{ position: 'absolute', right: '8%', bottom: '10%', width: '36vmax', height: '36vmax', borderRadius: '50%', background: 'radial-gradient(circle, rgba(var(--color-primary-rgb), 0.14), transparent 65%)' }} />
            {Array.from({ length: 18 }).map((_, i) => (
              <svg key={i} className="l-spark" width={8 + (i % 4) * 4} height={8 + (i % 4) * 4} viewBox="0 0 24 24" style={{ position: 'absolute', left: `${(i * 53) % 100}%`, top: `${58 + (i * 17) % 40}%`, color: 'var(--color-primary-text, var(--color-primary))', opacity: 0 }}>
                <path d="M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z" fill="currentColor" />
              </svg>
            ))}
          </div>

          <motion.div
            style={{ position: 'relative', zIndex: 1 }}
            initial={{ opacity: 0, scale: 0.6, rotate: -25 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <Emblem ringRef={ringRef} logoUrl={settings.logoUrl} />
          </motion.div>

          {/* Titolo: le lettere salgono una a una */}
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <motion.div
              initial={{ opacity: 0, letterSpacing: '1.2em' }} animate={{ opacity: 1, letterSpacing: '0.65em' }} transition={{ delay: 0.2, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              style={{ fontFamily: 'var(--font-label)', fontSize: '0.66rem', color: 'var(--color-primary-text, var(--color-primary))', textTransform: 'uppercase', marginBottom: '0.8rem' }}
            >— Vintage —</motion.div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.2rem, 6vw, 3.6rem)', color: 'var(--color-text, #f5ede0)', lineHeight: 1.05, display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '0.05em' }}>
              {LETTERS.map((l, i) => (
                <span key={i} style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: '0.12em' }}>
                  <motion.span style={{ display: 'inline-block' }} initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ delay: 0.35 + i * 0.06, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>{l}</motion.span>
                </span>
              ))}
              <span style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: '0.12em', marginLeft: '0.3em' }}>
                <motion.em style={{ display: 'inline-block', color: 'var(--color-primary-text, var(--color-primary))' }} initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ delay: 0.85, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>46</motion.em>
              </span>
            </div>
          </div>

          {/* Percentuale grande + barra con riflesso + stato */}
          <motion.div
            style={{ position: 'relative', zIndex: 1, width: 'clamp(220px, 34vw, 320px)', textAlign: 'center' }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.7 }}
          >
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', lineHeight: 1, color: 'var(--color-primary-text, var(--color-primary))', marginBottom: '0.9rem', fontVariantNumeric: 'tabular-nums' }}>
              <span ref={pctRef}>0</span><span style={{ fontSize: '1rem', marginLeft: 2, opacity: 0.7 }}>%</span>
            </div>
            <div style={{ height: 4, background: 'rgba(var(--color-primary-rgb), 0.15)', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
              <div ref={barRef} style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, var(--color-primary-dark, var(--color-primary)), var(--color-primary), var(--color-primary-light, var(--color-primary)))', width: '0%', position: 'relative', overflow: 'hidden' }}>
                <span className="l-shine" />
              </div>
            </div>
            <div ref={statusRef} style={{ marginTop: '0.9rem', fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'color-mix(in srgb, var(--color-text-muted) 80%, transparent)', minHeight: '1em' }}>{STATUS[0][1]}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
