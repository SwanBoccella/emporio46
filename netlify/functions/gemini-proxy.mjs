// Netlify Function — proxy verso Google Gemini: la chiave resta sul server, mai nel sito.
// Variabili d'ambiente (Netlify → Site configuration → Environment variables, SENZA prefisso VITE_):
//   GEMINI_API_KEY  chiave Gemini (da aistudio.google.com/apikey) — segnala come "secret"
//   ADMIN_PASSWORD, GIST_TOKEN  già usate da admin-api (firmano la sessione admin)
// Solo chi ha fatto login admin (token firmato, 12 h) può usarla: i visitatori no.
// POST { model, request } → generateContent · GET → diagnostica (chiave vista dal server + modelli disponibili)
import { readStored, checkToken } from '../lib/auth.mjs'

const BASE = 'https://generativelanguage.googleapis.com/v1beta'
const MAX_BYTES = 6_000_000
const MODEL_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{1,80}$/

const err = (status, code, message) => new Response(JSON.stringify({ error: { code, message } }), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
})

export default async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') return err(405, 'method_not_allowed', 'Metodo non consentito.')
  const site = req.headers.get('sec-fetch-site')
  if (site && site !== 'same-origin' && site !== 'none') return err(403, 'forbidden', 'Richiesta non consentita.')

  const stored = await readStored()
  if (!stored && !process.env.ADMIN_PASSWORD) return err(500, 'not_configured', 'Il server non vede né ADMIN_PASSWORD né una password salvata dal pannello. Controlla le variabili Netlify e rifai il deploy.')

  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!checkToken(bearer, stored)) return err(401, 'session_expired', 'Sessione admin non valida o scaduta: esci e rientra dal pannello.')

  const readEnv = (n) => {
    let v = ''
    try { v = process.env[n] || (typeof Netlify !== 'undefined' ? Netlify.env.get(n) : '') || '' } catch { /* noop */ }
    return String(v).trim().replace(/^["']+|["']+$/g, '').trim()
  }
  const KEY_NAMES = ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GEMINI_KEY', 'GOOGLE_GENAI_API_KEY']
  const keyName = KEY_NAMES.find(n => readEnv(n)) || ''
  const KEY = keyName ? readEnv(keyName) : ''
  if (!KEY) {
    const similar = Object.keys(process.env).filter(k => /gemini|google|genai/i.test(k))
    return err(500, 'not_configured',
      'Il server non vede GEMINI_API_KEY. ' +
      `Variabili simili visibili alla Function: ${similar.length ? similar.join(', ') : 'nessuna'}. ` +
      'Controlla il nome esatto (maiuscole comprese), che l\'ambito includa "Functions" e rifai il deploy.')
  }

  if (req.method === 'GET') {
    let geminiStatus = 0, models = [], detail = ''
    try {
      const r = await fetch(`${BASE}/models?pageSize=200`, { headers: { 'x-goog-api-key': KEY } })
      geminiStatus = r.status
      if (r.ok) {
        const j = await r.json()
        models = (j.models || [])
          .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
          .map(m => String(m.name || '').replace(/^models\//, '')).filter(Boolean)
      } else detail = (await r.text()).slice(0, 200)
    } catch { detail = 'Gemini non raggiungibile dal server.' }
    return new Response(JSON.stringify({
      ok: geminiStatus === 200, keyName, keyHint: `${KEY.slice(0, 4)}…${KEY.slice(-4)}`, keyLength: KEY.length,
      geminiStatus, detail, models,
    }), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
  }

  const raw = await req.text()
  if (raw.length > MAX_BYTES) return err(413, 'too_large', 'Richiesta troppo grande.')
  let body
  try { body = JSON.parse(raw) } catch { return err(400, 'bad_json', 'JSON non valido.') }
  if (!body || typeof body.model !== 'string' || !MODEL_RE.test(body.model) || !body.request || !Array.isArray(body.request.contents)) {
    return err(400, 'bad_request', 'Richiesta non valida.')
  }

  try {
    const res = await fetch(`${BASE}/models/${encodeURIComponent(body.model)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify(body.request),
    })
    const headers = { 'content-type': 'application/json', 'cache-control': 'no-store' }
    const ra = res.headers.get('retry-after'); if (ra) headers['retry-after'] = ra
    return new Response(await res.text(), { status: res.status, headers })
  } catch {
    return err(502, 'upstream', 'Gemini non raggiungibile dal server.')
  }
}
