// @ts-nocheck
import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { useApp, buildMapsEmbed } from '../../context/AppContext'
import SectionBackdrop from '../ui/SectionBackdrop'
import { safeHref } from '../../utils/safeUrl'
import { REVEAL_VP } from '../../utils/reveal'

export default function LocationSection() {
  const { t, lang, setContactTab, settings, settingsEn } = useApp()
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.35 })

  const goToBook = () => {
    setContactTab('book', { note: t.catalog.locationBookPrefill })
    setTimeout(() => document.getElementById('contatti')?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  const GIORNI_IT = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']
  const GIORNI_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const orariKeys: (keyof typeof settings.orari)[] = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom']
  const giorni = lang === 'it' ? GIORNI_IT : GIORNI_EN

  // getDay() returns 0=Sun,1=Mon,...,6=Sat; our array is Mon=0,...,Sun=6
  const jsDay = new Date().getDay()
  const todayIdx = jsDay === 0 ? 6 : jsDay - 1

  // Use AI-translated orari in EN if available
  const orariSource = (lang === 'en' && settingsEn.orari) ? settingsEn.orari : settings.orari

  const hours = orariKeys.map((k, i) => ({
    giorno: giorni[i],
    orario: orariSource[k],
    closed: orariSource[k].toLowerCase() === 'chiuso' || orariSource[k].toLowerCase() === 'closed',
    isToday: i === todayIdx,
  }))

  return (
    <section
      id="dove-siamo"
      ref={ref}
      style={{
        background: 'var(--color-bg-alt, #140e08)',
        padding: '10rem clamp(1.5rem,7vw,8rem)',
        position: 'relative',
        overflow: 'hidden',
        isolation: 'isolate',
      }}
    >
      <SectionBackdrop slot="location" />
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
        <motion.p
          className="section-label"
          style={{ marginBottom: '1.2rem' }}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }} viewport={REVEAL_VP}
          transition={{ duration: 1.12 }}
        >
          {t.location.label}
        </motion.p>
        <div className="gold-rule" style={{ margin: '0 auto 1.5rem' }} />
        <motion.h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2rem,4.5vw,3.5rem)',
            fontWeight: 400,
            color: 'var(--color-text, #f5ede0)',
            lineHeight: 1.2,
          }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }} viewport={REVEAL_VP}
          transition={{ duration: 1.12, delay: 0.1 }}
        >
          {t.location.title}
        </motion.h2>
      </div>

      {/* Content grid */}
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1.4fr',
          gap: '3rem',
          alignItems: 'stretch',
        }}
      >
        {/* Info panel */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }} viewport={REVEAL_VP}
          transition={{ duration: 1.28, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', height: '100%' }}
        >
          {/* Address */}
          <div
            style={{
              background: 'var(--color-bg-card, #1c1510)',
              border: '2px solid var(--color-text)', borderRadius: 'var(--radius-md)',
              padding: '2rem 2.5rem',
              position: 'relative',
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, width: 30, height: 30, borderTop: '2px solid var(--color-primary)', borderLeft: '2px solid var(--color-primary)', opacity: 0.5 }} />

            <p style={{ fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'var(--color-primary-text, var(--color-primary))', marginBottom: '1rem' }}>
              {lang === 'it' ? 'Indirizzo' : 'Address'}
            </p>

            <address style={{ fontStyle: 'normal' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--color-text, #f5ede0)', lineHeight: 1.5, marginBottom: '0.5rem' }}>
                {settings.indirizzo}
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--color-text-muted, #9a8a78)' }}>
                {settings.citta}
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'color-mix(in srgb, var(--color-text-muted) 70%, transparent)', marginTop: '0.5rem' }}>
                {t.location.note}
              </p>
            </address>

            <a
              href={safeHref(settings.mapsLink)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '1.5rem',
                fontFamily: 'var(--font-label)',
                fontSize: '0.6rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'var(--color-primary-text, var(--color-primary))',
                textDecoration: 'none',
                borderBottom: '1px solid rgba(var(--color-primary-rgb), 0.3)',
                paddingBottom: 2,
                transition: 'all 0.3s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-primary-light)'; e.currentTarget.style.borderColor = 'var(--color-primary-light)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-primary)'; e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb), 0.3)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ width: 14, height: 14 }}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {t.location.openMaps}
            </a>
          </div>

          {/* Hours */}
          <div
            style={{
              background: 'var(--color-bg-card, #1c1510)',
              border: '2px solid var(--color-text)', borderRadius: 'var(--radius-md)',
              padding: '2rem 2.5rem',
            }}
          >
            <p style={{ fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'var(--color-primary-text, var(--color-primary))', marginBottom: '1.5rem' }}>
              {t.hours.title}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {hours.map((h, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: h.isToday ? '0.35rem 0.7rem' : '0',
                  margin: h.isToday ? '0 -0.7rem' : '0',
                  background: h.isToday ? 'rgba(var(--color-primary-rgb), 0.10)' : 'transparent',
                  borderLeft: h.isToday ? '2px solid var(--color-primary)' : '2px solid transparent',
                  transition: 'background 0.3s',
                }}>
                  <p style={{ fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: h.isToday ? 'var(--color-primary)' : (h.closed ? 'color-mix(in srgb, var(--color-text-muted, #9a8a78) 60%, transparent)' : 'var(--color-text-muted, #9a8a78)'), fontWeight: h.isToday ? 600 : 400 }}>{h.giorno}{h.isToday && <span style={{ marginLeft: '0.5em', fontSize: '0.66rem', opacity: 0.8 }}>◀</span>}</p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: h.isToday ? 'var(--color-primary, #c9a84c)' : (h.closed ? 'var(--color-text-muted, #9a8a78)' : 'var(--color-text, #f5ede0)'), textDecoration: h.closed ? 'line-through' : 'none', fontWeight: h.isToday ? 500 : 300 }}>{h.orario}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '1.5rem', padding: '0.5rem 1rem', background: 'rgba(var(--color-primary-rgb), 0.08)', border: '1px solid rgba(var(--color-primary-rgb), 0.15)', display: 'inline-block' }}>
              <p style={{ fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--color-primary-text, var(--color-primary))' }}>
                {t.hours.badge}
              </p>
            </div>
          </div>

          {/* Book CTA */}
          <button
            onClick={goToBook}
            style={{ borderRadius: 999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              padding: '1.1rem 2rem',
              background: 'var(--color-primary)',
              color: 'var(--color-bg, #0a0805)',
              fontFamily: 'var(--font-label)',
              fontSize: '0.65rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              border: 'none',
              cursor: 'pointer',
              width: '100%',
              transition: 'all 0.3s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-primary-light)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-primary)'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ width: 16, height: 16 }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {t.location.book}
          </button>
        </motion.div>

        {/* Map */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }} viewport={REVEAL_VP}
          transition={{ duration: 1.28, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{
            border: '1px solid rgba(var(--color-primary-rgb), 0.15)',
            overflow: 'hidden',
            position: 'relative',
            minHeight: 480,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <iframe
            src={buildMapsEmbed(settings)}
            width="100%"
            height="100%"
            style={{ border: 0, display: 'block', flex: 1, minHeight: 480 }}
            allowFullScreen
            loading="eager"
            referrerPolicy="no-referrer-when-downgrade"
            title="Emporio 46 - Google Maps (vista satellitare)"
          />
          {/* Overlay corners */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: 30, height: 30, borderTop: '2px solid var(--color-primary)', borderLeft: '2px solid var(--color-primary)', opacity: 0.5, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderBottom: '2px solid var(--color-primary)', borderRight: '2px solid var(--color-primary)', opacity: 0.5, pointerEvents: 'none' }} />
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          #dove-siamo [style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  )
}
