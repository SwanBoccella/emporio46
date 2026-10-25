// @ts-nocheck
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../../context/AppContext'
import { getLenis } from '../../hooks/useLenis'
import { safeHref } from '../../utils/safeUrl'
import SectionBackdrop from './SectionBackdrop'
import { deriveTheme } from '../../utils/themeColors'

export default function Navbar({ onOpenLegal, bannerActive }: { onOpenLegal?: (tab: string) => void; bannerActive?: boolean }) {
  const { t, lang, setLang, isAdmin, setContactTab, settings, translateSettingsToEn, isTranslatingEn, settingsEn, reviews } = useApp()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const navTop = bannerActive ? 36 : 0
  // Il pill (sfondo tema) si nasconde quando il menu è aperto: sopra al video scuro restano solo testi chiari
  const pillOn = scrolled && !menuOpen
  // Il menu ha sempre sfondo scuro (video della candela), quindi ogni testo sta dentro una "pillola" opaca che garantisce il contrasto:
  //  - tema scuro  → testo SCURO su pillola CHIARA
  //  - tema chiaro → testo CHIARO su pillola SCURA
  // Le variabili vengono ridefinite solo qui, il resto del sito non cambia.
  const siteIsDark = deriveTheme(settings).isDark
  const menuTheme: any = siteIsDark
    ? {
        '--color-text': '#1d120b',
        '--color-text-soft': '#33231a',
        '--color-text-muted': '#4a372b',
        '--color-primary-text': 'color-mix(in srgb, var(--color-primary) 45%, #1a0d06)',
        '--text-halo-rgb': '255, 255, 255',
        '--menu-pill-bg': 'rgba(250, 242, 228, 0.94)',
        '--menu-pill-border': 'rgba(29, 18, 11, 0.28)',
        color: '#1d120b',
      }
    : {
        '--color-text': '#fbf3e4',
        '--color-text-soft': '#eadfca',
        '--color-text-muted': '#d9ccb4',
        '--color-primary-text': 'color-mix(in srgb, var(--color-primary) 38%, #ffe2a8)',
        '--text-halo-rgb': '0, 0, 0',
        '--menu-pill-bg': 'rgba(18, 11, 7, 0.88)',
        '--menu-pill-border': 'rgba(251, 243, 228, 0.35)',
        color: '#fbf3e4',
      }
  const menuPill: any = {
    background: 'var(--menu-pill-bg)',
    border: '1px solid var(--menu-pill-border)',
    borderRadius: 999,
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    textShadow: 'none',
  }

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
          textShadow: '0 0 10px rgba(var(--text-halo-rgb, 0,0,0), 0.45)',
          ...(menuOpen ? menuTheme : {}),
        }}
        animate={{
          background: menuOpen ? 'var(--menu-pill-bg)' : pillOn ? 'color-mix(in srgb, var(--color-bg-card) 94%, transparent)' : 'transparent',
          border: menuOpen ? '2px solid var(--menu-pill-border)' : pillOn ? '2px solid var(--color-text)' : '2px solid transparent',
          boxShadow: pillOn ? '4px 4px 0 var(--color-text)' : '0 0 0 transparent',
          backdropFilter: pillOn ? 'blur(14px) saturate(1.4)' : 'blur(0px)',
        }}
        transition={{ duration: 0.45 }}
      >
        {/* Sfondo della barra: compare insieme al "pill" quando si scorre */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', overflow: 'hidden', pointerEvents: 'none', zIndex: -1 }}>
          <SectionBackdrop slot="navbar" visible={pillOn} />
          {/* Velo del colore della card: la texture resta come venatura, ma il testo ha sempre contrasto (tema chiaro e scuro) */}
          <div style={{ position: 'absolute', inset: 0, background: 'color-mix(in srgb, var(--color-bg-card) 86%, transparent)', opacity: pillOn ? 1 : 0, transition: 'opacity 0.45s' }} />
        </div>
        {/* Logo */}
        <button
          onClick={() => scrollTo('hero')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 1, minWidth: 0 }}
        >
          {settings.logoUrl ? (
          <img
            src={settings.logoUrl}
            alt={`${settings.siteName || 'Emporio 46'} logo`}
            style={{ height: 52, width: 52, objectFit: 'contain', borderRadius: '50%', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))', flexShrink: 0 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          ) : (
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
              <circle cx="18" cy="18" r="16.5" stroke="var(--color-primary)" strokeWidth="1" />
              <text x="18" y="23" textAnchor="middle" fontFamily="var(--font-display)" fontStyle="italic" fontSize="15" fill="var(--color-primary)">46</text>
            </svg>
          )}
          <span className="nav-brand-text" style={{ fontFamily: 'var(--font-label)', fontSize: 'clamp(1.1rem, 5vw, 1.45rem)', fontWeight: 500, letterSpacing: '0.05em', color: 'var(--color-text, #f5ede0)', lineHeight: 1.15, whiteSpace: 'nowrap', flexShrink: 1, minWidth: 0 }}>
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
              style={{ borderRadius: 999, fontFamily: 'var(--font-label)', fontSize: 'clamp(0.74rem, 1.05vw, 0.86rem)', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-soft, var(--color-text))', transition: 'color 0.3s', background: 'none', border: 'none', cursor: 'pointer', padding: '0.3rem 0', position: 'relative' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-text, #f5ede0)'
                const line = e.currentTarget.querySelector('.nav-line') as HTMLElement
                if (line) line.style.width = '100%'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-text-soft, var(--color-text))'
                const line = e.currentTarget.querySelector('.nav-line') as HTMLElement
                if (line) line.style.width = '0'
              }}
            >
              {link.label}
              <span
                className="nav-line"
                style={{ position: 'absolute', bottom: -2, left: 0, height: 2, width: 0, background: 'var(--color-primary)', transition: 'width 0.4s cubic-bezier(0.16,1,0.3,1)' }}
              />
            </button>
          ))}

          {/* Legal link */}
          <button
            onClick={() => onOpenLegal?.('termini')}
            style={{ borderRadius: 999, fontFamily: 'var(--font-label)', fontSize: 'clamp(0.74rem, 1.05vw, 0.86rem)', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-soft, var(--color-text))', transition: 'color 0.3s', background: 'none', border: 'none', cursor: 'pointer', padding: '0.3rem 0', position: 'relative' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text, #f5ede0)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-soft, var(--color-text))' }}
          >
            {lang === 'it' ? 'Note Legali' : 'Legal'}
          </button>

          {/* Lang toggle */}
          <button
            onClick={handleLangToggle}
            style={{ borderRadius: 999, fontFamily: 'var(--font-label)', fontSize: '0.82rem', fontWeight: 600, letterSpacing: '0.16em', color: 'var(--color-primary-text, var(--color-primary))', border: '1.5px solid var(--color-primary-text, var(--color-primary))', padding: '0.35rem 0.8rem', background: 'transparent', cursor: 'pointer', transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-primary, #c9a84c)'; e.currentTarget.style.color = 'var(--color-bg, #0a0805)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-primary-text, var(--color-primary))' }}
          >
            {isTranslatingEn && lang === 'en' && <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: '0.7rem' }}>◌</span>}
            {lang === 'it' ? 'EN' : 'IT'}
          </button>

          <button
            onClick={goToBook}
            style={{ borderRadius: 999, fontFamily: 'var(--font-label)', fontSize: 'clamp(0.74rem, 1.05vw, 0.86rem)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.6rem 1.4rem', border: '1.5px solid var(--color-primary-text, var(--color-primary))', color: 'var(--color-primary-text, var(--color-primary))', background: 'transparent', cursor: 'pointer', transition: 'all 0.35s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-primary, #c9a84c)'; e.currentTarget.style.color = 'var(--color-bg, #0a0805)'; e.currentTarget.style.borderColor = 'var(--color-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-primary-text, var(--color-primary))'; e.currentTarget.style.borderColor = 'var(--color-primary-text, var(--color-primary))' }}
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
            gap: 7,
            padding: '14px 12px',
            marginRight: '-12px',
            zIndex: 1001,
          }}
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              style={{ display: 'block', height: 3, width: 32, background: menuOpen ? 'var(--color-primary-text, var(--color-primary))' : 'var(--color-text, #f5ede0)', borderRadius: 3 }}
              animate={
                menuOpen
                  ? i === 0 ? { rotate: 45, y: 10 }
                  : i === 1 ? { opacity: 0, scaleX: 0 }
                  : { rotate: -45, y: -10 }
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
          className="fixed bottom-6 left-1/2 z-[1999]"
          style={{ borderRadius: 999, fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '0.55rem 1.1rem', background: '#8b3a2a', color: '#f8efe2', border: '1px solid rgba(var(--color-primary-rgb), 0.2)', cursor: 'pointer', x: '-50%' }}
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
            className="fixed inset-0 z-[999]"
            style={{
              background: '#0b0805',
              willChange: 'opacity, transform',
              ...menuTheme,
              textShadow: 'none',
            }}
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.26, ease: [0.32, 0.72, 0, 1] }}
          >
            {/* Sfondo del menu: video o immagine, tutti i parametri da admin → Sfondi & Mappa */}
            <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', isolation: 'isolate' }}>
              <SectionBackdrop slot="menu" />
              {/* Velo leggero: il contrasto del testo è garantito dalle pillole, non dal video */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(8,5,3,0.25) 0%, rgba(8,5,3,0.1) 45%, rgba(8,5,3,0.3) 100%)' }} />
            </div>

            {/* Contenuto scorrevole sopra al video */}
            <div style={{
              position: 'absolute', inset: 0,
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              paddingTop: 'max(80px, env(safe-area-inset-top, 80px))',
              paddingBottom: 'max(40px, env(safe-area-inset-bottom, 40px))',
            }}>
            <div style={{ margin: 'auto 0', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Decorative site name */}
            <div style={{
              fontFamily: 'var(--font-label)',
              fontSize: 'clamp(0.8rem, 3vw, 0.95rem)',
              letterSpacing: '0.35em',
              color: 'var(--color-text-soft, var(--color-text))',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              marginBottom: 'clamp(2rem, 6vh, 3.5rem)',
              padding: '0.5rem 1.6rem',
              ...menuPill,
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
                    cursor: 'pointer',
                    padding: '0.35rem 1.8rem',
                    lineHeight: 1.1,
                    touchAction: 'manipulation',
                    ...menuPill,
                  }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.035 + 0.05, duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary-text, var(--color-primary))')}
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
                  cursor: 'pointer',
                  padding: '0.35rem 1.8rem',
                  lineHeight: 1.1,
                  touchAction: 'manipulation',
                  ...menuPill,
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
                  fontSize: 'clamp(0.85rem, 3.4vw, 1rem)',
                  fontWeight: 600,
                  letterSpacing: '0.2em',
                  color: 'var(--color-primary-text, var(--color-primary))',
                  border: '1.5px solid var(--color-primary-text, var(--color-primary))',
                  padding: '0.7rem 2.2rem',
                  ...menuPill,
                  border: '1.5px solid var(--color-primary-text, var(--color-primary))',
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
                  fontSize: 'clamp(0.8rem, 3vw, 0.92rem)',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-soft, var(--color-text))',
                  ...menuPill,
                  cursor: 'pointer',
                  padding: '0.4rem 1.2rem',
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
                  style={{ width: 48, height: 48, border: '1px solid var(--menu-pill-border)', background: 'var(--menu-pill-bg)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
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
                  style={{ width: 48, height: 48, border: '1px solid rgba(37,211,102,0.7)', background: 'var(--menu-pill-bg)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ width: 24, height: 24 }}>
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.948-1.42A9.956 9.956 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" fill="#25d366"/>
                    <path d="M16.87 14.814c-.248-.124-1.47-.726-1.697-.808-.228-.083-.394-.124-.56.124-.166.248-.643.808-.788.974-.145.165-.29.186-.538.062-.248-.124-1.049-.387-1.997-1.234-.738-.66-1.236-1.473-1.381-1.722-.145-.248-.015-.382.109-.505.112-.111.248-.29.372-.436.124-.145.165-.248.248-.414.083-.165.041-.31-.021-.434-.062-.124-.56-1.349-.766-1.848-.202-.484-.407-.418-.56-.426-.145-.007-.31-.009-.476-.009a.913.913 0 00-.663.31c-.228.248-.869.85-.869 2.073s.89 2.403 1.014 2.569c.124.165 1.753 2.677 4.248 3.754.594.257 1.057.41 1.419.524.596.19 1.139.163 1.568.099.479-.072 1.47-.601 1.678-1.182.207-.58.207-1.077.145-1.182-.062-.103-.228-.165-.476-.29z" fill="white"/>
                  </svg>
                </a>
              </motion.div>
            </div>
            </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
