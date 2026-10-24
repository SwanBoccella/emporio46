// @ts-nocheck
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../../context/AppContext'
import { openLegal } from '../../App'
import { safeHref } from '../../utils/safeUrl'
import { deriveTheme } from '../../utils/themeColors'

/* ─── Particle system ─── */
function Particles({ color }: { color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let animId: number
    let W = 0, H = 0

    const resize = () => {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Parse hex color → rgb components for rgba usage
    let r = 201, g = 168, b = 76
    try {
      const m = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
      if (m) { r = parseInt(m[1], 16); g = parseInt(m[2], 16); b = parseInt(m[3], 16) }
    } catch {}

    const N = 38
    const particles = Array.from({ length: N }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 0.5 + Math.random() * 1.8,
      vx: (Math.random() - 0.5) * 0.28,
      vy: -0.12 - Math.random() * 0.22,
      alpha: 0.05 + Math.random() * 0.28,
      pulse: Math.random() * Math.PI * 2,
    }))

    const tick = () => {
      ctx.clearRect(0, 0, W, H)
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.pulse += 0.018
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W }
        if (p.x < -10) p.x = W + 10
        if (p.x > W + 10) p.x = -10
        const a = p.alpha * (0.6 + 0.4 * Math.sin(p.pulse))
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},${a})`
        ctx.fill()
      })
      animId = requestAnimationFrame(tick)
    }
    tick()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [color])

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }} />
}

/* ─── Ornamental line ─── */
function OrnamentLine({ primary }: { primary: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', margin: '0 auto', width: 'min(340px, 80vw)' }}>
      <motion.div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${primary}80)` }}
        initial={{ scaleX: 0, originX: 0 }} animate={{ scaleX: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.6 }} />
      <motion.div style={{ width: 6, height: 6, background: primary, transform: 'rotate(45deg)', flexShrink: 0 }}
        initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 1.0 }} />
      <motion.div style={{ width: 4, height: 4, border: `1px solid ${primary}99`, transform: 'rotate(45deg)', flexShrink: 0 }}
        initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 1.1 }} />
      <motion.div style={{ width: 6, height: 6, background: primary, transform: 'rotate(45deg)', flexShrink: 0 }}
        initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 1.2 }} />
      <motion.div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${primary}80)` }}
        initial={{ scaleX: 0, originX: 1 }} animate={{ scaleX: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.6 }} />
    </div>
  )
}

/* ─── Countdown digit ─── */
function Digit({ value, label, bg, border, text, primary, muted }: {
  value: number; label: string
  bg: string; border: string; text: string; primary: string; muted: string
}) {
  const str = String(value).padStart(2, '0')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ position: 'relative', width: 'clamp(64px,14vw,88px)', height: 'clamp(70px,15vw,96px)' }}>
        <div style={{ position: 'absolute', inset: 0, background: bg, border: `1px solid ${border}`, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: 8, height: 8, borderTop: `1px solid ${primary}80`, borderLeft: `1px solid ${primary}80` }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderTop: `1px solid ${primary}80`, borderRight: `1px solid ${primary}80` }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: 8, height: 8, borderBottom: `1px solid ${primary}80`, borderLeft: `1px solid ${primary}80` }} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderBottom: `1px solid ${primary}80`, borderRight: `1px solid ${primary}80` }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: `${primary}18` }} />
        <AnimatePresence mode="popLayout">
          <motion.span key={str}
            style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display, Cinzel, serif)', fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', color: text, fontWeight: 600, letterSpacing: '0.04em' }}
            initial={{ y: -18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 18, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>
            {str}
          </motion.span>
        </AnimatePresence>
      </div>
      <span style={{ fontFamily: 'var(--font-display, Cinzel, serif)', fontSize: '0.4rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: muted }}>
        {label}
      </span>
    </div>
  )
}

/* ─── Instagram SVG icon ─── */
function IgIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="0.5" fill={color} stroke="none"/>
    </svg>
  )
}

/* ─── Main component ─── */
export default function MaintenancePage({ onExpired }: { onExpired: () => void }) {
  const { settings } = useApp()

  // Resolve theme colors
  const bg      = settings.bgColor        || '#080604'
  const bgAlt   = settings.bgAltColor     || '#0f0b06'
  const bgCard  = settings.bgCardColor    || '#1a1208'
  const th      = deriveTheme(settings)
  const text    = th.text
  const muted   = th.muted
  const primary = settings.primaryColor   || '#c4561f'
  const isDark  = th.isDark

  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0, total: 0 })
  const [totalDuration, setTotalDuration] = useState(1)
  const [expired, setExpired] = useState(false)
  const expiredRef = useRef(false)

  useEffect(() => {
    const endISO = settings.maintenanceEndDate
    if (!endISO) { setTimeLeft({ d: 0, h: 0, m: 0, s: 0, total: 0 }); return }
    const endTs = new Date(endISO).getTime()
    if (isNaN(endTs)) return
    if (Date.now() >= endTs) { onExpired(); return }
    const initialTotal = endTs - Date.now()
    setTotalDuration(initialTotal || 1)
    const tick = () => {
      const rem = Math.max(0, endTs - Date.now())
      setTimeLeft({ d: Math.floor(rem / 86400000), h: Math.floor(rem / 3600000) % 24, m: Math.floor(rem / 60000) % 60, s: Math.floor(rem / 1000) % 60, total: rem })
      if (rem === 0 && !expiredRef.current) {
        expiredRef.current = true; setExpired(true); setTimeout(onExpired, 2400)
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [settings.maintenanceEndDate, onExpired])

  const hasCountdown = !!settings.maintenanceEndDate
  const progress = hasCountdown ? Math.min(1, 1 - timeLeft.total / totalDuration) : 0
  const progressPct = Math.round(progress * 100)

  const Corner = ({ style }: { style: React.CSSProperties }) => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ position: 'absolute', opacity: 0.45, ...style }}>
      <path d="M1 31V1H31" stroke={primary} strokeWidth="1.2" />
      <circle cx="1" cy="1" r="2" fill={primary} fillOpacity="0.6" />
    </svg>
  )

  const hasBgImage    = !!settings.maintenanceBgImageUrl
  const showInstagram = settings.maintenanceShowInstagram !== false && !!settings.instagram
  const showLegal     = settings.maintenanceShowLegal !== false

  // Background: image overlay or plain color
  const bgStyle: React.CSSProperties = hasBgImage
    ? { background: bg }
    : { background: bg }

  return (
    <motion.div
      style={{
        position: 'fixed', inset: 0, zIndex: 50000,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(1.5rem, 5vw, 3rem)',
        overflow: 'hidden',
        ...bgStyle,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: expired ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: expired ? 1.2 : 0.6 }}
    >
      {/* Background image layer */}
      {hasBgImage && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: `url(${settings.maintenanceBgImageUrl})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: isDark ? 'brightness(0.25) saturate(0.7)' : 'brightness(0.55) saturate(0.6)',
        }} />
      )}

      <Particles color={primary} />

      {/* Radial glow */}
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${primary}${isDark ? '0a' : '14'} 0%, transparent 70%)`, pointerEvents: 'none', zIndex: 1 }} />

      {/* Frame corners */}
      <motion.div
        style={{ position: 'absolute', inset: 'clamp(1rem, 3vw, 2rem)', border: `1px solid ${primary}14`, pointerEvents: 'none', zIndex: 1 }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 1 }}
      >
        <Corner style={{ top: -1, left: -1 }} />
        <Corner style={{ top: -1, right: -1, transform: 'scaleX(-1)' }} />
        <Corner style={{ bottom: -1, left: -1, transform: 'scaleY(-1)' }} />
        <Corner style={{ bottom: -1, right: -1, transform: 'scale(-1)' }} />
      </motion.div>

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(1.2rem, 3vw, 2rem)', width: '100%', maxWidth: 640, textAlign: 'center' }}>

        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          {(settings.maintenanceLogoUrl || settings.logoUrl) ? (
            <img src={settings.maintenanceLogoUrl || settings.logoUrl} alt={settings.siteName || 'Logo'}
              style={{ width: 'clamp(72px, 18vw, 110px)', height: 'clamp(72px, 18vw, 110px)', objectFit: 'contain', filter: `drop-shadow(0 4px 24px ${primary}33)` }} />
          ) : (
            <div style={{ width: 88, height: 88, border: `1px solid ${primary}4d`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${primary}0d` }}>
              <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '2.4rem', color: 'var(--color-primary-text, var(--color-primary))' }}>46</span>
            </div>
          )}
        </motion.div>

        {/* Site name */}
        <motion.p
          style={{ fontFamily: 'var(--font-display, Cinzel, serif)', fontSize: '0.52rem', letterSpacing: '0.45em', textTransform: 'uppercase', color: primary, margin: 0 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.15 }}
        >
          {settings.siteName || 'Emporio 46'}
        </motion.p>

        <OrnamentLine primary={primary} />

        {/* Title + message */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}>
          <h1 style={{ fontFamily: 'var(--font-display, Playfair Display, serif)', fontSize: 'clamp(1.8rem, 5.5vw, 3rem)', color: text, fontWeight: 400, margin: 0, lineHeight: 1.15 }}>
            {expired ? 'Bentornati' : 'Sito in manutenzione'}
          </h1>
          {!expired && (
            <p style={{ fontFamily: 'var(--font-body, Cormorant Garamond, serif)', fontSize: 'clamp(0.95rem, 2.5vw, 1.15rem)', color: muted, fontStyle: 'italic', margin: '0.9rem 0 0', lineHeight: 1.7, maxWidth: 480 }}>
              {settings.maintenanceMessage || 'Stiamo lavorando per migliorare la vostra esperienza. Torneremo presto con qualcosa di speciale.'}
            </p>
          )}
        </motion.div>

        {/* Countdown */}
        {hasCountdown && !expired && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.4rem', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'clamp(0.6rem, 2vw, 1.2rem)' }}>
              {timeLeft.d > 0 && (<>
                <Digit value={timeLeft.d} label="Giorni" bg={bgCard} border={`${primary}38`} text={text} primary={primary} muted={muted} />
                <div style={{ fontFamily: 'var(--font-display, Cinzel, serif)', fontSize: 'clamp(1.4rem,4vw,2rem)', color: `${primary}80`, lineHeight: 1, paddingTop: 'clamp(18px,3.5vw,26px)', userSelect: 'none' }}>:</div>
              </>)}
              <Digit value={timeLeft.h} label="Ore" bg={bgCard} border={`${primary}38`} text={text} primary={primary} muted={muted} />
              <div style={{ fontFamily: 'var(--font-display, Cinzel, serif)', fontSize: 'clamp(1.4rem,4vw,2rem)', color: `${primary}80`, lineHeight: 1, paddingTop: 'clamp(18px,3.5vw,26px)', userSelect: 'none' }}>:</div>
              <Digit value={timeLeft.m} label="Minuti" bg={bgCard} border={`${primary}38`} text={text} primary={primary} muted={muted} />
              <div style={{ fontFamily: 'var(--font-display, Cinzel, serif)', fontSize: 'clamp(1.4rem,4vw,2rem)', color: `${primary}80`, lineHeight: 1, paddingTop: 'clamp(18px,3.5vw,26px)', userSelect: 'none' }}>:</div>
              <Digit value={timeLeft.s} label="Secondi" bg={bgCard} border={`${primary}38`} text={text} primary={primary} muted={muted} />
            </div>
            {/* Progress bar */}
            <div style={{ width: 'min(440px, 88vw)', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-display, Cinzel, serif)', fontSize: '0.38rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: `${primary}80` }}>Avanzamento</span>
                <span style={{ fontFamily: 'var(--font-display, Cinzel, serif)', fontSize: '0.42rem', letterSpacing: '0.1em', color: primary }}>{progressPct}%</span>
              </div>
              <div style={{ height: 4, background: `${primary}1a`, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, top: '50%', width: 3, height: 3, background: `${primary}4d`, transform: 'translateY(-50%) rotate(45deg)' }} />
                <div style={{ position: 'absolute', right: 0, top: '50%', width: 3, height: 3, background: `${primary}4d`, transform: 'translateY(-50%) rotate(45deg)' }} />
                <motion.div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, background: `linear-gradient(to right, ${primary}80, ${primary})`, transformOrigin: 'left' }}
                  animate={{ scaleX: progress }} transition={{ duration: 1, ease: 'linear' }} />
                <motion.div style={{ position: 'absolute', top: 0, bottom: 0, width: 60, background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.25), transparent)' }}
                  animate={{ x: ['-60px', '500px'] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.2 }} />
              </div>
            </div>
          </motion.div>
        )}

        {/* Expired message */}
        {expired && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ fontFamily: 'var(--font-body, Cormorant Garamond, serif)', fontSize: '1.1rem', color: muted, fontStyle: 'italic' }}>
              La manutenzione è completata. Il sito si riapre…
            </div>
            <motion.div style={{ width: 48, height: 2, background: primary }} animate={{ scaleX: [0, 1] }} transition={{ duration: 1.5, ease: 'linear' }} />
          </motion.div>
        )}

        {/* Phone + Instagram row */}
        {!expired && (settings.telefono || showInstagram) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7, duration: 0.6 }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {settings.telefono && (
              <a href={`tel:${settings.telefono.replace(/\s/g, '')}`}
                style={{ fontFamily: 'var(--font-display, Cinzel, serif)', fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: primary, textDecoration: 'none', border: `1px solid ${primary}4d`, padding: '0.7rem 1.4rem', display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 11a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .18h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14h.01" /></svg>
                {settings.telefono}
              </a>
            )}
            {showInstagram && (
              <a href={safeHref(settings.instagram)} target="_blank" rel="noopener noreferrer"
                style={{ fontFamily: 'var(--font-display, Cinzel, serif)', fontSize: '0.58rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: primary, textDecoration: 'none', border: `1px solid ${primary}4d`, padding: '0.7rem 1.2rem', display: 'inline-flex', alignItems: 'center', gap: '0.55rem' }}>
                <IgIcon color={primary} />
                {settings.instagramHandle || 'Instagram'}
              </a>
            )}
          </motion.div>
        )}

        {/* Legal links */}
        {showLegal && !expired && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85, duration: 0.6 }}
            style={{ display: 'flex', gap: '1.4rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {(['termini', 'privacy', 'cookie'] as const).map((tab, i) => {
              const labels = { termini: 'Termini di servizio', privacy: 'Privacy Policy', cookie: 'Cookie Policy' }
              return (
                <button key={tab} onClick={() => openLegal(tab)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body, Cormorant Garamond, serif)', fontSize: '0.78rem', color: `${muted}cc`, fontStyle: 'italic', padding: 0, textDecoration: 'underline', textDecorationColor: `${primary}40`, textUnderlineOffset: 3 }}>
                  {labels[tab]}
                </button>
              )
            })}
          </motion.div>
        )}

        {/* Bottom tagline */}
        <motion.div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.95, duration: 0.8 }}>
          <div style={{ width: 24, height: 1, background: `${primary}40`, margin: '0 auto' }} />
          <p style={{ fontFamily: 'var(--font-body, Cormorant Garamond, serif)', fontSize: '0.78rem', color: `${muted}73`, fontStyle: 'italic', margin: 0 }}>
            Firenze · Arredi vintage e bijoux
          </p>
        </motion.div>

      </div>

      {/* Hidden admin button */}
      <button onClick={() => window.dispatchEvent(new CustomEvent('mnt-open-admin'))}
        style={{ position: 'absolute', bottom: '1.2rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.15, padding: '0.5rem', zIndex: 3 }}
        title="Admin">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={primary} strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0112 0v2"/></svg>
      </button>
    </motion.div>
  )
}
