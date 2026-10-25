// Eseguito dopo `vite build` (vedi package.json): genera in dist/ i file per SEO e pubblicazione.
//   sitemap.xml  robots.txt  (+ meta canonical / og:url / og:image / twitter:image / link al manifest dentro dist/index.html)
// Dominio: SITE_URL (da impostare su Netlify col dominio definitivo, es. https://www.tuodominio.it),
// altrimenti URL di Netlify (dominio principale del sito). Se il sito non è in produzione (anteprime, branch)
// robots.txt blocca i motori di ricerca e _headers aggiunge X-Robots-Tag: noindex, così non finiscono su Google.
import { readFileSync, writeFileSync, existsSync, readdirSync, appendFileSync } from 'node:fs'
import { join } from 'node:path'

const DIST = 'dist'
const PUBLIC = 'public'
if (!existsSync(join(DIST, 'index.html'))) { console.error('[seo] dist/index.html non trovato: esegui prima la build'); process.exit(1) }

const clean = (u) => String(u || '').trim().replace(/\/+$/, '')
const isProd = !process.env.CONTEXT || process.env.CONTEXT === 'production'
const site = clean(process.env.SITE_URL) || clean(isProd ? process.env.URL : process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL) || 'http://localhost:5173'
if (site.startsWith('http://localhost')) console.warn('[seo] Nessun dominio trovato: imposta SITE_URL su Netlify (o usa la build di Netlify). Uso', site)
if (isProd && /\.netlify\.app$/.test(new URL(site).hostname)) console.warn('[seo] Dominio ancora *.netlify.app: dopo aver collegato il dominio vero imposta SITE_URL e rifai il deploy.')
const today = new Date().toISOString().slice(0, 10)
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// ── sitemap.xml: sito a pagina unica → una URL, con le foto del catalogo (sitemap immagini) ──
const imgs = existsSync(join(PUBLIC, 'catalog'))
  ? readdirSync(join(PUBLIC, 'catalog')).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort()
  : []
const caption = (f) => f.replace(/\.[^.]+$/, '').replace(/^\d+-/, '').replace(/-/g, ' ')
const imageXml = imgs.map((f) => `    <image:image>\n      <image:loc>${esc(`${site}/catalog/${f}`)}</image:loc>\n      <image:title>${esc(`Emporio 46 Firenze · ${caption(f)}`)}</image:title>\n    </image:image>`).join('\n')
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${esc(site)}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
${imageXml}
  </url>
</urlset>
`
writeFileSync(join(DIST, 'sitemap.xml'), sitemap)

// ── robots.txt ──
const robots = isProd
  ? `User-agent: *
Allow: /
Disallow: /.netlify/

Sitemap: ${site}/sitemap.xml
`
  : `# Anteprima / branch deploy: non indicizzare
User-agent: *
Disallow: /
`
writeFileSync(join(DIST, 'robots.txt'), robots)

// ── anteprime e branch: noindex anche via header ──
if (!isProd) {
  const h = join(DIST, '_headers')
  appendFileSync(h, `\n/*\n  X-Robots-Tag: noindex, nofollow\n`)
}

// ── index.html: tag che i crawler e le anteprime social leggono SENZA eseguire JavaScript ──
const ogImage = `${site}/og-image.jpg`
const tags = `    <link rel="canonical" href="${esc(site)}/" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta property="og:url" content="${esc(site)}/" />
    <meta property="og:image" content="${esc(ogImage)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Emporio 46 · Arredi vintage e bijoux a Firenze" />
    <meta name="twitter:image" content="${esc(ogImage)}" />
${isProd ? '' : '    <meta name="robots" content="noindex, nofollow" />\n'}`
const noscript = `    <noscript>
      <main style="font-family:Georgia,serif;max-width:640px;margin:48px auto;padding:0 20px;line-height:1.6;color:#2b1a12">
        <h1>Emporio 46 · Arredi vintage e bijoux a Firenze</h1>
        <p>Arredi vintage, lampade, specchi, complementi d'arredo e bijoux selezionati uno a uno.</p>
        <p>Via Giampaolo Orsini, 46/A · 50126 Firenze<br />Aperto da martedì a sabato, 10:00–13:00 e 16:00–19:30<br />Tel. +39 055 532 6258</p>
        <p><a href="https://www.instagram.com/emporio46firenze">Instagram</a> · <a href="https://wa.me/393756106713">WhatsApp</a></p>
        <p>Per vedere il sito attiva JavaScript nel browser.</p>
      </main>
    </noscript>
`
let html = readFileSync(join(DIST, 'index.html'), 'utf8')
if (!html.includes('data-seo-generated')) {
  html = html.replace('</head>', `    <!-- data-seo-generated -->\n${tags}  </head>`)
  html = html.replace(/<body([^>]*)>/, `<body$1>\n${noscript}`)
  writeFileSync(join(DIST, 'index.html'), html)
}
console.log(`[seo] ok · ${site} · ${isProd ? 'produzione' : 'NON produzione (noindex)'} · ${imgs.length} immagini in sitemap`)
