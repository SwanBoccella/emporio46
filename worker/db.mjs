// Cloudflare D1: creazione automatica dello schema al primo utilizzo (CREATE TABLE IF NOT EXISTS è idempotente).
// Lo stesso schema è in migrations/0001_init.sql, per chi preferisce `wrangler d1 migrations apply`.
let ready = null

export function ensureSchema(env) {
  if (!env.DB) return Promise.reject(new Error('d1_not_bound'))
  if (!ready) {
    ready = env.DB.batch([
      env.DB.prepare('CREATE TABLE IF NOT EXISTS site_data (id TEXT PRIMARY KEY, rev TEXT NOT NULL, data TEXT NOT NULL, updated_at TEXT NOT NULL)'),
      env.DB.prepare('CREATE TABLE IF NOT EXISTS admin_auth (id TEXT PRIMARY KEY, salt TEXT NOT NULL, hash TEXT NOT NULL, iter INTEGER NOT NULL, updated_at TEXT NOT NULL)'),
    ]).catch((e) => { ready = null; throw e })
  }
  return ready
}
