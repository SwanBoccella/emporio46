// @ts-nocheck
import { useRef, useEffect, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { motion, useInView } from 'framer-motion'
import { useApp } from '../../context/AppContext'
import SectionBackdrop from '../ui/SectionBackdrop'
import { REVEAL_VP } from '../../utils/reveal'

gsap.registerPlugin(ScrollTrigger)

const ICONS = [
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" style={{ width: 30, height: 30 }}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" />
  </svg>,
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" style={{ width: 30, height: 30 }}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>,
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" style={{ width: 30, height: 30 }}>
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
  </svg>,
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" style={{ width: 30, height: 30 }}>
    <path d="M21 10V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4" /><path d="M3 10h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z" /><path d="M12 10v12" />
  </svg>,
]

// Palette alternata per le card — tutto basato su variabili CSS del tema attivo
// card 1: bg-alt standard
// card 2: bg-card leggermente più caldo (mix con primary)
// card 3: bg leggermente più freddo (mix con accent)
// card 4: bg-card con touch seppia scuro
const CARD_PALETTES = [
  {
    bg: 'var(--color-bg-alt)',
    accent: 'var(--color-primary)',
    numColor: 'color-mix(in srgb, var(--color-primary) 8%, transparent)',
  },
  {
    bg: 'color-mix(in srgb, var(--color-bg-card) 85%, var(--color-primary) 15%)',
    accent: 'var(--color-primary)',
    numColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
  },
  {
    bg: 'color-mix(in srgb, var(--color-bg) 70%, var(--color-accent) 30%)',
    accent: 'var(--color-accent)',
    numColor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
  },
  {
    bg: 'color-mix(in srgb, var(--color-bg-card) 90%, var(--color-bg) 10%)',
    accent: 'var(--color-primary)',
    numColor: 'color-mix(in srgb, var(--color-primary) 8%, transparent)',
  },
]

function WhyCard({ item, i, inView }: { item: { title: string; desc: string }; i: number; inView: boolean }) {
  const [hovered, setHovered] = useState(false)
  const pal = CARD_PALETTES[i % CARD_PALETTES.length]
  return (
    <motion.div
      className="why-card"
      style={{ height: '100%', padding: '3.5rem 2.8rem 3rem', background: pal.bg, position: 'relative', overflow: 'hidden', cursor: 'default' }}
      initial={{ opacity: 0, y: 60, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={REVEAL_VP}
      transition={{ duration: 1.36, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Background fill on hover */}
      <motion.div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.03)' }}
        animate={{ opacity: hovered ? 1 : 0 }} transition={{ duration: 0.35 }} />

      {/* Top accent bar sweep */}
      <motion.div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: pal.accent, transformOrigin: 'left' }}
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }} viewport={REVEAL_VP}
        transition={{ duration: 1.12, delay: 0.3 + i * 0.1, ease: [0.16, 1, 0.3, 1] }} />

      {/* Large watermark number */}
      <motion.div style={{ position: 'absolute', bottom: '1.5rem', right: '2rem', fontFamily: 'var(--font-display)', fontSize: '6rem', fontWeight: 700, color: pal.numColor, lineHeight: 1, userSelect: 'none' }}
        animate={{ opacity: hovered ? 0.08 : 0.04 }} transition={{ duration: 0.35 }}>
        {String(i + 1).padStart(2, '0')}
      </motion.div>

      {/* Icon with animated ring */}
      <div style={{ position: 'relative', marginBottom: '2.2rem', display: 'inline-block' }}>
        <motion.div style={{ width: 52, height: 52, border: `1px solid color-mix(in srgb, ${pal.accent} 20%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: pal.accent, position: 'relative', zIndex: 1 }}
          animate={{ borderColor: hovered ? pal.accent : `color-mix(in srgb, ${pal.accent} 20%, transparent)`, boxShadow: hovered ? `0 0 20px color-mix(in srgb, ${pal.accent} 15%, transparent)` : 'none' }} transition={{ duration: 0.35 }}>
          {ICONS[i]}
        </motion.div>
        {/* Ripple on hover */}
        {hovered && (
          <motion.div style={{ position: 'absolute', inset: -8, border: `1px solid color-mix(in srgb, ${pal.accent} 20%, transparent)`, pointerEvents: 'none' }}
            initial={{ scale: 0.8, opacity: 1 }} animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.8, repeat: Infinity }} />
        )}
      </div>

      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 400, color: 'var(--color-text, #f5ede0)', marginBottom: '0.9rem', lineHeight: 1.25, position: 'relative' }}>
        {item.title}
      </h3>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--color-text-muted, #9a8a78)', lineHeight: 1.75, fontStyle: 'italic', fontWeight: 300, position: 'relative' }}>
        {item.desc}
      </p>

      {/* Arrow on hover */}
      <motion.div style={{ position: 'absolute', bottom: '2rem', left: '2.8rem', color: `color-mix(in srgb, ${pal.accent} 40%, transparent)` }}
        animate={{ opacity: hovered ? 1 : 0, x: hovered ? 0 : -8 }}
        transition={{ duration: 0.25 }}>
        <svg width="20" height="10" viewBox="0 0 20 10" fill="none"><path d="M1 5h18M14 1l5 4-5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </motion.div>
    </motion.div>
  )
}

export default function WhySection() {
  const { t, settings, lang, settingsEn } = useApp()
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.25 })
  const items = lang === 'en'
    ? (settingsEn.whyItems && settingsEn.whyItems.length > 0 ? settingsEn.whyItems : t.why.items)
    : ((settings.whyItems && settings.whyItems.length > 0) ? settings.whyItems : t.why.items)

  return (
    <section id="perche" ref={ref} style={{ background: 'var(--color-bg-alt, #140e08)', padding: '10rem clamp(1.5rem,7vw,8rem)', position: 'relative', overflow: 'hidden', isolation: 'isolate' }}>
      <SectionBackdrop slot="why" />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '10%', right: '5%', width: 1, height: '80%', background: 'linear-gradient(to bottom, transparent, rgba(var(--color-primary-rgb), 0.06), transparent)', transform: 'rotate(12deg)' }} />
      </div>

      <div style={{ maxWidth: '100%', marginBottom: '7rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <motion.p className="section-label" style={{ marginBottom: '1.5rem' }}
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={REVEAL_VP}
          transition={{ duration: 1.12, ease: [0.16, 1, 0.3, 1] }}>
          {t.why.label}
        </motion.p>
        <div className="gold-rule" style={{ marginBottom: '2rem' }} />
        <motion.h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.2rem,5vw,4rem)', fontWeight: 400, color: 'var(--color-text, #f5ede0)', lineHeight: 1.05 }}
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={REVEAL_VP}
          transition={{ duration: 1.28, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}>
          {t.why.title}
        </motion.h2>
      </div>

      <div className="why-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2px', background: 'color-mix(in srgb, var(--color-primary) 15%, transparent)', border: '1px solid color-mix(in srgb, var(--color-primary) 15%, transparent)', boxShadow: '0 4px 40px rgba(0,0,0,0.4)' }}>
        {items.map((item, i) => (
          <WhyCard key={i} item={item} i={i} inView={inView} />
        ))}
      </div>
    </section>
  )
}
