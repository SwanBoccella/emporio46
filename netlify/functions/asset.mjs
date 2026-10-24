// Netlify Function pubblica (sola lettura): serve i file caricati dall'admin (immagini e modello 3D)
// salvati in Netlify Blobs. Ogni id è unico e immutabile, quindi la risposta è cacheabile per sempre.
//   /media/<id>                        → immagine (rewrite in _redirects)
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
