// ─── Perizia AI: doppia IA (Gemini + Groq) coordinata, con prontuario del settore ────────────
// Le fasi (osservazione, riconciliazione, perizia, revisione) sono descritte più sotto, nel blocco "DOPPIA IA".
// Qui in alto: prontuario di riconoscimento, metodo di stima e regole di onestà, condivisi da entrambe le IA.
import { groqExpertVisionJson, groqExpertVisionText, groqExpertText, extractJson } from './groq'
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
// DOPPIA IA: Gemini + Groq coordinati
// ─────────────────────────────────────────────────────────────────────────────
// 1) OSSERVAZIONE  Gemini e Groq guardano la foto IN PARALLELO e in modo indipendente (stesso metodo, stesso prontuario).
// 2) RICONCILIAZIONE  Gemini fa da arbitro: rivede la foto dove le due letture divergono (categoria, natura, scritte, autore),
//    tiene solo ciò che legge davvero e, nei casi dubbi, sceglie la lettura più prudente. Un confronto automatico a parte
//    (confronta) misura l'accordo e impedisce all'arbitro di dichiararlo più alto di quanto sia.
// 3) PERIZIA  la scrive Groq (testo) a partire dalle osservazioni riconciliate; se Groq manca la scrive Gemini.
// 4) REVISIONE  l'IA che NON ha scritto la perizia la ricontrolla guardando la foto, insieme a controlli automatici
//    (intervalli di prezzo, classe di valore, realizzo, sezioni obbligatorie). Se trova errori la perizia viene corretta.
// Se una delle due IA non è disponibile (chiave mancante, quota, modello dismesso) si prosegue con l'altra, dichiarandolo.
// ═════════════════════════════════════════════════════════════════════════════

export type Think = 'low' | 'medium' | 'high'
export interface Engine {
  name: 'Gemini' | 'Groq'
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
export const groqEngine: Engine = {
  name: 'Groq',
  visionJson: (i, s, p, m) => groqExpertVisionJson(i, s, p, m),
  visionText: (i, s, p, m) => groqExpertVisionText(i, s, p, m),
  text: (s, p, m, t = 'medium') => groqExpertText(s, p, m, t),
}
export const defaultEngines = (): Engine[] => [geminiEngine, groqEngine]

export type Accordo = 'alto' | 'medio' | 'basso'
export interface Discrepanza { campo: string; gemini: string; groq: string; verdetto: string; risolta: boolean }
export interface PeriziaMeta {
  modo: 'duo' | 'solo-gemini' | 'solo-groq'
  accordo?: Accordo
  discrepanze: Discrepanza[]
  verifica: 'ok' | 'corretta' | 'non-eseguita'
  verificatore?: string
  problemi: string[]   // rilievi trovati dalla revisione (anche quelli già corretti)
  avvisi: string[]     // limiti incontrati durante il lavoro
}
export interface PeriziaResult { text: string; obs: string; meta?: PeriziaMeta }
export interface RunOpts { engines?: Engine[]; onStep?: (s: string) => void }

const errMsg = (e: unknown) => ((e as Error)?.message || String(e) || 'errore').replace(/\s+/g, ' ').slice(0, 220)
const clip = (v: unknown, n = 240) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n)

function fmtObs(o: any): string {
  try { return JSON.stringify(o, null, 1).slice(0, 9000) } catch { return String(o) }
}

// ─── Confronto automatico tra le due letture ─────────────────────────────────
const N = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
const isNone = (t: string) => !t || /^(nessun|null$|nulla|non leggibil|non determinabil|assent|n a$|sconosciut|ignot)/.test(t)
const tokens = (t: string, min = 3) => new Set(t.split(' ').filter(w => w.length >= min))
function jaccard(a: string, b: string) {
  const A = tokens(a, 2), B = tokens(b, 2)
  if (!A.size || !B.size) return 0
  let inter = 0; A.forEach(w => { if (B.has(w)) inter++ })
  return inter / (A.size + B.size - inter)
}

export interface Confronto {
  macro: boolean; natura: boolean
  autore: 'uguale' | 'diverso' | 'una-sola' | 'nessuno'
  scritte: 'uguali' | 'diverse' | 'una-sola' | 'nessuna'
  livello: Accordo
  diffs: { campo: string; gemini: string; groq: string }[]
}
export function confronta(a: any, b: any): Confronto {
  const macro = N(a?.macro_categoria) === N(b?.macro_categoria)
  const natura = N(a?.natura) === N(b?.natura)
  const ta = N(a?.ipotesi?.[0]?.autore_o_marca), tb = N(b?.ipotesi?.[0]?.autore_o_marca)
  const na = isNone(ta), nb = isNone(tb)
  const autore: Confronto['autore'] = na && nb ? 'nessuno' : na !== nb ? 'una-sola'
    : [...tokens(ta, 4)].some(w => tokens(tb, 4).has(w)) || ta === tb ? 'uguale' : 'diverso'
  const sa = N(a?.scritte_marchi_firme), sb = N(b?.scritte_marchi_firme)
  const xa = isNone(sa), xb = isNone(sb)
  const scritte: Confronto['scritte'] = xa && xb ? 'nessuna' : xa !== xb ? 'una-sola' : jaccard(sa, sb) >= 0.5 ? 'uguali' : 'diverse'
  const diffs: Confronto['diffs'] = []
  if (!macro) diffs.push({ campo: 'categoria', gemini: clip(a?.macro_categoria, 60), groq: clip(b?.macro_categoria, 60) })
  if (!natura) diffs.push({ campo: 'natura/autenticità', gemini: clip(a?.natura, 60), groq: clip(b?.natura, 60) })
  if (autore === 'diverso' || autore === 'una-sola') diffs.push({ campo: 'autore/marca', gemini: clip(a?.ipotesi?.[0]?.autore_o_marca) || 'nessuno', groq: clip(b?.ipotesi?.[0]?.autore_o_marca) || 'nessuno' })
  if (scritte === 'diverse' || scritte === 'una-sola') diffs.push({ campo: 'scritte/marchi', gemini: clip(a?.scritte_marchi_firme) || 'nessuna', groq: clip(b?.scritte_marchi_firme) || 'nessuna' })
  const livello: Accordo = !macro || autore === 'diverso' || scritte === 'diverse' ? 'basso'
    : !natura || autore === 'una-sola' || scritte === 'una-sola' ? 'medio' : 'alto'
  return { macro, natura, autore, scritte, livello, diffs }
}
const RANK: Record<Accordo, number> = { basso: 0, medio: 1, alto: 2 }
const minAccordo = (a: Accordo, b?: Accordo): Accordo => (b && RANK[b] < RANK[a] ? b : a)
const asAccordo = (v: unknown): Accordo | undefined => { const t = N(v); return t === 'alto' || t === 'medio' || t === 'basso' ? t : undefined }

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

// ─── Prompt di riconciliazione e di revisione ────────────────────────────────
const SYSTEM_ARBITRO = `Sei un perito italiano con trent'anni di esperienza in antiquariato, modernariato, design, arte moderna e contemporanea, gioielleria, numismatica, moda vintage e oggettistica. Lavori per un negozio di Firenze (arredi vintage e bijoux).

${PRONTUARIO}

${REGOLE_ONESTA}

${REGOLE_TITOLARE}

Il tuo compito ORA è fare da ARBITRO tra due analisti che hanno osservato la stessa foto in modo indipendente. Non stimare prezzi.`

function promptArbitro(a: any, b: any, cmp: Confronto, contesto: string) {
  return `LETTURA A (analista Gemini):
${fmtObs(a)}

LETTURA B (analista Groq):
${fmtObs(b)}

SEGNALI AUTOMATICI DI CONFRONTO: categoria ${cmp.macro ? 'uguale' : 'DIVERSA'} · natura ${cmp.natura ? 'uguale' : 'DIVERSA'} · autore/marca ${cmp.autore} · scritte ${cmp.scritte}.
${contesto ? `\nINFORMAZIONI DEL TITOLARE (vincolanti):\n${contesto}\n` : ''}
COMPITO
1. Riguarda tu la foto, soprattutto dove le due letture divergono (categoria, natura, scritte, autore/marca, epoca, materiali, stato).
2. Produci UNA sola lettura, la più corretta e prudente.

REGOLE DI RICONCILIAZIONE
- Scritte, firme, punzoni: in "scritte_marchi_firme" metti SOLO ciò che leggi tu stesso nell'immagine. Se un analista riporta qualcosa che non riesci a confermare, NON includerlo: scrivilo in "da_verificare" come "scritta non confermata: …".
- Dove i due concordano in modo indipendente la confidenza può restare o salire; dove discordano deve scendere.
- Discrepanza che non riesci a risolvere guardando la foto: scegli la lettura più PRUDENTE (replica/riproduzione piuttosto che originale; nessuna attribuzione piuttosto che un'attribuzione) e segna risolta=false.
- Non aggiungere dettagli che nessuno dei due ha visto e che tu non vedi. I dati del titolare restano vincolanti.

Rispondi SOLO con un JSON valido: gli stessi campi della lettura (macro_categoria, cosa_vedo, scritte_marchi_firme, materiali_e_tecnica, indizi_epoca, stato, ipotesi, natura, da_verificare) più:
"accordo": {
  "livello": "alto | medio | basso",
  "punti_concordi": ["ciò su cui le due letture concordano davvero"],
  "discrepanze": [ { "campo": "...", "gemini": "cosa dice A", "groq": "cosa dice B", "verdetto": "cosa vedi tu e cosa hai scelto", "risolta": true } ]
}`
}

const SYSTEM_VERIFICA = `Sei il REVISORE della perizia di Emporio 46, negozio di Firenze di arredi vintage e bijoux. Hai trent'anni di esperienza in antiquariato, modernariato, design, arte, gioielleria e numismatica. Non hai scritto la perizia: la controlli con occhio critico guardando la foto.

${PRONTUARIO}

${METODO_STIMA}

${REGOLE_ONESTA}

${REGOLE_TITOLARE}`

function promptVerifica(obs: string, perizia: string, contesto: string, rilievi: string[]) {
  return `OSSERVAZIONI RICONCILIATE SULLA FOTO:
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

// ─── Osservazione + riconciliazione (condivisa da perizia e scheda catalogo) ──
interface Osservazione { obsJson: any; meta: PeriziaMeta; alive: Engine[] }

async function osservaRiconcilia(image: string, contesto: string, engines: Engine[], step: (s: string) => void): Promise<Osservazione> {
  const prompt = PROMPT_OSSERVA + (contesto ? `\n\nINFORMAZIONI DEL TITOLARE (vincolanti, vedi regole): ${contesto}` : '')
  step(engines.length > 1 ? 'Gemini e Groq osservano la foto in parallelo…' : `${engines[0]?.name} osserva la foto…`)
  const settled = await Promise.allSettled(engines.map(e => e.visionJson(image, SYSTEM_OSSERVA, prompt, 1800)))
  const ok: { e: Engine; obs: any }[] = []
  const avvisi: string[] = []
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value && typeof r.value === 'object') ok.push({ e: engines[i], obs: r.value })
    else avvisi.push(`${engines[i].name} non ha potuto analizzare la foto: ${errMsg(r.status === 'rejected' ? r.reason : 'risposta non valida')}`)
  })
  if (!ok.length) throw new Error(`Nessuna IA ha risposto. ${avvisi.join(' · ')}`)

  const alive = ok.map(x => x.e)
  const meta: PeriziaMeta = { modo: alive.length > 1 ? 'duo' : alive[0].name === 'Gemini' ? 'solo-gemini' : 'solo-groq', discrepanze: [], verifica: 'non-eseguita', problemi: [], avvisi }
  if (ok.length === 1) {
    if (engines.length > 1) avvisi.push(`Analisi eseguita con la sola ${ok[0].e.name}: l'accordo tra due IA non è verificabile.`)
    return { obsJson: ok[0].obs, meta, alive }
  }

  const gem = ok.find(x => x.e.name === 'Gemini')!, gro = ok.find(x => x.e.name === 'Groq')!
  const cmp = confronta(gem.obs, gro.obs)
  step(cmp.livello === 'alto' ? 'Le due letture concordano: Gemini le riconcilia…' : 'Le letture divergono: Gemini fa da arbitro e riguarda la foto…')
  let merged: any = null
  for (const arbitro of [gem.e, gro.e]) {
    try {
      const r = await arbitro.visionJson(image, SYSTEM_ARBITRO, promptArbitro(gem.obs, gro.obs, cmp, contesto), 2800)
      if (r && typeof r === 'object' && r.macro_categoria) { merged = r; if (arbitro !== gem.e) avvisi.push('Arbitro: Gemini non ha risposto, ha arbitrato Groq.'); break }
    } catch (e) { avvisi.push(`Riconciliazione con ${arbitro.name} non riuscita: ${errMsg(e)}`) }
  }
  if (!merged) {
    // nessun arbitro: si tiene la lettura di Gemini e le differenze diventano "da verificare"
    avvisi.push('Riconciliazione non riuscita: uso la lettura di Gemini e segnalo le differenze come da verificare.')
    merged = { ...gem.obs, da_verificare: [...(Array.isArray(gem.obs.da_verificare) ? gem.obs.da_verificare : []), ...cmp.diffs.map(d => `Le due IA divergono su ${d.campo} (Gemini: ${d.gemini}; Groq: ${d.groq})`)] }
    meta.accordo = cmp.livello
    meta.discrepanze = cmp.diffs.map(d => ({ ...d, verdetto: 'non arbitrata', risolta: false }))
    return { obsJson: merged, meta, alive }
  }

  const arb = merged.accordo && typeof merged.accordo === 'object' ? merged.accordo : {}
  delete merged.accordo
  meta.accordo = minAccordo(cmp.livello, asAccordo(arb.livello) ?? cmp.livello)
  const dis: Discrepanza[] = (Array.isArray(arb.discrepanze) ? arb.discrepanze : []).slice(0, 8).map((d: any) => ({
    campo: clip(d?.campo, 60), gemini: clip(d?.gemini), groq: clip(d?.groq), verdetto: clip(d?.verdetto, 300), risolta: d?.risolta === true,
  })).filter((d: Discrepanza) => d.campo)
  // differenze viste dal confronto automatico che l'arbitro non ha menzionato: restano visibili e non risolte
  for (const d of cmp.diffs) {
    const nd = N(d.campo).split(' ')[0]
    if (!dis.some(x => N(x.campo).includes(nd) || nd.includes(N(x.campo).split(' ')[0] || '#'))) dis.push({ ...d, verdetto: 'non valutata dall\'arbitro: da verificare', risolta: false })
  }
  meta.discrepanze = dis
  return { obsJson: merged, meta, alive }
}

// ─── Scelta dei ruoli ────────────────────────────────────────────────────────
function ruoli(alive: Engine[]): { writer: Engine; verifier: Engine; other?: Engine } {
  const writer = alive.find(e => e.name === 'Groq') ?? alive[0]
  const other = alive.find(e => e !== writer)
  return { writer, verifier: other ?? writer, other }
}

async function riscrivi(writer: Engine, testo: string, rilievi: string[], obs: string, contesto: string): Promise<string> {
  const out = await writer.text(SYSTEM_VALUTA,
    `OSSERVAZIONI SULLA FOTO:\n${obs}\n${contesto ? `\nINFORMAZIONI DEL TITOLARE (vincolanti):\n${contesto}\n` : ''}\nPERIZIA DA CORREGGERE:\n${testo}\n\nRILIEVI DA SISTEMARE:\n- ${rilievi.join('\n- ')}\n\nRiscrivi l'INTERA perizia nello stesso formato correggendo solo ciò che serve a risolvere i rilievi. Rispondi solo con la perizia.`, 1900)
  return out.trim()
}

function bloccoVerifica(meta: PeriziaMeta): string {
  const righe: string[] = []
  const chi = meta.modo === 'duo' ? 'Gemini + Groq' : meta.modo === 'solo-gemini' ? 'Gemini' : 'Groq'
  let testa = `Analisi con ${chi}`
  if (meta.accordo) testa += ` · accordo tra le due IA: ${meta.accordo.toUpperCase()}`
  if (meta.verifica === 'ok') testa += ` · revisione di ${meta.verificatore}: nessun errore`
  else if (meta.verifica === 'corretta') testa += ` · revisione di ${meta.verificatore}: perizia corretta`
  else testa += ' · revisione finale non eseguita'
  righe.push(`**Verifica incrociata** — ${testa}.`)
  for (const d of meta.discrepanze.slice(0, 5)) righe.push(`- ${d.campo}: Gemini «${clip(d.gemini, 90)}» / Groq «${clip(d.groq, 90)}» → ${clip(d.verdetto, 160)}${d.risolta ? '' : ' (da verificare)'}`)
  for (const p of meta.problemi.slice(0, 4)) righe.push(`- Corretto in revisione: ${clip(p, 180)}`)
  for (const a of meta.avvisi.slice(0, 4)) righe.push(`- Nota: ${clip(a, 200)}`)
  return righe.join('\n')
}

// ─── Passo 1+2+3+4: dalla foto alla perizia ──────────────────────────────────
export async function periziaAnalyze(image: string, contesto = '', opts: RunOpts = {}): Promise<PeriziaResult> {
  const step = opts.onStep ?? (() => {})
  const engines = opts.engines ?? defaultEngines()
  const { obsJson, meta, alive } = await osservaRiconcilia(image, contesto, engines, step)
  const obs = fmtObs(obsJson)
  const { writer, verifier } = ruoli(alive)

  // Perizia
  step(`${writer.name} scrive la perizia…`)
  const promptValuta = `OSSERVAZIONI SULLA FOTO (${meta.modo === 'duo' ? 'lettura unica riconciliata da due analisti indipendenti' : 'estratte da un analista che ha visto l\'immagine'}):\n${obs}\n${contesto ? `\nINFORMAZIONI DEL TITOLARE (vincolanti, hanno la precedenza sulla foto):\n${contesto}\n` : ''}\nScrivi ora la perizia completa nel formato richiesto. Se le ipotesi hanno confidenza bassa, se le due IA divergono o se l'oggetto è in classe D, applica il metodo di stima con prudenza.`
  let text = ''
  let writerUsato = writer
  try { text = (await writer.text(SYSTEM_VALUTA, promptValuta, 1900)).trim() }
  catch (e) {
    const altro = alive.find(x => x !== writer)
    if (!altro) throw e
    meta.avvisi.push(`${writer.name} non ha potuto scrivere la perizia (${errMsg(e)}): l'ha scritta ${altro.name}.`)
    text = (await altro.text(SYSTEM_VALUTA, promptValuta, 1900)).trim(); writerUsato = altro
  }

  // Revisione: l'altra IA (o la stessa, se è l'unica) controlla guardando la foto
  const revisore = writerUsato === writer ? verifier : (alive.find(x => x !== writerUsato) ?? writerUsato)
  let rilievi = controllaPerizia(text)
  step(`${revisore.name} ricontrolla la perizia sulla foto…`)
  try {
    const v = await revisore.visionJson(image, SYSTEM_VERIFICA, promptVerifica(obs, text, contesto, rilievi), 3400)
    meta.verificatore = revisore === writerUsato ? `${revisore.name} (autoverifica)` : revisore.name
    meta.verifica = 'ok'
    const problemi: string[] = (Array.isArray(v?.problemi) ? v.problemi : []).map((p: any) => clip(typeof p === 'string' ? p : p?.descrizione, 220)).filter(Boolean)
    const cand = typeof v?.testo_corretto === 'string' ? v.testo_corretto.trim() : ''
    if (v?.verdetto === 'da_correggere' && cand.length > 400) {
      const dopo = controllaPerizia(cand)
      if (dopo.length <= rilievi.length) { text = cand; meta.verifica = 'corretta'; meta.problemi = problemi; rilievi = dopo }
      else meta.avvisi.push('La correzione proposta dal revisore è stata scartata perché peggiorava il formato o la stima.')
    }
  } catch (e) {
    meta.avvisi.push(`Revisione finale non riuscita: ${errMsg(e)}`)
  }

  // Se restano rilievi dei controlli automatici, una sola riscrittura mirata
  if (rilievi.length) {
    step('Sistemo gli ultimi rilievi automatici…')
    try {
      const nuova = await riscrivi(writerUsato, text, rilievi, obs, contesto)
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
// Se l'admin chiede di guardare un dettaglio, la foto viene riletta da ENTRAMBE le IA e le due letture vengono messe a confronto.
export async function periziaFollowUp(o: { obs: string; chat: { role: string; text: string }[]; facts?: string[]; domanda: string; image?: string }, opts: RunOpts = {}): Promise<{ text: string; obs: string }> {
  const engines = opts.engines ?? defaultEngines()
  const step = opts.onStep ?? (() => {})
  const adminMsgs = datiTitolare(o.facts, o.chat.filter(m => m.role === 'user').map(m => m.text), [o.domanda])
  let obs = o.obs
  let alive = engines
  if (o.image && RICHIESTA_DETTAGLIO.test(o.domanda)) {
    step('Rileggo il dettaglio sulla foto con entrambe le IA…')
    const q = `Il titolare scrive: "${o.domanda}"\nRiguarda la foto con attenzione a quel punto. Descrivi SOLO ciò che si vede davvero e trascrivi letteralmente le scritte/firme/punzoni leggibili; se non si vede o non è leggibile, dillo. Massimo 8 righe.`
    const res = await Promise.allSettled(engines.map(e => e.visionText(o.image!, SYSTEM_OSSERVA, q, 700)))
    const righe: string[] = []
    const vivi: Engine[] = []
    res.forEach((r, i) => { if (r.status === 'fulfilled' && r.value.trim()) { righe.push(`[${engines[i].name}] ${r.value.trim()}`); vivi.push(engines[i]) } })
    if (righe.length) {
      obs += `\n\nOSSERVAZIONE AGGIUNTIVA (nuova lettura della foto su richiesta del titolare${righe.length > 1 ? '; due letture indipendenti: dove divergono, vale solo ciò che è confermato da entrambe' : ''}):\n${righe.join('\n')}`
      alive = vivi
    }
  }
  const ultimaAI = [...o.chat].reverse().find(m => m.role === 'ai' && m.text && !m.text.startsWith('⚠'))?.text || ''
  const prompt = `OSSERVAZIONI SULLA FOTO:\n${obs}

INFORMAZIONI DEL TITOLARE (vincolanti; in ordine cronologico, le più recenti prevalgono):
${adminMsgs.map((t, i) => `${i + 1}. ${t}`).join('\n')}

ULTIMO MESSAGGIO DEL TITOLARE (a cui rispondi ora): ${o.domanda}

TUA PERIZIA PRECEDENTE (può contenere errori, non è vincolante; se contrasta con le informazioni del titolare, scartala):
${ultimaAI.replace(/\n\n\*\*Verifica incrociata\*\*[\s\S]*$/, '').slice(0, 2500) || '(nessuna)'}

Rispondi in questo formato (italiano, concisa):
**Ho registrato** — cosa hai capito dall'ultimo messaggio, in 1-3 punti (se cita un autore o un marchio, scrivi nome e cognome completi come li hai intesi e perché sono coerenti con l'oggetto).
**Cosa cambia** — effetto su identificazione, natura/autenticità, epoca, classe di valore. Se è una domanda semplice, rispondi direttamente qui.
**Stima aggiornata** — riga completa ("Prezzo di vendita consigliato", "Valore di realizzo", "Fiducia"; per la classe D: scenario più probabile e "se confermato come autentico: cosa serve per verificarlo").
**Per verificare** — 1-3 controlli o foto utili (solo se servono).`
  const { writer } = ruoli(alive.length ? alive : engines)
  step(`${writer.name} aggiorna la perizia…`)
  let text = ''
  try { text = (await writer.text(SYSTEM_VALUTA, prompt, 1600)).trim() }
  catch (e) {
    const altro = (alive.length ? alive : engines).find(x => x !== writer)
    if (!altro) throw e
    text = (await altro.text(SYSTEM_VALUTA, prompt, 1600)).trim()
  }
  const rilievi = controllaStima(text)
  if (rilievi.length) {
    step('Controllo della stima…')
    try {
      const nuova = (await writer.text(SYSTEM_VALUTA, `${prompt}\n\nRISPOSTA DA CORREGGERE:\n${text}\n\nRILIEVI DA SISTEMARE:\n- ${rilievi.join('\n- ')}\n\nRiscrivi la risposta nello stesso formato sistemando solo i rilievi. Rispondi solo con la risposta.`, 1600)).trim()
      if (nuova && controllaStima(nuova).length < rilievi.length) text = nuova
    } catch { /* si tiene la risposta attuale */ }
  }
  return { text, obs }
}

// Prezzo per un articolo del catalogo, con lo stesso metodo (usato dal pulsante "Suggerisci prezzo").
// Le due IA stimano in modo indipendente: se le fasce si sovrappongono vale la sovrapposizione; se sono lontane vale la più prudente.
export async function periziaPrezzo(nome: string, era: string, categoria: string, descrizione = '', opts: RunOpts = {}): Promise<string> {
  const engines = opts.engines ?? defaultEngines()
  const sys = `Sei un perito italiano di antiquariato, modernariato, design, arte, gioielleria e numismatica per un negozio di Firenze.\n\n${PRONTUARIO}\n\n${METODO_STIMA}`
  const q = `Articolo: "${nome}"\nEpoca: ${era || 'non indicata'}\nCategoria: ${categoria || 'non indicata'}\n${descrizione ? `Descrizione: ${descrizione}\n` : ''}\nApplica il metodo di stima. Rispondi SOLO con il prezzo di vendita consigliato nel formato "€ 120 – € 200" (intervallo non più largo di 2×), oppure "Su richiesta" se l'articolo è di classe D o non è stimabile con ragionevole affidabilità. Nessun altro testo.`
  const res = await Promise.allSettled(engines.map(e => e.text(sys, q, 400, 'low')))
  const risposte = res.flatMap(r => r.status === 'fulfilled' ? [r.value.replace(/^['"`\s]+|['"`\s]+$/g, '').split('\n')[0].trim()] : [])
  if (!risposte.length) { const f = res.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined; throw f?.reason ?? new Error('Nessuna IA ha risposto.') }
  if (risposte.some(r => /su richiesta/i.test(r))) return 'Su richiesta'
  const ranges = risposte.map(r => parseRange(r)).filter((r): r is [number, number] => !!r)
  if (!ranges.length) return risposte[0]
  let out: [number, number]
  if (ranges.length === 1) out = ranges[0]
  else {
    const lo = Math.max(ranges[0][0], ranges[1][0]), hi = Math.min(ranges[0][1], ranges[1][1])
    out = lo <= hi ? [lo, hi] : (ranges[0][0] + ranges[0][1] <= ranges[1][0] + ranges[1][1] ? ranges[0] : ranges[1])
  }
  const [a, b] = restringiRange(out[0], out[1], 2)
  return fmtRange([a, b])
}

// ─── Scheda catalogo da foto (pulsante "Analizza con AI" del modulo oggetto) ──
const SYSTEM_SCHEDA = `Sei un perito italiano e scrivi le schede di catalogo di Emporio 46 (Firenze: arredi vintage e bijoux).\n\n${PRONTUARIO}\n\n${METODO_STIMA}\n\n${REGOLE_ONESTA}\n\n${REGOLE_TITOLARE}`
export interface SchedaResult { scheda: any; meta: PeriziaMeta }
export async function schedaDaFoto(image: string, contesto = '', opts: RunOpts = {}): Promise<SchedaResult> {
  const step = opts.onStep ?? (() => {})
  const engines = opts.engines ?? defaultEngines()
  const { obsJson, meta, alive } = await osservaRiconcilia(image, contesto, engines, step)
  const { writer } = ruoli(alive)
  step(`${writer.name} compila la scheda…`)
  const prompt = `OSSERVAZIONI SULLA FOTO (${meta.modo === 'duo' ? 'lettura riconciliata da due analisti indipendenti' : 'analista singolo'}):\n${fmtObs(obsJson)}\n${contesto ? `\nINFORMAZIONI DEL TITOLARE (vincolanti):\n${contesto}\n` : ''}
Non inventare marchi, firme o autori: se non sono leggibili o sicuri, descrivi lo stile ("nello stile di"). Rispondi SOLO con un JSON valido (niente altro testo) con questi campi:
{
  "nome": "nome preciso e commerciale dell'oggetto in italiano (es. 'Orologio da tavolo Art Déco in ottone dorato')",
  "era": "periodo storico preciso (es. 'Fine '800 - Inizio '900', 'Primo Novecento', 'Art Déco anni '30')",
  "categoria": "una tra: mobili|lampade|bijoux|specchi|cornici|complementi|ceramiche|modernariato|altro",
  "descrizione": "descrizione commerciale accattivante di 2-3 frasi per un negozio di arredi vintage e bijoux, in italiano elegante, basata SOLO su ciò che emerge dalle osservazioni",
  "badge": "etichetta breve (es. 'Disponibile', 'Pezzo raro', 'In vetrina', 'Ottimo stato')",
  "prezzo_suggerito": "fascia ricavata col metodo di stima, formato '€ 120 – € 200' (mai più larga di 2×); 'Su richiesta' se l'oggetto è di classe D o non è stimabile da foto"
}`
  let raw = ''
  try { raw = await writer.text(SYSTEM_SCHEDA, prompt, 1200) }
  catch (e) {
    const altro = alive.find(x => x !== writer)
    if (!altro) throw e
    meta.avvisi.push(`${writer.name} non ha compilato la scheda (${errMsg(e)}): l'ha compilata ${altro.name}.`)
    raw = await altro.text(SYSTEM_SCHEDA, prompt, 1200)
  }
  const scheda = extractJson<any>(raw)
  // La stima si fa rispettare in codice: mai più larga di 2×
  if (typeof scheda?.prezzo_suggerito === 'string' && !/su richiesta/i.test(scheda.prezzo_suggerito)) {
    const r = parseRange(scheda.prezzo_suggerito)
    if (r) scheda.prezzo_suggerito = fmtRange(restringiRange(r[0], r[1], 2))
  }
  return { scheda, meta }
}

export { extractJson }
