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

  // La password admin può stare in ADMIN_PASSWORD oppure (se cambiata dal pannello) nell'archivio privato: basta una delle due.
  const stored = await readStored()
  if (!stored && !process.env.ADMIN_PASSWORD) return err(500, 'not_configured', 'Il server non vede né ADMIN_PASSWORD né una password salvata dal pannello. Controlla le variabili Netlify e rifai il deploy.')

  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!checkToken(bearer, stored)) return err(401, 'session_expired', 'Sessione admin non valida o scaduta: esci e rientra dal pannello.')

  // Chiave Groq: accetta anche qualche nome alternativo e toglie spazi/virgolette incollati per sbaglio.
  // Il controllo sta DOPO il login admin, così il messaggio diagnostico (che elenca solo i NOMI delle variabili, mai i valori)
  // lo vede solo l'admin.
  const readEnv = (n) => {
    let v = ''
    try { v = process.env[n] || (typeof Netlify !== 'undefined' ? Netlify.env.get(n) : '') || '' } catch { /* noop */ }
    return String(v).trim().replace(/^["']+|["']+$/g, '').trim()
  }
  const KEY = ['GROQ_API_KEY', 'GROQ_DEV_KEY', 'GROQ_KEY', 'GROQ_API_TOKEN', 'GROQ_TOKEN'].map(readEnv).find(Boolean) || ''
  if (!KEY) {
    const similar = Object.keys(process.env).filter(k => /groq|grok|gsk/i.test(k))
    const adminVisible = !!process.env.ADMIN_PASSWORD
    return err(500, 'not_configured',
      'Il server non vede GROQ_API_KEY. ' +
      `Variabili simili visibili alla Function: ${similar.length ? similar.join(', ') : 'nessuna'}. ` +
      `ADMIN_PASSWORD visibile: ${adminVisible ? 'sì' : 'no'}. ` +
      (adminVisible
        ? 'Le variabili con ambito Functions arrivano, quindi manca proprio GROQ_API_KEY (o il nome è diverso): controlla il nome esatto, maiuscole comprese.'
        : 'Nessuna variabile segreta arriva alla Function: su Netlify controlla che l\'ambito includa "Functions" (e il contesto di deploy "Production"), poi fai un nuovo deploy.'))
  }

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
