import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, useInView, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useApp } from '../../context/AppContext'
import SectionBackdrop from '../ui/SectionBackdrop'
import { deriveTheme } from '../../utils/themeColors'
import { REVEAL_VP } from '../../utils/reveal'

function Stars({ n }: { n: number }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: '1.2rem' }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <motion.svg key={s} viewBox="0 0 12 12" fill={s <= n ? 'var(--color-primary)' : 'none'} stroke="var(--color-primary)" strokeWidth={1}
          style={{ width: 13, height: 13 }}
          initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: s * 0.06, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
          <polygon points="6 1 7.35 4.18 11 4.54 8.38 6.89 9.18 10.46 6 8.5 2.82 10.46 3.62 6.89 1 4.54 4.65 4.18 6 1" />
        </motion.svg>
      ))}
    </div>
  )
}

/* ─── Drag gesture carousel ─── */
function DragCarousel({ items, current, onSelect }: { items: any[]; current: number; onSelect: (i: number) => void }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragX = useMotionValue(0)
  const startX = useRef(0)

  const onDragEnd = useCallback((_: any, info: any) => {
    if (info.offset.x < -60 && current < items.length - 1) onSelect(current + 1)
    else if (info.offset.x > 60 && current > 0) onSelect(current - 1)
  }, [current, items.length, onSelect])

  return (
    <motion.div
      ref={trackRef}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.15}
      onDragEnd={onDragEnd}
      style={{ display: 'flex', gap: '2px', cursor: 'grab', userSelect: 'none', touchAction: 'pan-y' }}
      whileDrag={{ cursor: 'grabbing' }}
    >
      {items.map((rev, i) => (
        <motion.div
          key={rev.id}
          onClick={() => onSelect(i)}
          style={{ flex: '0 0 180px', padding: '1.6rem 1.8rem', background: bgCardAlt, border: '1px solid', cursor: 'pointer' }}
          animate={{
            borderColor: i === current ? 'var(--color-primary)' : 'rgba(var(--color-primary-rgb), 0.1)',
            opacity: i === current ? 1 : 0.55,
            scale: i === current ? 1 : 0.96,
          }}
          transition={{ duration: 0.35 }}
        >
          <Stars n={rev.stelle} />
          <p style={{ fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.18em', color: primary, marginBottom: '0.25rem' }}>{rev.autore}</p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: textMuted }}>{rev.citta}</p>
        </motion.div>
      ))}
    </motion.div>
  )
}

export default function ReviewsSection() {
  const { t, reviews, lang, settings } = useApp()
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.25 })
  const visible = reviews.filter((r) => r.visibile)
  const [current, setCurrent] = useState(0)

  // Derive theme-aware colors
  const th = deriveTheme(settings)
  const isDark = th.isDark
  const primary    = settings.primaryColor   || '#c4561f'
  const textMain   = th.text
  const textMuted  = th.muted
  const bgCard     = settings.bgCardColor    || (isDark ? 'rgba(35,24,12,0.94)' : 'rgba(240,232,218,0.96)')
  const bgCardAlt  = settings.bgAltColor
    ? settings.bgAltColor + (isDark ? 'e0' : 'f0')
    : (isDark ? 'rgba(30,20,10,0.88)' : 'rgba(232,222,208,0.90)')
  const bgCardHover = isDark ? 'rgba(42,28,14,0.96)' : 'rgba(248,240,226,0.98)'
  const bgHeader   = isDark
    ? `color-mix(in srgb, ${settings.bgColor || '#080604'} 78%, transparent)`
    : `color-mix(in srgb, ${settings.bgColor || '#f5ede0'} 85%, transparent)`
  const cardBorder     = `${primary}33`
  const cardBorderFeat = `${primary}33`
  const textQuote  = th.text
  const textSide   = th.soft
  const avatarBg   = isDark
    ? `linear-gradient(135deg, ${settings.bgAltColor || '#2d2318'}, ${settings.bgCardColor || '#3d3020'})`
    : `linear-gradient(135deg, #d4c8b0, #c8b89a)`

  // Auto advance
  useEffect(() => {
    if (visible.length < 2) return
    const id = setInterval(() => setCurrent(c => (c + 1) % visible.length), 5000)
    return () => clearInterval(id)
  }, [visible.length])

  const prev = () => setCurrent((c) => (c - 1 + visible.length) % visible.length)
  const next = () => setCurrent((c) => (c + 1) % visible.length)
  const featured = visible[current]
  const secondIdx = (current + 1) % visible.length
  const thirdIdx = (current + 2) % visible.length

  if (!visible.length) return null


  return (
    <section id="recensioni" ref={ref} style={{ background: 'transparent', padding: '10rem clamp(1.5rem,7vw,8rem)', position: 'relative', overflow: 'hidden', isolation: 'isolate' }}>
      <SectionBackdrop slot="reviews" />
      {/* Ambient glow */}
      <motion.div
        style={{ position: 'absolute', top: '30%', left: '20%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(var(--color-primary-rgb), 0.04) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }}
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Decorative quote */}
      <div style={{ position: 'absolute', top: '2rem', right: 'clamp(2rem,8vw,10rem)', fontFamily: 'var(--font-display)', fontSize: 'clamp(10rem,20vw,22rem)', color: 'rgba(var(--color-primary-rgb), 0.035)', lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>
        "
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '5rem',
          background: bgHeader,
          backdropFilter: 'blur(10px)',
          border: '2px solid var(--ink)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '6px 6px 0 var(--ink)',
          padding: 'clamp(2rem,4vw,3rem) clamp(1.5rem,5vw,3rem)',
        }}>
          <motion.p className="section-label" style={{ marginBottom: '1.2rem', justifyContent: 'center' }}
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={REVEAL_VP}
            transition={{ duration: 1.12, ease: [0.16, 1, 0.3, 1] }}>
            {t.reviews.label}
          </motion.p>
          <div className="gold-rule" style={{ margin: '0 auto 1.5rem' }} />
          <motion.h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem,4.5vw,3.5rem)', fontWeight: 400, color: textMain, lineHeight: 1.1, marginBottom: '1rem' }}
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={REVEAL_VP}
            transition={{ duration: 1.12, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}>
            {t.reviews.title}
          </motion.h2>
          <motion.p style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(1rem,1.8vw,1.15rem)', color: textMuted, maxWidth: 500, margin: '0 auto', lineHeight: 1.75 }}
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={REVEAL_VP}
            transition={{ duration: 1.12, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}>
            {t.reviews.lead}
          </motion.p>
        </div>

        {/* Main layout */}
        <motion.div style={{ maxWidth: 1100, margin: '0 auto' }}
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={REVEAL_VP}
          transition={{ duration: 1.28, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: '1.6rem', alignItems: 'stretch' }}>
            {/* Featured */}
            <AnimatePresence mode="wait">
              <motion.div key={featured?.id}
                className="rev-card"
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                style={{ padding: 'clamp(2rem,4vw,3.5rem)', minHeight: '22rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: bgCard, position: 'relative', overflow: 'hidden' }}>
                {/* Animated corner brackets */}
                {[['top-0 left-0', 'borderTop borderLeft'], ['bottom-0 right-0', 'borderBottom borderRight']].map(([pos], bi) => (
                  <motion.div key={bi}
                    style={{ position: 'absolute', ...(bi === 0 ? { top: 16, left: 16, borderTopLeftRadius: 14 } : { bottom: 16, right: 16, borderBottomRightRadius: 14 }), width: 30, height: 30, borderColor: primary, borderStyle: 'solid', borderWidth: bi === 0 ? '3px 0 0 3px' : '0 3px 3px 0', opacity: 0.4 }}
                    animate={{ opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 3, delay: bi * 1.5, repeat: Infinity, ease: 'easeInOut' }} />
                ))}

                {featured && <Stars n={featured.stelle} />}

                <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 'clamp(1.1rem,2vw,1.45rem)', color: textQuote, lineHeight: 1.65, marginBottom: '2.5rem' }}>
                  "{lang === 'en' && featured?.testoEn ? featured.testoEn : featured?.testo}"
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <motion.div style={{ width: 44, height: 44, borderRadius: '50%', background: avatarBg, border: `1px solid ${primary}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-label)', fontSize: '0.9rem', color: primary }}
                    whileHover={{ scale: 1.1, borderColor: primary }}>
                    {featured?.autore.charAt(0)}
                  </motion.div>
                  <div>
                    <p style={{ fontFamily: 'var(--font-label)', fontSize: '0.65rem', letterSpacing: '0.2em', color: textMain, marginBottom: 2 }}>{featured?.autore}</p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: textMuted }}>{featured?.citta}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 5, background: 'rgba(var(--color-primary-rgb), 0.12)' }}>
                  <motion.div style={{ height: '100%', background: primary, transformOrigin: 'left' }}
                    initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                    transition={{ duration: 5, ease: 'linear' }}
                    key={current} />
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Side cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.6rem' }}>
              {[visible[secondIdx], visible[thirdIdx]].filter(Boolean).map((rev, si) => (
                <div key={`${rev.id}-${si}`} className="rev-card rev-side" onClick={() => setCurrent(visible.indexOf(rev))}
                  style={{ flex: 1, padding: '2rem 2.5rem', background: bgCardAlt, cursor: 'pointer', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRadius: 'var(--radius-md)' }}>
                  <Stars n={rev.stelle} />
                  <p style={{ fontFamily: 'var(--font-body)', fontStyle: 'italic', fontSize: '0.95rem', color: textSide, lineHeight: 1.6, marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    "{lang === 'en' && rev.testoEn ? rev.testoEn : rev.testo}"
                  </p>
                  <p style={{ fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.2em', color: textMain, opacity: 0.75, paddingRight: '2rem' }}>{rev.autore} · {rev.citta}</p>

                  <div className="rev-arrow" style={{ position: 'absolute', right: '1.5rem', bottom: '1.5rem', color: primary }}>
                    <svg width="16" height="12" viewBox="0 0 16 12" fill="none"><path d="M1 6h14M9 1l6 5-6 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginTop: '3rem', justifyContent: 'center' }}>
            {[prev, null, next].map((fn, i) => {
              if (fn === null) return (
                <div key="dots" style={{ display: 'flex', gap: 8 }}>
                  {visible.map((_, di) => (
                    <motion.button key={di} onClick={() => setCurrent(di)}
                      style={{ height: 6, borderRadius: 3, border: 'none', cursor: 'pointer', padding: 0, background: di === current ? primary : `${primary}33` }}
                      animate={{ width: di === current ? 28 : 6 }} transition={{ duration: 0.35 }}
                      aria-label={`${t.catalog.reviewDot} ${di + 1}`} />
                  ))}
                </div>
              )
              return (
                <motion.button key={i} onClick={fn}
                  className="rev-nav" style={{ width: 46, height: 46, background: bgCard, color: primary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ width: 16, height: 16 }}>
                    <path d={i === 0 ? 'M10 3L5 8l5 5' : 'M6 3l5 5-5 5'} />
                  </svg>
                </motion.button>
              )
            })}
          </div>
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          #recensioni [style*="grid-template-columns: minmax"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  )
}
