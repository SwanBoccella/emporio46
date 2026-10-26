// Test della Perizia AI con motore Gemini simulato (nessuna rete). Esegui: npm run test:perizia
import assert from 'node:assert'
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} }
const P = await import('../src/utils/perizia.ts')


const obsA = (o = {}) => ({ macro_categoria: 'arte', cosa_vedo: 'tela monocroma con taglio verticale', scritte_marchi_firme: 'nessuna leggibile', materiali_e_tecnica: 'olio su tela', indizi_epoca: ['telaio'], stato: 'buono', ipotesi: [{ identificazione: 'tela con taglio', autore_o_marca: 'Lucio Fontana', epoca: '1960', confidenza: 60 }], natura: 'replica-nello-stile-di', da_verificare: ['retro'], ...o })
const PERIZIA = `**Identificazione** — tela con taglio, probabile.
**Natura e autenticità** — omaggio decorativo.
**Epoca e stile** — anni '60, Spazialismo.
**Materiali e stato** — olio su tela, buono.
**Marchi, firme, punzoni** — nessuno leggibile.
**Classe di valore** — B, vintage commerciale.
**Stima** — Prezzo di vendita consigliato: € 300 – € 500. Valore di realizzo/acquisto: € 130 – € 220. Fiducia: media.
**Per restringere la stima** — foto del retro.
**Note commerciali** — arredo d'atmosfera.`
const BAD = PERIZIA.replace('€ 300 – € 500', '€ 100 – € 900')
const log = []
const mk = (h) => ({
  name: 'Gemini',
  visionJson: async (i, s, p) => { log.push('visionJson'); return h.visionJson(i, s, p) },
  visionText: async (i, s, p) => { log.push('visionText'); return h.visionText ? h.visionText(i, s, p) : 'testo' },
  text: async (s, p) => { log.push('text'); return h.text(s, p) },
})
const isVerifica = s => /REVISORE/.test(s)

// 1. controllaStima / restringiRange / parseRange
assert.deepEqual(P.parseRange('€ 1.200 – € 1.800'), [1200, 1800])
assert.deepEqual(P.parseRange('€ 450'), [450, 450])
assert.ok(P.controllaStima(BAD).some(x => /troppo largo/.test(x)))
assert.equal(P.controllaStima(PERIZIA).length, 0)
assert.equal(P.controllaPerizia(PERIZIA).length, 0)
assert.ok(P.controllaPerizia('**Identificazione** — x').length >= 2)
assert.ok(P.controllaStima(PERIZIA.replace('€ 130 – € 220', '€ 280 – € 480')).some(x => /realizzo/.test(x)))
const [lo, hi] = P.restringiRange(100, 900); assert.ok(hi / lo <= 2.06 && lo > 100 && hi < 900, `${lo}-${hi}`)
assert.equal(P.fmtRange([120, 200]), '€ 120 – € 200')
console.log('1 ok controlli stima')

// 2. Nessun riferimento a Groq nel motore predefinito
assert.equal(P.geminiEngine.name, 'Gemini')
assert.ok(!('groqEngine' in P) && !('defaultEngines' in P) && !('confronta' in P))
console.log('2 ok solo Gemini')

// 3. flusso completo: osservazione, perizia, revisione (tutto Gemini)
log.length = 0
let r = await P.periziaAnalyze('img', 'è un Fontana', { engine: mk({
  visionJson: async (i, s) => isVerifica(s) ? { verdetto: 'ok', problemi: [], testo_corretto: null } : obsA(),
  text: async () => PERIZIA,
}) })
assert.equal(r.meta.verifica, 'ok'); assert.equal(r.meta.verificatore, 'Gemini')
assert.deepEqual(log, ['visionJson', 'text', 'visionJson'])
assert.ok(/\*\*Revisione finale\*\*/.test(r.text) && /Gemini/.test(r.text) && !/Groq/.test(r.text))
console.log('3 ok flusso')

// 4. la revisione segnala i problemi e la correzione parte da una riscrittura mirata (accettata solo se migliora)
let calls = 0
let r4 = await P.periziaAnalyze('img', '', { engine: mk({
  visionJson: async (i, s) => isVerifica(s) ? { verdetto: 'da_correggere', problemi: [{ gravita: 'alta', descrizione: 'intervallo troppo largo' }] } : obsA(),
  text: async () => (++calls === 1 ? BAD : PERIZIA),
}) })
assert.equal(r4.meta.verifica, 'corretta'); assert.ok(/€ 300 – € 500/.test(r4.text)); assert.ok(!/€ 100 – € 900/.test(r4.text)); assert.equal(r4.meta.problemi.length, 1)
console.log('4 ok correzione')

// 5. correzione peggiore -> scartata; rilievi automatici -> riscrittura mirata
calls = 0
r = await P.periziaAnalyze('img', '', { engine: mk({
  visionJson: async (i, s) => isVerifica(s) ? { verdetto: 'da_correggere', problemi: [{ gravita: 'media', descrizione: 'x' }] } : obsA(),
  text: async () => (++calls === 1 ? BAD : calls === 2 ? '**Identificazione** — x' : PERIZIA),
}) })
assert.ok(/€ 300 – € 500/.test(r.text), 'la riscrittura mirata deve sistemare la stima'); assert.ok(r.meta.avvisi.some(a => /scartata/.test(a)))
console.log('5 ok scarto + riscrittura')

// 5b. oggetto di basso valore, fiducia alta, controlli puliti -> revisione sulla foto saltata
log.length = 0
const SEMPLICE = PERIZIA.replace(/Classe di valore\*\* — [A-D]/, 'Classe di valore** — B').replace(/Fiducia: \w+/, 'Fiducia: alta')
r = await P.periziaAnalyze('img', '', { engine: mk({ visionJson: async (i, s) => isVerifica(s) ? { verdetto: 'ok', problemi: [] } : obsA(), text: async () => SEMPLICE }) })
assert.deepEqual(log, ['visionJson', 'text']); assert.ok(r.meta.avvisi.some(a => /non necessaria/.test(a)))
console.log('5b ok revisione saltata')

// 6. revisione che fallisce -> la perizia c'è comunque, dichiarato
r = await P.periziaAnalyze('img', '', { engine: mk({
  visionJson: async (i, s) => { if (isVerifica(s)) throw new Error('timeout'); return obsA() },
  text: async () => PERIZIA,
}) })
assert.equal(r.meta.verifica, 'non-eseguita'); assert.ok(r.meta.avvisi.some(a => /Revisione finale non riuscita/.test(a)))
console.log('6 ok revisione non riuscita')

// 7. Gemini non risponde -> errore chiaro (nessun ripiego su altre IA)
await assert.rejects(() => P.periziaAnalyze('img', '', { engine: mk({ visionJson: async () => { throw new Error('Chiave Gemini mancante') }, text: async () => '' }) }),
  e => /Gemini non ha potuto analizzare/.test(e.message) && /Chiave Gemini mancante/.test(e.message))
console.log('7 ok errore Gemini')

// 8. follow-up: rilettura del dettaglio e controllo stima
log.length = 0
const FU = `**Ho registrato** — x\n**Cosa cambia** — y\n**Stima aggiornata** — Prezzo di vendita consigliato: € 300 – € 500. Valore di realizzo: € 130 – € 220. Fiducia: media.`
let seenPrompt = ''
const fu = await P.periziaFollowUp({ obs: '{}', chat: [{ role: 'ai', text: PERIZIA + '\n\n**Revisione finale** — vecchia' }], facts: [], domanda: 'guarda la firma in basso', image: 'img' }, { engine: mk({
  visionJson: async () => ({}), visionText: async () => 'si legge "L. Fontana"', text: async (s, p) => { seenPrompt = p; return FU },
}) })
assert.ok(log.includes('visionText')); assert.ok(/OSSERVAZIONE AGGIUNTIVA/.test(fu.obs) && /L\. Fontana/.test(fu.obs))
assert.ok(!/vecchia/.test(seenPrompt), 'il blocco di revisione precedente non deve rientrare nel prompt')
console.log('8 ok follow-up')

// 9. periziaPrezzo: una sola stima, sempre <= 2x, "Su richiesta" rispettato
const price = (a) => P.periziaPrezzo('x', '', '', '', { engine: mk({ text: async () => a, visionJson: async () => ({}) }) })
assert.equal(await price('€ 200 – € 400'), '€ 200 – € 400')
assert.equal(await price('Su richiesta'), 'Su richiesta')
const pr = P.parseRange(await price('€ 100 – € 900')); assert.ok(pr[1] / pr[0] <= 2.06)
console.log('9 ok prezzo')

// 10. scheda da foto: stima ristretta in codice, JSON valido
const sc = await P.schedaDaFoto('img', '', { engine: mk({
  visionJson: async () => obsA(),
  text: async () => '```json\n{"nome":"Tela spaziale","era":"Anni 60","categoria":"altro","descrizione":"d","badge":"Pezzo raro","prezzo_suggerito":"€ 100 – € 900"}\n```',
}) })
assert.equal(sc.scheda.nome, 'Tela spaziale'); const sr = P.parseRange(sc.scheda.prezzo_suggerito); assert.ok(sr[1] / sr[0] <= 2.06)
console.log('10 ok scheda')
