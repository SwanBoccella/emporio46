// Netlify Function pubblica (sola lettura): contenuti correnti del sito per tutti i visitatori.
// Sorgente: Netlify Database → Netlify Blobs → Gist (vedi netlify/lib/sitestore.mjs).
import { readSite } from '../lib/sitestore.mjs'

export default async (req) => {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })
  const cur = await readSite()
  if (!cur) return new Response(JSON.stringify({ error: 'empty' }), { status: 404, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
  const etag = `"${cur.rev || 'x'}"`
  if (cur.rev && req.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers: { etag, 'cache-control': 'no-cache' } })
  return new Response(cur.content, { status: 200, headers: {
    'content-type': 'application/json; charset=utf-8', etag, 'cache-control': 'no-cache', 'x-site-source': cur.source,
  } })
}
