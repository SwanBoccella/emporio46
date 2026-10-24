import { forwardRef, useCallback, useLayoutEffect, useRef, type CSSProperties } from 'react'
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
  const shadow = bg.url && hasText ? bg.shadow : 0

  // alone dei testi: classe + variabile CSS sul contenitore (text-shadow è ereditato dai discendenti)
  useLayoutEffect(() => {
    const host = markerRef.current?.parentElement
    if (!host || !hasText) return
    host.classList.add('bg-readable')
    host.style.setProperty('--bg-shadow', String(shadow))
    return () => { host.classList.remove('bg-readable'); host.style.removeProperty('--bg-shadow') }
  }, [shadow, hasText, bg.url])

  const setRefs = useCallback((el: HTMLDivElement | null) => {
    markerRef.current = el
    if (typeof ref === 'function') ref(el)
    else if (ref) (ref as { current: HTMLDivElement | null }).current = el
  }, [ref])

  if (!bg.url) return null
  const base = bgLayerStyle(bg)
  return (
    <>
      <div
        ref={setRefs}
        aria-hidden="true"
        data-bg-slot={slot}
        style={{
          position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none',
          ...base,
          opacity: visible ? bg.opacity : 0,
          transition: 'opacity 0.45s',
          transform: scale ? `scale(${scale}) translateZ(0)` : 'translateZ(0)',   // layer GPU: scroll fluido
          ...style,
        }}
      />
      {bg.scrim > 0 && hasText && (
        <div aria-hidden="true" className={bgScrimClass(bg)} data-bg-scrim={slot} style={{ position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none', ...bgScrimStyle(bg) }} />
      )}
    </>
  )
})

export default SectionBackdrop
