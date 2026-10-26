// ─── Perizia AI: Gemini (unica IA), con prontuario del settore ───────────────────────────────
// Le fasi (osservazione, perizia, revisione) sono descritte più sotto, nel blocco "PERIZIA AI".
// Qui in alto: prontuario di riconoscimento, metodo di stima e regole di onestà.
import { extractJson } from './groq'
import { geminiExpertVisionJson, geminiExpertVisionText, geminiExpertText } from './gemini'

export const PRONTUARIO = `PRONTUARIO DI RICONOSCIMENTO (promemoria di lavoro: usalo per ragionare, non recitarlo)

ARTE, QUADRI, STAMPE
- Prima domanda: è un'opera unica, un multiplo/edizione, una stampa (litografia, serigrafia, offset), un poster/riproduzione, o un "omaggio/nello stile di"? Indizi: firma e numerazione (es. 23/100), timbro a secco, etichette di galleria sul retro, impasto reale della pittura vs punteggiatura di stampa, telaio, chiodi, carta.
- Segni distintivi che suggeriscono un autore o una corrente (ipotesi, mai certezza senza firma/documenti): tele monocrome con tagli o fori = Lucio Fontana ("Concetto spaziale") o suoi epigoni/omaggi; superfici monocrome estroflesse a rilievo = Bonalumi, Castellani, Scheggi; "achromes" bianchi con pieghe o cuciture = Manzoni; sacchi, combustioni, cretti = Burri; tagli di carta/collage, informale materico = anni '50-'60; griglie e illusioni ottiche = Arte cinetica/programmata (Munari, Colombo, Vasarely); vedute e paesaggi a olio di fine '800 = scuole regionali (macchiaioli, paesaggisti); gouache napoletane = souvenir del Grand Tour; icone su tavola con doratura = icone russe/greche; ritratti e nature morte anonime = bottega/copia d'epoca.
- Un'opera di autore storicizzato (Fontana, Burri, Manzoni, de Chirico, Morandi, Warhol, Picasso, ecc.) in un negozio vintage è quasi sempre riproduzione, falso o omaggio decorativo. Dillo con franchezza e prudenza. Se fosse autentica servirebbe l'autentica dell'Archivio/Fondazione dell'artista e il valore andrebbe da decine di migliaia a milioni di euro: in quel caso NON si dà un prezzo da foto.

MOBILI E DESIGN
- Datazione dai dettagli costruttivi: viti a taglio vs a croce, incastri a coda di rondine a mano o a macchina, impiallacciatura vs massello, compensato curvato (anni '50-'60), laminato tipo Formica (anni '50-'70), plastica stampata a iniezione (dagli anni '60), tubolare cromato (Bauhaus anni '30 e ripresa anni '70), teak scandinavo (anni '50-'60), palissandro (anni '60-'70), ottone e vetro (anni '50 e '70).
- Designer italiani: Gio Ponti, Franco Albini, Carlo Mollino, Osvaldo Borsani, Joe Colombo, Vico Magistretti, Marco Zanuso, Achille e Pier Giacomo Castiglioni, Ettore Sottsass, Tobia e Afra Scarpa, Gae Aulenti, Angelo Mangiarotti, Paolo Buffa, Ico Parisi, Gianfranco Frattini, Mario Bellini. Aziende: Cassina, Zanotta, Kartell, Arflex, B&B Italia, Poltrona Frau, Tecno, Flos, Artemide, Arteluce, Stilnovo, Oluce, Fontana Arte, Venini, Seguso, Barovier & Toso, Fornasetti. Altri: Wegner, Jacobsen, Aalto/Artek, Juhl, Eames, Knoll, Herman Miller.
- Marchi: targhette metalliche, bruciature a fuoco, etichette sotto il piano o dietro. Senza marchio visibile si scrive "nello stile di", mai si attribuisce. Le copie "stile design" sono molto più numerose degli originali.

VETRO, CERAMICA, ILLUMINAZIONE
- Murano autentico (sommerso, millefiori, incalmo, Venini, Seguso, Barovier&Toso, Salviati) ha spesso marchio all'acido o etichetta; molto vetro "stile Murano" è seriale (Empoli, produzioni estere). Cerca bolle, pontello sotto la base, peso.
- Ceramica/porcellana: marchio sotto la base (Richard-Ginori, Lenci, Bitossi, Rometti, Deruta, Albisola, Capodimonte, Fornasetti); decalcomania vs dipinto a mano; Lenci = figure in ceramica anni '30.
- Lampade: ottone vs metallo dorato, marchi sulla base o sul portalampada, cablaggio d'epoca.

GIOIELLI, ARGENTI, OROLOGI
- Punzoni italiani: dal 1968 stella a cinque punte + numero + sigla provincia (es. FI). Oro: 750 (18 kt), 585 (14 kt), 375 (9 kt). Argento: 925 (sterling), 800. "GP", "EP", "plaqué", "doublé", "silver plated" = placcato, valore minimo. Un oggetto senza punzone può essere metallo non prezioso.
- Il valore di oro e argento dipende da peso e titolo e dalla quotazione del giorno: da una foto NON si calcola. Servono peso e punzone leggibile. Aggiungi valore di manifattura/marca solo se firma leggibile (es. Buccellati, Bulgari, Cartier, Tiffany, Georg Jensen).
- Bijoux di costume firmati: Chanel, Dior, Trifari, Coro, Monet, Napier, Miriam Haskell, Weiss, Schiaparelli, Swarovski. Firma sul retro o sul gancio. Strass e vetro = bijou; pietre vere hanno montature e retro diversi. Corallo, ambra, bakelite, galalite: da riconoscere con test. Avorio, tartaruga, madreperla rara: normativa CITES, segnalare restrizioni alla vendita.
- Orologi: marca sul quadrante e calibro sul fondello; repliche e "frankenwatch" frequenti, serve apertura cassa. Penne stilografiche (Montblanc, Parker, Aurora, Pelikan): pennino, numero, marchio.

NUMISMATICA
- Identificazione: paese/regno, nominale, anno, zecca e segno di zecca, metallo, diametro e peso (da chiedere), conservazione (MB, BB, SPL, FDC). Cataloghi: Gigante e Montenegro (Italia), Krause (mondo), Crawford (Repubblica romana), RIC (Impero romano).
- Lire repubblicane comuni ed euro circolanti: pochi centesimi o pochi euro. Monete d'oro (20 lire Marengo, sterline, Krugerrand) hanno valore intrinseco legato a peso e quotazione. Romane comuni (follis, antoniniano) in conservazione media: poche decine di euro. Rarità, anno/zecca e conservazione fanno il prezzo; la pulizia lo abbassa. Falsi e riproduzioni sono frequenti. Se nominale o anno non si leggono, dichiaralo.

ABBIGLIAMENTO E ACCESSORI
- Etichetta interna (marca, composizione, taglia, "Made in"), cerniere (metallo Talon/Lampo anni '50-'60, YKK dopo), cuciture, fodera, bottoni. Borse e accessori di lusso (Hermès, Gucci, Louis Vuitton, Prada, Chanel, Fendi): l'autenticità non è verificabile da foto, indicare cosa controllare (codici, seriali, cuciture, hardware). Moda italiana d'archivio: Pucci, Fiorucci, Missoni, Valentino, Ferré, Armani, Versace, Moschino, Krizia. Pellicce: normative di vendita.

MODERNARIATO E ALTRO
- Radio e TV (Brionvega, Grundig), telefoni (Grillo), macchine da scrivere (Olivetti Lettera 22, Valentine), giocattoli (Lenci, Märklin), vinili, fumetti, specchi (argentatura, cornici in stucco o legno dorato), cornici: valore guidato da marca, completezza, funzionamento e stato.`

export const METODO_STIMA = `METODO DI STIMA OBBLIGATORIO (il prezzo non si "spara": si ricava)
1. Assegna una CLASSE DI VALORE:
   A = decorativo/seriale/di poco valore (da pochi euro a circa 60 €);
   B = vintage commerciale di buona fattura (circa 60 – 600 €);
   C = pezzo con marchio/firma leggibile o attribuzione solida, di design o di pregio (circa 500 – 5.000 € e oltre);
   D = opera d'arte, numismatica rara, gioielleria preziosa, antiquariato di pregio, orologi di marca: NON stimabile con affidabilità da una foto.
2. Il prezzo dipende da: classe, stato, rarità, presenza di marchio/firma LEGGIBILE, completezza, richiesta del mercato. Senza marchio o firma leggibile non si sale in classe C. Un oggetto "nello stile di" vale come oggetto di stile, non come l'originale.
3. Forma della stima: intervallo realistico, mai più largo di 2× (min–max) per le classi A e B e di 2,5× per la C. Per la classe D non dare un prezzo di vendita: indica lo "scenario più probabile" (es. riproduzione decorativa: € X – Y) e, a parte, "se fosse autentico" con la procedura per verificarlo (perito, archivio, autentica).
4. Distingui PREZZO DI VENDITA consigliato in negozio da VALORE DI REALIZZO/ACQUISTO (di norma il 40–60% del prezzo di vendita).
5. Dichiara il LIVELLO DI FIDUCIA (alta/media/bassa) e cosa serve per alzarlo: foto del retro, firma, marchi, interni, misure, peso, test (calamita, acido, luce UV).
6. Non citare vendite, aste, lotti o quotazioni specifiche e non inventarne. Per oro e argento non scrivere quotazioni: indica solo che si calcolano su peso e titolo.
7. Se l'oggetto non è identificabile con ragionevole certezza, dillo e dai solo una fascia prudente con fiducia bassa. "Non determinabile da foto" è una risposta valida.`

const REGOLE_ONESTA = `REGOLE DI ONESTÀ
- Distingui sempre ciò che VEDI da ciò che IPOTIZZI. Usa i gradi: certo / probabile / possibile / non determinabile.
- Trascrivi firme, punzoni, etichette e date SOLO se leggibili. Non completare lettere, non inventare marchi, autori, anni o dimensioni.
- Se un dettaglio ricorda un autore o una scuola, nominalo come ipotesi con la confidenza e spiega cosa lo conferma o lo smentisce.
- Preferisci "da verificare" a una risposta sicura ma sbagliata. Segnala sempre quali altre foto servono.`

const REGOLE_TITOLARE = `DATI FORNITI DAL TITOLARE (REGOLA FONDAMENTALE)
- Ciò che il titolare dice dell'oggetto (autore, marchio, materiale, epoca, provenienza, peso, misure, scritte lette dal vivo, difetti) è il PUNTO DI PARTENZA dell'analisi: lo recepisci come dato e ricalcoli identificazione, natura, classe e stima su quella base. Non lo ignori, non lo sostituisci con altro, non lo "correggi" inventando.
- Se il titolare nomina solo un cognome, risolvilo con la persona o il marchio più noto del settore COERENTE con l'oggetto, e dichiara come l'hai inteso (es. "intendo Lucio Fontana"). Esempi: Fontana = Lucio Fontana (Spazialismo, "Concetto spaziale", tele con tagli o buchi); Burri = Alberto Burri; Manzoni = Piero Manzoni; Castellani = Enrico Castellani; Bonalumi = Agostino Bonalumi; Munari = Bruno Munari; Colombo = Joe Colombo; Ponti = Gio Ponti; Mollino = Carlo Mollino; Sottsass = Ettore Sottsass; Venini = la vetreria Venini. Attenzione: "Fontana Arte" è un'azienda di illuminazione e arredo (Gio Ponti, Max Ingrand), non Lucio Fontana.
- Non inventare mai persone, biografie, titoli di opere, date o quotazioni. Se non riconosci un nome, scrivi che non lo riconosci e lo tratti come dato del titolare.
- Se il dato del titolare è in contrasto con ciò che si vede, non litigare: accettalo come ipotesi di lavoro, segnala la discrepanza in una riga e indica come verificarla.
- Un'attribuzione detta a voce NON è un'autentica. Per opere d'arte e pezzi firmati ragiona su due scenari: "se confermato come autentico" (cosa serve per provarlo: autentica dell'Archivio/Fondazione, firma, provenienza, expertise; nessuna cifra da foto per la classe D) e "se riproduzione/omaggio/nello stile di" (stima concreta).
- Le tue risposte precedenti possono contenere errori: se contrastano con i dati del titolare, scartale senza ripeterle.`

const SYSTEM_OSSERVA = `Sei un perito italiano con trent'anni di esperienza in antiquariato, modernariato, design, arte moderna e contemporanea, gioielleria, numismatica, moda vintage e oggettistica. Lavori per un negozio di Firenze (arredi vintage e bijoux).

${PRONTUARIO}

${REGOLE_ONESTA}

${REGOLE_TITOLARE}

Il tuo compito ORA è solo osservare e identificare. Non stimare prezzi.`

const PROMPT_OSSERVA = `Esamina la foto con la massima attenzione (insieme, poi dettagli: superfici, bordi, retro se visibile, scritte, punzoni, firme, cuciture, giunzioni).

Rispondi SOLO con un JSON valido, in italiano, con questi campi:
{
  "macro_categoria": "arte | mobili | illuminazione | vetro-ceramica | gioielli-bijoux | argenteria | orologi | numismatica | abbigliamento-accessori | modernariato | libri-carte-stampe | altro",
  "cosa_vedo": "descrizione oggettiva e dettagliata (forma, proporzioni, colori, materiali, tecnica, decori, numero di parti, ambientazione), 4-8 frasi",
  "scritte_marchi_firme": "trascrizione letterale di ciò che è LEGGIBILE (firme, punzoni, etichette, nominali, date) oppure 'nessuna leggibile'",
  "materiali_e_tecnica": "materiali e tecnica, con ipotesi motivate",
  "indizi_epoca": ["dettaglio visibile che data l'oggetto", "..."],
  "stato": "stato di conservazione con difetti concreti (graffi, restauri, ossidazione, mancanze)",
  "ipotesi": [
    { "identificazione": "cosa potrebbe essere, nel modo più preciso possibile", "autore_o_marca": "nome o null", "epoca": "range", "confidenza": 0, "indizi_a_favore": "...", "indizi_contro": "..." }
  ],
  "natura": "originale | multiplo-edizione | stampa-riproduzione | replica-nello-stile-di | oggetto-seriale | non-determinabile",
  "da_verificare": ["foto o controlli che servirebbero (retro, firma, marchio, peso, misure, test)"]
}
Da 1 a 3 ipotesi, dalla più probabile; "confidenza" è un numero 0-100 onesto.`


const SYSTEM_VALUTA = `Sei il perito di fiducia di Emporio 46, negozio di Firenze di arredi vintage e bijoux. Competenze: antiquariato, modernariato, design, arte moderna e contemporanea, gioielleria e argenteria, numismatica, moda vintage, oggettistica. Scrivi per il titolare del negozio: tono professionale, diretto, senza giri di parole.

${PRONTUARIO}

${METODO_STIMA}

${REGOLE_ONESTA}

${REGOLE_TITOLARE}

FORMATO DELLA RISPOSTA (italiano, niente "###" né tabelle; intestazioni in **grassetto**, elenchi con "- ", paragrafi brevi):
(Solo se ci sono INFORMAZIONI DEL TITOLARE: apri con **Dati del titolare considerati** — elenco breve di come li hai recepiti, con il nome completo dell'autore/marchio come lo hai inteso.)
**Identificazione** — cosa è, il più precisamente possibile, con grado di certezza.
**Natura e autenticità** — originale, multiplo, riproduzione, nello stile di; cosa lo fa pensare.
**Epoca e stile** — range di anni e movimento/scuola.
**Materiali e stato** — materiali, tecnica, difetti concreti.
**Marchi, firme, punzoni** — solo ciò che è leggibile; altrimenti "nessuno leggibile".
**Classe di valore** — A, B, C o D con il motivo in una frase.
**Stima** — "Prezzo di vendita consigliato: € X – € Y" e "Valore di realizzo/acquisto: € X – € Y" (per la classe D: scenario più probabile + "se autentico" senza cifre inventate). Poi "Fiducia: alta/media/bassa" e le 2-3 ragioni principali del prezzo.
**Per restringere la stima** — elenco di cosa fotografare o controllare.
**Note commerciali** — come presentarlo e a chi proporlo, in 1-2 frasi.`

// ═════════════════════════════════════════════════════════════════════════════
// PERIZIA AI: solo Gemini
// ─────────────────────────────────────────────────────────────────────────────
// 1) OSSERVAZIONE  Gemini guarda la foto con il prontuario, le regole di onestà e i dati del titolare e produce una lettura strutturata.
// 2) PERIZIA  Gemini scrive la perizia a partire da quella lettura.
// 3) REVISIONE  Gemini ricontrolla la perizia guardando di nuovo la foto, insieme a controlli automatici (intervalli di prezzo,
//    classe di valore, realizzo, sezioni obbligatorie). Se trova errori la perizia viene corretta.
// Groq non è più coinvolto: resta solo per gli altri testi del pannello (SEO, traduzioni, recensioni…).
// ═════════════════════════════════════════════════════════════════════════════

export type Think = 'low' | 'medium' | 'high'
export interface Engine {
  name: 'Gemini'
  visionJson(image: string, system: string, prompt: string, maxTokens: number): Promise<any>
  visionText(image: string, system: string, prompt: string, maxTokens: number): Promise<string>
  text(system: string, prompt: string, maxTokens: number, think?: Think): Promise<string>
}
export const geminiEngine: Engine = {
  name: 'Gemini',
  visionJson: (i, s, p, m) => geminiExpertVisionJson(i, s, p, m, 'high'),
  visionText: (i, s, p, m) => geminiExpertVisionText(i, s, p, m, 'medium'),
  text: (s, p, m, t = 'medium') => geminiExpertText(s, p, m, t),
}

export interface PeriziaMeta {
  verifica: 'ok' | 'corretta' | 'non-eseguita'
  verificatore?: string
  problemi: string[]   // rilievi trovati dalla revisione (anche quelli già corretti)
  avvisi: string[]     // limiti incontrati durante il lavoro
}
export interface PeriziaResult { text: string; obs: string; meta?: PeriziaMeta }
export interface RunOpts { engine?: Engine; onStep?: (s: string) => void }

const errMsg = (e: unknown) => ((e as Error)?.message || String(e) || 'errore').replace(/\s+/g, ' ').slice(0, 220)
const clip = (v: unknown, n = 240) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n)

function fmtObs(o: any): string {
  try { return JSON.stringify(o, null, 1).slice(0, 9000) } catch { return String(o) }
}

// ─── Controlli automatici sulla stima (deterministici: non dipendono da nessuna IA) ─────────
const toNum = (s: string): number => {
  const t = s.replace(/\s/g, '')
  return Number(/,\d{1,2}$/.test(t) ? t.replace(/\./g, '').replace(',', '.') : t.replace(/[.,]/g, ''))
}
const NUM_RE = /\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?/g
// Primo e secondo numero di una riga tipo "€ 400 – € 600" (un solo numero = prezzo singolo)
export function parseRange(line: string): [number, number] | null {
  const nums = [...String(line).matchAll(NUM_RE)].map(m => toNum(m[0])).filter(n => Number.isFinite(n) && n > 0)
  if (!nums.length) return null
  const a = nums[0], b = nums.length > 1 ? nums[1] : nums[0]
  return a <= b ? [a, b] : [b, a]
}
function rangeAfter(text: string, label: RegExp): [number, number] | null {
  const m = label.exec(text)
  if (!m) return null
  const rest = text.slice(m.index + m[0].length, m.index + m[0].length + 160)
  const line = rest.split(/\n|valore di realizzo|prezzo di vendita|fiducia/i)[0]
  return parseRange(line.replace(/\(.*?\)/g, ''))
}
const classeDi = (text: string): 'A' | 'B' | 'C' | 'D' | null => {
  const m = /Classe di valore\**\s*[—–:-]*\s*\**\s*(?:classe\s*)?([ABCD])\b/i.exec(text)
  return m ? (m[1].toUpperCase() as 'A' | 'B' | 'C' | 'D') : null
}
const limiteRapporto = (c: string | null) => (c === 'C' ? 2.5 : c === 'D' ? Infinity : 2)

const SEZIONI = ['Identificazione', 'Natura e autenticità', 'Epoca e stile', 'Materiali e stato', 'Marchi, firme, punzoni', 'Classe di valore', 'Stima', 'Per restringere la stima', 'Note commerciali']

// Rilievi sulla sola stima (usato anche per le risposte di follow-up)
export function controllaStima(text: string): string[] {
  const out: string[] = []
  const cl = classeDi(text)
  const v = rangeAfter(text, /prezzo di vendita(?: consigliato)?\W{0,3}/i)
  const r = rangeAfter(text, /valore di realizzo(?:\s*\/\s*acquisto)?\W{0,3}/i)
  if (v && cl !== 'D') {
    const lim = limiteRapporto(cl)
    if (v[1] / v[0] > lim * 1.05) out.push(`Il prezzo di vendita (€ ${v[0]} – € ${v[1]}) è troppo largo: il metodo ammette al massimo ${lim}× (min–max).`)
    if (cl === 'A' && v[1] > 120) out.push(`Classe A ma prezzo fino a € ${v[1]}: incoerente (classe A = fino a circa € 60).`)
    if (cl === 'B' && (v[0] < 30 || v[1] > 800)) out.push(`Classe B ma prezzo € ${v[0]} – € ${v[1]}: incoerente (classe B = circa € 60 – 600).`)
    if (cl === 'C' && v[0] < 300) out.push(`Classe C ma prezzo minimo € ${v[0]}: incoerente (classe C = da circa € 500).`)
  }
  if (v && r) {
    if (r[1] > v[1]) out.push('Il valore di realizzo supera il prezzo di vendita massimo.')
    else if ((r[0] + r[1]) / (v[0] + v[1]) > 0.75) out.push('Il valore di realizzo è troppo vicino al prezzo di vendita (di norma 40–60%).')
  }
  return out
}
export function controllaPerizia(text: string): string[] {
  const out = controllaStima(text)
  const mancanti = SEZIONI.filter(s => !new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(text))
  if (mancanti.length) out.push(`Sezioni mancanti: ${mancanti.join(', ')}.`)
  if (!classeDi(text)) out.push('Classe di valore (A, B, C o D) non indicata.')
  if (!/fiducia\W{0,4}\s*(alta|media|bassa)/i.test(text)) out.push('Livello di fiducia (alta/media/bassa) non indicato.')
  if (/^#{1,6}\s/m.test(text) || /^\s*\|.*\|\s*$/m.test(text)) out.push('Formato: niente intestazioni "#" né tabelle.')
  return out
}

// Riporta un intervallo troppo largo al massimo consentito, restando centrato sulla media geometrica
export function restringiRange(min: number, max: number, lim = 2): [number, number] {
  if (max / min <= lim) return [min, max]
  const g = Math.sqrt(min * max), f = Math.sqrt(lim)
  const step = g < 100 ? 5 : g < 1000 ? 10 : 50
  const lo = Math.max(step, Math.round(g / f / step) * step)
  let hi = Math.round(g * f / step) * step
  if (hi / lo > lim * 1.03) hi = Math.floor(lo * lim / step) * step
  return [lo, Math.max(hi, lo)]
}
const euro = (n: number) => '€ ' + n.toLocaleString('it-IT')
export function fmtRange([a, b]: [number, number]) { return a === b ? euro(a) : `${euro(a)} – ${euro(b)}` }


// ─── Prompt di revisione ─────────────────────────────────────────────────────
const SYSTEM_VERIFICA = `Sei il REVISORE della perizia di Emporio 46, negozio di Firenze di arredi vintage e bijoux. Hai trent'anni di esperienza in antiquariato, modernariato, design, arte, gioielleria e numismatica. La perizia da controllare è una bozza: la rivedi con occhio critico, come se non l'avessi scritta tu, guardando di nuovo la foto.

${PRONTUARIO}

${METODO_STIMA}

${REGOLE_ONESTA}

${REGOLE_TITOLARE}`

function promptVerifica(obs: string, perizia: string, contesto: string, rilievi: string[]) {
  return `OSSERVAZIONI SULLA FOTO:
${obs}
${contesto ? `\nINFORMAZIONI DEL TITOLARE (vincolanti):\n${contesto}\n` : ''}
PERIZIA DA CONTROLLARE:
${perizia}

RILIEVI DEI CONTROLLI AUTOMATICI: ${rilievi.length ? '\n- ' + rilievi.join('\n- ') : 'nessuno'}

Controlla punto per punto, guardando la foto:
1. Ogni affermazione sulla foto (scritte, firme, marchi, materiali, difetti, epoca) è sostenuta dalla foto o dalle osservazioni? Ciò che non lo è va tolto o attenuato.
2. Le attribuzioni d'autore sono ipotesi e non certezze? I dati del titolare sono recepiti senza essere trasformati in autentiche?
3. Il metodo di stima è rispettato: classe coerente, intervalli entro 2× (A, B) o 2,5× (C), nessun prezzo da foto per la classe D, realizzo 40–60%, nessuna quotazione o asta citata, oro e argento senza quotazioni?
4. Coerenza interna tra natura, classe, prezzo e fiducia.
5. Formato: tutte le sezioni, intestazioni in **grassetto**, niente "###" né tabelle.

Rispondi SOLO con un JSON valido:
{ "verdetto": "ok | da_correggere",
  "problemi": [ { "gravita": "alta | media | bassa", "descrizione": "…" } ],
  "testo_corretto": "se da_correggere: l'INTERA perizia riscritta nello stesso formato, cambiando solo ciò che serve; altrimenti null" }`
}


// ─── Osservazione ────────────────────────────────────────────────────────────
interface Osservazione { obsJson: any; meta: PeriziaMeta }

async function osserva(image: string, contesto: string, engine: Engine, step: (s: string) => void): Promise<Osservazione> {
  const prompt = PROMPT_OSSERVA + (contesto ? `\n\nINFORMAZIONI DEL TITOLARE (vincolanti, vedi regole): ${contesto}` : '')
  step('Gemini osserva la foto…')
  let obsJson: any
  try { obsJson = await engine.visionJson(image, SYSTEM_OSSERVA, prompt, 1800) }
  catch (e) { throw new Error(`Gemini non ha potuto analizzare la foto: ${errMsg(e)}`) }
  if (!obsJson || typeof obsJson !== 'object') throw new Error('Gemini non ha restituito una lettura valida della foto. Riprova.')
  return { obsJson, meta: { verifica: 'non-eseguita', problemi: [], avvisi: [] } }
}

async function riscrivi(engine: Engine, testo: string, rilievi: string[], obs: string, contesto: string): Promise<string> {
  const out = await engine.text(SYSTEM_VALUTA,
    `OSSERVAZIONI SULLA FOTO:\n${obs}\n${contesto ? `\nINFORMAZIONI DEL TITOLARE (vincolanti):\n${contesto}\n` : ''}\nPERIZIA DA CORREGGERE:\n${testo}\n\nRILIEVI DA SISTEMARE:\n- ${rilievi.join('\n- ')}\n\nRiscrivi l'INTERA perizia nello stesso formato correggendo solo ciò che serve a risolvere i rilievi. Rispondi solo con la perizia.`, 1900)
  return out.trim()
}

function bloccoVerifica(meta: PeriziaMeta): string {
  const righe: string[] = []
  let testa = 'Analisi con Gemini'
  if (meta.verifica === 'ok') testa += ' · revisione finale: nessun errore'
  else if (meta.verifica === 'corretta') testa += ' · revisione finale: perizia corretta'
  else testa += ' · revisione finale non eseguita'
  righe.push(`**Revisione finale** — ${testa}.`)
  for (const p of meta.problemi.slice(0, 4)) righe.push(`- Corretto in revisione: ${clip(p, 180)}`)
  for (const a of meta.avvisi.slice(0, 4)) righe.push(`- Nota: ${clip(a, 200)}`)
  return righe.join('\n')
}

// ─── Dalla foto alla perizia ─────────────────────────────────────────────────
export async function periziaAnalyze(image: string, contesto = '', opts: RunOpts = {}): Promise<PeriziaResult> {
  const step = opts.onStep ?? (() => {})
  const engine = opts.engine ?? geminiEngine
  const { obsJson, meta } = await osserva(image, contesto, engine, step)
  const obs = fmtObs(obsJson)

  // Perizia
  step('Gemini scrive la perizia…')
  const promptValuta = `OSSERVAZIONI SULLA FOTO (estratte da un analista che ha visto l'immagine):\n${obs}\n${contesto ? `\nINFORMAZIONI DEL TITOLARE (vincolanti, hanno la precedenza sulla foto):\n${contesto}\n` : ''}\nScrivi ora la perizia completa nel formato richiesto. Se le ipotesi hanno confidenza bassa o se l'oggetto è in classe D, applica il metodo di stima con prudenza.`
  let text = (await engine.text(SYSTEM_VALUTA, promptValuta, 1900)).trim()

  // Revisione: Gemini ricontrolla guardando di nuovo la foto
  let rilievi = controllaPerizia(text)
  step('Gemini ricontrolla la perizia sulla foto…')
  try {
    const v = await engine.visionJson(image, SYSTEM_VERIFICA, promptVerifica(obs, text, contesto, rilievi), 3400)
    meta.verificatore = 'Gemini'
    meta.verifica = 'ok'
    const problemi: string[] = (Array.isArray(v?.problemi) ? v.problemi : []).map((p: any) => clip(typeof p === 'string' ? p : p?.descrizione, 220)).filter(Boolean)
    const cand = typeof v?.testo_corretto === 'string' ? v.testo_corretto.trim() : ''
    if (v?.verdetto === 'da_correggere' && cand.length > 400) {
      const dopo = controllaPerizia(cand)
      if (dopo.length <= rilievi.length) { text = cand; meta.verifica = 'corretta'; meta.problemi = problemi; rilievi = dopo }
      else meta.avvisi.push('La correzione proposta dalla revisione è stata scartata perché peggiorava il formato o la stima.')
    }
  } catch (e) {
    meta.avvisi.push(`Revisione finale non riuscita: ${errMsg(e)}`)
  }

  // Se restano rilievi dei controlli automatici, una sola riscrittura mirata
  if (rilievi.length) {
    step('Sistemo gli ultimi rilievi automatici…')
    try {
      const nuova = await riscrivi(engine, text, rilievi, obs, contesto)
      const dopo = controllaPerizia(nuova)
      if (nuova.length > 400 && dopo.length < rilievi.length) { text = nuova; rilievi = dopo }
    } catch { /* si tiene il testo attuale */ }
    if (rilievi.length) meta.avvisi.push('Controllo automatico — da verificare: ' + rilievi.slice(0, 3).join(' '))
  }

  return { text: `${text}\n\n${bloccoVerifica(meta)}`.trim(), obs, meta }
}


// Elenco unico (senza doppioni) di ciò che il titolare ha detto
export function datiTitolare(...liste: (string[] | undefined)[]): string[] {
  const seen = new Set<string>(); const out: string[] = []
  for (const l of liste) for (const raw of l || []) {
    const t = (raw || '').trim(); const k = t.toLowerCase()
    if (t && !seen.has(k)) { seen.add(k); out.push(t) }
  }
  return out
}
// Una frase che è solo una domanda ("quanto vale?") non è un dato sull'oggetto
export const isSoloDomanda = (t: string) => /\?\s*$/.test(t.trim()) && t.trim().length < 70 && !/\d{3,4}/.test(t)

const RICHIESTA_DETTAGLIO = /\b(guarda|guardi|riguarda|vedi|controlla|nella foto|in foto|in basso|in alto|a destra|a sinistra|angolo|firma|firmat|scritta|leggi|leggibil|timbro|punzone|etichetta|marchio|retro|dettaglio|ingrandisc)/i


// Domande e correzioni dell'admin: ogni dato fornito entra come punto di partenza e la valutazione viene rifatta da zero su quello.
// Se l'admin chiede di guardare un dettaglio, Gemini rilegge la foto su quel punto.
export async function periziaFollowUp(o: { obs: string; chat: { role: string; text: string }[]; facts?: string[]; domanda: string; image?: string }, opts: RunOpts = {}): Promise<{ text: string; obs: string }> {
  const engine = opts.engine ?? geminiEngine
  const step = opts.onStep ?? (() => {})
  const adminMsgs = datiTitolare(o.facts, o.chat.filter(m => m.role === 'user').map(m => m.text), [o.domanda])
  let obs = o.obs
  if (o.image && RICHIESTA_DETTAGLIO.test(o.domanda)) {
    step('Gemini rilegge il dettaglio sulla foto…')
    const q = `Il titolare scrive: "${o.domanda}"\nRiguarda la foto con attenzione a quel punto. Descrivi SOLO ciò che si vede davvero e trascrivi letteralmente le scritte/firme/punzoni leggibili; se non si vede o non è leggibile, dillo. Massimo 8 righe.`
    try {
      const r = (await engine.visionText(o.image, SYSTEM_OSSERVA, q, 700)).trim()
      if (r) obs += `\n\nOSSERVAZIONE AGGIUNTIVA (nuova lettura della foto su richiesta del titolare):\n${r}`
    } catch { /* si prosegue con le osservazioni già note */ }
  }
  const ultimaAI = [...o.chat].reverse().find(m => m.role === 'ai' && m.text && !m.text.startsWith('⚠'))?.text || ''
  const prompt = `OSSERVAZIONI SULLA FOTO:\n${obs}

INFORMAZIONI DEL TITOLARE (vincolanti; in ordine cronologico, le più recenti prevalgono):
${adminMsgs.map((t, i) => `${i + 1}. ${t}`).join('\n')}

ULTIMO MESSAGGIO DEL TITOLARE (a cui rispondi ora): ${o.domanda}

TUA PERIZIA PRECEDENTE (può contenere errori, non è vincolante; se contrasta con le informazioni del titolare, scartala):
${ultimaAI.replace(/\n\n\*\*(?:Verifica incrociata|Revisione finale)\*\*[\s\S]*$/, '').slice(0, 2500) || '(nessuna)'}

Rispondi in questo formato (italiano, concisa):
**Ho registrato** — cosa hai capito dall'ultimo messaggio, in 1-3 punti (se cita un autore o un marchio, scrivi nome e cognome completi come li hai intesi e perché sono coerenti con l'oggetto).
**Cosa cambia** — effetto su identificazione, natura/autenticità, epoca, classe di valore. Se è una domanda semplice, rispondi direttamente qui.
**Stima aggiornata** — riga completa ("Prezzo di vendita consigliato", "Valore di realizzo", "Fiducia"; per la classe D: scenario più probabile e "se confermato come autentico: cosa serve per verificarlo").
**Per verificare** — 1-3 controlli o foto utili (solo se servono).`
  step('Gemini aggiorna la perizia…')
  let text = (await engine.text(SYSTEM_VALUTA, prompt, 1600)).trim()
  const rilievi = controllaStima(text)
  if (rilievi.length) {
    step('Controllo della stima…')
    try {
      const nuova = (await engine.text(SYSTEM_VALUTA, `${prompt}\n\nRISPOSTA DA CORREGGERE:\n${text}\n\nRILIEVI DA SISTEMARE:\n- ${rilievi.join('\n- ')}\n\nRiscrivi la risposta nello stesso formato sistemando solo i rilievi. Rispondi solo con la risposta.`, 1600)).trim()
      if (nuova && controllaStima(nuova).length < rilievi.length) text = nuova
    } catch { /* si tiene la risposta attuale */ }
  }
  return { text, obs }
}

// Prezzo per un articolo del catalogo, con lo stesso metodo (usato dal pulsante "Suggerisci prezzo").
export async function periziaPrezzo(nome: string, era: string, categoria: string, descrizione = '', opts: RunOpts = {}): Promise<string> {
  const engine = opts.engine ?? geminiEngine
  const sys = `Sei un perito italiano di antiquariato, modernariato, design, arte, gioielleria e numismatica per un negozio di Firenze.\n\n${PRONTUARIO}\n\n${METODO_STIMA}`
  const q = `Articolo: "${nome}"\nEpoca: ${era || 'non indicata'}\nCategoria: ${categoria || 'non indicata'}\n${descrizione ? `Descrizione: ${descrizione}\n` : ''}\nApplica il metodo di stima. Rispondi SOLO con il prezzo di vendita consigliato nel formato "€ 120 – € 200" (intervallo non più largo di 2×), oppure "Su richiesta" se l'articolo è di classe D o non è stimabile con ragionevole affidabilità. Nessun altro testo.`
  const risposta = (await engine.text(sys, q, 400, 'low')).replace(/^['"`\s]+|['"`\s]+$/g, '').split('\n')[0].trim()
  if (/su richiesta/i.test(risposta)) return 'Su richiesta'
  const r = parseRange(risposta)
  if (!r) return risposta
  return fmtRange(restringiRange(r[0], r[1], 2))
}

// ─── Scheda catalogo da foto (pulsante "Analizza con AI" del modulo oggetto) ──

const SYSTEM_SCHEDA = `Sei un perito italiano e scrivi le schede di catalogo di Emporio 46 (Firenze: arredi vintage e bijoux).\n\n${PRONTUARIO}\n\n${METODO_STIMA}\n\n${REGOLE_ONESTA}\n\n${REGOLE_TITOLARE}`
export interface SchedaResult { scheda: any; meta: PeriziaMeta }
export async function schedaDaFoto(image: string, contesto = '', opts: RunOpts = {}): Promise<SchedaResult> {
  const step = opts.onStep ?? (() => {})
  const engine = opts.engine ?? geminiEngine
  const { obsJson, meta } = await osserva(image, contesto, engine, step)
  step('Gemini compila la scheda…')
  const prompt = `OSSERVAZIONI SULLA FOTO (analista che ha visto l'immagine):\n${fmtObs(obsJson)}\n${contesto ? `\nINFORMAZIONI DEL TITOLARE (vincolanti):\n${contesto}\n` : ''}
Non inventare marchi, firme o autori: se non sono leggibili o sicuri, descrivi lo stile ("nello stile di"). Rispondi SOLO con un JSON valido (niente altro testo) con questi campi:
{
  "nome": "nome preciso e commerciale dell'oggetto in italiano (es. 'Orologio da tavolo Art Déco in ottone dorato')",
  "era": "periodo storico preciso (es. 'Fine '800 - Inizio '900', 'Primo Novecento', 'Art Déco anni '30')",
  "categoria": "una tra: mobili|lampade|bijoux|specchi|cornici|complementi|ceramiche|modernariato|altro",
  "descrizione": "descrizione commerciale accattivante di 2-3 frasi per un negozio di arredi vintage e bijoux, in italiano elegante, basata SOLO su ciò che emerge dalle osservazioni",
  "badge": "etichetta breve (es. 'Disponibile', 'Pezzo raro', 'In vetrina', 'Ottimo stato')",
  "prezzo_suggerito": "fascia ricavata col metodo di stima, formato '€ 120 – € 200' (mai più larga di 2×); 'Su richiesta' se l'oggetto è di classe D o non è stimabile da foto"
}`
  const raw = await engine.text(SYSTEM_SCHEDA, prompt, 1200)
  const scheda = extractJson<any>(raw)
  // La stima si fa rispettare in codice: mai più larga di 2×
  if (typeof scheda?.prezzo_suggerito === 'string' && !/su richiesta/i.test(scheda.prezzo_suggerito)) {
    const r = parseRange(scheda.prezzo_suggerito)
    if (r) scheda.prezzo_suggerito = fmtRange(restringiRange(r[0], r[1], 2))
  }
  return { scheda, meta }
}

export { extractJson }
