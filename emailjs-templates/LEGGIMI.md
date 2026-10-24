# Template EmailJS — Emporio 46

Due template HTML nei colori del sito (crema, terracotta, verde petrolio). Si incollano nell'editor di EmailJS.

## Come si inseriscono
EmailJS → **Email Templates** → **Create New Template** → **Design Editor → Code Editor** (HTML) → incolla tutto il file → **Save**.

## 1) `1-notifica-negozio-admin.html` — avviso al negozio
- **Subject:** `Nuova richiesta: {{tipo}} — {{from_name}}`
- **To Email:** l'email del negozio (quella dove vuoi ricevere le richieste)
- **From Name:** `{{shop_name}}`
- **Reply To:** `{{reply_to}}` (così premendo "Rispondi" scrivi direttamente al cliente)
- ID del template → `VITE_EMAILJS_TEMPLATE`

## 2) `2-conferma-cliente.html` — conferma automatica al cliente (IT/EN in automatico)
- **Subject:** `Emporio 46 — abbiamo ricevuto la tua richiesta / We received your request`
- **To Email:** `{{email}}`  ← importante: è l'email scritta dal cliente
- **From Name:** `Emporio 46`
- **Reply To:** l'email del negozio
- ID del template → `VITE_EMAILJS_TEMPLATE_CLIENT`

Il piano gratuito di EmailJS permette 2 template: sono esattamente questi due.

## Cose da sapere
- Le righe vuote (telefono, giorno, orario, note…) spariscono da sole grazie alle sezioni `{{#variabile}}…{{/variabile}}`. Se nell'anteprima di EmailJS compaiono le parentesi graffe, la tua versione dell'editor non le supporta: scrivimelo e preparo una versione senza.
- Il logo si vede solo se il sito è online (usa l'indirizzo del sito); alcuni programmi di posta chiedono "Mostra immagini".
- Nome, telefono, indirizzo, Maps, WhatsApp e Instagram nella mail del cliente arrivano dalle **Impostazioni** del pannello admin: se li cambi lì, cambiano anche nelle email, senza toccare il template.
- Il pulsante **Invia email di prova** (Admin → Impostazioni → EmailJS) usa i dati di esempio; per vedere il risultato vero fai un invio dal modulo del sito.
