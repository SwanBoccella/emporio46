import { loadArmchair, armchairSource, waitArmchairReady } from './armchair'
import { waitReady, settle } from './warmup'
import { SECTION_BG_DEFAULTS, getSectionBg, buildMapsEmbed, type SectionBgSlot } from '../context/AppContext'

/**
 * Preloader reale: scarica e decodifica tutto ciò che serve al primo scroll
 * (immagini, sfondi, font, mappa) e riporta il progresso effettivo.
 * Ogni task ha un timeout: il sito non può mai restare bloccato sul loader.
 */

// Teniamo un riferimento alle immagini decodificate: evita che il browser le scarti dalla cache di decodifica
const held = new Set<HTMLImageElement>()
let mapWarmFrame: HTMLIFrameElement | null = null

export function loadImage(url: string, timeout = 25000): Promise<void> {
  return new Promise(resolve => {
    let finished = false
    const img = new Image()
    const done = () => { if (finished) return; finished = true; clearTimeout(timer); resolve() }
    const timer = setTimeout(done, timeout)
    img.decoding = 'async'
    img.onload = () => {
      held.add(img)
      // decode() = l'immagine è già pronta da disegnare: niente scatti quando entra in viewport
      if (typeof img.decode === 'function') img.decode().then(done, done)
      else done()
    }
    img.onerror = done
    img.src = url
  })
}

function loadFont(spec: string, timeout = 10000): Promise<void> {
  if (!('fonts' in document)) return Promise.resolve()
  return Promise.race([
    document.fonts.load(spec).then(() => undefined, () => undefined),
    new Promise<void>(r => setTimeout(r, timeout)),
  ])
}

function windowLoaded(timeout = 20000): Promise<void> {
  if (document.readyState === 'complete') return Promise.resolve()
  return new Promise(resolve => {
    const t = setTimeout(resolve, timeout)
    window.addEventListener('load', () => { clearTimeout(t); resolve() }, { once: true })
  })
}

// Scalda la mappa: iframe fuori schermo con lo stesso URL, così tile e script sono già in cache
function warmMap(url: string, timeout = 15000): Promise<void> {
  return new Promise(resolve => {
    if (!url || mapWarmFrame) return resolve()
    const f = document.createElement('iframe')
    f.src = url
    f.setAttribute('aria-hidden', 'true')
    f.tabIndex = -1
    f.referrerPolicy = 'no-referrer-when-downgrade'
    f.style.cssText = 'position:fixed;left:-9999px;top:0;width:700px;height:500px;border:0;opacity:0;pointer-events:none;'
    const t = setTimeout(resolve, timeout)
    f.onload = () => { clearTimeout(t); resolve() }
    document.body.appendChild(f)
    mapWarmFrame = f
    // Dopo il caricamento non serve più: rimuoviamo il frame (la cache HTTP resta)
    setTimeout(() => { f.remove(); mapWarmFrame = null }, timeout + 4000)
  })
}

export interface PreloadInput {
  settings: any
  catalog: any[]
}

export function collectAssets({ settings, catalog }: PreloadInput) {
  const uniq = (a: (string | undefined | null)[]) => Array.from(new Set(a.filter((u): u is string => !!u)))

  const critical = uniq([
    settings.logoUrl,
    settings.faviconUrl,
    settings.aboutImageUrl,
    ...(Object.keys(SECTION_BG_DEFAULTS) as SectionBgSlot[]).map(k => { const b = getSectionBg(settings, k); return b.video ? (b.poster || b.url) : b.url }),
  ])

  // Catalogo: TUTTE le immagini (copertina + gallerie) vengono caricate prima di aprire il sito
  const visible = (catalog || []).filter(i => i && i.visibile !== false)
  const catalogFirst = uniq(visible.flatMap(i => [i.img, ...(i.images || [])]))
  const catalogRest: string[] = []

  const fonts = uniq([settings.fontDisplay || 'Fraunces', settings.fontBody || 'Jost', settings.fontLabel || settings.fontBody || 'Jost'])
  return { critical, catalogFirst, catalogRest, fonts, mapUrl: buildMapsEmbed(settings) }
}

export function runPreload(input: PreloadInput, onProgress: (p: number) => void, hardTimeout = 70000): Promise<void> {
  const a = collectAssets(input)
  const tasks: { weight: number; run: () => Promise<void> }[] = []

  a.critical.concat(a.catalogFirst).forEach(u => tasks.push({ weight: 1, run: () => loadImage(u) }))
  a.fonts.forEach(f => {
    tasks.push({ weight: 0.5, run: () => loadFont(`400 1em "${f}"`) })
    tasks.push({ weight: 0.5, run: () => loadFont(`italic 400 1em "${f}"`) })
    tasks.push({ weight: 0.5, run: () => loadFont(`600 1em "${f}"`) })
  })
  tasks.push({ weight: 1, run: () => ('fonts' in document ? document.fonts.ready.then(() => undefined) : Promise.resolve()) })
  tasks.push({ weight: 1, run: () => windowLoaded() })
  tasks.push({ weight: 2, run: () => warmMap(a.mapUrl) })
  // Orologio 3D (~1,7 MB): scaricata e parsata ora, poi si attende che la sezione 3D abbia disegnato il primo frame
  tasks.push({ weight: 4, run: () => Promise.race([loadArmchair(armchairSource(input.settings)).then(() => undefined), new Promise<void>(r => setTimeout(r, 45000))]) })
  tasks.push({ weight: 2, run: () => waitArmchairReady(50000) })
  // Hero: WebGL, particelle e medaglione hanno già compilato e disegnato il primo frame
  tasks.push({ weight: 3, run: () => waitReady(['hero-three', 'hero-canvas', 'hero-orb'], 12000) })

  const total = tasks.reduce((s, t) => s + t.weight, 0)
  let done = 0
  const bump = (w: number) => { done += w; onProgress(Math.min(0.98, done / total)) }   // il 100% arriva solo a fine "assestamento"

  const all = Promise.all(tasks.map(t => t.run().catch(() => undefined).then(() => bump(t.weight))))
    .then(() => settle())     // ultimi frame + main thread libero prima di scoprire il sito
  return Promise.race([all.then(() => undefined), new Promise<void>(r => setTimeout(r, hardTimeout))]).then(() => {
    onProgress(1)
    // Resto del catalogo: a piccoli passi quando il browser è libero, senza toccare il primo render
    const rest = a.catalogRest.slice()
    const idle: (cb: () => void) => void = (window as any).requestIdleCallback
      ? cb => (window as any).requestIdleCallback(cb, { timeout: 1500 })
      : cb => setTimeout(cb, 120)
    const step = () => {
      const batch = rest.splice(0, 3)
      if (!batch.length) return
      Promise.all(batch.map(u => loadImage(u, 8000))).then(() => idle(step))
    }
    idle(step)
  })
}
