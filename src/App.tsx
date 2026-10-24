// @ts-nocheck
import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useApp } from './context/AppContext'
import { safeGtagId } from './utils/safeUrl'
import { useLenis } from './hooks/useLenis'
import { deriveTheme, applyDerivedTheme } from './utils/themeColors'

import Loader from './components/ui/Loader'
import Cursor from './components/ui/Cursor'
import Navbar from './components/ui/Navbar'
import WhatsAppButton from './components/ui/WhatsAppButton'

import HeroSection from './components/sections/HeroSection'
import AboutSection from './components/sections/AboutSection'
import CatalogSection from './components/sections/CatalogSection'
import WhySection from './components/sections/WhySection'
import ReviewsSection from './components/sections/ReviewsSection'
import ContactSection from './components/sections/ContactSection'
import MaintenancePage from './components/sections/MaintenancePage'
import LocationSection from './components/sections/LocationSection'
import FooterSection from './components/sections/FooterSection'
import LegalPage from './components/sections/LegalPage'
import MarqueeStrip from './components/ui/MarqueeStrip'
import AdminPanel from './components/admin/AdminPanel'
import SyncToast from './components/ui/SyncToast'
import ArmchairShowcase from './components/sections/ArmchairShowcase'

gsap.registerPlugin(ScrollTrigger)

type LegalTab = 'termini' | 'privacy' | 'cookie'

// Global opener so Footer/Navbar can trigger legal page without prop drilling
export function openLegal(tab: LegalTab = 'termini') {
  window.dispatchEvent(new CustomEvent('open-legal', { detail: tab }))
}

export default function App() {
  const { lang, seo, settings, updateSettings, settingsEn } = useApp()
  const [legalTab, setLegalTab] = useState<LegalTab | null>(null)
  useLenis()

  // Google Analytics: caricato da codice (nessuno <script> inline, compatibile con la CSP) e solo con ID valido
  useEffect(() => {
    const id = safeGtagId(seo.gtagId)
    if (!id || document.querySelector(`script[data-gtag="${id}"]`)) return
    const w = window as unknown as { dataLayer: unknown[]; gtag: (...a: unknown[]) => void }
    w.dataLayer = w.dataLayer || []
    w.gtag = function () { w.dataLayer.push(arguments) }
    w.gtag('js', new Date())
    w.gtag('config', id)
    const el = document.createElement('script')
    el.async = true
    el.dataset.gtag = id
    el.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
    document.head.appendChild(el)
  }, [seo.gtagId])

  // Apply dynamic theme CSS variables from admin settings
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--color-primary', settings.primaryColor || '#c4561f')
    // Derivati del colore principale: usati da tutti i componenti al posto dell'oro hard-coded
    const prim = settings.primaryColor || '#c4561f'
    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(prim)
    if (hex) {
      const h = hex[1].length === 3 ? hex[1].split('').map(c => c + c).join('') : hex[1]
      root.style.setProperty('--color-primary-rgb', `${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}`)
    }
    const bgHex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(settings.bgColor || '#f3e8d4')
    if (bgHex) {
      const h = bgHex[1].length === 3 ? bgHex[1].split('').map(c => c + c).join('') : bgHex[1]
      root.style.setProperty('--color-bg-rgb', `${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}`)
    }
    root.style.setProperty('--color-bg', settings.bgColor || '#f3e8d4')
    root.style.setProperty('--color-bg-alt', settings.bgAltColor || '#140e08')
    root.style.setProperty('--color-bg-card', settings.bgCardColor || '#1c1510')
    root.style.setProperty('--color-accent', settings.accentColor || '#9a8a78')
    root.style.setProperty('--color-overlay', settings.overlayColor || 'rgba(10,8,5,0.72)')
    // Colori testo "a prova di contrasto": tema chiaro → testo scuro + alone bianco; tema scuro → testo chiaro + alone nero.
    // (i valori scelti nell'admin restano com'è nel database: qui si corregge solo ciò che sarebbe illeggibile)
    const th = deriveTheme(settings)
    applyDerivedTheme(root, th)
    // Apply background color to body directly for immediate effect
    document.body.style.backgroundColor = settings.bgColor || '#f3e8d4'
    document.body.style.color = th.text
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', th.bg)
  }, [settings.primaryColor, settings.bgColor, settings.bgAltColor, settings.bgCardColor, settings.textColor, settings.textMutedColor, settings.accentColor, settings.overlayColor])

  // Apply dynamic font families from admin settings
  useEffect(() => {
    const SERIF = ['Fraunces', 'Playfair Display', 'Cormorant Garamond', 'Cinzel', 'EB Garamond', 'Libre Baskerville', 'Lora', 'Merriweather', 'Source Serif 4']
    const stack = (n: string) => `'${n}', ${SERIF.includes(n) ? 'Georgia, serif' : 'system-ui, sans-serif'}`
    const root = document.documentElement
    root.style.setProperty('--font-display', stack(settings.fontDisplay || 'Fraunces'))
    root.style.setProperty('--font-body', stack(settings.fontBody || 'Jost'))
    root.style.setProperty('--font-label', stack(settings.fontLabel || settings.fontBody || 'Jost'))
  }, [settings.fontDisplay, settings.fontBody, settings.fontLabel])

  // After loader disappears (2.4s), refresh ScrollTrigger so all
  // triggers calculate positions on the fully-painted page
  useEffect(() => {
    // il refresh pesante è già stato fatto dal Loader prima di aprirsi: qui basta riallineare
    const refresh = () => ScrollTrigger.update()
    window.addEventListener('loader-done', refresh)
    // Fallback di sicurezza: il preloader ha un timeout massimo di ~14s
    const id = setTimeout(() => ScrollTrigger.refresh(true), 90000)
    return () => { window.removeEventListener('loader-done', refresh); clearTimeout(id) }
  }, [])

  // Listen for global legal open events from Footer / Navbar
  useEffect(() => {
    const handler = (e: Event) => {
      setLegalTab((e as CustomEvent).detail as LegalTab)
    }
    window.addEventListener('open-legal', handler)
    return () => window.removeEventListener('open-legal', handler)
  }, [])

  // Also refresh on font load (Google Fonts can shift layout)
  useEffect(() => {
    if ('fonts' in document) {
      document.fonts.ready.then(() => {
        ScrollTrigger.refresh(true)
      })
    }
  }, [])

  return (
    <>
      <Helmet>
        <title>{seo.metaTitle}</title>
        <meta name="description" content={seo.metaDesc} />
        <meta name="keywords" content={seo.keywords} />
        <meta name="robots" content={seo.robots} />
        <meta property="og:title" content={seo.ogTitle} />
        <meta property="og:description" content={seo.ogDesc} />
        {seo.ogImage && <meta property="og:image" content={seo.ogImage} />}
        <meta property="og:type" content="website" />
        <link rel="canonical" href={seo.canonical} />
        <html lang={lang} />
      </Helmet>

      {/* Admin panel — always rendered at top level so ⚙ button stays accessible even in maintenance mode */}
      <AdminPanel />
      <SyncToast />

      {/* Maintenance mode — full-screen page shown to visitors */}
      <AnimatePresence>
        {settings.maintenanceMode && (
          <MaintenancePage
            key="maintenance"
            onExpired={() => updateSettings({ maintenanceMode: false, maintenanceEndDate: '' })}
          />
        )}
      </AnimatePresence>

      {!settings.maintenanceMode && (
        <div className="grain">
          <Loader />
          <Cursor />
          {/* Announcement banner — fixed at very top, above navbar */}
          {settings.bannerAttivo && settings.bannerTesto && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: settings.bannerColore || 'var(--color-primary)', color: '#0a0805', padding: '0.55rem 2rem', textAlign: 'center', fontFamily: 'var(--font-label)', fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase', zIndex: 1100 }}>
              {lang === 'en' ? (settingsEn.bannerTesto || settings.bannerTesto) : settings.bannerTesto}
            </div>
          )}
          <Navbar onOpenLegal={(tab) => setLegalTab(tab as LegalTab)} bannerActive={!!(settings.bannerAttivo && settings.bannerTesto)} />
          <WhatsAppButton />

          <main>
            {/* spacer so hero doesn't go under fixed banner+navbar */}
            {settings.bannerAttivo && settings.bannerTesto && (
              <div style={{ height: 36 }} />
            )}
            <HeroSection />
            <MarqueeStrip lang={lang} />
            <ArmchairShowcase />
            <AboutSection />
            <CatalogSection />
            <WhySection />
            <ReviewsSection />
            <ContactSection />
            <LocationSection />
          </main>

          <FooterSection onOpenLegal={(tab) => setLegalTab(tab as LegalTab)} />
        </div>
      )}

      <AnimatePresence>
        {legalTab && (
          <LegalPage
            tab={legalTab}
            onTabChange={(t) => setLegalTab(t)}
            onClose={() => setLegalTab(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
