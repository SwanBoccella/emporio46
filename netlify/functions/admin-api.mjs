// Netlify Function — login admin + scrittura sicura del Gist.
// Variabili d'ambiente (Netlify → Site configuration → Environment variables, SENZA prefisso VITE_):
//   ADMIN_PASSWORD  password del pannello (scegline una lunga, 16+ caratteri)
//   GIST_TOKEN      token GitHub classic con SOLO lo scope "gist"
//   GIST_ID         (opzionale se hai già VITE_GIST_ID) id del Gist
import { randomBytes } from 'node:crypto'
import { readSite, writeSite } from '../lib/sitestore.mjs'
import { readStored, verifyPassword, saveNewPassword, makeToken, checkToken, MIN_PASSWORD } from '../lib/auth.mjs'

const FILE = 'mnt_data.json'
const SESSION_MS = 12 * 60 * 60 * 1000
const VIDEO_CHUNK = 3 * 1024 * 1024   // deve coincidere con CHUNK in src/utils/adminApi.ts
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

  const raw = await req.text()
  if (raw.length > 5_800_000) return json(413, { error: 'too_large', message: 'Richiesta troppo grande.' })
  let body
  try { body = JSON.parse(raw) } catch { return json(400, { error: 'bad_json' }) }
  if (body.action !== 'asset_put' && raw.length > 3_000_000) return json(413, { error: 'too_large', message: 'Dati troppo grandi.' })

  const stored = await readStored()
  if (!ADMIN && !stored) return json(500, { error: 'not_configured', message: 'Manca ADMIN_PASSWORD nelle variabili Netlify.' })

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

  // ── UPLOAD FILE (immagini, video di sfondo e modello 3D) su Netlify Blobs, a pezzi da ~3 MB ──
  if (body.action === 'asset_put') {
    const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
    if (!checkToken(bearer, stored)) return json(401, { error: 'unauthorized' })
    const { id, index, total, mime, name, data } = body
    if (typeof id !== 'string' || !/^[a-f0-9]{24,48}$/.test(id)) return json(400, { error: 'bad_id' })
    if (!Number.isInteger(index) || !Number.isInteger(total) || total < 1 || total > 40 || index < 0 || index >= total) return json(400, { error: 'bad_part' })
    const isModel = mime === 'model/gltf-binary'
    const isVideo = mime === 'video/mp4' || mime === 'video/webm'
    if (!isModel && !isVideo && !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mime)) return json(400, { error: 'bad_mime', message: 'Tipo di file non consentito.' })
    if (!isModel && !isVideo && total !== 1) return json(400, { error: 'bad_part', message: 'Le immagini devono stare in un solo pezzo.' })
    if (isVideo && total > 12) return json(413, { error: 'too_large', message: 'Video troppo pesante (massimo ~36 MB): comprimilo prima di caricarlo.' })
    if (typeof data !== 'string' || !data.length) return json(400, { error: 'bad_data' })
    let buf
    try { buf = Buffer.from(data, 'base64') } catch { return json(400, { error: 'bad_data' }) }
    if (!buf.length || buf.length > 4_200_000) return json(413, { error: 'too_large', message: 'Pezzo troppo grande.' })
    if (index === 0 && isModel && buf.subarray(0, 4).toString('latin1') !== 'glTF') return json(400, { error: 'bad_glb', message: 'Il file non è un .glb valido.' })
    if (isVideo) {
      // i pezzi (tranne l'ultimo) devono essere esattamente da 3 MB: serve a calcolare gli intervalli di byte (Range) in lettura
      if (index < total - 1 && buf.length !== VIDEO_CHUNK) return json(400, { error: 'bad_part', message: 'Pezzo video di dimensione non valida.' })
      if (index === 0) {
        const mp4 = buf.subarray(4, 8).toString('latin1') === 'ftyp'
        const webm = buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3
        if ((mime === 'video/mp4' && !mp4) || (mime === 'video/webm' && !webm)) return json(400, { error: 'bad_video', message: 'Il file non è un video MP4/WebM valido.' })
      }
    }
    try {
      const { getStore } = await import('@netlify/blobs')
      const store = getStore({ name: 'emporio46-assets', consistency: 'strong' })
      await store.set(`${id}/${index}`, buf)
      if (index === total - 1) {
        const meta = { mime, total, name: String(name || '').slice(0, 120), at: new Date().toISOString() }
        if (isVideo) { meta.chunk = VIDEO_CHUNK; meta.size = (total - 1) * VIDEO_CHUNK + buf.length }
        await store.setJSON(`${id}/meta`, meta)
      }
    } catch { return json(500, { error: 'store_failed', message: 'Archivio file (Netlify Blobs) non disponibile. Fai un nuovo deploy.' }) }
    return json(200, { ok: true })
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

    // Controllo di concorrenza: se un altro dispositivo ha salvato nel frattempo, non sovrascrivere
    const cur = await readSite()
    if (cur?.rev && body.baseRev !== cur.rev) return json(409, { error: 'conflict', rev: cur.rev })

    const rev = `${Date.now()}-${randomBytes(4).toString('hex')}`
    const content = JSON.stringify({ ...clean, rev, updatedAt: new Date().toISOString() })
    if (content.length > 3_000_000) return json(413, { error: 'too_large', message: 'Il contenuto è troppo grande: riduci testi o dati.' })

    // Scrive su Netlify Database + Netlify Blobs (+ copia sul Gist se configurato)
    const res = await writeSite(content, rev)
    if (!res.ok) return json(502, { error: 'store_write', message: 'Salvataggio non riuscito su Netlify Database/Blobs. ' + res.failed.map(f => `${f.store}: ${f.error}`).join('; ') })
    return json(200, { ok: true, rev, stores: res.written, warnings: res.failed })
  }

  return json(400, { error: 'unknown_action' })
}
