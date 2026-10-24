// @ts-nocheck
import { groqText } from '../utils/groq'
import { getAdminToken, clearAdminToken, adminSave, publishDataUrl } from '../utils/adminApi'
import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import type { CatalogItem, Recensione } from '../types'
import { translations } from '../i18n/translations'

// ─── Catalog & Reviews defaults ───────────────────────────────────────────────
// Articoli iniziali (dal catalogo WhatsApp). Prezzi "Su richiesta" finché non li imposti da admin → Catalogo.
const CATALOG_DEFAULT: CatalogItem[] = [
  { id: 101, nome: "Borsa alta moda anni '70", nomeEn: "Handbag, high-fashion 1970s", era: "Anni '70", categoria: "modernariato", descrizione: "Borsa alta moda anni '70, made in Italy.", descrizioneEn: "High-fashion 1970s handbag, made in Italy.", prezzo: 'Su richiesta', stato: 'venduto', badge: 'Venduto', img: '/catalog/01-borsa-anni-70.jpg', images: ['/catalog/01-borsa-anni-70.jpg'], visibile: true },
  { id: 102, nome: "Mobile bar anni '50", nomeEn: "1950s bar cabinet", era: "Anni '50", categoria: "mobili", descrizione: "Mobile bar anni '50 completamente originale.", descrizioneEn: "1950s bar cabinet, completely original.", prezzo: 'Su richiesta', stato: 'disponibile', badge: 'Disponibile', img: '/catalog/02-mobile-bar-anni-50.jpg', images: ['/catalog/02-mobile-bar-anni-50.jpg'], visibile: true },
  { id: 103, nome: "Targa in vetro anni '50", nomeEn: "1950s glass sign", era: "Anni '40/'50", categoria: "complementi", descrizione: "Bellissima targa in vetro originale degli anni '40/'50.", descrizioneEn: "Beautiful original glass sign from the 1940s/50s.", prezzo: 'Su richiesta', stato: 'disponibile', badge: 'Disponibile', img: '/catalog/03-targa-vetro-anni-50.jpg', images: ['/catalog/03-targa-vetro-anni-50.jpg'], visibile: true },
  { id: 104, nome: "Carta geografica Francia politica", nomeEn: "Political map of France", era: "Vintage", categoria: "complementi", descrizione: "Carta didattica della Francia politica, d'epoca.", descrizioneEn: "Vintage educational political map of France.", prezzo: 'Su richiesta', stato: 'disponibile', badge: 'Disponibile', img: '/catalog/04-carta-francia.jpg', images: ['/catalog/04-carta-francia.jpg'], visibile: true },
  { id: 105, nome: "Mobile in bambù", nomeEn: "Bamboo cabinet", era: "Vintage", categoria: "mobili", descrizione: "Mobile originale in bambù con due cassetti.", descrizioneEn: "Original bamboo cabinet with two drawers.", prezzo: 'Su richiesta', stato: 'venduto', badge: 'Venduto', img: '/catalog/05-mobile-bambu.jpg', images: ['/catalog/05-mobile-bambu.jpg'], visibile: true },
  { id: 106, nome: "Sedie tipo Cesca", nomeEn: "Cesca-style chairs", era: "Vintage", categoria: "mobili", descrizione: "Sedie in paglia di Vienna e acciaio, originali.", descrizioneEn: "Original Vienna straw and steel chairs.", prezzo: 'Su richiesta', stato: 'venduto', badge: 'Venduto', img: '/catalog/06-sedie-cesca.jpg', images: ['/catalog/06-sedie-cesca.jpg'], visibile: true },
  { id: 107, nome: "Lampadario a sospensione arancio", nomeEn: "Orange pendant lamp", era: "Vintage", categoria: "lampade", descrizione: "Lampada a sospensione arancio con due sfere bianche.", descrizioneEn: "Orange pendant lamp with two white globes.", prezzo: 'Su richiesta', stato: 'venduto', badge: 'Venduto', img: '/catalog/07-lampadario-arancio.jpg', images: ['/catalog/07-lampadario-arancio.jpg'], visibile: true },
  { id: 108, nome: "Scatola in ceramica Rometti", nomeEn: "Rometti ceramic box", era: "Vintage", categoria: "ceramiche", descrizione: "Scatola in ceramica Rometti, porta-carte da gioco.", descrizioneEn: "Rometti ceramic playing-card box.", prezzo: 'Su richiesta', stato: 'venduto', badge: 'Venduto', img: '/catalog/08-scatola-rometti.jpg', images: ['/catalog/08-scatola-rometti.jpg'], visibile: true },
  { id: 109, nome: "Portariviste", nomeEn: "Magazine rack", era: "Vintage", categoria: "complementi", descrizione: "Portariviste in legno con bordatura in ottone.", descrizioneEn: "Wooden magazine rack with brass trim.", prezzo: 'Su richiesta', stato: 'disponibile', badge: 'Disponibile', img: '/catalog/09-portariviste.jpg', images: ['/catalog/09-portariviste.jpg'], visibile: true },
  { id: 110, nome: "Valigia / baule", nomeEn: "Suitcase / trunk", era: "Vintage", categoria: "complementi", descrizione: "Valigia/baule in cartone e ferro dei primi anni del secolo.", descrizioneEn: "Cardboard and iron suitcase/trunk from the early 20th century.", prezzo: 'Su richiesta', stato: 'disponibile', badge: 'Disponibile', img: '/catalog/10-valigia-baule.jpg', images: ['/catalog/10-valigia-baule.jpg'], visibile: true },
  { id: 111, nome: "Poltrona anni '50/'60", nomeEn: "1950s/60s armchair", era: "Anni '50/'60", categoria: "mobili", descrizione: "Poltrona in similpelle beige con zampe in legno.", descrizioneEn: "Beige faux-leather armchair with wooden legs.", prezzo: 'Su richiesta', stato: 'disponibile', badge: 'Disponibile', img: '/catalog/11-poltrona-50-60.jpg', images: ['/catalog/11-poltrona-50-60.jpg'], visibile: true },
  { id: 112, nome: "Lampada Dalù", nomeEn: "Dalù lamp", era: "Vintage", categoria: "lampade", descrizione: "Lampada da tavolo Dalù di Vico Magistretti.", descrizioneEn: "Dalù table lamp by Vico Magistretti.", prezzo: 'Su richiesta', stato: 'disponibile', badge: 'Disponibile', img: '/catalog/12-lampada-dalu.jpg', images: ['/catalog/12-lampada-dalu.jpg'], visibile: true },
  { id: 113, nome: "Lampada da tavolo in paglia di Vienna", nomeEn: "Vienna straw table lamp", era: "Vintage", categoria: "lampade", descrizione: "Lampada da tavolo in paglia di Vienna e bambù.", descrizioneEn: "Table lamp in Vienna straw and bamboo.", prezzo: 'Su richiesta', stato: 'disponibile', badge: 'Disponibile', img: '/catalog/13-lampada-paglia.jpg', images: ['/catalog/13-lampada-paglia.jpg'], visibile: true },
  { id: 114, nome: "Tavolino anni '50", nomeEn: "1950s side table", era: "Anni '50", categoria: "mobili", descrizione: "Tavolino in legno bordato in corda.", descrizioneEn: "Wooden side table edged with rope.", prezzo: 'Su richiesta', stato: 'disponibile', badge: 'Disponibile', img: '/catalog/14-tavolino-anni-50.jpg', images: ['/catalog/14-tavolino-anni-50.jpg'], visibile: true },
  { id: 115, nome: "Sedia girevole", nomeEn: "Swivel chair", era: "Vintage", categoria: "mobili", descrizione: "Sedia da lavoro girevole in legno e acciaio.", descrizioneEn: "Swivel work chair in wood and steel.", prezzo: 'Su richiesta', stato: 'disponibile', badge: 'Disponibile', img: '/catalog/15-sedia-girevole.jpg', images: ['/catalog/15-sedia-girevole.jpg'], visibile: true },
  { id: 116, nome: "Coppia di lampade da tavolo", nomeEn: "Pair of table lamps", era: "Vintage", categoria: "lampade", descrizione: "Coppia di lampade da tavolo in bronzo e vetro.", descrizioneEn: "Pair of bronze and glass table lamps.", prezzo: 'Su richiesta', stato: 'disponibile', badge: 'Disponibile', img: '/catalog/16-lampade-bronzo.jpg', images: ['/catalog/16-lampade-bronzo.jpg'], visibile: true },
]
// ⚠ SEGNAPOSTO: testi di esempio scritti per riempire la sezione. Sostituirli con recensioni reali dei clienti
// (da admin → Recensioni) prima di pubblicare: presentare recensioni inventate come vere non è consentito.
const REVIEWS_DEFAULT: Recensione[] = [
  { id: 1, autore: 'Giulia M.', citta: 'Firenze', stelle: 5, inEvidenza: true, visibile: true, data: '2026-09-12',
    testo: "Cercavo uno specchio d'epoca per l'ingresso e ho trovato molto più di quello che immaginavo. Pezzi scelti con cura, prezzi onesti e una cortesia rara. Ci tornerò di sicuro.",
    testoEn: "I was looking for a period mirror for my hallway and found far more than I expected. Carefully chosen pieces, fair prices and rare kindness. I'll definitely be back." },
  { id: 2, autore: 'Marco B.', citta: 'Prato', stelle: 5, inEvidenza: false, visibile: true, data: '2026-08-30',
    testo: "Una lampada anni '60 in condizioni perfette, imballata con attenzione maniacale. Mi hanno anche raccontato la storia del pezzo: è questo che fa la differenza.",
    testoEn: "A 1960s lamp in perfect condition, packed with obsessive care. They even told me the story of the piece: that's what makes the difference." },
  { id: 3, autore: 'Chiara R.', citta: 'Pistoia', stelle: 5, inEvidenza: false, visibile: true, data: '2026-08-14',
    testo: "Ho regalato un bijou vintage a mia madre e non l'ho mai vista così felice. Mi hanno consigliata con gusto e senza fretta.",
    testoEn: "I gave my mother a vintage piece of jewellery and I've never seen her so happy. They advised me with taste and without any rush." },
  { id: 4, autore: 'Alessandro T.', citta: 'Siena', stelle: 4, inEvidenza: false, visibile: true, data: '2026-07-26',
    testo: "Bottega piccola ma piena di sorprese: ogni volta c'è qualcosa di nuovo da scoprire. Ho comprato una cornice dorata che ha dato carattere a tutto il salotto.",
    testoEn: "A small shop full of surprises: there's always something new to discover. I bought a gilded frame that gave the whole living room character." },
  { id: 5, autore: 'Elena P.', citta: 'Empoli', stelle: 5, inEvidenza: false, visibile: true, data: '2026-07-05',
    testo: "Staff gentile e competente. Mi hanno aiutata a capire l'epoca e lo stato di una credenza che avevo ereditato, senza obbligo di acquisto. Professionalità vera.",
    testoEn: "Kind and knowledgeable staff. They helped me understand the age and condition of a sideboard I had inherited, with no obligation to buy. Genuine professionalism." },
  { id: 6, autore: 'Francesca L.', citta: 'Bologna', stelle: 5, inEvidenza: false, visibile: true, data: '2026-06-18',
    testo: "Di passaggio a Firenze mi sono fermata quasi per caso e sono uscita con due ceramiche e un sorriso. Atmosfera bellissima, si respira storia.",
    testoEn: "Passing through Florence I stopped almost by chance and left with two ceramics and a smile. Beautiful atmosphere — you can breathe history." },
]

// ─── Discount type ────────────────────────────────────────────────────────────
export interface Sconto {
  id: number
  nome: string
  tipo: 'percentuale' | 'fisso' | 'spedizione_gratis' | 'omaggio'
  valore: number
  descrizione: string
  attivo: boolean
  visibileNelCatalogo: boolean
  dataScadenza: string
  codice: string
  articoliIds: number[]   // IDs degli articoli a cui si applica ([] = nessuno applicato in catalogo)
}

// ─── Sfondi del sito (titolo → corpo → piede) ─────────────────────────────────
// Un unico sistema per tutte le zone della pagina, in ordine di scorrimento.
// Ogni zona ha gli stessi parametri, gestiti da admin → "Sfondi & Mappa".
export type SectionBgSlot = 'navbar' | 'hero' | 'marquee' | 'about' | 'catalog' | 'why' | 'reviews' | 'contact' | 'location' | 'footer'
export type BgFade = 'both' | 'top' | 'bottom' | 'none'
export interface SectionBg {
  url: string
  opacity: number      // 0–1
  brightness: number   // 0–1.5
  blur: number         // px, 0–20
  sepia: number        // 0–1
  posX: number         // 0–100 (%): punto di messa a fuoco orizzontale
  posY: number         // 0–100 (%): punto di messa a fuoco verticale
  size: 'cover' | 'tile'   // riempi la zona oppure ripeti come pattern
  fade: BgFade         // quali bordi sfumare verso le sezioni vicine
  fadeSize: number     // ampiezza della sfumatura, % dell'altezza (0–45)
  scrim: number        // velo del colore di sfondo sopra l'immagine, 0–1 (schiarisce/scurisce per far leggere il testo)
  shadow: number       // alone attorno ai testi, 0–1 (leggibilità sopra le foto)
  scrimShape: 'flat' | 'side'  // velo uniforme oppure concentrato dietro al testo (lato sinistro; in verticale dall'alto)
}

export const SECTION_BG_LABELS: Record<SectionBgSlot, string> = {
  navbar: 'Barra di navigazione',
  hero: 'Copertina (titolo)',
  marquee: 'Striscia categorie',
  about: 'Chi siamo',
  catalog: 'Catalogo',
  why: 'Perché sceglierci',
  reviews: 'Recensioni',
  contact: 'Contatti',
  location: 'Dove siamo',
  footer: 'Footer',
}

// Raggruppamento mostrato nell'admin, nello stesso ordine della pagina
export const SECTION_BG_GROUPS: { title: string; slots: SectionBgSlot[] }[] = [
  { title: 'Titolo · testata', slots: ['navbar', 'hero'] },
  { title: 'Corpo · sezioni', slots: ['marquee', 'about', 'catalog', 'why', 'reviews', 'contact', 'location'] },
  { title: 'Piede · footer', slots: ['footer'] },
]

const BG_BASE: Omit<SectionBg, 'url' | 'opacity'> = { brightness: 1, blur: 0, sepia: 0, posX: 50, posY: 50, size: 'cover', fade: 'both', fadeSize: 14, scrim: 0, shadow: 0.7, scrimShape: 'flat' }

// Zone in cui c'è testo sopra l'immagine (solo qui ha senso regolare l'alone e il velo)
export const SECTION_BG_HAS_TEXT: SectionBgSlot[] = ['hero', 'about', 'catalog', 'why', 'reviews', 'contact', 'location', 'footer']

export const SECTION_BG_DEFAULTS: Record<SectionBgSlot, SectionBg> = {
  navbar:   { ...BG_BASE, url: '/bg/nav.jpg',      opacity: 0.55, fade: 'none' },
  hero:     { ...BG_BASE, url: '/bg/hero-foto.jpg',  opacity: 0.85, brightness: 0.78, sepia: 0.1, posY: 35, fade: 'both', fadeSize: 20, scrim: 0.82, shadow: 0.9, scrimShape: 'side' },
  marquee:  { ...BG_BASE, url: '/bg/marquee.jpg',  opacity: 0.30, fade: 'none' },
  about:    { ...BG_BASE, url: '/bg/about-foto.jpg',  opacity: 0.30, blur: 3, posY: 55 },
  catalog:  { ...BG_BASE, url: '/bg/catalog-foto.jpg', opacity: 0.30, blur: 3, posY: 40, scrim: 0.3 },
  why:      { ...BG_BASE, url: '/bg/why-foto.jpg',  opacity: 0.28, blur: 3, posY: 45 },
  reviews:  { ...BG_BASE, url: '/bg/reviews-foto.jpg', opacity: 0.45, brightness: 0.65, blur: 3, posY: 50 },
  contact:  { ...BG_BASE, url: '/bg/contact.jpg',  opacity: 0.30 },
  location: { ...BG_BASE, url: '/bg/location.jpg', opacity: 0.30 },
  footer:   { ...BG_BASE, url: '/bg/footer.jpg',   opacity: 0.32, brightness: 0.32, sepia: 0.25, fade: 'top', fadeSize: 22, scrim: 0.5 },
}

// Chiavi usate dalle versioni ≤ v49 per hero / recensioni / footer: restano come valore di ripiego,
// così i siti già configurati non perdono le immagini scelte. Le nuove modifiche vanno in sectionBgs.
const LEGACY_BG_KEYS: Partial<Record<SectionBgSlot, { url: string; opacity: string; brightness: string }>> = {
  hero:    { url: 'heroImageUrl',      opacity: 'heroImageOpacity',   brightness: 'heroImageBrightness' },
  reviews: { url: 'reviewsBgImageUrl', opacity: 'reviewsBgOpacity',   brightness: 'reviewsBgBrightness' },
  footer:  { url: 'footerImageUrl',    opacity: 'footerImageOpacity', brightness: 'footerImageBrightness' },
}

const REPLACED_DEFAULT_URLS = ['/bg/hero.jpg', '/bg/about.jpg', '/bg/catalog.jpg', '/bg/why.jpg', '/bg/reviews.jpg']

// Ordine di priorità: default → valori legacy salvati → sectionBgs (admin)
export function getSectionBg(settings: any, slot: SectionBgSlot): SectionBg {
  const base = SECTION_BG_DEFAULTS[slot]
  const lk = LEGACY_BG_KEYS[slot]
  const legacy: Partial<SectionBg> = {}
  if (lk && settings) {
    if (typeof settings[lk.url] === 'string' && settings[lk.url]) legacy.url = settings[lk.url]
    if (typeof settings[lk.opacity] === 'number') legacy.opacity = settings[lk.opacity]
    if (typeof settings[lk.brightness] === 'number') legacy.brightness = settings[lk.brightness]
  }
  const out = { ...base, ...legacy, ...(settings?.sectionBgs?.[slot] || {}) }
  // Sfondi predefiniti di versioni precedenti (illustrazioni, ora sostituiti dalle foto): se erano rimasti
  // salvati nelle impostazioni, si passa automaticamente alla nuova immagine predefinita.
  if (REPLACED_DEFAULT_URLS.includes(out.url)) out.url = base.url
  return out
}

// Mappa Google incorporata, in vista satellitare (t=k) o ibrida (t=h) senza bisogno di API key.
// Se l'admin ha incollato un embed "pb=..." (non supporta il tipo mappa) si costruisce l'URL dall'indirizzo.
export function buildMapsEmbed(s: { mapsEmbed?: string; indirizzo?: string; citta?: string; mapType?: 'k' | 'h' | 'm' }): string {
  const type = s.mapType || 'k'
  const custom = (s.mapsEmbed || '').trim()
  if (custom) {
    try {
      const u = new URL(custom)
      // Host esatto di Google (evita bypass tipo google.com.evil.com) e solo percorso /maps
      const okHost = /^(www\.|maps\.)?google\.(com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$/i.test(u.hostname)
      if (u.protocol === 'https:' && okHost && u.pathname.startsWith('/maps')) {
        u.searchParams.set('t', type)
        if (!u.searchParams.has('z')) u.searchParams.set('z', '19')
        u.searchParams.set('output', 'embed')
        return u.toString()
      }
    } catch { /* URL non valido: usa quello generato dall'indirizzo */ }
  }
  const q = encodeURIComponent(`${s.indirizzo || 'Via Giampaolo Orsini 46/A'} ${s.citta || '50126 Firenze'}`)
  return `https://www.google.com/maps?q=${q}&t=${type}&z=19&output=embed`
}

// Rimuove le immagini base64 (troppo pesanti per Gist / quota localStorage)
export function stripDataImages<T extends Record<string, any>>(settings: T): T {
  const out: any = { ...settings }
  const keys = ['logoUrl', 'faviconUrl', 'heroImageUrl', 'aboutImageUrl', 'footerImageUrl', 'reviewsBgImageUrl', 'maintenanceLogoUrl', 'maintenanceBgImageUrl']
  keys.forEach(k => { if (typeof out[k] === 'string' && out[k].startsWith('data:')) out[k] = '' })
  if (Array.isArray(out.accreditations)) out.accreditations = out.accreditations.map((a: any) => a && typeof a.logoUrl === 'string' && a.logoUrl.startsWith('data:') ? { ...a, logoUrl: '' } : a)
  if (out.sectionBgs) {
    const sb: any = {}
    Object.keys(out.sectionBgs).forEach(slot => {
      const v = out.sectionBgs[slot]
      sb[slot] = v && typeof v.url === 'string' && v.url.startsWith('data:') ? { ...v, url: SECTION_BG_DEFAULTS[slot as SectionBgSlot]?.url ?? '' } : v
    })
    out.sectionBgs = sb
  }
  return out
}

// ─── SiteSettings ─────────────────────────────────────────────────────────────
export interface SiteSettings {
  // Identity
  siteName: string
  slogan: string
  footerTagline: string
  footerRights: string
  footerDesign: string
  logoUrl: string
  faviconUrl: string
  // Texts
  leadText: string
  aboutTitle: string
  aboutLead: string
  aboutQuote: string
  // Contacts
  email: string
  telefono: string
  indirizzo: string
  citta: string
  instagram: string
  instagramHandle: string
  whatsapp: string
  mapsLink: string
  mapsEmbed: string
  // Visuals — images
  aboutImageUrl: string
  /** @deprecated ≤v49: solo valore di ripiego, ora gestito da sectionBgs.hero */
  heroImageUrl?: string
  /** @deprecated ≤v49: ora sectionBgs.footer */
  footerImageUrl?: string
  /** @deprecated ≤v49: ora sectionBgs.reviews */
  reviewsBgImageUrl?: string
  // Visuals — sfondi sparsi per sezione (immagine + opacità + luminosità, gestibili da admin)
  sectionBgs: Partial<Record<SectionBgSlot, SectionBg>>
  // Mappa: 'k' = satellitare, 'h' = satellitare con etichette, 'm' = stradale
  mapType: 'k' | 'h' | 'm'
  // Visuals — opacity/brightness sliders
  heroImageOpacity?: number      // deprecated (vedi sectionBgs.hero)
  heroImageBrightness?: number
  footerImageOpacity?: number
  footerImageBrightness?: number
  reviewsBgOpacity?: number
  reviewsBgBrightness?: number
  aboutImageOpacity: number      // 0–1
  aboutImageBrightness: number   // 0–1 (replaces hardcoded 0.82)
  aboutImageSepia: number        // 0–1
  // Colors
  primaryColor: string
  bgColor: string
  bgAltColor: string      // sezioni alternate
  bgCardColor: string     // card, panel, input
  textColor: string
  textMutedColor: string  // testo secondario
  accentColor: string
  overlayColor: string    // overlay rgba su immagini
  fontDisplay: string
  fontLabel?: string
  fontBody: string
  // Features
  showPrezzi: boolean
  showWhatsApp: boolean
  showCursor: boolean
  maintenanceMode: boolean
  maintenanceEndDate: string      // ISO datetime string, e.g. "2026-06-01T18:00"
  maintenanceMessage: string      // custom visitor message
  maintenanceBgImageUrl: string   // optional background image override
  maintenanceLogoUrl: string      // optional logo override for maintenance page
  maintenanceShowInstagram: boolean
  maintenanceShowLegal: boolean
  categorieAttive: string[]
  catalogPerPage: number
  adminPassword: string
  // Hours
  orari: {
    lun: string; mar: string; mer: string; gio: string
    ven: string; sab: string; dom: string
  }
  // Banner
  bannerAttivo: boolean
  bannerTesto: string
  bannerColore: string
  // Discounts
  sconti: Sconto[]
  // About stats (customizable)
  statAnni: number
  statOggetti: string
  statRating: string
  // Why section items (optional override over translations)
  whyItems: { title: string; desc: string }[]
  // EmailJS configuration (managed via admin panel)
  emailjsServiceId: string
  emailjsTemplateBook: string      // template prenotazione appuntamento
  emailjsTemplateRequest: string   // template richiesta oggetto
  emailjsTemplateEstimate: string  // template richiesta stima
  emailjsTemplateClient?: string   // (opzionale) conferma automatica al cliente
  emailjsPublicKey: string
  emailjsEnabled: boolean
  // Legal & footer extras
  pivaText: string        // es. "P.IVA in fase di registrazione" o "P.IVA 01234567890"
  whatsappCatalog?: string  // link al catalogo WhatsApp Business (es. https://wa.me/c/39...)
  titolare?: string         // nome del titolare, usato nelle pagine legali
  legalRevision: string   // es. "maggio 2026"
  // Enti di accreditamento / garanzia di genuinità mostrati nel footer (4 slot, gestiti da admin)
  accreditations: { name: string; logoUrl: string; link: string }[]
  // Poltrona 3D (gestita da admin → tab "Poltrona 3D")
  armchairModelUrl: string                 // URL di un .glb ospitato (visibile a tutti i visitatori); vuoto = default
  armchairModelAsset: { id: string; parts: number; name: string } | null   // .glb caricato dall'admin e pubblicato sul server (visibile a tutti)
  armchairLocalName: string                // nome del .glb caricato nel browser dell'admin (IndexedDB); vuoto = nessuno
  armchairRev: number                      // cambia a ogni sostituzione: invalida la cache del modello
  armchairLabels: { it?: string; en?: string }
  armchairChapters: { it?: { k: string; t: string; d: string }[]; en?: { k: string; t: string; d: string }[] }
}

export const DEFAULT_SETTINGS: SiteSettings = {
  siteName: 'Emporio 46',
  slogan: 'Arredi vintage e bijoux a Firenze',
  footerTagline: 'Non smettere mai di sognare.',
  footerRights: '© 2026 Emporio 46 · Firenze',
  footerDesign: 'Design by Swan Boccella',
  logoUrl: '/logo.png',
  faviconUrl: '/favicon.png',
  leadText: "Arredi vintage, lampade e bijoux scelti uno a uno.\nPezzi che hanno già una storia, pronti a iniziarne un'altra a casa vostra.",
  aboutTitle: 'Il vintage che ha ancora molto da raccontare',
  aboutLead: "Emporio 46 è un negozio di arredi vintage e bijoux a Firenze, in Via Giampaolo Orsini 46/A. Qui trovate mobili, lampade, specchi, complementi d'arredo e bijoux scelti per carattere e qualità: pezzi che hanno già avuto una vita e possono darne una nuova alla vostra casa. Passate a trovarci in negozio, scriveteci su WhatsApp o sfogliate il nostro catalogo: saremo felici di aiutarvi a trovare il pezzo giusto.",
  aboutQuote: 'Non smettere mai di sognare.',
  email: '',
  telefono: '+39 055 532 6258',
  indirizzo: 'Via Giampaolo Orsini, 46/A',
  citta: '50126 Firenze (FI)',
  instagram: 'https://www.instagram.com/emporio46firenze',
  instagramHandle: '@emporio46firenze',
  whatsapp: '393756106713',
  whatsappCatalog: 'https://wa.me/c/393756106713',
  titolare: '',
  mapsLink: 'https://maps.google.com/?q=Via+Giampaolo+Orsini+46%2FA+50126+Firenze',
  mapsEmbed: 'https://www.google.com/maps?q=Via+Giampaolo+Orsini+46%2FA+50126+Firenze&output=embed',
  mapType: 'k',
  aboutImageUrl: '',
  sectionBgs: {},
  aboutImageOpacity: 1.0,
  aboutImageBrightness: 0.82,
  aboutImageSepia: 0.25,
  primaryColor: '#c4561f',
  bgColor: '#f3e8d4',
  bgAltColor: '#eadcc2',
  bgCardColor: '#fbf4e6',
  textColor: '#2b1a12',
  textMutedColor: '#7b6454',
  accentColor: '#2f6f73',
  overlayColor: 'rgba(243,232,212,0.74)',
  fontDisplay: 'Fraunces',
  fontLabel: 'Jost',
  fontBody: 'Jost',
  showPrezzi: false,
  showWhatsApp: true,
  showCursor: true,
  maintenanceMode: false,
  maintenanceEndDate: '',
  maintenanceMessage: 'Stiamo lavorando per migliorare la vostra esperienza. Torneremo presto con qualcosa di speciale.',
  maintenanceBgImageUrl: '',
  maintenanceLogoUrl: '',
  maintenanceShowInstagram: true,
  maintenanceShowLegal: true,
  categorieAttive: ['mobili', 'lampade', 'bijoux', 'specchi', 'cornici', 'complementi', 'ceramiche', 'modernariato', 'altro'],
  catalogPerPage: 9,
  adminPassword: import.meta.env.DEV ? 'dev' : '',
  orari: {
    lun: 'Chiuso',
    mar: '10:00–13:00 · 16:00–19:30',
    mer: '10:00–13:00 · 16:00–19:30',
    gio: '10:00–13:00 · 16:00–19:30',
    ven: '10:00–13:00 · 16:00–19:30',
    sab: '10:00–13:00 · 16:00–19:30',
    dom: 'Chiuso',
  },
  bannerAttivo: false,
  bannerTesto: '',
  bannerColore: '#c4561f',
  sconti: [],
  statAnni: 0,
  statOggetti: '',
  statRating: '',
  whyItems: [
    { title: 'Pezzi selezionati', desc: 'Ogni arredo, lampada e bijou viene scelto per carattere, qualità e stato di conservazione. Niente produzione in serie: solo pezzi che hanno qualcosa da dire.' },
    { title: 'Pezzi unici', desc: "Quello che vedete è quello che c'è: ogni oggetto esiste in un solo esemplare. Se vi piace, non aspettate troppo." },
    { title: 'Catalogo su WhatsApp', desc: 'Sfogliate le novità dal nostro catalogo WhatsApp e scriveteci per ricevere foto, misure e disponibilità.' },
    { title: 'Vi aspettiamo in negozio', desc: 'In Via Giampaolo Orsini 46/A, dal martedì al sabato. Venite a vedere i pezzi dal vivo: le foto non rendono mai giustizia.' },
  ],
  emailjsServiceId: '',
  emailjsTemplateBook: '',
  emailjsTemplateRequest: '',
  emailjsTemplateEstimate: '',
  emailjsTemplateClient: '',
  emailjsPublicKey: '',
  emailjsEnabled: false,
  pivaText: '',
  legalRevision: 'ottobre 2026',
  accreditations: [
    { name: 'Camera di Commercio di Firenze', logoUrl: '/accrediti/camera-commercio-firenze.svg', link: 'https://www.fi.camcom.it' },
    { name: "Associazione Antiquari d'Italia", logoUrl: '/accrediti/associazione-antiquari-italia.svg', link: '' },
    { name: "Federazione Italiana Mercanti d'Arte", logoUrl: '/accrediti/fima.svg', link: 'https://www.fimantiquari.it' },
    { name: "Confcommercio – Imprese per l'Italia", logoUrl: '/accrediti/confcommercio.svg', link: 'https://www.confcommercio.it' },
  ],
  armchairModelUrl: '',
  armchairModelAsset: null,
  armchairLocalName: '',
  armchairRev: 0,
  armchairLabels: {},
  armchairChapters: {},
}

// ─── Theme Presets ────────────────────────────────────────────────────────────
export interface ThemePreset {
  id: string
  nome: string
  descrizione: string
  dark: boolean
  primaryColor: string
  bgColor: string        // main background (hero, sections senza img)
  bgAltColor: string     // sezioni alternate (Why, Location, Footer overlay)
  bgCardColor: string    // card, input, panel
  textColor: string      // testo principale
  textMutedColor: string // testo secondario/muted
  accentColor: string    // accento / secondario
  overlayColor: string   // overlay su immagini (rgba) — più scuro su dark, più chiaro su light
  fontDisplay: string
  fontLabel?: string
  fontBody: string
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'emporio', nome: 'Emporio 46', descrizione: 'Carta crema, arancio bruciato e verde petrolio — i toni del negozio', dark: false, primaryColor: '#c4561f', bgColor: '#f3e8d4', bgAltColor: '#eadcc2', bgCardColor: '#fbf4e6', textColor: '#2b1a12', textMutedColor: '#7b6454', accentColor: '#2f6f73', overlayColor: 'rgba(243,232,212,0.74)', fontDisplay: 'Fraunces', fontLabel: 'Jost', fontBody: 'Jost' },
  { id: 'emporio-notte', nome: 'Emporio 46 · Notte', descrizione: 'Versione scura: marrone caldo, ambra e verde petrolio', dark: true, primaryColor: '#e29a3d', bgColor: '#0d0a08', bgAltColor: '#17110d', bgCardColor: '#211812', textColor: '#f4ebdd', textMutedColor: '#a39380', accentColor: '#5f8f94', overlayColor: 'rgba(13,10,8,0.74)', fontDisplay: 'Fraunces', fontLabel: 'Jost', fontBody: 'Jost' },
  // ════════════════════════════════════════════════════════════════
  // ── TEMI SCURI (10) ─────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════
  { id: 'espresso', nome: 'Espresso', descrizione: "Marrone quasi-nero da tazza d'espresso — oro caldo, eleganza assoluta", dark: true, primaryColor: '#c9a84c', bgColor: '#0d0906', bgAltColor: '#160d08', bgCardColor: '#1f1510', textColor: '#f0e6d3', textMutedColor: '#8a7a68', accentColor: '#7a6a58', overlayColor: 'rgba(13,9,6,0.74)', fontDisplay: 'Cinzel', fontBody: 'Cormorant Garamond' },
  { id: 'mogano', nome: 'Mogano', descrizione: 'Marrone mogano profondo — tre toni di legno antico con oro ambrato', dark: true, primaryColor: '#d4a857', bgColor: '#130a04', bgAltColor: '#1e0f07', bgCardColor: '#2d1a0d', textColor: '#f5ead8', textMutedColor: '#9a7a58', accentColor: '#8b6f4e', overlayColor: 'rgba(19,10,4,0.76)', fontDisplay: 'Playfair Display', fontBody: 'EB Garamond' },
  { id: 'terra', nome: 'Terra di Siena', descrizione: 'Bruno terroso toscano — argilla, affreschi, oro caldo distinto', dark: true, primaryColor: '#e8b86d', bgColor: '#150d05', bgAltColor: '#221408', bgCardColor: '#301c0c', textColor: '#f7e8cc', textMutedColor: '#a08060', accentColor: '#9b7a50', overlayColor: 'rgba(21,13,5,0.72)', fontDisplay: 'Cormorant Garamond', fontBody: 'Libre Baskerville' },
  { id: 'inchiostro', nome: 'Inchiostro', descrizione: 'Nero inchiostro con sfumatura bluastra — oro pallido, carta antica', dark: true, primaryColor: '#c8a84a', bgColor: '#080810', bgAltColor: '#0e0e1a', bgCardColor: '#161626', textColor: '#eae6f0', textMutedColor: '#7878a0', accentColor: '#5a5a80', overlayColor: 'rgba(8,8,16,0.80)', fontDisplay: 'Cinzel', fontBody: 'EB Garamond' },
  { id: 'ardesia', nome: 'Ardesia', descrizione: 'Grigio ardesia freddo — tre gradazioni con accenti rame-bronzo', dark: true, primaryColor: '#b87c4c', bgColor: '#0c0e12', bgAltColor: '#151820', bgCardColor: '#1e2230', textColor: '#e8e0d4', textMutedColor: '#7a7268', accentColor: '#7a6a5a', overlayColor: 'rgba(12,14,18,0.78)', fontDisplay: 'Cinzel', fontBody: 'EB Garamond' },
  { id: 'muschio', nome: 'Muschio', descrizione: 'Verde muschio scuro — note botaniche, oro oliva su tre piani verdi', dark: true, primaryColor: '#8fa67a', bgColor: '#060c05', bgAltColor: '#0c180a', bgCardColor: '#142310', textColor: '#e4eed4', textMutedColor: '#6a8055', accentColor: '#5a7048', overlayColor: 'rgba(6,12,5,0.76)', fontDisplay: 'Playfair Display', fontBody: 'Cormorant Garamond' },
  { id: 'antracite', nome: 'Antracite', descrizione: 'Grigio antracite neutro — rame satinato su tre grigi precisi', dark: true, primaryColor: '#c0886a', bgColor: '#0a0a0a', bgAltColor: '#141414', bgCardColor: '#1e1e1e', textColor: '#ede8e2', textMutedColor: '#808080', accentColor: '#706050', overlayColor: 'rgba(10,10,10,0.78)', fontDisplay: 'Playfair Display', fontBody: 'Lora' },
  { id: 'bronzo', nome: 'Bronzo', descrizione: 'Bronzo antico — tre profondità metalliche, dorato acceso', dark: true, primaryColor: '#cd7f32', bgColor: '#100c05', bgAltColor: '#1c1408', bgCardColor: '#2a1e0c', textColor: '#f0dfc0', textMutedColor: '#906840', accentColor: '#8a6040', overlayColor: 'rgba(16,12,5,0.74)', fontDisplay: 'Cinzel', fontBody: 'Cormorant Garamond' },
  { id: 'notte', nome: 'Notte', descrizione: 'Blu notte profondo — oro lunare su tre blu-scuri sfumati', dark: true, primaryColor: '#d4aa60', bgColor: '#04080f', bgAltColor: '#080f1a', bgCardColor: '#0f1826', textColor: '#e8eaf5', textMutedColor: '#6070a0', accentColor: '#506090', overlayColor: 'rgba(4,8,15,0.82)', fontDisplay: 'Cinzel', fontBody: 'Cormorant Garamond' },
  { id: 'pece', nome: 'Pece', descrizione: 'Nero pece assoluto — minimalismo estremo, oro come unico calore', dark: true, primaryColor: '#c9a84c', bgColor: '#030303', bgAltColor: '#0a0a0a', bgCardColor: '#121212', textColor: '#f0ece4', textMutedColor: '#6a6a6a', accentColor: '#4a4a4a', overlayColor: 'rgba(3,3,3,0.85)', fontDisplay: 'Cinzel', fontBody: 'Cormorant Garamond' },
  // ════════════════════════════════════════════════════════════════
  // ── TEMI CHIARI (10) ────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════
  { id: 'avorio', nome: 'Avorio', descrizione: 'Avorio caldo — sfondo latteo, mid sabbioso, card bianco antico', dark: false, primaryColor: '#8b6914', bgColor: '#f8f1e4', bgAltColor: '#ede3d0', bgCardColor: '#fdfaf4', textColor: '#1e1408', textMutedColor: '#7a6040', accentColor: '#a05c20', overlayColor: 'rgba(20,12,0,0.52)', fontDisplay: 'Playfair Display', fontBody: 'Cormorant Garamond' },
  { id: 'pergamena', nome: 'Pergamena', descrizione: 'Pergamena medievale — tre toni ocra come un manoscritto illuminato', dark: false, primaryColor: '#7a5c1e', bgColor: '#f0e6cc', bgAltColor: '#e2d4b4', bgCardColor: '#f8f0de', textColor: '#1e1006', textMutedColor: '#7a5c30', accentColor: '#9b3a1a', overlayColor: 'rgba(20,10,0,0.50)', fontDisplay: 'Cormorant Garamond', fontBody: 'EB Garamond' },
  { id: 'lino', nome: 'Lino', descrizione: 'Lino naturale — neutro caldo italiano, mid grigio-beige, card puro', dark: false, primaryColor: '#6b5010', bgColor: '#ede8df', bgAltColor: '#ddd6ca', bgCardColor: '#f5f2ed', textColor: '#1a1208', textMutedColor: '#7a6a50', accentColor: '#8b3a28', overlayColor: 'rgba(18,10,2,0.50)', fontDisplay: 'Playfair Display', fontBody: 'Libre Baskerville' },
  { id: 'dorato', nome: 'Dorato', descrizione: 'Oro su crema — sfondo crema brillante, accenti ambra profondi', dark: false, primaryColor: '#9a6e00', bgColor: '#faf5e8', bgAltColor: '#ede0c0', bgCardColor: '#fffdf5', textColor: '#140e00', textMutedColor: '#7a6010', accentColor: '#8b3520', overlayColor: 'rgba(16,10,0,0.50)', fontDisplay: 'Cinzel', fontBody: 'Cormorant Garamond' },
  { id: 'salvia', nome: 'Salvia', descrizione: 'Verde salvia mediterraneo — sfondo celadon, accenti foglia dorata', dark: false, primaryColor: '#5a7a3a', bgColor: '#eef2ec', bgAltColor: '#dde6da', bgCardColor: '#f5f8f4', textColor: '#1a2218', textMutedColor: '#6a7a60', accentColor: '#7a5a20', overlayColor: 'rgba(10,20,8,0.48)', fontDisplay: 'Playfair Display', fontBody: 'Cormorant Garamond' },
  { id: 'alabastro', nome: 'Alabastro', descrizione: 'Bianco alabastro gelido — mid ghiaccio, accento platino-argento', dark: false, primaryColor: '#7a7260', bgColor: '#f8f8f6', bgAltColor: '#eeeee8', bgCardColor: '#ffffff', textColor: '#1a1a18', textMutedColor: '#7a7870', accentColor: '#5a6050', overlayColor: 'rgba(10,10,8,0.45)', fontDisplay: 'Cinzel', fontBody: 'EB Garamond' },
  { id: 'cipria', nome: 'Cipria', descrizione: 'Rosa cipria antico — sfondo cipria, card bianco, accento terracotta', dark: false, primaryColor: '#8a4030', bgColor: '#f8f0ec', bgAltColor: '#ecddd8', bgCardColor: '#fdf8f6', textColor: '#1e1010', textMutedColor: '#8a6060', accentColor: '#9a5030', overlayColor: 'rgba(18,8,6,0.50)', fontDisplay: 'Cormorant Garamond', fontBody: 'Lora' },
  { id: 'ossidiana', nome: 'Ossidiana Chiara', descrizione: 'Grigio pietra lunare — tre grigi freddi con accento ottone', dark: false, primaryColor: '#806040', bgColor: '#f0f0ee', bgAltColor: '#e2e2de', bgCardColor: '#f8f8f6', textColor: '#161616', textMutedColor: '#707070', accentColor: '#505048', overlayColor: 'rgba(12,12,12,0.46)', fontDisplay: 'Playfair Display', fontBody: 'Libre Baskerville' },
  { id: 'cartapecora', nome: 'Carta Pecora', descrizione: 'Sfondo quasi-bianco con mid miele chiaro — come carta da restauro', dark: false, primaryColor: '#806828', bgColor: '#faf6ee', bgAltColor: '#f0e8d4', bgCardColor: '#fffcf6', textColor: '#18120a', textMutedColor: '#806848', accentColor: '#985030', overlayColor: 'rgba(16,10,4,0.48)', fontDisplay: 'EB Garamond', fontBody: 'Cormorant Garamond' },
  { id: 'mare', nome: 'Mare Adriatico', descrizione: 'Azzurro adriatico chiaro — sfondo ceruleo, card bianco acqua, oro bronzo', dark: false, primaryColor: '#4a6870', bgColor: '#eef4f6', bgAltColor: '#ddeaee', bgCardColor: '#f6fbfc', textColor: '#0e1e24', textMutedColor: '#5a7880', accentColor: '#7a5820', overlayColor: 'rgba(8,18,24,0.46)', fontDisplay: 'Playfair Display', fontBody: 'EB Garamond' },
]

// ─── SEO ──────────────────────────────────────────────────────────────────────
export interface SeoData {
  metaTitle: string
  metaDesc: string
  ogTitle: string
  ogDesc: string
  ogImage: string
  keywords: string
  robots: string
  canonical: string
  schemaType: string
  schemaName: string
  schemaAddress: string
  schemaPhone: string
  schemaEmail: string
  schemaOpeningHours: string
  gtagId: string
}
export const DEFAULT_SEO: SeoData = {
  metaTitle: 'Emporio 46 · Arredi vintage e bijoux a Firenze',
  metaDesc: "Emporio 46 a Firenze: arredi vintage, lampade, specchi, complementi d'arredo e bijoux selezionati. Via Giampaolo Orsini 46/A. Aperto da martedì a sabato. Catalogo su WhatsApp.",
  ogTitle: 'Emporio 46 · Arredi vintage e bijoux a Firenze',
  ogDesc: 'Arredi vintage, lampade e bijoux scelti uno a uno. Non smettere mai di sognare.',
  ogImage: '',
  keywords: 'arredi vintage Firenze, mobili vintage Firenze, bijoux vintage Firenze, lampade vintage, modernariato Firenze, Emporio 46',
  robots: 'index, follow',
  canonical: typeof window !== 'undefined' ? window.location.origin : '',
  schemaType: 'FurnitureStore',
  schemaName: 'Emporio 46',
  schemaAddress: 'Via Giampaolo Orsini, 46/A, 50126 Firenze FI',
  schemaPhone: '+39 055 532 6258',
  schemaEmail: '',
  schemaOpeningHours: 'Tu-Sa 10:00-13:00, Tu-Sa 16:00-19:30',
  gtagId: '',
}

// ─── Context ──────────────────────────────────────────────────────────────────
type ContactTab = 'book' | 'request' | 'estimate'
export interface ContactPrefill { categoria?: string; descrizione?: string; note?: string }

// Translated dynamic settings (cached in localStorage)
export interface SettingsEn {
  aboutTitle?: string
  aboutLead?: string
  aboutQuote?: string
  slogan?: string
  leadText?: string
  footerTagline?: string
  bannerTesto?: string
  whyItems?: { title: string; desc: string }[]
  orari?: { lun: string; mar: string; mer: string; gio: string; ven: string; sab: string; dom: string }
}

interface AppContextType {
  lang: 'it' | 'en'; setLang: (l: 'it' | 'en') => void
  t: typeof translations['it']
  catalog: CatalogItem[]; setCatalog: (items: CatalogItem[]) => void
  reviews: Recensione[]; setReviews: (items: Recensione[]) => void
  isAdmin: boolean; setIsAdmin: (v: boolean) => void
  adminPassword: string
  contactTab: ContactTab; setContactTab: (tab: ContactTab, prefill?: ContactPrefill) => void
  contactPrefill: ContactPrefill
  settings: SiteSettings; updateSettings: (partial: Partial<SiteSettings>) => void
  seo: SeoData; updateSeo: (partial: Partial<SeoData>) => void
  settingsEn: SettingsEn; isTranslatingEn: boolean
  translateSettingsToEn: () => Promise<void>
  gistSyncStatus: GistSyncStatus
  gistSyncMessage: string
  gistSyncNow: () => Promise<void>      // salva subito (o riprova dopo un errore)
  dismissGistSync: () => void
}

export type GistSyncStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'warning' | 'error' | 'conflict' | 'auth' | 'local'

function load<T>(key: string, fallback: T): T {
  try { const r = localStorage.getItem(key); return r ? { ...fallback, ...JSON.parse(r) } : fallback }
  catch { return fallback }
}

// ─── GitHub Gist sync ─────────────────────────────────────────────────────────
// Legge le variabili d'ambiente Vite (impostate su Netlify come env vars)
const GIST_ID = import.meta.env.VITE_GIST_ID as string | undefined
const GIST_FILE = 'mnt_data.json'
export const SYNC_STATUS = { canRead: true }   // i contenuti arrivano dal server (Netlify Database/Blobs); il Gist è solo fallback

// Chiavi che NON devono mai finire nel Gist (leggibile pubblicamente)
const PRIVATE_KEYS = ['adminPassword'] as const
function omitPrivate<T extends Record<string, any>>(o: T): T {
  const out: any = { ...o }
  PRIVATE_KEYS.forEach(k => { delete out[k] })
  return out
}

// Unisce le impostazioni remote a quelle locali senza perdere le immagini base64 locali
// (il Gist le riceve svuotate: un merge ingenuo cancellerebbe quelle caricate dall'admin).
function mergeRemoteSettings(prev: SiteSettings, remote: Partial<SiteSettings>): SiteSettings {
  const r: any = omitPrivate(remote as any)
  const merged: any = { ...prev, ...r }
  const isPub = (v: any) => typeof v === 'string' && (v.startsWith('http') || v.startsWith('/media/'))
  const imgKeys = ['logoUrl', 'faviconUrl', 'heroImageUrl', 'aboutImageUrl', 'footerImageUrl', 'reviewsBgImageUrl', 'maintenanceLogoUrl', 'maintenanceBgImageUrl']
  imgKeys.forEach(k => {
    const local = (prev as any)[k]
    if (typeof local === 'string' && local.startsWith('data:') && !isPub(r[k])) merged[k] = local
  })
  // Accreditamenti: il Gist riceve i loghi base64 svuotati; qui si tengono quelli locali dell'admin (slot per slot)
  if (Array.isArray(prev.accreditations)) {
    const ra: any[] = Array.isArray(r.accreditations) ? r.accreditations : []
    merged.accreditations = Array.from({ length: 4 }, (_, i) => {
      const l: any = prev.accreditations[i] || {}, rm: any = ra[i] || {}
      const keepLocal = typeof l.logoUrl === 'string' && l.logoUrl.startsWith('data:') && !isPub(rm.logoUrl)
      return { name: rm.name ?? l.name ?? '', link: rm.link ?? l.link ?? '', logoUrl: keepLocal ? l.logoUrl : (rm.logoUrl ?? l.logoUrl ?? '') }
    })
  }
  if (prev.sectionBgs && r.sectionBgs) {
    const sb: any = { ...r.sectionBgs }
    Object.keys(prev.sectionBgs).forEach(slot => {
      const lv: any = (prev.sectionBgs as any)[slot]
      if (lv && typeof lv.url === 'string' && lv.url.startsWith('data:') && !isPub(sb[slot]?.url)) sb[slot] = { ...sb[slot], url: lv.url }
    })
    merged.sectionBgs = sb
  }
  return merged as SiteSettings
}

// Fetch del Gist (lettura pubblica, nessun token richiesto).
// cache:'no-cache' = rivalida sempre con ETag: le risposte 304 non consumano il limite di richieste GitHub.
type RemoteData = { settings?: Partial<SiteSettings>; catalog?: CatalogItem[]; reviews?: Recensione[]; seo?: Partial<SeoData>; settingsEn?: Record<string, unknown>; rev?: string }
function parseRemote(content: string): RemoteData | null {
  try {
    const parsed = JSON.parse(content)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    // Validazione minima della forma: scarta sezioni con tipo sbagliato invece di rompere il sito
    const out: RemoteData = {}
    if (parsed.settings && typeof parsed.settings === 'object' && !Array.isArray(parsed.settings)) out.settings = parsed.settings
    if (Array.isArray(parsed.catalog)) out.catalog = parsed.catalog
    if (Array.isArray(parsed.reviews)) out.reviews = parsed.reviews
    if (parsed.seo && typeof parsed.seo === 'object' && !Array.isArray(parsed.seo)) out.seo = parsed.seo
    if (parsed.settingsEn && typeof parsed.settingsEn === 'object') out.settingsEn = parsed.settingsEn
    if (typeof parsed.rev === 'string') out.rev = parsed.rev
    return out
  } catch { return null }
}

// 1) Server: Netlify Database → Netlify Blobs (→ Gist lato server se ancora vuoti)
async function fetchServerData(): Promise<RemoteData | null> {
  try {
    const res = await fetch('/.netlify/functions/site-data', { cache: 'no-cache' })
    if (!res.ok || !(res.headers.get('content-type') || '').includes('json')) return null
    return parseRemote(await res.text())
  } catch { return null }
}

// 2) Fallback diretto sul Gist (lettura pubblica) se il server non risponde (es. sviluppo locale)
async function fetchGist(): Promise<RemoteData | null> {
  if (!GIST_ID) return null
  try {
    const res = await fetch(`https://api.github.com/gists/${encodeURIComponent(GIST_ID)}`, {
      headers: { Accept: 'application/vnd.github+json' },
      cache: 'no-cache',
    })
    if (!res.ok) return null
    const data = await res.json()
    const file = data?.files?.[GIST_FILE]
    let content: string | undefined = file?.content
    if (file?.truncated && typeof file?.raw_url === 'string' && file.raw_url.startsWith('https://gist.githubusercontent.com/')) {
      content = await (await fetch(file.raw_url, { cache: 'no-cache' })).text()
    }
    return content ? parseRemote(content) : null
  } catch { return null }
}

const fetchRemote = async (): Promise<RemoteData | null> => (await fetchServerData()) ?? (await fetchGist())

// ─── Pubblicazione immagini locali (data URL) come file veri sul server ───────
function collectDataImages(v: any, out: Set<string>) {
  if (typeof v === 'string') { if (v.startsWith('data:image/') && v.length > 200) out.add(v); return }
  if (Array.isArray(v)) { v.forEach(x => collectDataImages(x, out)); return }
  if (v && typeof v === 'object') Object.values(v).forEach(x => collectDataImages(x, out))
}
function replaceDataImages<T>(v: T, map: Map<string, string>): T {
  if (typeof v === 'string') return (map.get(v) ?? v) as any
  if (Array.isArray(v)) return v.map(x => replaceDataImages(x, map)) as any
  if (v && typeof v === 'object') { const o: any = {}; for (const k of Object.keys(v as any)) o[k] = replaceDataImages((v as any)[k], map); return o }
  return v
}

// ─── Debounce helper ──────────────────────────────────────────────────────────
const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<'it' | 'en'>('it')
  const [settingsEn, setSettingsEn] = useState<SettingsEn>(() => {
    try { const s = localStorage.getItem('mnt_settings_en'); return s ? JSON.parse(s) : {} } catch { return {} }
  })
  const [isTranslatingEn, setIsTranslatingEn] = useState(false)
  const [catalog, setCatalogRaw] = useState<CatalogItem[]>(() => { try { const s = localStorage.getItem('mnt_catalog'); const p = s ? JSON.parse(s) : null; return Array.isArray(p) && p.length ? p : CATALOG_DEFAULT } catch { return CATALOG_DEFAULT } })
  const [reviews, setReviewsRaw] = useState<Recensione[]>(() => { try { const s = localStorage.getItem('mnt_reviews'); const p = s ? JSON.parse(s) : null; return Array.isArray(p) && p.length ? p : REVIEWS_DEFAULT } catch { return REVIEWS_DEFAULT } })
  const [isAdmin, setIsAdminRaw] = useState(false)
  const [contactTab, setContactTabRaw] = useState<ContactTab>('book')
  const [contactPrefill, setContactPrefill] = useState<ContactPrefill>({})
  const [settings, setSettings] = useState<SiteSettings>(() => {
    const s = load('mnt_settings', DEFAULT_SETTINGS)
    // Migrazione una tantum (v46): logo e sfondi nuovi sostituiscono i campi rimasti vuoti nei dati già salvati
    try { if (typeof s.footerDesign === 'string' && /err0r_hb/i.test(s.footerDesign)) s.footerDesign = s.footerDesign.replace(/err0r_hb/gi, 'Swan Boccella') } catch {}
    try {
      if (!localStorage.getItem('mnt_assets_v46')) {
        for (const k of ['logoUrl', 'faviconUrl'] as const) {
          if (!s[k]) (s as any)[k] = (DEFAULT_SETTINGS as any)[k]
        }
        // stessi sfondi di sezione: se non personalizzati, usa i nuovi file
        if (s.sectionBgs) for (const k of Object.keys(s.sectionBgs)) { const v = (s.sectionBgs as any)[k]; if (v && !v.url) delete (s.sectionBgs as any)[k] }
        localStorage.setItem('mnt_settings', JSON.stringify(s)); localStorage.setItem('mnt_assets_v46', '1')
      }
    } catch {}
    if (s.maintenanceMode && s.maintenanceEndDate) {
      const endTs = new Date(s.maintenanceEndDate).getTime()
      if (!isNaN(endTs) && Date.now() >= endTs) {
        const fixed = { ...s, maintenanceMode: false, maintenanceEndDate: '' }
        try { localStorage.setItem('mnt_settings', JSON.stringify(fixed)) } catch {}
        return fixed
      }
    }
    return s
  })
  const [seo, setSeo] = useState<SeoData>(() => load('mnt_seo', DEFAULT_SEO))

  // ─── Gist sync status (feedback visivo nell'admin) ────────────────────────
  const [gistSyncStatus, setGistSyncStatus] = useState<GistSyncStatus>('idle')
  const [gistSyncMessage, setGistSyncMessage] = useState('')
  const revRef = useRef<string | null>(null)          // revisione del Gist che abbiamo letto/scritto per ultima
  const chainRef = useRef<Promise<void>>(Promise.resolve()) // serializza i salvataggi

  // ─── Caricamento iniziale dal Gist (source of truth per tutti i visitatori) ─
  // Viene eseguito una volta al mount: sovrascrive localStorage se il Gist ha dati più aggiornati.
  useEffect(() => {
    fetchRemote().then(remote => {
      if (!remote) return
      revRef.current = remote.rev ?? null
      if (remote.settings) {
        setSettings(prev => {
          const merged = mergeRemoteSettings(prev, remote.settings as Partial<SiteSettings>)
          // Controlla scadenza maintenance anche sul dato remoto
          if (merged.maintenanceMode && merged.maintenanceEndDate) {
            const endTs = new Date(merged.maintenanceEndDate).getTime()
            if (!isNaN(endTs) && Date.now() >= endTs) {
              merged.maintenanceMode = false
              merged.maintenanceEndDate = ''
            }
          }
          try { localStorage.setItem('mnt_settings', JSON.stringify(merged)) } catch {}
          return merged
        })
      }
      if (remote.catalog && remote.catalog.length) {
        setCatalogRaw(remote.catalog)
        try { localStorage.setItem('mnt_catalog', JSON.stringify(remote.catalog)) } catch {}
      }
      if (remote.reviews && remote.reviews.length) {
        setReviewsRaw(remote.reviews)
        try { localStorage.setItem('mnt_reviews', JSON.stringify(remote.reviews)) } catch {}
      }
      if (remote.seo) {
        setSeo(prev => {
          const merged = { ...prev, ...remote.seo }
          try { localStorage.setItem('mnt_seo', JSON.stringify(merged)) } catch {}
          return merged
        })
      }
      if (remote.settingsEn && Object.keys(remote.settingsEn).length > 0) {
        const en = remote.settingsEn as SettingsEn
        setSettingsEn(en)
        try { localStorage.setItem('mnt_settings_en', JSON.stringify(en)) } catch {}
      }
    })
  }, []) // Eseguito solo al mount

  useEffect(() => {
    if (localStorage.getItem('mnt_admin') !== 'true') return
    // In produzione serve una sessione server valida; altrimenti si torna al login
    if (import.meta.env.DEV || getAdminToken()) setIsAdminRaw(true)
    else { try { localStorage.removeItem('mnt_admin') } catch { /* noop */ } }
  }, [])

  // ─── Funzione di sync verso il Gist ─────────────────────────────────────────
  // Legge SEMPRE i valori più recenti dai ref al momento dell'invio (mai copie vecchie)
  // e dice sempre all'admin com'è andata: successo, avviso o errore.
  const catalogRef = useRef(catalog)
  const reviewsRef = useRef(reviews)
  const seoRef = useRef(seo)
  const settingsRef = useRef(settings)
  const settingsEnRef = useRef(settingsEn)
  const dirtyRef = useRef(false)          // ci sono modifiche non ancora confermate dal Gist
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const countDataImages = (st: SiteSettings, cat: CatalogItem[]) => {
    let n = 0
    const keys = ['logoUrl', 'faviconUrl', 'heroImageUrl', 'aboutImageUrl', 'footerImageUrl', 'reviewsBgImageUrl', 'maintenanceLogoUrl', 'maintenanceBgImageUrl']
    keys.forEach(k => { const v = (st as any)[k]; if (typeof v === 'string' && v.startsWith('data:')) n++ })
    ;((st as any).accreditations || []).forEach((a: any) => { if (a?.logoUrl?.startsWith?.('data:')) n++ })
    Object.values((st as any).sectionBgs || {}).forEach((v: any) => { if (v?.url?.startsWith?.('data:')) n++ })
    cat.forEach(i => { if (i.img?.startsWith('data:')) n++; (i.images || []).forEach(src => { if (src.startsWith('data:')) n++ }) })
    return n
  }

  const doSync = useCallback(async () => {
    if (!dirtyRef.current) return
    if (!getAdminToken()) {
      if (import.meta.env.DEV) { dirtyRef.current = false; setGistSyncStatus('local'); setGistSyncMessage('Modalità sviluppo: salvato solo in locale (le Function Netlify non girano con npm run dev).'); return }
      setGistSyncStatus('auth'); setGistSyncMessage('Sessione scaduta: rifai il login. Le modifiche NON sono state salvate sul server.')
      return
    }

    // 1) Le immagini caricate dal dispositivo (data URL) diventano file pubblici sul server (/media/<id>)
    const pending = new Set<string>()
    collectDataImages(settingsRef.current, pending); collectDataImages(catalogRef.current, pending)
    if (pending.size > 0) {
      setGistSyncStatus('saving'); setGistSyncMessage(`Pubblico ${pending.size} immagin${pending.size > 1 ? 'i' : 'e'} sul server…`)
      const map = new Map<string, string>()
      for (const d of pending) { const u = await publishDataUrl(d); if (u) map.set(d, u) }
      if (map.size > 0) {
        const ns = replaceDataImages(settingsRef.current, map), nc = replaceDataImages(catalogRef.current, map)
        settingsRef.current = ns; catalogRef.current = nc
        setSettings(ns); setCatalogRaw(nc)
        try { localStorage.setItem('mnt_settings', JSON.stringify(ns)) } catch {}
        try { localStorage.setItem('mnt_catalog', JSON.stringify(nc)) } catch {}
      }
    }
    const newSettings = settingsRef.current, newCatalog = catalogRef.current
    const lost = countDataImages(newSettings, newCatalog)
    const safeSettings = omitPrivate(stripDataImages(newSettings))
    const safeCatalog = newCatalog.map(item => {
      const safeItem = { ...item }
      if (safeItem.img?.startsWith('data:')) safeItem.img = ''
      if (safeItem.images?.length) safeItem.images = safeItem.images.map(src => src.startsWith('data:') ? '' : src).filter(Boolean)
      return safeItem
    })

    dirtyRef.current = false                 // da qui in poi nuove modifiche lo rimettono a true
    setGistSyncStatus('saving'); setGistSyncMessage('')
    const r = await adminSave({
      settings: safeSettings,
      catalog: safeCatalog,
      reviews: reviewsRef.current,
      seo: seoRef.current,
      settingsEn: settingsEnRef.current ?? {},
    }, revRef.current)

    if (r.ok) {
      revRef.current = r.rev
      if (dirtyRef.current) { setGistSyncStatus('pending'); return }   // altre modifiche in coda: partirà un nuovo salvataggio
      if (lost > 0) {
        setGistSyncStatus('warning')
        setGistSyncMessage(`Testi e impostazioni salvati, ma ${lost} immagine${lost > 1 ? 'i' : ''} caricat${lost > 1 ? 'e' : 'a'} dal dispositivo ${lost > 1 ? 'non sono state pubblicate' : 'non è stata pubblicata'}: non sono riuscite a salire sul server (connessione o sessione): riprova con «Salva ora» dopo aver rifatto il login.`)
      } else {
        setGistSyncStatus('saved'); setGistSyncMessage(`Modifiche salvate (${(r.stores || []).map(n => n === 'database' ? 'Database' : n === 'blobs' ? 'Blobs' : 'Gist').join(' + ')}): ora le vedono tutti i visitatori.`)
        setTimeout(() => setGistSyncStatus(s => (s === 'saved' ? 'idle' : s)), 4000)
      }
    } else {
      dirtyRef.current = true                // non confermato: resta da salvare (si può riprovare)
      setGistSyncStatus(r.kind === 'auth' ? 'auth' : r.kind === 'conflict' ? 'conflict' : 'error')
      setGistSyncMessage(`${r.message} Le modifiche NON sono ancora sul server.`)
      if (r.kind === 'auth') clearAdminToken()
    }
  }, [])

  // Salvataggi in coda, uno alla volta: evita falsi conflitti tra due salvataggi ravvicinati
  const runSync = useCallback(() => {
    chainRef.current = chainRef.current.then(() => doSync()).catch(() => { /* già gestito in doSync */ })
    return chainRef.current
  }, [doSync])

  // Segna le modifiche e salva dopo 1.5 s di quiete
  const scheduleSync = useCallback(() => {
    dirtyRef.current = true
    setGistSyncStatus(s => (s === 'saving' ? s : 'pending'))
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { timerRef.current = null; runSync() }, 1500)
  }, [runSync])

  const gistSyncNow = useCallback(async () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    dirtyRef.current = true
    await runSync()
  }, [runSync])
  const dismissGistSync = useCallback(() => { setGistSyncStatus('idle'); setGistSyncMessage('') }, [])

  // Avvisa se si chiude la pagina con modifiche non ancora sul server
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirtyRef.current && getAdminToken()) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [])

  // I ref si aggiornano SUBITO nei setter (non dopo il render): il salvataggio vede sempre l'ultimo dato
  useEffect(() => { catalogRef.current = catalog }, [catalog])
  useEffect(() => { reviewsRef.current = reviews }, [reviews])
  useEffect(() => { seoRef.current = seo }, [seo])
  useEffect(() => { settingsRef.current = settings }, [settings])
  useEffect(() => { settingsEnRef.current = settingsEn }, [settingsEn])

  const updateSettings = useCallback((p: Partial<SiteSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...p }
      try { localStorage.setItem('mnt_settings', JSON.stringify(next)) }
      catch (e) {
        console.warn('localStorage quota exceeded — stripping large images from settings', e)
        const stripped = stripDataImages(next)
        try { localStorage.setItem('mnt_settings', JSON.stringify(stripped)) } catch {}
        window.dispatchEvent(new CustomEvent('mnt-storage-full'))
      }
      const textFields = ['aboutLead','aboutTitle','aboutQuote','slogan','leadText','footerTagline','bannerTesto','whyItems','orari']
      if (textFields.some(k => k in p)) {
        settingsEnRef.current = {}
        setSettingsEn({})
        try { localStorage.removeItem('mnt_settings_en') } catch {}
      }
      settingsRef.current = next
      return next
    })
    scheduleSync()
  }, [scheduleSync])

  const updateSeo = useCallback((p: Partial<SeoData>) => {
    setSeo(prev => {
      const next = { ...prev, ...p }
      try { localStorage.setItem('mnt_seo', JSON.stringify(next)) } catch {}
      seoRef.current = next
      return next
    })
    scheduleSync()
  }, [scheduleSync])

  const setCatalog = (items: CatalogItem[]) => {
    setCatalogRaw(items)
    try { localStorage.setItem('mnt_catalog', JSON.stringify(items)) } catch (e) {
      console.warn('localStorage quota exceeded for catalog', e)
      window.dispatchEvent(new CustomEvent('mnt-storage-full'))
    }
    catalogRef.current = items
    scheduleSync()
  }

  const setReviews = (items: Recensione[]) => {
    setReviewsRaw(items)
    try { localStorage.setItem('mnt_reviews', JSON.stringify(items)) } catch {}
    reviewsRef.current = items
    scheduleSync()
  }

  const setIsAdmin = (v: boolean) => { setIsAdminRaw(v); localStorage.setItem('mnt_admin', String(v)); if (!v) clearAdminToken() }
  const setContactTab = (tab: ContactTab, prefill?: ContactPrefill) => { setContactTabRaw(tab); setContactPrefill(prefill ?? {}) }

  const translateSettingsToEn = useCallback(async () => {
    setIsTranslatingEn(true)
    try {
      const s = settings
      const payload = JSON.stringify({
        siteName: s.siteName,
        slogan: s.slogan,
        leadText: s.leadText,
        aboutTitle: s.aboutTitle,
        aboutLead: s.aboutLead,
        aboutQuote: s.aboutQuote,
        footerTagline: s.footerTagline,
        bannerTesto: s.bannerTesto,
        whyItems: s.whyItems?.map(w => ({ title: w.title, desc: w.desc })),
        orari: s.orari,
      })
      const prompt = `Sei un traduttore specializzato per siti di negozi italiani di arredi vintage e bijoux. Traduci in inglese elegante i seguenti testi.\nRispondi SOLO con un JSON valido, senza markdown, con la stessa struttura dell'input ma con valori in inglese.\nPer "orari": traduci i valori (es. "Solo su appuntamento" → "By appointment only", "Chiuso" → "Closed").\nMantieni i nomi propri (Emporio 46, Firenze, Via Giampaolo Orsini) invariati.\nTono: raffinato, adatto a collezionisti anglofoni.\n\n${payload}`
      const text = await groqText(prompt, 2000)
      const cleaned = (text.match(/\{[\s\S]*\}/)?.[0] ?? text).replace(/```json|```/g, '').trim()
      const parsed: SettingsEn = JSON.parse(cleaned)
      setSettingsEn(parsed)
      try { localStorage.setItem('mnt_settings_en', JSON.stringify(parsed)) } catch {}
      // Sincronizza anche settingsEn sul server così tutti i visitatori vedono la lingua EN
      settingsEnRef.current = parsed
      scheduleSync()
    } catch (e) {
      console.warn('translateSettingsToEn error', e)
    }
    setIsTranslatingEn(false)
  }, [settings, scheduleSync])

  return (
    <AppContext.Provider value={{ lang, setLang, t: translations[lang], catalog, setCatalog, reviews, setReviews, isAdmin, setIsAdmin, adminPassword: settings.adminPassword, contactTab, setContactTab, contactPrefill, settings, updateSettings, seo, updateSeo, settingsEn, isTranslatingEn, translateSettingsToEn, gistSyncStatus, gistSyncMessage, gistSyncNow, dismissGistSync }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => { const c = useContext(AppContext); if (!c) throw new Error('useApp outside AppProvider'); return c }
