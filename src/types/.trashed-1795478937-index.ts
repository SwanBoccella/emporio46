export interface CatalogItem {
  id: number
  nome: string
  nomeEn?: string          // English name (optional)
  era: string
  categoria: string
  descrizione: string
  descrizioneEn?: string   // English description (optional)
  prezzo: string
  prezzoScontato?: string   // prezzo dopo sconto (calcolato automaticamente o manuale)
  percentualeSconto?: number // % sconto visualizzata sul badge (es. 20)
  scontoId?: number         // ID dello sconto globale applicato a questo articolo
  stato: 'disponibile' | 'in_vetrina' | 'trattativa' | 'venduto'
  badge: string
  img?: string
  images?: string[]
  visibile: boolean
}

export interface Recensione {
  id: number
  autore: string
  citta: string
  stelle: number
  testo: string
  testoEn?: string         // English review text (optional)
  visibile: boolean
  data: string
  inEvidenza: boolean
}

export interface SitoData {
  nome: string
  slogan: string
  descrizione: string
  email: string
  telefono: string
  indirizzo: string
  citta: string
  logo: string
  ogImage: string
  instagram: string
  instagramHandle: string
  mapsEmbed: string
  mapsLink: string
}

export interface Translation {
  nav: {
    home: string
    catalog: string
    about: string
    reviews: string
    location: string
    book: string
  }
  hero: {
    label: string
    title1: string
    title2: string
    lead: string
    cta1: string
    cta2: string
    scroll: string
  }
  about: {
    label: string
    title: string
    lead: string
    quote: string
    cta: string
  }
  catalog: {
    label: string
    title: string
    all: string
    request: string
    details: string
    more: string
    moreText: string
    empty: string
    price: string
    availability: string
    contactForInfo: string
    searchPlaceholder: string
    noResults: string
    pieces: string
    closePanel: string
    panelFooter: string
    viewAll: string
    titleWord: string
    panelLabel: string
    panelTitle: string
    objects: string
    reviewDot: string
    emailBookType: string
    emailRequestType: string
    emailEstimateType: string
    discount: string
    freeShipping: string
    freeShippingShort: string
    until: string
    prefillNote: string
    bookPrefill: string
    locationBookPrefill: string
  }
  why: {
    label: string
    title: string
    items: { title: string; desc: string }[]
  }
  reviews: {
    label: string
    title: string
    lead: string
  }
  contact: {
    label: string
    title: string
    lead: string
    tabBook: string
    tabRequest: string
    tabEstimate: string
    send: string
    whatsapp: string
    name: string
    surname: string
    email: string
    phone: string
    day: string
    time: string
    notes: string
    category: string
    description: string
    noteBook: string
    noteRequest: string
    noteEstimate: string
    success: string
    error: string
    required: string
    selectDay: string
    selectTime: string
    selectCat: string
  }
  location: {
    label: string
    title: string
    address: string
    note: string
    openMaps: string
    book: string
  }
  footer: {
    tagline: string
    explore: string
    services: string
    contacts: string
    rights: string
    design: string
    services_items: string[]
  }
  modal: {
    info: string
    whatsapp: string
    close: string
  }
  hours: {
    title: string
    detail1: string
    detail2: string
    closed: string
    badge: string
  }
}
