// @ts-nocheck
import { useRef, useState, useEffect } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useApp } from '../../context/AppContext'
import SectionBackdrop from '../ui/SectionBackdrop'
import { emailJsConfig } from '../../utils/emailjsConfig'
import { waBookLink, waSearchLink, waEstimateLink } from '../../utils/whatsapp'
import { REVEAL_VP } from '../../utils/reveal'

const DAYS_IT = ['Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
const DAYS_EN = ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const TIMES = ['10:00–11:00', '11:00–12:00', '12:00–13:00', '16:00–17:00', '17:00–18:00', '18:00–19:00']
const CATS_IT = ['Mobili', 'Lampade', 'Bijoux', 'Specchi', 'Cornici', 'Complementi', 'Ceramiche', 'Modernariato', 'Altro']
const CATS_EN = ['Furniture', 'Lamps', 'Jewellery', 'Mirrors', 'Frames', 'Decor', 'Ceramics', 'Mid-century', 'Other']

type Tab = 'book' | 'request' | 'estimate'

function InputField({
  label, value, onChange, type = 'text', required = false, placeholder = '',
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--color-text-muted, #9a8a78)' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        style={{
          background: 'var(--color-bg, #0a0805)',
          border: '2px solid color-mix(in srgb, var(--color-text) 70%, transparent)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.75rem 1rem',
          color: 'var(--color-text, #f5ede0)',
          fontFamily: 'var(--font-body)',
          fontSize: '1rem',
          outline: 'none',
          transition: 'border-color 0.3s',
        }}
        onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
        onBlur={(e) => e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--color-text) 70%, transparent)'}
      />
    </div>
  )
}

function SelectField({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void; options: string[]
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--color-text-muted, #9a8a78)' }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: 'var(--color-bg-card, #1c1510)',
          border: '2px solid var(--color-text)', borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1rem',
          color: value ? 'var(--color-text, #f5ede0)' : 'var(--color-text-muted, #9a8a78)',
          fontFamily: 'var(--font-body)',
          fontSize: '1rem',
          outline: 'none',
          cursor: 'pointer',
          transition: 'border-color 0.3s',
        }}
        onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
        onBlur={(e) => e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--color-text) 70%, transparent)'}
      >
        <option value="" disabled style={{ color: 'var(--color-text-muted, #9a8a78)' }}>—</option>
        {options.map((opt) => (
          <option key={opt} value={opt} style={{ color: 'var(--color-text, #f5ede0)', background: 'var(--color-bg-card, #1c1510)' }}>{opt}</option>
        ))}
      </select>
    </div>
  )
}

function TextareaField({
  label, value, onChange, rows = 4, required = false, placeholder = '',
}: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; required?: boolean; placeholder?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--color-text-muted, #9a8a78)' }}>
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        rows={rows}
        placeholder={placeholder}
        style={{
          background: 'var(--color-bg, #0a0805)',
          border: '2px solid color-mix(in srgb, var(--color-text) 70%, transparent)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.75rem 1rem',
          color: 'var(--color-text, #f5ede0)',
          fontFamily: 'var(--font-body)',
          fontSize: '1rem',
          outline: 'none',
          resize: 'vertical',
          transition: 'border-color 0.3s',
        }}
        onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
        onBlur={(e) => e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--color-text) 70%, transparent)'}
      />
    </div>
  )
}

export default function ContactSection() {
  const { t, lang, contactTab, contactPrefill, settings } = useApp()
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.25 })

  const [tab, setTab] = useState<Tab>('book')
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')

  // Mapping categoria IT→EN e viceversa per prefill cross-lingua
  const CAT_MAP_IT_TO_EN: Record<string, string> = {
    mobili: 'Furniture', lampade: 'Lamps', bijoux: 'Jewellery',
    specchi: 'Mirrors', cornici: 'Frames', complementi: 'Decor',
    ceramiche: 'Ceramics', modernariato: 'Mid-century', altro: 'Other',
  }

  // Flash animation state for auto-filled fields
  const [prefillFlash, setPrefillFlash] = useState(false)

  // Sync tab + apply prefill when navigated from external CTAs
  useEffect(() => {
    const hasAnyPrefill = contactPrefill.categoria || contactPrefill.descrizione || contactPrefill.note
    if (contactTab === tab && !hasAnyPrefill) return
    setTab(contactTab)
    setStatus('idle')

    if (contactTab === 'request') {
      if (contactPrefill.categoria) {
        const catLower = contactPrefill.categoria.toLowerCase()
        const cats = lang === 'it' ? CATS_IT : CATS_EN
        const mapped = lang === 'it'
          ? CATS_IT.find(c => c.toLowerCase() === catLower || c.toLowerCase() === catLower.replace('i', ''))
          : CATS_EN.find(c => c.toLowerCase() === (CAT_MAP_IT_TO_EN[catLower] || contactPrefill.categoria || '').toLowerCase())
        setRCat(mapped || cats[0] || '')
      }
      if (contactPrefill.descrizione) setRDesc(contactPrefill.descrizione)
    }
    if (contactTab === 'estimate' && contactPrefill.descrizione) {
      setEDesc(contactPrefill.descrizione)
    }
    if (contactTab === 'book' && contactPrefill.note) {
      setNote(contactPrefill.note)
    }

    if (hasAnyPrefill) {
      setPrefillFlash(true)
      setTimeout(() => setPrefillFlash(false), 1800)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactTab, contactPrefill])

  // Book form
  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [giorno, setGiorno] = useState(() => {
    // Auto-suggest next available weekday (Mon-Sat)
    const days = lang === 'it' ? DAYS_IT : DAYS_EN
    const today = new Date()
    const dow = today.getDay() // 0=Sun
    // Find next Mon-Sat
    const offset = dow === 6 ? 2 : dow === 0 ? 1 : 0
    const next = new Date(today)
    next.setDate(today.getDate() + offset)
    const dayIndex = Math.min(next.getDay() - 1, 5) // Mon=0..Sat=5
    return days[dayIndex >= 0 ? dayIndex : 0] || days[0]
  })
  const [orario, setOrario] = useState(TIMES[0])
  const [note, setNote] = useState('')

  // Request form
  const [rNome, setRNome] = useState('')
  const [rEmail, setREmail] = useState('')
  const [rCat, setRCat] = useState('')
  const [rDesc, setRDesc] = useState('')

  // Estimate form
  const [eNome, setENome] = useState('')
  const [eEmail, setEEmail] = useState('')
  const [eDesc, setEDesc] = useState('')

  const days = lang === 'it' ? DAYS_IT : DAYS_EN
  const cats = lang === 'it' ? CATS_IT : CATS_EN

  const waLinks: Record<Tab, string> = {
    book: waBookLink(),
    request: waSearchLink(),
    estimate: waEstimateLink(),
  }

  const tabLabels: Record<Tab, string> = {
    book: t.contact.tabBook,
    request: t.contact.tabRequest,
    estimate: t.contact.tabEstimate,
  }
  const tabNotes: Record<Tab, string> = {
    book: t.contact.noteBook,
    request: t.contact.noteRequest,
    estimate: t.contact.noteEstimate,
  }

  const [errorMsg, setErrorMsg] = useState('')
  const [hp, setHp] = useState('') // honeypot anti-bot: gli utenti reali non lo vedono né lo compilano
  const sendingRef = useRef(false)

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

  const resetForms = () => {
    setNome(''); setCognome(''); setEmail(''); setTelefono(''); setNote('')
    setRNome(''); setREmail(''); setRCat(''); setRDesc('')
    setENome(''); setEEmail(''); setEDesc('')
  }

  const handleSubmit = async () => {
    if (sendingRef.current) return // evita doppi invii (doppio click)

    const cur = tab === 'book'
      ? { n: nome, e: email, ok: !!(nome.trim() && email.trim() && giorno) }
      : tab === 'request'
        ? { n: rNome, e: rEmail, ok: !!(rNome.trim() && rEmail.trim() && rDesc.trim()) }
        : { n: eNome, e: eEmail, ok: !!(eNome.trim() && eEmail.trim() && eDesc.trim()) }

    if (!cur.ok) { setErrorMsg(lang === 'it' ? '✗ Compila tutti i campi obbligatori.' : '✗ Please fill in all required fields.'); setStatus('error'); return }
    if (!EMAIL_RE.test(cur.e.trim())) { setErrorMsg(lang === 'it' ? '✗ Inserisci un indirizzo email valido.' : '✗ Please enter a valid email address.'); setStatus('error'); return }
    if (hp) { setStatus('success'); return } // bot: finge successo senza inviare

    sendingRef.current = true
    setErrorMsg('')
    setStatus('sending')

    // Configurazione EmailJS (variabili d'ambiente → pannello admin → valori predefiniti)
    const { serviceId, publicKey, tplShop, tplClient, ready: emailReady } = emailJsConfig(settings)

    // Solo se EmailJS manca del tutto si ripiega su WhatsApp, e lo si dice chiaramente (niente falso "inviato")
    if (!emailReady) {
      window.open(waLinks[tab], '_blank')
      sendingRef.current = false
      setErrorMsg(lang === 'it' ? '✗ Invio email non disponibile: ti abbiamo aperto WhatsApp per scriverci.' : '✗ Email sending is unavailable: we opened WhatsApp so you can write to us.')
      setStatus('error')
      return
    }

    try {
      // Params unificati: i campi non rilevanti restano vuoti.
      // Alias (from_name, reply_to, message) per compatibilità con i template EmailJS standard.
      const base = { lingua: lang, from_name: '', reply_to: '', message: '', riepilogo: '' }
      const params: Record<string, string> = tab === 'book'
        ? { ...base, tipo: t.catalog.emailBookType, nome: nome.trim(), cognome: cognome.trim(), email: email.trim(), telefono: telefono.trim(), giorno, orario, note: note.trim(), categoria: '', descrizione: '' }
        : tab === 'request'
          ? { ...base, tipo: t.catalog.emailRequestType, nome: rNome.trim(), cognome: '', email: rEmail.trim(), telefono: '', giorno: '', orario: '', note: '', categoria: rCat, descrizione: rDesc.trim() }
          : { ...base, tipo: t.catalog.emailEstimateType, nome: eNome.trim(), cognome: '', email: eEmail.trim(), telefono: '', giorno: '', orario: '', note: '', categoria: '', descrizione: eDesc.trim() }
      params.from_name = `${params.nome} ${params.cognome}`.trim()
      params.reply_to = params.email
      params.message = params.descrizione || params.note
      // Riepilogo già formattato (solo campi compilati): permette di usare UN solo template per tutte le schede
      const righe: [string, string][] = [
        ['Tipo richiesta', params.tipo], ['Nome', params.from_name], ['Email', params.email],
        ['Telefono', params.telefono], ['Giorno', params.giorno], ['Orario', params.orario],
        ['Categoria', params.categoria], ['Descrizione', params.descrizione], ['Note', params.note],
      ]
      params.riepilogo = righe.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n')

      // Dati per le template email (nome/contatti del negozio sempre aggiornati dal pannello + flag lingua)
      const origin = window.location.origin
      const abs = (u: string) => (u && u.startsWith('/') ? origin + u : u && /^https?:\/\//.test(u) ? u : '')
      params.is_it = lang === 'it' ? '1' : ''
      params.is_en = lang === 'en' ? '1' : ''
      params.data_invio = new Date().toLocaleString(lang === 'en' ? 'en-GB' : 'it-IT', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/Rome' })
      params.shop_name = settings.siteName || 'Emporio 46'
      params.shop_email = (settings.email || '').trim()
      params.to_email = params.shop_email   // usabile nel template negozio come To Email = {{to_email}}
      params.shop_phone = settings.telefono || ''
      params.shop_address = [settings.indirizzo, settings.citta].filter(Boolean).join(', ')
      params.shop_maps = settings.mapsLink || ''
      params.shop_whatsapp = settings.whatsapp ? `https://wa.me/${settings.whatsapp}` : ''
      params.shop_instagram = settings.instagram || ''
      params.shop_site = origin
      params.shop_logo = abs(settings.logoUrl || '')

      const { default: emailjs } = await import('@emailjs/browser')
      const withTimeout = <T,>(p: Promise<T>) =>
        Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 15000))])

      // 1) Notifica al negozio — se fallisce è un vero errore
      await withTimeout(emailjs.send(serviceId, tplShop, params, publicKey))

      // 2) Conferma automatica al cliente (opzionale) — un suo fallimento NON deve annullare l'invio
      if (tplClient) {
        // EmailJS accetta ~1 richiesta al secondo: si attende prima della seconda e si ritenta una volta
        const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
        await sleep(1300)
        for (let tentativo = 0; tentativo < 2; tentativo++) {
          try { await withTimeout(emailjs.send(serviceId, tplClient, params, publicKey)); break }
          catch (e) {
            const x = e as { status?: number; text?: string }
            console.warn(`[EmailJS] conferma cliente non inviata (tentativo ${tentativo + 1}):`, x?.status, x?.text || e)
            if (tentativo === 0) await sleep(2000)
          }
        }
      }

      resetForms()
      setStatus('success')
    } catch (e) {
      console.error('[EmailJS] invio fallito:', e)
      const x = e as { status?: number; message?: string }
      setErrorMsg(x?.message === 'timeout' ? (lang === 'it' ? '✗ Nessuna risposta dal servizio email. Riprova tra poco o scrivici su WhatsApp.' : '✗ The email service did not respond. Try again shortly or message us on WhatsApp.') : '')
      setStatus('error')
    } finally {
      sendingRef.current = false
    }
  }

  return (
    <section
      id="contatti"
      ref={ref}
      style={{
        background: 'transparent',
        padding: '10rem clamp(1.5rem,7vw,8rem)',
        position: 'relative',
        overflow: 'hidden',
        isolation: 'isolate',
      }}
    >
      <SectionBackdrop slot="contact" />
      {/* Decorative background pattern */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.015, pointerEvents: 'none', background: 'repeating-linear-gradient(45deg, var(--color-primary) 0, var(--color-primary) 1px, transparent 0, transparent 50%)' , backgroundSize: '20px 20px' }} />

      <div style={{ maxWidth: 1000, margin: '0 auto', position: 'relative' }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '3rem',
          background: 'var(--color-bg-card, #1c1510)',
          border: '2px solid var(--color-text)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '6px 6px 0 var(--color-text)',
          padding: 'clamp(2rem,5vw,3.5rem) clamp(1.5rem,5vw,3rem)',
        }}>
          <motion.p
            className="section-label"
            style={{ marginBottom: '1.2rem' }}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }} viewport={REVEAL_VP}
            transition={{ duration: 1.12 }}
          >
            {t.contact.label}
          </motion.p>
          <div className="gold-rule" style={{ margin: '0 auto 1.5rem' }} />
          <motion.h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem,4.5vw,3.5rem)',
              fontWeight: 400,
              color: 'var(--color-text, #f5ede0)',
              lineHeight: 1.1,
              marginBottom: '1rem',
            }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }} viewport={REVEAL_VP}
            transition={{ duration: 1.12, delay: 0.1 }}
          >
            {t.contact.title}
          </motion.h2>
          <motion.p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(1rem,1.8vw,1.15rem)',
              color: 'var(--color-text-muted, #9a8a78)',
              maxWidth: 480,
              margin: '0 auto 0',
              lineHeight: 1.75,
            }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }} viewport={REVEAL_VP}
            transition={{ duration: 1.12, delay: 0.2 }}
          >
            {t.contact.lead}
          </motion.p>
        </div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }} viewport={REVEAL_VP}
          transition={{ duration: 1.12, delay: 0.3 }}
          style={{
            background: 'var(--color-bg-card, #1c1510)',
            border: '2px solid var(--color-text)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '6px 6px 0 var(--color-text)',
            overflow: 'hidden',
            marginBottom: '2rem',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              borderBottom: '1px solid rgba(var(--color-primary-rgb), 0.15)',
              marginBottom: '2rem',
            }}
          >
            {(['book', 'request', 'estimate'] as Tab[]).map((key) => (
              <button
                key={key}
                onClick={() => { setTab(key); setStatus('idle') }}
                style={{ borderRadius: 0,
                  padding: 'clamp(0.7rem,2vw,1rem) clamp(0.5rem,2vw,1.5rem)',
                  fontFamily: 'var(--font-label)',
                  fontSize: 'clamp(0.52rem, 1.8vw, 0.62rem)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: tab === key ? 'var(--color-primary, #c9a84c)' : 'var(--color-text-muted, #9a8a78)',
                  borderBottom: tab === key ? '2px solid var(--color-primary)' : '2px solid transparent',
                  marginBottom: -1,
                  transition: 'all 0.3s',
                  whiteSpace: 'normal',
                  textAlign: 'center',
                  width: '100%',
                  lineHeight: 1.3,
                }}
              >
                {tabLabels[key]}
              </button>
            ))}
          </div>

          {/* Form body */}
          <div
            style={{
              background: 'transparent',
              padding: '0 clamp(1.5rem,4vw,3rem) clamp(1.5rem,4vw,3rem)',
            }}
          >
            {/* Prefill context banner */}
            <AnimatePresence>
              {(contactPrefill.descrizione || contactPrefill.categoria || contactPrefill.note) && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: '1.5rem' }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.9rem',
                    padding: '0.9rem 1.2rem',
                    background: 'rgba(var(--color-primary-rgb), 0.06)',
                    borderLeft: '2px solid rgba(var(--color-primary-rgb), 0.5)',
                    overflow: 'hidden',
                  }}
                >
                  <span style={{ color: 'var(--color-primary-text, var(--color-primary))', fontSize: '1rem', flexShrink: 0, marginTop: 2 }}>✦</span>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.97rem', color: 'var(--color-text-soft, var(--color-text-muted))', lineHeight: 1.6 }}>
                    {t.catalog.prefillNote}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
              >
                {/* BOOK */}
                {tab === 'book' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1.5rem' }}>
                    <InputField label={t.contact.name} value={nome} onChange={setNome} required placeholder="es. Marco" />
                    <InputField label={t.contact.surname} value={cognome} onChange={setCognome} placeholder="es. Rossi" />
                    <InputField label={t.contact.email} value={email} onChange={setEmail} type="email" required placeholder="nome@email.com" />
                    <InputField label={t.contact.phone} value={telefono} onChange={setTelefono} placeholder="+39 320 000 0000" />
                    <SelectField label={t.contact.day} value={giorno} onChange={setGiorno} options={days} />
                    <SelectField label={t.contact.time} value={orario} onChange={setOrario} options={TIMES} />
                    <div style={{ gridColumn: '1 / -1', transition: 'all 0.6s', borderLeft: prefillFlash && note ? '2px solid rgba(var(--color-primary-rgb), 0.6)' : '2px solid transparent', paddingLeft: prefillFlash && note ? '0.8rem' : 0 }}>
                      <TextareaField label={t.contact.notes} value={note} onChange={setNote} rows={3} placeholder="Oggetti di particolare interesse, domande, accessibilità..." />
                    </div>
                  </div>
                )}

                {/* REQUEST */}
                {tab === 'request' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1.5rem' }}>
                    <InputField label={t.contact.name} value={rNome} onChange={setRNome} required placeholder="es. Marco Rossi" />
                    <InputField label={t.contact.email} value={rEmail} onChange={setREmail} type="email" required placeholder="nome@email.com" />
                    <div style={{ gridColumn: '1 / -1' }}>
                      <SelectField label={t.contact.category} value={rCat} onChange={setRCat} options={cats} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <TextareaField label={t.contact.description} value={rDesc} onChange={setRDesc} rows={4} required placeholder="Descrivi l'oggetto che cerchi: periodo storico, stile, materiale, dimensioni approssimative..." />
                    </div>
                  </div>
                )}

                {/* ESTIMATE */}
                {tab === 'estimate' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1.5rem' }}>
                    <InputField label={t.contact.name} value={eNome} onChange={setENome} required placeholder="es. Laura Bianchi" />
                    <InputField label={t.contact.email} value={eEmail} onChange={setEEmail} type="email" required placeholder="nome@email.com" />
                    <div style={{ gridColumn: '1 / -1' }}>
                      <TextareaField label={t.contact.description} value={eDesc} onChange={setEDesc} rows={4} required placeholder="Descrivi l'oggetto da stimare: tipo, materiale, epoca presunta, condizioni, provenienza (se nota)..." />
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Note */}
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.9rem',
              color: 'var(--color-text-muted, #9a8a78)',
              marginTop: '1.5rem',
              padding: '1rem',
              borderLeft: '2px solid rgba(var(--color-primary-rgb), 0.25)',
              background: 'rgba(var(--color-primary-rgb), 0.04)',
            }}>
              {tabNotes[tab]}
            </p>

            {/* Status messages */}
            <AnimatePresence>
              {status === 'success' && (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ color: 'var(--color-ok, #6fcf97)', fontFamily: 'var(--font-body)', fontSize: '1rem', marginTop: '1rem' }}
                >
                  {t.contact.success}
                </motion.p>
              )}
              {status === 'error' && (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ color: 'var(--color-sale, #eb5757)', fontFamily: 'var(--font-body)', fontSize: '1rem', marginTop: '1rem' }}
                >
                  {errorMsg || t.contact.error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Honeypot anti-spam (nascosto) */}
            <input
              type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
              value={hp} onChange={(e) => setHp(e.target.value)}
              style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
            />

            {/* Actions */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleSubmit}
                disabled={status === 'sending'}
                style={{ borderRadius: 999,
                  fontFamily: 'var(--font-label)',
                  fontSize: '0.63rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  padding: '0.9rem 2.5rem',
                  background: 'var(--color-primary)',
                  color: 'var(--color-bg, #0a0805)',
                  border: 'none',
                  cursor: status === 'sending' ? 'wait' : 'pointer',
                  opacity: status === 'sending' ? 0.7 : 1,
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => { if (status !== 'sending') e.currentTarget.style.background = 'var(--color-primary-light)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-primary)' }}
              >
                {status === 'sending' ? '...' : t.contact.send}
              </button>

              <a
                href={waLinks[tab]}
                target="_blank"
                rel="noopener noreferrer"
                style={{ borderRadius: 999,
                  fontFamily: 'var(--font-label)',
                  fontSize: '0.63rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  padding: '0.9rem 2.5rem',
                  background: '#25d366',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  textDecoration: 'none',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#1eb857'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#25d366'}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16 }}>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                {t.contact.whatsapp}
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
