// ─── Autenticazione admin + salvataggio Gist tramite Netlify Function ────────
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
  | { ok: true; rev: string }
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
    if (res.ok && j?.rev) return { ok: true, rev: j.rev }
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
