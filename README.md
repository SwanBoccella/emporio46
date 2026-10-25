# Emporio 46

**Sito web per negozio di arredi vintage e bijoux — React + TypeScript + Vite**

Sito vetrina per **Emporio 46**, negozio di arredi vintage e bijoux in Via Giampaolo Orsini 46/A, Firenze. SPA completamente admin-driven: tutti i contenuti, i colori, i font e le funzionalità si configurano dal pannello di amministrazione integrato, senza toccare il codice. Testi, impostazioni e catalogo si salvano su Cloudflare D1; immagini, video e modello 3D caricati dall'admin si salvano su Cloudflare R2 (`/media/<id>`): tutto è visibile a ogni visitatore. `localStorage` fa solo da cache.

---

> **v58 – Cloudflare.** Il sito è pubblicato come **Cloudflare Worker** con file statici: i contenuti del pannello admin stanno in **Cloudflare D1** (tabella `site_data`), i file caricati (immagini, video di sfondo, modello 3D) in **Cloudflare R2**. Il **Gist** è ora opzionale (copia di sicurezza / fonte da cui migrare i dati esistenti). I visitatori leggono da `/api/site-data`; se il server non risponde, il sito ricade sul Gist. `sitemap.xml` e `robots.txt` sono generati dal Worker con il dominio reale.

## Indice

- [Anteprima](#anteprima)
- [Stack tecnologico](#stack-tecnologico)
- [Struttura del progetto](#struttura-del-progetto)
- [Funzionalità principali](#funzionalità-principali)
- [Pannello Admin](#pannello-admin)
- [Avvio locale](#avvio-locale)
- [Build e deploy](#build-e-deploy)
  - [Deploy su Cloudflare](#deploy-su-cloudflare)
- [Configurazione EmailJS](#configurazione-emailjs)
- [Variabili d'ambiente](#variabili-dambiente)
- [Pagina offline](#pagina-offline)
- [Internazionalizzazione](#internazionalizzazione)
- [Personalizzazione tema](#personalizzazione-tema)
- [Note tecniche](#note-tecniche)

---

## Anteprima

| Sezione | Descrizione |
|---|---|
| **Hero** | Canvas 2D con particelle dorate + sfondo Three.js con orbs animati e anello toroidale |
| **About** | Testo con immagine parallasse, sepia/opacity configurabili, statistiche animate |
| **Catalogo** | Griglia filtrabile per categoria, ricerca testuale, dettaglio a pannello laterale, badge sconto |
| **Why** | Quattro card con icone e testi personalizzabili dall'admin |
| **Recensioni** | Carousel con card featured + side, sfondo immagine con parallasse |
| **Contatti** | Form a tre tab (Appuntamento / Richiesta oggetto / Richiesta stima) con invio EmailJS |
| **Location** | Mappa Google Maps embed + orari settimanali |
| **Footer** | Logo, link rapidi, pagine legali integrate |

---

## Stack tecnologico

| Categoria | Libreria / Tool | Versione |
|---|---|---|
| UI framework | React | 18.3 |
| Linguaggio | TypeScript | 5.5 |
| Build tool | Vite | 5.3 |
| Stili | Tailwind CSS | 3.4 |
| Animazioni scroll | GSAP + ScrollTrigger | 3.12 |
| Animazioni UI | Framer Motion | 11.3 |
| Smooth scroll | Lenis | 1.1 |
| 3D / WebGL | Three.js | 0.167 |
| Email | EmailJS Browser | 4.3 |
| SEO | react-helmet-async | 2.0 |

---

## Struttura del progetto

```
emporio-46/
├── public/
│   ├── favicon.svg
│   ├── offline.html            # Pagina mostrata quando manca la connessione
│   ├── sw.js                   # Service worker: serve offline.html se il sito non è raggiungibile
│   └── _headers                # Header di sicurezza e cache (letti da Cloudflare Assets)
├── src/
│   ├── components/
│   │   ├── admin/
│   │   │   └── AdminPanel.tsx  # Pannello admin completo (~216 KB)
│   │   ├── sections/
│   │   │   ├── HeroSection.tsx
│   │   │   ├── AboutSection.tsx
│   │   │   ├── CatalogSection.tsx
│   │   │   ├── WhySection.tsx
│   │   │   ├── ReviewsSection.tsx
│   │   │   ├── ContactSection.tsx
│   │   │   ├── LocationSection.tsx
│   │   │   ├── FooterSection.tsx
│   │   │   ├── MaintenancePage.tsx
│   │   │   └── LegalPage.tsx
│   │   └── ui/
│   │       ├── Navbar.tsx
│   │       ├── Cursor.tsx      # Cursore custom animato
│   │       ├── Loader.tsx      # Schermata di caricamento
│   │       ├── MarqueeStrip.tsx
│   │       └── WhatsAppButton.tsx
│   ├── context/
│   │   └── AppContext.tsx      # Stato globale + persistenza localStorage
│   ├── hooks/
│   │   └── useLenis.ts         # Smooth scroll (GSAP ticker integrato)
│   ├── i18n/
│   │   └── translations.ts     # Testi IT / EN
│   ├── types/
│   │   └── index.ts            # CatalogItem, Recensione, SitoData, Translation
│   ├── utils/
│   │   └── whatsapp.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── wrangler.jsonc              # Configurazione Cloudflare (Worker, Assets, D1, R2)
├── worker/                     # API: admin, contenuti (D1), file (R2), proxy Groq, sitemap/robots
├── migrations/                 # Schema D1 (applicato anche in automatico dal Worker)
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## Funzionalità principali

### Hero
- Canvas 2D con particelle animate (ambra/polvere), risposta al mouse
- Background Three.js: 22 orbs fluttuanti + anello toroidale rotante
- Testo con reveal GSAP, parallasse sullo scroll
- Immagine di sfondo con opacità e luminosità configurabili dall'admin

### Catalogo
- Griglia responsive con 9 oggetti per pagina (configurabile)
- Filtro per categoria (tag attivi visivamente)
- Ricerca testuale in tempo reale
- Pannello laterale di dettaglio con galleria immagini
- Badge di stato: `disponibile`, `in vetrina`, `in trattativa`, `venduto`
- Sistema sconti: percentuale, fisso, spedizione gratuita, omaggio
- Prezzi opzionali (toggle dall'admin)
- Bilingue IT/EN su ogni articolo

### Sistema sconti
- Gestione sconti globali con ID
- Associazione sconto → singoli articoli del catalogo
- Prezzo barrato + badge percentuale
- Data di scadenza per ogni sconto
- Visibilità nel catalogo configurabile

### Contatti / EmailJS
- Tre form separati con template ID distinti:
  - **Appuntamento**: nome, cognome, email, telefono, data, ora, note
  - **Richiesta oggetto**: categoria, descrizione, note
  - **Richiesta stima**: descrizione oggetto, note
- Integrazione EmailJS configurabile dall'admin **oppure** con le variabili di build `VITE_EMAILJS_*` su Cloudflare (vedi [Variabili d'ambiente](#variabili-dambiente))
- Pulsante WhatsApp con testo prefill dinamico

### Pagine legali
- Tre tab integrate: **Termini e condizioni**, **Privacy Policy**, **Cookie Policy**
- Testi generati automaticamente con P.IVA e data revisione configurabili
- Accessibili da navbar e footer senza routing esterno

### Modalità manutenzione
- Pagina di placeholder con countdown a data/ora configurabile
- Messaggio personalizzato, immagine di sfondo, logo opzionale
- Al termine del countdown: ripristino automatico del sito
- Il pannello admin rimane sempre accessibile (overlay sopra la manutenzione)

### Banner annunci
- Banner fisso in cima alla pagina (sopra la navbar)
- Testo, colore di sfondo configurabili
- Supporto bilingue

### Cursore custom
- Cursore a doppio cerchio che segue il mouse con spring
- Effetto hover su elementi interattivi
- Disattivabile dall'admin

---

## Pannello Admin

Accessibile premendo l'icona ⚙ in basso a destra. Protetto da password (default: `St3f4ni4Z0cch12026`, modificabile dall'admin stesso).

### Tab disponibili

| Tab | Contenuto |
|---|---|
| **Dashboard** | Riepilogo: totale oggetti, disponibili, in evidenza, rating medio |
| **Catalogo** | CRUD completo articoli: nome IT/EN, era, categoria, prezzo, stato, immagini, sconti |
| **Recensioni** | CRUD recensioni: autore, città, stelle, testo IT/EN, visibilità, in evidenza |
| **Impostazioni** | Identità sito, contatti, link social, Google Maps, orari, testi about, EmailJS |
| **SEO** | Meta title, description, keywords, robots, OG image, canonical, Google Analytics ID |
| **Media** | URL immagini hero, about, footer, recensioni + slider opacità/luminosità/sepia |
| **Aspetto** | Palette colori (7 variabili), font display/body, preset tema one-click |
| **Sconti** | Creazione/gestione sconti, associazione ad articoli, date di scadenza |
| **Banner** | Banner annunci: testo, colore, attiva/disattiva |
| **Orari** | Orari giornalieri lun–dom (testo libero) |
| **Analytics** | Visualizzazione rapida configurazione GA4 |

### Preset tema
Quattro preset predefiniti one-click:
- **Emporio 46** (default) — marrone caldo quasi-nero, ambra vintage con accento verde petrolio
- **Oro scuro** — sfondo quasi-nero, oro antico
- **Avorio** — toni chiari caldi, oro tenue
- **Bordeaux** — sfondo vinoso, accenti bordeaux
- **Grafite** — grigio neutro, accenti argento

### Persistenza
Tutti i dati sono salvati in `localStorage` con le chiavi:
```
mnt_settings
mnt_settings_en
mnt_catalog
mnt_reviews
mnt_seo
```

---

## Avvio locale

### Prerequisiti
- Node.js ≥ 18
- npm ≥ 9

### Installazione

```bash
git clone https://github.com/TUO_USERNAME/emporio-46.git
cd emporio-46
npm install
npm run dev
```

Il sito è disponibile su `http://localhost:5173`.

### Script disponibili

| Comando | Descrizione |
|---|---|
| `npm run dev` | Avvia il dev server con HMR |
| `npm run build` | Crea la build di produzione in `dist/` |
| `npm run preview` | Serve la build di produzione in locale |

---

## Build e deploy

### Deploy su Cloudflare

Il progetto è un **Worker con Static Assets** (non Pages): `wrangler.jsonc` dichiara il Worker (`worker/index.mjs`), la cartella `dist/` e i binding **D1** (`DB`) e **R2** (`FILES`).

**Passo 1 — Collega il repository (Workers Builds)**
Cloudflare → *Workers & Pages* → *Create* → *Import a repository* e imposta:

| Campo | Valore |
|---|---|
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/` |
| Variabile di build `NODE_VERSION` | `22` *(opzionale, se serve)* |

Al primo deploy Wrangler crea da solo il database D1 `emporio46-db` e il bucket R2 `emporio46-files` (provisioning automatico). Lo schema D1 viene creato dal Worker alla prima richiesta.
Se preferisci crearli a mano: `npx wrangler d1 create emporio46-db` (incolla il `database_id` in `wrangler.jsonc`) e `npx wrangler r2 bucket create emporio46-files`.

**Passo 2 — Variabili e secret** (vedi la sezione successiva), poi rifai il deploy.

**Passo 3 — Dominio personalizzato**
*Workers & Pages → emporio46 → Settings → Domains & Routes → Add → Custom domain* → `il-tuo-dominio.it`. Se il dominio è su Cloudflare (nameserver Cloudflare) DNS e certificato HTTPS sono automatici. Se è registrato altrove (es. Namecheap), imposta nei loro pannelli i nameserver Cloudflare indicati dalla procedura *Add a site*.

**Passo 4 — SEO**
- `https://tuo-dominio/sitemap.xml` e `https://tuo-dominio/robots.txt` sono generati dal Worker con il dominio con cui vengono richiesti (nessuna configurazione); la sitemap include la home, la data dell'ultimo salvataggio e le foto degli oggetti visibili nel catalogo.
- Invia la sitemap a **Google Search Console** (e Bing Webmaster Tools).
- In **Admin → SEO** imposta *canonical* e immagine di anteprima sul dominio definitivo.

**Prova in locale con il Worker vero** (login admin, salvataggio, upload, AI):
```bash
cp .env.example .dev.vars   # lascia solo le righe segrete: ADMIN_PASSWORD=…, GROQ_API_KEY=…
npm run preview:cf          # build + wrangler dev (D1 e R2 simulati in locale)
```
`npm run dev` (solo Vite) non esegue il Worker: l'admin lavora in locale con password `dev`.

> Il fallback SPA è gestito da `"not_found_handling": "single-page-application"` in `wrangler.jsonc`: non serve nessun file `_redirects`.

---

## Configurazione EmailJS

EmailJS si configura dall'admin panel (**funziona per i visitatori solo se la sincronizzazione Gist è attiva** (`VITE_GIST_ID` + login admin sul server), perché le impostazioni dell'admin altrimenti restano nel suo browser) **oppure** con le variabili di build `VITE_EMAILJS_*` su Cloudflare (Settings → Build → Variables and secrets, poi nuovo deploy), che funzionano sempre. Nel pannello (Impostazioni → EmailJS) trovi lo stato della sincronizzazione e il pulsante **Invia email di prova**.

1. Crea un account su [emailjs.com](https://www.emailjs.com)
2. Crea un **Email Service** (Gmail, SMTP, ecc.) → annota il **Service ID**
3. Crea **al massimo due template** (compatibile col piano gratuito):
   - **Notifica al negozio** (uno solo, per tutte e 3 le schede): To Email = email del negozio, Reply To = `{{reply_to}}`, oggetto `{{tipo}} — {{from_name}}`, corpo `{{riepilogo}}`
   - *(opzionale)* **Conferma al cliente**: To Email = `{{email}}`
4. Copia la **Public Key** da EmailJS → Account → API Keys
5. Aggiungi il dominio del sito in **EmailJS → Account → Allowed Origins**

Poi, nel pannello admin del sito:
- Tab **Impostazioni → EmailJS**
- Inserisci Service ID, Public Key e i Template ID (negozio ed eventuale conferma cliente)
- Template pronte (admin + cliente, nei colori del sito) in `emailjs-templates/` con istruzioni in `LEGGIMI.md`
- Variabili disponibili: `tipo, nome, cognome, email, telefono, giorno, orario, note, categoria, descrizione, from_name, reply_to, message, riepilogo, lingua, is_it, is_en, data_invio, shop_name, shop_phone, shop_address, shop_maps, shop_whatsapp, shop_instagram, shop_site, shop_logo`

---

## Variabili d'ambiente

**Pubbliche** (`VITE_*`: finiscono nel sito, solo valori non segreti) → *Workers & Pages → emporio46 → Settings → **Build** → Variables and secrets*. Valgono dal build successivo.

| Variabile | A cosa serve |
|---|---|
| `VITE_EMAILJS_SERVICE`, `VITE_EMAILJS_PUBLIC_KEY`, `VITE_EMAILJS_TEMPLATE`, `VITE_EMAILJS_TEMPLATE_CLIENT` | EmailJS (opzionali: in alternativa si impostano dal pannello) |
| `VITE_GIST_ID` | *(opzionale)* ID del Gist letto come fallback |

**Segrete, solo lato server** (nessun prefisso `VITE_`: non entrano mai nel sito) → *Settings → **Variables and secrets** (del Worker), tipo **Secret***, oppure `npx wrangler secret put NOME`.

| Secret | A cosa serve |
|---|---|
| `ADMIN_PASSWORD` | Password iniziale del pannello admin. Scegline una lunga (16+ caratteri). Dal pannello (**Password**) si può cambiare: la nuova viene salvata cifrata (PBKDF2) in D1 e sostituisce questa |
| `GROQ_API_KEY` | Chiave Groq (`gsk_…`) per le funzioni AI. Usata solo da `/api/groq-proxy`, che risponde solo a chi ha fatto login admin |
| `SESSION_SECRET` | *(consigliato)* stringa casuale lunga che firma le sessioni admin (12 ore) |
| `ADMIN_PASSWORD_FORCE_ENV` | *(opzionale)* `1` = ignora la password cambiata dal pannello e riusa `ADMIN_PASSWORD` (recupero se la dimentichi) |
| `GIST_ID`, `GIST_TOKEN` | *(opzionali)* copia di sicurezza su GitHub Gist (token *classic* con **solo** lo scope `gist`) |

> Usa il tipo **Secret** e non "Text": `wrangler.jsonc` ha `keep_vars: true`, quindi i deploy non cancellano ciò che imposti dalla dashboard.

### Checklist Cloudflare (riepilogo)

| Voce | Obbligatoria | Dove |
|---|---|---|
| `ADMIN_PASSWORD` | sì | secret del Worker |
| `SESSION_SECRET` | consigliata | secret del Worker |
| `GROQ_API_KEY` | per l'AI | secret del Worker |
| `VITE_EMAILJS_SERVICE`, `VITE_EMAILJS_PUBLIC_KEY`, `VITE_EMAILJS_TEMPLATE` | per il form contatti | variabili di build |
| D1 `DB` e R2 `FILES` | sì | creati al deploy da `wrangler.jsonc` |
| `VITE_EMAILJS_TEMPLATE_CLIENT`, `VITE_GIST_ID`, `GIST_ID`, `GIST_TOKEN` | no | — |

Dopo aver inserito variabili o secret fai un nuovo deploy. Su EmailJS aggiungi il dominio del sito in *Allowed Origins*.

> **Piano Cloudflare:** il piano Workers gratuito limita il tempo di CPU a ~10 ms per richiesta; login, cambio password e upload di file grandi possono superarlo. Per un uso stabile dell'admin è consigliato il piano **Workers Paid** (5 $/mese).

### Sfondi: immagini e video (Admin → Sfondi & Mappa)
Ogni zona (barra, **menu mobile**, copertina, sezioni, footer) ha immagine **e** video di sfondo, con gli stessi controlli: opacità, luminosità, sfocatura, seppia, posizione, velo, sfumatura dei bordi. Il video (MP4 H.264 o WebM, max 36 MB, meglio < 6 MB) si carica dall'admin o si incolla come URL; il fotogramma iniziale (poster) viene creato in automatico. Rimuovendo il video resta l'immagine. I tre video predefiniti sono in `public/bg/` (copertina, menu, footer). Se in passato avevi già modificato gli sfondi di copertina o footer, premi **↺ Default** su quella card per ripartire dai nuovi valori.

I video caricati vanno su Cloudflare R2 e sono serviti da `/media/<id>` con supporto Range (necessario a Safari/iOS).

### Trasparenza del footer
Nella card **Footer** di *Sfondi & Mappa*: opacità, sfocatura e bordo dei riquadri di testo (0 = completamente trasparenti).

### Accreditamenti nel footer
Si gestiscono da **Admin → Accreditamenti** (4 slot: nome, logo, link). Per mostrare i loghi a tutti i visitatori usa un URL o un file in `public/accrediti/` (es. `/accrediti/ente.png`). Inserisci solo enti di cui il negozio è davvero iscritto/accreditato.

Di default sono precompilati Camera di Commercio di Firenze, Associazione Antiquari d'Italia (link: https://www.antiquariditalia.it/it), FIMA e Confcommercio, con badge tipografici in `public/accrediti/*.svg` (non sono i loghi ufficiali): per usare i loghi ufficiali sovrascrivi i file con lo stesso nome (o carica i loghi dall'admin) e verifica i link.

### Salvataggio sul Gist e notifiche
Ogni modifica dall'admin (impostazioni, catalogo, recensioni, SEO, traduzioni EN, accreditamenti) viene salvata sul Gist dopo 1,5 s di quiete, **sempre con i dati più recenti**. In basso compare una notifica:

| Notifica | Significato |
|---|---|
| Modifiche in attesa / Salvataggio in corso | in attesa o in invio (pulsante **Salva ora**) |
| ✓ Salvato | la Function ha scritto e **GitHub ha confermato** la nuova versione del Gist |
| ⚠ Salvato con un avviso | salvato, ma alcune immagini caricate dal dispositivo (base64) non entrano nel Gist: usa un URL o un file in `public/` |
| ✕ Salvataggio non riuscito | token/Gist errati, GitHub non raggiungibile, sessione scaduta o conflitto: le modifiche restano da salvare e c'è il pulsante **Riprova** |
| ℹ Salvato solo in locale | manca `VITE_GIST_ID` oppure sei in `npm run dev` |

Se chiudi la pagina con modifiche non ancora sul Gist il browser chiede conferma. La libreria Media dell'admin resta solo nel browser (non va nel Gist).

### Come funziona la sicurezza del Gist

- Il Gist è **pubblico in lettura** (i visitatori lo leggono dal browser) ma **si scrive solo tramite `worker/index.mjs` (`/api/admin-api`)**, che richiede una sessione firmata ottenuta con `ADMIN_PASSWORD` (scade dopo 12 ore).
- Il token GitHub non è mai nel codice del sito. Il browser non lo vede.
- Ogni salvataggio controlla la revisione del Gist: se un altro dispositivo ha salvato nel frattempo, il salvataggio viene rifiutato (conflitto) invece di sovrascrivere.
- La password admin non viene mai scritta nel Gist. Il Gist non deve contenere dati riservati: è leggibile da chiunque.
- Se il Gist è stato in passato sincronizzato con la vecchia versione, la cronologia del Gist conserva la vecchia password: crea un **nuovo Gist** (file `mnt_data.json`) e aggiorna `VITE_GIST_ID`.

### Chiave Groq (AI)

In produzione la chiave è il secret `GROQ_API_KEY` su Cloudflare (vedi tabella sopra): non finisce mai nel sito, nel Gist o nel codice. In alternativa si può inserire una chiave diretta nel pannello (Impostazioni → Chiave API Groq): resta solo nel browser dell'admin e su un nuovo dispositivo va reinserita. Il pulsante **Test** verifica sia il modello testo sia quello visione. I modelli sono nel file `src/utils/groq.ts` e si possono sovrascrivere dal pannello quando Groq ne dismette qualcuno.

### Sviluppo locale

```bash
cp .env.example .env.local
npm install && npm run dev
```

In locale la chiave Groq va in `.env.local` come `VITE_GROQ_DEV_KEY` (**solo sviluppo**, mai in produzione).

Con `npm run dev` il Worker non esiste: l'accesso admin usa la password `dev` e i salvataggi restano in locale. Per provare il login reale e la sincronizzazione usa `npm run preview:cf` (build + `wrangler dev`, con D1 e R2 simulati in locale).

---

## Aspetto e tema

Il sito usa un'unica palette governata da variabili CSS (`--color-primary`, `--color-bg`, `--color-text`, …), impostate dal pannello admin (scheda *Stile*): cambiare un colore o un font dall'admin cambia tutto il sito, Hero compreso.

- **Tema predefinito:** *Emporio 46* — carta crema, arancio bruciato (`#c4561f`) e verde petrolio (`#2f6f73`). È disponibile anche la versione scura *Emporio 46 · Notte*.
- **Font:** Fraunces (titoli), Jost (testi ed etichette). Si cambiano dall'admin; tutti i font selezionabili sono già caricati in `src/index.css`.
- **Stile grafico:** forme morbide, bordi netti con ombra piena, etichette a bollino, medaglione rotante nell'Hero, nastro scorrevole inclinato. Le regole sono raccolte in fondo a `src/index.css` (sezione "skin retrò pop").
- **Immagini:** hero, "Il negozio", footer e sfondo recensioni sono opzionali; senza immagine si vede un'alternativa tipografica.
- **Dati dell'admin:** salvati nel browser (`localStorage`) e, se configurato, sincronizzati con un GitHub Gist tramite il Worker Cloudflare (D1, con copia Gist opzionale). I visitatori vedono i dati del server o quelli predefiniti in `AppContext.tsx`.

---

## Pagina offline

Se l'utente apre il sito senza connessione, invece della pagina d'errore del browser vede `public/offline.html`, in stile con il resto del sito (cornice, particelle dorate, ornamenti, font e colori del tema).

- **Come funziona:** `src/main.tsx` registra `public/sw.js` (solo in produzione). Il service worker salva `offline.html` all'installazione e lo serve quando una navigazione fallisce per mancanza di rete. Non mette in cache nient'altro del sito, quindi non può mostrare contenuti vecchi.
- **Tema:** la pagina legge da `localStorage` (`mnt_settings`) colori, font, nome sito, telefono e logo impostati dall'admin. Se non ci sono, usa i valori predefiniti.
- **Lingua:** italiano o inglese in base alla lingua del dispositivo.
- **Ricarica automatica:** pulsante *Riprova*, evento `online` e controllo ogni 10 s; la pagina si ricarica solo quando il sito è davvero raggiungibile.
- **Limite:** il service worker si installa alla prima visita online. Chi non ha mai aperto il sito vedrà l'errore standard del browser.
- **Modifiche:** dopo aver cambiato `offline.html`, incrementa `VERSION` in `public/sw.js`. Per provarla in locale: `npm run build && npm run preview`, poi DevTools → Application → Service Workers → *Offline*.

---

## Internazionalizzazione

Il sito supporta italiano (default) e inglese, selezionabile dall'utente via toggle in navbar.

La lingua è gestita in `AppContext` e il file `src/i18n/translations.ts` contiene tutti i testi statici dell'interfaccia per entrambe le lingue.

I contenuti dinamici (articoli catalogo, recensioni, impostazioni) supportano campi `*En` opzionali:

```typescript
// Esempio CatalogItem
nome: 'Orologio da tavolo Liberty'
nomeEn: 'Liberty Table Clock'         // opzionale
descrizione: 'Ottone dorato...'
descrizioneEn: 'Gilded brass...'      // opzionale
```

Se il campo inglese è assente, viene mostrato il testo italiano come fallback.

---

## Personalizzazione tema

Il tema è interamente controllato da CSS custom properties applicate dinamicamente da `App.tsx`:

| Variabile CSS | Default | Descrizione |
|---|---|---|
| `--color-primary` | `#e29a3d` | Ambra — accenti, bottoni, bordi |
| `--color-bg` | `#0d0a08` | Sfondo principale |
| `--color-bg-alt` | `#17110d` | Sfondo sezioni alternate |
| `--color-bg-card` | `#211812` | Sfondo card, pannelli, input |
| `--color-text` | `#f5ede0` | Testo principale |
| `--color-text-muted` | `#9a8a78` | Testo secondario |
| `--color-accent` | `#9a8a78` | Accento secondario |
| `--color-overlay` | `rgba(10,8,5,0.72)` | Overlay su immagini |
| `--font-display` | `'Playfair Display', serif` | Font titoli |
| `--font-body` | `'Cormorant Garamond', serif` | Font corpo |

Font aggiuntivi usati in componenti statici: **Cinzel** (navbar, label uppercase).

---

## Note tecniche

### Routing SPA
Il routing è gestito lato client senza React Router. Le "pagine" (LegalPage, MaintenancePage) sono overlay/modal renderizzati condizionalmente. Il file `public/_redirects` garantisce che tutti i path servano `index.html`.

### GSAP + Lenis
Lenis è agganciato al ticker di GSAP (`gsap.ticker.add`) per un unico RAF loop. `ScrollTrigger.refresh()` viene chiamato 2.6 secondi dopo il mount (dopo il loader) e al font load di Google Fonts per evitare posizionamenti errati degli scroll trigger.

### Chunking Vite
Il bundle è suddiviso in chunk manuale per ottimizzare il caricamento:
```
three.js   → chunk separato
gsap       → chunk separato
framer     → chunk separato
lenis      → chunk separato
```

### TypeScript
Il progetto usa `@ts-nocheck` su file con pattern di alto dinamismo (`App.tsx`, `AdminPanel.tsx`, `AppContext.tsx`) per evitare falsi positivi sui tipi durante le iterazioni rapide. Il build Vite procede senza `tsc` separato.

### Dati di default
Catalogo (9 oggetti) e recensioni (9 voci) di esempio sono hardcodati in `AppContext.tsx` come fallback. Vengono caricati solo se il localStorage è vuoto.

---

## Licenza

Sviluppato per Emporio 46 Firenze.  
Design: Err0r_HB.  
Tutti i diritti riservati.

---

## Preloader, sfondi e mappa (aggiornamento)

**Preloader reale** (`src/utils/preload.ts` + `Loader.tsx`): la barra mostra il progresso effettivo di download e decodifica di immagini (hero, about, sfondi di sezione, footer, logo, prime foto del catalogo), font (regular/italic/600), evento `load` e mappa Google (iframe nascosto per scaldare la cache). Lo scroll resta bloccato finché non è tutto pronto; poi parte l'animazione d'ingresso dell'hero e `ScrollTrigger` viene ricalcolato. Timeout massimo 14 s: il sito non resta mai bloccato. Il resto delle foto del catalogo si scarica in background a loader chiuso.

**Sfondi del sito** (`SectionBackdrop.tsx`, v50): un unico sistema per tutte le zone, in ordine di pagina — *titolo* (barra di navigazione, copertina), *corpo* (striscia categorie, Chi siamo, Catalogo, Perché, Recensioni, Contatti, Dove siamo) e *footer*. Admin → *Sfondi & Mappa*: per ogni zona immagine, opacità, luminosità, sfocatura, seppia, posizione X/Y, adattamento (riempi / ripeti come texture) e bordi sfumati (quali e quanto), velo di leggibilità e alone dei testi (i testi sopra le foto restano leggibili anche con l'immagine ben visibile), con anteprima fedele (stesso codice `bgLayerStyle` del sito). I valori stanno in `settings.sectionBgs[slot]`; i vecchi campi `heroImage*`, `footerImage*`, `reviewsBg*` (≤v49) restano solo come ripiego. Le immagini di default sono in `public/bg/` (copertina, Chi siamo, Catalogo, Perché e Recensioni usano foto reali del negozio; le altre zone texture generate). Per mostrare un'immagine a tutti i visitatori usa un URL o un file in `public/bg/`: le immagini caricate dall'admin restano nel browser dell'admin.

**Mappa satellitare**: l'embed viene costruito da indirizzo + città con `t=k` (satellite). Admin → *Sfondi & Mappa* permette anche satellite con etichette o stradale. Nessuna API key richiesta.

**Chiave Groq**: non va nel codice (finirebbe nel bundle pubblico). Si inserisce da Admin → Perizia AI e resta solo nel browser dell'admin.

**Poltrona 3D** (`ArmchairShowcase.tsx`, `utils/armchair.ts`, `public/models/armchair.glb`): sezione pinnata dopo la marquee. Lo scroll guida rotazione e zoom su 4 capitoli (insieme, intagli, tappezzeria, ottone); si può anche trascinare per ruotare. Il modello (convertito dall'FBX originale in GLB, 4 materiali = 4 draw call) viene scaricato e parsato dal preloader; shader e texture sono compilati prima della chiusura del loader. Il rendering si ferma quando la sezione non è visibile. Se WebGL non è disponibile la sezione si nasconde.



---

## v57 — correzioni e ampliamento AI (Groq)

**Bug risolti**
- **Foto del catalogo non analizzabili**: gli articoli esistenti hanno foto come percorsi del sito (`/catalog/…jpg`), che Groq non può scaricare. Ora `prepareImage` (`src/utils/groq.ts`) scarica sempre l'immagine nel browser, la riduce (max 1024 px) e la invia come JPEG: funziona con percorsi relativi, URL, `blob:` e foto caricate.
- **Risposte JSON fragili**: se il modello aggiungeva testo, ```json o un blocco `<think>` non chiuso, il parsing falliva con errori criptici. Ora `extractJson` estrae e ripara il JSON; `groqJson` / `groqVisionJson` usano anche la JSON mode di Groq (con ripiego automatico se il modello la rifiuta).
- **Qwen 3.8 "pensava" a vuoto**: ora usa `reasoning_effort: none` (risposta diretta, più veloce, nessun token sprecato); gpt-oss usa `low`.
- **Limiti e guasti temporanei** (429, 5xx, timeout) passano al modello successivo invece di fermarsi.
- **Errori invisibili**: i messaggi di errore AI restavano 2,5 s e potevano uscire dallo schermo su telefono; ora durano 7 s e vanno a capo.
- La categoria proposta dall'AI ("lampada") viene riportata a una voce valida del menu ("lampade"); l'AI non sovrascrive più un prezzo già inserito a mano.

**Nuovi aiuti AI**
- Catalogo → **✦ Arricchisci descrizioni**: riscrive dalle foto le descrizioni brevi (poi "Traduci tutto in EN").
- Sconti → descrizione promozione · Impostazioni → messaggio di manutenzione e tagline del footer · Arte 3D → riscrittura dei 4 capitoli (IT) e traduzione (EN).

**Test**: `npm run test:groq` (Node ≥ 22) prova client Groq, fallback dei modelli e parsing con un Groq simulato.

### Chiave Groq in produzione (aggiornamento v57.1)
La chiave **non deve mai avere il prefisso `VITE_`** (finirebbe nel bundle pubblico). Su Cloudflare imposta il secret `GROQ_API_KEY`: il Worker (`/api/groq-proxy`, in `worker/index.mjs`) la usa lato server e risponde solo a chi ha fatto login admin. In locale (`npm run dev`) la chiave sta in `.env.local` come `VITE_GROQ_DEV_KEY` (solo dev, eliminata dalla build: controlla con `grep -r gsk_ dist`). Nota: se un'analisi foto molto lunga va in timeout, riprova o inserisci una chiave diretta nel pannello.
