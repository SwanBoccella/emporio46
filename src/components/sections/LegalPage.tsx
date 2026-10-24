import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '../../context/AppContext'
import { deriveTheme } from '../../utils/themeColors'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Settings = any

type LegalTab = 'termini' | 'privacy' | 'cookie'

interface LegalPageProps {
  tab: LegalTab
  onTabChange: (tab: LegalTab) => void
  onClose: () => void
}

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number]

const GOLD = 'var(--color-primary)'
const GOLD_DIM = 'rgba(var(--color-primary-rgb), 0.18)'
// These will be overridden per-render via CSS vars set on the root element
const TEXT_LIGHT = 'var(--lp-text)'
const TEXT_MID = 'var(--lp-text-mid)'
const TEXT_DIM = 'var(--lp-text-dim)'
const BG = 'var(--lp-bg)'
const BG2 = 'var(--lp-bg2)'

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: 'var(--font-display)',
      fontSize: 'clamp(1.4rem, 3vw, 2rem)',
      fontWeight: 400,
      color: TEXT_LIGHT,
      marginBottom: '0.5rem',
      marginTop: '3.5rem',
      lineHeight: 1.2,
    }}>
      {children}
    </h2>
  )
}

function ChapterTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      fontFamily: 'var(--font-label)',
      fontSize: '0.62rem',
      letterSpacing: '0.28em',
      textTransform: 'uppercase',
      color: GOLD,
      marginBottom: '0.9rem',
      marginTop: '2.2rem',
      opacity: 0.85,
    }}>
      {children}
    </h3>
  )
}

function Para({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{
      fontFamily: 'var(--font-body)',
      fontSize: '1.05rem',
      color: TEXT_MID,
      lineHeight: 1.85,
      fontWeight: 300,
      marginBottom: '1rem',
      ...style,
    }}>
      {children}
    </p>
  )
}

function Divider() {
  return (
    <div style={{
      height: 1,
      background: `linear-gradient(90deg, transparent, ${GOLD_DIM}, transparent)`,
      margin: '2.5rem 0',
    }} />
  )
}

// Dominio del sito (preso dall'indirizzo da cui viene servito)
const siteHost = () => (typeof window !== 'undefined' ? window.location.hostname : '')

function TerminiContent({ settings }: { settings: Settings }) {
  return (
    <div>
      <Para>
        I presenti Termini di Servizio ("Termini") disciplinano l'utilizzo del sito web
        <strong style={{ color: TEXT_LIGHT }}> {siteHost()}</strong> ("Sito") e dei servizi offerti da
        <strong style={{ color: TEXT_LIGHT }}> {settings.siteName}</strong>{settings.titolare ? `, gestito da ${settings.titolare}` : ''},
        con sede in {settings.indirizzo} — {settings.citta}, Italia.
        Accedendo al Sito, l'utente dichiara di aver letto e accettato integralmente i presenti Termini.
      </Para>

      <Divider />

      <SectionTitle>1. Definizioni</SectionTitle>
      <ChapterTitle>1.1 — Parti del contratto</ChapterTitle>
      <Para>
        Con "Titolare" o "noi" si intende {settings.titolare ? `${settings.titolare}, titolare` : 'il titolare'} dell'attività {settings.siteName}.
        Con "Utente" o "tu" si intende qualsiasi persona fisica o giuridica che accede al Sito.
        Con "Servizi" si intende l'insieme delle funzionalità disponibili sul Sito, inclusi catalogo,
        modulo di contatto (visita in negozio, richiesta oggetti e messaggi).
      </Para>

      <ChapterTitle>1.2 — Oggetti e catalogo</ChapterTitle>
      <Para>
        Il catalogo pubblicato sul Sito ha carattere puramente informativo e indicativo. La disponibilità
        degli oggetti è soggetta a variazioni senza preavviso. Le immagini e le descrizioni sono fornite
        in buona fede e riflettono lo stato dell'oggetto al momento dell'inserimento nel catalogo.
      </Para>

      <Divider />

      <SectionTitle>2. Accesso e utilizzo del Sito</SectionTitle>
      <ChapterTitle>2.1 — Requisiti di accesso</ChapterTitle>
      <Para>
        Il Sito è accessibile gratuitamente a chiunque disponga di una connessione internet. Il Titolare
        si riserva il diritto di sospendere o interrompere l'accesso al Sito in qualsiasi momento,
        senza preavviso, per motivi tecnici, di manutenzione o di sicurezza.
      </Para>

      <ChapterTitle>2.2 — Utilizzo consentito</ChapterTitle>
      <Para>
        L'Utente si impegna a utilizzare il Sito esclusivamente per finalità lecite e nel rispetto delle
        presenti condizioni. È vietato: (a) raccogliere informazioni sugli utenti senza consenso;
        (b) inviare comunicazioni non richieste (spam); (c) tentare di accedere senza autorizzazione
        a sistemi informatici collegati al Sito; (d) pubblicare o trasmettere contenuti illegali, offensivi
        o diffamatori.
      </Para>

      <ChapterTitle>2.3 — Contenuti del Sito</ChapterTitle>
      <Para>
        Tutti i contenuti presenti sul Sito — testi, immagini, grafica, loghi e codice sorgente — sono
        di proprietà di {settings.siteName} o dei rispettivi titolari, salvo diversa indicazione, e sono
        protetti dalle leggi vigenti in materia di proprietà intellettuale. È vietata la riproduzione,
        anche parziale, senza autorizzazione scritta del Titolare.
      </Para>

      <Divider />

      <SectionTitle>3. Servizi offerti</SectionTitle>
      <ChapterTitle>3.1 — Catalogo e disponibilità</ChapterTitle>
      <Para>
        Gli oggetti presenti nel catalogo sono pezzi unici o in numero limitato, vintage e d'epoca. La pubblicazione sul Sito non
        costituisce offerta vincolante. Il Titolare si riserva il diritto di modificare prezzi, descrizioni
        e disponibilità in qualsiasi momento. Per informazioni aggiornate, l'Utente è invitato a contattare
        direttamente il negozio.
      </Para>

      <ChapterTitle>3.2 — Prenotazione visita</ChapterTitle>
      <Para>
        La prenotazione di una visita tramite il modulo online è una richiesta di appuntamento e non
        costituisce conferma automatica. Il Titolare si impegna a rispondere entro 24-48 ore lavorative
        per confermare data e orario. La visita potrà essere modificata o annullata da entrambe le parti
        con ragionevole preavviso.
      </Para>

      <ChapterTitle>3.3 — Ricerca su commissione</ChapterTitle>
      <Para>
        Il servizio di ricerca su commissione viene avviato a seguito di richiesta esplicita dell'Utente.
        Il Titolare si impegna a comunicare lo stato della ricerca ma non garantisce il reperimento
        dell'oggetto nei tempi o nei termini indicati dall'Utente, trattandosi di mercato vintage e dell'usato
        soggetto a disponibilità variabili.
      </Para>

      <ChapterTitle>3.4 — Disponibilità e informazioni</ChapterTitle>
      <Para>
        Le informazioni su disponibilità, misure, epoca e stato di conservazione degli oggetti hanno
        carattere indicativo: trattandosi di pezzi unici, un oggetto può risultare venduto prima
        dell'aggiornamento del sito. Per conferme è possibile contattare direttamente il negozio.
      </Para>

      <Divider />

      <SectionTitle>4. Responsabilità e limitazioni</SectionTitle>
      <ChapterTitle>4.1 — Esclusione di garanzie</ChapterTitle>
      <Para>
        Il Sito è fornito "così com'è". Il Titolare non garantisce che il Sito sia esente da errori,
        interruzioni o virus. L'Utente utilizza il Sito a proprio rischio e pericolo, nei limiti consentiti
        dalla legge applicabile.
      </Para>

      <ChapterTitle>4.2 — Link esterni</ChapterTitle>
      <Para>
        Il Sito può contenere link a siti web di terze parti. Il Titolare non è responsabile dei contenuti,
        delle politiche sulla privacy o delle pratiche di tali siti. L'inclusione di un link non implica
        approvazione del sito collegato.
      </Para>

      <ChapterTitle>4.3 — Forza maggiore</ChapterTitle>
      <Para>
        Il Titolare non sarà responsabile per ritardi o inadempimenti causati da eventi al di fuori del
        proprio controllo ragionevole, inclusi disastri naturali, interruzioni di rete, pandemie
        o azioni di autorità governative.
      </Para>

      <Divider />

      <SectionTitle>5. Legge applicabile e foro competente</SectionTitle>
      <ChapterTitle>5.1 — Diritto applicabile</ChapterTitle>
      <Para>
        I presenti Termini sono regolati dalla legge italiana. Per qualsiasi controversia relativa
        all'interpretazione, validità o esecuzione dei presenti Termini, le parti si sottomettono
        alla giurisdizione esclusiva del Tribunale di Firenze, salvo diversa normativa applicabile
        ai consumatori.
      </Para>

      <ChapterTitle>5.2 — Risoluzione alternativa delle controversie</ChapterTitle>
      <Para>
        In caso di controversie, le parti si impegnano a ricercare in buona fede una soluzione amichevole
        prima di adire le vie legali. È possibile utilizzare la piattaforma europea di risoluzione
        delle controversie online (ODR) disponibile all'indirizzo ec.europa.eu/consumers/odr.
      </Para>

      <Divider />

      <SectionTitle>6. Modifiche ai Termini</SectionTitle>
      <Para>
        Il Titolare si riserva il diritto di modificare i presenti Termini in qualsiasi momento.
        Le modifiche saranno pubblicate sul Sito con indicazione della data di aggiornamento.
        L'utilizzo continuato del Sito dopo la pubblicazione delle modifiche costituisce accettazione
        delle stesse. Si consiglia di consultare periodicamente questa pagina.
      </Para>

      <Para style={{ marginTop: '2rem', color: TEXT_DIM, fontStyle: 'italic', fontSize: '0.92rem' } as React.CSSProperties}>
        Ultima revisione: {settings.legalRevision || 'ottobre 2026'} · {settings.siteName}{settings.titolare ? ` — ${settings.titolare}` : ''}, {settings.indirizzo}, {settings.citta}
      </Para>
    </div>
  )
}

function PrivacyContent({ settings }: { settings: Settings }) {
  return (
    <div>
      <Para>
        La presente Informativa sulla Privacy ("Informativa") descrive le modalità con cui
        <strong style={{ color: TEXT_LIGHT }}> {settings.siteName}</strong>{settings.titolare ? ` — ${settings.titolare}` : ''}
        (di seguito "Titolare del Trattamento") raccoglie, utilizza e protegge i dati personali degli
        utenti che visitano il sito <strong style={{ color: TEXT_LIGHT }}>{siteHost()}</strong>.
        Il trattamento avviene nel rispetto del Regolamento (UE) 2016/679 (GDPR) e del D.Lgs. 196/2003
        come modificato dal D.Lgs. 101/2018.
      </Para>

      <Divider />

      <SectionTitle>1. Titolare del Trattamento</SectionTitle>
      <ChapterTitle>1.1 — Dati identificativi</ChapterTitle>
      <Para>
        {settings.titolare && <>Titolare del trattamento: {settings.titolare}<br /></>}
        Attività: {settings.siteName}{settings.pivaText ? ` · ${settings.pivaText}` : ''}<br />
        Sede: {settings.indirizzo} — {settings.citta}, Italia<br />
        {settings.email && <>Email: {settings.email}<br /></>}
        Telefono: {settings.telefono}<br />
        Instagram: {settings.instagramHandle}
      </Para>

      <Divider />

      <SectionTitle>2. Tipologie di dati raccolti</SectionTitle>
      <ChapterTitle>2.1 — Dati di navigazione</ChapterTitle>
      <Para>
        I sistemi informatici e le procedure software preposte al funzionamento del Sito acquisiscono,
        nel corso del loro normale esercizio, alcuni dati personali la cui trasmissione è implicita
        nell'uso dei protocolli di comunicazione internet. Si tratta di informazioni non raccolte per
        essere associate a interessati identificati, ma che per loro stessa natura potrebbero, attraverso
        elaborazioni ed associazioni con dati detenuti da terzi, permettere di identificare gli utenti:
        indirizzi IP, tipo di browser, sistema operativo, pagine visitate e orari di accesso.
      </Para>

      <ChapterTitle>2.2 — Dati forniti volontariamente</ChapterTitle>
      <Para>
        L'invio facoltativo, esplicito e volontario di messaggi attraverso i moduli di contatto del Sito
        (visita in negozio, richiesta oggetto, messaggio) comporta la raccolta dei dati personali
        inseriti dall'utente: nome, cognome, indirizzo email, numero di telefono (facoltativo), data/orario
        preferito, descrizione della richiesta e note aggiuntive.
      </Para>

      <ChapterTitle>2.3 — Cookie e tecnologie simili</ChapterTitle>
      <Para>
        Il Sito utilizza cookie tecnici necessari al funzionamento e cookie di preferenza per ricordare
        le scelte dell'utente (lingua selezionata). Per dettagli completi si rimanda alla sezione
        Cookie Policy. Non vengono utilizzati cookie di profilazione di terze parti senza esplicito consenso.
      </Para>

      <Divider />

      <SectionTitle>3. Finalità e basi giuridiche del trattamento</SectionTitle>
      <ChapterTitle>3.1 — Gestione delle richieste</ChapterTitle>
      <Para>
        <strong style={{ color: TEXT_LIGHT }}>Finalità:</strong> Rispondere alle richieste di prenotazione,
        informazioni sui pezzi e ricerca di oggetti su richiesta.<br />
        <strong style={{ color: TEXT_LIGHT }}>Base giuridica:</strong> Esecuzione di misure precontrattuali
        su richiesta dell'interessato (Art. 6, par. 1, lett. b GDPR).
      </Para>

      <ChapterTitle>3.2 — Miglioramento del Sito</ChapterTitle>
      <Para>
        <strong style={{ color: TEXT_LIGHT }}>Finalità:</strong> Analisi statistica anonima dell'utilizzo
        del Sito per migliorarne funzionalità e contenuti.<br />
        <strong style={{ color: TEXT_LIGHT }}>Base giuridica:</strong> Legittimo interesse del Titolare
        (Art. 6, par. 1, lett. f GDPR), che non pregiudica i diritti fondamentali dell'interessato.
      </Para>

      <ChapterTitle>3.3 — Adempimenti legali</ChapterTitle>
      <Para>
        <strong style={{ color: TEXT_LIGHT }}>Finalità:</strong> Adempimento di obblighi di legge,
        regolamentari o contrattuali.<br />
        <strong style={{ color: TEXT_LIGHT }}>Base giuridica:</strong> Obbligo legale (Art. 6, par. 1,
        lett. c GDPR).
      </Para>

      <Divider />

      <SectionTitle>4. Modalità e durata del trattamento</SectionTitle>
      <ChapterTitle>4.1 — Modalità di trattamento</ChapterTitle>
      <Para>
        I dati personali sono trattati con strumenti automatizzati e manuali, nel rispetto delle misure
        tecniche e organizzative adeguate a garantirne la sicurezza. I dati non sono soggetti a decisioni
        automatizzate né a profilazione.
      </Para>

      <ChapterTitle>4.2 — Conservazione dei dati</ChapterTitle>
      <Para>
        I dati forniti tramite i moduli di contatto sono conservati per il tempo strettamente necessario
        a evadere la richiesta e, successivamente, per un periodo massimo di 24 mesi salvo obblighi
        di legge che impongano termini più lunghi. I dati di navigazione sono conservati per un massimo
        di 12 mesi.
      </Para>

      <ChapterTitle>4.3 — Sicurezza</ChapterTitle>
      <Para>
        Il Titolare adotta misure tecniche e organizzative adeguate per proteggere i dati personali
        da accessi non autorizzati, perdita, distruzione o divulgazione. Tuttavia, nessun sistema di
        trasmissione via internet è completamente sicuro; si invita a non trasmettere dati sensibili
        tramite email ordinaria.
      </Para>

      <Divider />

      <SectionTitle>5. Comunicazione e diffusione dei dati</SectionTitle>
      <ChapterTitle>5.1 — Destinatari</ChapterTitle>
      <Para>
        I dati personali non sono ceduti, venduti o diffusi a terzi per finalità commerciali. Possono
        essere comunicati a soggetti che forniscono servizi strumentali al funzionamento del Sito
        (hosting, email), che agiscono come responsabili del trattamento ai sensi dell'Art. 28 GDPR.
      </Para>

      <ChapterTitle>5.2 — Trasferimento internazionale</ChapterTitle>
      <Para>
        I dati non vengono trasferiti in paesi al di fuori dell'Unione Europea o dello Spazio Economico
        Europeo, salvo diversa comunicazione. Eventuali trasferimenti avverranno nel rispetto delle
        garanzie previste dal Capo V del GDPR (decisioni di adeguatezza, clausole contrattuali standard).
      </Para>

      <Divider />

      <SectionTitle>6. Diritti dell'interessato</SectionTitle>
      <ChapterTitle>6.1 — Elenco dei diritti</ChapterTitle>
      <Para>
        Ai sensi degli Artt. 15-22 del GDPR, l'interessato ha il diritto di:
        (a) accedere ai propri dati personali; (b) rettificare dati inesatti; (c) ottenere la cancellazione
        dei propri dati ("diritto all'oblio"); (d) limitare il trattamento in determinate circostanze;
        (e) opporsi al trattamento fondato su legittimo interesse; (f) ricevere i propri dati in formato
        strutturato (portabilità); (g) revocare il consenso in qualsiasi momento senza pregiudicare
        la liceità del trattamento precedente alla revoca.
      </Para>

      <ChapterTitle>6.2 — Come esercitare i diritti</ChapterTitle>
      <Para>
        Per esercitare i diritti sopra indicati, l'interessato può inviare una richiesta scritta a:
        {settings.email || settings.telefono}, specificando nome, cognome e diritto che intende esercitare.
        Il Titolare risponderà entro 30 giorni dalla ricezione della richiesta (termine prorogabile
        di ulteriori 60 giorni in caso di complessità).
      </Para>

      <ChapterTitle>6.3 — Reclamo all'Autorità di controllo</ChapterTitle>
      <Para>
        Qualora l'interessato ritenga che il trattamento dei propri dati personali violi il GDPR,
        ha il diritto di proporre reclamo al Garante per la Protezione dei Dati Personali
        (www.garanteprivacy.it) o all'autorità di controllo dello Stato membro in cui risiede
        abitualmente o lavora.
      </Para>

      <Divider />

      <SectionTitle>7. Modifiche all'Informativa</SectionTitle>
      <Para>
        Il Titolare si riserva il diritto di aggiornare la presente Informativa in qualsiasi momento.
        Le modifiche saranno pubblicate su questa pagina con evidenza della data di revisione.
        Si consiglia di consultare periodicamente questa sezione per tenersi informati.
      </Para>

      <Para style={{ marginTop: '2rem', color: TEXT_DIM, fontStyle: 'italic', fontSize: '0.92rem' } as React.CSSProperties}>
        Ultima revisione: {settings.legalRevision || 'maggio 2026'} · Informativa redatta in conformità al Reg. UE 2016/679 (GDPR)
      </Para>
    </div>
  )
}

function CookieContent({ settings }: { settings: Settings }) {
  return (
    <div>
      <Para>
        La presente Cookie Policy descrive le tipologie di cookie e tecnologie di tracciamento utilizzate
        dal sito <strong style={{ color: TEXT_LIGHT }}>{siteHost()}</strong> gestito da
        <strong style={{ color: TEXT_LIGHT }}> {settings.siteName}{settings.titolare ? ` — ${settings.titolare}` : ''}</strong>.
        È redatta in conformità con il Provvedimento del Garante Privacy dell'8 maggio 2014 e successive
        linee guida, nonché con il GDPR (Reg. UE 2016/679).
      </Para>

      <Divider />

      <SectionTitle>1. Cosa sono i cookie</SectionTitle>
      <ChapterTitle>1.1 — Definizione</ChapterTitle>
      <Para>
        I cookie sono piccoli file di testo che un sito web invia al browser dell'utente durante la
        navigazione. Vengono memorizzati sul dispositivo dell'utente e ritrasmessi al sito ad ogni
        visita successiva. I cookie permettono al sito di riconoscere il dispositivo e di ricordare
        determinate informazioni (come le preferenze di lingua o lo stato di autenticazione).
      </Para>

      <ChapterTitle>1.2 — Tecnologie simili</ChapterTitle>
      <Para>
        Oltre ai cookie tradizionali, il Sito utilizza il <em>localStorage</em> del browser per
        memorizzare preferenze dell'utente (catalogo personalizzato, lingua) in modo persistente
        sul dispositivo. Questi dati non sono trasmessi automaticamente al server ad ogni richiesta
        e rimangono sul dispositivo fino a cancellazione manuale.
      </Para>

      <Divider />

      <SectionTitle>2. Tipologie di cookie utilizzati</SectionTitle>
      <ChapterTitle>2.1 — Cookie tecnici strettamente necessari</ChapterTitle>
      <Para>
        Questi cookie sono indispensabili per il corretto funzionamento del Sito e non possono essere
        disabilitati senza compromettere l'usabilità. Non richiedono consenso ai sensi della normativa
        vigente. Includono cookie di sessione, cookie di sicurezza e cookie necessari all'erogazione
        dei servizi richiesti dall'utente.
      </Para>
      <Para>
        <strong style={{ color: TEXT_LIGHT }}>Esempi:</strong> gestione della sessione, prevenzione
        di attacchi CSRF, funzionalità di navigazione base.
        <br /><strong style={{ color: TEXT_LIGHT }}>Durata:</strong> sessione o fino a 12 mesi.
      </Para>

      <ChapterTitle>2.2 — Cookie di preferenza (funzionali)</ChapterTitle>
      <Para>
        Questi cookie permettono al Sito di ricordare le scelte effettuate dall'utente (come la lingua
        preferita) per offrire un'esperienza di navigazione personalizzata. Senza questi cookie,
        alcune funzionalità potrebbero non essere disponibili.
      </Para>
      <Para>
        <strong style={{ color: TEXT_LIGHT }}>Dati memorizzati:</strong> lingua selezionata (IT/EN),
        dati del catalogo personalizzato in localStorage.
        <br /><strong style={{ color: TEXT_LIGHT }}>Durata:</strong> persistente (localStorage, fino a cancellazione).
      </Para>

      <ChapterTitle>2.3 — Cookie analitici (se presenti)</ChapterTitle>
      <Para>
        Il Sito può utilizzare strumenti di analisi statistica per comprendere come gli utenti interagiscono
        con i contenuti. Qualsiasi strumento analitico viene configurato in modalità anonimizzata,
        in modo che i dati raccolti non possano essere ricondotti a singoli individui identificabili.
        In assenza di anonimizzazione, viene richiesto il consenso esplicito dell'utente.
      </Para>

      <ChapterTitle>2.4 — Cookie di terze parti</ChapterTitle>
      <Para>
        Il Sito può contenere contenuti incorporati da servizi di terze parti (es. Google Maps per
        la visualizzazione della posizione del negozio). Tali servizi possono impostare cookie propri
        nel browser dell'utente. Si raccomanda di consultare le informative privacy dei rispettivi
        fornitori: Google LLC (maps.google.com/policies/privacy).
      </Para>

      <Divider />

      <SectionTitle>3. Come gestire i cookie</SectionTitle>
      <ChapterTitle>3.1 — Impostazioni del browser</ChapterTitle>
      <Para>
        L'utente può gestire, bloccare o eliminare i cookie attraverso le impostazioni del proprio browser.
        Di seguito le istruzioni per i browser più comuni:
      </Para>
      <Para>
        <strong style={{ color: TEXT_LIGHT }}>Google Chrome:</strong> Impostazioni → Privacy e sicurezza → Cookie e altri dati dei siti<br />
        <strong style={{ color: TEXT_LIGHT }}>Mozilla Firefox:</strong> Opzioni → Privacy e sicurezza → Cookie e dati dei siti<br />
        <strong style={{ color: TEXT_LIGHT }}>Safari:</strong> Preferenze → Privacy → Gestisci dati sito web<br />
        <strong style={{ color: TEXT_LIGHT }}>Microsoft Edge:</strong> Impostazioni → Cookie e autorizzazioni sito → Cookie e dati memorizzati
      </Para>

      <ChapterTitle>3.2 — Conseguenze della disabilitazione</ChapterTitle>
      <Para>
        La disabilitazione totale dei cookie potrebbe impedire il corretto funzionamento di alcune
        sezioni del Sito (es. memorizzazione delle preferenze di lingua, funzionalità del catalogo).
        I cookie tecnici strettamente necessari non possono essere disabilitati tramite le impostazioni
        del Sito, ma possono essere bloccati dal browser, con possibile compromissione del servizio.
      </Para>

      <ChapterTitle>3.3 — Cancellazione del localStorage</ChapterTitle>
      <Para>
        Per cancellare i dati memorizzati in localStorage: aprire gli Strumenti per sviluppatori del
        browser (F12 su Chrome/Firefox) → scheda "Applicazione" o "Storage" → "Local Storage" →
        selezionare il sito → eliminare le voci. In alternativa, cancellare la cronologia di navigazione
        con l'opzione "Cookie e altri dati dei siti" selezionata.
      </Para>

      <Divider />

      <SectionTitle>4. Tabella riepilogativa dei cookie</SectionTitle>
      <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: 'var(--font-body)',
          fontSize: '0.95rem',
          color: TEXT_MID,
        }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${GOLD_DIM}` }}>
              {['Nome / Chiave', 'Tipo', 'Finalità', 'Durata', 'Consenso'].map(h => (
                <th key={h} style={{
                  padding: '0.7rem 1rem',
                  textAlign: 'left',
                  fontFamily: 'var(--font-label)',
                  fontSize: '0.5rem',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: GOLD,
                  opacity: 0.7,
                  fontWeight: 400,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['mnt_catalog', 'localStorage', 'Salvataggio catalogo personalizzato', 'Persistente', 'Non richiesto'],
              ['mnt_reviews', 'localStorage', 'Salvataggio recensioni personalizzate', 'Persistente', 'Non richiesto'],
              ['mnt_admin', 'localStorage', 'Stato di autenticazione admin', 'Persistente', 'Non richiesto'],
              ['Sessione browser', 'Cookie tecnico', 'Funzionamento sessione utente', 'Sessione', 'Non richiesto'],
              ['Google Maps', 'Cookie di terze parti', 'Visualizzazione mappa posizione', 'Variabile', 'Raccomandato'],
            ].map((row, i) => (
              <tr key={i} style={{ borderBottom: `1px solid rgba(var(--color-primary-rgb), 0.05)` }}>
                {row.map((cell, j) => (
                  <td key={j} style={{
                    padding: '0.65rem 1rem',
                    color: j === 0 ? TEXT_LIGHT : TEXT_MID,
                    fontWeight: j === 0 ? 400 : 300,
                    fontStyle: j === 4 ? 'italic' : 'normal',
                  }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Divider />

      <SectionTitle>5. Aggiornamenti alla Cookie Policy</SectionTitle>
      <Para>
        Il Titolare si riserva il diritto di aggiornare la presente Cookie Policy in qualsiasi momento,
        ad esempio in seguito all'introduzione di nuovi cookie o al cambiamento della normativa applicabile.
        Le modifiche saranno pubblicate su questa pagina con indicazione della data di revisione.
        Si invita a consultare periodicamente questa sezione.
      </Para>

      <Para>
        Per qualsiasi domanda relativa ai cookie o al trattamento dei dati, contattare il Titolare
        all'indirizzo: <strong style={{ color: TEXT_LIGHT }}>{settings.email || settings.telefono}</strong>
      </Para>

      <Para style={{ marginTop: '2rem', color: TEXT_DIM, fontStyle: 'italic', fontSize: '0.92rem' } as React.CSSProperties}>
        Ultima revisione: {settings.legalRevision || 'maggio 2026'} · Cookie Policy conforme al Provvedimento Garante Privacy 8/5/2014 e GDPR
      </Para>
    </div>
  )
}

export default function LegalPage({ tab, onTabChange, onClose }: LegalPageProps) {
  const { lang, settings } = useApp()
  const containerRef = useRef<HTMLDivElement>(null)

  // Scroll to top on tab change
  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [tab])

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const tabs: { id: LegalTab; label: string; labelEn: string }[] = [
    { id: 'termini', label: 'Termini di Servizio', labelEn: 'Terms of Service' },
    { id: 'privacy', label: 'Privacy Policy', labelEn: 'Privacy Policy' },
    { id: 'cookie', label: 'Cookie Policy', labelEn: 'Cookie Policy' },
  ]

  const titles: Record<LegalTab, { it: string; en: string }> = {
    termini: { it: 'Termini di Servizio', en: 'Terms of Service' },
    privacy: { it: 'Privacy Policy', en: 'Privacy Policy' },
    cookie: { it: 'Cookie Policy', en: 'Cookie Policy' },
  }

  const subtitles: Record<LegalTab, { it: string; en: string }> = {
    termini: { it: 'Condizioni generali di utilizzo del sito e dei servizi', en: 'General terms of use for the website and services' },
    privacy: { it: 'Informativa sul trattamento dei dati personali ai sensi del GDPR', en: 'Personal data processing notice pursuant to GDPR' },
    cookie: { it: 'Informativa sull\'utilizzo di cookie e tecnologie di tracciamento', en: 'Notice on the use of cookies and tracking technologies' },
  }

  // Derive theme-aware colors from settings
  const th = deriveTheme(settings)
  const isDark = th.isDark
  const lpBg      = settings.bgColor        || '#0a0805'
  const lpBg2     = settings.bgAltColor     || (isDark ? '#0e0b07' : '#e8e0d4')
  const lpText    = th.text
  const lpTextDim = th.muted
  const lpTextMid = th.soft

  const lpVars = {
    '--lp-bg': lpBg,
    '--lp-bg2': lpBg2,
    '--lp-text': lpText,
    '--lp-text-dim': lpTextDim,
    '--lp-text-mid': lpTextMid,
  } as React.CSSProperties

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60000,
        background: BG,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        ...lpVars,
      }}
      ref={containerRef}
    >
      {/* Decorative background */}
      <div style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        backgroundImage: `
          repeating-linear-gradient(47deg, transparent, transparent 28px, rgba(var(--color-primary-rgb), 0.025) 28px, rgba(var(--color-primary-rgb), 0.025) 29px),
          repeating-linear-gradient(-47deg, transparent, transparent 28px, rgba(var(--color-primary-rgb), 0.018) 28px, rgba(var(--color-primary-rgb), 0.018) 29px)
        `,
      }} />
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        height: 300,
        background: 'radial-gradient(ellipse 70% 50% at 50% 110%, rgba(120,70,10,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto', padding: '6rem clamp(1.5rem, 6vw, 5rem) 8rem' }}>

        {/* Back button */}
        <motion.button
          onClick={onClose}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.6rem',
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-label)', fontSize: '0.52rem',
            letterSpacing: '0.28em', textTransform: 'uppercase',
            color: TEXT_DIM, marginBottom: '3.5rem',
            padding: 0, transition: 'color 0.3s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = TEXT_LIGHT)}
          onMouseLeave={e => (e.currentTarget.style.color = TEXT_DIM)}
        >
          <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
            <path d="M15 5H1M5 1L1 5l4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {lang === 'it' ? 'Torna al sito' : 'Back to site'}
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
          style={{ marginBottom: '3rem' }}
        >
          <p style={{
            fontFamily: 'var(--font-label)', fontSize: '0.48rem',
            letterSpacing: '0.5em', textTransform: 'uppercase',
            color: `rgba(var(--color-primary-rgb), 0.5)`, marginBottom: '1.4rem',
          }}>
            {settings.siteName} · Firenze
          </p>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2rem, 5vw, 3.2rem)',
            fontWeight: 400, color: TEXT_LIGHT, lineHeight: 1.1, marginBottom: '0.8rem',
          }}>
            {titles[tab][lang as 'it' | 'en']}
          </h1>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1.05rem', color: TEXT_DIM,
            fontStyle: 'italic', fontWeight: 300, lineHeight: 1.6,
          }}>
            {subtitles[tab][lang as 'it' | 'en']}
          </p>
        </motion.div>

        {/* Tab selector */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease }}
          style={{
            display: 'flex', gap: '0', marginBottom: '4rem',
            borderBottom: `1px solid ${GOLD_DIM}`,
            overflowX: 'auto',
          }}
        >
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              style={{
                fontFamily: 'var(--font-label)',
                fontSize: '0.52rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                padding: '0.9rem 1.6rem',
                background: 'none',
                border: 'none',
                borderBottom: tab === t.id ? `1px solid ${GOLD}` : '1px solid transparent',
                marginBottom: -1,
                color: tab === t.id ? GOLD : TEXT_DIM,
                cursor: 'pointer',
                transition: 'all 0.3s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { if (tab !== t.id) e.currentTarget.style.color = TEXT_LIGHT }}
              onMouseLeave={e => { if (tab !== t.id) e.currentTarget.style.color = TEXT_DIM }}
            >
              {lang === 'it' ? t.label : t.labelEn}
            </button>
          ))}
        </motion.div>

        {/* Gold rule */}
        <div style={{ width: 48, height: 1, background: `linear-gradient(90deg, ${GOLD}, transparent)`, marginBottom: '3rem', opacity: 0.6 }} />

        {/* Content area */}
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
        >
          {tab === 'termini' && <TerminiContent settings={settings} />}
          {tab === 'privacy' && <PrivacyContent settings={settings} />}
          {tab === 'cookie' && <CookieContent settings={settings} />}
        </motion.div>

        {/* Footer nav */}
        <div style={{
          marginTop: '5rem',
          padding: '2.5rem',
          border: `1px solid ${GOLD_DIM}`,
          background: BG2,
        }}>
          <p style={{
            fontFamily: 'var(--font-label)', fontSize: '0.48rem',
            letterSpacing: '0.38em', textTransform: 'uppercase',
            color: `rgba(var(--color-primary-rgb), 0.45)`, marginBottom: '1.2rem',
          }}>
            {lang === 'it' ? 'Altre sezioni legali' : 'Other legal sections'}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            {tabs.filter(t => t.id !== tab).map(t => (
              <button
                key={t.id}
                onClick={() => onTabChange(t.id)}
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.98rem',
                  fontStyle: 'italic',
                  color: TEXT_DIM,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.3rem 0',
                  transition: 'color 0.3s',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
                onMouseLeave={e => (e.currentTarget.style.color = TEXT_DIM)}
              >
                <span style={{ width: 12, height: 1, background: GOLD, opacity: 0.4, display: 'inline-block' }} />
                {lang === 'it' ? t.label : t.labelEn}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom close */}
        <div style={{ marginTop: '3rem', textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{
              fontFamily: 'var(--font-label)', fontSize: '0.52rem',
              letterSpacing: '0.22em', textTransform: 'uppercase',
              padding: '0.75rem 2.2rem',
              border: `1px solid ${GOLD_DIM}`,
              color: TEXT_DIM, background: 'none', cursor: 'pointer',
              transition: 'all 0.35s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.color = GOLD }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = GOLD_DIM; e.currentTarget.style.color = TEXT_DIM }}
          >
            ← {lang === 'it' ? 'Torna al sito' : 'Back to site'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
