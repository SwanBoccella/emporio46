import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react'
import { useApp, getSectionBg, SECTION_BG_HAS_TEXT, type SectionBg, type SectionBgSlot } from '../../context/AppContext'

/** Maschera che sfuma i bordi: quali (fade) e quanto (fadeSize, % dell'altezza) dipendono dall'admin. */
function fadeMask(bg: Pick<SectionBg, 'fade' | 'fadeSize'>): string | undefined {
  const f = Math.max(0, Math.min(45, Number(bg.fadeSize) || 0))
  if (bg.fade === 'none' || f === 0) return undefined
  const top = bg.fade === 'both' || bg.fade === 'top'
  const bottom = bg.fade === 'both' || bg.fade === 'bottom'
  const stops = [
    top ? 'transparent 0%' : '#000 0%',
    top ? `#000 ${f}%` : null,
    bottom ? `#000 ${100 - f}%` : null,
    bottom ? 'transparent 100%' : '#000 100%',
  ].filter(Boolean)
  return `linear-gradient(to bottom, ${stops.join(', ')})`
}

/**
 * Stile dei livelli di sfondo a partire dai parametri dell'admin.
 * Usato sia dal sito (SectionBackdrop) sia dalle anteprime del pannello admin,
 * così quello che si vede nell'admin è esattamente quello che vedono i visitatori.
 */
export function bgLayerStyle(bg: SectionBg): CSSProperties {
  const mask = fadeMask(bg)
  const filters = [`brightness(${bg.brightness})`]
  if (bg.sepia > 0) filters.push(`sepia(${bg.sepia})`)
  if (bg.blur > 0) filters.push(`blur(${bg.blur}px)`)
  const tile = bg.size === 'tile'
  return {
    backgroundImage: bg.url ? `url("${bg.url}")` : 'none',
    backgroundSize: tile ? '480px auto' : 'cover',
    backgroundRepeat: tile ? 'repeat' : 'no-repeat',
    backgroundPosition: `${bg.posX}% ${bg.posY}%`,
    opacity: bg.opacity,
    filter: filters.join(' '),
    WebkitMaskImage: mask,
    maskImage: mask,
  }
}

/** Velo del colore di sfondo del tema sopra l'immagine (stessa sfumatura dei bordi). */
export function bgScrimStyle(bg: SectionBg): CSSProperties {
  const mask = fadeMask(bg)
  const side = bg.scrimShape === 'side'
  return {
    ['--scrim' as any]: bg.scrim,
    ...(side ? {} : { background: `rgba(var(--color-bg-rgb), ${bg.scrim})` }),   // 'side' usa la classe .bg-scrim-side
    WebkitMaskImage: mask,
    maskImage: mask,
  }
}
export const bgScrimClass = (bg: SectionBg) => (bg.scrimShape === 'side' ? 'bg-scrim-side' : undefined)

/** Stile del livello video: stessi filtri, opacità e sfumatura bordi dell'immagine, ma con object-fit/position al posto di background-*. */
export function bgVideoStyle(bg: SectionBg): CSSProperties {
  const { backgroundImage, backgroundSize, backgroundRepeat, backgroundPosition, ...rest } = bgLayerStyle(bg)
  return { ...rest, width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${bg.posX}% ${bg.posY}%`, display: 'block' }
}

/**
 * Livello multimediale di una zona: video (se impostato) oppure immagine.
 * Il video è sempre muto e in loop, parte solo quando la zona è visibile e si ferma quando esce dallo schermo
 * (batteria e dati). Con "riduci animazioni" o prima che parta si vede il fotogramma (poster).
 * Usato dal sito (SectionBackdrop) e dalle anteprime dell'admin: quello che si vede lì è quello che vedono i visitatori.
 */
export function BgMedia({ bg, slot, style, fill }: { bg: SectionBg; slot?: SectionBgSlot; style?: CSSProperties; fill?: boolean }) {
  const vRef = useRef<HTMLVideoElement>(null)
  const reduceMotion = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const useVideo = !!bg.video && !reduceMotion
  const still = bg.video ? (bg.poster || bg.url) : bg.url

  useEffect(() => {
    const v = vRef.current
    const host = v?.parentElement
    if (!v || !host || !useVideo) return
    v.muted = true
    v.playbackRate = Math.max(0.25, Math.min(2, Number(bg.videoSpeed) || 1))
    const io = new IntersectionObserver(([e]) => {
      // con il menu mobile aperto si fermano i video della pagina (tranne quello del menu stesso)
      const menuBlocks = !!document.documentElement.dataset.menu && slot !== 'menu'
      if (e.isIntersecting && !menuBlocks) v.play().catch(() => { /* autoplay bloccato / risparmio dati: resta il poster */ })
      else v.pause()
    }, { threshold: 0.02 })
    io.observe(host)
    return () => io.disconnect()
  }, [useVideo, bg.video, bg.videoSpeed, slot])

  if (useVideo) {
    return (
      <video
        ref={vRef}
        key={bg.video}
        src={bg.video}
        poster={bg.poster || undefined}
        autoPlay muted loop playsInline
        preload={slot === 'hero' || slot === 'menu' ? 'auto' : 'metadata'}
        disablePictureInPicture
        aria-hidden="true"
        data-bg-slot={slot}
        style={{ ...(fill ? { position: 'absolute', inset: 0 } : null), ...bgVideoStyle(bg), pointerEvents: 'none', ...style }}
      />
    )
  }
  if (!still) return null
  return <div aria-hidden="true" data-bg-slot={slot} style={{ ...(fill ? { position: 'absolute', inset: 0 } : null), ...bgLayerStyle({ ...bg, url: still }), pointerEvents: 'none', ...style }} />
}

interface Props {
  slot: SectionBgSlot
  /** ingrandimento per nascondere i bordi durante parallasse (es. hero) */
  scale?: number
  /** il contenitore può nascondere/mostrare lo sfondo (es. navbar prima dello scroll) */
  visible?: boolean
  style?: CSSProperties
}

/**
 * Immagine di sfondo di una zona della pagina. Tutti i parametri (immagine, opacità, luminosità,
 * sfocatura, seppia, posizione, ripetizione, bordi sfumati e relativa ampiezza, velo, alone del testo)
 * vengono da admin → "Sfondi & Mappa".
 * Il contenitore deve avere position: relative + isolation: isolate (e di solito overflow: hidden).
 * Alla zona contenitore viene applicata la classe .bg-readable con --bg-shadow, così tutti i testi
 * sopra la foto restano leggibili.
 */
const SectionBackdrop = forwardRef<HTMLDivElement, Props>(function SectionBackdrop({ slot, scale, visible = true, style }, ref) {
  const { settings } = useApp()
  const bg = getSectionBg(settings, slot)
  const hasText = SECTION_BG_HAS_TEXT.includes(slot)
  const markerRef = useRef<HTMLDivElement | null>(null)
  const shadow = (bg.url || bg.video) && hasText ? bg.shadow : 0

  // alone dei testi: classe + variabile CSS sul contenitore (text-shadow è ereditato dai discendenti)
  useLayoutEffect(() => {
    const host = markerRef.current?.parentElement
    if (!host || !hasText) return
    host.classList.add('bg-readable')
    host.style.setProperty('--bg-shadow', String(shadow))
    return () => { host.classList.remove('bg-readable'); host.style.removeProperty('--bg-shadow') }
  }, [shadow, hasText, bg.url, bg.video])

  const setRefs = useCallback((el: HTMLDivElement | null) => {
    markerRef.current = el
    if (typeof ref === 'function') ref(el)
    else if (ref) (ref as { current: HTMLDivElement | null }).current = el
  }, [ref])

  if (!bg.url && !bg.video) return null
  return (
    <>
      <div
        ref={setRefs}
        aria-hidden="true"
        data-bg-slot={slot}
        style={{
          position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none', overflow: 'hidden',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.45s',
          transform: scale ? `scale(${scale}) translateZ(0)` : 'translateZ(0)',   // layer GPU: scroll fluido
          ...style,
        }}
      >
        <BgMedia bg={bg} slot={slot} fill />
      </div>
      {bg.scrim > 0 && hasText && (
        <div aria-hidden="true" className={bgScrimClass(bg)} data-bg-scrim={slot} style={{ position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none', ...bgScrimStyle(bg) }} />
      )}
    </>
  )
})

export default SectionBackdrop
