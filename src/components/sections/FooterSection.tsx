// @ts-nocheck
import React, { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { useApp } from '../../context/AppContext'
import { safeHref } from '../../utils/safeUrl'
import SectionBackdrop from '../ui/SectionBackdrop'

export default function FooterSection({ onOpenLegal }: { onOpenLegal?: (tab: string) => void }) {
  const { t, lang, settings, settingsEn, reviews, isAdmin } = useApp()
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.15 })

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const navLinks = [
    { label: t.nav.catalog, id: 'catalogo' },
    { label: t.nav.about, id: 'about' },
    { label: t.nav.reviews, id: 'recensioni' },
    { label: t.nav.location, id: 'dove-siamo' },
    { label: t.nav.book, id: 'contatti' },
  ].filter(l => l.id !== 'recensioni' || reviews.some(r => r.visibile))

  const contacts = [
    ...(settings.email ? [{ icon: '✉', label: settings.email, href: `mailto:${settings.email}` }] : []),
    { icon: '☎', label: settings.telefono, href: `tel:${settings.telefono.replace(/\s/g, '')}` },
    { icon: '◉', label: `${settings.indirizzo} — ${settings.citta}`, href: settings.mapsLink },
    { icon: '◈', label: settings.instagramHandle, href: settings.instagram },
    ...(settings.whatsappCatalog ? [{ icon: '▤', label: lang === 'it' ? 'Catalogo WhatsApp' : 'WhatsApp catalog', href: settings.whatsappCatalog }] : []),
  ]

  const ease = [0.16, 1, 0.3, 1] as [number, number, number, number]

  return (
    <footer ref={ref} style={{ position: 'relative', overflow: 'hidden', isolation: 'isolate', borderTop: '1px solid rgba(var(--color-primary-rgb), 0.18)' }}>

      {/* Sfondo: immagine e parametri da admin → Sfondi & Mappa */}
      <SectionBackdrop slot="footer" scale={1.06} />

      {/* Velo leggero: l'immagine resta visibile attorno al pannello. La leggibilità non dipende dall'immagine: il testo sta nel pannello opaco qui sotto */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'linear-gradient(to bottom, rgba(var(--color-bg-rgb), 0.45) 0%, rgba(var(--color-bg-rgb), 0.6) 100%)' }} />

      {/* Gold bottom glow */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'radial-gradient(ellipse 80% 45% at 50% 105%, rgba(150,90,15,0.2) 0%, transparent 65%)' }} />

      {/* Diagonal mesh */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        backgroundImage: 'repeating-linear-gradient(47deg, transparent, transparent 22px, rgba(var(--color-primary-rgb), 0.04) 22px, rgba(var(--color-primary-rgb), 0.04) 23px), repeating-linear-gradient(-47deg, transparent, transparent 22px, rgba(var(--color-primary-rgb), 0.03) 22px, rgba(var(--color-primary-rgb), 0.03) 23px)',
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 10, padding: 'clamp(3rem,8vw,7rem) clamp(0.8rem,4vw,6rem)' }}>
      {/* Pannello opaco: qualunque immagine venga messa dietro al footer, il testo mantiene sempre il contrasto del tema */}
      <div style={{ maxWidth: 1400, margin: '0 auto', background: 'color-mix(in srgb, var(--color-bg-card) 94%, transparent)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(var(--color-primary-rgb), 0.3)', borderRadius: 28, boxShadow: '0 24px 70px rgba(0,0,0,0.2)', padding: 'clamp(2.2rem,6vw,5rem) clamp(1.3rem,5vw,4.5rem)' }}>

        {/* Ornamental divider */}
        <motion.div
          className="divider-line"
          style={{ marginBottom: '5rem' }}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, ease }}
        >
          <span style={{ fontFamily: 'var(--font-label)', fontSize: 'clamp(0.74rem, 2.9vw, 0.92rem)', fontWeight: 600, letterSpacing: '0.16em', color: 'var(--color-primary-text, var(--color-primary))', textTransform: 'uppercase', whiteSpace: 'normal', textAlign: 'center', lineHeight: 1.5 }}>
            {lang === 'it' ? 'Firenze · Arredi vintage e bijoux' : 'Florence · Vintage furniture & jewellery'}
          </span>
        </motion.div>

        {/* Grid */}
        <div className="footer-grid" style={{ marginBottom: '5rem' }}>

          {/* Brand */}
          <motion.div initial={{ opacity: 0, y: 28 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.9, delay: 0.08, ease }}>
            <button onClick={() => scrollTo('hero')} style={{ borderRadius: 999, fontFamily: 'var(--font-label)', fontSize: '1.6rem', fontWeight: 500, letterSpacing: '0.14em', color: 'var(--color-text)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '1.2rem', display: 'block', textAlign: 'left' }}>
              {(settings.siteName || 'Emporio 46').split(' ').map((w: string, i: number) => (
                <span key={i}><span style={{ color: 'var(--color-primary-text, var(--color-primary))' }}>{w.charAt(0).toUpperCase()}</span>{w.slice(1).toUpperCase()}{' '}</span>
              ))}
            </button>
            <div style={{ width: 38, height: 1, background: 'linear-gradient(90deg, var(--color-primary), transparent)', marginBottom: '1.4rem', opacity: 0.6 }} />
            <p style={{ fontFamily: 'var(--font-body)', fontStyle: 'italic', fontSize: '1.25rem', color: 'var(--color-text)', lineHeight: 1.6, maxWidth: 340, marginBottom: '2.2rem', fontWeight: 400 }}>
              {lang === 'en' ? (settingsEn.footerTagline || t.footer.tagline) : (settings.footerTagline || t.footer.tagline)}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {/* Instagram SVG realistico */}
              <a href={safeHref(settings.instagram)} target="_blank" rel="noopener noreferrer"
                aria-label="Instagram"
                style={{ width: 48, height: 48, border: '1.5px solid var(--color-text-soft, var(--color-text))', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', transition: 'all 0.35s', borderRadius: 2, flexShrink: 0, background: 'transparent' }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = 'var(--color-primary)'; el.style.background = 'rgba(var(--color-primary-rgb), 0.08)'; el.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = 'var(--color-text-soft, var(--color-text))'; el.style.background = 'transparent'; el.style.transform = 'none' }}
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 22, height: 22 }}>
                  <defs>
                    <linearGradient id="ig-grad" x1="0" y1="1" x2="1" y2="0">
                      <stop offset="0%" stopColor="#f9ce34"/>
                      <stop offset="25%" stopColor="#ee2a7b"/>
                      <stop offset="100%" stopColor="#6228d7"/>
                    </linearGradient>
                  </defs>
                  <rect x="2" y="2" width="20" height="20" rx="5.5" ry="5.5" stroke="url(#ig-grad)" strokeWidth="1.8" fill="none"/>
                  <circle cx="12" cy="12" r="4.2" stroke="url(#ig-grad)" strokeWidth="1.8" fill="none"/>
                  <circle cx="17.5" cy="6.5" r="1.1" fill="url(#ig-grad)"/>
                </svg>
              </a>
              {/* WhatsApp SVG realistico */}
              <a href={`https://wa.me/${settings.whatsapp || '393756106713'}`} target="_blank" rel="noopener noreferrer"
                aria-label="WhatsApp"
                style={{ width: 48, height: 48, border: '1.5px solid var(--color-text-soft, var(--color-text))', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', transition: 'all 0.35s', borderRadius: 2, flexShrink: 0, background: 'transparent' }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = '#25d366'; el.style.background = 'rgba(37,211,102,0.08)'; el.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = 'var(--color-text-soft, var(--color-text))'; el.style.background = 'transparent'; el.style.transform = 'none' }}
              >
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ width: 22, height: 22 }}>
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.948-1.42A9.956 9.956 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" fill="#25d366"/>
                  <path d="M16.87 14.814c-.248-.124-1.47-.726-1.697-.808-.228-.083-.394-.124-.56.124-.166.248-.643.808-.788.974-.145.165-.29.186-.538.062-.248-.124-1.049-.387-1.997-1.234-.738-.66-1.236-1.473-1.381-1.722-.145-.248-.015-.382.109-.505.112-.111.248-.29.372-.436.124-.145.165-.248.248-.414.083-.165.041-.31-.021-.434-.062-.124-.56-1.349-.766-1.848-.202-.484-.407-.418-.56-.426-.145-.007-.31-.009-.476-.009a.913.913 0 00-.663.31c-.228.248-.869.85-.869 2.073s.89 2.403 1.014 2.569c.124.165 1.753 2.677 4.248 3.754.594.257 1.057.41 1.419.524.596.19 1.139.163 1.568.099.479-.072 1.47-.601 1.678-1.182.207-.58.207-1.077.145-1.182-.062-.103-.228-.165-.476-.29z" fill="white"/>
                </svg>
              </a>
            </div>
          </motion.div>

          {/* Navigation */}
          <motion.div initial={{ opacity: 0, y: 28 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.9, delay: 0.15, ease }}>
            <p style={{ fontFamily: 'var(--font-label)', fontSize: '1rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-primary-text, var(--color-primary))', marginBottom: '1.4rem' }}>
              {lang === 'it' ? 'Navigazione' : 'Navigation'}
            </p>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              {navLinks.map(link => (
                <button key={link.id} onClick={() => scrollTo(link.id)}
                  style={{ borderRadius: 999, fontFamily: 'var(--font-label)', fontSize: '1.08rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.45rem 0', minHeight: 44, textAlign: 'left', transition: 'color 0.3s', display: 'flex', alignItems: 'center', gap: '0.7rem' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary-text, var(--color-primary))')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text)')}
                >
                  <span style={{ width: 18, height: 2, background: 'linear-gradient(90deg,var(--color-primary-text, var(--color-primary)),transparent)', opacity: 0.8, display: 'inline-block', flexShrink: 0 }} />
                  {link.label}
                </button>
              ))}
            </nav>
          </motion.div>

          {/* Contacts */}
          <motion.div initial={{ opacity: 0, y: 28 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.9, delay: 0.29, ease }}>
            <p style={{ fontFamily: 'var(--font-label)', fontSize: '1rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-primary-text, var(--color-primary))', marginBottom: '1.4rem' }}>
              {lang === 'it' ? 'Contatti' : 'Contacts'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {contacts.map(c => (
                <a key={c.label} href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', textDecoration: 'none', color: 'var(--color-text)', transition: 'color 0.3s', fontFamily: 'var(--font-body)', fontSize: '1.15rem', fontWeight: 500, lineHeight: 1.5, wordBreak: 'break-word' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary-text, var(--color-primary))')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text)')}
                >
                  <span style={{ color: 'var(--color-primary-text, var(--color-primary))', fontSize: '1.05rem', marginTop: 3, flexShrink: 0 }}>{c.icon}</span>
                  <span>{c.label}</span>
                </a>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Enti di accreditamento — 2 sopra + 2 sotto */}
        {(() => {
          const slots = (settings.accreditations && settings.accreditations.length ? settings.accreditations : []).slice(0, 4)
          while (slots.length < 4) slots.push({ name: '', logoUrl: '', link: '' })
          const filled = slots.filter(a => a.logoUrl)
          if (!filled.length && !isAdmin) return null
          const shown = isAdmin ? slots : filled
          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.9, delay: 0.32, ease }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3.2rem' }}
            >
              <p style={{ fontFamily: 'var(--font-label)', fontSize: '1rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-primary-text, var(--color-primary))', marginBottom: '1.4rem', textAlign: 'center' }}>
                {lang === 'it' ? 'Garanzie e accreditamenti' : 'Guarantees & accreditations'}
              </p>
              <div className="accred-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.9rem', width: '100%', maxWidth: 380 }}>
                {shown.map((a, i) => {
                  const tile: React.CSSProperties = { height: 78, borderRadius: 14, background: a.logoUrl ? 'rgba(255,255,255,0.93)' : 'transparent', border: a.logoUrl ? '1px solid rgba(255,255,255,0.35)' : '1px dashed rgba(var(--color-primary-rgb), 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.6rem 0.9rem', textDecoration: 'none', transition: 'transform 0.3s, box-shadow 0.3s', boxShadow: a.logoUrl ? '0 4px 14px rgba(0,0,0,0.25)' : 'none' }
                  const inner = a.logoUrl
                    ? <img src={a.logoUrl} alt={a.name || (lang === 'it' ? 'Ente di accreditamento' : 'Accreditation body')} loading="lazy" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    : <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-soft, var(--color-text))', textAlign: 'center' }}>Logo ente {i + 1}<br />(admin)</span>
                  const hover = a.link ? { onMouseEnter: (e: any) => { e.currentTarget.style.transform = 'translateY(-3px)' }, onMouseLeave: (e: any) => { e.currentTarget.style.transform = 'none' } } : {}
                  return a.link && a.logoUrl
                    ? <a key={i} href={safeHref(a.link)} target="_blank" rel="noopener noreferrer" aria-label={a.name} style={tile} {...hover}>{inner}</a>
                    : <div key={i} style={tile} title={a.name}>{inner}</div>
                })}
              </div>
            </motion.div>
          )
        })()}

        {/* Divider line */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(var(--color-primary-rgb), 0.15), rgba(var(--color-primary-rgb), 0.08), transparent)', marginBottom: '2.5rem' }} />


        {/* Bottom bar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, delay: 0.38, ease }}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}
        >
          <p style={{ fontFamily: 'var(--font-label)', fontSize: '0.92rem', fontWeight: 500, letterSpacing: '0.06em', color: 'var(--color-text)', textTransform: 'uppercase', lineHeight: 1.6 }}>
            {settings.footerRights}{lang === 'it' && settings.pivaText ? ` · ${settings.pivaText}` : ''}
          </p>
          {settings.footerDesign && (
            <p style={{ fontFamily: 'var(--font-label)', fontSize: '0.92rem', fontWeight: 500, letterSpacing: '0.06em', color: 'var(--color-text-soft, var(--color-text))', textTransform: 'uppercase' }}>
              {(settings.footerDesign || '').replace(/err0r_hb/gi, 'Swan Boccella')}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ width: 36, height: 1, background: 'rgba(var(--color-primary-rgb), 0.15)' }} />
            <div style={{ width: 4, height: 4, background: 'var(--color-primary)', transform: 'rotate(45deg)', opacity: 0.35 }} />
            <div style={{ width: 36, height: 1, background: 'rgba(var(--color-primary-rgb), 0.15)' }} />
          </div>
          {/* Legal links */}
          <div style={{ display: 'flex', gap: '0.4rem 1.4rem', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
            {[
              { tab: 'termini', labelIt: 'Termini di Servizio', labelEn: 'Terms' },
              { tab: 'privacy', labelIt: 'Privacy Policy', labelEn: 'Privacy' },
              { tab: 'cookie', labelIt: 'Cookie Policy', labelEn: 'Cookies' },
            ].map(item => (
              <button
                key={item.tab}
                onClick={() => onOpenLegal?.(item.tab)}
                style={{ borderRadius: 999,
                  fontFamily: 'var(--font-label)',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text)',
                  minHeight: 40,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'color 0.3s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary-text, var(--color-primary))')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text)')}
              >
                {lang === 'it' ? item.labelIt : item.labelEn}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
      </div>
    </footer>
  )
}
