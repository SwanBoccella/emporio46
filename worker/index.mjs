// Worker Cloudflare di Emporio 46: API del pannello admin, archivio contenuti (D1), file caricati (R2),
// proxy Groq, sitemap.xml e robots.txt. Il resto (il sito React compilato in dist/) è servito dagli Assets.
//
// Binding (vedi wrangler.jsonc):  DB = D1 · FILES = R2 · ASSETS = file statici
// Secret (Cloudflare → Workers → Settings → Variables and Secrets, tipo "Secret"):
//   ADMIN_PASSWORD   password iniziale del pannello (16+ caratteri)
//   GROQ_API_KEY     chiave Groq (gsk_…)
//   SESSION_SECRET   (consigliato) stringa casuale lunga per firmare le sessioni admin
//   GIST_ID / GIST_TOKEN   (opzionali) copia di sicurezza su GitHub Gist
import { randomHex } from './util.mjs'
import { readStored, verifyPassword, saveNewPassword, makeToken, checkToken, MIN_PASSWORD } from './auth.mjs'
import { readSite, writeSite } from './sitestore.mjs'
import { handleSitemap, handleRobots } from './seo.mjs'

const ALLOWED_KEYS = ['settings', 'catalog', 'reviews', 'seo', 'settingsEn']
const VIDEO_CHUNK = 3 * 1024 * 1024   // deve coincidere con CHUNK in src/utils/adminApi.ts
const ASSET_ID = /^[a-f0-9]{24,48}$/
const MAX_PART = 4_200_000
const VIDEO_WINDOW = 8 * 1024 * 1024   // ogni risposta Range video è limitata a 8 MB: il browser chiede il resto da solo
const GROQ = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MAX_BYTES = 6_000_000

const json = (status, body, extra = {}) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...extra },
})
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const bearerOf = (req) => (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
const crossSite = (req) => { const s = req.headers.get('sec-fetch-site'); return !!s && s !== 'same-origin' && s !== 'none' }

export default {
  async fetch(req, env) {
    const url = new URL(req.url)
    const p = url.pathname
    try {
      if (p === '/api/site-data') return await siteData(req, env)
      if (p === '/api/admin-api') return await adminApi(req, env)
      if (p === '/api/asset-put') return await assetPut(req, env, url)
      if (p === '/api/asset') return await assetGet(req, env, url.searchParams.get('id') || '', parseInt(url.searchParams.get('part') || '0', 10))
      if (p.startsWith('/media/')) return await assetGet(req, env, p.slice(7), 0)
      if (p === '/api/groq-proxy') return await groqProxy(req, env)
      if (p === '/sitemap.xml') return await handleSitemap(req, env)
      if (p === '/robots.txt') return handleRobots(req)
      if (p.startsWith('/api/')) return json(404, { error: 'not_found' })
    } catch (e) {
      return json(500, { error: 'internal', message: 'Errore interno del server.' })
    }
    return env.ASSETS.fetch(req)
  },
}

// ── Lettura pubblica dei contenuti ───────────────────────────────────────────
async function siteData(req, env) {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })
  const cur = await readSite(env)
  if (!cur) return json(404, { error: 'empty' })
  const etag = `"${cur.rev || 'x'}"`
  if (cur.rev && req.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers: { etag, 'cache-control': 'no-cache' } })
  return new Response(cur.content, { status: 200, headers: {
    'content-type': 'application/json; charset=utf-8', etag, 'cache-control': 'no-cache', 'x-site-source': cur.source,
  } })
}

// ── Login, cambio password, salvataggio ──────────────────────────────────────
async function adminApi(req, env) {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })
  if (crossSite(req)) return json(403, { error: 'forbidden' })

  const raw = await req.text()
  if (raw.length > 3_000_000) return json(413, { error: 'too_large', message: 'Dati troppo grandi.' })
  let body
  try { body = JSON.parse(raw) } catch { return json(400, { error: 'bad_json' }) }
  if (!body || typeof body !== 'object') return json(400, { error: 'bad_json' })

  const stored = await readStored(env)
  if (!env.ADMIN_PASSWORD && !stored) return json(500, { error: 'not_configured', message: 'Manca il secret ADMIN_PASSWORD su Cloudflare (Workers → Settings → Variables and Secrets).' })

  if (body.action === 'login') {
    if (!(await verifyPassword(body.password, stored, env))) { await sleep(1200); return json(401, { error: 'wrong_password' }) }
    return json(200, { token: await makeToken(env, stored) })
  }

  if (body.action === 'change_password') {
    if (!(await checkToken(env, bearerOf(req), stored))) return json(401, { error: 'unauthorized' })
    if (!(await verifyPassword(body.current, stored, env))) { await sleep(1200); return json(403, { error: 'wrong_current', message: 'La password attuale non è corretta.' }) }
    const next = body.next
    if (typeof next !== 'string' || next.length < MIN_PASSWORD || next.length > 200) return json(400, { error: 'weak_password', message: `La nuova password deve avere almeno ${MIN_PASSWORD} caratteri.` })
    if (next === body.current) return json(400, { error: 'same_password', message: 'La nuova password deve essere diversa da quella attuale.' })
    try {
      const rec = await saveNewPassword(env, next)
      return json(200, { ok: true, token: await makeToken(env, rec) })     // nuova sessione; le altre decadono
    } catch (e) {
      return json(500, { error: 'store_failed', message: e?.message === 'store_unavailable'
        ? 'Database D1 non disponibile (binding DB mancante). Controlla wrangler.jsonc e rifai il deploy; in alternativa cambia il secret ADMIN_PASSWORD.'
        : 'Impossibile salvare la nuova password. La vecchia resta valida.' })
    }
  }

  if (body.action === 'save') {
    if (!(await checkToken(env, bearerOf(req), stored))) return json(401, { error: 'unauthorized' })
    const d = body.data
    if (!d || typeof d !== 'object' || Array.isArray(d)) return json(400, { error: 'bad_data' })
    const clean = {}
    for (const k of ALLOWED_KEYS) if (d[k] !== undefined) clean[k] = d[k]
    if (!clean.settings || typeof clean.settings !== 'object' || Array.isArray(clean.settings)) return json(400, { error: 'bad_settings' })
    if (!Array.isArray(clean.catalog) || !Array.isArray(clean.reviews)) return json(400, { error: 'bad_lists' })
    if (!clean.seo || typeof clean.seo !== 'object') return json(400, { error: 'bad_seo' })
    delete clean.settings.adminPassword // mai pubblicare credenziali

    // Controllo di concorrenza: se un altro dispositivo ha salvato nel frattempo, non sovrascrivere
    const cur = await readSite(env)
    if (cur?.rev && body.baseRev !== cur.rev) return json(409, { error: 'conflict', rev: cur.rev })

    const rev = `${Date.now()}-${randomHex(4)}`
    const content = JSON.stringify({ ...clean, rev, updatedAt: new Date().toISOString() })
    if (content.length > 2_000_000) return json(413, { error: 'too_large', message: 'Il contenuto è troppo grande: riduci testi o dati.' })

    const res = await writeSite(env, content, rev)
    if (res.conflict) return json(409, { error: 'conflict', rev: cur?.rev || null })
    if (!res.ok) return json(502, { error: 'store_write', message: 'Salvataggio non riuscito su Cloudflare D1. ' + res.failed.map((f) => `${f.store}: ${f.error}`).join('; ') })
    return json(200, { ok: true, rev, stores: res.written, warnings: res.failed })
  }

  return json(400, { error: 'unknown_action' })
}

// ── Upload file su R2 (corpo binario, un pezzo alla volta) ───────────────────
// PUT /api/asset-put?id=<hex>&index=<n>&total=<n>&mime=<tipo>&name=<nome>   (Authorization: Bearer <token admin>)
async function assetPut(req, env, url) {
  if (req.method !== 'PUT' && req.method !== 'POST') return json(405, { error: 'method_not_allowed' })
  if (crossSite(req)) return json(403, { error: 'forbidden' })
  if (!env.FILES) return json(500, { error: 'store_failed', message: 'Bucket R2 non collegato (binding FILES mancante). Controlla wrangler.jsonc e rifai il deploy.' })
  const stored = await readStored(env)
  if (!env.ADMIN_PASSWORD && !stored) return json(500, { error: 'not_configured', message: 'Manca il secret ADMIN_PASSWORD su Cloudflare.' })
  if (!(await checkToken(env, bearerOf(req), stored))) return json(401, { error: 'unauthorized' })

  const q = url.searchParams
  const id = q.get('id') || '', mime = q.get('mime') || '', name = q.get('name') || ''
  const index = Number(q.get('index')), total = Number(q.get('total'))
  if (!ASSET_ID.test(id)) return json(400, { error: 'bad_id' })
  if (!Number.isInteger(index) || !Number.isInteger(total) || total < 1 || total > 40 || index < 0 || index >= total) return json(400, { error: 'bad_part' })
  const isModel = mime === 'model/gltf-binary'
  const isVideo = mime === 'video/mp4' || mime === 'video/webm'
  if (!isModel && !isVideo && !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mime)) return json(400, { error: 'bad_mime', message: 'Tipo di file non consentito.' })
  if (!isModel && !isVideo && total !== 1) return json(400, { error: 'bad_part', message: 'Le immagini devono stare in un solo pezzo.' })
  if (isVideo && total > 12) return json(413, { error: 'too_large', message: 'Video troppo pesante (massimo ~36 MB): comprimilo prima di caricarlo.' })
  const declared = Number(req.headers.get('content-length') || 0)
  if (declared > MAX_PART) return json(413, { error: 'too_large', message: 'Pezzo troppo grande.' })

  const buf = new Uint8Array(await req.arrayBuffer())
  if (!buf.length) return json(400, { error: 'bad_data' })
  if (buf.length > MAX_PART) return json(413, { error: 'too_large', message: 'Pezzo troppo grande.' })
  const ascii = (a, b) => String.fromCharCode(...buf.subarray(a, b))
  if (index === 0 && isModel && ascii(0, 4) !== 'glTF') return json(400, { error: 'bad_glb', message: 'Il file non è un .glb valido.' })
  if (isVideo) {
    // i pezzi (tranne l'ultimo) devono essere esattamente da 3 MB: serve a calcolare gli intervalli di byte (Range) in lettura
    if (index < total - 1 && buf.length !== VIDEO_CHUNK) return json(400, { error: 'bad_part', message: 'Pezzo video di dimensione non valida.' })
    if (index === 0) {
      const mp4 = ascii(4, 8) === 'ftyp'
      const webm = buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3
      if ((mime === 'video/mp4' && !mp4) || (mime === 'video/webm' && !webm)) return json(400, { error: 'bad_video', message: 'Il file non è un video MP4/WebM valido.' })
    }
  }
  try {
    await env.FILES.put(`assets/${id}/${index}`, buf)
    if (index === total - 1) {
      const meta = { mime, total, name: name.slice(0, 120), at: new Date().toISOString() }
      if (isVideo) { meta.chunk = VIDEO_CHUNK; meta.size = (total - 1) * VIDEO_CHUNK + buf.length }
      await env.FILES.put(`assets/${id}/meta`, JSON.stringify(meta), { httpMetadata: { contentType: 'application/json' } })
    }
  } catch { return json(500, { error: 'store_failed', message: 'Archivio file (R2) non disponibile. Controlla il bucket e rifai il deploy.' }) }
  return json(200, { ok: true })
}

// ── Lettura pubblica dei file caricati ───────────────────────────────────────
//   /media/<id>                      → immagine o video (i video supportano Range → 206, richiesto da Safari/iOS)
//   /api/asset?id=<id>&part=<n>      → n-esimo pezzo (usato per il .glb)
async function assetGet(req, env, id, part) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Method not allowed', { status: 405 })
  if (!ASSET_ID.test(id) || !Number.isInteger(part) || part < 0 || part > 40) return new Response('Not found', { status: 404 })
  if (!env.FILES) return new Response('Archivio non disponibile', { status: 503, headers: { 'cache-control': 'no-store' } })
  try {
    const metaObj = await env.FILES.get(`assets/${id}/meta`)
    if (!metaObj) return new Response('Not found', { status: 404 })
    const meta = await metaObj.json()
    if (part >= meta.total) return new Response('Not found', { status: 404 })
    if (meta.mime === 'video/mp4' || meta.mime === 'video/webm') return await serveVideo(req, env, id, meta)
    const obj = await env.FILES.get(`assets/${id}/${part}`)
    if (!obj) return new Response('Not found', { status: 404 })
    return new Response(req.method === 'HEAD' ? null : obj.body, { status: 200, headers: {
      'content-type': meta.mime,
      'cache-control': 'public, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
      'x-asset-parts': String(meta.total),
    } })
  } catch { return new Response('Archivio non disponibile', { status: 503, headers: { 'cache-control': 'no-store' } }) }
}

async function serveVideo(req, env, id, meta) {
  const size = Number(meta.size), chunk = Number(meta.chunk)
  if (!size || !chunk) return new Response('Not found', { status: 404 })
  let start = 0, end = size - 1, ranged = false
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') || '')
  if (m && (m[1] || m[2])) {
    ranged = true
    if (m[1] === '') start = Math.max(0, size - Number(m[2]))
    else { start = Number(m[1]); if (m[2] !== '') end = Math.min(Number(m[2]), size - 1) }
    if (start > end || start >= size) return new Response('Range Not Satisfiable', { status: 416, headers: { 'content-range': `bytes */${size}` } })
  }
  if (end - start + 1 > VIDEO_WINDOW) { end = start + VIDEO_WINDOW - 1; ranged = true }
  const headers = {
    'content-type': meta.mime,
    'content-length': String(end - start + 1),
    'accept-ranges': 'bytes',
    'cache-control': 'public, max-age=31536000, immutable',
    'x-content-type-options': 'nosniff',
  }
  if (ranged) headers['content-range'] = `bytes ${start}-${end}/${size}`
  if (req.method === 'HEAD') return new Response(null, { status: ranged ? 206 : 200, headers })
  const first = Math.floor(start / chunk), last = Math.floor(end / chunk)
  const body = new Uint8Array(end - start + 1)
  let off = 0
  for (let pt = first; pt <= last; pt++) {
    const from = pt === first ? start - pt * chunk : 0
    const to = pt === last ? end - pt * chunk + 1 : chunk
    const o = await env.FILES.get(`assets/${id}/${pt}`, { range: { offset: from, length: to - from } })
    if (!o) return new Response('Not found', { status: 404 })
    const piece = new Uint8Array(await o.arrayBuffer())
    body.set(piece, off); off += piece.byteLength
  }
  return new Response(body, { status: ranged ? 206 : 200, headers })
}

// ── Proxy Groq: la chiave resta sul server, mai nel sito. Solo chi ha fatto login admin può usarlo. ──
const gerr = (status, code, message) => json(status, { error: { code, message } })
async function groqProxy(req, env) {
  if (req.method !== 'POST') return gerr(405, 'method_not_allowed', 'Metodo non consentito.')
  if (crossSite(req)) return gerr(403, 'forbidden', 'Richiesta non consentita.')

  const KEY = (env.GROQ_API_KEY || '').trim()
  if (!KEY) return gerr(500, 'not_configured', 'Il server non vede GROQ_API_KEY. Su Cloudflare aggiungila come Secret in Workers → Settings → Variables and Secrets (senza prefisso VITE_), poi rifai il deploy.')

  const stored = await readStored(env)
  if (!stored && !env.ADMIN_PASSWORD) return gerr(500, 'not_configured', 'Il server non vede né ADMIN_PASSWORD né una password salvata dal pannello. Controlla i secret su Cloudflare e rifai il deploy.')
  if (!(await checkToken(env, bearerOf(req), stored))) return gerr(401, 'session_expired', 'Sessione admin non valida o scaduta: esci e rientra dal pannello.')

  const raw = await req.text()
  if (raw.length > GROQ_MAX_BYTES) return gerr(413, 'too_large', 'Richiesta troppo grande.')
  let body
  try { body = JSON.parse(raw) } catch { return gerr(400, 'bad_json', 'JSON non valido.') }
  if (!body || typeof body.model !== 'string' || !Array.isArray(body.messages)) return gerr(400, 'bad_request', 'Richiesta non valida.')
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
    return gerr(502, 'upstream', 'Groq non raggiungibile dal server.')
  }
}
