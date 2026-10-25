// @ts-nocheck
import { useRef, useEffect, useState } from 'react'
import { motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useApp } from '../../context/AppContext'
import SectionBackdrop from '../ui/SectionBackdrop'
import { REVEAL_VP } from '../../utils/reveal'

gsap.registerPlugin(ScrollTrigger)



/* Animated counter */
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })
  useEffect(() => {
    if (!inView) return
    let start = 0
    const step = target / 60
    const id = setInterval(() => {
      start += step
      if (start >= target) { setCount(target); clearInterval(id) }
      else setCount(Math.floor(start))
    }, 16)
    return () => clearInterval(id)
  }, [inView, target])
  return <span ref={ref}>{count}{suffix}</span>
}

/* Parallax image with cursor follow tilt */
function TiltImage({ src, alt, sepia = 0.25, brightness = 0.82, opacity = 1 }: { src: string; alt: string; sepia?: number; brightness?: number; opacity?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const rotX = useMotionValue(0)
  const rotY = useMotionValue(0)
  const sx = useSpring(rotX, { stiffness: 100, damping: 25 })
  const sy = useSpring(rotY, { stiffness: 100, damping: 25 })

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current; if (!el) return
    const rect = el.getBoundingClientRect()
    rotX.set(((e.clientY - rect.top - rect.height / 2) / rect.height) * -6)
    rotY.set(((e.clientX - rect.left - rect.width / 2) / rect.width) * 6)
  }
  const handleLeave = () => { rotX.set(0); rotY.set(0) }

  return (
    <motion.div ref={ref} style={{ rotateX: sx, rotateY: sy, transformStyle: 'preserve-3d', perspective: 1000, position: 'absolute', inset: 0 }}
      onMouseMove={handleMove} onMouseLeave={handleLeave}>
      <div className="frame-corners" style={{ position: 'absolute', inset: 0, overflow: 'hidden', border: '1px solid rgba(var(--color-primary-rgb), 0.1)' }}>
        <motion.img src={src} alt={alt}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', filter: `sepia(${sepia}) brightness(${brightness})`, opacity }}
          whileHover={{ scale: 1.06, filter: `sepia(0.1) brightness(${Math.min(1, brightness + 0.1)})`, opacity: 1 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} />
        {/* Gradient più profondo per leggibilità quote */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(var(--color-bg-rgb), 0.75) 0%, rgba(var(--color-bg-rgb), 0.15) 45%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Inner glow on hover */}
        <motion.div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.06), transparent 60%)', opacity: 0 }}
          whileHover={{ opacity: 1 }} transition={{ duration: 0.5 }} />
      </div>
    </motion.div>
  )
}

export default function AboutSection() {
  const { t, lang, settings, settingsEn } = useApp()
  // Statistiche: mostrate solo se valorizzate dall'admin
  const statList = ([
    [String(settings.statAnni ?? ''), '+', lang === 'it' ? 'Anni di Esperienza' : 'Years of Experience'],
    [String(settings.statOggetti ?? ''), '+', lang === 'it' ? 'Oggetti Unici' : 'Unique Objects'],
    [String(settings.statRating ?? ''), '★', lang === 'it' ? 'Rating Clienti' : 'Client Rating'],
  ] as [string, string, string][]).filter(([n]) => parseFloat(n) > 0)
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })
  // Use whyItems from settingsEn (EN+AI) or settings (IT), fallback translations
  const vals = lang === 'en'
    ? (settingsEn.whyItems?.map(i => i.title) || t.why.items.map(i => i.title))
    : (settings.whyItems && settings.whyItems.length > 0 ? settings.whyItems.map(i => i.title) : t.why.items.map(i => i.title))
  const imgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const img = imgRef.current; if (!img) return
    const tween = gsap.fromTo(img, { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: true } })
    return () => { tween.kill() }
  }, [])

  return (
    <section id="about" ref={ref} style={{ background: 'var(--color-bg, #0a0805)', position: 'relative', overflow: 'hidden', isolation: 'isolate' }}>
      <SectionBackdrop slot="about" />
      {/* Ambient glow */}
      <div style={{ position: 'absolute', top: '50%', left: '25%', transform: 'translate(-50%,-50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(var(--color-primary-rgb), 0.035) 0%, transparent 65%)', pointerEvents: 'none' }} />

      <div className="about-grid" style={{ padding: '10rem clamp(1.5rem,7vw,8rem)' }}>
        {/* Image side */}
        <motion.div style={{ position: 'relative', height: '100%', minHeight: 520 }}
          initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={REVEAL_VP}
          transition={{ duration: 1.76, ease: [0.16, 1, 0.3, 1] }}>

          {/* Wrapper che occupa tutta l'altezza della colonna — position absolute fill */}
          <div ref={imgRef} style={{ position: 'absolute', inset: 0 }}>
            {/* Senza foto caricata dall'admin si usa la foto di copertina del titolo (niente riquadro vuoto) */}
            {(
              <TiltImage src={settings.aboutImageUrl || '/bg/hero-foto.jpg'} alt={settings.siteName || 'Emporio 46'} sepia={settings.aboutImageSepia ?? 0.25} brightness={settings.aboutImageBrightness ?? 0.82} opacity={settings.aboutImageOpacity ?? 1} />
            )}

            {/* Quote sovrapposta in basso sull'immagine */}
            <motion.div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '1.6rem 2rem 1.8rem',
                background: 'linear-gradient(to top, rgba(var(--color-bg-rgb), 0.92) 0%, rgba(var(--color-bg-rgb), 0.7) 60%, transparent 100%)',
              }}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={REVEAL_VP}
              transition={{ duration: 1.28, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}>
              <div style={{ width: 28, height: 1, background: 'var(--color-primary)', marginBottom: '0.85rem', opacity: 0.7 }} />
              <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1rem', color: 'var(--color-primary-light)', lineHeight: 1.6, margin: 0 }}>&#8220;{lang === 'en' ? (settingsEn.aboutQuote || t.about.quote) : (settings.aboutQuote || t.about.quote)}&#8221;</p>
              <cite style={{ display: 'block', marginTop: '0.7rem', fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'var(--color-primary-text, var(--color-primary))', fontStyle: 'normal' }}>— {settings.siteName || 'Emporio 46'}</cite>
            </motion.div>
          </div>

          {/* Year marker */}
          <motion.div style={{ position: 'absolute', top: '2.5rem', left: '-1.5rem' }}
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={REVEAL_VP} transition={{ delay: 0.7 }}>
            <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.4em', color: 'var(--color-text-muted)', textTransform: 'uppercase', writingMode: 'vertical-rl', display: 'block', transform: 'rotate(180deg)' }}>
              {lang === 'it' ? 'Firenze · Via G. Orsini 46/A' : 'Florence · Via G. Orsini 46/A'}
            </span>
          </motion.div>
        </motion.div>

        {/* Text side */}
        <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={REVEAL_VP}
          transition={{ duration: 1.76, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}>
          <p className="section-label" style={{ marginBottom: '1.5rem' }}>{t.about.label}</p>
          <div className="gold-rule" style={{ marginBottom: '2rem' }} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.2rem,4.8vw,3.8rem)', fontWeight: 400, color: 'var(--color-text, #f5ede0)', lineHeight: 1.05, marginBottom: '1.8rem' }}>
            {lang === 'en' ? (settingsEn.aboutTitle || t.about.title) : (settings.aboutTitle || t.about.title)}
          </h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(1.05rem,1.8vw,1.25rem)', color: 'var(--color-text-muted, #9a8a78)', lineHeight: 1.8, marginBottom: '2.8rem', maxWidth: 500, fontStyle: 'italic', fontWeight: 300 }}>
            {lang === 'en' ? (settingsEn.aboutLead || t.about.lead) : (settings.aboutLead || t.about.lead)}
          </p>

          {/* Values list */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '2.8rem' }}>
            {vals.map((v, i) => (
              <motion.div key={i}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-muted, #9a8a78)', padding: '0.6rem 0', borderBottom: '1px solid rgba(var(--color-primary-rgb), 0.06)', cursor: 'default' }}
                initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={REVEAL_VP}
                transition={{ duration: 0.96, delay: 0.4 + i * 0.08 }}
                whileHover={{ color: 'var(--color-text, #f5ede0)', x: 4 }}>
                <motion.div style={{ width: 4, height: 4, background: 'var(--color-primary)', flexShrink: 0 }}
                  animate={{ rotate: [0, 45, 90, 45, 0] }} transition={{ duration: 4, delay: i * 0.5, repeat: Infinity, ease: 'easeInOut' }} />
                {v}
              </motion.div>
            ))}
          </div>

          {/* Animated stats */}
          {statList.length > 0 && <div style={{ display: 'flex', gap: '3rem', borderTop: '1px solid rgba(var(--color-primary-rgb), 0.08)', paddingTop: '2.2rem', flexWrap: 'wrap' }}>
            {statList.map(([n, suf, l], si) => (
              <motion.div key={l} style={{ textAlign: 'left' }}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={REVEAL_VP}
                transition={{ duration: 0.96, delay: 0.65 + si * 0.1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.6rem', color: 'var(--color-primary-text, var(--color-primary))', lineHeight: 1, fontWeight: 400 }}>
                  <Counter target={parseFloat(n)} suffix={suf} />
                </div>
                <div style={{ fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--color-text-muted, #9a8a78)', marginTop: '0.4rem' }}>{l}</div>
              </motion.div>
            ))}
          </div>}
        </motion.div>
      </div>
    </section>
  )
}
