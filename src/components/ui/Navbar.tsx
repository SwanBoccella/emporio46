// @ts-nocheck
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../../context/AppContext'
import { getLenis } from '../../hooks/useLenis'
import { safeHref } from '../../utils/safeUrl'
import SectionBackdrop from './SectionBackdrop'

export default function Navbar({ onOpenLegal, bannerActive }: { onOpenLegal?: (tab: string) => void; bannerActive?: boolean }) {
  const { t, lang, setLang, isAdmin, setContactTab, settings, translateSettingsToEn, isTranslatingEn, settingsEn, reviews } = useApp()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const navTop = bannerActive ? 36 : 0

  const handleLangToggle = () => {
    const next = lang === 'it' ? 'en' : 'it'
    setLang(next)
    if (next === 'en' && !settingsEn.aboutLead) {
      translateSettingsToEn()
    }
  }

  // Menu aperto: niente toggle di overflow (provoca reflow + refresh di ScrollTrigger = scatti).
  // Si ferma Lenis e si segnala alle animazioni WebGL/canvas di mettersi in pausa.
  useEffect(() => {
    const root = document.documentElement
    if (menuOpen) { root.dataset.menu = '1'; getLenis()?.stop() }
    else { delete root.dataset.menu; getLenis()?.start() }
    return () => { delete root.dataset.menu; getLenis()?.start() }
  }, [menuOpen])

  const goToBook = () => {
    setContactTab('book')
    setMenuOpen(false)
    setTimeout(() => document.getElementById('contatti')?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id: string) => {
    setMenuOpen(false)
    if (id === 'hero') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const navLinks = [
    { label: t.nav.home, id: 'hero' },
    { label: t.nav.catalog, id: 'catalogo' },
    { label: t.nav.about, id: 'about' },
    { label: t.nav.reviews, id: 'recensioni' },
    { label: t.nav.location, id: 'dove-siamo' },
  ].filter(l => l.id !== 'recensioni' || reviews.some(r => r.visibile))

  return (
    <>
      <motion.nav
        className="fixed left-0 right-0 z-[1000] flex items-center justify-between"
        style={{
          height: 'var(--nav-h, 70px)',
          top: navTop,
          transition: 'top 0.3s',
          left: 'clamp(0.6rem, 2vw, 1.6rem)',
          right: 'clamp(0.6rem, 2vw, 1.6rem)',
          marginTop: 10,
          borderRadius: 999,
          paddingLeft: 'clamp(1rem, 3vw, 2.2rem)',
          paddingRight: 'clamp(1rem, 3vw, 2.2rem)',
        }}
        animate={{
          background: scrolled ? 'color-mix(in srgb, var(--color-bg-card) 94%, transparent)' : 'transparent',
          border: scrolled ? '2px solid var(--color-text)' : '2px solid transparent',
          boxShadow: scrolled ? '4px 4px 0 var(--color-text)' : '0 0 0 transparent',
          backdropFilter: scrolled ? 'blur(14px) saturate(1.4)' : 'blur(0px)',
        }}
        transition={{ duration: 0.45 }}
      >
        {/* Sfondo della barra: compare insieme al "pill" quando si scorre */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', overflow: 'hidden', pointerEvents: 'none', zIndex: -1 }}>
          <SectionBackdrop slot="navbar" visible={scrolled} />
        </div>
        {/* Logo */}
        <button
          onClick={() => scrollTo('hero')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, minWidth: 0 }}
        >
          {settings.logoUrl ? (
          <img
            src={settings.logoUrl}
            alt={`${settings.siteName || 'Emporio 46'} logo`}
            style={{ height: 44, width: 44, objectFit: 'contain', borderRadius: '50%', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))', flexShrink: 0 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          ) : (
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
              <circle cx="18" cy="18" r="16.5" stroke="var(--color-primary)" strokeWidth="1" />
              <text x="18" y="23" textAnchor="middle" fontFamily="var(--font-display)" fontStyle="italic" fontSize="15" fill="var(--color-primary)">46</text>
            </svg>
          )}
          <span className="nav-brand-text" style={{ fontFamily: 'var(--font-label)', fontSize: 'clamp(0.6rem, 2vw, 0.82rem)', letterSpacing: '0.08em', color: 'var(--color-text, #f5ede0)', lineHeight: 1.2, whiteSpace: 'nowrap', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 'clamp(100px, 28vw, 220px)' }}>
            {(settings.siteName || 'Emporio 46').split(' ').map((word, i, arr) => (
              <span key={i}>
                <span style={{ color: 'var(--color-primary-text, var(--color-primary))' }}>{word.charAt(0)}</span>{word.slice(1)}{i < arr.length - 1 ? ' ' : ''}
              </span>
            ))}
          </span>
        </button>

        {/* Desktop links */}
        <div className="hidden md:flex items-center nav-links" style={{ gap: 'clamp(0.8rem, 1.9vw, 2rem)' }}>
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => scrollTo(link.id)}
              style={{ borderRadius: 999, fontFamily: 'var(--font-label)', fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted, #9a8a78)', transition: 'color 0.3s', background: 'none', border: 'none', cursor: 'pointer', padding: '0.3rem 0', position: 'relative' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-text, #f5ede0)'
                const line = e.currentTarget.querySelector('.nav-line') as HTMLElement
                if (line) line.style.width = '100%'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-text-muted, #9a8a78)'
                const line = e.currentTarget.querySelector('.nav-line') as HTMLElement
                if (line) line.style.width = '0'
              }}
            >
              {link.label}
              <span
                className="nav-line"
                style={{ position: 'absolute', bottom: -2, left: 0, height: 1, width: 0, background: 'var(--color-primary)', transition: 'width 0.4s cubic-bezier(0.16,1,0.3,1)' }}
              />
            </button>
          ))}

          {/* Legal link */}
          <button
            onClick={() => onOpenLegal?.('termini')}
            style={{ borderRadius: 999, fontFamily: 'var(--font-label)', fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted, #9a8a78)', transition: 'color 0.3s', background: 'none', border: 'none', cursor: 'pointer', padding: '0.3rem 0', position: 'relative' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text, #f5ede0)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted, #9a8a78)' }}
          >
            {lang === 'it' ? 'Note Legali' : 'Legal'}
          </button>

          {/* Lang toggle */}
          <button
            onClick={handleLangToggle}
            style={{ borderRadius: 999, fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.22em', color: 'var(--color-primary-text, var(--color-primary))', border: '1px solid rgba(var(--color-primary-rgb), 0.28)', padding: '0.28rem 0.65rem', background: 'transparent', cursor: 'pointer', transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-primary, #c9a84c)'; e.currentTarget.style.color = 'var(--color-bg, #0a0805)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-primary)' }}
          >
            {isTranslatingEn && lang === 'en' && <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: '0.7rem' }}>◌</span>}
            {lang === 'it' ? 'EN' : 'IT'}
          </button>

          <button
            onClick={goToBook}
            style={{ borderRadius: 999, fontFamily: 'var(--font-label)', fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase', padding: '0.55rem 1.5rem', border: '1px solid rgba(var(--color-primary-rgb), 0.5)', color: 'var(--color-primary-text, var(--color-primary))', background: 'transparent', cursor: 'pointer', transition: 'all 0.35s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-primary, #c9a84c)'; e.currentTarget.style.color = 'var(--color-bg, #0a0805)'; e.currentTarget.style.borderColor = 'var(--color-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-primary)'; e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb), 0.5)' }}
          >
            {t.nav.book}
          </button>
        </div>

        {/* Mobile hamburger — bigger touch target */}
        <button
          className="md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: '12px',
            marginRight: '-12px',
            zIndex: 1001,
          }}
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              style={{ display: 'block', height: 1.5, width: 28, background: menuOpen ? 'var(--color-primary)' : 'var(--color-text, #f5ede0)', borderRadius: 2 }}
              animate={
                menuOpen
                  ? i === 0 ? { rotate: 45, y: 7.5 }
                  : i === 1 ? { opacity: 0, scaleX: 0 }
                  : { rotate: -45, y: -7.5 }
                  : { rotate: 0, y: 0, opacity: 1, scaleX: 1 }
              }
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            />
          ))}
        </button>
      </motion.nav>

      {/* Admin button */}
      {isAdmin && (
        <motion.button
          onClick={() => scrollTo('admin')}
          className="fixed bottom-6 left-6 z-[1999]"
          style={{ borderRadius: 999, fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '0.55rem 1.1rem', background: '#8b3a2a', color: '#f8efe2', border: '1px solid rgba(var(--color-primary-rgb), 0.2)', cursor: 'pointer' }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 2.8, type: 'spring', stiffness: 200 }}
          whileHover={{ scale: 1.05 }}
        >
          ⚙ Admin
        </motion.button>
      )}

      {/* Mobile menu — full screen overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed inset-0 z-[999] flex flex-col items-center justify-center"
            style={{
              // Sfondo opaco, niente backdrop-filter né clip-path: si anima solo opacity/transform (GPU, 60fps)
              background: 'var(--color-bg, #080604)',
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              willChange: 'opacity, transform',
              paddingTop: 'max(80px, env(safe-area-inset-top, 80px))',
              paddingBottom: 'max(40px, env(safe-area-inset-bottom, 40px))',
              gap: 0,
            }}
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.26, ease: [0.32, 0.72, 0, 1] }}
          >
            {/* Decorative site name */}
            <div style={{
              fontFamily: 'var(--font-label)',
              fontSize: 'clamp(0.45rem, 1.8vw, 0.55rem)',
              letterSpacing: '0.5em',
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              marginBottom: 'clamp(2rem, 6vh, 3.5rem)',
            }}>
              {settings.siteName || 'Emporio 46'}
            </div>

            {/* Nav links */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(1.2rem, 4vh, 2rem)', width: '100%' }}>
              {navLinks.map((link, i) => (
                <motion.button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(1.8rem, 7vw, 2.8rem)',
                    color: 'var(--color-text, #f5ede0)',
                    transition: 'color 0.3s',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.2rem 2rem',
                    lineHeight: 1.1,
                    touchAction: 'manipulation',
                  }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.035 + 0.05, duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text, #f5ede0)')}
                >
                  {link.label}
                </motion.button>
              ))}

              {/* CTA — Prenota visita */}
              <motion.button
                onClick={goToBook}
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontSize: 'clamp(1.8rem, 7vw, 2.8rem)',
                  color: 'var(--color-primary-text, var(--color-primary))',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.2rem 2rem',
                  lineHeight: 1.1,
                  touchAction: 'manipulation',
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: navLinks.length * 0.035 + 0.05, duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              >
                {t.nav.book}
              </motion.button>
            </div>

            {/* Bottom section */}
            <div style={{ marginTop: 'clamp(2rem, 6vh, 3rem)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              {/* Lang toggle */}
              <motion.button
                onClick={() => { handleLangToggle(); setMenuOpen(false) }}
                style={{ borderRadius: 999,
                  fontFamily: 'var(--font-label)',
                  fontSize: 'clamp(0.6rem, 2.5vw, 0.72rem)',
                  letterSpacing: '0.3em',
                  color: 'var(--color-primary-text, var(--color-primary))',
                  border: '1px solid rgba(var(--color-primary-rgb), 0.35)',
                  padding: '0.6rem 2rem',
                  background: 'none',
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                  minHeight: 44,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
              >
                {lang === 'it' ? 'Switch to EN' : 'Passa a IT'}
              </motion.button>

              {/* Note Legali */}
              <motion.button
                onClick={() => { onOpenLegal?.('termini'); setMenuOpen(false) }}
                style={{ borderRadius: 999,
                  fontFamily: 'var(--font-label)',
                  fontSize: 'clamp(0.52rem, 2vw, 0.62rem)',
                  letterSpacing: '0.28em',
                  textTransform: 'uppercase',
                  color: 'color-mix(in srgb, var(--color-text-muted) 55%, transparent)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.4rem 1rem',
                  minHeight: 44,
                  touchAction: 'manipulation',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {lang === 'it' ? 'Note Legali' : 'Legal Notes'}
              </motion.button>

              {/* Social icons */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 }}
                style={{ display: 'flex', gap: '1rem' }}
              >
                <a href={safeHref(settings.instagram, 'https://www.instagram.com/emporio46firenze')} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                  style={{ width: 48, height: 48, border: '1px solid rgba(var(--color-primary-rgb), 0.25)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 22, height: 22 }}>
                    <defs>
                      <linearGradient id="ig-mob" x1="0" y1="1" x2="1" y2="0">
                        <stop offset="0%" stopColor="#f9ce34"/>
                        <stop offset="25%" stopColor="#ee2a7b"/>
                        <stop offset="100%" stopColor="#6228d7"/>
                      </linearGradient>
                    </defs>
                    <rect x="2" y="2" width="20" height="20" rx="5.5" stroke="url(#ig-mob)" strokeWidth="1.8" fill="none"/>
                    <circle cx="12" cy="12" r="4.2" stroke="url(#ig-mob)" strokeWidth="1.8" fill="none"/>
                    <circle cx="17.5" cy="6.5" r="1.1" fill="url(#ig-mob)"/>
                  </svg>
                </a>
                <a href={`https://wa.me/${settings.whatsapp || '393756106713'}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
                  style={{ width: 48, height: 48, border: '1px solid rgba(37,211,102,0.3)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ width: 24, height: 24 }}>
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.948-1.42A9.956 9.956 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" fill="#25d366"/>
                    <path d="M16.87 14.814c-.248-.124-1.47-.726-1.697-.808-.228-.083-.394-.124-.56.124-.166.248-.643.808-.788.974-.145.165-.29.186-.538.062-.248-.124-1.049-.387-1.997-1.234-.738-.66-1.236-1.473-1.381-1.722-.145-.248-.015-.382.109-.505.112-.111.248-.29.372-.436.124-.145.165-.248.248-.414.083-.165.041-.31-.021-.434-.062-.124-.56-1.349-.766-1.848-.202-.484-.407-.418-.56-.426-.145-.007-.31-.009-.476-.009a.913.913 0 00-.663.31c-.228.248-.869.85-.869 2.073s.89 2.403 1.014 2.569c.124.165 1.753 2.677 4.248 3.754.594.257 1.057.41 1.419.524.596.19 1.139.163 1.568.099.479-.072 1.47-.601 1.678-1.182.207-.58.207-1.077.145-1.182-.062-.103-.228-.165-.476-.29z" fill="white"/>
                  </svg>
                </a>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
