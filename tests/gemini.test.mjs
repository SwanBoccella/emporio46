// Test del client Gemini con fetch simulato. Esegui: npm run test:gemini
import assert from 'node:assert'
const store = { gemini_api_key: 'AIza' + 'a'.repeat(35) }
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v }, removeItem: k => { delete store[k] } }
globalThis.window = { location: { href: 'https://emporio46.it/', origin: 'https://emporio46.it' } }
globalThis.Image = class { set src(v) { this.naturalWidth = 3000; this.naturalHeight = 1500; setTimeout(() => this.onload && this.onload(), 0) } }
let canvasSize
globalThis.document = { createElement: () => { const c = { getContext: () => ({ fillRect() {}, drawImage() {} }), toDataURL: () => 'data:image/jpeg;base64,QUJD' }; canvasSize = c; return c } }
let calls = []
const script = fn => { globalThis.fetch = async (url, init) => { const body = JSON.parse(init.body); calls.push({ url, headers: init.headers, body }); return fn(body, calls.length, url) } }
const ok = (text, finish = 'STOP') => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => ({ candidates: [{ content: { parts: [{ thought: true, text: 'ragiono' }, { text }] }, finishReason: finish }] }) })
const bad = (status, message, st = '') => ({ ok: false, status, headers: { get: () => null }, json: async () => ({ error: { code: status, message, status: st } }) })
const g = await import('../src/utils/gemini.ts')
const sys = 'Sei un perito'

// 1. chiamata diretta: URL, header chiave, systemInstruction, thinkingConfig, JSON mode; le parti "thought" sono scartate
calls = []; script(() => ok('{"a":1}'))
let r = await g.geminiExpertTextJson(sys, 'x')
assert.equal(r.a, 1)
assert.match(calls[0].url, /\/v1beta\/models\/gemini-3\.8-flash:generateContent$/)
assert.equal(calls[0].headers['x-goog-api-key'], store.gemini_api_key)
assert.equal(calls[0].body.systemInstruction.parts[0].text, sys)
assert.equal(calls[0].body.generationConfig.thinkingConfig.thinkingLevel, 'medium')
assert.equal(calls[0].body.generationConfig.responseMimeType, 'application/json')
assert.equal('temperature' in calls[0].body.generationConfig, false)
console.log('1 ok')

// 2. parametro rifiutato (con un modello dedicato, perché la capacità rifiutata viene ricordata per modello)
store.gemini_model = 'gemini-test-2'
calls = []; script(b => b.generationConfig.thinkingConfig ? bad(400, 'Invalid JSON payload received. Unknown name "thinkingConfig"', 'INVALID_ARGUMENT') : ok('ciao'))
let t = await g.geminiText('x'); assert.equal(t, 'ciao'); assert.ok(calls.length >= 2); assert.ok(!calls.at(-1).body.generationConfig.thinkingConfig)
const n0 = calls.length; t = await g.geminiText('x'); assert.equal(calls.length - n0, 1, 'capacità rifiutata ricordata: una sola chiamata')
// un'altra chiamata (senza JSON, con ragionamento) non perde per strada altre funzioni
calls = []; script(() => ok('ciao')); await g.geminiExpertText(sys, 'x'); assert.ok(!calls[0].body.generationConfig.thinkingConfig, 'il modello rifiuta il ragionamento: non lo si reinvia')
console.log('2 ok')
store.gemini_model = 'gemini-test-1'

// 3. modello dismesso (404) -> successivo; 429 -> successivo senza ritentare
calls = []; script(b => /gemini-test-1/.test(calls.at(-1).url) ? bad(404, 'models/gemini-test-1 is not found for API version v1beta', 'NOT_FOUND') : ok('ok2'))
t = await g.geminiText('x'); assert.equal(t, 'ok2'); assert.match(calls.at(-1).url, /gemini-3\.8-flash/)
calls = []; script(() => (/gemini-test-1/.test(calls.at(-1).url) ? bad(429, 'quota', 'RESOURCE_EXHAUSTED') : ok('ok3')))
t = await g.geminiText('x'); assert.equal(t, 'ok3'); assert.equal(calls.filter(c => /gemini-test-1/.test(c.url)).length, 1)
console.log('3 ok')
delete store.gemini_model

// 4. 503 -> ritenta lo stesso modello e poi riesce
calls = []; script((b, n) => n === 1 ? bad(503, 'The model is overloaded', 'UNAVAILABLE') : ok('ok4'))
t = await g.geminiText('x'); assert.equal(t, 'ok4'); assert.equal(calls[0].url, calls[1].url)
console.log('4 ok')

// 5. chiave non valida -> errore chiaro, nessun giro inutile
calls = []; script(() => bad(400, 'API key not valid. Please pass a valid API key.', 'INVALID_ARGUMENT'))
await assert.rejects(() => g.geminiText('x'), e => /Chiave Gemini non valida/.test(e.message)); assert.equal(calls.length, 1)
console.log('5 ok')

// 6. risposta bloccata dai filtri
calls = []; script(() => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => ({ promptFeedback: { blockReason: 'SAFETY' } }) }))
await assert.rejects(() => g.geminiText('x'), e => /bloccato/.test(e.message)); assert.equal(calls.length, 1)
console.log('6 ok')

// 7. testo vuoto troncato (MAX_TOKENS) -> raddoppia il budget
calls = []; script((b, n) => n === 1 ? ok('', 'MAX_TOKENS') : ok('fatto'))
t = await g.geminiText('x', 100); assert.equal(t, 'fatto'); assert.ok(calls[1].body.generationConfig.maxOutputTokens > calls[0].body.generationConfig.maxOutputTokens)
console.log('7 ok')

// 8. visione: l'immagine parte come inlineData base64 (JPEG) e la richiesta ha system + prompt
calls = []; script(() => ok('{"macro_categoria":"arte"}'))
r = await g.geminiExpertVisionJson('/catalog/x.jpg', sys, 'guarda'); assert.equal(r.macro_categoria, 'arte')
const parts = calls[0].body.contents[0].parts
assert.deepEqual(parts[0], { inlineData: { mimeType: 'image/jpeg', data: 'QUJD' } }); assert.equal(parts[1].text, 'guarda')
assert.equal(calls[0].body.generationConfig.thinkingConfig.thinkingLevel, 'high')
console.log('8 ok')

// 9. senza chiave nel browser ma con sessione admin -> passa dal proxy; "high" viene limitato a "medium"
delete store.gemini_api_key
const payload = Buffer.from(JSON.stringify({ exp: Date.now() + 3600_000 })).toString('base64url')
store.mnt_admin_token = payload + '.firma'
calls = []; script(() => ok('{"x":1}'))
await g.geminiExpertVisionJson('/a.jpg', sys, 'p')
assert.equal(calls[0].url, '/.netlify/functions/gemini-proxy'); assert.equal(calls[0].headers.Authorization, 'Bearer ' + store.mnt_admin_token)
assert.equal(calls[0].body.model, 'gemini-3.8-flash'); assert.equal(calls[0].body.request.generationConfig.thinkingConfig.thinkingLevel, 'medium')
console.log('9 ok')

// 10. proxy: chiave server mancante e sessione scaduta -> messaggi dedicati, nessun giro sui modelli
calls = []; script(() => bad(500, 'Il server non vede GEMINI_API_KEY.', 'not_configured'))
await assert.rejects(() => g.geminiText('x'), e => /GEMINI_API_KEY/.test(e.message) && /Impostazioni/.test(e.message))
calls = []; script(() => ({ ok: false, status: 401, headers: { get: () => null }, json: async () => ({ error: { code: 'session_expired', message: 'Sessione admin non valida o scaduta' } }) }))
await assert.rejects(() => g.geminiText('x'), e => /Sessione admin scaduta/.test(e.message)); assert.equal(calls.length, 1)
console.log('10 ok')

// 11. né chiave né sessione -> messaggio chiaro, nessuna richiesta
delete store.mnt_admin_token; calls = []; script(() => ok('x'))
await assert.rejects(() => g.geminiText('x'), e => /GEMINI_API_KEY/.test(e.message)); assert.equal(calls.length, 0)
console.log('11 ok')
