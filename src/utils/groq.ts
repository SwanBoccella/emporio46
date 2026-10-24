// ─── Client Groq condiviso (pannello admin + traduzioni) ─────────────────────
// Modelli verificati sulla pagina ufficiale delle deprecazioni di Groq (ottobre 2026):
// llama-3.3-70b-versatile, llama-4-scout, qwen3-32b e qwen3.6-27b sono stati DISMESSI.
// Attivi: openai/gpt-oss-120b, openai/gpt-oss-20b (testo) e qwen/qwen3.8-27b (testo + visione).
// Se Groq cambia ancora i modelli, si possono sovrascrivere dal pannello admin
// (Impostazioni → Chiave API Groq) senza rifare il deploy.
export const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
export const DEFAULT_TEXT_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b']
export const DEFAULT_VISION_MODELS = ['qwen/qwen3.8-27b']

const LS_KEY = 'groq_api_key'
const LS_TEXT = 'groq_model_text'
const LS_VISION = 'groq_model_vision'

export type GroqKind = 'text' | 'vision'

export class GroqError extends Error {
  status?: number
  gone?: boolean
  raw?: string
  constructor(message: string, status?: number, gone = false) { super(message); this.name = 'GroqError'; this.status = status; this.gone = gone }
}

// Chiave usata SOLO in sviluppo locale (npm run dev): VITE_GROQ_DEV_KEY in .env.local.
// Va letta con l'espressione statica import.meta.env.* dentro un `if (DEV)`: in produzione Vite la
// sostituisce con `false` e la chiave viene eliminata dal bundle (verifica: `grep -r gsk_ dist` = vuoto).
function devKey(): string {
  try { if (import.meta.env.DEV) return String(import.meta.env.VITE_GROQ_DEV_KEY || '').trim() } catch { /* fuori da Vite */ }
  return ''
}

// Sessione admin (stessa chiave di adminApi.ts): serve per usare la chiave Groq custodita sul server
function adminSessionToken(): string {
  try {
    const t = localStorage.getItem('mnt_admin_token') || ''
    if (!t) return ''
    const p = t.split('.')[0].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(p)).exp > Date.now() + 60_000 ? t : ''
  } catch { return '' }
}

// Chiave "diretta": quella inserita nel pannello (browser) oppure quella di sviluppo
export function getGroqKey(): string {
  try { const k = (localStorage.getItem(LS_KEY) || '').trim(); if (k) return k } catch { /* noop */ }
  return devKey()
}
// In produzione la chiave sta su Netlify (GROQ_API_KEY) e passa dalla Function groq-proxy
export const GROQ_PROXY = '/.netlify/functions/groq-proxy'
export function setGroqKey(k: string) {
  try { const v = k.trim(); if (v) localStorage.setItem(LS_KEY, v); else localStorage.removeItem(LS_KEY) } catch { /* noop */ }
}
export function getModelOverride(kind: GroqKind): string {
  try { return (localStorage.getItem(kind === 'text' ? LS_TEXT : LS_VISION) || '').trim() } catch { return '' }
}
export function setModelOverride(kind: GroqKind, v: string) {
  try { const t = v.trim(); const k = kind === 'text' ? LS_TEXT : LS_VISION; if (t) localStorage.setItem(k, t); else localStorage.removeItem(k) } catch { /* noop */ }
}
export function isValidGroqKey(k: string) { return /^gsk_[A-Za-z0-9_-]{20,}$/.test(k.trim()) }

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

function modelsFor(kind: GroqKind): string[] {
  const defaults = kind === 'text' ? DEFAULT_TEXT_MODELS : DEFAULT_VISION_MODELS
  const o = getModelOverride(kind)
  return o ? [o, ...defaults.filter(m => m !== o)] : defaults
}

function explain(status: number, apiMsg: string): string {
  const m = (apiMsg || '').slice(0, 160)
  if (status === 401) return 'Chiave Groq non valida o revocata. Aggiornala in Impostazioni → Chiave API Groq.'
  if (status === 403) return `Accesso negato da Groq. Controlla il progetto/permessi della chiave. ${m}`.trim()
  if (status === 413) return 'Richiesta troppo grande (immagine o testo). Riduci le dimensioni e riprova.'
  if (status === 429) return 'Limite di richieste Groq raggiunto: attendi qualche secondo e riprova.'
  if (status >= 500) return 'Groq è temporaneamente non disponibile. Riprova tra poco.'
  return m || `Errore Groq ${status}`
}

function modelGone(status: number, code: string, msg: string) {
  return status === 404 || /model_not_found|model_decommissioned|model_not_active/i.test(code)
    || ((status === 400 || status === 403) && /decommission|no longer supported|does not exist|not found|deprecated|do(es)? not have access to model/i.test(msg))
}

// Rimuove il ragionamento interno ("<think>…</think>", anche se troncato e senza chiusura)
function cleanReply(raw: string): string {
  let t = (raw ?? '').toString()
  t = t.replace(/<think>[\s\S]*?<\/think>/gi, '')
  if (/<think>/i.test(t)) t = t.replace(/<think>[\s\S]*$/i, '') // blocco aperto e mai chiuso
  return t.replace(/<\/think>/gi, '').trim()
}

interface ChatOpts { messages: unknown[]; maxTokens: number; temperature: number; timeoutMs?: number; json?: boolean }
type Extra = Record<string, unknown>

async function requestOnce(model: string, o: ChatOpts, extra: Extra, budget: number): Promise<{ text: string; truncated: boolean }> {
  const key = getGroqKey()
  const token = key ? '' : adminSessionToken()
  const viaProxy = !key && !!token
  if (!key && !token) throw new GroqError('Chiave Groq mancante: imposta GROQ_API_KEY su Netlify (e accedi come admin) oppure inseriscila in Impostazioni → Chiave API Groq.', 401)

  let lastErr: GroqError | null = null
  for (let attempt = 0; attempt < 3; attempt++) {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), o.timeoutMs ?? 45000)
    try {
      const res = await fetch(viaProxy ? GROQ_PROXY : GROQ_ENDPOINT, {
        method: 'POST',
        signal: ctl.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${viaProxy ? token : key}` },
        body: JSON.stringify({ model, messages: o.messages, temperature: o.temperature, max_completion_tokens: budget, ...extra }),
      })
      if (!res.ok) {
        let apiMsg = '', code = ''
        try { const j = await res.json(); apiMsg = j?.error?.message || ''; code = j?.error?.code || '' } catch { /* noop */ }
        let msg = explain(res.status, apiMsg)
        if (viaProxy) { // errori del proxy (sessione scaduta, chiave server mancante, funzione non pubblicata)
          if (res.status === 404 || res.status === 405) msg = 'Proxy AI non disponibile: la Netlify Function groq-proxy non è pubblicata. In locale usa VITE_GROQ_DEV_KEY in .env.local.'
          else if (code === 'session_expired') msg = 'Sessione admin scaduta: rifai il login.'
          else if (code === 'not_configured') msg = apiMsg || 'GROQ_API_KEY mancante nelle variabili Netlify.'
        }
        const err = new GroqError(msg, res.status, modelGone(res.status, code, apiMsg))
        err.raw = apiMsg
        if ((res.status === 429 || res.status >= 500) && attempt < 2) {
          const ra = Number(res.headers.get('retry-after'))
          await sleep(Math.min(Number.isFinite(ra) && ra > 0 ? ra * 1000 : 1500 * (attempt + 1), 8000))
          lastErr = err
          continue
        }
        throw err
      }
      const json = await res.json()
      const choice = json?.choices?.[0]
      const text = cleanReply(choice?.message?.content ?? '')
      return { text, truncated: choice?.finish_reason === 'length' }
    } catch (e) {
      if (e instanceof GroqError) throw e
      const aborted = (e as Error)?.name === 'AbortError'
      const err = new GroqError(aborted ? 'Groq non ha risposto in tempo (timeout). Riprova.' : 'Connessione a Groq non riuscita. Controlla la rete (o che api.groq.com non sia bloccato).')
      if (attempt < 2) { lastErr = err; await sleep(1200 * (attempt + 1)); continue }
      throw err
    } finally { clearTimeout(timer) }
  }
  throw lastErr ?? new GroqError('Errore sconosciuto')
}

// Sequenza di parametri da provare per ciascun modello, dal più "pulito" al più generico.
// - gpt-oss: ragionamento ridotto (reasoning_effort: low)
// - qwen3.8: modalità "instruct" senza pensiero (reasoning_effort: none) → risposta diretta e veloce
// - JSON mode (response_format) solo quando serve JSON; se il modello lo rifiuta si ricade sul prompt
function variantsFor(model: string, json: boolean): Extra[] {
  const effort: Extra = /gpt-oss/i.test(model) ? { reasoning_effort: 'low' } : /qwen/i.test(model) ? { reasoning_effort: 'none' } : {}
  const list: Extra[] = []
  if (json) list.push({ ...effort, response_format: { type: 'json_object' } })
  list.push({ ...effort })
  if (Object.keys(effort).length) list.push({})
  return list
}

const PARAM_REJECTED = /reasoning|effort|response_format|json_object|unsupported|unknown|invalid.*param|not supported/i

async function chat(kind: GroqKind, o: ChatOpts): Promise<string> {
  let lastErr: GroqError | null = null
  let allGone = true
  for (const model of modelsFor(kind)) {
    const isReasoning = /gpt-oss|qwen/i.test(model)
    for (const extra of variantsFor(model, !!o.json)) {
      // se il pensiero è attivo consuma token dal budget: lasciamo margine
      const thinking = isReasoning && extra.reasoning_effort !== 'none'
      const baseBudget = thinking ? o.maxTokens + 1500 : o.maxTokens
      try {
        let r = await requestOnce(model, o, extra, baseBudget)
        if (!r.text && r.truncated) r = await requestOnce(model, o, extra, baseBudget * 2)
        if (!r.text) throw new GroqError('Risposta AI vuota — riprova.')
        return r.text
      } catch (e) {
        const err = e as GroqError
        lastErr = err
        if (!err.gone) allGone = false
        // parametro non supportato dal modello → riprova con la variante successiva
        if (err.status === 400 && !err.gone && PARAM_REJECTED.test(err.raw || err.message)) continue
        // modello dismesso, oppure limiti/guasti temporanei su questo modello → passa al successivo
        if (err.gone || err.status === 429 || (err.status ?? 0) >= 500 || /timeout|Connessione/i.test(err.message)) break
        throw err
      }
    }
  }
  if (lastErr?.gone && allGone) throw new GroqError('Nessun modello Groq disponibile: Groq potrebbe averli sostituiti. Aggiorna il nome del modello in Impostazioni → Chiave API Groq.', lastErr.status)
  throw lastErr ?? new GroqError('Errore Groq sconosciuto')
}

export function groqText(prompt: string, maxTokens = 700): Promise<string> {
  return chat('text', { messages: [{ role: 'user', content: prompt }], maxTokens, temperature: 0.7 })
}

// ─── JSON robusto ────────────────────────────────────────────────────────────
// Estrae il primo oggetto/array JSON dalla risposta anche se il modello aggiunge testo o ```json
export function extractJson<T = any>(text: string): T {
  const t = cleanReply(text).replace(/```(?:json)?/gi, '').trim()
  const tryParse = (s: string) => { try { return { ok: true as const, v: JSON.parse(s) as T } } catch { return { ok: false as const } } }
  let r = tryParse(t)
  if (r.ok) return r.v
  for (const [open, close] of [['{', '}'], ['[', ']']] as const) {
    const a = t.indexOf(open), b = t.lastIndexOf(close)
    if (a !== -1 && b > a) {
      r = tryParse(t.slice(a, b + 1))
      if (r.ok) return r.v
      // virgole finali e apici tipografici sono gli errori più comuni
      r = tryParse(t.slice(a, b + 1).replace(/,\s*([}\]])/g, '$1').replace(/[“”]/g, '"'))
      if (r.ok) return r.v
    }
  }
  throw new GroqError('L\'AI ha risposto in un formato non valido. Riprova.')
}

export async function groqJson<T = any>(prompt: string, maxTokens = 700): Promise<T> {
  const text = await chat('text', { messages: [{ role: 'user', content: prompt }], maxTokens, temperature: 0.5, json: true })
  return extractJson<T>(text)
}

// ─── Immagini ────────────────────────────────────────────────────────────────
// Groq non può leggere percorsi relativi del sito ("/catalog/foto.jpg"), blob: né file locali:
// qualsiasi immagine viene scaricata dal browser, ridotta (max 1024px) e inviata come data URL JPEG.
function drawToJpeg(img: CanvasImageSource, w: number, h: number): string | null {
  const MAX = 1024
  const ratio = Math.min(1, MAX / Math.max(w, h))
  const width = Math.max(1, Math.round(w * ratio)), height = Math.max(1, Math.round(h * ratio))
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)
  try { return canvas.toDataURL('image/jpeg', 0.85) } catch { return null } // canvas "tainted"
}

function loadImage(src: string, cors: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (cors) img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('img'))
    img.src = src
  })
}

export async function prepareImage(src: string): Promise<string> {
  if (!src) throw new GroqError('Nessuna immagine da analizzare.')
  const abs = src.startsWith('data:') ? src : new URL(src, window.location.href).href
  try {
    const img = await loadImage(abs, !abs.startsWith('data:') && !abs.startsWith('blob:'))
    const out = drawToJpeg(img, img.naturalWidth || img.width, img.naturalHeight || img.height)
    if (out) return out
  } catch { /* si prova con fetch */ }
  try {
    const res = await fetch(abs)
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      try {
        const img = await loadImage(url, false)
        const out = drawToJpeg(img, img.naturalWidth || img.width, img.naturalHeight || img.height)
        if (out) return out
      } finally { URL.revokeObjectURL(url) }
    }
  } catch { /* noop */ }
  // ultima chance: URL pubblico https assoluto che Groq può scaricare da solo
  if (/^https:\/\//i.test(abs) && !abs.startsWith(window.location.origin)) return abs
  throw new GroqError('Impossibile leggere la foto (percorso non raggiungibile o immagine non valida). Ricaricala e riprova.')
}

export async function groqVision(image: string, prompt: string, maxTokens = 1800): Promise<string> {
  const url = await prepareImage(image)
  return chat('vision', {
    messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url } }, { type: 'text', text: prompt }] }],
    maxTokens, temperature: 0.6, timeoutMs: 60000,
  })
}

export async function groqVisionJson<T = any>(image: string, prompt: string, maxTokens = 1200): Promise<T> {
  const url = await prepareImage(image)
  const text = await chat('vision', {
    messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url } }, { type: 'text', text: prompt }] }],
    maxTokens, temperature: 0.4, timeoutMs: 60000, json: true,
  })
  return extractJson<T>(text)
}

export interface GroqTestResult { ok: boolean; msg: string }
export async function testGroq(): Promise<{ text: GroqTestResult; vision: GroqTestResult }> {
  const run = async (fn: () => Promise<string>): Promise<GroqTestResult> => {
    try { const r = await fn(); return { ok: true, msg: r.slice(0, 40) } } catch (e) { return { ok: false, msg: (e as Error).message } }
  }
  const text = await run(() => groqText('Rispondi solo con la parola: ok', 20))
  let vision: GroqTestResult
  if (!text.ok && /chiave/i.test(text.msg)) vision = { ok: false, msg: 'Non provato (chiave non valida).' }
  else {
    vision = await run(async () => {
      const c = document.createElement('canvas'); c.width = 64; c.height = 64
      const ctx = c.getContext('2d')!; ctx.fillStyle = '#d62828'; ctx.fillRect(0, 0, 64, 64)
      return groqVision(c.toDataURL('image/jpeg', 0.8), 'Di che colore è questa immagine? Rispondi con una sola parola.', 20)
    })
  }
  return { text, vision }
}
