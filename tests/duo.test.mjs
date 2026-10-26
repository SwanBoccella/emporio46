// Test della coordinazione Gemini + Groq con motori simulati (nessuna rete). Esegui: npm run test:duo
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
const mk = (name, h) => ({
  name,
  visionJson: async (i, s, p) => { log.push([name, 'visionJson', s.slice(0, 30)]); return h.visionJson(i, s, p) },
  visionText: async (i, s, p) => { log.push([name, 'visionText']); return h.visionText ? h.visionText(i, s, p) : 'testo' },
  text: async (s, p) => { log.push([name, 'text']); return h.text(s, p) },
})
const isArbitro = s => /ARBITRO/.test(s)
const isVerifica = s => /REVISORE/.test(s)

// 1. confronta: accordo alto / medio / basso
assert.equal(P.confronta(obsA(), obsA()).livello, 'alto')
assert.equal(P.confronta(obsA(), obsA({ ipotesi: [{ autore_o_marca: null }] })).livello, 'medio')
assert.equal(P.confronta(obsA(), obsA({ macro_categoria: 'mobili' })).livello, 'basso')
assert.equal(P.confronta(obsA({ scritte_marchi_firme: 'firma Fontana in basso' }), obsA({ scritte_marchi_firme: 'nessuna leggibile' })).scritte, 'una-sola')
console.log('1 ok confronto')

// 2. controllaStima / restringiRange / parseRange
assert.deepEqual(P.parseRange('€ 1.200 – € 1.800'), [1200, 1800])
assert.deepEqual(P.parseRange('€ 450'), [450, 450])
assert.ok(P.controllaStima(BAD).some(x => /troppo largo/.test(x)))
assert.equal(P.controllaStima(PERIZIA).length, 0)
assert.equal(P.controllaPerizia(PERIZIA).length, 0)
assert.ok(P.controllaPerizia('**Identificazione** — x').length >= 2)
assert.ok(P.controllaStima(PERIZIA.replace('€ 130 – € 220', '€ 280 – € 480')).some(x => /realizzo/.test(x)))
const [lo, hi] = P.restringiRange(100, 900); assert.ok(hi / lo <= 2.06 && lo > 100 && hi < 900, `${lo}-${hi}`)
assert.equal(P.fmtRange([120, 200]), '€ 120 – € 200')
console.log('2 ok controlli stima')

// 3. duo completo: osservazione parallela, arbitro Gemini, scrive Groq, revisore Gemini
log.length = 0
let r = await P.periziaAnalyze('img', 'è un Fontana', { engines: [
  mk('Gemini', { visionJson: async (i, s) => isArbitro(s) ? { ...obsA(), accordo: { livello: 'alto', punti_concordi: ['taglio'], discrepanze: [] } } : isVerifica(s) ? { verdetto: 'ok', problemi: [], testo_corretto: null } : obsA(), text: async () => PERIZIA }),
  mk('Groq', { visionJson: async () => obsA(), text: async () => PERIZIA }),
] })
assert.equal(r.meta.modo, 'duo'); assert.equal(r.meta.accordo, 'alto'); assert.equal(r.meta.verifica, 'ok'); assert.equal(r.meta.verificatore, 'Gemini')
assert.ok(/Verifica incrociata/.test(r.text) && /ALTO/.test(r.text))
assert.deepEqual(log.filter(l => l[1] === 'text').map(l => l[0]), ['Groq'])           // la perizia la scrive Groq
assert.ok(log.some(l => l[0] === 'Gemini' && /REVISORE/.test(l[2] || '') || l[0] === 'Gemini' && l[1] === 'visionJson')) 
console.log('3 ok duo')

// 4. discrepanza: l'accordo dichiarato dall'arbitro non può superare quello automatico; la discrepanza non citata resta visibile
r = await P.periziaAnalyze('img', '', { engines: [
  mk('Gemini', { visionJson: async (i, s) => isArbitro(s) ? { ...obsA(), accordo: { livello: 'alto', discrepanze: [] } } : isVerifica(s) ? { verdetto: 'ok', problemi: [] } : obsA({ natura: 'originale' }), text: async () => PERIZIA }),
  mk('Groq', { visionJson: async () => obsA({ natura: 'replica-nello-stile-di', scritte_marchi_firme: 'nessuna' }), text: async () => PERIZIA }),
] })
assert.equal(r.meta.accordo, 'medio'); assert.ok(r.meta.discrepanze.some(d => /natura/.test(d.campo) && !d.risolta))
assert.ok(/natura/.test(r.text))
console.log('4 ok discrepanze')

// 5. revisione corregge una stima troppo larga (testo corretto accettato solo se migliora)
r = await P.periziaAnalyze('img', '', { engines: [
  mk('Gemini', { visionJson: async (i, s) => isArbitro(s) ? { ...obsA(), accordo: { livello: 'alto' } } : isVerifica(s) ? { verdetto: 'da_correggere', problemi: [{ gravita: 'alta', descrizione: 'intervallo troppo largo' }], testo_corretto: PERIZIA } : obsA(), text: async () => BAD }),
  mk('Groq', { visionJson: async () => obsA(), text: async () => BAD }),
] })
assert.equal(r.meta.verifica, 'corretta'); assert.ok(/€ 300 – € 500/.test(r.text)); assert.ok(!/€ 100 – € 900/.test(r.text)); assert.equal(r.meta.problemi.length, 1)
console.log('5 ok correzione')

// 6. correzione peggiore del testo originale -> scartata; rilievi automatici -> riscrittura mirata
let calls = 0
r = await P.periziaAnalyze('img', '', { engines: [
  mk('Gemini', { visionJson: async (i, s) => isArbitro(s) ? { ...obsA(), accordo: { livello: 'alto' } } : isVerifica(s) ? { verdetto: 'da_correggere', problemi: [], testo_corretto: BAD.replace('**Note commerciali**', 'x') } : obsA(), text: async () => PERIZIA }),
  mk('Groq', { visionJson: async () => obsA(), text: async () => (++calls === 1 ? BAD : PERIZIA) }),
] })
assert.ok(/€ 300 – € 500/.test(r.text), 'la riscrittura mirata deve sistemare la stima'); assert.ok(r.meta.avvisi.some(a => /scartata/.test(a)))
console.log('6 ok scarto + riscrittura')

// 7. Gemini non disponibile -> solo Groq, dichiarato; autoverifica
r = await P.periziaAnalyze('img', '', { engines: [
  mk('Gemini', { visionJson: async () => { throw new Error('Chiave Gemini mancante') }, text: async () => { throw new Error('no') } }),
  mk('Groq', { visionJson: async (i, s) => isVerifica(s) ? { verdetto: 'ok', problemi: [] } : obsA(), text: async () => PERIZIA }),
] })
assert.equal(r.meta.modo, 'solo-groq'); assert.equal(r.meta.accordo, undefined); assert.ok(r.meta.avvisi.some(a => /Gemini non ha potuto/.test(a))); assert.equal(r.meta.verificatore, 'Groq (autoverifica)')
console.log('7 ok solo Groq')

// 8. Groq non disponibile -> Gemini scrive e si autoverifica
r = await P.periziaAnalyze('img', '', { engines: [
  mk('Gemini', { visionJson: async (i, s) => isVerifica(s) ? { verdetto: 'ok', problemi: [] } : obsA(), text: async () => PERIZIA }),
  mk('Groq', { visionJson: async () => { throw new Error('Chiave Groq mancante') }, text: async () => { throw new Error('no') } }),
] })
assert.equal(r.meta.modo, 'solo-gemini'); assert.ok(/Gemini/.test(r.text))
console.log('8 ok solo Gemini')

// 9. nessuna IA -> errore con entrambi i motivi
await assert.rejects(() => P.periziaAnalyze('img', '', { engines: [
  mk('Gemini', { visionJson: async () => { throw new Error('A rotta') }, text: async () => '' }),
  mk('Groq', { visionJson: async () => { throw new Error('B rotta') }, text: async () => '' }),
] }), e => /A rotta/.test(e.message) && /B rotta/.test(e.message))
console.log('9 ok nessuna IA')

// 10. arbitro Gemini fallisce -> arbitra Groq; se falliscono entrambi si usa Gemini e le differenze diventano "da verificare"
let n = 0
r = await P.periziaAnalyze('img', '', { engines: [
  mk('Gemini', { visionJson: async (i, s) => { if (isArbitro(s)) throw new Error('timeout'); return isVerifica(s) ? { verdetto: 'ok', problemi: [] } : obsA({ natura: 'originale' }) }, text: async () => PERIZIA }),
  mk('Groq', { visionJson: async (i, s) => isArbitro(s) ? { ...obsA(), accordo: { livello: 'medio', discrepanze: [{ campo: 'natura', gemini: 'originale', groq: 'replica', verdetto: 'replica', risolta: true }] } } : obsA(), text: async () => PERIZIA }),
] })
assert.ok(r.meta.avvisi.some(a => /ha arbitrato Groq/.test(a))); assert.ok(r.meta.discrepanze.some(d => d.risolta))
r = await P.periziaAnalyze('img', '', { engines: [
  mk('Gemini', { visionJson: async (i, s) => { if (isArbitro(s)) throw new Error('t'); return isVerifica(s) ? { verdetto: 'ok', problemi: [] } : obsA({ natura: 'originale' }) }, text: async () => PERIZIA }),
  mk('Groq', { visionJson: async (i, s) => { if (isArbitro(s)) throw new Error('t'); return obsA() }, text: async () => PERIZIA }),
] })
assert.ok(/Le due IA divergono/.test(r.obs)); assert.equal(r.meta.accordo, 'medio'); assert.ok(r.meta.discrepanze.every(d => !d.risolta))
console.log('10 ok arbitro di ripiego')

// 11. follow-up: rilettura del dettaglio con entrambe le IA e controllo stima
log.length = 0
const FU = `**Ho registrato** — x\n**Cosa cambia** — y\n**Stima aggiornata** — Prezzo di vendita consigliato: € 300 – € 500. Valore di realizzo: € 130 – € 220. Fiducia: media.`
let fu = await P.periziaFollowUp({ obs: '{}', chat: [{ role: 'ai', text: PERIZIA + '\n\n**Verifica incrociata** — vecchia' }], facts: [], domanda: 'guarda la firma in basso', image: 'img' }, { engines: [
  mk('Gemini', { visionJson: async () => ({}), visionText: async () => 'firma illeggibile', text: async () => FU }),
  mk('Groq', { visionJson: async () => ({}), visionText: async () => 'si legge "L. Fontana"', text: async () => FU }),
] })
assert.deepEqual(log.filter(l => l[1] === 'visionText').map(l => l[0]).sort(), ['Gemini', 'Groq'])
assert.ok(/\[Gemini\] firma illeggibile/.test(fu.obs) && /\[Groq\]/.test(fu.obs))
console.log('11 ok follow-up')

// 12. periziaPrezzo: sovrapposizione, prudenza se lontane, "Su richiesta" se una IA lo dice, range sempre <= 2x
const price = (a, b) => P.periziaPrezzo('x', '', '', '', { engines: [mk('Gemini', { text: async () => a, visionJson: async () => ({}) }), mk('Groq', { text: async () => b, visionJson: async () => ({}) })] })
assert.equal(await price('€ 200 – € 400', '€ 300 – € 500'), '€ 300 – € 400')
assert.equal(await price('€ 100 – € 150', '€ 600 – € 900'), '€ 100 – € 150')
assert.equal(await price('€ 200 – € 400', 'Su richiesta'), 'Su richiesta')
const pr = P.parseRange(await price('€ 100 – € 900', '€ 100 – € 900')); assert.ok(pr[1] / pr[0] <= 2.06)
console.log('12 ok prezzo')

// 13. scheda da foto: stima ristretta in codice, JSON valido, accordo in meta
const sc = await P.schedaDaFoto('img', '', { engines: [
  mk('Gemini', { visionJson: async (i, s) => isArbitro(s) ? { ...obsA(), accordo: { livello: 'alto' } } : obsA(), text: async () => '{}' }),
  mk('Groq', { visionJson: async () => obsA(), text: async () => '```json\n{"nome":"Tela spaziale","era":"Anni 60","categoria":"altro","descrizione":"d","badge":"Pezzo raro","prezzo_suggerito":"€ 100 – € 900"}\n```' }),
] })
assert.equal(sc.scheda.nome, 'Tela spaziale'); const sr = P.parseRange(sc.scheda.prezzo_suggerito); assert.ok(sr[1] / sr[0] <= 2.06); assert.equal(sc.meta.accordo, 'alto')
console.log('13 ok scheda')
