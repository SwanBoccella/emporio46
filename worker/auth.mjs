// Autenticazione admin (Web Crypto, nessuna dipendenza). La password iniziale è il secret ADMIN_PASSWORD.
// Dal pannello si può cambiare: la nuova password viene salvata come hash PBKDF2-SHA256 in D1 (mai in chiaro)
// e da quel momento sostituisce ADMIN_PASSWORD. Per tornare alla password del secret imposta ADMIN_PASSWORD_FORCE_ENV=1.
import { ensureSchema } from './db.mjs'

export const SESSION_MS = 12 * 60 * 60 * 1000
export const MIN_PASSWORD = 12
const ITER = 100_000   // massimo consentito da Web Crypto nei Worker

const enc = new TextEncoder()
const toHex = (u8) => Array.from(u8, (b) => b.toString(16).padStart(2, '0')).join('')
const fromHex = (h) => Uint8Array.from(h.match(/../g) || [], (x) => parseInt(x, 16))
const toB64u = (u8) => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromB64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

function timingEq(a, b) {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]
  return d === 0
}
const sha256 = async (s) => new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(String(s))))
export const safeEq = async (a, b) => timingEq(await sha256(a), await sha256(b))

async function pbkdf2(pw, saltHex, iter) {
  const key = await crypto.subtle.importKey('raw', enc.encode(String(pw)), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations: iter }, key, 512)
  return new Uint8Array(bits)
}

export async function readStored(env) {
  if (env.ADMIN_PASSWORD_FORCE_ENV === '1') return null
  try {
    await ensureSchema(env)
    const r = await env.DB.prepare("SELECT salt, hash, iter FROM admin_auth WHERE id = 'admin'").first()
    return r && typeof r.hash === 'string' && typeof r.salt === 'string' ? r : null
  } catch { return null }
}

export async function verifyPassword(pw, stored, env) {
  if (typeof pw !== 'string' || !pw || pw.length > 500) return false
  if (stored) return timingEq(await pbkdf2(pw, stored.salt, stored.iter || ITER), fromHex(stored.hash))
  return safeEq(pw, env.ADMIN_PASSWORD || '')
}

// Salva la nuova password. Lancia un errore se D1 non è disponibile.
export async function saveNewPassword(env, pw) {
  try { await ensureSchema(env) } catch { throw new Error('store_unavailable') }
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)))
  const hash = toHex(await pbkdf2(pw, salt, ITER))
  const rec = { salt, hash, iter: ITER }
  await env.DB.prepare("INSERT OR REPLACE INTO admin_auth (id, salt, hash, iter, updated_at) VALUES ('admin', ?, ?, ?, ?)")
    .bind(salt, hash, ITER, new Date().toISOString()).run()
  const back = await env.DB.prepare("SELECT hash FROM admin_auth WHERE id = 'admin'").first()   // verifica la scrittura
  if (!back || back.hash !== hash) throw new Error('store_verify')
  return rec
}

// Il segreto di firma cambia quando cambia la password: le vecchie sessioni (altri dispositivi) decadono.
// SESSION_SECRET è opzionale ma consigliato (stringa casuale lunga); in mancanza si usa GIST_TOKEN.
const secret = (env, stored) => `${env.SESSION_SECRET || env.GIST_TOKEN || ''}|${stored ? stored.hash : env.ADMIN_PASSWORD}`
async function sign(env, data, stored) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret(env, stored)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return toB64u(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data))))
}

export async function makeToken(env, stored) {
  const n = toHex(crypto.getRandomValues(new Uint8Array(6)))
  const p = toB64u(enc.encode(JSON.stringify({ exp: Date.now() + SESSION_MS, n })))
  return `${p}.${await sign(env, p, stored)}`
}

export async function checkToken(env, t, stored) {
  if (!t || typeof t !== 'string') return false
  const [p, s] = t.split('.')
  if (!p || !s || !(await safeEq(await sign(env, p, stored), s))) return false
  try { return JSON.parse(new TextDecoder().decode(fromB64u(p))).exp > Date.now() } catch { return false }
}
