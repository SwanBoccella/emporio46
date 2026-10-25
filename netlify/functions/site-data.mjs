// Netlify Function pubblica (sola lettura): contenuti correnti del sito per tutti i visitatori.
// Sorgente: Netlify Database → Netlify Blobs → Gist (vedi netlify/lib/sitestore.mjs).
import { readSite } from '../lib/sitestore.mjs'

export default async (req) => {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })
  const cur = await readSite()
  if (!cur) return new Response(JSON.stringify({ error: 'empty' }), { status: 404, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
  const etag = `"${cur.rev || 'x'}"`
  // Risparmio crediti: la risposta resta nella CDN di Netlify (15 min + 24 h "stale-while-revalidate"), quindi la Function
  // (e le letture di Database/Blobs) parte solo ogni tanto, non a ogni visita. Il browser invece ricontrolla sempre (no-cache).
  // Quando l'admin salva, admin-api svuota la cache col tag 'site-data': le modifiche si vedono subito.
  const cdn = {
    'cache-control': 'public, max-age=0, must-revalidate',
    'netlify-cdn-cache-control': 'public, s-maxage=900, stale-while-revalidate=86400, durable',
    'cache-tag': 'site-data', 'netlify-cache-tag': 'site-data',
  }
  if (cur.rev && req.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers: { etag, ...cdn } })
  return new Response(cur.content, { status: 200, headers: {
    'content-type': 'application/json; charset=utf-8', etag, ...cdn, 'x-site-source': cur.source,
  } })
}
