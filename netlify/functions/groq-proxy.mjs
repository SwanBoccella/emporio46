// Netlify Function — proxy verso Groq: la chiave resta sul server, mai nel sito.
// Variabili d'ambiente (Netlify → Site configuration → Environment variables, SENZA prefisso VITE_):
//   GROQ_API_KEY    chiave Groq (gsk_…)  — segnala come "secret"
//   ADMIN_PASSWORD, GIST_TOKEN  già usate da admin-api (firmano la sessione admin)
// Solo chi ha fatto login admin (token firmato, 12 h) può usarla: i visitatori no.
import { readStored, checkToken } from '../lib/auth.mjs'

const GROQ = 'https://api.groq.com/openai/v1/chat/completions'
const MAX_BYTES = 6_000_000 // foto ridotte a 1024px: bastano pochi MB

const err = (status, code, message) => new Response(JSON.stringify({ error: { code, message } }), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
})
export default async (req) => {
  if (req.method !== 'POST') return err(405, 'method_not_allowed', 'Metodo non consentito.')
  const site = req.headers.get('sec-fetch-site')
  if (site && site !== 'same-origin' && site !== 'none') return err(403, 'forbidden', 'Richiesta non consentita.')

  const KEY = process.env.GROQ_API_KEY
  if (!KEY || !process.env.ADMIN_PASSWORD) return err(500, 'not_configured', 'Mancano GROQ_API_KEY o ADMIN_PASSWORD nelle variabili Netlify.')

  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!checkToken(bearer, await readStored())) return err(401, 'session_expired', 'Sessione admin non valida o scaduta.')

  const raw = await req.text()
  if (raw.length > MAX_BYTES) return err(413, 'too_large', 'Richiesta troppo grande.')
  let body
  try { body = JSON.parse(raw) } catch { return err(400, 'bad_json', 'JSON non valido.') }
  if (!body || typeof body.model !== 'string' || !Array.isArray(body.messages)) return err(400, 'bad_request', 'Richiesta non valida.')
  delete body.stream // risposta intera, niente streaming

  try {
    const res = await fetch(GROQ, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
      body: JSON.stringify(body),
    })
    const headers = { 'content-type': 'application/json', 'cache-control': 'no-store' }
    const ra = res.headers.get('retry-after'); if (ra) headers['retry-after'] = ra
    return new Response(await res.text(), { status: res.status, headers })
  } catch {
    return err(502, 'upstream', 'Groq non raggiungibile dal server.')
  }
}
