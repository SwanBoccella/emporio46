// Archivio dei contenuti del sito (impostazioni, catalogo, recensioni, SEO), in ordine di priorità:
//   1) Netlify Database (Postgres, @netlify/database) — se attivo sul sito
//   2) Netlify Blobs                                  — sempre disponibile su Netlify
//   3) GitHub Gist                                    — copia di sicurezza / fallback / migrazione dei dati esistenti
// Scrittura: su tutti gli archivi configurati. Lettura pubblica: il più recente tra Database e Blobs;
// il Gist si legge solo se i primi due sono vuoti o non disponibili.
const GIST_FILE = 'mnt_data.json'
const BLOB_STORE = 'emporio46-data'
const BLOB_KEY = 'site-data'
const GIST_MAX_CHARS = 900_000          // il Gist tronca i file > 1 MB

const revTs = (r) => parseInt(String(r || '').split('-')[0], 10) || 0
const revOf = (content) => { try { return JSON.parse(content)?.rev ?? null } catch { return null } }
const gistId = () => process.env.GIST_ID || process.env.VITE_GIST_ID || ''

// ── Netlify Database ──
async function dbClient() {
  if (!process.env.NETLIFY_DB_URL) return null
  try { const { getDatabase } = await import('@netlify/database'); return getDatabase() } catch { return null }
}
async function dbRead() {
  const db = await dbClient(); if (!db) return null
  const rows = await db.sql`SELECT data FROM site_data WHERE id = 'main'`
  const d = rows?.[0]?.data
  if (!d) return null
  return typeof d === 'string' ? d : JSON.stringify(d)
}
async function dbWrite(content, rev) {
  const db = await dbClient(); if (!db) throw new Error('database_not_configured')
  await db.sql`INSERT INTO site_data (id, rev, data) VALUES ('main', ${rev}, ${content}::jsonb)
    ON CONFLICT (id) DO UPDATE SET rev = EXCLUDED.rev, data = EXCLUDED.data, updated_at = NOW()`
}

// ── Netlify Blobs ──
async function blobStore() {
  const { getStore } = await import('@netlify/blobs')
  return getStore({ name: BLOB_STORE, consistency: 'strong' })
}
async function blobRead() { return (await (await blobStore()).get(BLOB_KEY, { type: 'text' })) || null }
async function blobWrite(content) { await (await blobStore()).set(BLOB_KEY, content) }

// ── GitHub Gist ──
const ghHeaders = (token) => ({
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
  Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'emporio46-site',
  'Content-Type': 'application/json',
})
async function gistRead() {
  const id = gistId(); if (!id) return null
  const res = await fetch(`https://api.github.com/gists/${encodeURIComponent(id)}`, { headers: ghHeaders(process.env.GIST_TOKEN) })
  if (!res.ok) throw new Error(`gist_read_${res.status}`)
  const file = (await res.json())?.files?.[GIST_FILE]
  let content = file?.content
  if (file?.truncated && file?.raw_url) content = await (await fetch(file.raw_url)).text()
  return content || null
}
async function gistWrite(content) {
  const id = gistId(), token = process.env.GIST_TOKEN
  if (!id || !token) throw new Error('gist_not_configured')
  if (content.length > GIST_MAX_CHARS) throw new Error('gist_too_large')
  const res = await fetch(`https://api.github.com/gists/${encodeURIComponent(id)}`, {
    method: 'PATCH', headers: ghHeaders(token), body: JSON.stringify({ files: { [GIST_FILE]: { content } } }),
  })
  if (!res.ok) throw new Error(`gist_write_${res.status}`)
}

const safe = async (fn) => { try { return await fn() } catch { return null } }

/** Lettura per i visitatori: il più recente tra Database e Blobs, altrimenti il Gist. */
export async function readSite() {
  const [d, b] = await Promise.all([safe(dbRead), safe(blobRead)])
  const cands = [d && { content: d, source: 'database' }, b && { content: b, source: 'blobs' }].filter(Boolean)
  if (cands.length) {
    cands.sort((x, y) => revTs(revOf(y.content)) - revTs(revOf(x.content)))
    return { ...cands[0], rev: revOf(cands[0].content) }
  }
  const g = await safe(gistRead)
  return g ? { content: g, source: 'gist', rev: revOf(g) } : null
}

/** Scrive su tutti gli archivi configurati. Riuscito = almeno Database o Blobs aggiornato. */
export async function writeSite(content, rev) {
  const written = [], failed = []
  const dbOn = !!process.env.NETLIFY_DB_URL
  const jobs = [
    ...(dbOn ? [['database', () => dbWrite(content, rev)]] : []),
    ['blobs', () => blobWrite(content)],
    ...(gistId() && process.env.GIST_TOKEN ? [['gist', () => gistWrite(content)]] : []),
  ]
  await Promise.all(jobs.map(async ([name, fn]) => {
    try { await fn(); written.push(name) } catch (e) { failed.push({ store: name, error: String(e?.message || e) }) }
  }))
  return { written, failed, ok: written.includes('database') || written.includes('blobs') }
}
