// Autenticazione admin condivisa dalle Netlify Function (admin-api, groq-proxy).
// La password iniziale è la variabile ADMIN_PASSWORD. Dal pannello si può cambiare: la nuova password
// viene salvata come hash scrypt (mai in chiaro) in Netlify Blobs, un archivio privato lato server,
// e da quel momento sostituisce ADMIN_PASSWORD. Per tornare alla password di Netlify imposta
// ADMIN_PASSWORD_FORCE_ENV=1 (e rifai il deploy).
import { createHmac, createHash, timingSafeEqual, randomBytes, scryptSync } from 'node:crypto'

export const SESSION_MS = 12 * 60 * 60 * 1000
export const MIN_PASSWORD = 12

const digest = (s) => createHash('sha256').update(String(s)).digest()
export const safeEq = (a, b) => timingSafeEqual(digest(a), digest(b))

async function getAuthStore() {
  try {
    const { getStore } = await import('@netlify/blobs')
    return getStore({ name: 'emporio46-auth', consistency: 'strong' })
  } catch { return null }
}

export async function readStored() {
  if (process.env.ADMIN_PASSWORD_FORCE_ENV === '1') return null
  const store = await getAuthStore()
  if (!store) return null
  try {
    const v = await store.get('admin', { type: 'json' })
    return v && typeof v.hash === 'string' && typeof v.salt === 'string' ? v : null
  } catch { return null }
}

const scrypt = (pw, saltHex) => scryptSync(String(pw), Buffer.from(saltHex, 'hex'), 64)

export async function verifyPassword(pw, stored) {
  if (typeof pw !== 'string' || !pw || pw.length > 500) return false
  if (stored) {
    const a = scrypt(pw, stored.salt), b = Buffer.from(stored.hash, 'hex')
    return a.length === b.length && timingSafeEqual(a, b)
  }
  return safeEq(pw, process.env.ADMIN_PASSWORD || '')
}

// Salva la nuova password. Lancia un errore se l'archivio non è disponibile.
export async function saveNewPassword(pw) {
  const store = await getAuthStore()
  if (!store) throw new Error('store_unavailable')
  const salt = randomBytes(16).toString('hex')
  const rec = { salt, hash: scrypt(pw, salt).toString('hex'), updatedAt: new Date().toISOString() }
  await store.setJSON('admin', rec)
  const back = await store.get('admin', { type: 'json' })        // verifica la scrittura
  if (!back || back.hash !== rec.hash) throw new Error('store_verify')
  return rec
}

// Il segreto di firma cambia quando cambia la password: le vecchie sessioni (altri dispositivi) decadono.
const secret = (stored) => `${process.env.GIST_TOKEN}|${stored ? stored.hash : process.env.ADMIN_PASSWORD}`
const sign = (data, stored) => createHmac('sha256', secret(stored)).update(data).digest('base64url')

export function makeToken(stored) {
  const p = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_MS, n: randomBytes(6).toString('hex') })).toString('base64url')
  return `${p}.${sign(p, stored)}`
}

export function checkToken(t, stored) {
  if (!t || typeof t !== 'string') return false
  const [p, s] = t.split('.')
  if (!p || !s || !safeEq(sign(p, stored), s)) return false
  try { return JSON.parse(Buffer.from(p, 'base64url').toString()).exp > Date.now() } catch { return false }
}
