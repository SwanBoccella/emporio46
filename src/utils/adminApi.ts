// ─── Autenticazione admin + salvataggio (Netlify Database + Blobs, copia Gist) tramite Netlify Function ────────
// Il token GitHub e la password admin vivono SOLO sul server (variabili Netlify):
// nel browser resta soltanto un token di sessione firmato che scade dopo 12 ore.
const ENDPOINT = '/.netlify/functions/admin-api'
const TK = 'mnt_admin_token'

function tokenExp(t: string): number {
  try {
    const p = t.split('.')[0].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(p)).exp as number
  } catch { return 0 }
}

export function getAdminToken(): string | null {
  try {
    const t = localStorage.getItem(TK)
    if (!t) return null
    if (tokenExp(t) < Date.now() + 60_000) { localStorage.removeItem(TK); return null }
    return t
  } catch { return null }
}
export function clearAdminToken() { try { localStorage.removeItem(TK) } catch { /* noop */ } }

export type LoginResult =
  | { ok: true }
  | { ok: false; reason: 'wrong' | 'unavailable' | 'config' | 'error'; message: string }

export async function adminLogin(password: string): Promise<LoginResult> {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', password }),
    })
    if (res.status === 404 || res.status === 405) return { ok: false, reason: 'unavailable', message: 'Servizio di accesso non disponibile (Netlify Function non pubblicata).' }
    let j: any = null
    try { j = await res.json() } catch { return { ok: false, reason: 'unavailable', message: 'Servizio di accesso non disponibile.' } }
    if (res.ok && j?.token) { try { localStorage.setItem(TK, j.token) } catch { /* noop */ } return { ok: true } }
    if (res.status === 401) return { ok: false, reason: 'wrong', message: 'Password non corretta' }
    if (j?.error === 'not_configured') return { ok: false, reason: 'config', message: j.message || 'Server non configurato (variabili Netlify mancanti).' }
    return { ok: false, reason: 'error', message: 'Errore di accesso, riprova.' }
  } catch {
    return { ok: false, reason: 'unavailable', message: 'Impossibile contattare il server.' }
  }
}

export type SaveResult =
  | { ok: true; rev: string; stores?: string[]; warnings?: { store: string; error: string }[] }
  | { ok: false; kind: 'auth' | 'conflict' | 'error'; message: string }

export async function adminSave(data: object, baseRev: string | null): Promise<SaveResult> {
  const token = getAdminToken()
  if (!token) return { ok: false, kind: 'auth', message: 'Sessione scaduta: rifai il login.' }
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'save', data, baseRev }),
    })
    let j: any = null
    try { j = await res.json() } catch { /* noop */ }
    if (res.ok && j?.rev) return { ok: true, rev: j.rev, stores: j.stores, warnings: j.warnings }
    if (res.status === 401) { clearAdminToken(); return { ok: false, kind: 'auth', message: 'Sessione scaduta: rifai il login.' } }
    if (res.status === 409) return { ok: false, kind: 'conflict', message: 'Dati modificati da un altro dispositivo: ricarica la pagina prima di salvare.' }
    return { ok: false, kind: 'error', message: j?.message || `Salvataggio non riuscito (${res.status}).` }
  } catch {
    return { ok: false, kind: 'error', message: 'Server non raggiungibile.' }
  }
}

export type ChangePwResult = { ok: true } | { ok: false; message: string }

// Cambia la password admin sul server. Le altre sessioni (altri dispositivi) vengono disconnesse.
export async function changeAdminPassword(current: string, next: string): Promise<ChangePwResult> {
  const token = getAdminToken()
  if (!token) return { ok: false, message: 'Sessione scaduta: rifai il login.' }
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'change_password', current, next }),
    })
    if (res.status === 404 || res.status === 405) return { ok: false, message: 'Servizio non disponibile (Netlify Function non pubblicata, o modalità sviluppo).' }
    let j: any = null
    try { j = await res.json() } catch { /* noop */ }
    if (res.ok && j?.token) { try { localStorage.setItem(TK, j.token) } catch { /* noop */ } return { ok: true } }
    if (res.status === 401) { clearAdminToken(); return { ok: false, message: 'Sessione scaduta: rifai il login.' } }
    return { ok: false, message: j?.message || `Cambio password non riuscito (${res.status}).` }
  } catch {
    return { ok: false, message: 'Server non raggiungibile.' }
  }
}

// ─── Upload file (immagini / modello 3D) su Netlify Blobs, a pezzi ───────────
const CHUNK = 3 * 1024 * 1024   // 3 MB grezzi → ~4 MB in base64, sotto il limite di 6 MB delle Function

const newAssetId = () => {
  const a = new Uint8Array(16); crypto.getRandomValues(a)
  return Array.from(a, b => b.toString(16).padStart(2, '0')).join('')
}
const blobToBase64 = (b: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader()
  r.onload = () => res(String(r.result).split(',')[1] || '')
  r.onerror = () => rej(r.error)
  r.readAsDataURL(b)
})

export type AssetResult = { ok: true; id: string; parts: number } | { ok: false; message: string }

export async function adminUploadAsset(file: Blob, mime: string, name: string, onProgress?: (done: number, total: number) => void): Promise<AssetResult> {
  const token = getAdminToken()
  if (!token) return { ok: false, message: 'Sessione scaduta o modalità sviluppo: file non pubblicabile.' }
  const id = newAssetId()
  const total = Math.max(1, Math.ceil(file.size / CHUNK))
  for (let i = 0; i < total; i++) {
    const data = await blobToBase64(file.slice(i * CHUNK, (i + 1) * CHUNK))
    let ok = false, lastMsg = 'Upload non riuscito.'
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {      // 3 tentativi per pezzo (rete mobile)
      try {
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: 'asset_put', id, index: i, total, mime, name, data }),
        })
        let j: any = null
        try { j = await res.json() } catch { /* noop */ }
        if (res.ok && j?.ok) ok = true
        else {
          lastMsg = j?.message || `Upload non riuscito (${res.status}).`
          if (res.status === 401) { clearAdminToken(); return { ok: false, message: 'Sessione scaduta: rifai il login.' } }
          if (res.status === 400 || res.status === 413) return { ok: false, message: lastMsg }   // inutile riprovare
        }
      } catch { lastMsg = 'Server non raggiungibile.' }
    }
    if (!ok) return { ok: false, message: lastMsg }
    onProgress?.(i + 1, total)
  }
  return { ok: true, id, parts: total }
}

// Immagine (data URL) → file pubblico /media/<id>. Restituisce null se l'upload non riesce.
const dataUrlCache = new Map<string, Promise<string | null>>()
export function publishDataUrl(dataUrl: string): Promise<string | null> {
  const hit = dataUrlCache.get(dataUrl)
  if (hit) return hit
  const p = (async () => {
    try {
      const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,/.exec(dataUrl)
      if (!m) return null
      const blob = await (await fetch(dataUrl)).blob()
      const r = await adminUploadAsset(blob, m[1], 'img')
      return r.ok ? `/media/${r.id}` : null
    } catch { return null }
  })()
  dataUrlCache.set(dataUrl, p)
  p.then(v => { if (!v) dataUrlCache.delete(dataUrl) })      // un fallimento si può riprovare
  return p
}
