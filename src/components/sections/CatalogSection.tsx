// @ts-nocheck
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, useInView, AnimatePresence, useMotionValue, useSpring } from 'framer-motion'
import { useApp } from '../../context/AppContext'
import SectionBackdrop from '../ui/SectionBackdrop'
import type { CatalogItem } from '../../types'
import { waItemLink } from '../../utils/whatsapp'
import { safeHref } from '../../utils/safeUrl'
import { REVEAL_VP } from '../../utils/reveal'

const ICONS: Record<string, string> = {
  mobili: '🪑', lampade: '💡', bijoux: '📿', specchi: '🪞', cornici: '🖼',
  complementi: '🏺', ceramiche: '🍶', modernariato: '☎️', altro: '✨',
}

const ITEMS_PER_PAGE = 12
const GAP = 24

const badgeStyle = (stato: string) => {
  if (stato === 'disponibile') return { background: 'rgba(var(--color-primary-rgb), 0.9)', color: 'var(--color-on-primary, var(--color-bg))' }
  if (stato === 'in_vetrina') return { background: 'rgba(139,58,42,0.92)', color: '#f8efe2' }
  if (stato === 'trattativa') return { background: 'color-mix(in srgb, var(--color-bg-card, #2d2318) 90%, transparent)', color: 'var(--color-primary-text, var(--color-primary))', border: '1px solid var(--color-primary)' }
  return { background: 'color-mix(in srgb, var(--color-bg-card) 94%, transparent)', color: 'var(--color-text-muted)' }
}

/* ─── Slider Card ─── */
function SliderCard({ item, onOpen, t }: { item: CatalogItem; onOpen: (i: CatalogItem) => void; t: any }) {
  const { settings, lang } = useApp()
  const cardRef = useRef<HTMLDivElement>(null)
  const rotX = useMotionValue(0), rotY = useMotionValue(0)
  const springX = useSpring(rotX, { stiffness: 200, damping: 22 })
  const springY = useSpring(rotY, { stiffness: 200, damping: 22 })
  const [hovered, setHovered] = useState(false)

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current; if (!el) return
    const rect = el.getBoundingClientRect()
    rotX.set(((e.clientY - rect.top - rect.height / 2) / rect.height) * -10)
    rotY.set(((e.clientX - rect.left - rect.width / 2) / rect.width) * 10)
  }, [rotX, rotY])

  const handleLeave = useCallback(() => {
    rotX.set(0); rotY.set(0); setHovered(false)
  }, [rotX, rotY])

  return (
    <motion.div
      ref={cardRef}
      onClick={() => onOpen(item)}
      onMouseMove={handleMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleLeave}
      style={{
        flexShrink: 0,
        width: 'clamp(260px, 28vw, 340px)',
        background: 'var(--color-bg-card)',
        border: '2px solid var(--color-text)', borderRadius: 'var(--radius-md)', boxShadow: '5px 5px 0 var(--color-text)',
        overflow: 'hidden',
        cursor: 'pointer',
        position: 'relative',
        transformStyle: 'preserve-3d',
        rotateX: springX,
        rotateY: springY,
        willChange: 'transform',
      }}
      whileHover={{
        y: -10,
        borderColor: 'rgba(var(--color-primary-rgb), 0.45)',
        boxShadow: '0 40px 90px rgba(0,0,0,0.7), 0 0 70px rgba(var(--color-primary-rgb), 0.05)',
        transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
      }}
    >
      <div style={{ aspectRatio: '4/3', background: 'var(--color-bg-card, #2d2318)', overflow: 'hidden', position: 'relative' }}>
        {item.img ? (
          <motion.img
            src={item.img} alt={item.nome} loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            animate={{ scale: hovered ? 1.09 : 1, filter: hovered ? 'sepia(0.05) brightness(1.05)' : 'sepia(0.15) brightness(0.9)' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5rem', opacity: 0.2 }}>
            {ICONS[item.categoria] || '🏺'}
          </div>
        )}
        <motion.div
          style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 38%, rgba(var(--color-primary-rgb), 0.1) 50%, transparent 62%)', backgroundSize: '300% 100%' }}
          animate={{ backgroundPosition: hovered ? ['-200% 0', '300% 0'] : '-200% 0' }}
          transition={{ duration: 1.1, ease: 'easeInOut' }}
        />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to top, rgba(18,14,9,0.9), transparent)', pointerEvents: 'none' }} />
        <span style={{ position: 'absolute', top: '0.9rem', right: '0.9rem', fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.16em', textTransform: 'uppercase', padding: '0.28rem 0.65rem', ...badgeStyle(item.stato) }}>
          {item.badge}
        </span>
        <span style={{ position: 'absolute', bottom: '0.9rem', left: '0.9rem', fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(var(--color-primary-rgb), 0.7)' }}>
          {item.categoria}
        </span>
      </div>
      <div style={{ padding: '1.4rem 1.6rem 1.7rem' }}>
        <p style={{ fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'var(--color-primary-text, var(--color-primary))', marginBottom: '0.45rem' }}>{item.era}</p>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.18rem', color: 'var(--color-text, #f5ede0)', marginBottom: '0.5rem', fontWeight: 400, lineHeight: 1.3 }}>{lang === 'en' && item.nomeEn ? item.nomeEn : item.nome}</p>
        <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted, #9a8a78)', lineHeight: 1.6, marginBottom: '1.1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{lang === 'en' && item.descrizioneEn ? item.descrizioneEn : item.descrizione}</p>
        {/* Sconto badge — globale (solo se l'articolo è incluso in articoliIds, o articoliIds vuoto = tutti) */}
        {settings.sconti?.filter(s => s.attivo && s.visibileNelCatalogo && (s.articoliIds?.length === 0 || s.articoliIds?.includes(item.id))).map(s => (
          <div key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(235,87,87,0.15)', border: '1px solid rgba(235,87,87,0.35)', padding: '2px 8px', marginBottom: '0.4rem', marginRight: 4 }}>
            <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.15em', color: 'var(--color-sale, #eb5757)', textTransform: 'uppercase' }}>
              {s.tipo === 'percentuale' ? `−${s.valore}%` : s.tipo === 'fisso' ? `−€${s.valore}` : s.tipo === 'spedizione_gratis' ? t.catalog.freeShippingShort : s.nome}
              {s.nome && s.tipo !== 'spedizione_gratis' ? ` · ${s.nome}` : ''}
            </span>
          </div>
        ))}
        {/* Sconto badge — per articolo */}
        {item.percentualeSconto && item.percentualeSconto > 0 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(235,87,87,0.15)', border: '1px solid rgba(235,87,87,0.35)', padding: '2px 8px', marginBottom: '0.4rem', marginRight: 4 }}>
            <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.15em', color: 'var(--color-sale, #eb5757)', textTransform: 'uppercase' }}>−{item.percentualeSconto}%</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {settings.showPrezzi ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {item.prezzoScontato ? (
                <>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--color-text-muted, #9a8a78)', textDecoration: 'line-through', lineHeight: 1 }}>{item.prezzo}</span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '1.15rem', color: 'var(--color-sale, #eb5757)', fontWeight: 700, letterSpacing: '0.03em', lineHeight: 1 }}>{item.prezzoScontato}</span>
                </>
              ) : (
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '1.05rem', letterSpacing: '0.04em', color: item.prezzo && (item.prezzo !== 'Su richiesta' && item.prezzo !== 'On request') ? 'var(--color-primary, #c9a84c)' : 'var(--color-text-muted, #9a8a78)', fontStyle: item.prezzo && (item.prezzo !== 'Su richiesta' && item.prezzo !== 'On request') ? 'normal' : 'italic', fontWeight: item.prezzo && (item.prezzo !== 'Su richiesta' && item.prezzo !== 'On request') ? 600 : 400 }}>
                  {item.prezzo || t.catalog.request}
                </span>
              )}
            </div>
          ) : (
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--color-text-muted, #9a8a78)', fontStyle: 'italic' }}>{t.catalog.request}</span>
          )}
          <motion.div
            style={{ width: 36, height: 36, border: '1px solid rgba(var(--color-primary-rgb), 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary-text, var(--color-primary))' }}
            animate={{ borderColor: hovered ? 'var(--color-primary)' : 'rgba(var(--color-primary-rgb), 0.3)', backgroundColor: hovered ? 'rgba(var(--color-primary-rgb), 0.08)' : 'transparent' }}
          >
            <motion.div animate={{ x: hovered ? [0, 4, 0] : 0 }} transition={{ duration: 0.7, repeat: hovered ? Infinity : 0, ease: 'easeInOut' }}>
              <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                <path d="M1 5h12M9 1l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
          </motion.div>
        </div>
      </div>
      <motion.div
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: 'var(--color-primary)', transformOrigin: 'left', scaleX: 0 }}
        animate={{ scaleX: hovered ? 1 : 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      />
    </motion.div>
  )
}

/* ─── Item Detail Modal ─── */
function ItemModal({ item, onClose, t, onOpenLightbox }: { item: CatalogItem; onClose: () => void; t: any; onOpenLightbox: (images: string[], idx: number) => void }) {
  const { setContactTab, settings, lang } = useApp()
  const [activeIdx, setActiveIdx] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const allImages = item.images && item.images.length > 0 ? item.images : (item.img ? [item.img] : [])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const itemName = lang === 'en' && item.nomeEn ? item.nomeEn : item.nome
  const itemDesc = lang === 'en' && item.descrizioneEn ? item.descrizioneEn : item.descrizione
  const goToContact = (tab: 'book' | 'request' | 'estimate') => {
    const prefill = tab === 'request'
      ? { categoria: item.categoria, descrizione: lang === 'en' ? `I am interested in: ${itemName} (${item.era}).` : `Sono interessato/a all'oggetto: ${itemName} (${item.era}).` }
      : tab === 'estimate'
        ? { descrizione: lang === 'en' ? `Object: ${itemName} (${item.era}). ${itemDesc}` : `Oggetto: ${itemName} (${item.era}). ${itemDesc}` }
        : { note: lang === 'en' ? `I saw in the catalog: ${itemName} (${item.era}). I'd like to know more.` : `Ho visto in catalogo: ${itemName} (${item.era}). Vorrei approfondire.` }
    setContactTab(tab, prefill); onClose()
    setTimeout(() => document.getElementById('contatti')?.scrollIntoView({ behavior: 'smooth' }), 300)
  }

  const openLightbox = (idx: number) => { onClose(); onOpenLightbox(allImages, idx) }

  const handleSwipe = (startX: number, endX: number, startY: number, endY: number, setter: (fn: (i: number) => number) => void, len: number) => {
    const dx = endX - startX
    const dy = endY - startY
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      setter(i => dx < 0 ? (i + 1) % len : (i - 1 + len) % len)
    }
  }

  return (
    <>
    <motion.div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: 'var(--color-overlay, rgba(10,8,5,0.95))', backdropFilter: 'blur(24px)', zIndex: 10500 }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        style={{ background: 'var(--color-bg-card, #1c1510)', border: '2px solid var(--color-text)', borderRadius: 'var(--radius-md)', maxWidth: 660, width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}
        initial={{ y: 60, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 40, opacity: 0, scale: 0.97 }}
        transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.45 }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, width: 28, height: 28, borderTop: '1px solid var(--color-primary)', borderLeft: '1px solid var(--color-primary)', opacity: 0.5, zIndex: 2 }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: 28, height: 28, borderTop: '1px solid var(--color-primary)', borderRight: '1px solid var(--color-primary)', opacity: 0.5, zIndex: 2 }} />
        <motion.button onClick={onClose}
          style={{ position: 'absolute', top: '0.9rem', right: '0.9rem', background: 'rgba(var(--color-primary-rgb), 0.1)', border: '1px solid rgba(var(--color-primary-rgb), 0.35)', color: 'var(--color-text-muted, #9a8a78)', fontSize: '1.1rem', cursor: 'pointer', zIndex: 3, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2 }}
          whileHover={{ color: 'var(--color-text, #f5ede0)', borderColor: 'var(--color-primary)', rotate: 90, scale: 1.1 }} transition={{ duration: 0.2 }}>✕</motion.button>

        {/* ── Gallery ── */}
        {allImages.length > 0 ? (
          <div style={{ position: 'relative', background: 'var(--color-bg-card, #2d2318)', overflow: 'hidden', userSelect: 'none' }}>
            {/* Main image - swipeable */}
            <div
              style={{ aspectRatio: '16/9', overflow: 'hidden', cursor: 'zoom-in', position: 'relative' }}
              onClick={() => openLightbox(activeIdx)}
              onTouchStart={e => { touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY }}
              onTouchEnd={e => {
                if (touchStartX.current === null || touchStartY.current === null) return
                handleSwipe(touchStartX.current, e.changedTouches[0].clientX, touchStartY.current, e.changedTouches[0].clientY, setActiveIdx, allImages.length)
                touchStartX.current = null; touchStartY.current = null
              }}
            >
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeIdx}
                  src={allImages[activeIdx]}
                  alt={`${item.nome} - foto ${activeIdx + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'sepia(0.1)', display: 'block' }}
                  initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                />
              </AnimatePresence>
              {/* Zoom hint */}
              <div style={{ position: 'absolute', bottom: '0.7rem', right: '0.7rem', background: 'rgba(0,0,0,0.6)', borderRadius: 2, padding: '0.25rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.3rem', backdropFilter: 'blur(4px)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f5ede0" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/></svg>
                <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.1em', color: '#f5ede0' }}>ESPANDI</span>
              </div>
              {/* Prev/Next arrows if multiple */}
              {allImages.length > 1 && (
                <>
                  <button onClick={e => { e.stopPropagation(); setActiveIdx(i => (i - 1 + allImages.length) % allImages.length) }}
                    style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(var(--color-primary-rgb), 0.3)', color: '#f5ede0', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M7 1L3 5l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </button>
                  <button onClick={e => { e.stopPropagation(); setActiveIdx(i => (i + 1) % allImages.length) }}
                    style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(var(--color-primary-rgb), 0.3)', color: '#f5ede0', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails strip */}
            {allImages.length > 1 && (
              <div style={{ display: 'flex', gap: '0.4rem', padding: '0.6rem 0.8rem', overflowX: 'auto', scrollbarWidth: 'none', background: 'var(--color-bg-alt, #120e09)' }}>
                {allImages.map((src, idx) => (
                  <motion.div
                    key={idx}
                    onClick={() => setActiveIdx(idx)}
                    style={{ flexShrink: 0, width: 56, height: 42, overflow: 'hidden', cursor: 'pointer', border: `1.5px solid ${idx === activeIdx ? 'var(--color-primary)' : 'rgba(var(--color-primary-rgb), 0.15)'}`, transition: 'border-color 0.2s' }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <img src={src} alt={`thumb ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: idx === activeIdx ? 'none' : 'brightness(0.55) sepia(0.3)' }} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ aspectRatio: '16/9', background: 'var(--color-bg-card, #2d2318)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem', opacity: 0.3 }}>
            {ICONS[item.categoria] || '🏺'}
          </div>
        )}

        <div style={{ padding: '2.5rem' }}>
          <p style={{ fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--color-primary-text, var(--color-primary))', marginBottom: '0.6rem' }}>{item.era} · {item.categoria}</p>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--color-text, #f5ede0)', marginBottom: '1rem', fontWeight: 400 }}>{lang === 'en' && item.nomeEn ? item.nomeEn : item.nome}</h3>
          <p style={{ color: 'var(--color-text-muted, #9a8a78)', fontSize: '1.05rem', lineHeight: 1.75, marginBottom: '1.5rem' }}>{lang === 'en' && item.descrizioneEn ? item.descrizioneEn : item.descrizione}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', padding: '1rem 1.2rem', background: 'rgba(var(--color-primary-rgb), 0.06)', borderLeft: '2px solid rgba(var(--color-primary-rgb), 0.4)', flexWrap: 'wrap' }}>
            {settings.showPrezzi ? (
              <>
                <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--color-text-muted, #6a5a4a)' }}>{t.catalog.price}</span>
                {item.prezzoScontato ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '1.2rem', color: 'var(--color-text-muted, #9a8a78)', textDecoration: 'line-through', letterSpacing: '0.03em' }}>{item.prezzo}</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '1.7rem', color: 'var(--color-sale, #eb5757)', fontWeight: 700, letterSpacing: '0.03em' }}>{item.prezzoScontato}</span>
                    {item.percentualeSconto && item.percentualeSconto > 0 && (
                      <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.15em', color: 'var(--color-sale, #eb5757)', background: 'rgba(235,87,87,0.15)', border: '1px solid rgba(235,87,87,0.4)', padding: '3px 8px', textTransform: 'uppercase' }}>−{item.percentualeSconto}%</span>
                    )}
                  </div>
                ) : (
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '1.45rem', color: item.prezzo && (item.prezzo !== 'Su richiesta' && item.prezzo !== 'On request') ? 'var(--color-primary, #c9a84c)' : 'var(--color-text-muted, #9a8a78)', fontStyle: item.prezzo && (item.prezzo !== 'Su richiesta' && item.prezzo !== 'On request') ? 'normal' : 'italic', fontWeight: item.prezzo && (item.prezzo !== 'Su richiesta' && item.prezzo !== 'On request') ? 600 : 400, letterSpacing: '0.03em' }}>
                    {item.prezzo || t.catalog.request}
                  </span>
                )}
              </>
            ) : (
              <>
                <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--color-text-muted, #6a5a4a)' }}>{t.catalog.availability}</span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '1.2rem', color: 'var(--color-text-muted, #9a8a78)', fontStyle: 'italic' }}>{t.catalog.contactForInfo}</span>
              </>
            )}
            {/* Sconti attivi — solo se l'articolo è incluso */}
            {settings.sconti?.filter(s => s.attivo && s.visibileNelCatalogo && (s.articoliIds?.length === 0 || s.articoliIds?.includes(item.id))).map(s => (
              <span key={s.id} style={{ fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.15em', color: 'var(--color-sale, #eb5757)', background: 'rgba(235,87,87,0.12)', border: '1px solid rgba(235,87,87,0.3)', padding: '3px 8px', textTransform: 'uppercase' }}>
                {s.tipo === 'percentuale' ? `${t.catalog.discount} −${s.valore}%` : s.tipo === 'fisso' ? `${t.catalog.discount} −€${s.valore}` : s.tipo === 'spedizione_gratis' ? t.catalog.freeShipping : s.nome}
                {s.dataScadenza && ` · ${t.catalog.until} ${s.dataScadenza}`}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <motion.button onClick={() => goToContact('book')}
              style={{ borderRadius: 999, fontFamily: 'var(--font-label)', fontSize: '0.63rem', letterSpacing: '0.18em', textTransform: 'uppercase', padding: '0.85rem 1.8rem', background: 'var(--color-primary)', color: 'var(--color-bg, #0a0805)', border: 'none', cursor: 'pointer' }}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              {t.modal?.info || 'Richiedi info'}
            </motion.button>
            <motion.a href={waItemLink(itemName, item.era)} target="_blank" rel="noopener noreferrer"
              style={{ borderRadius: 999, fontFamily: 'var(--font-label)', fontSize: '0.63rem', letterSpacing: '0.18em', textTransform: 'uppercase', padding: '0.85rem 1.8rem', background: '#25d366', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16 }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              WhatsApp
            </motion.a>
          </div>
        </div>
      </motion.div>
    </motion.div>

    </>
  )
}

/* ─── Standalone Lightbox ─── */
function StandaloneLightbox({ images, startIdx, onClose }: { images: string[]; startIdx: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIdx)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setIdx(i => (i + 1) % images.length)
      if (e.key === 'ArrowLeft') setIdx(i => (i - 1 + images.length) % images.length)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose, images.length])

  const handleSwipe = (startX: number, endX: number, startY: number, endY: number) => {
    const dx = endX - startX; const dy = endY - startY
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      setIdx(i => dx < 0 ? (i + 1) % images.length : (i - 1 + images.length) % images.length)
    }
  }

  return (
    <motion.div
      style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.97)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      onTouchStart={e => { touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY }}
      onTouchEnd={e => {
        if (touchStartX.current === null || touchStartY.current === null) return
        handleSwipe(touchStartX.current, e.changedTouches[0].clientX, touchStartY.current, e.changedTouches[0].clientY)
        touchStartX.current = null; touchStartY.current = null
      }}
    >
      <button onClick={e => { e.stopPropagation(); onClose() }}
        style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(var(--color-primary-rgb), 0.15)', border: '1.5px solid rgba(var(--color-primary-rgb), 0.5)', color: '#f5ede0', width: 48, height: 48, borderRadius: '50%', cursor: 'pointer', fontSize: '1.3rem', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', boxShadow: '0 4px 20px rgba(0,0,0,0.6)' }}>✕</button>

      {images.length > 1 && (
        <>
          <button onClick={e => { e.stopPropagation(); setIdx(i => (i - 1 + images.length) % images.length) }}
            style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(var(--color-primary-rgb), 0.3)', color: '#f5ede0', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}>
            <svg width="12" height="12" viewBox="0 0 10 10" fill="none"><path d="M7 1L3 5l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </button>
          <button onClick={e => { e.stopPropagation(); setIdx(i => (i + 1) % images.length) }}
            style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(var(--color-primary-rgb), 0.3)', color: '#f5ede0', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}>
            <svg width="12" height="12" viewBox="0 0 10 10" fill="none"><path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </button>
        </>
      )}

      <AnimatePresence mode="wait">
        <motion.img
          key={idx}
          src={images[idx]}
          alt={`foto ${idx + 1}`}
          style={{ maxWidth: '90vw', maxHeight: '88vh', objectFit: 'contain', display: 'block' }}
          initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={e => e.stopPropagation()}
        />
      </AnimatePresence>

      {images.length > 1 && (
        <div style={{ position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '0.45rem' }}>
          {images.map((_, i) => (
            <button key={i} onClick={e => { e.stopPropagation(); setIdx(i) }}
              style={{ width: i === idx ? 20 : 7, height: 7, borderRadius: 4, background: i === idx ? 'var(--color-primary)' : 'rgba(var(--color-primary-rgb), 0.3)', border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }} />
          ))}
        </div>
      )}
    </motion.div>
  )
}

/* ─── Panel Grid Card (compact) ─── */
function PanelCard({ item, idx, onOpen }: { item: CatalogItem; idx: number; onOpen: (i: CatalogItem) => void }) {
  const [hovered, setHovered] = useState(false)
  const { settings, t, lang } = useApp()
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.38, delay: Math.min(idx * 0.025, 0.3), ease: [0.16, 1, 0.3, 1] }}
      onClick={() => onOpen(item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: 'var(--color-bg-card, #1c1510)', border: '2px solid var(--color-text)', borderRadius: 'var(--radius-md)', overflow: 'hidden', cursor: 'pointer', position: 'relative' }}
      whileHover={{ y: -5, borderColor: 'rgba(var(--color-primary-rgb), 0.35)', boxShadow: '2px 2px 0 var(--color-text)', transition: { duration: 0.3 } }}
    >
      <div style={{ aspectRatio: '4/3', background: 'var(--color-bg-card, #2d2318)', overflow: 'hidden', position: 'relative' }}>
        {item.img ? (
          <motion.img src={item.img} alt={item.nome} loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            animate={{ scale: hovered ? 1.07 : 1, filter: hovered ? 'sepia(0.05) brightness(1.05)' : 'sepia(0.2) brightness(0.85)' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', opacity: 0.2 }}>
            {ICONS[item.categoria] || '🏺'}
          </div>
        )}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(to top, rgba(18,14,9,0.85), transparent)', pointerEvents: 'none' }} />
        <span style={{ position: 'absolute', top: '0.7rem', right: '0.7rem', fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '0.22rem 0.55rem', ...badgeStyle(item.stato) }}>
          {item.badge}
        </span>
      </div>
      <div style={{ padding: '1rem 1.2rem 1.3rem' }}>
        <p style={{ fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--color-primary-text, var(--color-primary))', marginBottom: '0.3rem' }}>{item.era}</p>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--color-text, #f5ede0)', marginBottom: '0.4rem', fontWeight: 400, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{lang === 'en' && item.nomeEn ? item.nomeEn : item.nome}</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted, #9a8a78)', lineHeight: 1.55, marginBottom: '0.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{lang === 'en' && item.descrizioneEn ? item.descrizioneEn : item.descrizione}</p>
        <div style={{ marginTop: '0.3rem' }}>
          {settings.showPrezzi ? (
            item.prezzoScontato ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--color-text-muted, #9a8a78)', textDecoration: 'line-through', lineHeight: 1 }}>{item.prezzo}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '1.05rem', color: 'var(--color-sale, #eb5757)', fontWeight: 700, lineHeight: 1 }}>{item.prezzoScontato}</span>
                  {item.percentualeSconto && item.percentualeSconto > 0 && (
                    <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.12em', color: 'var(--color-sale, #eb5757)', background: 'rgba(235,87,87,0.12)', border: '1px solid rgba(235,87,87,0.35)', padding: '2px 5px', textTransform: 'uppercase' }}>−{item.percentualeSconto}%</span>
                  )}
                </div>
              </div>
            ) : (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.95rem', color: item.prezzo && item.prezzo !== 'Su richiesta' && item.prezzo !== 'On request' ? 'var(--color-primary, #c9a84c)' : '#6a5a4a', fontStyle: item.prezzo && item.prezzo !== 'Su richiesta' && item.prezzo !== 'On request' ? 'normal' : 'italic', fontWeight: item.prezzo && item.prezzo !== 'Su richiesta' && item.prezzo !== 'On request' ? 600 : 400 }}>
                {item.prezzo || t.catalog.request}
              </p>
            )
          ) : (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.95rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>{t.catalog.contactForInfo}</p>
          )}
        </div>
      </div>
      <motion.div
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: 'var(--color-primary)', transformOrigin: 'left', scaleX: 0 }}
        animate={{ scaleX: hovered ? 1 : 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      />
    </motion.div>
  )
}

/* ─── List Row Card ─── */
function ListCard({ item, idx, onOpen }: { item: CatalogItem; idx: number; onOpen: (i: CatalogItem) => void }) {
  const [hovered, setHovered] = useState(false)
  const { settings, t, lang } = useApp()
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.32, delay: Math.min(idx * 0.02, 0.25), ease: [0.16, 1, 0.3, 1] }}
      onClick={() => onOpen(item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--color-bg-card, #1c1510)',
        border: '2px solid var(--color-text)', borderRadius: 'var(--radius-md)',
        overflow: 'hidden', cursor: 'pointer', position: 'relative',
        display: 'flex', alignItems: 'stretch', gap: 0,
        borderColor: hovered ? 'rgba(var(--color-primary-rgb), 0.35)' : 'rgba(var(--color-primary-rgb), 0.1)',
        boxShadow: hovered ? '0 8px 32px rgba(0,0,0,0.4)' : 'none',
        transition: 'border-color 0.25s, box-shadow 0.25s',
      }}
    >
      {/* Thumbnail */}
      <div style={{ width: 90, flexShrink: 0, background: 'var(--color-bg-card, #2d2318)', overflow: 'hidden', position: 'relative' }}>
        {item.img ? (
          <img src={item.img} alt={item.nome} loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: hovered ? 'sepia(0.05) brightness(1.05)' : 'sepia(0.2) brightness(0.85)', transition: 'filter 0.4s' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', opacity: 0.2 }}>
            {ICONS[item.categoria] || '🏺'}
          </div>
        )}
      </div>
      {/* Content */}
      <div style={{ flex: 1, padding: '0.8rem 1.1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--color-primary-text, var(--color-primary))' }}>{item.era}</span>
          <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-muted, #6a5a4a)', opacity: 0.7 }}>· {item.categoria}</span>
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.15rem 0.45rem', flexShrink: 0, ...badgeStyle(item.stato) }}>{item.badge}</span>
        </div>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', color: 'var(--color-text, #f5ede0)', fontWeight: 400, lineHeight: 1.3, marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lang === 'en' && item.nomeEn ? item.nomeEn : item.nome}
        </p>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted, #9a8a78)', lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lang === 'en' && item.descrizioneEn ? item.descrizioneEn : item.descrizione}
        </p>
      </div>
      {/* Price */}
      <div style={{ padding: '0.8rem 1.1rem', display: 'flex', alignItems: 'center', flexShrink: 0, borderLeft: '1px solid rgba(var(--color-primary-rgb), 0.08)' }}>
        {settings.showPrezzi ? (
          item.prezzoScontato ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--color-text-muted, #9a8a78)', textDecoration: 'line-through', lineHeight: 1 }}>{item.prezzo}</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--color-sale, #eb5757)', fontWeight: 700, lineHeight: 1 }}>{item.prezzoScontato}</span>
              {item.percentualeSconto && item.percentualeSconto > 0 && (
                <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.12em', color: 'var(--color-sale, #eb5757)', background: 'rgba(235,87,87,0.12)', border: '1px solid rgba(235,87,87,0.3)', padding: '1px 5px', textTransform: 'uppercase' }}>−{item.percentualeSconto}%</span>
              )}
            </div>
          ) : (
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.95rem', color: item.prezzo && item.prezzo !== 'Su richiesta' && item.prezzo !== 'On request' ? 'var(--color-primary, #c9a84c)' : 'var(--color-text-muted, #6a5a4a)', fontStyle: item.prezzo && item.prezzo !== 'Su richiesta' && item.prezzo !== 'On request' ? 'normal' : 'italic', fontWeight: 600 }}>
              {item.prezzo || t.catalog.request}
            </span>
          )
        ) : (
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.95rem', color: 'var(--color-text-muted, #6a5a4a)', fontStyle: 'italic' }}>{t.catalog.contactForInfo}</span>
        )}
      </div>
      <motion.div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: 'var(--color-primary)', transformOrigin: 'left', scaleX: 0 }}
        animate={{ scaleX: hovered ? 1 : 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} />
    </motion.div>
  )
}

/* ─── Full Catalog Panel ─── */
function FullCatalogPanel({ onClose, onOpenItem }: { onClose: () => void; onOpenItem: (i: CatalogItem) => void }) {
  const { catalog, settings, t, lang } = useApp()
  const visible = catalog.filter(i => i.visibile && (settings.categorieAttive?.includes(i.categoria) ?? true))
  const cats = ['tutti', ...Array.from(new Set(visible.map(i => i.categoria)))]
  const perPage = settings.catalogPerPage || 12

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('tutti')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', h)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const filtered = visible.filter(i => {
    const matchCat = activeCategory === 'tutti' || i.categoria === activeCategory
    const q = search.toLowerCase()
    const matchSearch = !q || i.nome.toLowerCase().includes(q) || i.descrizione.toLowerCase().includes(q) || i.era.toLowerCase().includes(q) || i.categoria.toLowerCase().includes(q)
    return matchCat && matchSearch
  })

  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)
  useEffect(() => { setPage(1) }, [search, activeCategory])

  /* Grouped view for "tutti" */
  const grouped = cats.filter(c => c !== 'tutti').reduce((acc, cat) => {
    const items = filtered.filter(i => i.categoria === cat)
    if (items.length) acc[cat] = items
    return acc
  }, {} as Record<string, CatalogItem[]>)

  return (
    <motion.div
      className="fixed inset-0"
      style={{ zIndex: 9500, background: 'var(--color-overlay, rgba(6,4,2,0.97))', backdropFilter: 'blur(30px)', display: 'flex', flexDirection: 'column' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: 1440, width: '100%', margin: '0 auto', background: 'var(--color-bg, #0a0805)' }}
        initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
        transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.45, delay: 0.05 }}
      >
        {/* Header */}
        <div style={{ padding: '1.8rem 2.5rem 1.4rem', borderBottom: '1px solid rgba(var(--color-primary-rgb), 0.12)', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'var(--color-primary-text, var(--color-primary))', marginBottom: '0.3rem' }}>{t.catalog.panelLabel}</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: 'var(--color-text, #f5ede0)', fontWeight: 400, margin: 0, display: 'flex', alignItems: 'baseline', gap: '0.8rem', flexWrap: 'wrap' }}>
              {t.catalog.panelTitle} <em style={{ color: 'var(--color-primary-text, var(--color-primary))', fontStyle: 'italic' }}>{t.catalog.titleWord}</em>
              <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.18em', color: 'var(--color-text-muted, #6a5a4a)', fontStyle: 'normal' }}>{filtered.length} {t.catalog.objects}</span>
            </h2>
          </div>

          {/* View mode toggle */}
          <div style={{ display: 'flex', border: '1px solid rgba(var(--color-primary-rgb), 0.2)', overflow: 'hidden', flexShrink: 0 }}>
            <motion.button
              onClick={() => setViewMode('grid')}
              title="Vista griglia"
              style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', background: viewMode === 'grid' ? 'rgba(var(--color-primary-rgb), 0.15)' : 'transparent', border: 'none', cursor: 'pointer', color: viewMode === 'grid' ? 'var(--color-primary)' : 'var(--color-text-muted, #9a8a78)', borderRight: '1px solid rgba(var(--color-primary-rgb), 0.2)' }}
              whileTap={{ scale: 0.92 }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" stroke="currentColor" strokeWidth="1.3" rx="0.5"/><rect x="8" y="1" width="5" height="5" stroke="currentColor" strokeWidth="1.3" rx="0.5"/><rect x="1" y="8" width="5" height="5" stroke="currentColor" strokeWidth="1.3" rx="0.5"/><rect x="8" y="8" width="5" height="5" stroke="currentColor" strokeWidth="1.3" rx="0.5"/></svg>
            </motion.button>
            <motion.button
              onClick={() => setViewMode('list')}
              title="Vista lista"
              style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', background: viewMode === 'list' ? 'rgba(var(--color-primary-rgb), 0.15)' : 'transparent', border: 'none', cursor: 'pointer', color: viewMode === 'list' ? 'var(--color-primary)' : 'var(--color-text-muted, #9a8a78)' }}
              whileTap={{ scale: 0.92 }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="2.5" stroke="currentColor" strokeWidth="1.3" rx="0.5"/><rect x="1" y="6.5" width="12" height="2.5" stroke="currentColor" strokeWidth="1.3" rx="0.5"/><rect x="1" y="11" width="12" height="2.5" stroke="currentColor" strokeWidth="1.3" rx="0.5"/></svg>
            </motion.button>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <svg style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted, #9a8a78)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder={t.catalog.searchPlaceholder}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                background: 'var(--color-bg-card, #1c1510)', border: '2px solid var(--color-text)', borderRadius: 'var(--radius-md)',
                color: 'var(--color-text, #f5ede0)', fontFamily: 'var(--font-body)', fontSize: '1rem',
                padding: '0.6rem 1rem 0.6rem 2.5rem', outline: 'none',
                width: 'clamp(200px, 24vw, 320px)', transition: 'border-color 0.3s',
                caretColor: 'var(--color-primary)',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb), 0.5)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(var(--color-primary-rgb), 0.2)')}
            />
            {search && (
              <button onClick={() => setSearch('')}
                style={{ position: 'absolute', right: '0.7rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-muted, #9a8a78)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>
                ×
              </button>
            )}
          </div>

          {/* Close X */}
          <motion.button
            onClick={onClose}
            style={{ background: 'none', border: '1px solid rgba(var(--color-primary-rgb), 0.2)', color: 'var(--color-text-muted, #9a8a78)', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.15rem', flexShrink: 0 }}
            whileHover={{ borderColor: 'var(--color-primary)', color: 'var(--color-text, #f5ede0)', rotate: 90, scale: 1.05 }}
            transition={{ duration: 0.22 }}
          >✕</motion.button>
        </div>

        {/* Category tabs */}
        <div style={{ padding: '0.9rem 2.5rem', borderBottom: '1px solid rgba(var(--color-primary-rgb), 0.07)', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', flexShrink: 0, background: 'color-mix(in srgb, var(--color-bg, #0a0805) 20%, transparent)' }}>
          {cats.map(cat => {
            const count = cat === 'tutti' ? visible.length : visible.filter(i => i.categoria === cat).length
            const active = activeCategory === cat
            return (
              <motion.button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{ borderRadius: 999,
                  fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.16em',
                  textTransform: 'uppercase', padding: '0.38rem 0.85rem',
                  border: `1px solid ${active ? 'var(--color-primary)' : 'rgba(var(--color-primary-rgb), 0.18)'}`,
                  background: active ? 'var(--color-primary)' : 'transparent',
                  color: active ? 'var(--color-bg, #0a0805)' : 'var(--color-text-muted, #9a8a78)',
                  cursor: 'pointer', transition: 'all 0.22s ease',
                }}
                whileTap={{ scale: 0.95 }}
              >
                {cat === 'tutti' ? t.catalog.all : cat.charAt(0).toUpperCase() + cat.slice(1)}
                <span style={{ marginLeft: '0.35rem', opacity: active ? 0.7 : 0.5, fontSize: '0.66rem' }}>({count})</span>
              </motion.button>
            )
          })}
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem 2.5rem' }}>
          {filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ textAlign: 'center', padding: '6rem 2rem', color: 'var(--color-text-muted, #9a8a78)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.25 }}>🏺</div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '1.2rem', fontStyle: 'italic' }}>{t.catalog.noResults}</p>
            </motion.div>
          ) : activeCategory === 'tutti' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.4rem' }}>
                    <span style={{ fontSize: '1.3rem', opacity: 0.65 }}>{ICONS[cat] || '✨'}</span>
                    <h3 style={{ fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--color-primary-text, var(--color-primary))', margin: 0 }}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </h3>
                    <div style={{ flex: 1, height: 1, background: 'rgba(var(--color-primary-rgb), 0.1)' }} />
                    <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.12em', color: 'var(--color-text-muted, #6a5a4a)' }}>{items.length} {t.catalog.pieces}</span>
                  </div>
                  {viewMode === 'grid' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '1.1rem' }}>
                      <AnimatePresence mode="popLayout">
                        {items.map((item, idx) => (
                          <PanelCard key={item.id} item={item} idx={idx}
                            onOpen={i => { onClose(); setTimeout(() => onOpenItem(i), 360) }} />
                        ))}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <AnimatePresence mode="popLayout">
                        {items.map((item, idx) => (
                          <ListCard key={item.id} item={item} idx={idx}
                            onOpen={i => { onClose(); setTimeout(() => onOpenItem(i), 360) }} />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '1.1rem', marginBottom: '2rem' }}>
                  <AnimatePresence mode="popLayout">
                    {paginated.map((item, idx) => (
                      <PanelCard key={item.id} item={item} idx={idx}
                        onOpen={i => { onClose(); setTimeout(() => onOpenItem(i), 360) }} />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
                  <AnimatePresence mode="popLayout">
                    {paginated.map((item, idx) => (
                      <ListCard key={item.id} item={item} idx={idx}
                        onOpen={i => { onClose(); setTimeout(() => onOpenItem(i), 360) }} />
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(var(--color-primary-rgb), 0.08)' }}>
                  <motion.button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    style={{ width: 36, height: 36, border: '1px solid rgba(var(--color-primary-rgb), 0.2)', background: 'transparent', color: page === 1 ? 'var(--color-bg-alt, #2a221a)' : 'var(--color-text-muted, #9a8a78)', cursor: page === 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    whileHover={page > 1 ? { borderColor: 'var(--color-primary)', color: 'var(--color-primary-text, var(--color-primary))' } : {}}>
                    <svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M11 5H1M5 1L1 5l4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </motion.button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                    <motion.button key={n} onClick={() => setPage(n)}
                      style={{ width: 36, height: 36, border: `1px solid ${n === page ? 'var(--color-primary)' : 'rgba(var(--color-primary-rgb), 0.2)'}`, background: n === page ? 'var(--color-primary)' : 'transparent', color: n === page ? 'var(--color-bg, #0a0805)' : 'var(--color-text-muted, #9a8a78)', cursor: 'pointer', fontFamily: 'var(--font-label)', fontSize: '0.66rem' }}
                      whileHover={n !== page ? { borderColor: 'var(--color-primary)', color: 'var(--color-primary-text, var(--color-primary))' } : {}} whileTap={{ scale: 0.93 }}>
                      {n}
                    </motion.button>
                  ))}

                  <motion.button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    style={{ width: 36, height: 36, border: '1px solid rgba(var(--color-primary-rgb), 0.2)', background: 'transparent', color: page === totalPages ? 'var(--color-bg-alt, #2a221a)' : 'var(--color-text-muted, #9a8a78)', cursor: page === totalPages ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    whileHover={page < totalPages ? { borderColor: 'var(--color-primary)', color: 'var(--color-primary-text, var(--color-primary))' } : {}}>
                    <svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5h10M7 1l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </motion.button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer bar */}
        <div style={{ padding: '0.9rem 2.5rem', borderTop: '1px solid rgba(var(--color-primary-rgb), 0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: 'color-mix(in srgb, var(--color-bg, #0a0805) 25%, transparent)' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.88rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
            {t.catalog.panelFooter}
          </p>
          <motion.button onClick={onClose}
            style={{ borderRadius: 999, fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.16em', textTransform: 'uppercase', padding: '0.55rem 1.3rem', border: '1px solid rgba(var(--color-primary-rgb), 0.2)', background: 'transparent', color: 'var(--color-text-muted, #9a8a78)', cursor: 'pointer' }}
            whileHover={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary-text, var(--color-primary))' }}>
            {t.catalog.closePanel}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─── Main export ─── */
export default function CatalogSection() {
  const { t, catalog, setContactTab, settings, lang } = useApp()
  const [modal, setModal] = useState<CatalogItem | null>(null)
  const [lightboxData, setLightboxData] = useState<{ images: string[]; idx: number } | null>(null)
  const [showFullCatalog, setShowFullCatalog] = useState(false)
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.1 })

  const visible = catalog.filter(i => i.visibile && (settings.categorieAttive?.includes(i.categoria) ?? true))
  /* Slider infinito: copie sufficienti a coprire anche schermi larghi con pochi articoli */
  const reps = visible.length ? Math.max(3, Math.ceil(2600 / (visible.length * 300)) + 1) : 3
  const displayItems = Array.from({ length: reps }, () => visible).flat()

  /* Movimento fluido: un solo ciclo rAF con tempo reale (dt), inerzia al rilascio che
     rientra dolcemente nello scorrimento automatico. Misura reale della larghezza del giro. */
  const x = useMotionValue(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const loopW = useRef(0)
  const vel = useRef(0)                 // px/s
  const dragging = useRef(false)
  const movedPx = useRef(0)
  const hoverPause = useRef(false)
  const lastPt = useRef({ x: 0, t: 0 })
  const dragOrigin = useRef({ x: 0, mx: 0 })
  const [grabbing, setGrabbing] = useState(false)
  const AUTO = -42                      // px/s, scorrimento automatico

  const measure = useCallback(() => {
    const el = trackRef.current
    if (!el || !visible.length || el.children.length <= visible.length) return
    const first = el.children[0] as HTMLElement
    const next = el.children[visible.length] as HTMLElement
    loopW.current = next.offsetLeft - first.offsetLeft
  }, [visible.length])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    const el = trackRef.current
    const ro = typeof ResizeObserver !== 'undefined' && el ? new ResizeObserver(measure) : null
    if (ro && el) ro.observe(el)
    return () => { window.removeEventListener('resize', measure); ro && ro.disconnect() }
  }, [measure, reps])

  const wrap = (v: number) => {
    const w = loopW.current
    if (!w) return v
    return ((v % w) - w) % w            // sempre in (-w, 0]
  }

  useEffect(() => {
    if (!inView || visible.length === 0) return
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let raf = 0, last = performance.now(), inViewport = true, tabVisible = !document.hidden
    const io = typeof IntersectionObserver !== 'undefined' && ref.current
      ? new IntersectionObserver(([en]) => { inViewport = en.isIntersecting }, { rootMargin: '200px' }) : null
    if (io && ref.current) io.observe(ref.current)
    const onVis = () => { tabVisible = !document.hidden; last = performance.now() }
    document.addEventListener('visibilitychange', onVis)

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      if (inViewport && tabVisible && !dragging.current) {
        const target = reduce || hoverPause.current ? 0 : AUTO
        vel.current += (target - vel.current) * (1 - Math.exp(-dt / 0.55))   // inerzia → auto
        if (Math.abs(vel.current) > 0.05) x.set(wrap(x.get() + vel.current * dt))
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); io && io.disconnect(); document.removeEventListener('visibilitychange', onVis) }
  }, [inView, x, visible.length])

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    dragging.current = true; movedPx.current = 0; vel.current = 0
    dragOrigin.current = { x: e.clientX, mx: x.get() }
    lastPt.current = { x: e.clientX, t: performance.now() }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - dragOrigin.current.x
    movedPx.current = Math.max(movedPx.current, Math.abs(dx))
    if (movedPx.current > 6 && !grabbing) setGrabbing(true)
    x.set(wrap(dragOrigin.current.mx + dx))
    const now = performance.now(), dt = (now - lastPt.current.t) / 1000
    if (dt > 0.008) {                                     // velocità filtrata (media mobile)
      const inst = (e.clientX - lastPt.current.x) / dt
      vel.current = vel.current * 0.6 + inst * 0.4
      lastPt.current = { x: e.clientX, t: now }
    }
  }
  const endDrag = () => {
    if (!dragging.current) return
    dragging.current = false; setGrabbing(false)
    if (performance.now() - lastPt.current.t > 90) vel.current = 0   // fermo prima di rilasciare
    vel.current = Math.max(-3500, Math.min(3500, vel.current))
  }

  return (
    <>
      <section id="catalogo" ref={ref} style={{ padding: '9rem 0', position: 'relative', overflow: 'hidden', background: 'var(--color-bg, #0a0805)', isolation: 'isolate' }}>
      <SectionBackdrop slot="catalog" />
        {/* leggibilità: velo e alone del testo si regolano da admin → Sfondi & Mappa */}

        {/* Edge fades */}
        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '10vw', background: 'linear-gradient(to right, var(--color-bg, #0a0805), transparent)', zIndex: 3, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '10vw', background: 'linear-gradient(to left, var(--color-bg, #0a0805), transparent)', zIndex: 3, pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>

          {/* Header */}
          <div style={{ padding: '0 clamp(1.5rem, 7vw, 8rem)', marginBottom: '3.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem' }}>
              <div>
                <motion.p className="section-label" style={{ marginBottom: '1rem' }}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={REVEAL_VP} transition={{ duration: 1.12 }}>
                  {t.catalog.label}
                </motion.p>
                <motion.h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem,5vw,3.8rem)', fontWeight: 400, color: 'var(--color-text)', lineHeight: 1.1, margin: 0 }}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={REVEAL_VP} transition={{ duration: 1.12, delay: 0.1 }}>
                  {t.catalog.title.replace(t.catalog.titleWord, '')} <em style={{ color: 'var(--color-primary-text, var(--color-primary))', fontStyle: 'italic' }}>{t.catalog.titleWord}</em>
                </motion.h2>
              </div>

              {/* "Vedi tutto" CTA */}
              <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={REVEAL_VP} transition={{ duration: 1.12, delay: 0.2 }}>
                <motion.button
                  onClick={() => setShowFullCatalog(true)}
                  style={{ borderRadius: 999,
                    fontFamily: 'var(--font-label)', fontSize: '0.6rem', letterSpacing: '0.22em',
                    textTransform: 'uppercase', padding: '0.9rem 2rem',
                    border: '1px solid rgba(var(--color-primary-rgb), 0.4)', background: 'transparent',
                    color: 'var(--color-primary-text, var(--color-primary))', cursor: 'pointer', position: 'relative', overflow: 'hidden',
                    display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
                  }}
                  whileHover={{ borderColor: 'var(--color-primary)', scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <motion.div style={{ position: 'absolute', inset: 0, background: 'rgba(var(--color-primary-rgb), 0.07)', transformOrigin: 'left', scaleX: 0 }}
                    whileHover={{ scaleX: 1 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} />
                  <span style={{ position: 'relative' }}>{t.catalog.viewAll}</span>
                  <svg style={{ position: 'relative', flexShrink: 0 }} width="16" height="12" viewBox="0 0 16 12" fill="none">
                    <path d="M1 6h14M10 1l5 5-5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.button>
              </motion.div>
            </div>
          </div>

          {/* ── Stato vuoto: catalogo ancora senza articoli ── */}
          {visible.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem clamp(1.5rem,6vw,4rem)', maxWidth: 560, margin: '0 auto' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontStyle: 'italic', fontSize: '1.2rem', lineHeight: 1.7, color: 'var(--color-text-muted, #7b6454)', marginBottom: '1.8rem' }}>
                {lang === 'it'
                  ? 'Stiamo preparando il catalogo online. Intanto trovate le novità sul nostro catalogo WhatsApp, oppure passate a trovarci in negozio.'
                  : 'We are preparing the online catalog. In the meantime you can find our latest arrivals in the WhatsApp catalog, or drop by the shop.'}
              </p>
              {settings.whatsappCatalog && (
                <a href={safeHref(settings.whatsappCatalog)} target="_blank" rel="noopener noreferrer"
                  style={{ borderRadius: 999, fontFamily: 'var(--font-label)', fontSize: '0.6rem', letterSpacing: '0.22em', textTransform: 'uppercase', padding: '0.9rem 2rem', border: '1px solid rgba(var(--color-primary-rgb), 0.4)', color: 'var(--color-primary-text, var(--color-primary))', textDecoration: 'none', display: 'inline-block' }}>
                  {lang === 'it' ? 'Apri il catalogo WhatsApp' : 'Open the WhatsApp catalog'}
                </a>
              )}
            </div>
          )}

          {/* ── Infinite Slider ── */}
          <div
            style={{ cursor: grabbing ? 'grabbing' : 'grab', userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'pan-y', WebkitTapHighlightColor: 'transparent', overscrollBehaviorX: 'contain' }}
            onPointerEnter={e => { if (e.pointerType === 'mouse') hoverPause.current = true }}
            onPointerLeave={e => { if (e.pointerType === 'mouse') hoverPause.current = false; endDrag() }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onClickCapture={e => { if (movedPx.current > 6) { e.stopPropagation(); e.preventDefault(); movedPx.current = 0 } }}
            onDragStart={e => e.preventDefault()}
          >
            <motion.div ref={trackRef} style={{ display: 'flex', gap: `${GAP}px`, x, paddingLeft: `${GAP}px`, width: 'max-content', willChange: 'transform', backfaceVisibility: 'hidden' }}>
              {displayItems.map((item, idx) => (
                <SliderCard key={`${item.id}-${idx}`} item={item} onOpen={setModal} t={t} />
              ))}
            </motion.div>
          </div>

          {/* Footer CTA area */}
          <motion.div style={{ textAlign: 'center', marginTop: '4.5rem', padding: '0 clamp(1.5rem, 7vw, 8rem)' }}
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={REVEAL_VP} transition={{ duration: 1.12, delay: 0.4 }}>
            <p style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-muted, #9a8a78)', fontSize: '1.1rem', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
              {t.catalog.moreText.split('\n').map((l: string, i: number) => <span key={i}>{l}{i === 0 && <br />}</span>)}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '2rem' }}>
              <motion.button
                onClick={() => setShowFullCatalog(true)}
                style={{ borderRadius: 999, fontFamily: 'var(--font-label)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '0.95rem 2.5rem', background: 'var(--color-primary)', color: 'var(--color-bg, #0a0805)', border: 'none', cursor: 'pointer' }}
                whileHover={{ scale: 1.04, boxShadow: '0 12px 40px rgba(var(--color-primary-rgb), 0.3)' }} whileTap={{ scale: 0.97 }}>
                {t.catalog.viewAll}
              </motion.button>
              <motion.button
                onClick={() => { setContactTab('request', {}); document.getElementById('contatti')?.scrollIntoView({ behavior: 'smooth' }) }}
                style={{ borderRadius: 999, fontFamily: 'var(--font-label)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '0.95rem 2.5rem', background: 'transparent', color: 'var(--color-primary-text, var(--color-primary))', border: '1px solid rgba(var(--color-primary-rgb), 0.4)', cursor: 'pointer' }}
                whileHover={{ scale: 1.04, borderColor: 'var(--color-primary)' }} whileTap={{ scale: 0.97 }}>
                {t.catalog.more}
              </motion.button>
            </div>
          </motion.div>

        </div>
      </section>

      <AnimatePresence>
        {modal && <ItemModal item={modal} onClose={() => setModal(null)} t={t} onOpenLightbox={(imgs, i) => setLightboxData({ images: imgs, idx: i })} />}
      </AnimatePresence>
      <AnimatePresence>
        {lightboxData && <StandaloneLightbox images={lightboxData.images} startIdx={lightboxData.idx} onClose={() => setLightboxData(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showFullCatalog && (
          <FullCatalogPanel
            onClose={() => setShowFullCatalog(false)}
            onOpenItem={item => setModal(item)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
