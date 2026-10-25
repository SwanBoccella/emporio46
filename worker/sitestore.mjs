// Archivio dei contenuti del sito (impostazioni, catalogo, recensioni, SEO):
//   1) Cloudflare D1 (tabella site_data)  — archivio principale
//   2) GitHub Gist (opzionale)            — copia di sicurezza e fonte da cui migrare i dati esistenti
// Scrittura: D1 (obbligatorio) + Gist se configurato. Lettura pubblica: D1; se vuoto o non disponibile, il Gist.
import { ensureSchema } from './db.mjs'

const GIST_FILE = 'mnt_data.json'
const GIST_MAX_CHARS = 900_000          // il Gist tronca i file > 1 MB
const gistId = (env) => env.GIST_ID || env.VITE_GIST_ID || ''
const revOf = (content) => { try { return JSON.parse(content)?.rev ?? null } catch { return null } }

async function dbRow(env) {
  await ensureSchema(env)
  return env.DB.prepare("SELECT rev, data, updated_at FROM site_data WHERE id = 'main'").first()
}

const ghHeaders = (token) => ({
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
  Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'emporio46-site',
  'Content-Type': 'application/json',
})
async function gistRead(env) {
  const id = gistId(env); if (!id) return null
  const res = await fetch(`https://api.github.com/gists/${encodeURIComponent(id)}`, { headers: ghHeaders(env.GIST_TOKEN) })
  if (!res.ok) throw new Error(`gist_read_${res.status}`)
  const file = (await res.json())?.files?.[GIST_FILE]
  let content = file?.content
  if (file?.truncated && file?.raw_url) content = await (await fetch(file.raw_url)).text()
  return content || null
}
async function gistWrite(env, content) {
  const id = gistId(env), token = env.GIST_TOKEN
  if (!id || !token) throw new Error('gist_not_configured')
  if (content.length > GIST_MAX_CHARS) throw new Error('gist_too_large')
  const res = await fetch(`https://api.github.com/gists/${encodeURIComponent(id)}`, {
    method: 'PATCH', headers: ghHeaders(token), body: JSON.stringify({ files: { [GIST_FILE]: { content } } }),
  })
  if (!res.ok) throw new Error(`gist_write_${res.status}`)
}

const safe = async (fn) => { try { return await fn() } catch { return null } }

/** Lettura per i visitatori: D1, altrimenti il Gist. */
export async function readSite(env) {
  const row = await safe(() => dbRow(env))
  if (row?.data) return { content: row.data, source: 'd1', rev: row.rev, updatedAt: row.updated_at }
  const g = await safe(() => gistRead(env))
  return g ? { content: g, source: 'gist', rev: revOf(g), updatedAt: null } : null
}

/** Scrive su D1 (con controllo di concorrenza atomico) e, se configurato, sul Gist. */
export async function writeSite(env, content, rev) {
  const written = [], failed = []
  let conflict = false
  try {
    const cur = await dbRow(env)
    const now = new Date().toISOString()
    const stmt = cur
      ? env.DB.prepare("UPDATE site_data SET rev = ?, data = ?, updated_at = ? WHERE id = 'main' AND rev = ?").bind(rev, content, now, cur.rev)
      : env.DB.prepare("INSERT OR IGNORE INTO site_data (id, rev, data, updated_at) VALUES ('main', ?, ?, ?)").bind(rev, content, now)
    const r = await stmt.run()
    if ((r?.meta?.changes ?? 0) === 0) conflict = true      // un altro salvataggio è arrivato nel frattempo
    else written.push('d1')
  } catch (e) { failed.push({ store: 'd1', error: String(e?.message || e) }) }
  if (written.includes('d1') && gistId(env) && env.GIST_TOKEN) {
    try { await gistWrite(env, content); written.push('gist') } catch (e) { failed.push({ store: 'gist', error: String(e?.message || e) }) }
  }
  return { written, failed, conflict, ok: written.includes('d1') }
}
