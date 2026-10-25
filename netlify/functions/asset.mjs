// Netlify Function pubblica (sola lettura): serve i file caricati dall'admin (immagini, video di sfondo e modello 3D)
// salvati in Netlify Blobs. Ogni id è unico e immutabile, quindi la risposta è cacheabile per sempre.
//   /media/<id>                        → immagine o video (rewrite in _redirects); i video supportano Range (206)
//   /.netlify/functions/asset?id=<id>&part=<n>   → n-esimo pezzo (usato per il .glb)
export default async (req) => {
  const u = new URL(req.url)
  const id = u.searchParams.get('id') || ''
  const part = parseInt(u.searchParams.get('part') || '0', 10)
  if (!/^[a-f0-9]{24,48}$/.test(id) || !Number.isInteger(part) || part < 0 || part > 40) return new Response('Not found', { status: 404 })
  try {
    const { getStore } = await import('@netlify/blobs')
    const store = getStore({ name: 'emporio46-assets', consistency: 'strong' })
    const meta = await store.get(`${id}/meta`, { type: 'json' })
    if (!meta || part >= meta.total) return new Response('Not found', { status: 404 })
    if (meta.mime === 'video/mp4' || meta.mime === 'video/webm') return await serveVideo(req, store, id, meta)
    const buf = await store.get(`${id}/${part}`, { type: 'arrayBuffer' })
    if (!buf) return new Response('Not found', { status: 404 })
    return new Response(buf, { status: 200, headers: {
      'content-type': meta.mime,
      'cache-control': 'public, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
      'x-asset-parts': String(meta.total),
    } })
  } catch { return new Response('Archivio non disponibile', { status: 503, headers: { 'cache-control': 'no-store' } }) }
}

// Video: risposta a intervalli di byte (Range). Safari/iOS non riproduce un video se il server non risponde 206.
// Ogni risposta è limitata a ~4 MB (le Function sincrone arrivano a 6 MB): il browser richiede gli intervalli successivi da solo.
const WINDOW = 4 * 1024 * 1024
async function serveVideo(req, store, id, meta) {
  const size = Number(meta.size), chunk = Number(meta.chunk)
  if (!size || !chunk) return new Response('Not found', { status: 404 })
  let start = 0, end = size - 1, ranged = false
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') || '')
  if (m && (m[1] || m[2])) {
    ranged = true
    if (m[1] === '') { start = Math.max(0, size - Number(m[2])) }
    else { start = Number(m[1]); if (m[2] !== '') end = Math.min(Number(m[2]), size - 1) }
    if (start > end || start >= size) return new Response('Range Not Satisfiable', { status: 416, headers: { 'content-range': `bytes */${size}` } })
  }
  if (end - start + 1 > WINDOW) { end = start + WINDOW - 1; ranged = true }
  const first = Math.floor(start / chunk), last = Math.floor(end / chunk)
  const pieces = []
  for (let p = first; p <= last; p++) {
    const b = await store.get(`${id}/${p}`, { type: 'arrayBuffer' })
    if (!b) return new Response('Not found', { status: 404 })
    const from = p === first ? start - p * chunk : 0
    const to = p === last ? end - p * chunk + 1 : b.byteLength
    pieces.push(new Uint8Array(b, from, to - from))
  }
  const body = new Uint8Array(end - start + 1)
  let off = 0
  for (const u of pieces) { body.set(u, off); off += u.byteLength }
  const headers = {
    'content-type': meta.mime,
    'content-length': String(body.byteLength),
    'accept-ranges': 'bytes',
    'cache-control': 'public, max-age=31536000, immutable',
    'x-content-type-options': 'nosniff',
  }
  if (ranged) headers['content-range'] = `bytes ${start}-${end}/${size}`
  return new Response(body, { status: ranged ? 206 : 200, headers })
}
