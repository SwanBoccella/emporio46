// ─── Client Gemini (Google) — unica IA della perizia e dei testi del catalogo ─────────────
// Usato da: Perizia AI (perizia.ts), scheda e descrizioni degli articoli del catalogo (AdminPanel).
// Groq (groq.ts) resta solo per gli altri testi del pannello (SEO, traduzioni, recensioni, promozioni…).
// I nomi dei modelli cambiano spesso: la lista è una sequenza di ripiego (si passa al successivo se uno è
// dismesso, senza quota o sovraccarico) e si può sovrascrivere dal pannello admin senza rifare il deploy.
// Verificati a ottobre 2026: gemini-3.8-flash (stabile), gemini-3.6-flash, gemini-3.1-pro-preview, gemini-3-flash-preview.
import { GroqError, adminSessionToken, cleanReply, extractJson, prepareImage } from './groq'

export const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'
export const GEMINI_PROXY = '/.netlify/functions/gemini-proxy'
export const DEFAULT_GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.1-pro-preview', 'gemini-3-flash-preview']

const LS_KEY = 'gemini_api_key'
const LS_MODEL = 'gemini_model'

export type GeminiThink = 'low' | 'medium' | 'high'

export class GeminiError extends Error {
  status?: number
  gone?: boolean
  code?: string
  raw?: string
  constructor(message: string, status?: number, gone = false, code = '') { super(message); this.name = 'GeminiError'; this.status = status; this.gone = gone; this.code = code }
}

// Chiave usata SOLO in sviluppo locale (npm run dev): VITE_GEMINI_DEV_KEY in .env.local (eliminata dal bundle di produzione)
function devKey(): string {
  try { if (import.meta.env.DEV) return String(import.meta.env.VITE_GEMINI_DEV_KEY || '').trim() } catch { /* fuori da Vite */ }
  return ''
}
export function getGeminiKey(): string {
  try { const k = (localStorage.getItem(LS_KEY) || '').trim(); if (k) return k } catch { /* noop */ }
  return devKey()
}
export function setGeminiKey(k: string) {
  try { const v = k.trim(); if (v) localStorage.setItem(LS_KEY, v); else localStorage.removeItem(LS_KEY) } catch { /* noop */ }
}
export function getGeminiModelOverride(): string {
  try { return (localStorage.getItem(LS_MODEL) || '').trim() } catch { return '' }
}
export function setGeminiModelOverride(v: string) {
  try { const t = v.trim(); if (t) localStorage.setItem(LS_MODEL, t); else localStorage.removeItem(LS_MODEL) } catch { /* noop */ }
}
// Le chiavi Google oggi iniziano con "AIza", ma il formato può cambiare: si controlla solo che sembri un token.
export function isValidGeminiKey(k: string) { return /^[A-Za-z0-9._-]{20,}$/.test(k.trim()) }

// C'è almeno una credenziale lato browser? (Se il server abbia davvero la chiave lo si scopre alla prima chiamata.)
export function geminiHasCredentials(): boolean { return !!getGeminiKey() || !!adminSessionToken() }

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

function modelsFor(): string[] {
  const o = getGeminiModelOverride()
  return o ? [o, ...DEFAULT_GEMINI_MODELS.filter(m => m !== o)] : DEFAULT_GEMINI_MODELS
}

function explain(status: number, apiMsg: string): string {
  const m = (apiMsg || '').slice(0, 160)
  if (status === 400 && /api key not valid|API_KEY_INVALID/i.test(apiMsg)) return 'Chiave Gemini non valida. Aggiornala in Impostazioni → Chiave API Gemini.'
  if (status === 401) return 'Chiave Gemini non valida o revocata. Aggiornala in Impostazioni → Chiave API Gemini.'
  if (status === 403) return `Accesso negato da Gemini. Controlla che la chiave sia abilitata per l'API Gemini. ${m}`.trim()
  if (status === 413) return 'Richiesta troppo grande (immagine o testo). Riduci le dimensioni e riprova.'
  if (status === 429) return 'Limite di richieste/quota Gemini raggiunto: attendi qualche istante e riprova.'
  if (status >= 500) return 'Gemini è temporaneamente non disponibile o sovraccarico. Riprova tra poco.'
  return m || `Errore Gemini ${status}`
}

function modelGone(status: number, msg: string) {
  return status === 404 || ((status === 400 || status === 403) && /is not found|not supported for generatecontent|no longer available|decommission|deprecated|does not exist|permission.*model/i.test(msg))
}

interface GenOpts {
  system?: string
  parts: unknown[]            // parti dell'unico messaggio utente (testo e/o immagine)
  maxTokens: number
  json?: boolean
  think?: GeminiThink
  timeoutMs?: number
}
type GenCfg = Record<string, unknown>

// Il ragionamento consuma token dal budget di uscita: lasciamo margine
const THINK_MARGIN: Record<GeminiThink, number> = { low: 1500, medium: 4000, high: 8000 }

// Sequenza di configurazioni da provare per ciascun modello, dalla più completa alla più generica.
// (temperature non si invia: la documentazione Gemini 3.x raccomanda il valore predefinito.)
function variants(o: GenOpts, budget: number, model: string): GenCfg[] {
  const level = o.think ?? 'low'
  const no = unsupported[model] ?? {}
  const mk = (think: boolean, json: boolean): GenCfg => ({
    maxOutputTokens: budget,
    ...(think ? { thinkingConfig: { thinkingLevel: level } } : {}),
    ...(json ? { responseMimeType: 'application/json' } : {}),
  })
  const raw = [mk(true, !!o.json), mk(true, false), mk(false, !!o.json), mk(false, false)]
    // funzioni che questo modello ha già rifiutato in una chiamata precedente: non si riprovano
    .filter(c => !(no.think && c.thinkingConfig) && !(no.json && c.responseMimeType))
  const seen = new Set<string>()
  return raw.filter(c => { const k = JSON.stringify(c); if (seen.has(k)) return false; seen.add(k); return true })
}

const PARAM_REJECTED = /thinking|thinkingLevel|thinking_level|responseMimeType|response_mime_type|mime|unknown name|invalid.*(argument|field|value)|not supported|unsupported|cannot be used|only supported/i
// Per modello: funzioni (ragionamento, JSON mode) che ha rifiutato. Si ricorda la capacità, non l'indice della variante,
// perché la lista delle varianti cambia a seconda della chiamata.
const unsupported: Record<string, { think?: boolean; json?: boolean }> = {}

async function requestOnce(model: string, o: GenOpts, cfg: GenCfg): Promise<{ text: string; truncated: boolean }> {
  const key = getGeminiKey()
  let token = key ? '' : adminSessionToken()
  let viaProxy = !key && !!token
  if (!key && !token) throw new GeminiError('Chiave Gemini mancante: imposta GEMINI_API_KEY su Netlify (e accedi come admin) oppure inseriscila in Impostazioni → Chiave API Gemini.', 401, false, 'no_key')

  const request: Record<string, unknown> = {
    contents: [{ role: 'user', parts: o.parts }],
    generationConfig: cfg,
  }
  if (o.system) request.systemInstruction = { parts: [{ text: o.system }] }

  let lastErr: GeminiError | null = null
  for (let attempt = 0; attempt < 3; attempt++) {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), o.timeoutMs ?? 100000)
    try {
      const res = viaProxy
        ? await fetch(GEMINI_PROXY, { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ model, request }) })
        : await fetch(`${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent`, { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(request) })
      if (!res.ok) {
        let apiMsg = '', code = ''
        try { const j = await res.json(); apiMsg = j?.error?.message || ''; code = String(j?.error?.code ?? '') + ' ' + String(j?.error?.status ?? '') } catch { /* noop */ }
        // chiave del browser rifiutata ma c'è la sessione admin: si ripiega sulla chiave del server
        if (!viaProxy && (res.status === 401 || (res.status === 400 && /api key not valid|API_KEY_INVALID/i.test(apiMsg))) && attempt < 2) {
          const tk = adminSessionToken()
          if (tk) { token = tk; viaProxy = true; continue }
        }
        let msg = explain(res.status, apiMsg)
        let errCode = code.trim()
        if (viaProxy) {
          if (res.status === 404 && !apiMsg) { msg = 'Proxy AI non disponibile: la Netlify Function gemini-proxy non è pubblicata. In locale usa VITE_GEMINI_DEV_KEY in .env.local.'; errCode = 'no_proxy' }
          else if (res.status === 405) { msg = 'Proxy Gemini non disponibile (versione vecchia): rifai il deploy con lo zip più recente.'; errCode = 'no_proxy' }
          else if (/session_expired/.test(code) || (res.status === 401 && /Sessione admin/i.test(apiMsg))) { msg = 'Sessione admin scaduta: rifai il login.'; errCode = 'session_expired' }
          else if (/not_configured/.test(code)) { msg = (apiMsg || 'GEMINI_API_KEY mancante nelle variabili Netlify.') + ' In alternativa incolla la chiave in Impostazioni → Chiave API Gemini: funziona subito, senza deploy.'; errCode = 'not_configured' }
        }
        const err = new GeminiError(msg, res.status, modelGone(res.status, apiMsg), errCode)
        err.raw = apiMsg
        // sovraccarico/errore server: si ritenta; 429 (quota) no: conviene passare al modello successivo
        if (res.status >= 500 && !/not_configured|no_proxy/.test(errCode) && attempt < 2) {
          const ra = Number(res.headers.get('retry-after'))
          await sleep(Math.min(Number.isFinite(ra) && ra > 0 ? ra * 1000 : 2000 * (attempt + 1), 8000))
          lastErr = err
          continue
        }
        throw err
      }
      const json = await res.json()
      if (json?.promptFeedback?.blockReason) throw new GeminiError(`Gemini ha bloccato la richiesta (${json.promptFeedback.blockReason}). Prova con un'altra foto.`, 200, false, 'blocked')
      const cand = json?.candidates?.[0]
      const parts: any[] = cand?.content?.parts ?? []
      const text = cleanReply(parts.filter(p => !p?.thought && typeof p?.text === 'string').map(p => p.text).join(''))
      if (!text && cand?.finishReason && !/STOP|MAX_TOKENS/.test(cand.finishReason)) {
        throw new GeminiError(`Gemini non ha prodotto risposta (${cand.finishReason}).`, 200, false, 'blocked')
      }
      return { text, truncated: cand?.finishReason === 'MAX_TOKENS' }
    } catch (e) {
      if (e instanceof GeminiError) throw e
      const aborted = (e as Error)?.name === 'AbortError'
      const err = new GeminiError(aborted ? 'Gemini non ha risposto in tempo (timeout). Riprova.' : 'Connessione a Gemini non riuscita. Controlla la rete.', 0, false, aborted ? 'timeout' : 'network')
      if (attempt < 2 && !aborted) { lastErr = err; await sleep(1200 * (attempt + 1)); continue }
      throw err
    } finally { clearTimeout(timer) }
  }
  throw lastErr ?? new GeminiError('Errore Gemini sconosciuto')
}

async function generate(o: GenOpts): Promise<string> {
  let lastErr: GeminiError | null = null
  let allGone = true
  const viaProxy = !getGeminiKey() && !!adminSessionToken()
  // Dal proxy Netlify il ragionamento "high" rischia di superare il tempo massimo di una Function: si limita a "medium"
  const think: GeminiThink | undefined = viaProxy && o.think === 'high' ? 'medium' : o.think
  const eff: GenOpts = { ...o, think }
  const models = modelsFor()
  for (let mi = 0; mi < models.length; mi++) {
    const model = models[mi]
    const baseBudget = eff.maxTokens + THINK_MARGIN[eff.think ?? 'low']
    const list = variants(eff, baseBudget, model)
    for (let vi = 0; vi < list.length; vi++) {
      try {
        let r = await requestOnce(model, eff, list[vi])
        if (!r.text && r.truncated) r = await requestOnce(model, eff, { ...list[vi], maxOutputTokens: baseBudget * 2 })
        if (!r.text) throw new GeminiError('Risposta Gemini vuota — riprova.', 200, false, 'empty')
        if (vi > 0) { // la variante che ha funzionato ha rinunciato a qualcosa: lo ricordiamo
          const u = (unsupported[model] ??= {})
          if (eff.think && !list[vi].thinkingConfig) u.think = true
          if (eff.json && !list[vi].responseMimeType) u.json = true
        }
        return r.text
      } catch (e) {
        const err = e as GeminiError
        lastErr = err
        if (!err.gone) allGone = false
        // parametro non supportato dal modello → variante successiva
        if (err.status === 400 && !err.gone && PARAM_REJECTED.test(err.raw || err.message)) continue
        // problemi di credenziali/proxy: inutile provare altri modelli
        if (/no_key|not_configured|no_proxy|session_expired|blocked/.test(err.code || '') || err.status === 401) throw err
        // modello dismesso, quota/limiti, sovraccarico, timeout, risposta vuota → modello successivo
        if (err.gone || err.status === 429 || (err.status ?? 0) >= 500 || /timeout|network|empty/.test(err.code || '') || err.status === 403) break
        throw err
      }
    }
  }
  if (lastErr?.gone && allGone) throw new GeminiError('Nessun modello Gemini disponibile: Google potrebbe averli sostituiti. Scrivi il nome del modello attuale in Impostazioni → Chiave API Gemini → Modello.', lastErr.status, true)
  throw lastErr ?? new GeminiError('Errore Gemini sconosciuto')
}

// Gemini non può leggere percorsi relativi: la foto viene ridotta (max 2048 px) e inviata in base64
async function imagePart(image: string) {
  const url = await prepareImage(image, 2048, 0.88)
  const m = /^data:(image\/[A-Za-z0-9.+-]+);base64,(.+)$/s.exec(url)
  if (!m) throw new GeminiError('Impossibile leggere la foto per Gemini (serve un file caricato, non un link esterno).', 0, false, 'image')
  return { inlineData: { mimeType: m[1], data: m[2] } }
}

// ─── API ─────────────────────────────────────────────────────────────────────
export function geminiText(prompt: string, maxTokens = 700): Promise<string> {
  return generate({ parts: [{ text: prompt }], maxTokens, think: 'low' })
}
// Descrizione/testo da una foto (catalogo): una sola chiamata, ragionamento leggero
export async function geminiVision(image: string, prompt: string, maxTokens = 700): Promise<string> {
  return geminiExpertVisionText(image, 'Sei un esperto di un negozio italiano di arredi vintage e bijoux. Rispondi in italiano.', prompt, maxTokens, 'low')
}
// Risposta JSON da un testo (catalogo)
export function geminiJson<T = any>(prompt: string, maxTokens = 1200): Promise<T> {
  return geminiExpertTextJson<T>('Sei un esperto di un negozio italiano di arredi vintage e bijoux. Rispondi solo con JSON valido, senza markdown.', prompt, maxTokens, 'low')
}
export function geminiExpertText(system: string, prompt: string, maxTokens = 1600, think: GeminiThink = 'medium'): Promise<string> {
  return generate({ system, parts: [{ text: prompt }], maxTokens, think, timeoutMs: 100000 })
}
export async function geminiExpertVisionText(image: string, system: string, prompt: string, maxTokens = 900, think: GeminiThink = 'medium'): Promise<string> {
  const img = await imagePart(image)
  return generate({ system, parts: [img, { text: prompt }], maxTokens, think, timeoutMs: 110000 })
}
export async function geminiExpertVisionJson<T = any>(image: string, system: string, prompt: string, maxTokens = 1800, think: GeminiThink = 'high'): Promise<T> {
  const img = await imagePart(image)
  const text = await generate({ system, parts: [img, { text: prompt }], maxTokens, think, json: true, timeoutMs: 120000 })
  return extractJsonG<T>(text)
}
export async function geminiExpertTextJson<T = any>(system: string, prompt: string, maxTokens = 1500, think: GeminiThink = 'medium'): Promise<T> {
  const text = await generate({ system, parts: [{ text: prompt }], maxTokens, think, json: true, timeoutMs: 100000 })
  return extractJsonG<T>(text)
}
function extractJsonG<T>(text: string): T {
  try { return extractJson<T>(text) } catch (e) {
    throw new GeminiError((e as GroqError).message.replace(/^L'AI/, 'Gemini'), 200, false, 'bad_json')
  }
}

// Diagnosi: cosa vede il server (variabile, chiave, modelli attivi) e cosa c'è nel browser
export async function geminiDiagnose(): Promise<string> {
  const key = getGeminiKey(), token = adminSessionToken()
  const out: string[] = []
  out.push(key ? '• Chiave nel browser: presente (viene usata per prima).' : '• Chiave nel browser: assente.')
  out.push(token ? '• Sessione admin: valida.' : '• Sessione admin: assente o scaduta (esci e rientra dal pannello).')
  if (token) {
    try {
      const r = await fetch(GEMINI_PROXY, { method: 'GET', headers: { Authorization: `Bearer ${token}` } })
      const j: any = await r.json().catch(() => null)
      if (r.status === 404) out.push('• Server: la Function gemini-proxy non esiste su questo sito (non pubblicata): rifai il deploy con lo zip più recente.')
      else if (r.status === 405) out.push('• Server: la Function gemini-proxy è una VERSIONE VECCHIA: rifai il deploy.')
      else if (j?.error) out.push('• Server: ' + (j.error.message || j.error.code))
      else if (j) {
        out.push(`• Server: chiave trovata nella variabile ${j.keyName} (${j.keyHint}, ${j.keyLength} caratteri).`)
        out.push(j.ok ? '• Gemini accetta la chiave (stato 200).' : `• Gemini rifiuta la chiave (stato ${j.geminiStatus}). ${j.detail || ''}`.trim())
        if (j.ok && Array.isArray(j.models)) {
          const have = (m: string) => j.models.includes(m)
          out.push('• Modelli usati dal sito: ' + modelsFor().map(m => `${m} ${have(m) ? '✓' : '✗ non disponibile'}`).join(' · '))
          if (!modelsFor().some(have)) out.push('• Nessuno dei modelli del sito è attivo: scrivine uno attuale in "Modello". Attivi ora: ' + j.models.filter((m: string) => /gemini/i.test(m)).slice(0, 12).join(', '))
        }
      }
    } catch { out.push('• Server: nessuna risposta dalla Function (rete o sito non raggiungibile).') }
  }
  return out.join('\n')
}

export interface GeminiTestResult { ok: boolean; msg: string }
export async function testGemini(): Promise<{ text: GeminiTestResult; vision: GeminiTestResult }> {
  const run = async (fn: () => Promise<string>): Promise<GeminiTestResult> => {
    try { const r = await fn(); return { ok: true, msg: r.slice(0, 40) } } catch (e) { return { ok: false, msg: (e as Error).message } }
  }
  const text = await run(() => geminiText('Rispondi solo con la parola: ok', 20))
  let vision: GeminiTestResult
  if (!text.ok && /chiave|sessione/i.test(text.msg)) vision = { ok: false, msg: 'Non provato (chiave non valida).' }
  else {
    vision = await run(async () => {
      const c = document.createElement('canvas'); c.width = 64; c.height = 64
      const ctx = c.getContext('2d')!; ctx.fillStyle = '#d62828'; ctx.fillRect(0, 0, 64, 64)
      return geminiExpertVisionText(c.toDataURL('image/jpeg', 0.8), 'Rispondi in italiano.', 'Di che colore è questa immagine? Rispondi con una sola parola.', 20, 'low')
    })
  }
  return { text, vision }
}
