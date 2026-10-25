// Test del Worker con D1 e R2 simulati (nessuna rete). Esegui: npm run test:worker
import assert from 'node:assert'
import worker from '../worker/index.mjs'

// ── D1 finto minimale (supporta le query usate dal Worker) ──
function fakeD1() {
  const t = { site_data: new Map(), admin_auth: new Map() }
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    async first() {
      if (/FROM site_data/.test(sql)) return t.site_data.get('main') || null
      if (/FROM admin_auth/.test(sql)) { const r = t.admin_auth.get('admin'); return r ? (/SELECT hash FROM/.test(sql) ? { hash: r.hash } : r) : null }
      return null
    },
    async run() {
      if (/^UPDATE site_data/.test(sql)) {
        const [rev, data, at, old] = args, cur = t.site_data.get('main')
        if (cur && cur.rev === old) { t.site_data.set('main', { rev, data, updated_at: at }); return { meta: { changes: 1 } } }
        return { meta: { changes: 0 } }
      }
      if (/INSERT OR IGNORE INTO site_data/.test(sql)) {
        if (t.site_data.has('main')) return { meta: { changes: 0 } }
        const [rev, data, at] = args; t.site_data.set('main', { rev, data, updated_at: at }); return { meta: { changes: 1 } }
      }
      if (/INSERT OR REPLACE INTO admin_auth/.test(sql)) { const [salt, hash, iter, at] = args; t.admin_auth.set('admin', { salt, hash, iter, updated_at: at }); return { meta: { changes: 1 } } }
      return { meta: { changes: 0 } }
    },
  })
  return { prepare: (sql) => stmt(sql), batch: async () => [] }
}
// ── R2 finto ──
function fakeR2() {
  const m = new Map()
  return {
    async put(k, v) { m.set(k, typeof v === 'string' ? new TextEncoder().encode(v) : new Uint8Array(v)) },
    async get(k, o) {
      if (!m.has(k)) return null
      let b = m.get(k); if (o?.range) b = b.slice(o.range.offset, o.range.offset + o.range.length)
      return { body: b, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), json: async () => JSON.parse(new TextDecoder().decode(b)) }
    },
  }
}
const env = { DB: fakeD1(), FILES: fakeR2(), ADMIN_PASSWORD: 'una-password-molto-lunga-123', SESSION_SECRET: 'segreto-di-test', ASSETS: { fetch: async () => new Response('asset') } }
const call = (path, init = {}) => worker.fetch(new Request('https://emporio46.example' + path, init), env)
const post = (body, token) => call('/api/admin-api', { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) })

// 1. contenuti vuoti → 404
assert.equal((await call('/api/site-data')).status, 404); console.log('1 ok site-data vuoto')
// 2. login sbagliato/giusto
assert.equal((await post({ action: 'login', password: 'sbagliata' })).status, 401)
let r = await post({ action: 'login', password: env.ADMIN_PASSWORD }); assert.equal(r.status, 200)
let { token } = await r.json(); assert.ok(token.includes('.')); console.log('2 ok login')
// il client legge exp dal primo pezzo (atob su base64url)
const exp = JSON.parse(atob(token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))).exp; assert.ok(exp > Date.now()); console.log('3 ok formato token')
// 4. salvataggio senza token / con token
const data = { settings: { adminPassword: 'x', nome: 'Emporio' }, catalog: [{ id: 1, nome: 'Lampada & co', img: '/media/' + 'a'.repeat(32), visibile: true, stato: 'disponibile' }, { id: 2, nome: 'Venduta', img: '/catalog/x.jpg', visibile: true, stato: 'venduto' }], reviews: [], seo: {} }
assert.equal((await post({ action: 'save', data, baseRev: null })).status, 401)
r = await post({ action: 'save', data, baseRev: null }, token); assert.equal(r.status, 200); const s1 = await r.json(); assert.ok(s1.rev && s1.stores.includes('d1')); console.log('4 ok save')
// 5. conflitto con baseRev vecchio
assert.equal((await post({ action: 'save', data, baseRev: 'vecchia' }, token)).status, 409)
r = await post({ action: 'save', data, baseRev: s1.rev }, token); assert.equal(r.status, 200); console.log('5 ok conflitto + save successivo')
// 6. lettura pubblica con ETag, senza adminPassword
r = await call('/api/site-data'); const pub = await r.json(); assert.equal(r.status, 200); assert.equal(pub.settings.adminPassword, undefined); assert.equal(pub.settings.nome, 'Emporio')
assert.equal((await call('/api/site-data', { headers: { 'if-none-match': r.headers.get('etag') } })).status, 304); console.log('6 ok lettura + 304')
// 7. cambio password
r = await post({ action: 'change_password', current: env.ADMIN_PASSWORD, next: 'nuova-password-sicura-456' }, token); assert.equal(r.status, 200); const np = await r.json()
assert.equal((await post({ action: 'login', password: env.ADMIN_PASSWORD })).status, 401)
assert.equal((await post({ action: 'login', password: 'nuova-password-sicura-456' })).status, 200)
assert.equal((await post({ action: 'save', data, baseRev: 'x' }, token)).status, 401)    // vecchia sessione decaduta
token = np.token; assert.equal((await post({ action: 'save', data, baseRev: (await (await call('/api/site-data')).json()).rev }, token)).status, 200); console.log('7 ok cambio password')
// 8. upload binario immagine + lettura /media
const id = 'ab'.repeat(16)
const put = (idx, total, mime, bytes, tk = token) => call(`/api/asset-put?id=${id}&index=${idx}&total=${total}&mime=${encodeURIComponent(mime)}&name=t`, { method: 'PUT', headers: { authorization: 'Bearer ' + tk }, body: bytes })
assert.equal((await put(0, 1, 'image/png', new Uint8Array([1, 2, 3]), 'falso')).status, 401)
assert.equal((await put(0, 1, 'text/html', new Uint8Array([1]))).status, 400)
assert.equal((await put(0, 1, 'image/png', new Uint8Array([137, 80, 78, 71]))).status, 200)
r = await call('/media/' + id); assert.equal(r.status, 200); assert.equal(r.headers.get('content-type'), 'image/png'); console.log('8 ok upload immagine')
// 9. video a 2 pezzi + Range
const vid = 'cd'.repeat(16), CH = 3 * 1024 * 1024
const v0 = new Uint8Array(CH); v0.set([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70]); for (let i = 8; i < CH; i++) v0[i] = i % 251
const v1 = new Uint8Array(1000).map((_, i) => (i * 7) % 255)
const pv = (idx, b) => call(`/api/asset-put?id=${vid}&index=${idx}&total=2&mime=video%2Fmp4&name=v`, { method: 'PUT', headers: { authorization: 'Bearer ' + token }, body: b })
assert.equal((await pv(0, v0)).status, 200); assert.equal((await pv(1, v1)).status, 200)
r = await call('/media/' + vid, { headers: { range: `bytes=${CH - 4}-${CH + 5}` } }); assert.equal(r.status, 206)
const got = new Uint8Array(await r.arrayBuffer()); assert.equal(got.length, 10)
assert.deepEqual([...got.slice(0, 4)], [...v0.slice(CH - 4)]); assert.deepEqual([...got.slice(4)], [...v1.slice(0, 6)])
assert.equal(r.headers.get('content-range'), `bytes ${CH - 4}-${CH + 5}/${CH + 1000}`); console.log('9 ok video Range tra due pezzi')
assert.equal((await call('/media/' + 'ee'.repeat(16))).status, 404)
// 10. groq-proxy: senza token 401, senza chiave 500
assert.equal((await call('/api/groq-proxy', { method: 'POST', body: '{}' })).status, 500)
env.GROQ_API_KEY = 'gsk_test'
assert.equal((await call('/api/groq-proxy', { method: 'POST', body: '{}' })).status, 401); console.log('10 ok groq-proxy protetto')
// 11. sitemap e robots
r = await call('/sitemap.xml'); const xml = await r.text(); assert.match(xml, /<loc>https:\/\/emporio46\.example\/<\/loc>/); assert.match(xml, /Lampada &amp; co/); assert.ok(!xml.includes('x.jpg'))
assert.match(await (await call('/robots.txt')).text(), /Sitemap: https:\/\/emporio46\.example\/sitemap\.xml/); console.log('11 ok sitemap/robots')
// 12. route sconosciute
assert.equal((await call('/api/boh')).status, 404); assert.equal(await (await call('/qualunque')).text(), 'asset'); console.log('12 ok routing')
console.log('\nTutti i test del Worker passati')
