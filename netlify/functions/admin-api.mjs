// Netlify Function — login admin + scrittura sicura del Gist.
// Variabili d'ambiente (Netlify → Site configuration → Environment variables, SENZA prefisso VITE_):
//   ADMIN_PASSWORD  password del pannello (scegline una lunga, 16+ caratteri)
//   GIST_TOKEN      token GitHub classic con SOLO lo scope "gist"
//   GIST_ID         (opzionale se hai già VITE_GIST_ID) id del Gist
import { randomBytes } from 'node:crypto'
import { readStored, verifyPassword, saveNewPassword, makeToken, checkToken, MIN_PASSWORD } from '../lib/auth.mjs'

const FILE = 'mnt_data.json'
const MAX_CHARS = 900_000          // il Gist tronca i file > 1 MB
const SESSION_MS = 12 * 60 * 60 * 1000
const ALLOWED_KEYS = ['settings', 'catalog', 'reviews', 'seo', 'settingsEn']

const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
})
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  // Blocca richieste cross-site (CSRF / uso da altri siti)
  const site = req.headers.get('sec-fetch-site')
  if (site && site !== 'same-origin' && site !== 'none') return json(403, { error: 'forbidden' })

  const ADMIN = process.env.ADMIN_PASSWORD
  const TOKEN = process.env.GIST_TOKEN
  const GID = process.env.GIST_ID || process.env.VITE_GIST_ID
  if (!ADMIN || !TOKEN || !GID) {
    return json(500, { error: 'not_configured', message: 'Mancano ADMIN_PASSWORD, GIST_TOKEN o GIST_ID nelle variabili Netlify.' })
  }

  const raw = await req.text()
  if (raw.length > MAX_CHARS + 100_000) return json(413, { error: 'too_large', message: 'Dati troppo grandi.' })
  let body
  try { body = JSON.parse(raw) } catch { return json(400, { error: 'bad_json' }) }

  const stored = await readStored()

  // ── LOGIN ──
  if (body.action === 'login') {
    const ok = await verifyPassword(body.password, stored)
    if (!ok) { await sleep(1200); return json(401, { error: 'wrong_password' }) }
    return json(200, { token: makeToken(stored) })
  }

  // ── CAMBIO PASSWORD ──
  if (body.action === 'change_password') {
    const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
    if (!checkToken(bearer, stored)) return json(401, { error: 'unauthorized' })
    if (!(await verifyPassword(body.current, stored))) { await sleep(1200); return json(403, { error: 'wrong_current', message: 'La password attuale non è corretta.' }) }
    const next = body.next
    if (typeof next !== 'string' || next.length < MIN_PASSWORD || next.length > 200) return json(400, { error: 'weak_password', message: `La nuova password deve avere almeno ${MIN_PASSWORD} caratteri.` })
    if (next === body.current) return json(400, { error: 'same_password', message: 'La nuova password deve essere diversa da quella attuale.' })
    try {
      const rec = await saveNewPassword(next)
      return json(200, { ok: true, token: makeToken(rec) })     // nuova sessione; le altre decadono
    } catch (e) {
      return json(500, { error: 'store_failed', message: e?.message === 'store_unavailable'
        ? 'Archivio sicuro non disponibile (@netlify/blobs). Fai un nuovo deploy; in alternativa cambia ADMIN_PASSWORD su Netlify.'
        : 'Impossibile salvare la nuova password. La vecchia resta valida.' })
    }
  }

  // ── SALVATAGGIO ──
  if (body.action === 'save') {
    const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
    if (!checkToken(bearer, stored)) return json(401, { error: 'unauthorized' })

    const d = body.data
    if (!d || typeof d !== 'object' || Array.isArray(d)) return json(400, { error: 'bad_data' })
    const clean = {}
    for (const k of ALLOWED_KEYS) if (d[k] !== undefined) clean[k] = d[k]
    if (!clean.settings || typeof clean.settings !== 'object' || Array.isArray(clean.settings)) return json(400, { error: 'bad_settings' })
    if (!Array.isArray(clean.catalog) || !Array.isArray(clean.reviews)) return json(400, { error: 'bad_lists' })
    if (!clean.seo || typeof clean.seo !== 'object') return json(400, { error: 'bad_seo' })
    delete clean.settings.adminPassword // mai pubblicare credenziali

    const gh = (init = {}) => fetch(`https://api.github.com/gists/${encodeURIComponent(GID)}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'emporio46-admin',
        'Content-Type': 'application/json',
      },
    })

    // Controllo di concorrenza: se un altro dispositivo ha salvato nel frattempo, non sovrascrivere
    let remoteRev = null
    try {
      const cur = await gh()
      if (!cur.ok) return json(502, { error: 'gist_read', message: `Lettura Gist non riuscita (${cur.status}). Controlla GIST_ID e GIST_TOKEN.` })
      const file = (await cur.json())?.files?.[FILE]
      let content = file?.content
      if (file?.truncated && file?.raw_url) content = await (await fetch(file.raw_url)).text()
      if (content) { try { remoteRev = JSON.parse(content)?.rev ?? null } catch { /* file non valido: lo sovrascriviamo */ } }
    } catch { return json(502, { error: 'gist_read', message: 'GitHub non raggiungibile.' }) }

    if (remoteRev && body.baseRev !== remoteRev) return json(409, { error: 'conflict', rev: remoteRev })

    const rev = `${Date.now()}-${randomBytes(4).toString('hex')}`
    const content = JSON.stringify({ ...clean, rev, updatedAt: new Date().toISOString() })
    if (content.length > MAX_CHARS) return json(413, { error: 'too_large', message: 'Il contenuto supera il limite del Gist (~900 KB): riduci immagini/testi.' })

    try {
      const res = await gh({ method: 'PATCH', body: JSON.stringify({ files: { [FILE]: { content } } }) })
      if (!res.ok) {
        const hint = res.status === 401 ? 'Token GitHub non valido o scaduto.' : res.status === 403 || res.status === 404 ? 'Controlla GIST_ID e che il token abbia lo scope "gist" e sia del proprietario del Gist.' : ''
        return json(502, { error: 'gist_write', message: `Scrittura Gist non riuscita (${res.status}). ${hint}`.trim() })
      }
      // Verifica che il Gist contenga davvero la nuova revisione (GitHub restituisce il file scritto)
      let written = null
      try { written = (await res.json())?.files?.[FILE] } catch { /* noop */ }
      if (!written) return json(502, { error: 'gist_verify', message: `Il Gist non contiene il file ${FILE}: la scrittura non è confermata.` })
      if (!written.truncated && typeof written.content === 'string' && !written.content.includes(rev)) {
        return json(502, { error: 'gist_verify', message: 'GitHub non ha confermato la nuova versione del Gist. Riprova.' })
      }
    } catch { return json(502, { error: 'gist_write', message: 'GitHub non raggiungibile.' }) }
    return json(200, { ok: true, rev })
  }

  return json(400, { error: 'unknown_action' })
}
