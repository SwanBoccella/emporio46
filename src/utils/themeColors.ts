/**
 * Colori del tema "a prova di contrasto".
 *
 * Parte dai colori scelti nell'admin e garantisce che testi, etichette, prezzi e bottoni siano sempre
 * leggibili sullo sfondo reale:
 *   - tema CHIARO  → testo scuro, alone (text-shadow) BIANCO
 *   - tema SCURO   → testo chiaro, alone (text-shadow) NERO
 * Il tema è deciso dalla luminanza dello sfondo (non da un'euristica sul primo carattere dell'hex).
 * I valori dell'admin non vengono toccati nel database: la correzione avviene solo a runtime.
 */

export type RGB = [number, number, number]

export interface ThemeInput {
  primaryColor?: string
  bgColor?: string
  bgAltColor?: string
  bgCardColor?: string
  textColor?: string
  textMutedColor?: string
  accentColor?: string
}

export interface DerivedTheme {
  isDark: boolean
  /** testo principale (contrasto ≥ 7:1 su sfondo, sfondo alt e card) */
  text: string
  /** testo secondario (≥ 4.5:1) */
  muted: string
  /** via di mezzo tra principale e secondario: citazioni, testi lunghi (≥ 5.5:1) */
  soft: string
  /** colore principale usato COME TESTO (etichette, link, prezzi): ≥ 4.5:1 sullo sfondo */
  primaryText: string
  /** accento usato come testo (≥ 4.5:1) */
  accentText: string
  /** colore del testo sopra al colore principale (bottoni, badge, medaglione) */
  onPrimary: string
  /** rosso "offerta" leggibile sullo sfondo */
  sale: string
  /** verde "ok" (messaggi di conferma) leggibile sullo sfondo */
  ok: string
  /** alone del testo: "255, 255, 255" sul chiaro, "0, 0, 0" sullo scuro */
  haloRgb: string
  /** colore di sfondo come stringa hex (normalizzato) */
  bg: string
}

const DEFAULT_LIGHT: RGB = [243, 232, 212]
const INK_DARK: RGB = [26, 15, 8]
const INK_LIGHT: RGB = [250, 244, 232]

export function parseColor(c?: string | null): RGB | null {
  if (!c) return null
  const s = c.trim()
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(s)
  if (m) {
    let h = m[1]
    if (h.length === 3) h = h.split('').map(x => x + x).join('')
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
  }
  m = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/i.exec(s)
  if (m) return [Math.min(255, +m[1]), Math.min(255, +m[2]), Math.min(255, +m[3])]
  return null
}

export const toHex = ([r, g, b]: RGB) =>
  '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')

export function luminance([r, g, b]: RGB): number {
  const f = (v: number) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4) }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

export function contrast(a: RGB, b: RGB): number {
  const la = luminance(a), lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

const mixRgb = (a: RGB, b: RGB, k: number): RGB => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]
const worst = (c: RGB, bgs: RGB[]) => Math.min(...bgs.map(b => contrast(c, b)))

/** Sposta `fg` verso nero/bianco (`towards`) finché il contrasto minimo sui fondi `bgs` raggiunge `min`. */
export function ensureContrast(fg: RGB, bgs: RGB[], min: number, towards: 0 | 255): RGB {
  if (worst(fg, bgs) >= min) return fg
  const end: RGB = [towards, towards, towards]
  for (let i = 1; i <= 24; i++) {
    const c = mixRgb(fg, end, i / 24)
    if (worst(c, bgs) >= min) return c
  }
  return end
}

export function deriveTheme(s: ThemeInput): DerivedTheme {
  const bg = parseColor(s.bgColor) ?? DEFAULT_LIGHT
  const alt = parseColor(s.bgAltColor) ?? bg
  const card = parseColor(s.bgCardColor) ?? bg
  const bgs: RGB[] = [bg, alt, card]
  const isDark = luminance(bg) < 0.179            // soglia in cui bianco e nero hanno lo stesso contrasto
  const towards: 0 | 255 = isDark ? 255 : 0

  // testo principale: se quello scelto è dalla parte sbagliata (es. testo chiaro su fondo chiaro) riparto da un inchiostro coerente
  let text = parseColor(s.textColor) ?? (isDark ? INK_LIGHT : INK_DARK)
  if (worst(text, bgs) < 3) text = isDark ? INK_LIGHT : INK_DARK
  text = ensureContrast(text, bgs, 7, towards)

  let muted = parseColor(s.textMutedColor) ?? mixRgb(text, bg, 0.35)
  if (worst(muted, bgs) < 2) muted = mixRgb(text, bg, 0.35)
  muted = ensureContrast(muted, bgs, 4.5, towards)

  const soft = ensureContrast(mixRgb(text, muted, 0.4), bgs, 5.5, towards)

  const primary = parseColor(s.primaryColor) ?? [196, 86, 31]
  const primaryText = ensureContrast(primary, [bg, alt], 4.5, towards)

  const accent = parseColor(s.accentColor) ?? primary
  const accentText = ensureContrast(accent, [bg, alt], 4.5, towards)

  // testo sopra al colore principale: lo sfondo del tema se contrasta abbastanza, altrimenti l'inchiostro migliore
  const cands: RGB[] = [bg, INK_DARK, INK_LIGHT]
  const best = cands.reduce((a, c) => (contrast(c, primary) > contrast(a, primary) ? c : a), cands[1])
  const onPrimary = contrast(bg, primary) >= contrast(best, primary) - 0.5 ? bg : best

  const sale = ensureContrast([235, 87, 87], [bg, card], 4.5, towards)
  const ok = ensureContrast([111, 207, 151], [bg, card], 4.5, towards)

  return {
    isDark,
    text: toHex(text),
    muted: toHex(muted),
    soft: toHex(soft),
    primaryText: toHex(primaryText),
    accentText: toHex(accentText),
    onPrimary: toHex(onPrimary),
    sale: toHex(sale),
    ok: toHex(ok),
    haloRgb: isDark ? '0, 0, 0' : '255, 255, 255',
    bg: toHex(bg),
  }
}

/** Scrive le variabili CSS derivate sulla radice del documento. */
export function applyDerivedTheme(root: HTMLElement, th: DerivedTheme) {
  root.style.setProperty('--color-text', th.text)
  root.style.setProperty('--color-text-muted', th.muted)
  root.style.setProperty('--color-text-soft', th.soft)
  root.style.setProperty('--color-primary-text', th.primaryText)
  root.style.setProperty('--color-accent-text', th.accentText)
  root.style.setProperty('--color-on-primary', th.onPrimary)
  root.style.setProperty('--color-sale', th.sale)
  root.style.setProperty('--color-ok', th.ok)
  root.style.setProperty('--text-halo-rgb', th.haloRgb)
  root.style.colorScheme = th.isDark ? 'dark' : 'light'
  root.dataset.theme = th.isDark ? 'dark' : 'light'
}
