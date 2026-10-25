import assert from 'node:assert'
const store = { groq_api_key: 'gsk_' + 'a'.repeat(30) }
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k,v)=>{store[k]=v}, removeItem: k=>{delete store[k]} }
globalThis.window = { location: { href: 'https://emporio46.it/', origin: 'https://emporio46.it' } }
let imgLoads = []
globalThis.Image = class { set src(v){ imgLoads.push(v); this.naturalWidth=2000; this.naturalHeight=1000; setTimeout(()=>this.onload&&this.onload(),0) } }
globalThis.document = { createElement: () => ({ getContext: () => ({ fillRect(){}, drawImage(){} }), toDataURL: () => 'data:image/jpeg;base64,AAAA' }) }
let calls = []
function script(fn){ globalThis.fetch = async (url, init) => { const body = JSON.parse(init.body); calls.push(body); return fn(body, calls.length) } }
const ok = (content, finish='stop') => ({ ok:true, status:200, headers:{get:()=>null}, json: async()=>({choices:[{message:{content},finish_reason:finish}]}) })
const bad = (status, message, code='') => ({ ok:false, status, headers:{get:()=>null}, json: async()=>({error:{message,code}}) })
const g = await import('../src/utils/groq.ts')

// 1. JSON con testo attorno + think non chiuso
calls=[]; script(()=>ok('<think>ragiono...</think>Ecco:\n```json\n{"nome":"Lampada","x":[1,2],}\n```'))
let r = await g.groqJson('dammi JSON'); assert.equal(r.nome,'Lampada'); assert.equal(calls[0].model,'openai/gpt-oss-120b'); assert.deepEqual(calls[0].response_format,{type:'json_object'}); assert.equal(calls[0].reasoning_effort,'low'); console.log('1 ok')

// 2. response_format rifiutato -> variante successiva
calls=[]; script((b,n)=> b.response_format ? bad(400,'response_format json_object is not supported with this model') : ok('{"a":1}'))
r = await g.groqJson('x'); assert.equal(r.a,1); assert.equal(calls.length,2); assert.ok(!calls[1].response_format); console.log('2 ok')

// 3. modello dismesso -> successivo
calls=[]; script((b)=> b.model==='openai/gpt-oss-120b' ? bad(404,'The model does not exist','model_not_found') : ok('ciao'))
let t = await g.groqText('x'); assert.equal(t,'ciao'); assert.equal(calls.at(-1).model,'openai/gpt-oss-20b'); console.log('3 ok')

// 4. 429 persistente sul primo modello -> secondo modello
calls=[]; script((b)=> b.model==='openai/gpt-oss-120b' ? bad(429,'rate') : ok('ok20'))
t = await g.groqText('x'); assert.equal(t,'ok20'); console.log('4 ok')

// 5. 401 -> errore chiaro, nessun giro inutile
calls=[]; script(()=>bad(401,'invalid api key'))
await assert.rejects(()=>g.groqText('x'), e=>/Chiave Groq non valida/.test(e.message)); assert.equal(calls.length,1); console.log('5 ok')

// 6. visione: percorso relativo convertito in data URL, qwen con effort none
calls=[]; imgLoads=[]; script(()=>ok('{"nome":"Coppia di lampade","categoria":"lampade"}'))
r = await g.groqVisionJson('/catalog/16-lampade-bronzo.jpg','analizza'); 
assert.equal(imgLoads[0],'https://emporio46.it/catalog/16-lampade-bronzo.jpg')
assert.equal(calls[0].messages[0].content[0].image_url.url.startsWith('data:image/jpeg'),true)
assert.equal(calls[0].model,'qwen/qwen3.8-27b'); assert.equal(calls[0].reasoning_effort,'none'); console.log('6 ok', r.nome)

// 7. risposta vuota troncata -> raddoppia budget
calls=[]; script((b,n)=> n===1 ? ok('', 'length') : ok('fatto'))
t = await g.groqText('x',100); assert.equal(t,'fatto'); assert.ok(calls[1].max_completion_tokens>calls[0].max_completion_tokens); console.log('7 ok')

// 8. think aperto senza chiusura
calls=[]; script(()=>ok('Risposta<think>pensiero infinito'))
t = await g.groqText('x'); assert.equal(t,'Risposta'); console.log('8 ok')

// 9. extractJson errore
assert.throws(()=>g.extractJson('nessun json qui'), /formato non valido/); console.log('9 ok')

// 10. senza chiave locale ma con sessione admin -> passa dal proxy (chiave sul server)
delete store.groq_api_key
const payload = Buffer.from(JSON.stringify({ exp: Date.now() + 3600_000 })).toString('base64url')
store.mnt_admin_token = payload + '.firma'
let urls = []
globalThis.fetch = async (url, init) => { urls.push([url, init.headers.Authorization]); return ok('via proxy') }
t = await g.groqText('x'); assert.equal(t,'via proxy'); assert.equal(urls[0][0],'/.netlify/functions/groq-proxy'); assert.equal(urls[0][1],'Bearer '+store.mnt_admin_token); console.log('10 ok')

// 11. né chiave né sessione -> messaggio chiaro, nessuna richiesta
delete store.mnt_admin_token; urls=[]
await assert.rejects(()=>g.groqText('x'), e=>/GROQ_API_KEY/.test(e.message)); assert.equal(urls.length,0); console.log('11 ok')

// 12. proxy: sessione scaduta -> messaggio dedicato
store.mnt_admin_token = payload + '.firma'
globalThis.fetch = async () => bad(401,'Sessione admin non valida','session_expired')
await assert.rejects(()=>g.groqText('x'), e=>/Sessione admin scaduta/.test(e.message)); console.log('12 ok')
