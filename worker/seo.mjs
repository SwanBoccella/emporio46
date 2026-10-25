// sitemap.xml e robots.txt generati dal Worker con il dominio realmente usato dalla richiesta
// (funziona su *.workers.dev e sul dominio personalizzato, senza configurare nulla).
// La sitemap include la home con la data dell'ultimo salvataggio dal pannello e le foto del catalogo (image sitemap).
import { readSite } from './sitestore.mjs'

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
const xmlHeaders = { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' }

export async function handleSitemap(req, env) {
  const origin = new URL(req.url).origin
  let lastmod = '', images = []
  try {
    const cur = await readSite(env)
    if (cur) {
      const data = JSON.parse(cur.content)
      lastmod = (data.updatedAt || cur.updatedAt || '').slice(0, 10)
      const seen = new Set()
      for (const it of Array.isArray(data.catalog) ? data.catalog : []) {
        if (!it || it.visibile === false || it.stato === 'venduto') continue
        for (const src of [it.img, ...(Array.isArray(it.images) ? it.images : [])]) {
          if (typeof src !== 'string' || src.startsWith('data:')) continue
          let abs = ''
          if (src.startsWith('/')) abs = origin + src
          else if (/^https:\/\//i.test(src)) abs = src
          if (!abs || seen.has(abs)) continue
          seen.add(abs)
          images.push({ loc: abs, title: String(it.nome || '').slice(0, 120) })
          if (images.length >= 1000) break
        }
        if (images.length >= 1000) break
      }
    }
  } catch { /* sitemap minima */ }
  const imgXml = images.map((i) => `    <image:image><image:loc>${esc(i.loc)}</image:loc>${i.title ? `<image:title>${esc(i.title)}</image:title>` : ''}</image:image>`).join('\n')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${esc(origin)}/</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>${imgXml ? '\n' + imgXml : ''}
  </url>
</urlset>
`
  return new Response(xml, { headers: xmlHeaders })
}

export function handleRobots(req) {
  const origin = new URL(req.url).origin
  const txt = `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml\n`
  return new Response(txt, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } })
}
