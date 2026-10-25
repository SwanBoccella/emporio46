import type { CSSProperties } from 'react'

/** Valori di partenza dei riquadri del footer (usati dal sito e dall'anteprima dell'admin). */
export const FOOTER_GLASS_DEFAULTS = { glass: 0.3, blur: 4, border: 0.3 }

type GlassSettings = { footerGlass?: number; footerGlassBlur?: number; footerGlassBorder?: number }

/**
 * Stile dei riquadri del footer: opacità del fondo (0 = trasparente), sfocatura dello sfondo e bordo.
 * Lo stesso codice disegna il footer vero e l'anteprima in admin → Sfondi & Mappa, così si vede
 * subito l'effetto dei cursori.
 */
export function footerGlassStyle(settings: GlassSettings): CSSProperties {
  const gA = Math.round(Math.max(0, Math.min(1, settings.footerGlass ?? FOOTER_GLASS_DEFAULTS.glass)) * 100)
  const gB = Math.max(0, Math.min(24, settings.footerGlassBlur ?? FOOTER_GLASS_DEFAULTS.blur))
  const gBd = Math.max(0, Math.min(1, settings.footerGlassBorder ?? FOOTER_GLASS_DEFAULTS.border))
  const gBlur = gB > 0 ? `blur(${gB}px) saturate(1.1)` : 'none'
  return {
    background: gA > 0 ? `color-mix(in srgb, var(--color-bg-card) ${gA}%, transparent)` : 'transparent',
    backdropFilter: gBlur,
    WebkitBackdropFilter: gBlur,
    textShadow: '0 0 8px rgba(var(--text-halo-rgb, 255,255,255), 0.85), 0 0 18px rgba(var(--text-halo-rgb, 255,255,255), 0.6)',
    border: `1px solid rgba(var(--color-primary-rgb), ${gBd})`,
    borderRadius: 24,
    boxShadow: gA < 8 ? 'none' : '0 14px 40px rgba(0,0,0,0.22)',
    padding: 'clamp(1.4rem,3.5vw,2.2rem) clamp(1.3rem,3.5vw,2.2rem)',
  }
}
