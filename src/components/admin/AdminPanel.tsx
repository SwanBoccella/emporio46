// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from '../../context/AppContext'
import type { SiteSettings, SeoData } from '../../context/AppContext'
import { groqText, groqVision, groqVisionJson, extractJson, testGroq, groqDiagnose, getGroqKey, setGroqKey, isValidGroqKey, getModelOverride, setModelOverride, DEFAULT_TEXT_MODELS, DEFAULT_VISION_MODELS, type GroqTestResult } from '../../utils/groq'
import { adminLogin, clearAdminToken, getAdminToken, changeAdminPassword, adminUploadAsset } from '../../utils/adminApi'
import { footerGlassStyle, FOOTER_GLASS_DEFAULTS } from '../../utils/footerGlass'
import { THEME_PRESETS, SECTION_BG_LABELS, SECTION_BG_GROUPS, SECTION_BG_HAS_TEXT, SECTION_BG_DEFAULTS, getSectionBg, buildMapsEmbed, SYNC_STATUS } from '../../context/AppContext'
import { BgMedia, bgScrimStyle, bgScrimClass } from '../ui/SectionBackdrop'
import type { CatalogItem, Recensione } from '../../types'
import { DEFAULT_CHAPTERS, DEFAULT_LABEL, resolveChapters, saveLocalModel, clearLocalModel, validateGlb } from '../../utils/armchair'

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = ['mobili', 'lampade', 'bijoux', 'specchi', 'cornici', 'complementi', 'ceramiche', 'modernariato', 'altro']
// L'AI può rispondere "lampada", "Mobile"…: la riportiamo a una categoria valida del menu
const normCat = (v: unknown, fallback = 'altro') => {
  const t = String(v ?? '').toLowerCase().trim()
  if (CATEGORIES.includes(t)) return t
  return t.length >= 4 ? (CATEGORIES.find(c => t.startsWith(c.slice(0, -1))) || fallback) : fallback
}
const STATI: CatalogItem['stato'][] = ['disponibile', 'in_vetrina', 'trattativa', 'venduto']
const STATO_COLOR: Record<string, string> = {
  disponibile: '#6fcf97', in_vetrina: '#c9a84c', trattativa: '#f2994a', venduto: '#eb5757',
}

type AdminTab = 'dashboard' | 'catalog' | 'reviews' | 'settings' | 'seo' | 'media' | 'analytics' | 'orari' | 'aspetto' | 'sfondi' | 'sconti' | 'banner' | 'poltrona' | 'accrediti'

// ─── Shared Styles ────────────────────────────────────────────────────────────
const btnGold: React.CSSProperties = {
  fontFamily: 'Cinzel, serif', fontSize: '0.58rem', letterSpacing: '0.18em',
  textTransform: 'uppercase', padding: '0.65rem 1.4rem', background: '#c9a84c',
  color: '#0a0805', border: 'none', cursor: 'pointer', transition: 'opacity 0.2s',
}
const btnGhost: React.CSSProperties = {
  fontFamily: 'Cinzel, serif', fontSize: '0.55rem', letterSpacing: '0.15em',
  textTransform: 'uppercase', padding: '0.6rem 1.2rem', background: 'none',
  color: '#9a8a78', border: '1px solid rgba(201,168,76,0.2)', cursor: 'pointer',
  whiteSpace: 'nowrap', transition: 'all 0.2s',
}
const btnDanger: React.CSSProperties = { ...btnGhost, color: '#eb5757', borderColor: 'rgba(235,87,87,0.3)' }
const labelStyle: React.CSSProperties = {
  fontFamily: 'Cinzel, serif', fontSize: '0.5rem', letterSpacing: '0.2em',
  textTransform: 'uppercase', color: '#9a8a78', marginBottom: 4, display: 'block',
}
const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.15)',
  padding: '0.6rem 0.8rem', color: '#f5ede0', fontFamily: 'Cormorant Garamond, serif',
  fontSize: '0.95rem', outline: 'none', width: '100%', boxSizing: 'border-box',
}
const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(201,168,76,0.1)',
  padding: '1.4rem 1.6rem',
}
const sectionTitle: React.CSSProperties = {
  fontFamily: 'Playfair Display, serif', color: '#f5ede0',
  fontWeight: 400, fontSize: '1.3rem', marginBottom: '1.5rem',
}

// ─── Helper components ────────────────────────────────────────────────────────
function SettingsGrid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.2rem' }}>{children}</div>
}

function Field({ label, value, onChange, multiline = false, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean; type?: string
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {multiline
        ? <textarea value={value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        : <input type={type} value={value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)} style={inputStyle} />
      }
    </div>
  )
}

function CharCount({ val, max }: { val: string; max: number }) {
  const n = val.length
  return <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.44rem', letterSpacing: '0.1em', color: n > max ? '#eb5757' : '#6a5a4a', marginTop: -8 }}>{n}/{max} {n > max ? '— troppo lungo' : ''}</p>
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,168,76,0.08)' }}>
      <div style={{ flex: 1, fontFamily: 'Cormorant Garamond, serif', color: '#f5ede0', fontSize: '0.95rem' }}>{label}</div>
      <button onClick={() => onChange(!checked)} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative', background: checked ? '#c9a84c' : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }}>
        <div style={{ position: 'absolute', top: 3, left: checked ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: checked ? '#0a0805' : '#9a8a78', transition: 'left 0.3s' }} />
      </button>
    </div>
  )
}

function SaveBar({ saved, onSave }: { saved: boolean; onSave: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
      <button onClick={onSave} style={{ ...btnGold, background: saved ? '#6fcf97' : '#c9a84c', minWidth: 140 }}>
        {saved ? '✓ Salvato e applicato' : 'Salva e applica'}
      </button>
    </div>
  )
}

// ─── Image compression helper ─────────────────────────────────────────────────
function compressImage(file: File, maxWidth: number, maxHeight: number, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = e => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        let { width, height } = img
        const ratio = Math.min(maxWidth / width, maxHeight / height, 1)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

// Messaggio d'errore AI mostrato all'utente (conserva la causa reale: chiave mancante, limite, modello, ecc.)
const aiErr = (e: unknown) => '⚠ ' + (((e as Error)?.message || 'Errore AI — riprova').slice(0, 200))

// ─── Groq Key Panel ──────────────────────────────────────────────────────────
function GroqKeyPanel({ onToast }: { onToast: (msg: string) => void }) {
  const [key, setKey] = React.useState(() => getGroqKey())
  const [mText, setMText] = React.useState(() => getModelOverride('text'))
  const [mVision, setMVision] = React.useState(() => getModelOverride('vision'))
  const [testing, setTesting] = React.useState(false)
  const [report, setReport] = React.useState<{ text: GroqTestResult; vision: GroqTestResult } | null>(null)
  const [diag, setDiag] = React.useState('')
  const [diagBusy, setDiagBusy] = React.useState(false)
  const runDiag = async () => { setDiagBusy(true); setDiag(''); try { setDiag(await groqDiagnose()) } finally { setDiagBusy(false) } }

  const persist = (): boolean => {
    const k = key.trim()
    if (k && !isValidGroqKey(k)) { onToast('⚠ La chiave deve iniziare con gsk_ ed essere completa'); return false }
    setGroqKey(k); setModelOverride('text', mText); setModelOverride('vision', mVision)
    return true
  }
  const saveKey = () => { if (persist()) onToast(key.trim() ? '✦ Impostazioni Groq salvate ✓' : 'Chiave Groq rimossa') }
  const testKey = async () => {
    if (!persist()) return
    setTesting(true); setReport(null)
    try { setReport(await testGroq()) } finally { setTesting(false) }
  }
  const line = (label: string, r: GroqTestResult) => (
    <div style={{ color: r.ok ? '#6fcf97' : '#eb5757', marginTop: 4 }}>{r.ok ? '✓' : '✗'} {label}: {r.ok ? 'funziona' : r.msg}</div>
  )

  return (
    <div style={{ ...cardStyle, border: '1px solid rgba(111,207,151,0.2)' }}>
      <p style={{ ...labelStyle, color: '#6fcf97', marginBottom: '0.5rem' }}>🤖 CHIAVE API GROQ (AI)</p>
      <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#9a8a78', fontSize: '0.85rem', marginBottom: '1rem' }}>
        Crea una chiave gratuita su <strong style={{ color: '#c9a84c' }}>console.groq.com</strong> → API Keys → Create key. Se su Netlify è impostata <strong style={{ color: '#c9a84c' }}>GROQ_API_KEY</strong> (consigliato) non serve inserire nulla qui: l'AI funziona su ogni dispositivo dopo il login. Una chiave inserita qui vale solo in questo browser e ha la precedenza.
      </p>
      <div style={{ display: 'flex', gap: 6, marginBottom: '0.5rem' }}>
        <input
          type="password" autoComplete="off" value={key}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKey(e.target.value)}
          placeholder="gsk_..."
          style={{ ...inputStyle, flex: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}
        />
        <button onClick={saveKey} style={{ ...btnGold, fontSize: '0.44rem', padding: '0.4rem 0.8rem', flexShrink: 0 }}>Salva</button>
        <button onClick={testKey} disabled={testing} style={{ ...btnGhost, fontSize: '0.44rem', padding: '0.4rem 0.8rem', flexShrink: 0, color: '#6fcf97', borderColor: 'rgba(111,207,151,0.3)' }}>
          {testing ? '⏳' : '✦ Test'}
        </button>
        <button onClick={runDiag} disabled={diagBusy} title="Mostra cosa vede il server" style={{ ...btnGhost, fontSize: '0.44rem', padding: '0.4rem 0.8rem', flexShrink: 0 }}>
          {diagBusy ? '⏳' : '🔍 Diagnosi'}
        </button>
      </div>
      {diag && <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'Cormorant Garamond, serif', fontSize: '0.86rem', color: '#e8dcc8', background: 'rgba(0,0,0,0.25)', padding: '0.7rem 0.8rem', margin: '0.3rem 0 0.8rem' }}>{diag}</pre>}
      {report && (
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.88rem', margin: '0.5rem 0 0.8rem' }}>
          {line('Testo', report.text)}
          {line('Visione (analisi foto)', report.vision)}
        </div>
      )}
      <details style={{ marginTop: 8 }}>
        <summary style={{ fontFamily: 'Cinzel, serif', fontSize: '0.42rem', letterSpacing: '0.12em', color: '#9a8a78', cursor: 'pointer' }}>MODELLI (avanzate — lascia vuoto per i predefiniti)</summary>
        <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
          <div>
            <label style={labelStyle}>Modello testo (predefinito: {DEFAULT_TEXT_MODELS[0]})</label>
            <input value={mText} onChange={e => setMText(e.target.value)} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.8rem' }} placeholder={DEFAULT_TEXT_MODELS[0]} />
          </div>
          <div>
            <label style={labelStyle}>Modello visione (predefinito: {DEFAULT_VISION_MODELS[0]})</label>
            <input value={mVision} onChange={e => setMVision(e.target.value)} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.8rem' }} placeholder={DEFAULT_VISION_MODELS[0]} />
          </div>
          <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.78rem', fontStyle: 'italic', color: '#6a5a4a' }}>
            Groq dismette i modelli ogni pochi mesi: se il Test fallisce con "nessun modello disponibile", scrivi qui il nome del modello attuale (console.groq.com/docs/models).
          </p>
        </div>
      </details>
    </div>
  )
}

// ─── AI Assist Button ─────────────────────────────────────────────────────────
function AiBtn({ loading, onClick, label = '✦ AI' }: { loading: boolean; onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} disabled={loading} title="Assistenza AI (Groq)" style={{ background: loading ? 'rgba(111,207,151,0.08)' : 'rgba(111,207,151,0.12)', border: '1px solid rgba(111,207,151,0.35)', color: loading ? '#9a8a78' : '#6fcf97', fontFamily: 'Cinzel, serif', fontSize: '0.44rem', letterSpacing: '0.15em', padding: '0.3rem 0.6rem', cursor: loading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', flexShrink: 0 }}>
      {loading ? '⏳' : label}
    </button>
  )
}

// ─── Image Upload Zone ────────────────────────────────────────────────────────
// FIX: usa una ref per accumulare i risultati invece della closure stale
function ImageUploadZone({ images, onChange, onAiAnalyze }: { images: string[]; onChange: (imgs: string[]) => void; onAiAnalyze?: (src: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  // Ref che punta sempre all'array corrente — evita closure stale
  const imagesRef = useRef(images)
  useEffect(() => { imagesRef.current = images }, [images])

  const readFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    const fileArr = Array.from(files).filter(f => f.type.startsWith('image/'))
    const results: string[] = []
    for (const file of fileArr) {
      try {
        const compressed = await compressImage(file, 1200, 1200, 0.78)
        results.push(compressed)
      } catch {
        await new Promise<void>(resolve => {
          const reader = new FileReader()
          reader.onload = e => { results.push(e.target?.result as string); resolve() }
          reader.readAsDataURL(file)
        })
      }
    }
    // Legge il valore più aggiornato tramite ref → nessuna closure stale
    onChange([...imagesRef.current, ...results])
    setUploading(false)
  }

  return (
    <div>
      <div onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); readFiles(e.dataTransfer.files) }}
        onClick={() => !uploading && inputRef.current?.click()}
        style={{ border: `2px dashed ${dragging ? '#c9a84c' : uploading ? 'rgba(111,207,151,0.5)' : 'rgba(201,168,76,0.25)'}`, padding: '1.5rem', textAlign: 'center', cursor: uploading ? 'wait' : 'pointer', transition: 'border-color 0.3s', marginBottom: '1rem' }}>
        {uploading
          ? <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.55rem', letterSpacing: '0.2em', color: '#6fcf97' }}>⏳ ELABORAZIONE IN CORSO…</p>
          : <>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.55rem', letterSpacing: '0.2em', color: '#9a8a78' }}>TRASCINA IMMAGINI QUI O CLICCA</p>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.78rem', color: '#6a5a4a', marginTop: 4 }}>Supporta selezione multipla · JPG, PNG, WebP</p>
          </>
        }
        <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => readFiles(e.target.files)} />
      </div>
      {images.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {images.map((src, idx) => (
            <div key={idx} style={{ position: 'relative', width: 90, height: 90, borderRadius: 2 }}>
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 2 }} />
              {idx === 0 && <span style={{ position: 'absolute', top: 3, left: 3, background: '#c9a84c', color: '#0a0805', fontFamily: 'Cinzel, serif', fontSize: '0.4rem', padding: '1px 4px' }}>PRINCIPALE</span>}
              <div style={{ position: 'absolute', top: 3, right: 3, display: 'flex', gap: 2 }}>
                {onAiAnalyze && idx === 0 && (
                  <button onClick={() => onAiAnalyze(src)} title="Analizza con AI" style={{ background: 'rgba(111,207,151,0.85)', border: 'none', color: '#0a0805', width: 18, height: 18, cursor: 'pointer', fontSize: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✦</button>
                )}
                {idx > 0 && <button onClick={() => { const n = [...images]; [n[idx-1], n[idx]] = [n[idx], n[idx-1]]; onChange(n) }} style={{ background: 'rgba(0,0,0,0.7)', border: 'none', color: '#c9a84c', width: 18, height: 18, cursor: 'pointer', fontSize: '0.6rem' }}>←</button>}
                <button onClick={() => onChange(images.filter((_, i) => i !== idx))} style={{ background: 'rgba(0,0,0,0.7)', border: 'none', color: '#eb5757', width: 18, height: 18, cursor: 'pointer', fontSize: '0.8rem' }}>×</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Single image upload (for settings fields) ────────────────────────────────
// Gli sfondi (sectionBgs + vecchi campi ≤v49) si salvano solo da "Sfondi & Mappa":
// le altre tab hanno una copia locale che potrebbe essere vecchia e non devono riscriverli.
const BG_FIELDS = ['sectionBgs', 'footerGlassRev', 'catalogSeedRev', 'footerGlass', 'footerGlassBlur', 'footerGlassBorder', 'heroImageUrl', 'heroImageOpacity', 'heroImageBrightness', 'footerImageUrl', 'footerImageOpacity', 'footerImageBrightness', 'reviewsBgImageUrl', 'reviewsBgOpacity', 'reviewsBgBrightness']
function withoutBgFields<T extends Record<string, any>>(o: T): Partial<T> {
  const out: any = { ...o }
  BG_FIELDS.forEach(k => { delete out[k] })
  return out
}

function SingleImageUpload({ label, value, onChange, aspectRatio, previewFilter, hidePreview }: { label: string; value: string; onChange: (v: string) => void; aspectRatio?: string; previewFilter?: string; hidePreview?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const readFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    // Logo/favicon: max 400×400; hero/about/footer: max 1400×900
    const isSmall = aspectRatio === '1/1'
    const maxW = isSmall ? 400 : 1400
    const maxH = isSmall ? 400 : 900
    try {
      const compressed = await compressImage(file, maxW, maxH, 0.80)
      onChange(compressed)
    } catch {
      const reader = new FileReader()
      reader.onload = e => onChange(e.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <input
          value={value.startsWith('data:') ? '(immagine caricata)' : value}
          onChange={e => onChange(e.target.value)}
          placeholder="Incolla URL oppure carica →"
          style={{ ...inputStyle, flex: 1, fontSize: '0.78rem' }}
        />
        <button
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const fi = e.dataTransfer.files[0]; if (fi) readFile(fi) }}
          style={{ ...btnGhost, fontSize: '0.46rem', padding: '0.4rem 0.75rem', whiteSpace: 'nowrap', borderColor: dragging ? '#c9a84c' : undefined, color: dragging ? '#c9a84c' : undefined }}
        >⬆ Upload</button>
        <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const fi = e.target.files?.[0]; if (fi) readFile(fi) }} />
      </div>
      {value && hidePreview && (
        <button onClick={() => onChange('')} style={{ ...btnGhost, fontSize: '0.44rem', padding: '0.3rem 0.6rem', color: '#eb5757' }}>× Rimuovi immagine</button>
      )}
      {value && !hidePreview && (
        <div style={{ position: 'relative', display: 'block', width: '100%' }}>
          <img src={value} alt="" style={{ width: '100%', aspectRatio: aspectRatio || '16/5', objectFit: 'cover', display: 'block', filter: previewFilter }} />
          <button onClick={() => onChange('')} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.75)', border: 'none', color: '#eb5757', width: 22, height: 22, cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2 }}>×</button>
        </div>
      )}
    </div>
  )
}

// ─── Greeting ─────────────────────────────────────────────────────────────────
function useGreeting() {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id) }, [])
  const h = now.getHours()
  let greeting = 'Buonanotte'
  if (h >= 5 && h < 12) greeting = 'Buongiorno'
  else if (h >= 12 && h < 18) greeting = 'Buon pomeriggio'
  else if (h >= 18 && h < 23) greeting = 'Buonasera'
  return { greeting, now }
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ setTab, catalog, reviews }: { setTab: (t: AdminTab) => void; catalog: CatalogItem[]; reviews: Recensione[] }) {
  const { greeting, now } = useGreeting()
  const { settings, updateSettings } = useApp()
  const [maintenanceToast, setMaintenanceToast] = useState<string | null>(null)
  const [uptime] = useState(() => Math.floor(Math.random() * 86400 * 3 + 3600)) // simulated
  const [uptimeSecs, setUptimeSecs] = useState(uptime)

  useEffect(() => {
    const id = setInterval(() => setUptimeSecs(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const fmtUptime = (secs: number) => {
    const d = Math.floor(secs / 86400)
    const h = Math.floor((secs % 86400) / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    if (d > 0) return `${d}g ${h}h ${m}m`
    if (h > 0) return `${h}h ${m}m ${s}s`
    return `${m}m ${s}s`
  }

  // ── Maintenance quick actions ──
  const activateMaintenance24h = () => {
    const end = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
    updateSettings({ maintenanceMode: true, maintenanceEndDate: end })
    setMaintenanceToast('🔧 Manutenzione attivata per 24 ore')
    setTimeout(() => setMaintenanceToast(null), 3000)
  }
  const deactivateMaintenance = () => {
    updateSettings({ maintenanceMode: false, maintenanceEndDate: '' })
    setMaintenanceToast('✅ Manutenzione disattivata')
    setTimeout(() => setMaintenanceToast(null), 3000)
  }

  // ── Catalog stats ──
  const catDisponibili   = catalog.filter(c => c.stato === 'disponibile').length
  const catVetrina       = catalog.filter(c => c.stato === 'in_vetrina').length
  const catTrattativa    = catalog.filter(c => c.stato === 'trattativa').length
  const catVenduti       = catalog.filter(c => c.stato === 'venduto').length
  const catVisibili      = catalog.filter(c => c.visibile !== false).length
  const recVisibili      = reviews.filter(r => r.visibile).length
  const recInEvidenza    = reviews.filter(r => r.inEvidenza).length
  const avgStelle        = reviews.length ? (reviews.reduce((a, r) => a + (r.stelle || 0), 0) / reviews.length).toFixed(1) : '—'

  // ── Category breakdown ──
  const catBreakdown = CATEGORIES.map(cat => ({
    cat,
    count: catalog.filter(c => c.categoria === cat).length,
  })).filter(x => x.count > 0).sort((a, b) => b.count - a.count).slice(0, 5)

  const topCat = catBreakdown[0]?.count || 1

  // ── Status pills ──
  const statusItems = [
    { label: 'Sito online',      ok: true,                          icon: '🌐' },
    { label: 'Manutenzione',     ok: !settings.maintenanceMode,     icon: settings.maintenanceMode ? '🔧' : '✓',  warn: settings.maintenanceMode },
    { label: 'Banner annuncio',  ok: settings.bannerAttivo,         icon: '📢', neutral: true },
    { label: 'WhatsApp',         ok: settings.showWhatsApp,         icon: '💬', neutral: true },
    { label: 'Prezzi visibili',  ok: settings.showPrezzi,           icon: '🏷', neutral: true },
    { label: 'Cursore custom',   ok: settings.showCursor,           icon: '🖱', neutral: true },
  ]

  // ── Countdown remaining ──
  const maintenanceCountdown = (() => {
    if (!settings.maintenanceMode || !settings.maintenanceEndDate) return null
    const rem = new Date(settings.maintenanceEndDate).getTime() - Date.now()
    if (rem <= 0) return 'Scaduto'
    const h = Math.floor(rem / 3600000)
    const m = Math.floor((rem % 3600000) / 60000)
    return `${h}h ${m}m rimanenti`
  })()

  const navActions = [
    { label: '+ Oggetto',   tab: 'catalog'   as AdminTab, icon: '🏺', desc: 'Aggiungi al catalogo' },
    { label: 'Impostazioni',tab: 'settings'  as AdminTab, icon: '⚙',  desc: 'Configura il sito' },
    { label: 'Aspetto',     tab: 'aspetto'   as AdminTab, icon: '🎨', desc: 'Immagini e opacità' },
    { label: 'Sconti',      tab: 'sconti'    as AdminTab, icon: '🏷', desc: 'Promozioni attive' },
    { label: 'Banner',      tab: 'banner'    as AdminTab, icon: '📢', desc: 'Annuncio in cima' },
    { label: 'Recensioni',  tab: 'reviews'   as AdminTab, icon: '⭐', desc: 'Gestisci feedback' },
    { label: 'Orari',       tab: 'orari'     as AdminTab, icon: '🕐', desc: 'Orari di apertura' },
    { label: 'SEO',         tab: 'seo'       as AdminTab, icon: '🔍', desc: 'Meta tag' },
  ]

  const D = (color: string, bg: string) => ({ color, bg })
  const STAT_PALETTE = {
    gold:   D('#c9a84c', 'rgba(201,168,76,0.08)'),
    green:  D('#6fcf97', 'rgba(111,207,151,0.08)'),
    red:    D('#eb5757', 'rgba(235,87,87,0.08)'),
    blue:   D('#a8d8f0', 'rgba(168,216,240,0.08)'),
    orange: D('#f2994a', 'rgba(242,153,74,0.08)'),
    purple: D('#bb86fc', 'rgba(187,134,252,0.08)'),
  }

  const bigStats = [
    { label: 'Oggetti totali',    value: catalog.length,   ...STAT_PALETTE.gold   },
    { label: 'Visibili online',   value: catVisibili,      ...STAT_PALETTE.green  },
    { label: 'Disponibili',       value: catDisponibili,   ...STAT_PALETTE.green  },
    { label: 'In vetrina',        value: catVetrina,       ...STAT_PALETTE.gold   },
    { label: 'In trattativa',     value: catTrattativa,    ...STAT_PALETTE.orange },
    { label: 'Venduti',           value: catVenduti,       ...STAT_PALETTE.red    },
    { label: 'Recensioni attive', value: recVisibili,      ...STAT_PALETTE.blue   },
    { label: 'In evidenza',       value: recInEvidenza,    ...STAT_PALETTE.purple },
  ]

  const ROW: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 }
  const DIVIDER = <div style={{ height: 1, background: 'rgba(201,168,76,0.08)', margin: '1.8rem 0' }} />

  return (
    <div style={{ paddingBottom: '2rem' }}>

      {/* Toast */}
      <AnimatePresence>
        {maintenanceToast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            style={{ position: 'fixed', top: 80, right: 24, zIndex: 999999, maxWidth: 'calc(100vw - 48px)', lineHeight: 1.5, wordBreak: 'break-word', background: '#1c1510', border: '1px solid rgba(201,168,76,0.35)', padding: '0.8rem 1.4rem', fontFamily: 'Cinzel, serif', fontSize: '0.55rem', letterSpacing: '0.12em', color: '#6fcf97' }}
          >
            {maintenanceToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.52rem', letterSpacing: '0.28em', color: '#9a8a78', marginBottom: 6 }}>
          {now.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()} · {now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
        <h2 style={{ fontFamily: 'Playfair Display, serif', color: '#f5ede0', fontWeight: 300, fontSize: 'clamp(1.6rem, 4vw, 2.6rem)', marginBottom: 6 }}>{greeting}, admin.</h2>
        <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#9a8a78', fontSize: '1.05rem' }}>
          Pannello di controllo — <em style={{ color: '#c9a84c' }}>{settings.siteName}</em>
        </p>
      </div>

      {/* ── Status bar ── */}
      <div style={{ ...cardStyle, marginBottom: '1.8rem', padding: '1rem 1.2rem' }}>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.46rem', letterSpacing: '0.24em', color: '#6a5a4a', textTransform: 'uppercase', marginBottom: '0.8rem' }}>Stato servizi</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {statusItems.map(s => {
            const col = s.warn ? '#f2994a' : s.neutral ? '#9a8a78' : s.ok ? '#6fcf97' : '#eb5757'
            const bg  = s.warn ? 'rgba(242,153,74,0.08)' : s.neutral ? 'rgba(154,138,120,0.07)' : s.ok ? 'rgba(111,207,151,0.08)' : 'rgba(235,87,87,0.08)'
            return (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.35rem 0.75rem', background: bg, border: `1px solid ${col}33` }}>
                <span style={{ fontSize: '0.7rem' }}>{s.icon}</span>
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.44rem', letterSpacing: '0.12em', color: col, textTransform: 'uppercase' }}>{s.label}</span>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: col, flexShrink: 0, boxShadow: `0 0 5px ${col}` }} />
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Maintenance control ── */}
      <div style={{ ...cardStyle, marginBottom: '1.8rem', borderColor: settings.maintenanceMode ? 'rgba(242,153,74,0.35)' : 'rgba(201,168,76,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.5rem', letterSpacing: '0.2em', color: settings.maintenanceMode ? '#f2994a' : '#9a8a78', textTransform: 'uppercase', marginBottom: 4 }}>
              {settings.maintenanceMode ? '🔧 Manutenzione attiva' : '🟢 Modalità manutenzione'}
            </p>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#9a8a78', fontSize: '0.9rem', fontStyle: 'italic' }}>
              {settings.maintenanceMode
                ? maintenanceCountdown
                  ? `Sito nascosto ai visitatori · ${maintenanceCountdown}`
                  : 'Sito nascosto ai visitatori — nessuna scadenza impostata'
                : 'Il sito è visibile ai visitatori'
              }
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {!settings.maintenanceMode && (
              <button
                onClick={activateMaintenance24h}
                style={{ ...btnGold, fontSize: '0.5rem', padding: '0.55rem 1rem', background: '#f2994a' }}
              >
                🔧 Attiva 24h
              </button>
            )}
            {settings.maintenanceMode && (
              <button
                onClick={deactivateMaintenance}
                style={{ ...btnGold, fontSize: '0.5rem', padding: '0.55rem 1rem', background: '#6fcf97', color: '#0a0805' }}
              >
                ✅ Disattiva ora
              </button>
            )}
            <button onClick={() => setTab('settings')} style={{ ...btnGhost, fontSize: '0.48rem', padding: '0.55rem 1rem' }}>
              Configura →
            </button>
          </div>
        </div>
      </div>

      {/* ── Big stats grid ── */}
      <h3 style={{ ...sectionTitle, fontSize: '0.95rem', marginBottom: '0.9rem' }}>Statistiche</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: '1.8rem' }}>
        {bigStats.map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}22`, padding: '1rem', textAlign: 'center' }}>
            <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '2rem', color: s.color, lineHeight: 1, marginBottom: 4 }}>{s.value}</p>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.42rem', letterSpacing: '0.18em', color: '#6a5a4a', textTransform: 'uppercase' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Categoria breakdown + media rating ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginBottom: '1.8rem', alignItems: 'start' }}>
        <div style={{ ...cardStyle }}>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.46rem', letterSpacing: '0.22em', color: '#6a5a4a', textTransform: 'uppercase', marginBottom: '1rem' }}>Top categorie</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {catBreakdown.map(x => (
              <div key={x.cat}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontFamily: 'Cormorant Garamond, serif', color: '#f5ede0', fontSize: '0.88rem' }}>{x.cat}</span>
                  <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.45rem', color: '#c9a84c', letterSpacing: '0.1em' }}>{x.count}</span>
                </div>
                <div style={{ height: 3, background: 'rgba(201,168,76,0.1)', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(x.count / topCat) * 100}%`, background: 'linear-gradient(to right, rgba(201,168,76,0.5), #c9a84c)', transition: 'width 0.6s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ ...cardStyle, textAlign: 'center', minWidth: 110 }}>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.42rem', letterSpacing: '0.18em', color: '#6a5a4a', textTransform: 'uppercase', marginBottom: 8 }}>Rating medio</p>
          <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '2.8rem', color: '#c9a84c', lineHeight: 1, marginBottom: 4 }}>{avgStelle}</p>
          <p style={{ fontSize: '1rem', letterSpacing: 2 }}>{'★'.repeat(Math.round(Number(avgStelle) || 0))}</p>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.4rem', color: '#6a5a4a', marginTop: 6, letterSpacing: '0.12em' }}>{reviews.length} TOTALI</p>
        </div>
      </div>

      {/* ── Info sito ── */}
      <div style={{ ...cardStyle, marginBottom: '1.8rem' }}>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.46rem', letterSpacing: '0.22em', color: '#6a5a4a', textTransform: 'uppercase', marginBottom: '1rem' }}>Informazioni sito</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.8rem 2rem' }}>
          {[
            { k: 'Nome',      v: settings.siteName },
            { k: 'Slogan',    v: settings.slogan },
            { k: 'Email',     v: settings.email },
            { k: 'Telefono',  v: settings.telefono },
            { k: 'Indirizzo', v: `${settings.indirizzo}, ${settings.citta}` },
            { k: 'Tema',      v: `${settings.fontDisplay} / ${settings.fontBody}` },
            { k: 'Canonical', v: settings.maintenanceEndDate ? new Date(settings.maintenanceEndDate).toLocaleString('it-IT') : '—', label: 'Fine manutenzione' },
            { k: 'Uptime (sessione)', v: fmtUptime(uptimeSecs) },
          ].map(row => (
            <div key={row.k}>
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.42rem', letterSpacing: '0.15em', color: '#6a5a4a', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>{row.label || row.k}</span>
              <span style={{ fontFamily: 'Cormorant Garamond, serif', color: '#c9a84c', fontSize: '0.9rem' }}>{row.v || '—'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Collegamenti rapidi ── */}
      <h3 style={{ ...sectionTitle, fontSize: '0.95rem', marginBottom: '0.9rem' }}>Azioni rapide</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: '1.8rem' }}>
        {navActions.map(a => (
          <button key={a.tab} onClick={() => setTab(a.tab)}
            style={{ ...cardStyle, cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.2s, background 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.45)'; e.currentTarget.style.background = 'rgba(201,168,76,0.04)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.1)';  e.currentTarget.style.background = 'rgba(255,255,255,0.025)' }}
          >
            <p style={{ fontSize: '1.3rem', marginBottom: 6, lineHeight: 1 }}>{a.icon}</p>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.52rem', letterSpacing: '0.14em', color: '#c9a84c', marginBottom: 3 }}>{a.label}</p>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.82rem', color: '#9a8a78' }}>{a.desc}</p>
          </button>
        ))}
      </div>

      {/* ── Link esterni ── */}
      <div style={{ ...cardStyle, marginBottom: '1.8rem' }}>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.46rem', letterSpacing: '0.22em', color: '#6a5a4a', textTransform: 'uppercase', marginBottom: '0.9rem' }}>Riferimenti esterni</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[
            { label: 'Google Maps', url: settings.mapsLink },
            { label: 'Instagram',   url: settings.instagram },
            { label: 'WhatsApp',    url: `https://wa.me/${settings.whatsapp}` },
            { label: 'Email',       url: `mailto:${settings.email}` },
            { label: 'Sito pubblico', url: 'http://localhost:5173', note: 'dev' },
          ].filter(l => l.url && l.url !== 'mailto:' && l.url !== 'https://wa.me/').map(l => (
            <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: 'Cinzel, serif', fontSize: '0.46rem', letterSpacing: '0.14em', color: '#c9a84c', textDecoration: 'none', border: '1px solid rgba(201,168,76,0.2)', padding: '0.4rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: 5, transition: 'border-color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)'}
            >
              ↗ {l.label}{l.note ? <span style={{ color: '#6a5a4a' }}>({l.note})</span> : ''}
            </a>
          ))}
        </div>
      </div>

      {/* ── Ultimi oggetti ── */}
      <h3 style={{ ...sectionTitle, fontSize: '0.95rem', marginBottom: '0.9rem' }}>Ultimi oggetti aggiunti</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[...catalog].reverse().slice(0, 6).map(item => (
          <div key={item.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.7rem 1rem' }}>
            {item.img
              ? <img src={item.img} alt="" style={{ width: 40, height: 40, objectFit: 'cover', flexShrink: 0 }} />
              : <div style={{ width: 40, height: 40, background: 'rgba(201,168,76,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ color: '#6a5a4a', fontSize: '1.1rem' }}>🏺</span></div>
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: 'Playfair Display, serif', color: '#f5ede0', fontSize: '0.9rem', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nome || '—'}</p>
              <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#9a8a78', fontSize: '0.78rem' }}>{item.era} · {item.categoria}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.4rem', letterSpacing: '0.1em', color: STATO_COLOR[item.stato], textTransform: 'uppercase' }}>{item.stato.replace('_', ' ')}</span>
              {item.visibile === false && <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.38rem', letterSpacing: '0.08em', color: '#eb5757' }}>nascosto</span>}
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}


// ─── EmailJS: diagnostica + email di prova ────────────────────────────────────
function EmailJsTools({ local }: { local: SiteSettings }) {
  const env = import.meta.env as Record<string, string | undefined>
  const serviceId = (env.VITE_EMAILJS_SERVICE || local.emailjsServiceId || '').trim()
  const publicKey = (env.VITE_EMAILJS_PUBLIC_KEY || local.emailjsPublicKey || '').trim()
  const tplShop = (env.VITE_EMAILJS_TEMPLATE || local.emailjsTemplateBook || local.emailjsTemplateRequest || local.emailjsTemplateEstimate || '').trim()
  const tplClient = (env.VITE_EMAILJS_TEMPLATE_CLIENT || local.emailjsTemplateClient || '').trim()
  const canWrite = SYNC_STATUS.canRead && !!getAdminToken()
  const [testEmail, setTestEmail] = useState(local.email || '')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const missing = [!serviceId && 'Service ID', !publicKey && 'Public Key', !tplShop && 'Template negozio'].filter(Boolean) as string[]
  const fromEnv = !!env.VITE_EMAILJS_SERVICE
  const ready = missing.length === 0 && (local.emailjsEnabled || fromEnv)

  const errText = (e: unknown) => {
    const x = e as { status?: number; text?: string; message?: string }
    if (x?.message === 'timeout') return 'Nessuna risposta da EmailJS (timeout).'
    if (x?.status === 400) return `400 — ${x.text || 'Service ID o Template ID non validi'}`
    if (x?.status === 401 || x?.status === 403) return `${x.status} — Public Key errata o dominio non presente in Allowed Origins. ${x.text || ''}`
    if (x?.status === 412) return `412 — Il servizio email (Gmail/SMTP) va ricollegato in EmailJS. ${x.text || ''}`
    if (x?.status === 429) return '429 — Limite di invio EmailJS raggiunto.'
    return `${x?.status ?? ''} ${x?.text || x?.message || 'Errore sconosciuto'}`.trim()
  }

  const sendTest = async () => {
    setBusy(true); setResult(null)
    const params: Record<string, string> = {
      tipo: 'TEST — email di prova dal pannello', nome: 'Test', cognome: 'Admin', from_name: 'Test Admin',
      email: testEmail.trim(), reply_to: testEmail.trim(), telefono: '', giorno: '', orario: '', note: '',
      categoria: '', descrizione: 'Questa è una email di prova inviata dal pannello di controllo.',
      message: 'Questa è una email di prova inviata dal pannello di controllo.', lingua: 'it',
      riepilogo: 'Tipo richiesta: TEST\nNome: Test Admin\nEmail: ' + testEmail.trim() + '\nDescrizione: email di prova dal pannello di controllo',
    }
    const lines: string[] = []
    try {
      const { default: emailjs } = await import('@emailjs/browser')
      const to = <T,>(p: Promise<T>) => Promise.race([p, new Promise<never>((_, r) => setTimeout(() => r(new Error('timeout')), 15000))])
      try { await to(emailjs.send(serviceId, tplShop, params, publicKey)); lines.push('✓ Notifica al negozio inviata: controlla la casella del negozio.') }
      catch (e) { setResult({ ok: false, msg: '✗ Notifica al negozio: ' + errText(e) }); setBusy(false); return }
      if (tplClient) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(testEmail.trim())) lines.push('⚠ Conferma cliente non provata: inserisci un\'email di prova valida.')
        else {
          try { await to(emailjs.send(serviceId, tplClient, params, publicKey)); lines.push('✓ Conferma cliente inviata a ' + testEmail.trim()) }
          catch (e) { lines.push('✗ Conferma cliente: ' + errText(e)) }
        }
      }
      setResult({ ok: !lines.some(l => l.startsWith('✗')), msg: lines.join('\n') })
    } finally { setBusy(false) }
  }

  const box: React.CSSProperties = { ...cardStyle, fontFamily: 'Cormorant Garamond, serif', fontSize: '0.88rem', lineHeight: 1.6, color: '#9a8a78' }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Stato sincronizzazione */}
      {!canWrite && !fromEnv && (
        <div style={{ ...box, background: 'rgba(235,87,87,0.06)', borderColor: 'rgba(235,87,87,0.3)' }}>
          <strong style={{ color: '#eb5757' }}>⚠ Sincronizzazione non attiva.</strong> Queste impostazioni vengono salvate solo in <em>questo browser</em>:
          i tuoi clienti non le vedranno e i form continueranno ad aprire WhatsApp. Su Netlify (Site configuration → Environment variables) imposta le variabili
          <code style={{ color: '#f5ede0' }}> VITE_EMAILJS_SERVICE</code>, <code style={{ color: '#f5ede0' }}>VITE_EMAILJS_PUBLIC_KEY</code>, <code style={{ color: '#f5ede0' }}>VITE_EMAILJS_TEMPLATE</code> (e opzionale <code style={{ color: '#f5ede0' }}>VITE_EMAILJS_TEMPLATE_CLIENT</code>) e rifai il deploy,
          oppure fai il login admin dal sito pubblicato su Netlify (le Function Netlify non girano con npm run dev).
        </div>
      )}
      {canWrite && (
        <div style={{ ...box, background: 'rgba(111,207,151,0.05)', borderColor: 'rgba(111,207,151,0.2)' }}>
          <strong style={{ color: '#6fcf97' }}>✓ Sincronizzazione attiva.</strong> Le modifiche vengono pubblicate sul server (Netlify Database + Blobs) entro ~2 secondi e raggiungono tutti i visitatori al prossimo caricamento della pagina.
        </div>
      )}
      {!canWrite && SYNC_STATUS.canRead && !fromEnv && (
        <div style={{ ...box }}>Il Gist è in sola lettura: accedi con la password admin (server) per pubblicare le modifiche.</div>
      )}

      {/* Stato configurazione */}
      <div style={{ ...box, borderColor: ready ? 'rgba(111,207,151,0.3)' : 'rgba(201,168,76,0.3)' }}>
        {ready
          ? <span style={{ color: '#6fcf97' }}>✓ Configurazione completa — i form inviano email{fromEnv ? ' (valori da variabili d\'ambiente)' : ''}.</span>
          : missing.length > 0
            ? <span style={{ color: '#c9a84c' }}>Mancano: {missing.join(', ')}. Finché non sono compilati, i form aprono WhatsApp.</span>
            : <span style={{ color: '#c9a84c' }}>Attiva l'interruttore "EmailJS attivo": al momento i form aprono WhatsApp.</span>}
      </div>

      {/* Email di prova */}
      <div style={{ ...box }}>
        <p style={{ ...labelStyle, color: '#c9a84c', marginBottom: 8 }}>EMAIL DI PROVA</p>
        <label style={labelStyle}>Email a cui inviare la conferma cliente (solo per la prova)</label>
        <input value={testEmail} onChange={e => setTestEmail(e.target.value)} style={inputStyle} placeholder="tua@email.com" />
        <button
          onClick={sendTest}
          disabled={busy || missing.length > 0}
          style={{ ...btnGold, marginTop: 12, opacity: busy || missing.length > 0 ? 0.5 : 1, cursor: busy ? 'wait' : missing.length > 0 ? 'not-allowed' : 'pointer' }}
        >
          {busy ? 'Invio…' : 'Invia email di prova'}
        </button>
        {result && (
          <pre style={{ whiteSpace: 'pre-wrap', margin: '12px 0 0', fontFamily: 'inherit', color: result.ok ? '#6fcf97' : '#eb5757' }}>{result.msg}</pre>
        )}
        <p style={{ fontSize: '0.78rem', fontStyle: 'italic', color: '#6a5a4a', marginTop: 10 }}>
          Usa i valori attuali dei campi (anche non ancora pubblicati) e gli stessi template dei form reali.
        </p>
      </div>
    </div>
  )
}

// ─── Settings Panel — writes directly to context via updateSettings ───────────
function SettingsAdmin() {
  const { settings, updateSettings } = useApp()
  const [local, setLocal] = useState<SiteSettings>({ ...settings })
  const [saved, setSaved] = useState(false)
  const [subTab, setSubTab] = useState<'identita' | 'testi' | 'perche' | 'stile' | 'funzionalita' | 'contatti' | 'emailjs' | 'password'>('identita')
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({})
  const [aiToast, setAiToast] = useState('')

  const showAiToast = (msg: string) => { setAiToast(msg); setTimeout(() => setAiToast(''), msg.startsWith('⚠') ? 7000 : 2500) }

  // Keep local in sync if settings change externally (e.g. theme preset)
  useEffect(() => { setLocal(s => ({ ...s, ...settings })) }, [settings])

  // Save images explicitly (heavy base64); all other fields update live
  const save = () => {
    updateSettings(withoutBgFields(local))
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  // Default: live update — writes to local state AND context immediately
  const f = (k: keyof SiteSettings) => (v: unknown) => {
    setLocal(p => ({ ...p, [k]: v }))
    updateSettings({ [k]: v } as Partial<SiteSettings>)
  }

  // ── AI: genera testi sezione Testi ──────────────────────────────────────
  const aiGenerateTesti = async () => {
    const siteName = local.siteName || ''
    const slogan = local.slogan || ''
    setAiLoading(p => ({ ...p, testi: true }))
    try {
      const result = await groqText(`Sei un copywriter esperto per negozi italiani di arredi vintage e bijoux. Genera i testi marketing per il sito "${siteName || 'un negozio vintage'}"${slogan ? ` con slogan "${slogan}"` : ''}.
Rispondi SOLO con un JSON valido, senza markdown, in questo formato esatto:
{"leadText":"...","aboutLead":"...","aboutQuote":"..."}

Regole:
- leadText: frase hero evocativa e poetica, max 120 caratteri, cattura l'essenza del negozioto di lusso
- aboutLead: paragrafo Chi Siamo di 2-3 frasi, elegante, racconta passione e competenza, max 300 caratteri
- aboutQuote: citazione breve e ispirazionale sull'arte o sul tempo, max 100 caratteri (può essere di un autore famoso)
- Tono: caldo, autentico, un po' nostalgico, non generico`)
      const cleaned = result.replace(/```json|```/g, '').trim()
      const parsed = extractJson(cleaned)
      if (parsed.leadText) f('leadText')(parsed.leadText)
      if (parsed.aboutLead) f('aboutLead')(parsed.aboutLead)
      if (parsed.aboutQuote) f('aboutQuote')(parsed.aboutQuote)
      showAiToast('✦ Testi generati con AI ✓')
    } catch (e) {
      showAiToast(aiErr(e))
    }
    setAiLoading(p => ({ ...p, testi: false }))
  }

  // ── AI: genera singolo campo testo ──────────────────────────────────────
  const aiGenerateField = async (field: 'leadText' | 'aboutLead' | 'aboutQuote' | 'slogan') => {
    const siteName = local.siteName || 'un negozio vintage'
    const prompts: Record<string, string> = {
      leadText: `Scrivi UNA frase hero evocativa per il sito del negozio "${siteName}". Max 120 caratteri, poetica e lussuosa. Rispondi con SOLO la frase, niente altro.`,
      aboutLead: `Scrivi un paragrafo "Chi Siamo" per il negozio "${siteName}". 2-3 frasi eleganti, max 300 caratteri. Rispondi con SOLO il testo.`,
      aboutQuote: `Suggerisci una citazione breve e ispirazionale sull'arte, il tempo o la bellezza per il negozio "${siteName}". Max 100 caratteri. Può essere di un autore famoso. Rispondi con SOLO la citazione.`,
      slogan: `Crea uno slogan breve e memorabile per il negozio "${siteName}". Max 60 caratteri, elegante e distintivo. Rispondi con SOLO lo slogan.`,
    }
    setAiLoading(p => ({ ...p, [field]: true }))
    try {
      const result = await groqText(prompts[field])
      if (result) f(field)(result.replace(/^["']+|["']+$/g, '').trim())
      showAiToast('✦ Testo generato con AI ✓')
    } catch (e) {
      showAiToast(aiErr(e))
    }
    setAiLoading(p => ({ ...p, [field]: false }))
  }

  // ── AI: messaggio di cortesia per la manutenzione ────────────────────────
  const aiGenerateMaintenance = async () => {
    setAiLoading(p => ({ ...p, maint: true }))
    try {
      const out = await groqText(`Scrivi un breve messaggio di cortesia per i visitatori del sito del negozio "${local.siteName || 'negozio vintage'}" (arredi vintage e bijoux) mentre il sito è in manutenzione${local.maintenanceEndDate ? ` fino al ${local.maintenanceEndDate}` : ''}. Tono caldo ed elegante, 2 frasi, max 200 caratteri, in italiano. Rispondi con SOLO il messaggio.`, 300)
      f('maintenanceMessage')(out.replace(/^["'«“]+|["'»”]+$/g, '').trim())
      showAiToast('✦ Messaggio generato ✓')
    } catch (e) { showAiToast(aiErr(e)) }
    setAiLoading(p => ({ ...p, maint: false }))
  }

  // ── AI: tagline del footer ───────────────────────────────────────────────
  const aiGenerateFooterTagline = async () => {
    setAiLoading(p => ({ ...p, footerTagline: true }))
    try {
      const out = await groqText(`Scrivi la tagline breve per il footer del sito del negozio "${local.siteName || 'negozio vintage'}" (arredi vintage e bijoux${local.slogan ? `, slogan: "${local.slogan}"` : ''}). Max 70 caratteri, elegante, in italiano, senza virgolette. Rispondi con SOLO la tagline.`, 150)
      f('footerTagline')(out.replace(/^["'«“]+|["'»”]+$/g, '').trim())
      showAiToast('✦ Tagline generata ✓')
    } catch (e) { showAiToast(aiErr(e)) }
    setAiLoading(p => ({ ...p, footerTagline: false }))
  }

  // ── AI: genera whyItems ──────────────────────────────────────────────────
  const aiGenerateWhyItems = async () => {
    const siteName = local.siteName || 'un negozio vintage'
    setAiLoading(p => ({ ...p, whyItems: true }))
    try {
      const result = await groqText(`Sei un copywriter esperto per negozi italiani di arredi vintage e bijoux. Genera 4 riquadri "Perché da noi" per il negozio "${siteName}".
Rispondi SOLO con un JSON array valido, senza markdown:
[{"title":"...","desc":"..."},{"title":"...","desc":"..."},{"title":"...","desc":"..."},{"title":"...","desc":"..."}]

Regole:
- title: max 35 caratteri, concreto e distintivo (non generico come "Qualità" o "Fiducia")
- desc: 180-250 caratteri, descrivi un beneficio REALE e SPECIFICO per il cliente, con dettagli credibili
- Copri 4 temi diversi: perizia/autenticità degli oggetti, cura nella selezione, esperienza del proprietario, servizio personalizzato
- Tono: caldo, competente, vicino al cliente — evita il marketing vuoto
- Esempi di buoni desc: "Ogni pezzo è scelto per carattere e stato di conservazione. Niente produzione in serie." oppure "Ogni oggetto esiste in un solo esemplare: se ti piace, non aspettare troppo."`, 1000)
      const cleaned = result.replace(/```json|```/g, '').trim()
      const parsed = extractJson(cleaned)
      if (Array.isArray(parsed) && parsed.length === 4) {
        f('whyItems')(parsed)
        showAiToast('✦ Riquadri "Perché" generati ✓')
      }
    } catch (e) {
      showAiToast(aiErr(e))
    }
    setAiLoading(p => ({ ...p, whyItems: false }))
  }
  // Image update: writes to local state AND context immediately.
  // Uses the same path as f() so the useEffect sync never stomps the uploaded value.
  const fImg = (k: keyof SiteSettings) => (v: unknown) => {
    setLocal(p => ({ ...p, [k]: v }))
    updateSettings({ [k]: v } as Partial<SiteSettings>)
  }
  const SubTabs = (['identita', 'testi', 'perche', 'stile', 'funzionalita', 'contatti', 'emailjs', 'password'] as const)

  return (
    <div>
      {aiToast && <div style={{ position: 'fixed', top: 80, right: 24, zIndex: 999999, maxWidth: 'calc(100vw - 48px)', lineHeight: 1.5, wordBreak: 'break-word', background: '#1c1510', border: '1px solid rgba(201,168,76,0.3)', padding: '0.8rem 1.4rem', fontFamily: 'Cinzel, serif', fontSize: '0.55rem', letterSpacing: '0.15em', color: '#6fcf97' }}>{aiToast}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h3 style={{ ...sectionTitle, marginBottom: 0 }}>Impostazioni sito</h3>
        <button onClick={save} style={{ ...btnGold, background: saved ? '#6fcf97' : '#c9a84c' }}>
          {saved ? '✓ Applicato sulla landing' : 'Salva e applica'}
        </button>
      </div>
      <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#6fcf97', fontSize: '0.82rem', marginBottom: '1.5rem', fontStyle: 'italic' }}>
        ⚡ Le modifiche vengono applicate <strong>immediatamente</strong> sulla landing page. Il pulsante "Salva" è necessario solo per le immagini caricate.
      </p>

      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(201,168,76,0.12)', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {SubTabs.map(t => (
          <button key={t} onClick={() => setSubTab(t)} style={{ padding: '0.6rem 1.2rem', fontFamily: 'Cinzel, serif', fontSize: '0.52rem', letterSpacing: '0.15em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', color: subTab === t ? '#c9a84c' : '#9a8a78', borderBottom: subTab === t ? '2px solid #c9a84c' : '2px solid transparent', marginBottom: -1, transition: 'all 0.3s' }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {subTab === 'identita' && (
        <SettingsGrid>
          <Field label="Nome del sito" value={local.siteName} onChange={f('siteName')} />
          <Field label="Slogan" value={local.slogan} onChange={f('slogan')} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 0 }}><Field label="Footer tagline" value={local.footerTagline} onChange={f('footerTagline')} /></div>
            <AiBtn loading={!!aiLoading.footerTagline} onClick={aiGenerateFooterTagline} label="✦ AI" />
          </div>
          <Field label="Footer rights" value={local.footerRights} onChange={f('footerRights')} />
          <Field label="Footer design credit" value={local.footerDesign} onChange={f('footerDesign')} />
          <div style={{ gridColumn: '1 / -1' }}>
            <SingleImageUpload label="Logo sito" value={local.logoUrl} onChange={fImg('logoUrl')} aspectRatio="1/1" />
          </div>
          <p style={{ gridColumn: '1 / -1', fontFamily: 'Cormorant Garamond, serif', color: '#9a8a78', fontSize: '0.85rem', margin: 0 }}>
            🖼 Le immagini di sfondo (copertina, sezioni, footer…) si gestiscono tutte in <b>Sfondi &amp; Mappa</b>.
          </p>
          <div style={{ gridColumn: '1 / -1' }}>
            <SingleImageUpload label="Favicon" value={local.faviconUrl} onChange={fImg('faviconUrl')} aspectRatio="1/1" />
          </div>
        </SettingsGrid>
      )}

      {subTab === 'testi' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-0.4rem' }}>
            <AiBtn loading={!!aiLoading.testi} onClick={aiGenerateTesti} label="✦ Genera tutti i testi con AI" />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 }}>
              <label style={labelStyle}>Slogan</label>
              <AiBtn loading={!!aiLoading.slogan} onClick={() => aiGenerateField('slogan')} label="✦ AI" />
            </div>
            <input value={local.slogan} onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('slogan')(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 }}>
              <label style={labelStyle}>Testo lead Hero</label>
              <AiBtn loading={!!aiLoading.leadText} onClick={() => aiGenerateField('leadText')} label="✦ AI" />
            </div>
            <textarea value={local.leadText} onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('leadText')(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <Field label="Titolo sezione Chi Siamo" value={local.aboutTitle} onChange={f('aboutTitle')} />
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 }}>
              <label style={labelStyle}>Testo Chi Siamo</label>
              <AiBtn loading={!!aiLoading.aboutLead} onClick={() => aiGenerateField('aboutLead')} label="✦ AI" />
            </div>
            <textarea value={local.aboutLead} onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('aboutLead')(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 }}>
              <label style={labelStyle}>Citazione Chi Siamo</label>
              <AiBtn loading={!!aiLoading.aboutQuote} onClick={() => aiGenerateField('aboutQuote')} label="✦ AI" />
            </div>
            <input value={local.aboutQuote} onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('aboutQuote')(e.target.value)} style={inputStyle} />
          </div>
        </div>
      )}

      {subTab === 'perche' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#9a8a78', fontSize: '0.95rem' }}>
              Modifica i 4 riquadri della sezione "Perché da noi". Le modifiche sostituiscono il testo predefinito.
            </p>
            <AiBtn loading={!!aiLoading.whyItems} onClick={aiGenerateWhyItems} label="✦ Genera con AI" />
          </div>
          {(local.whyItems || []).map((item, i) => (
            <div key={i} style={{ ...cardStyle }}>
              <p style={{ ...labelStyle, color: '#c9a84c', marginBottom: '1rem' }}>RIQUADRO {i + 1}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div>
                  <label style={labelStyle}>Titolo</label>
                  <input value={item.title} onChange={e => {
                    const next = [...(local.whyItems || [])]
                    next[i] = { ...next[i], title: e.target.value }
                    f('whyItems')(next)
                  }} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Descrizione</label>
                  <textarea value={item.desc} rows={3} onChange={e => {
                    const next = [...(local.whyItems || [])]
                    next[i] = { ...next[i], desc: e.target.value }
                    f('whyItems')(next)
                  }} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {subTab === 'stile' && (
        <div>
          {/* PRESET TEMI */}
          <div style={{ marginBottom: '2rem' }}>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.52rem', letterSpacing: '0.22em', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '1rem' }}>Preset temi →</p>

            {/* Temi Scuri */}
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.42rem', letterSpacing: '0.2em', color: '#9a8a78', textTransform: 'uppercase', marginBottom: '0.6rem' }}>◼ Temi Scuri (10)</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, marginBottom: '1.5rem' }}>
              {THEME_PRESETS.filter(p => p.dark).map(preset => {
                const isActive = local.bgColor === preset.bgColor && local.primaryColor === preset.primaryColor
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      f('primaryColor')(preset.primaryColor)
                      f('bgColor')(preset.bgColor)
                      f('bgAltColor')(preset.bgAltColor)
                      f('bgCardColor')(preset.bgCardColor)
                      f('textColor')(preset.textColor)
                      f('textMutedColor')(preset.textMutedColor)
                      f('accentColor')(preset.accentColor)
                      f('overlayColor')(preset.overlayColor)
                      f('fontDisplay')(preset.fontDisplay)
                      f('fontBody')(preset.fontBody)
                    }}
                    style={{
                      background: preset.bgColor,
                      border: `2px solid ${isActive ? preset.primaryColor : 'rgba(201,168,76,0.12)'}`,
                      padding: '0.9rem 1rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                      position: 'relative',
                    }}
                  >
                    {isActive && (
                      <div style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: preset.primaryColor }} />
                    )}
                    <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                      {[preset.bgColor, preset.bgAltColor, preset.bgCardColor, preset.primaryColor, preset.textColor].map((c, i) => (
                        <div key={i} style={{ width: 14, height: 14, borderRadius: 2, background: c, border: '1px solid rgba(128,128,128,0.3)' }} />
                      ))}
                    </div>
                    <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.5rem', letterSpacing: '0.14em', color: preset.primaryColor, textTransform: 'uppercase', marginBottom: 2 }}>{preset.nome}</p>
                    <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.78rem', color: preset.textColor, opacity: 0.6, lineHeight: 1.3, margin: 0 }}>{preset.descrizione}</p>
                  </button>
                )
              })}
            </div>

            {/* Temi Chiari */}
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.42rem', letterSpacing: '0.2em', color: '#9a8a78', textTransform: 'uppercase', marginBottom: '0.6rem' }}>◻ Temi Chiari (10)</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, marginBottom: '1.5rem' }}>
              {THEME_PRESETS.filter(p => !p.dark).map(preset => {
                const isActive = local.bgColor === preset.bgColor && local.primaryColor === preset.primaryColor
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      f('primaryColor')(preset.primaryColor)
                      f('bgColor')(preset.bgColor)
                      f('bgAltColor')(preset.bgAltColor)
                      f('bgCardColor')(preset.bgCardColor)
                      f('textColor')(preset.textColor)
                      f('textMutedColor')(preset.textMutedColor)
                      f('accentColor')(preset.accentColor)
                      f('overlayColor')(preset.overlayColor)
                      f('fontDisplay')(preset.fontDisplay)
                      f('fontBody')(preset.fontBody)
                    }}
                    style={{
                      background: preset.bgColor,
                      border: `2px solid ${isActive ? preset.primaryColor : 'rgba(0,0,0,0.12)'}`,
                      padding: '0.9rem 1rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                      position: 'relative',
                    }}
                  >
                    {isActive && (
                      <div style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: preset.primaryColor }} />
                    )}
                    <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                      {[preset.bgColor, preset.bgAltColor, preset.bgCardColor, preset.primaryColor, preset.textColor].map((c, i) => (
                        <div key={i} style={{ width: 14, height: 14, borderRadius: 2, background: c, border: '1px solid rgba(128,128,128,0.3)' }} />
                      ))}
                    </div>
                    <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.5rem', letterSpacing: '0.14em', color: preset.primaryColor, textTransform: 'uppercase', marginBottom: 2 }}>{preset.nome}</p>
                    <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.78rem', color: preset.textColor, opacity: 0.7, lineHeight: 1.3, margin: 0 }}>{preset.descrizione}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* COLORI MANUALI */}
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.48rem', letterSpacing: '0.2em', color: '#9a8a78', textTransform: 'uppercase', marginBottom: '1rem' }}>Personalizza colori →</p>
          <SettingsGrid>
            {([
              ['primaryColor', 'Colore primario (accento principale)'],
              ['bgColor', 'Sfondo principale'],
              ['bgAltColor', 'Sfondo sezioni alternate'],
              ['bgCardColor', 'Sfondo card / panel'],
              ['textColor', 'Testo principale'],
              ['textMutedColor', 'Testo secondario'],
              ['accentColor', 'Accento / bordi'],
            ] as const).map(([k, label]) => (
              <div key={k}>
                <label style={labelStyle}>{label}</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="color" value={local[k]} onChange={(e: React.ChangeEvent<HTMLInputElement>) => f(k)(e.target.value)} style={{ width: 40, height: 32, border: 'none', cursor: 'pointer', background: 'none' }} />
                  <input value={local[k]} onChange={(e: React.ChangeEvent<HTMLInputElement>) => f(k)(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                </div>
              </div>
            ))}
            <div>
              <label style={labelStyle}>Overlay immagini (rgba)</label>
              <input value={local.overlayColor || 'rgba(10,8,5,0.72)'} onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('overlayColor')(e.target.value)} style={inputStyle} placeholder="rgba(10,8,5,0.72)" />
            </div>
            <div>
              <label style={labelStyle}>Font display (titoli)</label>
              <select value={local.fontDisplay} onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('fontDisplay')(e.target.value)} style={inputStyle}>
                {['Fraunces', 'Playfair Display', 'Cinzel', 'Cormorant Garamond', 'EB Garamond', 'Libre Baskerville', 'Lora', 'Jost'].map(fn => <option key={fn} value={fn}>{fn}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Font etichette e pulsanti</label>
              <select value={local.fontLabel || 'Jost'} onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('fontLabel')(e.target.value)} style={inputStyle}>
                {['Jost', 'Cinzel', 'Cormorant Garamond', 'EB Garamond', 'Lora'].map(fn => <option key={fn} value={fn}>{fn}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Font body (testo)</label>
              <select value={local.fontBody} onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('fontBody')(e.target.value)} style={inputStyle}>
                {['Jost', 'Cormorant Garamond', 'EB Garamond', 'Lora', 'Libre Baskerville'].map(fn => <option key={fn} value={fn}>{fn}</option>)}
              </select>
            </div>
          </SettingsGrid>
          <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: local.bgColor, border: '1px solid rgba(201,168,76,0.2)' }}>
            <p style={{ fontFamily: local.fontDisplay + ', serif', color: local.primaryColor, fontSize: '0.6rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 8 }}>Anteprima tema</p>
            <p style={{ fontFamily: local.fontDisplay + ', serif', color: local.textColor, fontSize: '1.6rem', marginBottom: 8 }}>{local.siteName}</p>
            <p style={{ fontFamily: local.fontBody + ', serif', color: local.accentColor, fontSize: '1rem' }}>{local.slogan}</p>
          </div>
        </div>
      )}

      {subTab === 'funzionalita' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Toggle label="Mostra prezzi nel catalogo" checked={local.showPrezzi} onChange={v => f('showPrezzi')(v)} />
          <Toggle label="Pulsante WhatsApp flottante" checked={local.showWhatsApp} onChange={v => f('showWhatsApp')(v)} />
          <Toggle label="Cursore personalizzato" checked={local.showCursor} onChange={v => f('showCursor')(v)} />
          <Toggle label="Modalità manutenzione (nasconde il sito)" checked={local.maintenanceMode} onChange={v => f('maintenanceMode')(v)} />

          {/* Maintenance extra settings — shown when active */}
          {local.maintenanceMode && (
            <div style={{ marginLeft: '0.5rem', borderLeft: '2px solid rgba(201,168,76,0.25)', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={labelStyle}>📅 Fine manutenzione (data e ora)</label>
                <input
                  type="datetime-local"
                  value={local.maintenanceEndDate || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('maintenanceEndDate')(e.target.value)}
                  style={{ ...inputStyle, colorScheme: 'dark' }}
                />
                <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.8rem', color: '#6a5a4a', fontStyle: 'italic', margin: '0.3rem 0 0' }}>
                  Lascia vuoto per non mostrare il countdown. Allo scadere, la manutenzione si disattiva automaticamente.
                </p>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>💬 Messaggio per i visitatori</label>
                  <AiBtn loading={!!aiLoading.maint} onClick={aiGenerateMaintenance} label="✦ Scrivi con AI" />
                </div>
                <textarea
                  value={local.maintenanceMessage || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => f('maintenanceMessage')(e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }}
                  placeholder="Stiamo lavorando per migliorare la vostra esperienza..."
                />
              </div>
              <div>
                <label style={labelStyle}>🖼 Logo pagina di manutenzione (opzionale)</label>
                <SingleImageUpload
                  label=""
                  value={local.maintenanceLogoUrl || ''}
                  onChange={fImg('maintenanceLogoUrl')}
                  aspectRatio="1/1"
                />
                <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.8rem', color: '#6a5a4a', fontStyle: 'italic', margin: '-0.4rem 0 0' }}>
                  Se vuoto, viene usato il logo principale del sito.
                </p>
              </div>
              <div>
                <label style={labelStyle}>🖼 Immagine di sfondo (opzionale)</label>
                <SingleImageUpload
                  label=""
                  value={local.maintenanceBgImageUrl || ''}
                  onChange={fImg('maintenanceBgImageUrl')}
                  aspectRatio="9/16"
                />
                <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.8rem', color: '#6a5a4a', fontStyle: 'italic', margin: '-0.4rem 0 0' }}>
                  Se vuota, viene usato il colore di sfondo del tema attivo.
                </p>
              </div>
              <Toggle
                label="Mostra link Instagram nella pagina di manutenzione"
                checked={local.maintenanceShowInstagram ?? true}
                onChange={v => f('maintenanceShowInstagram')(v)}
              />
              <Toggle
                label="Mostra link Termini / Privacy / Cookie"
                checked={local.maintenanceShowLegal ?? true}
                onChange={v => f('maintenanceShowLegal')(v)}
              />
            </div>
          )}
          <div>
            <label style={labelStyle}>Oggetti per pagina nel catalogo</label>
            <input type="number" min={3} max={30} value={local.catalogPerPage} onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('catalogPerPage')(Number(e.target.value))} style={{ ...inputStyle, width: 100 }} />
          </div>
          <div>
            <label style={labelStyle}>Categorie attive nel catalogo</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              {CATEGORIES.map(cat => {
                const active = local.categorieAttive.includes(cat)
                return (
                  <button key={cat} onClick={() => f('categorieAttive')(active ? local.categorieAttive.filter(c => c !== cat) : [...local.categorieAttive, cat])} style={{ ...btnGhost, fontSize: '0.5rem', color: active ? '#c9a84c' : '#9a8a78', borderColor: active ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.15)' }}>
                    {cat}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {subTab === 'contatti' && (
        <SettingsGrid>
          <Field label="Email" value={local.email} onChange={f('email')} />
          <Field label="Telefono" value={local.telefono} onChange={f('telefono')} />
          <Field label="WhatsApp (solo numeri, es. 393756106713)" value={local.whatsapp} onChange={f('whatsapp')} />
          <Field label="Link catalogo WhatsApp (es. https://wa.me/c/39...)" value={local.whatsappCatalog || ''} onChange={f('whatsappCatalog')} />
          <Field label="Indirizzo" value={local.indirizzo} onChange={f('indirizzo')} />
          <Field label="Città / CAP" value={local.citta} onChange={f('citta')} />
          <Field label="Link Google Maps" value={local.mapsLink} onChange={f('mapsLink')} />
          <Field label="Embed Maps (iframe src)" value={local.mapsEmbed} onChange={f('mapsEmbed')} />
          <Field label="Instagram URL" value={local.instagram} onChange={f('instagram')} />
          <Field label="Instagram handle (es. @emporio46firenze)" value={local.instagramHandle} onChange={f('instagramHandle')} />
          <Field label="Titolare (appare nelle pagine legali)" value={local.titolare || ''} onChange={f('titolare')} />
          <Field label="P.IVA / partita IVA (appare nel footer)" value={local.pivaText || ''} onChange={f('pivaText')} />
          <Field label="Data revisione documenti legali (es. maggio 2026)" value={local.legalRevision || ''} onChange={f('legalRevision')} />
        </SettingsGrid>
      )}

      {subTab === 'emailjs' && (
        <div style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ ...cardStyle, borderColor: 'rgba(201,168,76,0.25)' }}>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#9a8a78', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.2rem' }}>
              Configura <strong style={{ color: '#c9a84c' }}>EmailJS</strong> per ricevere le richieste di contatto direttamente via email.
              Bastano 2 template (piano gratuito): uno per le notifiche al negozio (valido per tutte le schede) e uno opzionale di conferma al cliente.
            </p>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.46rem', letterSpacing: '0.15em', color: '#6a5a4a', marginBottom: 0 }}>
              → Registrati su <a href="https://www.emailjs.com" target="_blank" rel="noreferrer" style={{ color: '#c9a84c' }}>emailjs.com</a> · Account → API Keys per la Public Key · Email Services per il Service ID · Email Templates per i Template ID
            </p>
          </div>

          <EmailJsTools local={local} />

          <Toggle
            label="EmailJS attivo (se disattivo, i form aprono WhatsApp)"
            checked={local.emailjsEnabled ?? false}
            onChange={v => f('emailjsEnabled')(v)}
          />

          {(local.emailjsEnabled) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', borderLeft: '2px solid rgba(201,168,76,0.25)', paddingLeft: '1.2rem' }}>
              <div>
                <label style={labelStyle}>Service ID</label>
                <input
                  value={local.emailjsServiceId || ''}
                  onChange={(e) => f('emailjsServiceId')(e.target.value)}
                  style={inputStyle}
                  placeholder="es. service_abc123"
                />
                <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.78rem', color: '#6a5a4a', fontStyle: 'italic', marginTop: 4 }}>
                  Trova il Service ID in EmailJS → Email Services
                </p>
              </div>

              <div>
                <label style={labelStyle}>Public Key</label>
                <input
                  value={local.emailjsPublicKey || ''}
                  onChange={(e) => f('emailjsPublicKey')(e.target.value)}
                  style={inputStyle}
                  placeholder="es. AbCdEfGhIjKlMnOpQ"
                />
                <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.78rem', color: '#6a5a4a', fontStyle: 'italic', marginTop: 4 }}>
                  Trova la Public Key in EmailJS → Account → API Keys
                </p>
              </div>

              <div style={{ height: 1, background: 'rgba(201,168,76,0.1)' }} />
              <p style={{ ...labelStyle, color: '#c9a84c', marginBottom: -4 }}>TEMPLATE (max 2 — compatibile col piano gratuito)</p>

              <div>
                <label style={labelStyle}>Template ID — Notifica al negozio (tutte e 3 le schede)</label>
                <input
                  value={local.emailjsTemplateBook || ''}
                  onChange={(e) => f('emailjsTemplateBook')(e.target.value)}
                  style={inputStyle}
                  placeholder="es. template_negozio"
                />
                <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.78rem', color: '#6a5a4a', fontStyle: 'italic', marginTop: 4 }}>
                  Un solo template per Prenota, Cerca e Stima. Oggetto: <code style={{ color: '#9a8a78' }}>{'{{tipo}}'} — {'{{from_name}}'}</code> · Corpo: <code style={{ color: '#9a8a78' }}>{'{{riepilogo}}'}</code> (contiene solo i campi compilati). Reply To: <code style={{ color: '#9a8a78' }}>{'{{reply_to}}'}</code>. To Email: l'email del negozio.
                </p>
              </div>

              <div>
                <label style={labelStyle}>Template ID — Conferma al cliente (opzionale)</label>
                <input
                  value={local.emailjsTemplateClient || ''}
                  onChange={(e) => f('emailjsTemplateClient')(e.target.value)}
                  style={inputStyle}
                  placeholder="es. template_cliente (lascia vuoto per non inviarla)"
                />
                <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.78rem', color: '#6a5a4a', fontStyle: 'italic', marginTop: 4 }}>
                  Email automatica di ricevuta al cliente. Nel template EmailJS imposta <code style={{ color: '#9a8a78' }}>To Email = {'{{email}}'}</code>. Puoi usare <code style={{ color: '#9a8a78' }}>{'{{nome}}'}</code> e <code style={{ color: '#9a8a78' }}>{'{{riepilogo}}'}</code> nel testo.
                </p>
              </div>

              <div style={{ ...cardStyle, background: 'rgba(111,207,151,0.05)', borderColor: 'rgba(111,207,151,0.2)' }}>
                <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.46rem', letterSpacing: '0.15em', color: '#6fcf97', marginBottom: 6 }}>⚠ IMPORTANTE — ALLOWED ORIGINS</p>
                <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.82rem', color: '#9a8a78', lineHeight: 1.6 }}>
                  Aggiungi il dominio del sito (es. <em>nome-sito.netlify.app</em> e il dominio custom) in
                  EmailJS → Account → <strong style={{ color: '#f5ede0' }}>Allowed Origins</strong>, altrimenti le email non partono.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {subTab === 'password' && (
        <div style={{ maxWidth: 500, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <PasswordAdmin />
          <GroqKeyPanel onToast={showAiToast} />
        </div>
      )}

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={save} style={{ ...btnGold, background: saved ? '#6fcf97' : '#c9a84c' }}>
          {saved ? '✓ Applicato sulla landing' : 'Salva e applica'}
        </button>
      </div>
    </div>
  )
}

// ─── SEO Panel — writes directly to context via updateSeo ─────────────────────
function SEOAdmin() {
  const { seo, updateSeo } = useApp()
  const [local, setLocal] = useState<SeoData>({ ...seo })
  const [saved, setSaved] = useState(false)
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({})
  const [aiToast, setAiToast] = useState('')

  const showAiToast = (msg: string) => { setAiToast(msg); setTimeout(() => setAiToast(''), msg.startsWith('⚠') ? 7000 : 2500) }

  const save = () => {
    updateSeo(local)
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  const f = (k: keyof SeoData) => (v: string) => setLocal(p => ({ ...p, [k]: v }))

  // ── AI: genera meta tag SEO ─────────────────────────────────────────────
  const aiGenerateSeo = async () => {
    const name = local.schemaName || local.ogTitle || 'Negozio vintage'
    const address = local.schemaAddress || ''
    setAiLoading(p => ({ ...p, seo: true }))
    try {
      const result = await groqText(`Sei un esperto SEO per negozi italiani di arredi vintage e bijoux. Genera i meta tag ottimizzati per "${name}"${address ? ` a ${address}` : ''}.
Rispondi SOLO con un JSON valido, senza markdown:
{"metaTitle":"...","metaDesc":"...","keywords":"...","ogTitle":"...","ogDesc":"..."}

Regole:
- metaTitle: max 60 caratteri, include nome e città se disponibile, keyword principale
- metaDesc: max 160 caratteri, descrizione persuasiva con call to action
- keywords: 8-12 parole chiave separate da virgola (arredi vintage, bijoux, modernariato, ecc.)
- ogTitle: come metaTitle ma può essere leggermente più creativo
- ogDesc: come metaDesc, adatta per social media`)
      const cleaned = result.replace(/```json|```/g, '').trim()
      const parsed = extractJson(cleaned)
      if (parsed.metaTitle) setLocal(p => ({ ...p, metaTitle: parsed.metaTitle }))
      if (parsed.metaDesc) setLocal(p => ({ ...p, metaDesc: parsed.metaDesc }))
      if (parsed.keywords) setLocal(p => ({ ...p, keywords: parsed.keywords }))
      if (parsed.ogTitle) setLocal(p => ({ ...p, ogTitle: parsed.ogTitle }))
      if (parsed.ogDesc) setLocal(p => ({ ...p, ogDesc: parsed.ogDesc }))
      showAiToast('✦ Meta tag SEO generati con AI ✓')
    } catch (e) {
      showAiToast(aiErr(e))
    }
    setAiLoading(p => ({ ...p, seo: false }))
  }

  // ── AI: genera singolo campo SEO ────────────────────────────────────────
  const aiGenerateSeoField = async (field: 'metaTitle' | 'metaDesc' | 'keywords') => {
    const name = local.schemaName || local.ogTitle || 'Negozio vintage'
    const prompts: Record<string, string> = {
      metaTitle: `Scrivi un meta title SEO per il negozio "${name}". Max 60 caratteri, include nome attività e parola chiave principale. Rispondi SOLO con il testo, niente altro.`,
      metaDesc: `Scrivi una meta description SEO per il negozio "${name}". Max 160 caratteri, persuasiva con call to action. Rispondi SOLO con il testo.`,
      keywords: `Genera 10 keywords SEO per il negozio "${name}". Separate da virgola, mix di short e long-tail. Rispondi SOLO con le keyword separate da virgola.`,
    }
    setAiLoading(p => ({ ...p, [field]: true }))
    try {
      const result = await groqText(prompts[field])
      if (result) setLocal(p => ({ ...p, [field]: result.replace(/^["']+|["']+$/g, '').trim() }))
      showAiToast('✦ Campo generato con AI ✓')
    } catch (e) {
      showAiToast(aiErr(e))
    }
    setAiLoading(p => ({ ...p, [field]: false }))
  }

  const schemaJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': local.schemaType,
    name: local.schemaName,
    address: { '@type': 'PostalAddress', streetAddress: local.schemaAddress },
    telephone: local.schemaPhone,
    email: local.schemaEmail,
    openingHours: local.schemaOpeningHours,
    url: local.canonical,
  }, null, 2)

  return (
    <div>
      {aiToast && <div style={{ position: 'fixed', top: 80, right: 24, zIndex: 999999, maxWidth: 'calc(100vw - 48px)', lineHeight: 1.5, wordBreak: 'break-word', background: '#1c1510', border: '1px solid rgba(201,168,76,0.3)', padding: '0.8rem 1.4rem', fontFamily: 'Cinzel, serif', fontSize: '0.55rem', letterSpacing: '0.15em', color: '#6fcf97' }}>{aiToast}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h3 style={{ ...sectionTitle, marginBottom: 0 }}>SEO & Meta tag</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <AiBtn loading={!!aiLoading.seo} onClick={aiGenerateSeo} label="✦ Genera tutto con AI" />
          <button onClick={save} style={{ ...btnGold, background: saved ? '#6fcf97' : '#c9a84c' }}>
            {saved ? '✓ Applicato' : 'Salva e applica'}
          </button>
        </div>
      </div>
      <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#6fcf97', fontSize: '0.82rem', marginBottom: '1.5rem', fontStyle: 'italic' }}>
        ⚡ I meta tag vengono aggiornati in tempo reale sul documento HTML.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <p style={{ ...labelStyle, color: '#c9a84c', marginBottom: -6 }}>META TAG</p>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 }}>
              <label style={labelStyle}>Meta Title (max 60 car.)</label>
              <AiBtn loading={!!aiLoading.metaTitle} onClick={() => aiGenerateSeoField('metaTitle')} label="✦ AI" />
            </div>
            <input value={local.metaTitle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('metaTitle')(e.target.value)} style={inputStyle} />
          </div>
          <CharCount val={local.metaTitle} max={60} />
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 }}>
              <label style={labelStyle}>Meta Description (max 160 car.)</label>
              <AiBtn loading={!!aiLoading.metaDesc} onClick={() => aiGenerateSeoField('metaDesc')} label="✦ AI" />
            </div>
            <textarea value={local.metaDesc} onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('metaDesc')(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <CharCount val={local.metaDesc} max={160} />
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 }}>
              <label style={labelStyle}>Keywords (separate da virgola)</label>
              <AiBtn loading={!!aiLoading.keywords} onClick={() => aiGenerateSeoField('keywords')} label="✦ AI" />
            </div>
            <input value={local.keywords} onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('keywords')(e.target.value)} style={inputStyle} />
          </div>
          <Field label="URL Canonical" value={local.canonical} onChange={f('canonical')} />
          <div>
            <label style={labelStyle}>Robots</label>
            <select value={local.robots} onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('robots')(e.target.value)} style={inputStyle}>
              <option value="index, follow">index, follow (consigliato)</option>
              <option value="noindex, nofollow">noindex, nofollow</option>
              <option value="index, nofollow">index, nofollow</option>
              <option value="noindex, follow">noindex, follow</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <p style={{ ...labelStyle, color: '#c9a84c', marginBottom: -6 }}>OPEN GRAPH</p>
          <Field label="OG Title" value={local.ogTitle} onChange={f('ogTitle')} />
          <Field label="OG Description" value={local.ogDesc} onChange={f('ogDesc')} multiline />
          <Field label="OG Image URL (1200×630)" value={local.ogImage} onChange={f('ogImage')} />
          {local.ogImage && <img src={local.ogImage} alt="OG Preview" style={{ width: '100%', aspectRatio: '1200/630', objectFit: 'cover' }} />}
        </div>
      </div>

      <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ ...labelStyle, color: '#c9a84c', marginBottom: -6 }}>SCHEMA.ORG</p>
          <Field label="Tipo schema" value={local.schemaType} onChange={f('schemaType')} />
          <Field label="Nome attività" value={local.schemaName} onChange={f('schemaName')} />
          <Field label="Indirizzo" value={local.schemaAddress} onChange={f('schemaAddress')} />
          <Field label="Telefono" value={local.schemaPhone} onChange={f('schemaPhone')} />
          <Field label="Email" value={local.schemaEmail} onChange={f('schemaEmail')} />
          <Field label="Orari (formato schema.org)" value={local.schemaOpeningHours} onChange={f('schemaOpeningHours')} />
          <Field label="Google Analytics ID (es. G-XXXXXXXX)" value={local.gtagId} onChange={f('gtagId')} />
        </div>
        <div>
          <p style={{ ...labelStyle, color: '#c9a84c', marginBottom: 8 }}>ANTEPRIMA JSON-LD</p>
          <pre style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,168,76,0.1)', padding: '1rem', color: '#9a8a78', fontSize: '0.7rem', overflowX: 'auto', fontFamily: 'monospace', lineHeight: 1.6, maxHeight: 300, overflowY: 'auto' }}>{schemaJson}</pre>
        </div>
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={save} style={{ ...btnGold, background: saved ? '#6fcf97' : '#c9a84c' }}>
          {saved ? '✓ Applicato' : 'Salva e applica'}
        </button>
      </div>
    </div>
  )
}

// ─── Orari — writes via updateSettings ───────────────────────────────────────
function OrariAdmin() {
  const { settings, updateSettings } = useApp()
  const [orari, setOrari] = useState<SiteSettings['orari']>({ ...settings.orari })
  const [saved, setSaved] = useState(false)

  // Keep in sync if settings change externally
  useEffect(() => { setOrari(o => ({ ...o, ...settings.orari })) }, [settings.orari])

  const save = () => {
    updateSettings({ orari })
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  // Live update on every keystroke
  const setOrariLive = (updater: (p: SiteSettings['orari']) => SiteSettings['orari']) => {
    setOrari(prev => {
      const next = updater(prev)
      updateSettings({ orari: next })
      return next
    })
  }

  const GIORNI: { key: keyof typeof orari; label: string }[] = [
    { key: 'lun', label: 'Lunedì' }, { key: 'mar', label: 'Martedì' }, { key: 'mer', label: 'Mercoledì' },
    { key: 'gio', label: 'Giovedì' }, { key: 'ven', label: 'Venerdì' }, { key: 'sab', label: 'Sabato' }, { key: 'dom', label: 'Domenica' },
  ]

  return (
    <div style={{ maxWidth: 620 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h3 style={{ ...sectionTitle, marginBottom: 0 }}>Orari di apertura</h3>
        <button onClick={save} style={{ ...btnGold, background: saved ? '#6fcf97' : '#c9a84c' }}>
          {saved ? '✓ Applicato' : 'Salva e applica'}
        </button>
      </div>
      <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#6fcf97', fontSize: '0.82rem', marginBottom: '1.5rem', fontStyle: 'italic' }}>
        ⚡ Gli orari vengono aggiornati in tempo reale nella sezione "Dove siamo" della landing page.
      </p>
      <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#9a8a78', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
        Inserisci in forma libera, es. "09:00–19:30" oppure "Solo su appuntamento" oppure "Chiuso".
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {GIORNI.map(({ key, label }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.55rem', letterSpacing: '0.15em', color: '#c9a84c', width: 80, textTransform: 'uppercase', flexShrink: 0 }}>{label}</span>
            <input value={orari[key]} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrariLive(p => ({ ...p, [key]: e.target.value }))} style={{ ...inputStyle }} placeholder="es. 09:00–19:30 o Chiuso" />
            <button onClick={() => setOrariLive(p => ({ ...p, [key]: 'Chiuso' }))} style={{ ...btnGhost, fontSize: '0.45rem', padding: '0.4rem 0.8rem', flexShrink: 0 }}>Chiuso</button>
            <button onClick={() => setOrariLive(p => ({ ...p, [key]: 'Solo su appuntamento' }))} style={{ ...btnGhost, fontSize: '0.45rem', padding: '0.4rem 0.8rem', flexShrink: 0 }}>Appt.</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Media Library ────────────────────────────────────────────────────────────
function MediaAdmin() {
  // ── Tipi ─────────────────────────────────────────────────────────────────
  type MsgRole = 'user' | 'ai'
  type ChatMsg = { role: MsgRole; text: string; ts: number }
  type MediaItem = {
    id: number
    src: string
    name: string
    size: string
    chat: ChatMsg[]
    loading: boolean
  }

  // ── State ─────────────────────────────────────────────────────────────────
  const [items, setItems] = useState<MediaItem[]>(() => {
    try {
      const s = localStorage.getItem('mnt_media_v2')
      if (!s) return []
      const parsed = JSON.parse(s)
      // Ripristina senza src (troppo pesante in localStorage) — solo metadati + chat
      return parsed.map((it: MediaItem) => ({ ...it, src: '', loading: false }))
    } catch { return [] }
  })
  // src in memoria separata (non persistita) per non riempire localStorage
  const [srcs, setSrcs] = useState<Record<number, string>>({})
  const [activeId, setActiveId] = useState<number | null>(null)
  const [prompt, setPrompt] = useState('')
  const [sending, setSending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const activeItem = items.find(i => i.id === activeId) ?? null
  const activeSrc = activeId ? (srcs[activeId] ?? '') : ''

  // Scroll chat in fondo ad ogni nuovo messaggio
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeItem?.chat?.length, activeItem?.loading])

  // ── Persist metadati (senza src) ──────────────────────────────────────────
  const persist = (next: MediaItem[]) => {
    setItems(next)
    try {
      const slim = next.map(({ src: _s, loading: _l, ...rest }) => rest)
      localStorage.setItem('mnt_media_v2', JSON.stringify(slim))
    } catch {}
  }

  // ── Carica nuove immagini ─────────────────────────────────────────────────
  const addFiles = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach(async file => {
      let src: string
      try { src = await compressImage(file, 1400, 1000, 0.80) }
      catch {
        src = await new Promise<string>(res => {
          const r = new FileReader(); r.onload = e => res(e.target?.result as string); r.readAsDataURL(file)
        })
      }
      const id = Date.now() + Math.random()
      const sizeKB = (file.size / 1024).toFixed(0) + ' KB'
      const newItem: MediaItem = { id, src: '', name: file.name, size: sizeKB, chat: [], loading: true }
      setSrcs(prev => ({ ...prev, [id]: src }))
      persist([...items, newItem])
      setActiveId(id)
      // Analisi AI automatica all'upload
      analyzeImage(id, src, [...items, newItem])
    })
  }

  // ── Analisi iniziale AI ───────────────────────────────────────────────────
  const analyzeImage = async (id: number, src: string, currentItems: MediaItem[]) => {
    const systemPrompt = `Sei un esperto italiano di vintage e modernariato. Analizza questa immagine con il massimo dettaglio possibile e fornisci una scheda tecnica completa. Rispondi in italiano, con tono professionale ed elegante.

Struttura la risposta in questo ordine:
1. **Identificazione oggetto** — cosa è, tipologia, funzione originale
2. **Epoca & stile** — datazione stimata (range di anni o decennio), movimento artistico o stilistico di riferimento
3. **Materiali & tecnica** — materiali visibili, finiture, tecniche produttive
4. **Stato di conservazione** — valutazione visiva (ottimo / buono / discreto / da restaurare) con osservazioni specifiche
5. **Elementi distintivi** — dettagli notevoli, firme, marchi, particolarità
6. **Stima di valore** — fascia di prezzo realistica per il mercato vintage italiano attuale (formato: € X.XXX – € Y.YYY, oppure "Su richiesta per pezzi di questa rarità")
7. **Note commerciali** — suggerimento su come valorizzare o presentare il pezzo

Sii preciso e dettagliato. Se alcuni aspetti non sono determinabili dall'immagine, indicalo onestamente.`

    const aiMsg: ChatMsg = { role: 'ai', text: '', ts: Date.now() }
    // Aggiorna stato: loading true, chat vuota per ora
    const withLoading = currentItems.map(it => it.id === id ? { ...it, loading: true, chat: [] } : it)
    setItems(withLoading)

    try {
      const raw = await groqVision(src, systemPrompt)
      const aiText = raw.trim()
      aiMsg.text = aiText
      const finalItems = withLoading.map(it =>
        it.id === id ? { ...it, loading: false, chat: [{ ...aiMsg }] } : it
      )
      persist(finalItems)
    } catch (err: unknown) {
      aiMsg.text = `⚠ Errore analisi AI: ${err instanceof Error ? err.message : String(err)}`
      const finalItems = withLoading.map(it =>
        it.id === id ? { ...it, loading: false, chat: [{ ...aiMsg }] } : it
      )
      persist(finalItems)
    }
  }

  // ── Invia messaggio di correzione/domanda ─────────────────────────────────
  const sendMessage = async () => {
    if (!prompt.trim() || !activeItem || !activeSrc || sending) return
    setSending(true)

    const userMsg: ChatMsg = { role: 'user', text: prompt.trim(), ts: Date.now() }
    const updatedChat = [...(activeItem.chat ?? []), userMsg]
    const withUser = items.map(it => it.id === activeId ? { ...it, chat: updatedChat, loading: true } : it)
    persist(withUser)
    setPrompt('')

    // Costruisce la conversazione per Groq (history)
    const historyText = (activeItem.chat ?? [])
      .map(m => `${m.role === 'user' ? 'Admin' : 'AI Perito'}: ${m.text}`)
      .join('\n\n')

    const fullPrompt = `Sei un esperto italiano di vintage e modernariato. Stai analizzando un oggetto vintage o d'epoca in una conversazione con l'amministratore del negozio.

ANALISI PRECEDENTE E CONVERSAZIONE:
${historyText}

Admin: ${userMsg.text}

Rispondi in modo preciso e professionale, tenendo conto delle correzioni o informazioni aggiuntive fornite dall'admin. Se l'admin ti fornisce nuove informazioni (es. "in realtà è argento", "è del 1920", "proviene da una casa di Firenze"), aggiorna la tua analisi di conseguenza e rivaluta la stima. Rispondi solo come AI Perito (non riscrivere l'intero storico).`

    try {
      const raw = await groqVision(activeSrc, fullPrompt)
      const aiText = raw.trim()
      const aiMsg: ChatMsg = { role: 'ai', text: aiText, ts: Date.now() }
      const finalChat = [...updatedChat, aiMsg]
      const finalItems = withUser.map(it => it.id === activeId ? { ...it, loading: false, chat: finalChat } : it)
      persist(finalItems)
    } catch (e) {
      const errMsg: ChatMsg = { role: 'ai', text: aiErr(e), ts: Date.now() }
      const finalItems = withUser.map(it => it.id === activeId ? { ...it, loading: false, chat: [...updatedChat, errMsg] } : it)
      persist(finalItems)
    }
    setSending(false)
  }

  const removeItem = (id: number) => {
    const next = items.filter(i => i.id !== id)
    persist(next)
    setSrcs(prev => { const n = { ...prev }; delete n[id]; return n })
    if (activeId === id) setActiveId(next[0]?.id ?? null)
  }

  const reanalyze = () => {
    if (!activeItem || !activeSrc) return
    analyzeImage(activeItem.id, activeSrc, items)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const loading = activeItem?.loading ?? false
  const isMobile = window.innerWidth < 768

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1rem', height: isMobile ? 'auto' : 'calc(100vh - 120px)', minHeight: isMobile ? 'unset' : 500 }}>

      {/* ── Colonna sinistra: lista immagini ── */}
      <div style={{ width: isMobile ? '100%' : 200, flexShrink: 0, display: 'flex', flexDirection: isMobile ? 'row' : 'column', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: isMobile ? 8 : 0, alignItems: isMobile ? 'flex-start' : 'stretch' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.48rem', letterSpacing: '0.2em', color: '#c9a84c', textTransform: 'uppercase' }}>Immagini ({items.length})</span>
          <button onClick={() => inputRef.current?.click()} style={{ ...btnGold, fontSize: '0.42rem', padding: '0.35rem 0.7rem' }}>+ Carica</button>
          <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => addFiles(e.target.files)} />
        </div>

        <div style={{ flex: 1, overflowY: isMobile ? 'hidden' : 'auto', overflowX: isMobile ? 'auto' : 'hidden', display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: 4 }}>
          {items.length === 0 && (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '1.5rem 0.75rem' }}>
              <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#6a5a4a', fontSize: '0.85rem', fontStyle: 'italic' }}>Carica un'immagine per iniziare l'analisi AI</p>
            </div>
          )}
          {items.map(item => {
            const src = srcs[item.id] ?? ''
            const isActive = item.id === activeId
            return (
              <div
                key={item.id}
                onClick={() => setActiveId(item.id)}
                style={{ position: 'relative', cursor: 'pointer', flexShrink: 0, width: isMobile ? 110 : '100%', border: `1px solid ${isActive ? 'rgba(201,168,76,0.6)' : 'rgba(201,168,76,0.1)'}`, background: isActive ? 'rgba(201,168,76,0.06)' : 'transparent', transition: 'all 0.2s', overflow: 'hidden' }}
              >
                {src
                  ? <img src={src} alt={item.name} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
                  : <div style={{ width: '100%', aspectRatio: '4/3', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: '#6a5a4a', fontSize: '1.2rem' }}>🖼</span>
                    </div>
                }
                <div style={{ padding: '0.4rem 0.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.38rem', color: '#9a8a78', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{item.name}</span>
                  {item.loading && <span style={{ color: '#c9a84c', fontSize: '0.6rem', marginLeft: 4, flexShrink: 0 }}>◌</span>}
                  {!item.loading && item.chat.length > 0 && <span style={{ color: '#6fcf97', fontSize: '0.5rem', marginLeft: 4, flexShrink: 0 }}>✦</span>}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); removeItem(item.id) }}
                  style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(8,6,4,0.75)', border: 'none', color: '#eb5757', width: 18, height: 18, cursor: 'pointer', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >✕</button>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Area principale: immagine + chat ── */}
      {activeItem ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '1rem' : '1.5rem', minWidth: 0 }}>

          {/* Immagine + controlli */}
          <div style={{ width: isMobile ? '100%' : 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activeSrc
              ? <img src={activeSrc} alt={activeItem.name} style={{ width: '100%', border: '1px solid rgba(201,168,76,0.2)', objectFit: 'contain', maxHeight: 320, background: '#0a0805' }} />
              : <div style={{ width: '100%', height: 240, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,168,76,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#6a5a4a', fontFamily: 'Cormorant Garamond, serif', fontSize: '0.9rem', fontStyle: 'italic' }}>Immagine non in memoria</span>
                </div>
            }
            <div style={{ ...cardStyle, padding: '0.75rem' }}>
              <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.42rem', letterSpacing: '0.15em', color: '#c9a84c', marginBottom: 4 }}>DETTAGLI FILE</p>
              <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#9a8a78', fontSize: '0.82rem', wordBreak: 'break-all', marginBottom: 2 }}>{activeItem.name}</p>
              <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#6a5a4a', fontSize: '0.78rem' }}>{activeItem.size}</p>
            </div>
            {activeSrc && (
              <button onClick={reanalyze} disabled={loading} style={{ ...btnGhost, fontSize: '0.44rem', padding: '0.4rem 0.8rem', color: '#c9a84c', borderColor: 'rgba(201,168,76,0.3)', opacity: loading ? 0.5 : 1 }}>
                ↺ Ri-analizza da capo
              </button>
            )}
          </div>

          {/* Chat */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: isMobile ? 400 : 'unset', border: '1px solid rgba(201,168,76,0.12)', background: '#0d0a07' }}>
            {/* Header chat */}
            <div style={{ padding: '0.8rem 1.2rem', borderBottom: '1px solid rgba(201,168,76,0.1)', display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
              <span style={{ color: '#6fcf97', fontSize: '0.8rem' }}>✦</span>
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.48rem', letterSpacing: '0.2em', color: '#c9a84c', textTransform: 'uppercase' }}>Perizia AI · Groq Vision</span>
              {loading && <span style={{ fontFamily: 'Cormorant Garamond, serif', color: '#6fcf97', fontSize: '0.82rem', fontStyle: 'italic', marginLeft: 'auto' }}>Analisi in corso…</span>}
            </div>

            {/* Messaggi */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activeItem.chat.length === 0 && !loading && (
                <div style={{ margin: 'auto', textAlign: 'center', padding: '2rem' }}>
                  <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#6a5a4a', fontSize: '0.9rem', fontStyle: 'italic' }}>
                    {activeSrc ? 'Premi "Ri-analizza da capo" per avviare la perizia AI.' : 'Immagine non in memoria — ricarica il file per abilitare l\'analisi.'}
                  </p>
                </div>
              )}

              {activeItem.chat.map((msg, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%' }}>
                  <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.38rem', letterSpacing: '0.15em', color: msg.role === 'user' ? '#c9a84c' : '#6fcf97', marginBottom: 4, textTransform: 'uppercase' }}>
                    {msg.role === 'user' ? 'Admin' : '✦ Perito AI'}
                  </span>
                  <div style={{
                    background: msg.role === 'user' ? 'rgba(201,168,76,0.08)' : 'rgba(111,207,151,0.05)',
                    border: `1px solid ${msg.role === 'user' ? 'rgba(201,168,76,0.2)' : 'rgba(111,207,151,0.15)'}`,
                    padding: '0.8rem 1rem',
                    fontFamily: 'Cormorant Garamond, serif',
                    fontSize: '0.9rem',
                    color: '#f5ede0',
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {/* Render grassetto markdown **testo** */}
                    {msg.text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
                      part.startsWith('**') && part.endsWith('**')
                        ? <strong key={i} style={{ color: '#c9a84c', fontWeight: 700 }}>{part.slice(2, -2)}</strong>
                        : <span key={i}>{part}</span>
                    )}
                  </div>
                </div>
              ))}

              {/* Indicatore loading */}
              {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', alignSelf: 'flex-start', maxWidth: '88%' }}>
                  <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.38rem', letterSpacing: '0.15em', color: '#6fcf97', marginBottom: 4, textTransform: 'uppercase' }}>✦ Perito AI</span>
                  <div style={{ background: 'rgba(111,207,151,0.05)', border: '1px solid rgba(111,207,151,0.15)', padding: '0.8rem 1rem', display: 'flex', gap: 5, alignItems: 'center' }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#6fcf97', opacity: 0.5, animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }} />
                    ))}
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '0.75rem', borderTop: '1px solid rgba(201,168,76,0.1)', display: 'flex', gap: '0.6rem', flexShrink: 0 }}>
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                disabled={sending || loading}
                placeholder="Es. In realtà è bronzo dorato, non ottone… — oppure: dammi una stima più precisa considerando che è firmato"
                rows={2}
                style={{ ...inputStyle, flex: 1, resize: 'none', fontSize: '0.88rem', lineHeight: 1.5, opacity: (sending || loading) ? 0.6 : 1 }}
              />
              <button
                onClick={sendMessage}
                disabled={!prompt.trim() || sending || loading}
                style={{ ...btnGold, padding: '0.5rem 1rem', opacity: (!prompt.trim() || sending || loading) ? 0.4 : 1, flexShrink: 0, fontSize: '0.5rem' }}
              >
                {sending ? '…' : '↑ Invia'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: 'Playfair Display, serif', color: '#6a5a4a', fontSize: '1.3rem', marginBottom: '0.75rem' }}>✦ Perizia AI</p>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#4a3a2a', fontSize: '0.95rem', fontStyle: 'italic', maxWidth: 360 }}>
              Carica un'immagine di un oggetto vintage o d'epoca. Groq Vision lo analizzerà automaticamente — epoca, materiali, qualità, stima di prezzo. Puoi poi correggere o approfondire in chat.
            </p>
            <button onClick={() => inputRef.current?.click()} style={{ ...btnGold, marginTop: '1.5rem' }}>+ Carica prima immagine</button>
          </div>
        </div>
      )}

      {/* Stile animazione bounce per i dot di loading */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}


// ─── Analytics ────────────────────────────────────────────────────────────────
function AnalyticsAdmin({ catalog, reviews }: { catalog: CatalogItem[]; reviews: Recensione[] }) {
  const byCategoria = CATEGORIES.map(cat => ({ cat, count: catalog.filter(c => c.categoria === cat).length })).filter(x => x.count > 0).sort((a, b) => b.count - a.count)
  const byStato = STATI.map(s => ({ stato: s, count: catalog.filter(c => c.stato === s).length }))
  const avgStelle = reviews.length ? (reviews.reduce((a, r) => a + r.stelle, 0) / reviews.length).toFixed(1) : 'N/A'

  return (
    <div>
      <h3 style={sectionTitle}>Statistiche & Analisi</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: '2rem' }}>
        {[
          { label: 'Oggetti in catalogo', value: catalog.length, color: '#c9a84c' },
          { label: 'Oggetti visibili', value: catalog.filter(c => c.visibile).length, color: '#6fcf97' },
          { label: 'Recensioni totali', value: reviews.length, color: '#a8d8f0' },
          { label: 'Stelle medie', value: avgStelle, color: '#f2994a' },
          { label: 'Nascosti', value: reviews.filter(r => !r.visibile).length, color: '#eb5757' },
          { label: 'Categorie usate', value: byCategoria.length, color: '#9a8a78' },
        ].map(s => (
          <div key={s.label} style={{ ...cardStyle, textAlign: 'center' }}>
            <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '2rem', color: s.color, lineHeight: 1, marginBottom: 4 }}>{s.value}</p>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.45rem', letterSpacing: '0.15em', color: '#9a8a78', textTransform: 'uppercase' }}>{s.label}</p>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div>
          <p style={{ ...labelStyle, color: '#c9a84c', marginBottom: 12 }}>PER CATEGORIA</p>
          {byCategoria.map(({ cat, count }) => (
            <div key={cat} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.5rem', color: '#9a8a78', textTransform: 'uppercase' }}>{cat}</span>
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.5rem', color: '#c9a84c' }}>{count}</span>
              </div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.05)' }}>
                <div style={{ height: '100%', width: `${(count / catalog.length) * 100}%`, background: '#c9a84c', transition: 'width 0.6s' }} />
              </div>
            </div>
          ))}
        </div>
        <div>
          <p style={{ ...labelStyle, color: '#c9a84c', marginBottom: 12 }}>PER STATO</p>
          {byStato.map(({ stato, count }) => (
            <div key={stato} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.5rem', color: '#9a8a78', textTransform: 'uppercase' }}>{stato.replace('_', ' ')}</span>
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.5rem', color: STATO_COLOR[stato] }}>{count}</span>
              </div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.05)' }}>
                <div style={{ height: '100%', width: catalog.length ? `${(count / catalog.length) * 100}%` : '0%', background: STATO_COLOR[stato], transition: 'width 0.6s' }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop: '2rem' }}>
            <p style={{ ...labelStyle, color: '#c9a84c', marginBottom: 12 }}>DISTRIBUZIONE STELLE</p>
            {[5, 4, 3, 2, 1].map(n => {
              const count = reviews.filter(r => r.stelle === n).length
              return (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.5rem', color: '#c9a84c', width: 55 }}>{'★'.repeat(n)}</span>
                  <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.05)' }}>
                    <div style={{ height: '100%', width: reviews.length ? `${(count / reviews.length) * 100}%` : '0%', background: '#c9a84c', transition: 'width 0.6s' }} />
                  </div>
                  <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.5rem', color: '#9a8a78', width: 16, textAlign: 'right' }}>{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Catalog Admin ────────────────────────────────────────────────────────────
function CatalogAdmin() {
  const { catalog, setCatalog, settings } = useApp()
  const [editing, setEditing] = useState<CatalogItem | null>(null)
  const [form, setForm] = useState<Partial<CatalogItem & { images: string[] }>>({})
  const [bulkTranslating, setBulkTranslating] = useState(false)
  const [bulkKind, setBulkKind] = useState<'tr' | 'desc'>('tr')
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number; current: string } | null>(null)
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({})
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, string> | null>(null)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('tutti')
  const [filterStato, setFilterStato] = useState('tutti')
  const [sortBy, setSortBy] = useState<'nome' | 'era' | 'stato' | 'id'>('id')
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), msg.startsWith('⚠') ? 7000 : 2500) }

  const startEdit = (item: CatalogItem) => {
    setEditing(item)
    const imgs = item.images?.length ? item.images : (item.img ? [item.img] : [])
    setForm({ ...item, images: imgs })
  }

  const startNew = () => {
    const n: CatalogItem = { id: Date.now(), nome: '', era: '', categoria: 'altro', descrizione: '', prezzo: 'Su richiesta', stato: 'disponibile', badge: 'Disponibile', img: '', visibile: true }
    setEditing(n)
    setForm({ ...n, images: [] })
    setAiSuggestions(null)
  }

  // ── AI: analizza immagine e compila i campi (solo su richiesta esplicita) ──
  const aiAnalyzeImage = async (src: string) => {
    setAiLoading(p => ({ ...p, image: true }))
    try {
      const prompt = `Sei un esperto di vintage e modernariato italiano. Analizza questa immagine di un oggetto vintage o d'epoca e rispondi SOLO con un JSON valido (niente altro testo) con questi campi:
{
  "nome": "nome preciso e commerciale dell'oggetto in italiano (es. 'Orologio da tavolo Art Déco in ottone dorato')",
  "era": "periodo storico preciso (es. 'Fine '800 - Inizio '900', 'Primo Novecento', 'Art Déco anni '30')",
  "categoria": "una tra: mobili|lampade|bijoux|specchi|cornici|complementi|ceramiche|modernariato|altro",
  "descrizione": "descrizione commerciale accattivante di 2-3 frasi per un negozio di arredi vintage e bijoux, in italiano elegante",
  "badge": "etichetta breve (es. 'Disponibile', 'Pezzo raro', 'In vetrina', 'Ottimo stato')",
  "prezzo_suggerito": "fascia di prezzo realistica in formato '€ X.XXX' o 'Su richiesta' se incerto"
}`
      const parsed = await groqVisionJson<any>(src, prompt)
      setAiSuggestions(parsed)
      // Sovrascrive tutti i campi con i valori AI (l'admin può modificarli dopo)
      setForm(prev => ({
        ...prev,
        nome: parsed.nome || prev.nome,
        era: parsed.era || prev.era,
        categoria: parsed.categoria ? normCat(parsed.categoria, (prev.categoria as string) || 'altro') : prev.categoria,
        descrizione: parsed.descrizione || prev.descrizione,
        badge: parsed.badge || prev.badge,
        // non sovrascrive un prezzo già inserito a mano
        prezzo: (!prev.prezzo || /su richiesta/i.test(String(prev.prezzo))) ? (parsed.prezzo_suggerito || prev.prezzo) : prev.prezzo,
      }))
      showToast(`✦ AI ha analizzato l'immagine — campi compilati ✓`)
    } catch (e) {
      showToast(aiErr(e))
    }
    setAiLoading(p => ({ ...p, image: false }))
  }

  // ── Avvia analisi AI sulle immagini caricate (chiamata dal pulsante) ───────
  const handleAiAnalyzeClick = () => {
    const imgs = (form.images as string[]) ?? []
    if (imgs.length === 0) { showToast(`⚠ Carica almeno un'immagine prima di usare l'AI`); return }
    aiAnalyzeImage(imgs[0])
  }

  // ── AI: migliora descrizione esistente ────────────────────────────────────
  const aiImproveDescription = async () => {
    const nome = (form.nome as string) || ''
    const era = (form.era as string) || ''
    const cat = (form.categoria as string) || ''
    const desc = (form.descrizione as string) || ''
    const imgs = (form.images as string[]) ?? []
    if (!nome && !desc && imgs.length === 0) { showToast('Inserisci nome o descrizione, oppure carica una foto'); return }
    setAiLoading(p => ({ ...p, desc: true }))
    try {
      let result: string
      if (imgs.length > 0) {
        // Usa vision se c'è la foto
        const ctx = [nome && `Nome: ${nome}`, era && `Periodo: ${era}`, cat && `Categoria: ${cat}`, desc && `Descrizione attuale: ${desc}`].filter(Boolean).join(', ')
        result = await groqVision(imgs[0], `Sei un esperto negozio vintage. ${ctx ? `Informazioni sull'oggetto: ${ctx}. ` : ''}Guarda la foto e scrivi una descrizione commerciale elegante e accattivante. Rispondi con SOLO la descrizione migliorata (2-3 frasi, max 250 caratteri, in italiano elegante), senza spiegazioni.`)
      } else {
        result = await groqText(`Sei un esperto negozio vintage. Scrivi una descrizione commerciale elegante e accattivante per questo oggetto vintage o d'epoca:
- Nome: ${nome || '(non specificato)'}
- Periodo: ${era || '(non specificato)'}
- Categoria: ${cat}
- Descrizione attuale: ${desc || '(vuota)'}

Rispondi con SOLO la descrizione migliorata (2-3 frasi, max 250 caratteri, in italiano elegante), senza spiegazioni.`)
      }
      if (result) f('descrizione')(result.replace(/^["']+|["']+$/g, '').trim())
      showToast('✦ Descrizione migliorata con AI ✓')
    } catch (e: any) {
      showToast(aiErr(e))
    }
    setAiLoading(p => ({ ...p, desc: false }))
  }

  // ── AI: suggerisci prezzo ─────────────────────────────────────────────────
  const aiSuggestPrice = async () => {
    const nome = (form.nome as string) || ''
    const era = (form.era as string) || ''
    const cat = (form.categoria as string) || ''
    if (!nome) { showToast('Inserisci il nome oggetto prima'); return }
    setAiLoading(p => ({ ...p, price: true }))
    try {
      const result = await groqText(`Sei un esperto di vintage italiano. Per l'oggetto "${nome}" (${era}, categoria: ${cat}), suggerisci una fascia di prezzo realistica per il mercato vintage italiano attuale.
Rispondi con SOLO il prezzo suggerito in formato "€ X.XXX" oppure "€ X.XXX – € Y.XXX" se è una fascia, senza alcun testo aggiuntivo.`)
      if (result) f('prezzo')(result.replace(/^['"]+|['"]+$/g, '').trim())
      showToast('✦ Prezzo suggerito da AI ✓')
    } catch (e) {
      showToast(aiErr(e))
    }
    setAiLoading(p => ({ ...p, price: false }))
  }

  // ── AI: traduci nome e descrizione in inglese ─────────────────────────────
  const aiTranslate = async () => {
    const nome = (form.nome as string) || ''
    const desc = (form.descrizione as string) || ''
    if (!nome && !desc) { showToast('Inserisci nome e/o descrizione prima di tradurre'); return }
    setAiLoading(p => ({ ...p, translate: true }))
    try {
      const result = await groqText(`Sei un traduttore specializzato in arredi vintage e bijoux italiani. Traduci in inglese elegante i seguenti testi per una pagina web di un negozio di arredi vintage e bijoux.
Rispondi SOLO con un JSON valido, senza markdown, in questo formato esatto:
{"nomeEn":"...","descrizioneEn":"..."}

Nome italiano: ${nome || '(vuoto)'}
Descrizione italiana: ${desc || '(vuota)'}

Regole:
- Tono raffinato, adatto a collezionisti anglofoni
- Mantieni i termini tecnici del settore (es. "marquetry", "gilt bronze", "cartouche")
- Se il nome è già in italiano/latino (es. "Barocco"), mantienilo ma aggiungi la traduzione concettuale
- Max 200 caratteri per descrizioneEn`)
      const cleaned = result.replace(/```json|```/g, '').trim()
      const parsed = extractJson(cleaned)
      if (parsed.nomeEn) f('nomeEn')(parsed.nomeEn)
      if (parsed.descrizioneEn) f('descrizioneEn')(parsed.descrizioneEn)
      showToast('✦ Traduzione EN completata ✓')
    } catch (e) {
      showToast(aiErr(e))
    }
    setAiLoading(p => ({ ...p, translate: false }))
  }

  // ── AI: genera descrizione/nome dalla FOTO con vision ─────────────────────
  const aiDescribeFromPhoto = async () => {
    const imgs = (form.images as string[]) ?? []
    if (imgs.length === 0) { showToast('⚠ Carica almeno una foto prima'); return }
    setAiLoading(p => ({ ...p, desc: true }))
    try {
      const nome = (form.nome as string) || ''
      const extra = nome ? `L'oggetto si chiama "${nome}". ` : ''
      const result = await groqVision(imgs[0], `${extra}Sei un esperto negozio vintage con 30 anni di esperienza. Guarda questa foto e scrivi una descrizione commerciale elegante per un'negozio vintage. Rispondi SOLO con la descrizione (2-4 frasi, max 300 caratteri, in italiano raffinato), niente altro testo.`)
      if (result) f('descrizione')(result.replace(/^["']+|["']+$/g, '').trim())
      showToast('✦ Descrizione generata dalla foto ✓')
    } catch (e: any) {
      showToast(aiErr(e))
    }
    setAiLoading(p => ({ ...p, desc: false }))
  }

  // ── Bulk translate: traduce tutti gli articoli senza EN con Groq ────────────
  const bulkTranslateAll = async () => {
    const toTranslate = catalog.filter(c => !c.nomeEn || !c.descrizioneEn)
    if (toTranslate.length === 0) { showToast('✦ Tutti gli articoli hanno già la traduzione EN ✓'); return }
    if (!confirm(`Tradurre ${toTranslate.length} articoli in inglese con AI? L'operazione richiede alcuni secondi.`)) return
    setBulkTranslating(true)
    setBulkProgress({ done: 0, total: toTranslate.length, current: '' })
    let updatedCatalog = [...catalog]
    let okCount = 0, failCount = 0, fatal = ''
    for (let i = 0; i < toTranslate.length; i++) {
      const item = toTranslate[i]
      setBulkProgress({ done: i, total: toTranslate.length, current: item.nome })
      try {
        const result = await groqText(`Sei un traduttore specializzato in arredi vintage e bijoux italiani. Traduci in inglese elegante i seguenti testi per una pagina web di un negozio di arredi vintage e bijoux.
Rispondi SOLO con un JSON valido, senza markdown, in questo formato esatto:
{"nomeEn":"...","descrizioneEn":"..."}

Nome italiano: ${item.nome || '(vuoto)'}
Descrizione italiana: ${item.descrizione || '(vuota)'}

Regole:
- Tono raffinato, adatto a collezionisti anglofoni
- Mantieni i termini tecnici del settore (es. "marquetry", "gilt bronze", "cartouche")
- Se il nome è già in italiano/latino (es. "Barocco"), mantienilo ma aggiungi la traduzione concettuale
- Max 200 caratteri per descrizioneEn`, 400)
        const cleaned = (result.match(/\{[\s\S]*\}/)?.[0] ?? result).replace(/```json|```/g, '').trim()
        const parsed = extractJson(cleaned)
        updatedCatalog = updatedCatalog.map(c => c.id === item.id
          ? { ...c, nomeEn: parsed.nomeEn || c.nomeEn || c.nome, descrizioneEn: parsed.descrizioneEn || c.descrizioneEn || c.descrizione }
          : c)
        // Save incrementally
        setCatalog(updatedCatalog)
        okCount++
      } catch (e) {
        failCount++
        const ge = e as { status?: number; gone?: boolean; message?: string }
        // Errori che non si risolvono riprovando (chiave/modello): ferma subito invece di fallire 50 volte
        if (ge?.status === 401 || ge?.gone) { fatal = ge.message || 'Errore AI'; break }
      }
      // Throttle: ~300ms between calls to avoid rate limits
      await new Promise(r => setTimeout(r, 300))
    }
    setBulkTranslating(false)
    setBulkProgress(null)
    showToast(fatal ? `⚠ ${fatal}` : failCount > 0 ? `⚠ Tradotti ${okCount}/${toTranslate.length} articoli — ${failCount} non riusciti, riprova` : `✦ Traduzione completata — ${okCount} articoli aggiornati ✓`)
  }

  // ── Bulk: arricchisce le descrizioni brevi guardando le foto (vision) ─────
  const bulkEnrichDescriptions = async () => {
    const targets = catalog.filter(c => (c.img || c.images?.[0]) && (c.descrizione || '').trim().length < 90)
    if (targets.length === 0) { showToast('✦ Tutte le descrizioni sono già complete ✓'); return }
    if (!confirm(`Arricchire con AI la descrizione di ${targets.length} articoli guardando le loro foto? Le descrizioni attuali verranno sostituite e la traduzione EN di quegli articoli andrà rifatta (pulsante "Traduci tutto in EN").`)) return
    setBulkKind('desc'); setBulkTranslating(true)
    setBulkProgress({ done: 0, total: targets.length, current: '' })
    let updated = [...catalog]
    let ok = 0, fail = 0, fatal = ''
    for (let i = 0; i < targets.length; i++) {
      const item = targets[i]
      setBulkProgress({ done: i, total: targets.length, current: item.nome })
      try {
        const ctx = [item.nome && `Nome: ${item.nome}`, item.era && `Periodo: ${item.era}`, item.categoria && `Categoria: ${item.categoria}`, item.descrizione && `Descrizione attuale: ${item.descrizione}`].filter(Boolean).join(', ')
        const text = await groqVision(item.img || item.images![0], `Sei un esperto di un negozio vintage italiano. Informazioni note: ${ctx}. Guarda la foto e scrivi una descrizione commerciale elegante di 2-3 frasi (max 260 caratteri, in italiano). Mantieni le informazioni già note e descrivi solo ciò che si vede (forma, materiali, colori, stile). NON inventare marchi, date, firme o misure non visibili. Rispondi con SOLO la descrizione.`, 500)
        const desc = text.replace(/^["'«“]+|["'»”]+$/g, '').trim()
        if (!desc) throw new Error('vuota')
        updated = updated.map(c => c.id === item.id ? { ...c, descrizione: desc, descrizioneEn: undefined } : c)
        setCatalog(updated)
        ok++
      } catch (e) {
        fail++
        const ge = e as { status?: number; gone?: boolean; message?: string }
        if (ge?.status === 401 || ge?.gone) { fatal = ge.message || 'Errore AI'; break }
      }
      await new Promise(r => setTimeout(r, 300))
    }
    setBulkTranslating(false); setBulkProgress(null); setBulkKind('tr')
    showToast(fatal ? `⚠ ${fatal}` : fail > 0 ? `⚠ Aggiornate ${ok}/${targets.length} descrizioni — ${fail} non riuscite, riprova` : `✦ ${ok} descrizioni arricchite ✓ — ora premi "Traduci tutto in EN"`)
  }

  const save = () => {
    if (!editing) return
    const imgs = (form.images as string[]) ?? []
    const updated = { ...editing, ...form, img: imgs[0] ?? '', images: imgs, visibile: form.visibile !== false, prezzoScontato: (form.prezzoScontato as string) || undefined, percentualeSconto: (form.percentualeSconto as number) || undefined } as CatalogItem
    const idx = catalog.findIndex(c => c.id === updated.id)
    if (idx >= 0) { const next = [...catalog]; next[idx] = updated; setCatalog(next) }
    else setCatalog([...catalog, updated])
    setEditing(null)
    showToast('Oggetto salvato e visibile sulla landing ✓')
  }

  const remove = (id: number) => { if (confirm('Eliminare questo oggetto?')) { setCatalog(catalog.filter(c => c.id !== id)); showToast('Oggetto eliminato') } }
  const duplicate = (item: CatalogItem) => { setCatalog([...catalog, { ...item, id: Date.now(), nome: item.nome + ' (copia)' }]); showToast('Duplicato ✓') }
  const toggle = (id: number) => { setCatalog(catalog.map(c => c.id === id ? { ...c, visibile: !c.visibile } : c)); showToast('Visibilità aggiornata ✓') }
  const f = (k: string) => (v: unknown) => setForm(p => ({ ...p, [k]: v }))

  const filtered = catalog
    .filter(c => filterCat === 'tutti' || c.categoria === filterCat)
    .filter(c => filterStato === 'tutti' || c.stato === filterStato)
    .filter(c => !search || c.nome.toLowerCase().includes(search.toLowerCase()) || c.era.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortBy === 'nome' ? a.nome.localeCompare(b.nome) : sortBy === 'era' ? a.era.localeCompare(b.era) : sortBy === 'stato' ? a.stato.localeCompare(b.stato) : b.id - a.id)

  const BADGE_MAP: Record<string, string> = { disponibile: 'Disponibile', in_vetrina: 'In vetrina', trattativa: 'In trattativa', venduto: 'Venduto' }

  return (
    <div>
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 80, right: 24, zIndex: 999999, maxWidth: 'calc(100vw - 48px)', lineHeight: 1.5, wordBreak: 'break-word', background: '#1c1510', border: '1px solid rgba(201,168,76,0.3)', padding: '0.8rem 1.4rem', fontFamily: 'Cinzel, serif', fontSize: '0.55rem', letterSpacing: '0.15em', color: '#6fcf97' }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <h3 style={{ ...sectionTitle, marginBottom: 0 }}>Catalogo ({filtered.length}/{catalog.length})</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={bulkEnrichDescriptions}
            disabled={bulkTranslating}
            style={{
              fontFamily: 'Cinzel, serif', fontSize: '0.48rem', letterSpacing: '0.14em',
              textTransform: 'uppercase', padding: '0.55rem 1rem',
              background: 'rgba(111,207,151,0.12)', color: bulkTranslating ? '#4a6a58' : '#6fcf97',
              border: '1px solid rgba(111,207,151,0.35)', cursor: bulkTranslating ? 'not-allowed' : 'pointer',
              opacity: bulkTranslating ? 0.7 : 1, transition: 'all 0.2s',
            }}
          >
            {bulkTranslating && bulkKind === 'desc' ? '◌ Descrizioni…' : '✦ Arricchisci descrizioni'}
          </button>
          <button
            onClick={bulkTranslateAll}
            disabled={bulkTranslating}
            style={{
              fontFamily: 'Cinzel, serif', fontSize: '0.48rem', letterSpacing: '0.14em',
              textTransform: 'uppercase', padding: '0.55rem 1rem',
              background: bulkTranslating ? 'rgba(100,160,255,0.06)' : 'rgba(100,160,255,0.12)',
              color: bulkTranslating ? '#6a8aaa' : '#7ab8f5',
              border: '1px solid rgba(100,160,255,0.35)',
              cursor: bulkTranslating ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              opacity: bulkTranslating ? 0.7 : 1, transition: 'all 0.2s',
            }}
          >
            {bulkTranslating
              ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span> {bulkKind === 'desc' ? 'Attendi…' : 'Traduzione…'}</>
              : <>🇬🇧 Traduci tutto in EN</>}
          </button>
          <button onClick={startNew} style={btnGold}>+ Aggiungi oggetto</button>
        </div>
      </div>
      {bulkProgress && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'rgba(100,160,255,0.06)', border: '1px solid rgba(100,160,255,0.2)', borderRadius: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.46rem', letterSpacing: '0.12em', color: '#7ab8f5' }}>
              {bulkKind === 'desc' ? 'DESCRIZIONI AI IN CORSO' : 'TRADUZIONE AI IN CORSO'} · {bulkProgress.done}/{bulkProgress.total}
            </span>
            <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.8rem', color: '#9a8a78' }}>{bulkProgress.current}</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', height: 4 }}>
            <div style={{ height: '100%', background: '#7ab8f5', width: `${(bulkProgress.done / bulkProgress.total) * 100}%`, transition: 'width 0.4s ease', borderRadius: 2 }} />
          </div>
        </div>
      )}
      <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#6fcf97', fontSize: '0.82rem', marginBottom: '1.2rem', fontStyle: 'italic' }}>
        ⚡ Ogni modifica al catalogo si riflette immediatamente sulla landing page.
        {!settings.showPrezzi && <span style={{ color: '#f2994a' }}> · I prezzi sono nascosti (abilita in Impostazioni → Funzionalità)</span>}
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1.2rem', alignItems: 'center' }}>
        <input value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} placeholder="Cerca..." style={{ ...inputStyle, width: 220, fontSize: '0.85rem' }} />
        <select value={filterCat} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterCat(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
          <option value="tutti">Tutte le categorie</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStato} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterStato(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
          <option value="tutti">Tutti gli stati</option>
          {STATI.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select value={sortBy} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSortBy(e.target.value as typeof sortBy)} style={{ ...inputStyle, width: 'auto' }}>
          <option value="id">Più recenti</option>
          <option value="nome">Nome A→Z</option>
          <option value="era">Periodo</option>
          <option value="stato">Stato</option>
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {filtered.length === 0 && <div style={{ ...cardStyle, textAlign: 'center', padding: '2rem' }}><p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#9a8a78' }}>Nessun oggetto trovato.</p></div>}
        {filtered.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'stretch', background: item.visibile ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.15)', border: `1px solid ${item.visibile ? 'rgba(201,168,76,0.12)' : 'rgba(201,168,76,0.04)'}`, transition: 'all 0.3s', borderRadius: 2, overflow: 'hidden' }}>
            {/* Thumb */}
            <div style={{ width: 64, minHeight: 64, flexShrink: 0, position: 'relative' }}>
              {item.img
                ? <img src={item.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: item.visibile ? 1 : 0.4 }} />
                : <div style={{ width: '100%', height: '100%', minHeight: 64, background: 'rgba(201,168,76,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: '#3a2e22', fontSize: '1.5rem' }}>🏺</span></div>}
              {!item.visibile && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: '0.7rem' }}>👁</span></div>}
            </div>
            {/* Info */}
            <div style={{ flex: 1, minWidth: 0, padding: '0.6rem 0.8rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3 }}>
              <p style={{ fontFamily: 'Playfair Display, serif', color: item.visibile ? '#f5ede0' : '#6a5a4a', fontSize: '0.9rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nome || <em style={{ color: '#6a5a4a' }}>Senza nome</em>}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                {item.era && <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.42rem', letterSpacing: '0.1em', color: '#9a8a78', textTransform: 'uppercase' }}>{item.era}</span>}
                {item.era && item.categoria && <span style={{ color: '#3a2e22' }}>·</span>}
                {item.categoria && <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.42rem', letterSpacing: '0.08em', color: '#6a5a4a', textTransform: 'uppercase' }}>{item.categoria}</span>}
                <span style={{ display: 'inline-block', padding: '1px 6px', background: `${STATO_COLOR[item.stato]}18`, border: `1px solid ${STATO_COLOR[item.stato]}40`, fontFamily: 'Cinzel, serif', fontSize: '0.38rem', letterSpacing: '0.08em', color: STATO_COLOR[item.stato], textTransform: 'uppercase' }}>{item.stato.replace('_', ' ')}</span>
                {item.prezzo && item.prezzo !== 'Su richiesta' && settings.showPrezzi && <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.8rem', color: '#c9a84c' }}>{item.prezzo}</span>}
              </div>
            </div>
            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0.5rem', flexShrink: 0, justifyContent: 'center' }}>
              <button onClick={() => startEdit(item)} style={{ ...btnGhost, fontSize: '0.42rem', padding: '0.35rem 0.65rem', color: '#c9a84c', borderColor: 'rgba(201,168,76,0.3)' }}>✏ Modifica</button>
              <div style={{ display: 'flex', gap: 2 }}>
                <button onClick={() => toggle(item.id)} style={{ ...btnGhost, fontSize: '0.4rem', padding: '0.28rem 0.5rem', flex: 1, color: item.visibile ? '#9a8a78' : '#6fcf97' }}>{item.visibile ? 'Nascondi' : 'Mostra'}</button>
                <button onClick={() => duplicate(item)} style={{ ...btnGhost, fontSize: '0.4rem', padding: '0.28rem 0.5rem' }}>⎘</button>
                <button onClick={() => remove(item.id)} style={{ ...btnDanger, fontSize: '0.4rem', padding: '0.28rem 0.5rem' }}>✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {editing && (
          <motion.div style={{ position: 'fixed', inset: 0, zIndex: 99998, background: 'rgba(8,6,4,0.92)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div style={{ background: '#1c1510', border: '1px solid rgba(201,168,76,0.2)', padding: '2.5rem', width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}
              initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem' }}>
                <div>
                  <h4 style={{ fontFamily: 'Playfair Display, serif', color: '#f5ede0', fontWeight: 400, margin: 0, fontSize: '1.2rem' }}>
                    {catalog.find(c => c.id === editing.id) ? '✏ Modifica oggetto' : '✦ Nuovo oggetto'}
                  </h4>
                  <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#6a5a4a', fontSize: '0.8rem', margin: '4px 0 0' }}>
                    Carica le foto, poi premi ✦ Analizza con AI per compilare i campi
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(111,207,151,0.08)', border: '1px solid rgba(111,207,151,0.2)', padding: '0.3rem 0.7rem', flexShrink: 0 }}>
                  <span style={{ color: '#6fcf97', fontSize: '0.7rem' }}>✦</span>
                  <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.42rem', letterSpacing: '0.15em', color: '#6fcf97' }}>GROQ AI</span>
                </div>
              </div>

              {aiSuggestions && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ background: 'rgba(111,207,151,0.07)', border: '1px solid rgba(111,207,151,0.25)', padding: '0.9rem 1.2rem', marginBottom: '1.2rem' }}>
                  <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.48rem', letterSpacing: '0.2em', color: '#6fcf97', marginBottom: '0.4rem' }}>✦ AI HA ANALIZZATO L'IMMAGINE — CAMPI COMPILATI</p>
                  <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#9a8a78', fontSize: '0.8rem', margin: 0 }}>Verifica e modifica liberamente i campi proposti.</p>
                </motion.div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

                {/* Immagini — PRIMA */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ ...labelStyle, marginBottom: 6, display: 'block' }}>📷 Immagini · selezione multipla supportata</label>
                  <ImageUploadZone
                    images={(form.images as string[]) ?? []}
                    onChange={imgs => { f('images')(imgs) }}
                    onAiAnalyze={aiAnalyzeImage}
                  />
                  {/* Pulsante AI — sempre visibile, attivo solo con immagini caricate */}
                  <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                      onClick={handleAiAnalyzeClick}
                      disabled={!!aiLoading.image || ((form.images as string[]) ?? []).length === 0}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        background: ((form.images as string[]) ?? []).length > 0 ? 'rgba(111,207,151,0.12)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${((form.images as string[]) ?? []).length > 0 ? 'rgba(111,207,151,0.4)' : 'rgba(255,255,255,0.08)'}`,
                        color: ((form.images as string[]) ?? []).length > 0 ? '#6fcf97' : '#4a3a2a',
                        padding: '0.5rem 1.1rem', cursor: ((form.images as string[]) ?? []).length > 0 ? 'pointer' : 'not-allowed',
                        fontFamily: 'Cinzel, serif', fontSize: '0.5rem', letterSpacing: '0.18em',
                        transition: 'all 0.25s', opacity: aiLoading.image ? 0.6 : 1,
                      }}
                    >
                      {aiLoading.image
                        ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span> Analisi in corso…</>
                        : <>✦ ANALIZZA CON AI</>
                      }
                    </button>
                    <span style={{ fontFamily: 'Cormorant Garamond, serif', color: '#6a5a4a', fontSize: '0.78rem', fontStyle: 'italic' }}>
                      {((form.images as string[]) ?? []).length === 0
        ? `Carica almeno un'immagine per abilitare l'analisi AI`
                        : `${((form.images as string[]) ?? []).length} immagine/i pronte — premi per compilare i campi`
                      }
                    </span>
                  </div>
                </div>

                {/* Nome */}
                <div>
                  <label style={labelStyle}>Nome oggetto *</label>
                  <input value={(form.nome as string) || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('nome')(e.target.value)} style={inputStyle} placeholder="Es. Lampada ad arco anni '70" />
                </div>

                {/* Era */}
                <div>
                  <label style={labelStyle}>Epoca / periodo</label>
                  <input value={(form.era as string) || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('era')(e.target.value)} style={inputStyle} placeholder="Es. Anni '60 · Anni '70 · Modernariato" />
                </div>

                {/* Categoria */}
                <div>
                  <label style={labelStyle}>Categoria</label>
                  <select value={(form.categoria as string) || 'altro'} onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('categoria')(e.target.value)} style={inputStyle}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Stato */}
                <div>
                  <label style={labelStyle}>Stato</label>
                  <select value={(form.stato as string) || 'disponibile'} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { f('stato')(e.target.value); f('badge')(BADGE_MAP[e.target.value] ?? e.target.value) }} style={inputStyle}>
                    {STATI.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>

                {/* Badge */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Badge etichetta</label>
                  <input value={(form.badge as string) || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('badge')(e.target.value)} style={inputStyle} placeholder="Es. Disponibile · Pezzo raro · In vetrina" />
                </div>

                {/* Descrizione con AI */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 6, flexWrap: 'wrap' }}>
                    <label style={labelStyle}>Descrizione</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <AiBtn loading={!!aiLoading.desc} onClick={aiDescribeFromPhoto} label="📷 Genera dalla foto" />
                      <AiBtn loading={!!aiLoading.desc} onClick={aiImproveDescription} label="✦ Migliora testo" />
                    </div>
                  </div>
                  <textarea value={(form.descrizione as string) || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('descrizione')(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Descrivi l'oggetto — oppure usa l'AI per generarla" />
                </div>

                {/* Sezione traduzione EN */}
                <div style={{ gridColumn: '1 / -1', background: 'rgba(100,160,255,0.04)', border: '1px solid rgba(100,160,255,0.18)', padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem' }}>🇬🇧</span>
                      <label style={{ ...labelStyle, marginBottom: 0, color: '#7ab8f5' }}>Traduzione inglese (EN)</label>
                    </div>
                    <button
                      onClick={aiTranslate}
                      disabled={!!aiLoading.translate}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        background: aiLoading.translate ? 'rgba(100,160,255,0.06)' : 'rgba(100,160,255,0.12)',
                        border: '1px solid rgba(100,160,255,0.35)',
                        color: aiLoading.translate ? '#6a8aaa' : '#7ab8f5',
                        fontFamily: 'Cinzel, serif', fontSize: '0.44rem', letterSpacing: '0.15em',
                        padding: '0.3rem 0.7rem', cursor: aiLoading.translate ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap', transition: 'all 0.2s', opacity: aiLoading.translate ? 0.6 : 1,
                      }}
                    >
                      {aiLoading.translate
                        ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span> Traduzione…</>
                        : <>✦ Traduci con AI</>
                      }
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ ...labelStyle, fontSize: '0.44rem', color: '#7ab8f5', marginBottom: 4 }}>Nome EN</label>
                      <input
                        value={(form.nomeEn as string) || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('nomeEn')(e.target.value)}
                        style={{ ...inputStyle, borderColor: 'rgba(100,160,255,0.3)' }}
                        placeholder="Es. Arc floor lamp, 1970s"
                      />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, fontSize: '0.44rem', color: '#7ab8f5', marginBottom: 4 }}>Descrizione EN</label>
                      <textarea
                        value={(form.descrizioneEn as string) || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('descrizioneEn')(e.target.value)}
                        rows={2}
                        style={{ ...inputStyle, resize: 'vertical', borderColor: 'rgba(100,160,255,0.3)' }}
                        placeholder="English description — or use AI to translate"
                      />
                    </div>
                    {!(form.nomeEn as string) && !(form.descrizioneEn as string) && (
                      <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#4a6a8a', fontSize: '0.8rem', fontStyle: 'italic', margin: 0 }}>
                        ⚠ Senza traduzione EN, i visitatori anglofoni vedranno il testo italiano.
                      </p>
                    )}
                  </div>
                </div>

                {/* Prezzo con AI */}
                <div style={{ gridColumn: '1 / -1', background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.25)', padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <label style={{ ...labelStyle, color: '#c9a84c', marginBottom: 0 }}>
                      💰 Prezzo{!settings.showPrezzi && <span style={{ color: '#f2994a' }}> (nascosti — abilita in Impostazioni)</span>}
                    </label>
                    <AiBtn loading={!!aiLoading.price} onClick={aiSuggestPrice} label="✦ Suggerisci prezzo" />
                  </div>
                  <input value={(form.prezzo as string) || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('prezzo')(e.target.value)} placeholder='Es. € 1.200 · oppure "Su richiesta"' style={{ ...inputStyle, borderColor: 'rgba(201,168,76,0.5)', width: '100%', boxSizing: 'border-box' }} />
                  <div style={{ marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px solid rgba(201,168,76,0.15)' }}>
                    <label style={{ ...labelStyle, color: '#eb5757', marginBottom: '0.5rem' }}>🏷 Sconto su questo articolo (opzionale)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <label style={{ ...labelStyle, fontSize: '0.44rem', color: '#9a8a78' }}>Prezzo scontato (es. € 980)</label>
                        <input value={(form.prezzoScontato as string) || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('prezzoScontato')(e.target.value)} placeholder='Vuoto = nessuno sconto' style={{ ...inputStyle, borderColor: 'rgba(235,87,87,0.4)' }} />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontSize: '0.44rem', color: '#9a8a78' }}>Badge % (es. 20 → mostra −20%)</label>
                        <input type="number" min={0} max={99} value={(form.percentualeSconto as number) || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const pct = e.target.value ? Number(e.target.value) : undefined
                          f('percentualeSconto')(pct)
                          // Auto-calcola prezzo scontato dal prezzo principale
                          if (pct && pct > 0) {
                            const prezzoStr = (form.prezzo as string) || ''
                            const match = prezzoStr.replace(/\./g, '').replace(',', '.').match(/[\d.]+/)
                            if (match) {
                              const num = parseFloat(match[0])
                              if (!isNaN(num)) {
                                const scontato = num * (1 - pct / 100)
                                f('prezzoScontato')(`€ ${scontato.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`)
                              }
                            }
                          } else if (!pct) {
                            f('prezzoScontato')('')
                          }
                        }} placeholder='Vuoto = nessun badge' style={{ ...inputStyle, borderColor: 'rgba(235,87,87,0.4)' }} />
                      </div>
                    </div>
                    {(form.prezzoScontato as string) && (
                      <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.9rem', color: '#9a8a78', textDecoration: 'line-through' }}>{(form.prezzo as string) || '—'}</span>
                        <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', color: '#eb5757', fontWeight: 600 }}>{form.prezzoScontato as string}</span>
                        {(form.percentualeSconto as number) > 0 && <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.42rem', background: 'rgba(235,87,87,0.15)', border: '1px solid rgba(235,87,87,0.4)', color: '#eb5757', padding: '2px 6px' }}>−{form.percentualeSconto}%</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Visibilità */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input type="checkbox" id="vis" checked={form.visibile !== false} onChange={e => f('visibile')(e.target.checked)} />
                  <label htmlFor="vis" style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer' }}>Visibile nel catalogo</label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button onClick={save} style={btnGold}>Salva oggetto</button>
                <button onClick={() => { setEditing(null); setAiSuggestions(null) }} style={btnGhost}>Annulla</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Reviews Admin ────────────────────────────────────────────────────────────
function ReviewsAdmin() {
  const { reviews, setReviews } = useApp()
  const [addMode, setAddMode] = useState(false)
  const [newRev, setNewRev] = useState<Partial<Recensione>>({})
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')
  const [aiTranslating, setAiTranslating] = useState<number | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), msg.startsWith('⚠') ? 7000 : 2000) }
  const toggle = (id: number) => { setReviews(reviews.map(r => r.id === id ? { ...r, visibile: !r.visibile } : r)); showToast('Visibilità aggiornata ✓') }
  const toggleEvidenza = (id: number) => { setReviews(reviews.map(r => r.id === id ? { ...r, inEvidenza: !r.inEvidenza } : r)); showToast('Evidenza aggiornata ✓') }
  const remove = (id: number) => { if (confirm('Eliminare questa recensione?')) { setReviews(reviews.filter(r => r.id !== id)); showToast('Eliminata') } }

  // ── AI: traduci recensione in inglese ──────────────────────────────────
  const aiTranslateReview = async (rev: Recensione) => {
    setAiTranslating(rev.id)
    try {
      const result = await groqText(`Sei un traduttore specializzato per negozi italiani di arredi vintage e bijoux. Traduci in inglese elegante questa recensione italiana per un negozio vintage.
Rispondi SOLO con un JSON valido, senza markdown:
{"testoEn":"...","autoreEn":"..."}

Autore: ${rev.autore}
Testo: ${rev.testo}

Regole:
- testoEn: traduzione fedele e raffinata, max 400 caratteri
- autoreEn: lascia il nome invariato, aggiungi la città tradotta se presente (es. "Florence" invece di "Firenze")
- Mantieni il tono autentico e personale della recensione originale`)
      const cleaned = result.replace(/```json|```/g, '').trim()
      const parsed = extractJson(cleaned)
      if (parsed.testoEn) {
        setReviews(reviews.map(r => r.id === rev.id ? { ...r, testoEn: parsed.testoEn, autoreEn: parsed.autoreEn || r.autore } : r))
        showToast('✦ Traduzione EN completata ✓')
      }
    } catch (e) {
      showToast(aiErr(e))
    }
    setAiTranslating(null)
  }

  // ── AI: traduci tutte le recensioni visibili ────────────────────────────
  const aiTranslateAll = async () => {
    const toTranslate = reviews.filter(r => r.visibile && !r.testoEn)
    if (toTranslate.length === 0) { showToast('Tutte le recensioni visibili hanno già la traduzione EN'); return }
    showToast(`⏳ Traduco ${toTranslate.length} recensioni…`)
    for (const rev of toTranslate) {
      await aiTranslateReview(rev)
    }
  }

  // ── AI: genera recensione di esempio (nella sezione Recensioni) ────────────
  const [aiReviewText, setAiReviewText] = useState('')
  const [aiReviewLoading, setAiReviewLoading] = useState(false)

  const aiGenerateReview = async (imgBase64?: string, nome?: string) => {
    setAiReviewLoading(true)
    try {
      let result: string
      const prompt = imgBase64
        ? `Sei un cliente soddisfatto di un negozio italiano di arredi vintage. Guarda questa foto dell'oggetto${nome ? ` ("${nome}")` : ''} e simula una recensione autentica.`
        : nome
          ? `Sei un cliente soddisfatto di un negozio italiano di arredi vintage. Simula una recensione autentica per l'acquisto di "${nome}".`
          : `Sei un cliente soddisfatto di un negozio italiano di arredi vintage. Simula una recensione autentica per un acquisto di vintage.`

      const basePrompt = `${prompt}
Rispondi SOLO con un JSON valido, senza markdown:
{"testo":"...","autore":"...","citta":"..."}

Regole:
- testo: 2-3 frasi entusiaste e credibili, tono personale autentico, max 300 caratteri
- autore: nome e cognome abbreviato realistico italiano (es. "Marco B.", "Laura F.", "G. Rossi")
- citta: città italiana reale e plausibile (es. "Firenze", "Milano", "Bologna", "Roma", "Torino")`

      if (imgBase64) {
        result = await groqVision(imgBase64, basePrompt)
      } else {
        result = await groqText(basePrompt)
      }
      const cleaned = result.replace(/```json|```/g, '').trim()
      const parsed = extractJson(cleaned)
      if (parsed.testo) {
        setNewRev(p => ({
          ...p,
          testo: parsed.testo.replace(/^["']+|["']+$/g, '').trim(),
          ...(parsed.autore && !p.autore ? { autore: parsed.autore } : {}),
          ...(parsed.citta && !p.citta ? { citta: parsed.citta } : {}),
        }))
        showToast('✦ Recensione generata con AI ✓')
      }
    } catch (e: any) {
      showToast(aiErr(e))
    }
    setAiReviewLoading(false)
  }

  const addReview = () => {
    if (!newRev.autore || !newRev.testo) return
    setReviews([...reviews, { id: Date.now(), autore: newRev.autore || '', citta: newRev.citta || '', stelle: newRev.stelle ?? 5, testo: newRev.testo || '', visibile: true, data: new Date().toISOString().slice(0, 10), inEvidenza: false }])
    setNewRev({})
    setAddMode(false)
    setAiReviewText('')
    showToast('Recensione aggiunta ✓')
  }

  const filtered = reviews.filter(r => !search || r.autore.toLowerCase().includes(search.toLowerCase()) || r.testo.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <AnimatePresence>
        {toast && <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 80, right: 24, zIndex: 999999, maxWidth: 'calc(100vw - 48px)', lineHeight: 1.5, wordBreak: 'break-word', background: '#1c1510', border: '1px solid rgba(201,168,76,0.3)', padding: '0.8rem 1.4rem', fontFamily: 'Cinzel, serif', fontSize: '0.55rem', letterSpacing: '0.15em', color: '#6fcf97' }}>{toast}</motion.div>}
      </AnimatePresence>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: 8, flexWrap: 'wrap' }}>
        <h3 style={{ ...sectionTitle, marginBottom: 0 }}>Recensioni ({reviews.length})</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} placeholder="Cerca..." style={{ ...inputStyle, width: 160, fontSize: '0.85rem' }} />
          <AiBtn loading={aiTranslating !== null} onClick={aiTranslateAll} label="✦ Traduci tutte EN" />
          <button onClick={() => setAddMode(true)} style={btnGold}>+ Aggiungi</button>
        </div>
      </div>
      <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#6fcf97', fontSize: '0.82rem', marginBottom: '1.2rem', fontStyle: 'italic' }}>⚡ Visibilità ed evidenza si riflettono immediatamente nella sezione recensioni.</p>

      <AnimatePresence>
        {addMode && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ ...cardStyle, marginBottom: '1.5rem', overflow: 'hidden' }}>
            <p style={{ ...labelStyle, color: '#c9a84c', marginBottom: '1rem' }}>NUOVA RECENSIONE</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div><label style={labelStyle}>Autore *</label><input value={newRev.autore || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRev(p => ({ ...p, autore: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Città</label><input value={newRev.citta || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRev(p => ({ ...p, citta: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Stelle</label><select value={newRev.stelle ?? 5} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRev(p => ({ ...p, stelle: Number(e.target.value) }))} style={inputStyle}>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{'★'.repeat(n)}</option>)}</select></div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 }}>
                <label style={labelStyle}>Testo *</label>
                <AiBtn loading={aiReviewLoading} onClick={() => aiGenerateReview(undefined, newRev.nome as string | undefined)} label="⭐ Genera con AI" />
              </div>
              <textarea value={newRev.testo || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRev(p => ({ ...p, testo: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Testo della recensione — oppure genera con AI" />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={addReview} style={btnGold}>Aggiungi recensione</button>
              <button onClick={() => { setAddMode(false); setAiReviewText('') }} style={btnGhost}>Annulla</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {filtered.map(rev => (
          <div key={rev.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem 1.2rem', background: 'rgba(255,255,255,0.02)', border: `1px solid ${rev.inEvidenza ? 'rgba(201,168,76,0.3)' : 'rgba(201,168,76,0.08)'}`, opacity: rev.visibile ? 1 : 0.45, transition: 'opacity 0.3s' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.52rem', letterSpacing: '0.18em', color: '#c9a84c', marginBottom: 4 }}>
                {rev.autore}{rev.citta ? ` · ${rev.citta}` : ''} · {'★'.repeat(rev.stelle)} · {rev.data}
                {rev.inEvidenza && <span style={{ marginLeft: 8, color: '#f2994a' }}>★ IN EVIDENZA</span>}
                {!rev.visibile && <span style={{ marginLeft: 8, color: '#eb5757' }}>● NASCOSTA</span>}
                {(rev as any).testoEn && <span style={{ marginLeft: 8, color: '#7ab8f5' }}>🌐 EN</span>}
              </p>
              <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#9a8a78', fontSize: '0.9rem', lineHeight: 1.5 }}>{rev.testo.substring(0, 160)}{rev.testo.length > 160 ? '...' : ''}</p>
              {(rev as any).testoEn && (
                <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#5a7a98', fontSize: '0.82rem', lineHeight: 1.5, marginTop: 4, fontStyle: 'italic' }}>
                  EN: {((rev as any).testoEn as string).substring(0, 120)}{((rev as any).testoEn as string).length > 120 ? '...' : ''}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0, flexDirection: 'column', alignItems: 'flex-end' }}>
              <button onClick={() => toggleEvidenza(rev.id)} style={{ ...btnGhost, fontSize: '0.44rem', padding: '0.35rem 0.7rem', color: rev.inEvidenza ? '#f2994a' : '#9a8a78' }}>{rev.inEvidenza ? '★ Togli evidenza' : '☆ In evidenza'}</button>
              <button onClick={() => toggle(rev.id)} style={{ ...btnGhost, fontSize: '0.44rem', padding: '0.35rem 0.7rem' }}>{rev.visibile ? 'Nascondi' : 'Mostra'}</button>
              <button
                onClick={() => aiTranslateReview(rev)}
                disabled={aiTranslating === rev.id}
                style={{ background: aiTranslating === rev.id ? 'rgba(100,160,255,0.06)' : 'rgba(100,160,255,0.12)', border: '1px solid rgba(100,160,255,0.25)', color: aiTranslating === rev.id ? '#6a8aaa' : '#7ab8f5', fontFamily: 'Cinzel, serif', fontSize: '0.44rem', letterSpacing: '0.1em', padding: '0.35rem 0.7rem', cursor: aiTranslating === rev.id ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' }}
              >
                {aiTranslating === rev.id ? '⏳' : (rev as any).testoEn ? '✦ Ritraduci EN' : '✦ Traduci EN'}
              </button>
              <button onClick={() => remove(rev.id)} style={{ ...btnDanger, fontSize: '0.44rem', padding: '0.35rem 0.7rem' }}>Elimina</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Login ────────────────────────────────────────────────────────────────────
function AdminLogin({ onLogin, onClose }: { onLogin: () => void; onClose: () => void }) {
  const { adminPassword } = useApp()
  const [pw, setPw] = useState('')
  const [errMsg, setErrMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const err = !!errMsg

  const tryLogin = async () => {
    if (busy || !pw) return
    setBusy(true); setErrMsg('')
    const r = await adminLogin(pw)
    setBusy(false)
    if (r.ok) { onLogin(); return }
    // Solo in sviluppo locale (npm run dev, senza Netlify Function) è ammesso l'accesso senza server
    if (import.meta.env.DEV && r.reason === 'unavailable' && adminPassword && pw === adminPassword) { onLogin(); return }
    setErrMsg(r.message)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(8,6,4,0.97)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#1c1510', border: '1px solid rgba(201,168,76,0.2)', padding: '3rem', minWidth: 320, textAlign: 'center', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: '#9a8a78', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        <div style={{ width: 40, height: 40, border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <span style={{ color: '#c9a84c', fontSize: '1.1rem' }}>⚙</span>
        </div>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.6rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#c9a84c', marginBottom: '0.5rem' }}>Admin · Emporio 46</p>
        <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#9a8a78', fontSize: '0.85rem', marginBottom: '2rem' }}>Inserisci la password per accedere</p>
        <input type="password" placeholder="Password" value={pw} autoFocus onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && tryLogin()}
          style={{ ...inputStyle, marginBottom: '1rem', border: err ? '1px solid #eb5757' : '1px solid rgba(201,168,76,0.2)', textAlign: 'center', letterSpacing: '0.3em' }} />
        <button onClick={tryLogin} disabled={busy} style={{ ...btnGold, width: '100%', padding: '0.9rem', opacity: busy ? 0.6 : 1 }}>{busy ? 'Verifica…' : 'Accedi'}</button>
        {err && <p style={{ color: '#eb5757', fontSize: '0.85rem', marginTop: '0.75rem', fontFamily: 'Cormorant Garamond, serif' }}>{errMsg}</p>}
      </div>
    </div>
  )
}

// ─── Sidebar Nav ──────────────────────────────────────────────────────────────
// ─── Sfondi sparsi & Mappa ────────────────────────────────────────────────────
function BgSlider({ label, value, onChange, min = 0, max = 1, step = 0.01, unit = '' }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; unit?: string }) {
return (
  <div style={{ marginBottom: '1rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
      <label style={labelStyle}>{label}</label>
      <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.5rem', color: '#c9a84c' }}>{unit ? Math.round(value) + unit : value.toFixed(2)}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(parseFloat(e.target.value))}
      style={{ width: '100%', accentColor: '#c9a84c', cursor: 'pointer', height: 3 }} />
  </div>
)
}

// Dove compare ogni sfondo (testo guida mostrato nella card)
const BG_SLOT_HINTS: Record<string, string> = {
  navbar: 'Dentro la barra in alto: compare quando si scorre la pagina.',
  menu: 'Sfondo del menu a tutto schermo (telefono): di solito un video a ciclo continuo.',
  hero: 'Copertina a tutto schermo (video o immagine), con effetto parallasse allo scroll.',
  marquee: 'Striscia colorata con i nomi delle categorie.',
  about: 'Sfondo della sezione "Chi siamo".',
  catalog: 'Sfondo dietro la griglia del catalogo.',
  why: 'Sfondo delle quattro card "Perché sceglierci".',
  reviews: 'Sfondo della sezione recensioni.',
  contact: 'Sfondo dei moduli di contatto / prenotazione.',
  location: 'Sfondo della sezione mappa e orari.',
  footer: 'Sfondo del piede della pagina (video o immagine). Più sotto regoli la trasparenza dei riquadri di testo.',
}

// Fotogramma di anteprima (poster) estratto dal video appena scelto, nel browser dell'admin
function makePoster(file: File): Promise<Blob | null> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file)
    const v = document.createElement('video')
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url
    const done = (b: Blob | null) => { clearTimeout(timer); URL.revokeObjectURL(url); resolve(b) }
    const timer = setTimeout(() => done(null), 10000)
    v.onerror = () => done(null)
    v.onloadeddata = () => { try { v.currentTime = Math.min(0.5, (v.duration || 1) / 4) } catch { done(null) } }
    v.onseeked = () => {
      try {
        const vw = v.videoWidth || 1280, vh = v.videoHeight || 720
        const w = Math.min(1280, vw), h = Math.round(w * vh / vw)
        const c = document.createElement('canvas'); c.width = w; c.height = h
        c.getContext('2d').drawImage(v, 0, 0, w, h)
        c.toBlob(b => done(b), 'image/jpeg', 0.78)
      } catch { done(null) }
    }
  })
}

// Video di sfondo di una zona: URL oppure upload (MP4/WebM fino a 36 MB) su Netlify Blobs, con poster automatico
function VideoField({ video, poster, onChange }: { video: string; poster: string; onChange: (patch: { video?: string; poster?: string }) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const MAX = 36 * 1024 * 1024
  const upload = async (file: File) => {
    if (!['video/mp4', 'video/webm'].includes(file.type)) { setMsg('Formato non supportato: usa MP4 (H.264) o WebM.'); return }
    if (file.size > MAX) { setMsg(`Il video pesa ${(file.size / 1048576).toFixed(1)} MB: il massimo è 36 MB (meglio sotto i 6 MB, per un sito veloce da telefono).`); return }
    if (!getAdminToken()) { setMsg('Sessione non attiva o modalità sviluppo: incolla un URL oppure metti il file in public/bg/.'); return }
    setBusy(true); setMsg('Caricamento video…')
    const r = await adminUploadAsset(file, file.type, file.name, (d, t) => setMsg(`Caricamento video… ${d}/${t}`))
    if (!r.ok) { setBusy(false); setMsg(r.message); return }
    setMsg('Creo il fotogramma di anteprima…')
    let posterUrl = ''
    const pb = await makePoster(file)
    if (pb) { const pr = await adminUploadAsset(pb, 'image/jpeg', 'poster'); if (pr.ok) posterUrl = `/media/${pr.id}` }
    onChange({ video: `/media/${r.id}`, poster: posterUrl })
    setBusy(false)
    setMsg(`Video caricato (${(file.size / 1048576).toFixed(1)} MB): visibile a tutti dopo il salvataggio automatico.`)
  }
  return (
    <div style={{ marginBottom: '1rem', padding: '0.8rem', border: '1px dashed rgba(201,168,76,0.3)' }}>
      <label style={labelStyle}>Video di sfondo (se presente sostituisce l'immagine)</label>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <input value={video} onChange={e => onChange({ video: e.target.value.trim() })} placeholder="Incolla URL (.mp4 / .webm) oppure carica →" style={{ ...inputStyle, flex: 1, fontSize: '0.78rem' }} />
        <button disabled={busy} onClick={() => inputRef.current?.click()} style={{ ...btnGhost, fontSize: '0.46rem', padding: '0.4rem 0.75rem', whiteSpace: 'nowrap', opacity: busy ? 0.5 : 1 }}>⬆ Video</button>
        <input ref={inputRef} type="file" accept="video/mp4,video/webm" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
      </div>
      {msg && <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#c9a84c', fontSize: '0.8rem', margin: '0 0 0.6rem' }}>{msg}</p>}
      {video && (
        <>
          <SingleImageUpload label="Fotogramma iniziale (poster, mostrato prima che il video parta)" value={poster || ''} onChange={v => onChange({ poster: v })} aspectRatio="16/6" hidePreview />
          <button onClick={() => { onChange({ video: '', poster: '' }); setMsg('') }} style={{ ...btnGhost, fontSize: '0.44rem', padding: '0.3rem 0.6rem', color: '#eb5757' }}>× Rimuovi video (usa solo l'immagine)</button>
        </>
      )}
      <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#9a8a78', fontSize: '0.74rem', margin: '0.6rem 0 0', lineHeight: 1.4 }}>
        Sempre muto e a ciclo continuo; parte solo quando la zona è visibile. Con "riduci animazioni" si vede solo il fotogramma.
      </p>
    </div>
  )
}

function SfondiAdmin() {
  const { settings, updateSettings } = useApp()
  const settingsRef = useRef(settings)
  settingsRef.current = settings      // l'upload di un video è asincrono: si parte sempre dalle impostazioni più recenti

  // Tutto live: ogni modifica si vede subito sulla landing
  const patchBg = (slot: string, patch: Record<string, unknown>) => {
    const cur = settingsRef.current
    updateSettings({ sectionBgs: { ...(cur.sectionBgs || {}), [slot]: { ...getSectionBg(cur, slot as any), ...patch } } } as Partial<SiteSettings>)
  }
  const resetBg = (slot: string) => {
    const next = { ...(settings.sectionBgs || {}) } as Record<string, unknown>
    delete next[slot]
    // anche i vecchi campi (≤v49) di hero/recensioni/footer, altrimenti il "default" resterebbe quello vecchio
    const legacy: Record<string, string[]> = {
      hero: ['heroImageUrl', 'heroImageOpacity', 'heroImageBrightness'],
      reviews: ['reviewsBgImageUrl', 'reviewsBgOpacity', 'reviewsBgBrightness'],
      footer: ['footerImageUrl', 'footerImageOpacity', 'footerImageBrightness'],
    }
    const clear: Record<string, unknown> = {}
    ;(legacy[slot] || []).forEach(k => { clear[k] = undefined })
    updateSettings({ sectionBgs: next, ...clear } as Partial<SiteSettings>)
  }
  const resetAll = () => {
    if (!window.confirm('Ripristinare tutti gli sfondi ai valori predefiniti?')) return
    updateSettings({
      sectionBgs: {},
      heroImageUrl: undefined, heroImageOpacity: undefined, heroImageBrightness: undefined,
      reviewsBgImageUrl: undefined, reviewsBgOpacity: undefined, reviewsBgBrightness: undefined,
      footerImageUrl: undefined, footerImageOpacity: undefined, footerImageBrightness: undefined,
    } as Partial<SiteSettings>)
  }

  const mapType = settings.mapType || 'k'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h3 style={{ ...sectionTitle, marginBottom: 0 }}>Sfondi &amp; Mappa</h3>
        <button onClick={resetAll} style={{ ...btnGhost, fontSize: '0.46rem', padding: '0.4rem 0.8rem' }}>↺ Ripristina tutti</button>
      </div>
      <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#6fcf97', fontSize: '0.82rem', marginBottom: '0.6rem', fontStyle: 'italic' }}>
        ⚡ Le modifiche sono applicate in tempo reale sulla landing page.
      </p>
      <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#9a8a78', fontSize: '0.85rem', marginBottom: '2rem', lineHeight: 1.5 }}>
        Tutte le immagini di sfondo del sito, nello stesso ordine in cui compaiono nella pagina: <b>titolo</b> (barra e copertina), <b>corpo</b> (sezioni) e <b>footer</b>.
        Per ognuna scegli l'immagine (carica o incolla un URL) e regola opacità, luminosità, sfocatura, seppia, posizione, ripetizione e sfumatura dei bordi.
        Ogni zona può avere anche un <b>video</b> di sfondo (copertina, menu mobile e footer ne hanno già uno): carica un MP4/WebM o incolla un URL, oppure rimuovilo per usare solo l'immagine. Immagini e video caricati da qui vengono pubblicati per tutti i visitatori al salvataggio automatico.
      </p>

      {SECTION_BG_GROUPS.map(group => (
        <div key={group.title} style={{ marginBottom: '2.5rem' }}>
          <p style={{ ...labelStyle, color: '#e8d9b0', fontSize: '0.6rem', letterSpacing: '0.3em', marginBottom: '1rem', paddingBottom: '0.6rem', borderBottom: '1px solid rgba(201,168,76,0.25)' }}>
            {group.title.toUpperCase()}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
            {group.slots.map(slot => {
              const bg = getSectionBg(settings, slot)
              const def = SECTION_BG_DEFAULTS[slot]
              const hasText = SECTION_BG_HAS_TEXT.includes(slot)
              return (
                <div key={slot} style={{ ...cardStyle }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <p style={{ ...labelStyle, color: '#c9a84c', margin: 0 }}>{SECTION_BG_LABELS[slot].toUpperCase()}</p>
                    <button onClick={() => resetBg(slot)} style={{ ...btnGhost, fontSize: '0.44rem', padding: '0.3rem 0.6rem' }}>↺ Default</button>
                  </div>
                  <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#9a8a78', fontSize: '0.8rem', margin: '0 0 1rem', lineHeight: 1.4 }}>{BG_SLOT_HINTS[slot]}</p>

                  {/* Anteprima fedele: stessi parametri e stesso codice di rendering del sito */}
                  <div style={{ position: 'relative', overflow: 'hidden', isolation: 'isolate', width: '100%', aspectRatio: slot === 'navbar' || slot === 'marquee' ? '16/3' : '16/7', background: settings.bgColor || '#f3e8d4', border: '1px solid rgba(201,168,76,0.2)', marginBottom: '0.8rem' }}>
                    {(bg.url || bg.video) && <BgMedia key={bg.video || bg.url} bg={bg} slot={slot} fill style={{ zIndex: -1 }} />}
                    {(bg.url || bg.video) && hasText && bg.scrim > 0 && <div className={bgScrimClass(bg)} style={{ position: 'absolute', inset: 0, zIndex: -1, ...bgScrimStyle(bg) }} />}
                    {(bg.url || bg.video) && hasText && (
                      <div className="bg-readable" style={{ ['--bg-shadow' as any]: bg.shadow, position: 'absolute', left: '6%', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text, #2b1a12)', fontFamily: 'var(--font-display, serif)', fontSize: '1.15rem', lineHeight: 1.2 }}>
                        Testo di esempio
                        <div style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.75rem', opacity: 0.85, marginTop: 4 }}>Così si legge sopra la foto</div>
                      </div>
                    )}
                    {!bg.url && !bg.video && <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', color: '#9a8a78', fontSize: '0.8rem' }}>Nessuna immagine né video · sfondo disattivato</span>}
                    {slot === 'footer' && (bg.url || bg.video) && (
                      <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', padding: 10 }}>
                        {['Contatti', 'Orari', 'Seguici'].map(t => (
                          <div key={t} style={{ ...footerGlassStyle(settings), flex: 1, padding: '0.5rem 0.4rem', borderRadius: 12, textAlign: 'center', fontFamily: 'var(--font-display, serif)', fontSize: '0.78rem', color: 'var(--color-text, #2b1a12)' }}>{t}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  <SingleImageUpload label={bg.video ? 'Immagine (di riserva se il video non c\'è)' : 'Immagine'} value={bg.url} onChange={v => patchBg(slot, { url: v })} aspectRatio="16/6" hidePreview />
                  <VideoField video={bg.video || ''} poster={bg.poster || ''} onChange={p => patchBg(slot, p)} />
                  {bg.video && <BgSlider label="Velocità del video" value={bg.videoSpeed ?? 1} min={0.25} max={2} step={0.05} onChange={v => patchBg(slot, { videoSpeed: v })} />}

                  <BgSlider label="Opacità" value={bg.opacity} onChange={v => patchBg(slot, { opacity: v })} />
                  <BgSlider label="Luminosità" value={bg.brightness} min={0} max={1.5} onChange={v => patchBg(slot, { brightness: v })} />
                  <BgSlider label="Sfocatura" value={bg.blur} min={0} max={20} step={1} unit="px" onChange={v => patchBg(slot, { blur: v })} />
                  <BgSlider label="Seppia" value={bg.sepia} onChange={v => patchBg(slot, { sepia: v })} />
                  {hasText && <BgSlider label="Velo di leggibilità (colore del tema sopra la foto)" value={bg.scrim} onChange={v => patchBg(slot, { scrim: v })} />}
                  {hasText && (
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={labelStyle}>Forma del velo</label>
                      <select value={bg.scrimShape} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => patchBg(slot, { scrimShape: e.target.value })} style={inputStyle}>
                        <option value="flat">Uniforme su tutta la zona</option>
                        <option value="side">Dietro al testo (foto libera sull'altro lato)</option>
                      </select>
                    </div>
                  )}
                  {hasText && <BgSlider label="Alone dei testi" value={bg.shadow} onChange={v => patchBg(slot, { shadow: v })} />}
                  <BgSlider label="Posizione orizzontale" value={bg.posX} min={0} max={100} step={1} unit="%" onChange={v => patchBg(slot, { posX: v })} />
                  <BgSlider label="Posizione verticale" value={bg.posY} min={0} max={100} step={1} unit="%" onChange={v => patchBg(slot, { posY: v })} />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                    <div>
                      <label style={labelStyle}>Adattamento</label>
                      <select value={bg.size} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => patchBg(slot, { size: e.target.value })} style={inputStyle}>
                        <option value="cover">Riempi (foto)</option>
                        <option value="tile">Ripeti (texture)</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Bordi sfumati</label>
                      <select value={bg.fade} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => patchBg(slot, { fade: e.target.value })} style={inputStyle}>
                        <option value="both">Sopra e sotto</option>
                        <option value="top">Solo sopra</option>
                        <option value="bottom">Solo sotto</option>
                        <option value="none">Nessuno</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ marginTop: '1rem' }}>
                    <BgSlider label="Ampiezza sfumatura bordi" value={bg.fadeSize} min={0} max={45} step={1} unit="%" onChange={v => patchBg(slot, { fadeSize: v })} />
                  </div>
                  {slot === 'footer' && (
                    <div style={{ marginTop: '1.4rem', paddingTop: '1.2rem', borderTop: '1px solid rgba(201,168,76,0.25)' }}>
                      <p style={{ ...labelStyle, color: '#e8d9b0', marginBottom: '0.4rem' }}>TRASPARENZA DEI RIQUADRI DEL FOOTER</p>
                      <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#9a8a78', fontSize: '0.8rem', margin: '0 0 1rem', lineHeight: 1.4 }}>I riquadri che contengono testi, contatti e loghi. A 0 sono completamente trasparenti: lo sfondo si vede tutto (il testo resta leggibile grazie all'alone). L'anteprima sopra mostra l'effetto in tempo reale.</p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '0.9rem' }}>
                        {([['Trasparenti', 0], ['Leggeri', 0.15], ['Medi', 0.35], ['Pieni', 0.8]] as [string, number][]).map(([n, v]) => (
                          <button key={n} onClick={() => updateSettings({ footerGlass: v } as Partial<SiteSettings>)} style={{ ...btnGhost, fontSize: '0.44rem', padding: '0.3rem 0.6rem', borderColor: Math.abs((settings.footerGlass ?? FOOTER_GLASS_DEFAULTS.glass) - v) < 0.005 ? '#c9a84c' : undefined }}>{n}</button>
                        ))}
                      </div>
                      <BgSlider label="Opacità riquadri (0 = trasparenti)" value={settings.footerGlass ?? FOOTER_GLASS_DEFAULTS.glass} onChange={v => updateSettings({ footerGlass: v } as Partial<SiteSettings>)} />
                      <BgSlider label="Sfocatura dello sfondo dietro ai riquadri" value={settings.footerGlassBlur ?? FOOTER_GLASS_DEFAULTS.blur} min={0} max={24} step={1} unit="px" onChange={v => updateSettings({ footerGlassBlur: v } as Partial<SiteSettings>)} />
                      <BgSlider label="Bordo dei riquadri" value={settings.footerGlassBorder ?? FOOTER_GLASS_DEFAULTS.border} onChange={v => updateSettings({ footerGlassBorder: v } as Partial<SiteSettings>)} />
                      <button onClick={() => updateSettings({ footerGlass: undefined, footerGlassBlur: undefined, footerGlassBorder: undefined } as Partial<SiteSettings>)} style={{ ...btnGhost, fontSize: '0.44rem', padding: '0.3rem 0.6rem' }}>↺ Ripristina riquadri</button>
                    </div>
                  )}
                  {def.url && bg.url !== def.url && !bg.url.startsWith('data:') && bg.url && (
                    <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#9a8a78', fontSize: '0.75rem', marginTop: '0.8rem', marginBottom: 0 }}>Predefinita: <code>{def.url}</code></p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <div style={{ ...cardStyle, marginTop: '2rem' }}>
        <p style={{ ...labelStyle, color: '#c9a84c', marginBottom: '1.2rem' }}>MAPPA GOOGLE · DOVE SIAMO</p>
        <label style={labelStyle}>Tipo di mappa</label>
        <select value={mapType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateSettings({ mapType: e.target.value } as Partial<SiteSettings>)} style={{ ...inputStyle, marginBottom: '1rem' }}>
          <option value="k">Satellitare (foto reali)</option>
          <option value="h">Satellitare con nomi delle vie</option>
          <option value="m">Stradale</option>
        </select>
        <label style={labelStyle}>URL embed generato</label>
        <input readOnly value={buildMapsEmbed(settings)} style={{ ...inputStyle, fontSize: '0.72rem', opacity: 0.75 }} />
        <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#9a8a78', fontSize: '0.82rem', marginTop: '0.6rem', lineHeight: 1.5 }}>
          L'URL si costruisce dall'indirizzo in Impostazioni. Funziona senza chiave API Google.
        </p>
      </div>
    </div>
  )
}

// ─── Aspetto Visivo ───────────────────────────────────────────────────────────
function AspettoAdmin() {
  const { settings, updateSettings } = useApp()
  // local mirrors settings for image URLs (heavy, saved explicitly)
  // numeric/visual props are written directly to context on change (live)
  const [local, setLocal] = useState({ ...settings })
  const [saved, setSaved] = useState(false)

  // Keep local in sync if settings change from outside (e.g. theme preset)
  useEffect(() => { setLocal(s => ({ ...s, ...settings })) }, [settings])

  // Save image URLs (heavy base64) explicitly
  const save = () => { updateSettings(withoutBgFields(local)); setSaved(true); setTimeout(() => setSaved(false), 2200) }

  // For numeric visual props: update local AND context immediately (live preview)
  const fLive = (k: keyof typeof local) => (v: unknown) => {
    setLocal(p => ({ ...p, [k]: v }))
    updateSettings({ [k]: v } as Partial<SiteSettings>)
  }
  // For image URLs: update only local (saved via button to avoid quota spam)
  const f = (k: keyof typeof local) => (v: unknown) => setLocal(p => ({ ...p, [k]: v }))

  const SliderRow = ({ label, k, min = 0, max = 1, step = 0.01 }: { label: string; k: keyof typeof local; min?: number; max?: number; step?: number }) => (
    <div style={{ marginBottom: '1.4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <label style={labelStyle}>{label}</label>
        <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.5rem', color: '#c9a84c' }}>{Number(local[k]).toFixed(2)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={Number(local[k])}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => fLive(k)(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: '#c9a84c', cursor: 'pointer', height: 3 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.42rem', color: '#6a5a4a' }}>{min} = invisibile</span>
        <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.42rem', color: '#6a5a4a' }}>{max} = massimo</span>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h3 style={{ ...sectionTitle, marginBottom: 0 }}>Aspetto visivo</h3>
        <button onClick={save} style={{ ...btnGold, background: saved ? '#6fcf97' : '#c9a84c' }}>
          {saved ? '✓ Applicato' : 'Salva e applica'}
        </button>
      </div>
      <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#6fcf97', fontSize: '0.82rem', marginBottom: '2rem', fontStyle: 'italic' }}>
        ⚡ Tutte le modifiche vengono applicate in tempo reale sulla landing page.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>
        {/* About */}
        <div style={{ ...cardStyle }}>
          <p style={{ ...labelStyle, color: '#c9a84c', marginBottom: '1.2rem' }}>SEZIONE CHI SIAMO</p>
          <SingleImageUpload
            label="Foto del negozio"
            value={local.aboutImageUrl}
            onChange={v => f('aboutImageUrl')(v)}
            aspectRatio="3/4"
            previewFilter={`sepia(${local.aboutImageSepia}) brightness(${local.aboutImageBrightness ?? 0.82}) opacity(${local.aboutImageOpacity ?? 1})`}
          />
          <SliderRow label="Effetto seppia foto chi siamo" k="aboutImageSepia" />
          <SliderRow label="Luminosità foto chi siamo" k="aboutImageBrightness" />
          <SliderRow label="Opacità foto chi siamo" k="aboutImageOpacity" />
        </div>

      </div>

      {/* Stats Chi Siamo */}
      <div style={{ ...cardStyle, marginTop: '1.5rem' }}>
        <p style={{ ...labelStyle, color: '#c9a84c', marginBottom: '1.2rem' }}>STATISTICHE CHI SIAMO</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Anni esperienza</label>
            <input type="number" value={local.statAnni} onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('statAnni')(Number(e.target.value))} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Oggetti (es. "500")</label>
            <input value={local.statOggetti} onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('statOggetti')(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Rating (es. "4.9")</label>
            <input value={local.statRating} onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('statRating')(e.target.value)} style={inputStyle} />
          </div>
        </div>
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={save} style={{ ...btnGold, background: saved ? '#6fcf97' : '#c9a84c' }}>
          {saved ? '✓ Applicato' : 'Salva e applica'}
        </button>
      </div>
    </div>
  )
}

// ─── Sconti & Promozioni ──────────────────────────────────────────────────────
function ScontiAdmin() {
  const { settings, updateSettings, catalog, setCatalog } = useApp()
  const [sconti, setSconti] = useState<import('../../context/AppContext').Sconto[]>(settings.sconti || [])
  const [saved, setSaved] = useState(false)
  const [editing, setEditing] = useState<import('../../context/AppContext').Sconto | null>(null)
  const [form, setForm] = useState<Partial<import('../../context/AppContext').Sconto>>({})
  const [selectingItems, setSelectingItems] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiMsg, setAiMsg] = useState('')

  // ── AI: scrive la descrizione cliente della promozione ──────────────────────
  const aiDescribePromo = async () => {
    const flash = (t: string) => { setAiMsg(t); setTimeout(() => setAiMsg(''), t.startsWith('⚠') ? 7000 : 2500) }
    const nome = (form.nome as string) || ''
    if (!nome) { flash('⚠ Inserisci prima il nome della promozione'); return }
    const tipo = (form.tipo as string) || 'percentuale'
    const val = Number(form.valore) || 0
    const detail = tipo === 'percentuale' ? `sconto del ${val}%` : tipo === 'fisso' ? `sconto fisso di ${val} euro` : tipo === 'spedizione_gratis' ? 'spedizione gratuita' : 'omaggio con l\'acquisto'
    const scad = form.dataScadenza ? `valida fino al ${form.dataScadenza}` : 'senza data di scadenza'
    setAiBusy(true)
    try {
      const out = await groqText(`Sei il copywriter di un negozio italiano di arredi vintage e bijoux. Scrivi la frase breve che i clienti leggeranno accanto alla promozione "${nome}": ${detail}, ${scad}. Tono caldo ed elegante, una sola frase, max 110 caratteri, in italiano. Non inventare condizioni non indicate. Rispondi con SOLO la frase.`, 200)
      f('descrizione')(out.replace(/^["'«“]+|["'»”]+$/g, '').trim())
      flash('✦ Descrizione generata ✓')
    } catch (e) { flash(aiErr(e)) }
    setAiBusy(false)
  }

  // Helper: update local state AND persist to context immediately
  const applySconti = (next: import('../../context/AppContext').Sconto[]) => {
    setSconti(next)
    updateSettings({ sconti: next })
  }

  const save = () => { updateSettings({ sconti }); setSaved(true); setTimeout(() => setSaved(false), 2200) }

  // ── Calcola prezzo scontato da stringa prezzo ──────────────────────────────
  const calcolaPrezzoScontato = (prezzo: string, tipo: string, valore: number): string | undefined => {
    if (!prezzo || prezzo === 'Su richiesta' || prezzo === 'On request') return undefined
    // Estrai numero dal prezzo (es. "€ 1.200", "1200", "€1200", "1.200,00")
    const cleaned = prezzo.replace(/[^\d,.]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.')
    const num = parseFloat(cleaned)
    if (isNaN(num) || num <= 0) return undefined
    if (tipo === 'percentuale') {
      const scontato = num * (1 - valore / 100)
      return `€ ${scontato.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    }
    if (tipo === 'fisso') {
      const scontato = Math.max(0, num - valore)
      return `€ ${scontato.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    }
    return undefined
  }

  // ── Applica sconto agli articoli selezionati ───────────────────────────────
  const applicaScontoAdArticoli = (sconto: import('../../context/AppContext').Sconto) => {
    const ids = new Set(sconto.articoliIds || [])
    const updated = catalog.map(item => {
      if (ids.has(item.id) && sconto.attivo) {
        const ps = calcolaPrezzoScontato(item.prezzo, sconto.tipo, sconto.valore)
        return {
          ...item,
          scontoId: sconto.id,
          prezzoScontato: ps,
          percentualeSconto: sconto.tipo === 'percentuale' ? sconto.valore : item.percentualeSconto,
        }
      }
      // Se l'articolo aveva questo sconto ma non è più nella lista, rimuovi
      if (item.scontoId === sconto.id && !ids.has(item.id)) {
        return { ...item, scontoId: undefined, prezzoScontato: undefined, percentualeSconto: undefined }
      }
      return item
    })
    setCatalog(updated)
  }

  // ── Rimuovi sconto da tutti gli articoli che lo portano ───────────────────
  const rimuoviScontoDaCatalogo = (scontoId: number) => {
    const updated = catalog.map(item =>
      item.scontoId === scontoId
        ? { ...item, scontoId: undefined, prezzoScontato: undefined, percentualeSconto: undefined }
        : item
    )
    setCatalog(updated)
  }

  const startNew = () => {
    const n = { id: Date.now(), nome: '', tipo: 'percentuale' as const, valore: 10, descrizione: '', attivo: true, visibileNelCatalogo: true, dataScadenza: '', codice: '', articoliIds: [] }
    setEditing(n); setForm(n); setSelectingItems(false)
  }

  const saveItem = () => {
    if (!editing) return
    const item = { ...editing, ...form, articoliIds: (form.articoliIds as number[]) || [] } as import('../../context/AppContext').Sconto
    const idx = sconti.findIndex(s => s.id === item.id)
    const next = idx >= 0 ? sconti.map((s, i) => i === idx ? item : s) : [...sconti, item]
    applySconti(next)
    // Applica automaticamente al catalogo
    applicaScontoAdArticoli(item)
    setEditing(null)
    setSelectingItems(false)
    setSaved(true); setTimeout(() => setSaved(false), 2200)
  }

  const toggle = (id: number) => {
    const next = sconti.map(s => s.id === id ? { ...s, attivo: !s.attivo } : s)
    applySconti(next)
    const s = next.find(x => x.id === id)!
    if (!s.attivo) rimuoviScontoDaCatalogo(id)
    else applicaScontoAdArticoli(s)
  }
  const remove = (id: number) => {
    if (!confirm('Eliminare questo sconto?')) return
    rimuoviScontoDaCatalogo(id)
    applySconti(sconti.filter(s => s.id !== id))
  }
  const f = (k: string) => (v: unknown) => setForm(p => ({ ...p, [k]: v }))

  const TIPO_LABELS: Record<string, string> = {
    percentuale: 'Percentuale (es. −15%)',
    fisso: 'Importo fisso (es. −€50)',
    spedizione_gratis: 'Spedizione gratuita',
    omaggio: 'Omaggio / regalo',
  }

  // Articoli disponibili per applicazione sconto (solo quelli con prezzo numerico o qualsiasi)
  const articoliDisponibili = catalog.filter(item => item.visibile)
  const articoliSelezionati: number[] = (form.articoliIds as number[]) || []

  const toggleArticolo = (id: number) => {
    const curr = articoliSelezionati
    const next = curr.includes(id) ? curr.filter(x => x !== id) : [...curr, id]
    f('articoliIds')(next)
  }

  const selectAll = () => f('articoliIds')(articoliDisponibili.map(a => a.id))
  const deselectAll = () => f('articoliIds')([])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h3 style={{ ...sectionTitle, marginBottom: 0 }}>Sconti & Promozioni ({sconti.length})</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={save} style={{ ...btnGold, background: saved ? '#6fcf97' : '#c9a84c' }}>
            {saved ? '✓ Applicato' : 'Salva e applica'}
          </button>
          <button onClick={startNew} style={{ ...btnGhost, color: '#c9a84c', borderColor: 'rgba(201,168,76,0.4)' }}>+ Nuovo sconto</button>
        </div>
      </div>
      <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#6fcf97', fontSize: '0.82rem', marginBottom: '1.5rem', fontStyle: 'italic' }}>
        ⚡ Crea uno sconto, seleziona gli articoli a cui applicarlo — il prezzo barrato viene calcolato automaticamente e mostrato nel catalogo.
      </p>

      {/* Preset precompilati */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.48rem', letterSpacing: '0.2em', color: '#9a8a78', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Preset rapidi →</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[
            { label: 'Saldi −10%', preset: { nome: 'Saldi', tipo: 'percentuale', valore: 10, descrizione: 'Sconto del 10% su pezzi selezionati', codice: 'SALDI10' } },
            { label: 'Saldi −20%', preset: { nome: 'Saldi Estivi', tipo: 'percentuale', valore: 20, descrizione: 'Sconto del 20% — offerta a tempo limitato', codice: 'SALDI20' } },
            { label: 'Saldi −30%', preset: { nome: 'Super Saldi', tipo: 'percentuale', valore: 30, descrizione: 'Sconto eccezionale del 30%', codice: 'SUPER30' } },
            { label: 'Oggetto del mese −15%', preset: { nome: 'Oggetto del Mese', tipo: 'percentuale', valore: 15, descrizione: 'Pezzo selezionato del mese con sconto speciale', codice: 'MESE15' } },
            { label: 'Prima visita −5%', preset: { nome: 'Prima Visita', tipo: 'percentuale', valore: 5, descrizione: 'Sconto di benvenuto per i nuovi clienti', codice: 'BENVENUTO' } },
            { label: 'Spedizione gratuita', preset: { nome: 'Spedizione Gratuita', tipo: 'spedizione_gratis', valore: 0, descrizione: 'Spedizione inclusa per acquisti selezionati', codice: '' } },
            { label: '€50 di sconto', preset: { nome: 'Sconto Fedeltà', tipo: 'fisso', valore: 50, descrizione: 'Sconto fisso di €50 per i clienti abituali', codice: 'FEDELTA50' } },
          ].map(({ label, preset }) => (
            <button
              key={label}
              onClick={() => {
                const n = { id: Date.now(), attivo: true, visibileNelCatalogo: true, dataScadenza: '', articoliIds: [], ...preset } as import('../../context/AppContext').Sconto
                setEditing(n); setForm(n); setSelectingItems(false)
              }}
              style={{ ...btnGhost, fontSize: '0.44rem', padding: '0.35rem 0.8rem', color: '#c9a84c', borderColor: 'rgba(201,168,76,0.25)' }}
            >{label}</button>
          ))}
        </div>
      </div>

      {sconti.length === 0 && !editing && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontFamily: 'Playfair Display, serif', color: '#9a8a78', fontSize: '1.1rem', marginBottom: 8 }}>Nessuna promozione configurata</p>
          <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#6a5a4a', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Scegli un preset sopra o crea uno sconto personalizzato.</p>
          <button onClick={startNew} style={btnGold}>+ Crea sconto personalizzato</button>
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <div style={{ ...cardStyle, marginBottom: '1.5rem', border: '1px solid rgba(201,168,76,0.3)' }}>
          <p style={{ ...labelStyle, color: '#c9a84c', marginBottom: '1.2rem' }}>
            {sconti.find(s => s.id === editing.id) ? 'MODIFICA SCONTO' : 'NUOVO SCONTO'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={labelStyle}>Nome promozione</label>
              <input value={(form.nome as string) || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('nome')(e.target.value)} style={inputStyle} placeholder="Es. Saldi estivi" />
            </div>
            <div>
              <label style={labelStyle}>Codice sconto (opzionale)</label>
              <input value={(form.codice as string) || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('codice')(e.target.value)} style={inputStyle} placeholder="Es. ESTATE25" />
            </div>
            <div>
              <label style={labelStyle}>Tipo di sconto</label>
              <select value={(form.tipo as string) || 'percentuale'} onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('tipo')(e.target.value)} style={inputStyle}>
                {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>
                {(form.tipo === 'percentuale') ? 'Valore %' : (form.tipo === 'fisso') ? 'Importo €' : 'Valore (opzionale)'}
              </label>
              <input type="number" min={0} value={(form.valore as number) || 0} onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('valore')(Number(e.target.value))} style={inputStyle} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Descrizione (visibile ai clienti)</label>
                <AiBtn loading={aiBusy} onClick={aiDescribePromo} label="✦ Scrivi con AI" />
              </div>
              <input value={(form.descrizione as string) || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('descrizione')(e.target.value)} style={inputStyle} placeholder="Es. Sconto valido fino al 31 agosto" />
              {aiMsg && <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.85rem', color: aiMsg.startsWith('⚠') ? '#eb5757' : '#6fcf97', margin: '0.4rem 0 0' }}>{aiMsg}</p>}
            </div>
            <div>
              <label style={labelStyle}>Data scadenza (opzionale)</label>
              <input type="date" value={(form.dataScadenza as string) || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('dataScadenza')(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input type="checkbox" id="sca" checked={!!(form.attivo ?? true)} onChange={e => f('attivo')(e.target.checked)} />
                <label htmlFor="sca" style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer' }}>Sconto attivo</label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input type="checkbox" id="scv" checked={!!(form.visibileNelCatalogo ?? true)} onChange={e => f('visibileNelCatalogo')(e.target.checked)} />
                <label htmlFor="scv" style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer' }}>Visibile nel catalogo</label>
              </div>
            </div>
          </div>

          {/* Selezione articoli */}
          <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <p style={{ ...labelStyle, color: '#eb5757', marginBottom: '0.2rem' }}>🏷 Articoli a cui applicare lo sconto</p>
                <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#6a5a4a', fontSize: '0.82rem', fontStyle: 'italic' }}>
                  {articoliSelezionati.length === 0 ? 'Nessun articolo selezionato — lo sconto non verrà applicato al catalogo' : `${articoliSelezionati.length} articolo/i selezionato/i`}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setSelectingItems(v => !v)} style={{ ...btnGhost, fontSize: '0.44rem', padding: '0.35rem 0.8rem', color: '#eb5757', borderColor: 'rgba(235,87,87,0.35)' }}>
                  {selectingItems ? 'Chiudi lista' : 'Seleziona articoli'}
                </button>
                {selectingItems && <>
                  <button onClick={selectAll} style={{ ...btnGhost, fontSize: '0.42rem', padding: '0.3rem 0.6rem', color: '#6fcf97' }}>Tutti</button>
                  <button onClick={deselectAll} style={{ ...btnGhost, fontSize: '0.42rem', padding: '0.3rem 0.6rem', color: '#9a8a78' }}>Nessuno</button>
                </>}
              </div>
            </div>

            {/* Anteprima articoli selezionati */}
            {!selectingItems && articoliSelezionati.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '0.75rem' }}>
                {articoliSelezionati.map(id => {
                  const art = catalog.find(a => a.id === id)
                  if (!art) return null
                  const ps = (form.tipo === 'percentuale' || form.tipo === 'fisso')
                    ? calcolaPrezzoScontato(art.prezzo, form.tipo as string, (form.valore as number) || 0)
                    : undefined
                  return (
                    <div key={id} style={{ background: 'rgba(235,87,87,0.08)', border: '1px solid rgba(235,87,87,0.25)', padding: '4px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.82rem', color: '#f5ede0' }}>{art.nome}</span>
                      {ps ? (
                        <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.4rem', color: '#eb5757' }}>
                          <span style={{ textDecoration: 'line-through', color: '#6a5a4a', marginRight: 4 }}>{art.prezzo}</span>
                          → {ps}
                        </span>
                      ) : (
                        <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.4rem', color: '#9a8a78' }}>{art.prezzo || 'Su richiesta'}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Lista di selezione */}
            {selectingItems && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, maxHeight: 340, overflowY: 'auto', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(201,168,76,0.1)' }}>
                {articoliDisponibili.map(item => {
                  const selected = articoliSelezionati.includes(item.id)
                  const ps = (form.tipo === 'percentuale' || form.tipo === 'fisso')
                    ? calcolaPrezzoScontato(item.prezzo, form.tipo as string, (form.valore as number) || 0)
                    : undefined
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleArticolo(item.id)}
                      style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '0.6rem 0.75rem', cursor: 'pointer', background: selected ? 'rgba(235,87,87,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${selected ? 'rgba(235,87,87,0.4)' : 'rgba(201,168,76,0.1)'}`, transition: 'background 0.2s, border-color 0.2s' }}
                    >
                      <div style={{ width: 14, height: 14, border: `1.5px solid ${selected ? '#eb5757' : 'rgba(201,168,76,0.4)'}`, background: selected ? '#eb5757' : 'transparent', flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {selected && <span style={{ color: '#fff', fontSize: 9, lineHeight: 1 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#f5ede0', fontSize: '0.88rem', lineHeight: 1.3, marginBottom: 2 }}>{item.nome}</p>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          {ps ? <>
                            <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.78rem', color: '#6a5a4a', textDecoration: 'line-through' }}>{item.prezzo}</span>
                            <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.82rem', color: '#eb5757', fontWeight: 700 }}>{ps}</span>
                          </> : (
                            <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.78rem', color: '#6a5a4a', fontStyle: 'italic' }}>{item.prezzo || 'Su richiesta'}</span>
                          )}
                          <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.38rem', letterSpacing: '0.1em', color: '#6a5a4a' }}>{item.categoria}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: '1rem' }}>
            <button onClick={saveItem} style={btnGold}>Salva e applica al catalogo</button>
            <button onClick={() => { setEditing(null); setSelectingItems(false) }} style={btnGhost}>Annulla</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {sconti.map(s => {
          const articoliCount = (s.articoliIds || []).length
          return (
            <div key={s.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.9rem 1.2rem', opacity: s.attivo ? 1 : 0.5, transition: 'opacity 0.3s' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.attivo ? '#6fcf97' : '#6a5a4a', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 3 }}>
                  <span style={{ fontFamily: 'Playfair Display, serif', color: '#f5ede0', fontSize: '1.05rem', fontWeight: 600 }}>{s.nome || 'Senza nome'}</span>
                  <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.55rem', letterSpacing: '0.12em', color: '#eb5757', background: 'rgba(235,87,87,0.15)', border: '1px solid rgba(235,87,87,0.4)', padding: '2px 8px', textTransform: 'uppercase', fontWeight: 700 }}>
                    {s.tipo === 'percentuale' ? `−${s.valore}%` : s.tipo === 'fisso' ? `−€${s.valore}` : s.tipo === 'spedizione_gratis' ? 'Spedizione gratis' : 'Omaggio'}
                  </span>
                  <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.52rem', letterSpacing: '0.1em', color: articoliCount > 0 ? '#6fcf97' : '#9a8a78' }}>
                    {articoliCount > 0 ? `${articoliCount} articolo/i` : 'nessun articolo'}
                  </span>
                  {s.codice && <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.5rem', color: '#c9a84c', letterSpacing: '0.1em', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', padding: '1px 6px' }}>cod: {s.codice}</span>}
                  {!s.visibileNelCatalogo && <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.4rem', color: '#6a5a4a' }}>· nascosto</span>}
                  {s.dataScadenza && <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.82rem', color: '#6a5a4a' }}>scade {s.dataScadenza}</span>}
                </div>
                {s.descrizione && <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#c8b89a', fontSize: '0.95rem', fontStyle: 'italic', marginTop: 4 }}>{s.descrizione}</p>}
                {/* Articoli applicati */}
                {articoliCount > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                    {(s.articoliIds || []).slice(0, 5).map(id => {
                      const art = catalog.find(a => a.id === id)
                      return art ? (
                        <span key={id} style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.78rem', color: '#9a8a78', background: 'rgba(235,87,87,0.06)', border: '1px solid rgba(235,87,87,0.15)', padding: '1px 7px' }}>{art.nome}</span>
                      ) : null
                    })}
                    {articoliCount > 5 && <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.78rem', color: '#6a5a4a', fontStyle: 'italic' }}>+{articoliCount - 5} altri</span>}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button onClick={() => toggle(s.id)} style={{ ...btnGhost, fontSize: '0.44rem', padding: '0.35rem 0.7rem', color: s.attivo ? '#9a8a78' : '#6fcf97' }}>{s.attivo ? 'Disattiva' : 'Attiva'}</button>
                <button onClick={() => { setEditing(s); setForm({ ...s }); setSelectingItems(false) }} style={{ ...btnGhost, fontSize: '0.44rem', padding: '0.35rem 0.7rem', color: '#c9a84c' }}>Modifica</button>
                <button onClick={() => remove(s.id)} style={{ ...btnDanger, fontSize: '0.44rem', padding: '0.35rem 0.7rem' }}>Elimina</button>
              </div>
            </div>
          )
        })}
      </div>

      {sconti.length > 0 && (
        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={save} style={{ ...btnGold, background: saved ? '#6fcf97' : '#c9a84c' }}>
            {saved ? '✓ Applicato sulla landing' : 'Salva e applica'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Banner ───────────────────────────────────────────────────────────────────
function BannerAdmin() {
  const { settings, updateSettings } = useApp()
  const [local, setLocal] = useState({ bannerAttivo: settings.bannerAttivo, bannerTesto: settings.bannerTesto, bannerColore: settings.bannerColore })
  const [saved, setSaved] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiToast, setAiToast] = useState('')

  const showAiToast = (msg: string) => { setAiToast(msg); setTimeout(() => setAiToast(''), msg.startsWith('⚠') ? 7000 : 2500) }

  useEffect(() => { setLocal(l => ({ ...l, bannerAttivo: settings.bannerAttivo, bannerTesto: settings.bannerTesto, bannerColore: settings.bannerColore })) }, [settings.bannerAttivo, settings.bannerTesto, settings.bannerColore])

  const save = () => { updateSettings(local); setSaved(true); setTimeout(() => setSaved(false), 2200) }
  // Live: writes both local and context
  const f = (k: keyof typeof local) => (v: unknown) => {
    setLocal(p => ({ ...p, [k]: v }))
    updateSettings({ [k]: v } as Partial<SiteSettings>)
  }

  // ── AI: genera testo banner ─────────────────────────────────────────────
  const aiGenerateBanner = async () => {
    setAiLoading(true)
    try {
      const result = await groqText(`Sei un copywriter per un negozio italiano di arredi vintage e bijoux. Genera 3 testi alternativi per un banner di annuncio in cima alla pagina web.
Rispondi SOLO con un JSON array valido, senza markdown:
[{"testo":"..."},{"testo":"..."},{"testo":"..."}]

Regole:
- Ogni testo 80-120 caratteri (non meno di 60)
- Usa un'emoji all'inizio (🎁 💎 🏛️ ✨ 🔔 🏷️ ecc.)
- Varia i temi: offerta stagionale, novità in arrivo, eventi in negozio, orari straordinari
- Includi un invito all'azione esplicito (es. "Contattaci", "Scopri", "Prenota", "Visita")
- Tono elegante ma concreto, non vago`)
      const cleaned = result.replace(/```json|```/g, '').trim()
      const parsed = extractJson(cleaned)
      if (Array.isArray(parsed) && parsed[0]?.testo) {
        // applica il primo, mostra tutti in toast
        const testoScelto = parsed[0].testo
        setLocal(p => ({ ...p, bannerTesto: testoScelto }))
        updateSettings({ bannerTesto: testoScelto } as Partial<SiteSettings>)
        showAiToast(`✦ Banner generato ✓ — Hai 3 varianti disponibili`)
      }
    } catch (e) {
      showAiToast(aiErr(e))
    }
    setAiLoading(false)
  }

  const PRESETS = [
    { label: 'Arancio', value: '#c4561f' },
    { label: 'Rosso promozione', value: '#c0392b' },
    { label: 'Verde evento', value: '#27ae60' },
    { label: 'Blu info', value: '#2980b9' },
    { label: 'Viola', value: '#8e44ad' },
  ]

  return (
    <div style={{ maxWidth: 700 }}>
      {aiToast && <div style={{ position: 'fixed', top: 80, right: 24, zIndex: 999999, maxWidth: 'calc(100vw - 48px)', lineHeight: 1.5, wordBreak: 'break-word', background: '#1c1510', border: '1px solid rgba(201,168,76,0.3)', padding: '0.8rem 1.4rem', fontFamily: 'Cinzel, serif', fontSize: '0.55rem', letterSpacing: '0.15em', color: '#6fcf97' }}>{aiToast}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h3 style={{ ...sectionTitle, marginBottom: 0 }}>Banner annunci</h3>
        <button onClick={save} style={{ ...btnGold, background: saved ? '#6fcf97' : '#c9a84c' }}>
          {saved ? '✓ Applicato' : 'Salva e applica'}
        </button>
      </div>
      <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#6fcf97', fontSize: '0.82rem', marginBottom: '2rem', fontStyle: 'italic' }}>
        ⚡ Il banner compare in cima alla pagina, sopra la hero. Utile per annunci, promozioni, chiusure straordinarie.
      </p>

      <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,168,76,0.08)' }}>
          <div style={{ flex: 1, fontFamily: 'Cormorant Garamond, serif', color: '#f5ede0', fontSize: '0.95rem' }}>Banner attivo (visibile sulla landing)</div>
          <button onClick={() => f('bannerAttivo')(!local.bannerAttivo)} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative', background: local.bannerAttivo ? '#c9a84c' : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }}>
            <div style={{ position: 'absolute', top: 3, left: local.bannerAttivo ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: local.bannerAttivo ? '#0a0805' : '#9a8a78', transition: 'left 0.3s' }} />
          </button>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 }}>
            <label style={labelStyle}>Testo del banner</label>
            <AiBtn loading={aiLoading} onClick={aiGenerateBanner} label="✦ Genera con AI" />
          </div>
          <input value={local.bannerTesto} onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('bannerTesto')(e.target.value)} style={inputStyle} placeholder="Es. 🎁 Valutazioni eredità gratuite — Contattaci per un appuntamento" />
          <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.8rem', color: '#6a5a4a', marginTop: 4 }}>Puoi usare emoji per rendere il banner più visivo.</p>
        </div>

        <div>
          <label style={labelStyle}>Colore di sfondo</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '0.8rem', marginTop: 6 }}>
            {PRESETS.map(p => (
              <button key={p.value} onClick={() => f('bannerColore')(p.value)} style={{ ...btnGhost, fontSize: '0.46rem', padding: '0.4rem 0.9rem', borderColor: local.bannerColore === p.value ? p.value : 'rgba(201,168,76,0.2)', color: local.bannerColore === p.value ? p.value : '#9a8a78' }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: p.value, marginRight: 4, verticalAlign: 'middle' }} />
                {p.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="color" value={local.bannerColore} onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('bannerColore')(e.target.value)} style={{ width: 40, height: 32, border: 'none', cursor: 'pointer', background: 'none' }} />
            <input value={local.bannerColore} onChange={(e: React.ChangeEvent<HTMLInputElement>) => f('bannerColore')(e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="#c9a84c" />
          </div>
        </div>
      </div>

      {/* Anteprima banner */}
      <div>
        <p style={{ ...labelStyle, marginBottom: 8 }}>ANTEPRIMA</p>
        <div style={{ background: local.bannerAttivo ? local.bannerColore : '#2d2318', color: local.bannerAttivo ? '#0a0805' : '#6a5a4a', padding: '0.7rem 2rem', textAlign: 'center', fontFamily: 'Cinzel, serif', fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase', opacity: local.bannerAttivo ? 1 : 0.4, transition: 'all 0.3s', border: local.bannerAttivo ? 'none' : '1px dashed rgba(201,168,76,0.2)' }}>
          {local.bannerTesto || (local.bannerAttivo ? '← inserisci un testo' : 'Banner non attivo')}
        </div>
      </div>
    </div>
  )
}

// ─── Arte 3D: sostituzione modello + testi ───────────────────────────────
function PoltronaAdmin() {
  const { settings, updateSettings } = useApp()
  const [lang, setLang] = useState<'it' | 'en'>('it')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [urlDraft, setUrlDraft] = useState(settings.armchairModelUrl || '')
  const [aiBusy, setAiBusy] = useState(false)
  const [chMsg, setChMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const rev = settings.armchairRev || 0
  const custom = (settings.armchairChapters?.[lang] || []) as { k: string; t: string; d: string }[]
  const defaults = DEFAULT_CHAPTERS[lang]
  const labelDefault = DEFAULT_LABEL[lang]

  const setChapter = (i: number, patch: Partial<{ k: string; t: string; d: string }>) => {
    const base = defaults.map((_, n) => ({ k: '', t: '', d: '', ...(custom[n] || {}) }))
    base[i] = { ...base[i], ...patch }
    updateSettings({ armchairChapters: { ...(settings.armchairChapters || {}), [lang]: base } } as Partial<SiteSettings>)
  }
  // ── AI: riscrive i 4 capitoli (IT) oppure li traduce dall'italiano (EN) ────
  const aiWriteChapters = async () => {
    const itCustom = (settings.armchairChapters?.it || []) as { k: string; t: string; d: string }[]
    const source = DEFAULT_CHAPTERS.it.map((d, n) => ({ k: itCustom[n]?.k || d.k, t: itCustom[n]?.t || d.t, d: itCustom[n]?.d || d.d }))
    const itLabel = settings.armchairLabels?.it || DEFAULT_LABEL.it
    setAiBusy(true); setChMsg(null)
    try {
      const task = lang === 'en'
        ? 'Traduci in inglese elegante (tono da catalogo per collezionisti) etichetta e 4 capitoli, mantenendo significato e ordine.'
        : `Riscrivi etichetta e 4 capitoli in italiano elegante e evocativo per la sezione 3D del sito del negozio "${settings.siteName || 'negozio vintage'}" (arredi vintage e bijoux). Mantieni l'argomento di ogni capitolo, non inventare dati, date o marchi.`
      const out = await groqText(`${task}
Rispondi SOLO con JSON valido, senza markdown, in questo formato esatto:
{"label":"...","chapters":[{"k":"...","t":"...","d":"..."},{"k":"...","t":"...","d":"..."},{"k":"...","t":"...","d":"..."},{"k":"...","t":"...","d":"..."}]}
Limiti: label max 30 caratteri; k (etichetta breve) max 20; t (titolo) max 40; d (descrizione) max 220 caratteri.

Testo di partenza:
${JSON.stringify({ label: itLabel, chapters: source })}`, 1200)
      const parsed = extractJson<any>(out)
      const chs = Array.isArray(parsed?.chapters) ? parsed.chapters : []
      if (chs.length !== 4) throw new Error('L\'AI non ha restituito 4 capitoli. Riprova.')
      const clean = chs.map((c: any) => ({ k: String(c.k || '').trim(), t: String(c.t || '').trim(), d: String(c.d || '').trim() }))
      updateSettings({
        armchairChapters: { ...(settings.armchairChapters || {}), [lang]: clean },
        armchairLabels: { ...(settings.armchairLabels || {}), [lang]: String(parsed.label || '').trim() },
      } as Partial<SiteSettings>)
      setChMsg({ ok: true, text: lang === 'en' ? '✦ Capitoli tradotti in inglese ✓' : '✦ Capitoli riscritti ✓ (controllali e correggi se serve)' })
    } catch (e) { setChMsg({ ok: false, text: aiErr(e) }) }
    setAiBusy(false)
  }
  const setLabel = (v: string) => updateSettings({ armchairLabels: { ...(settings.armchairLabels || {}), [lang]: v } } as Partial<SiteSettings>)
  const resetTexts = () => updateSettings({ armchairChapters: { ...(settings.armchairChapters || {}), [lang]: [] }, armchairLabels: { ...(settings.armchairLabels || {}), [lang]: '' } } as Partial<SiteSettings>)

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    if (!/\.glb$/i.test(f.name)) { setMsg({ ok: false, text: 'Serve un file .glb (formato binario unico, con texture incluse).' }); return }
    if (f.size > 80 * 1024 * 1024) { setMsg({ ok: false, text: 'File troppo grande (massimo 80 MB). Comprimi il modello e riprova.' }); return }
    const magic = new TextDecoder().decode(new Uint8Array(await f.slice(0, 4).arrayBuffer()))
    if (magic !== 'glTF') { setMsg({ ok: false, text: 'Il file non sembra un .glb valido.' }); return }
    setBusy(true); setMsg(null)
    // prova di lettura PRIMA di sostituire il modello attuale: se il file non è valido resta quello in uso
    const check = await validateGlb(f)
    if (!check.ok) { setMsg({ ok: false, text: check.error + ' Il modello attuale non è stato modificato.' }); setBusy(false); return }
    // Pubblica il file sul server (Netlify Blobs): da quel momento lo vedono TUTTI i visitatori
    setMsg({ ok: true, text: 'Caricamento sul server in corso… non chiudere la pagina.' })
    const up = await adminUploadAsset(f, 'model/gltf-binary', f.name, (d, t) => setMsg({ ok: true, text: `Caricamento sul server… ${d}/${t}` }))
    if (up.ok) {
      await clearLocalModel(); setUrlDraft('')
      updateSettings({ armchairModelAsset: { id: up.id, parts: up.parts, name: f.name }, armchairLocalName: '', armchairModelUrl: '', armchairRev: rev + 1 } as Partial<SiteSettings>)
      setMsg({ ok: true, text: `Modello "${f.name}" pubblicato (${(f.size / 1048576).toFixed(1)} MB, ${check.meshes} parti): ora lo vedono tutti i visitatori. Viene centrato e appoggiato a terra in automatico.` })
    } else {
      // Senza server (sviluppo locale / sessione scaduta) resta solo su questo dispositivo, e te lo dico chiaramente
      try {
        await saveLocalModel(f); setUrlDraft('')
        updateSettings({ armchairModelAsset: null, armchairLocalName: f.name, armchairModelUrl: '', armchairRev: rev + 1 } as Partial<SiteSettings>)
        setMsg({ ok: false, text: `⚠ ${up.message} Il modello è visibile SOLO su questo dispositivo: rifai il login e ricaricalo per pubblicarlo.` })
      } catch {
        setMsg({ ok: false, text: `${up.message} E non è stato possibile tenerlo nemmeno nel browser (memoria piena o navigazione privata).` })
      }
    }
    setBusy(false)
  }
  const commitUrl = async () => {
    const v = urlDraft.trim()
    if (v === (settings.armchairModelUrl || '')) return
    await clearLocalModel()
    updateSettings({ armchairModelUrl: v, armchairModelAsset: null, armchairLocalName: '', armchairRev: rev + 1 } as Partial<SiteSettings>)
    setMsg({ ok: true, text: v ? 'URL del modello aggiornato.' : 'Tornato al modello di default.' })
  }
  const resetModel = async () => {
    await clearLocalModel(); setUrlDraft('')
    updateSettings({ armchairModelAsset: null, armchairLocalName: '', armchairModelUrl: '', armchairRev: rev + 1 } as Partial<SiteSettings>)
    setMsg({ ok: true, text: 'Ripristinato il modello di default.' })
  }

  const usingAsset = !!settings.armchairModelAsset
  const usingLocal = !usingAsset && !!settings.armchairLocalName
  const usingUrl = !!settings.armchairModelUrl
  return (
    <div>
      <h3 style={{ ...sectionTitle, marginBottom: '0.5rem' }}>Arte 3D</h3>
      <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#6fcf97', fontSize: '0.82rem', marginBottom: '1.6rem', fontStyle: 'italic' }}>
        ⚡ Modello e testi si aggiornano in tempo reale sulla landing.
      </p>

      <div style={{ ...cardStyle, marginBottom: '2rem' }}>
        <p style={{ ...labelStyle, color: '#c9a84c', marginBottom: '1rem' }}>MODELLO 3D (.GLB)</p>
        <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#e8dcc8', fontSize: '0.95rem', marginBottom: '1rem' }}>
          In uso: <b>{usingAsset ? `file pubblicato · ${settings.armchairModelAsset!.name}` : usingLocal ? `file SOLO su questo dispositivo · ${settings.armchairLocalName}` : usingUrl ? 'file da URL' : 'modello di default'}</b>
        </p>
        <input ref={fileRef} type="file" accept=".glb,model/gltf-binary" onChange={onFile} style={{ display: 'none' }} />
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '1.4rem' }}>
          <button onClick={() => fileRef.current?.click()} disabled={busy} style={{ ...btnGold, opacity: busy ? 0.5 : 1 }}>{busy ? 'Caricamento…' : '⬆ Sostituisci file 3D'}</button>
          {(usingAsset || usingLocal || usingUrl) && <button onClick={resetModel} style={btnGhost}>↺ Modello di default</button>}
        </div>

        <label style={labelStyle}>Oppure URL pubblico di un .glb</label>
        <input value={urlDraft} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrlDraft(e.target.value)} onBlur={commitUrl}
          onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          placeholder="https://… oppure /models/mio-modello.glb" style={{ ...inputStyle, marginBottom: '0.8rem' }} />

        {msg && <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.88rem', color: msg.ok ? '#6fcf97' : '#eb5757', marginBottom: '0.8rem' }}>{msg.text}</p>}
        <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#9a8a78', fontSize: '0.84rem', lineHeight: 1.55 }}>
          Il modello viene centrato, scalato e appoggiato a terra in automatico. Usa un <code>.glb</code> unico (texture incluse, niente Draco), meglio sotto i 10 MB. Funziona con qualsiasi oggetto: sedia, scultura, lampada…<br />
          Il file caricato qui viene pubblicato sul server e lo vedono <b>tutti i visitatori</b>. In alternativa puoi usare un URL pubblico, oppure sostituire <code>public/models/armchair.glb</code> nel progetto.
        </p>
      </div>

      <div style={{ ...cardStyle }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '1.2rem' }}>
          <p style={{ ...labelStyle, color: '#c9a84c', margin: 0 }}>DESCRIZIONI</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['it', 'en'] as const).map(l => (
              <button key={l} onClick={() => setLang(l)} style={{ ...btnGhost, padding: '0.35rem 0.9rem', ...(lang === l ? { color: '#0a0805', background: '#c9a84c', borderColor: '#c9a84c' } : {}) }}>{l.toUpperCase()}</button>
            ))}
            <button onClick={resetTexts} style={{ ...btnGhost, padding: '0.35rem 0.9rem' }}>↺ Default</button>
            <AiBtn loading={aiBusy} onClick={aiWriteChapters} label={lang === 'en' ? '✦ Traduci da IT' : '✦ Riscrivi con AI'} />
          </div>
        </div>
        <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#9a8a78', fontSize: '0.84rem', marginBottom: '1.2rem', lineHeight: 1.5 }}>
          I 4 capitoli seguono la rotazione della camera durante lo scroll. Campo vuoto = testo di default (mostrato in grigio).
        </p>
        {chMsg && <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.9rem', color: chMsg.ok ? '#6fcf97' : '#eb5757', marginBottom: '1rem' }}>{chMsg.text}</p>}

        <label style={labelStyle}>Etichetta sezione</label>
        <input value={settings.armchairLabels?.[lang] || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLabel(e.target.value)} placeholder={labelDefault} style={{ ...inputStyle, marginBottom: '1.6rem' }} />

        {defaults.map((d, i) => (
          <div key={i} style={{ borderTop: '1px solid rgba(201,168,76,0.12)', paddingTop: '1.2rem', marginBottom: '1.4rem' }}>
            <p style={{ ...labelStyle, color: '#c9a84c' }}>CAPITOLO {i + 1}</p>
            <label style={labelStyle}>Etichetta breve</label>
            <input value={custom[i]?.k || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChapter(i, { k: e.target.value })} placeholder={d.k} style={{ ...inputStyle, marginBottom: '0.8rem' }} />
            <label style={labelStyle}>Titolo</label>
            <input value={custom[i]?.t || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChapter(i, { t: e.target.value })} placeholder={d.t} style={{ ...inputStyle, marginBottom: '0.8rem' }} />
            <label style={labelStyle}>Descrizione</label>
            <textarea value={custom[i]?.d || ''} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setChapter(i, { d: e.target.value })} placeholder={d.d} rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Accreditamenti nel footer (4 slot: 2 sopra + 2 sotto) ───────────────────
function AccreditiAdmin() {
  const { settings, updateSettings } = useApp()
  const list = Array.from({ length: 4 }, (_, i) => ({ name: '', logoUrl: '', link: '', ...((settings.accreditations || [])[i] || {}) }))
  const patch = (i: number, p: Partial<{ name: string; logoUrl: string; link: string }>) => {
    const next = list.map((a, n) => n === i ? { ...a, ...p } : a)
    updateSettings({ accreditations: next } as Partial<SiteSettings>)
  }
  return (
    <div>
      <h3 style={{ ...sectionTitle, marginBottom: '0.5rem' }}>Accreditamenti &amp; garanzie</h3>
      <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#9a8a78', fontSize: '0.88rem', marginBottom: '1.8rem', lineHeight: 1.55 }}>
        Fino a 4 loghi mostrati nel footer, 2 sopra e 2 sotto. I visitatori vedono solo gli slot con un logo; gli slot vuoti compaiono tratteggiati solo a te (admin).
        Inserisci solo enti di cui il negozio è davvero iscritto/accreditato. Per mostrare i loghi a <b>tutti</b> usa un URL o un file in <code>public/</code> (es. <code>/accreditamenti/ente1.png</code>): le immagini caricate qui restano nel browser dell'admin.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.6rem' }}>
        {list.map((a, i) => (
          <div key={i} style={cardStyle}>
            <p style={{ ...labelStyle, color: '#c9a84c', marginBottom: '1rem' }}>ENTE {i + 1}</p>
            <label style={labelStyle}>Nome ente</label>
            <input value={a.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => patch(i, { name: e.target.value })} placeholder="es. nome dell'associazione" style={{ ...inputStyle, marginBottom: '0.8rem' }} />
            <SingleImageUpload label="Logo" value={a.logoUrl} onChange={v => patch(i, { logoUrl: v })} aspectRatio="3/2" />
            <label style={labelStyle}>Link (facoltativo, pagina di verifica dell'ente)</label>
            <input value={a.link} onChange={(e: React.ChangeEvent<HTMLInputElement>) => patch(i, { link: e.target.value })} placeholder={/antiquari\s*d['’]?\s*italia/i.test(a.name) ? 'https://www.antiquariditalia.it/it' : 'https://…'} style={inputStyle} />
            {a.logoUrl && <button onClick={() => patch(i, { name: '', logoUrl: '', link: '' })} style={{ ...btnGhost, marginTop: '1rem', fontSize: '0.5rem' }}>✕ Svuota slot</button>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Cambio password admin ───────────────────────────────────────────────────
function PasswordAdmin() {
  const [cur, setCur] = useState('')
  const [nw, setNw] = useState('')
  const [nw2, setNw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const MIN = 12
  const submit = async () => {
    setMsg(null)
    if (nw.length < MIN) return setMsg({ ok: false, text: `La nuova password deve avere almeno ${MIN} caratteri.` })
    if (nw !== nw2) return setMsg({ ok: false, text: 'Le due password nuove non coincidono.' })
    if (nw === cur) return setMsg({ ok: false, text: 'La nuova password deve essere diversa da quella attuale.' })
    setBusy(true)
    const r = await changeAdminPassword(cur, nw)
    setBusy(false)
    if (r.ok) { setCur(''); setNw(''); setNw2(''); setMsg({ ok: true, text: '✓ Password cambiata. Da ora usa quella nuova per entrare; gli altri dispositivi dovranno rifare il login.' }) }
    else setMsg({ ok: false, text: r.message })
  }
  return (
    <div style={{ maxWidth: 520 }}>
      <h3 style={{ ...sectionTitle, marginBottom: '0.5rem' }}>Password admin</h3>
      <p style={{ fontFamily: 'Cormorant Garamond, serif', color: '#9a8a78', fontSize: '0.88rem', marginBottom: '1.6rem', lineHeight: 1.55 }}>
        Cambia qui la password del pannello. La nuova password viene salvata sul server in forma cifrata (non nel Gist e non nel sito) e sostituisce quella impostata su Netlify.
        Se la dimentichi, su Netlify imposta <code>ADMIN_PASSWORD_FORCE_ENV=1</code> per tornare a <code>ADMIN_PASSWORD</code>.
      </p>
      <div style={cardStyle}>
        <label style={labelStyle}>Password attuale</label>
        <input type="password" autoComplete="current-password" value={cur} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCur(e.target.value)} style={{ ...inputStyle, marginBottom: '0.9rem' }} />
        <label style={labelStyle}>Nuova password (almeno {MIN} caratteri)</label>
        <input type="password" autoComplete="new-password" value={nw} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNw(e.target.value)} style={{ ...inputStyle, marginBottom: '0.9rem' }} />
        <label style={labelStyle}>Ripeti la nuova password</label>
        <input type="password" autoComplete="new-password" value={nw2} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNw2(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} style={{ ...inputStyle, marginBottom: '1.1rem' }} />
        <button onClick={submit} disabled={busy || !cur || !nw || !nw2} style={{ ...btnGold, opacity: busy || !cur || !nw || !nw2 ? 0.55 : 1 }}>{busy ? 'Salvataggio…' : 'Cambia password'}</button>
        {msg && <p role="alert" style={{ marginTop: '1rem', color: msg.ok ? '#6fcf97' : '#eb5757', fontSize: '0.88rem', lineHeight: 1.5 }}>{msg.text}</p>}
      </div>
      {import.meta.env.DEV && <p style={{ marginTop: '1rem', color: '#9a8a78', fontSize: '0.8rem' }}>In sviluppo (npm run dev) la password è «dev» e non si può cambiare da qui.</p>}
    </div>
  )
}

// ─── AI Assistant Panel ───────────────────────────────────────────────────────
const NAV_ITEMS: { id: AdminTab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'catalog', label: 'Catalogo', icon: '🏺' },
  { id: 'reviews', label: 'Recensioni', icon: '⭐' },
  { id: 'media', label: 'Perizia AI', icon: '✦', iconColor: '#c9a84c' },
  { id: 'analytics', label: 'Statistiche', icon: '📊' },
  { id: 'orari', label: 'Orari', icon: '🕐' },
  { id: 'aspetto', label: 'Aspetto', icon: '🎨' },
  { id: 'sfondi', label: 'Sfondi & Mappa', icon: '🖼' },
  { id: 'poltrona', label: 'Arte 3D', icon: '🗿' },
  { id: 'accrediti', label: 'Accreditamenti', icon: '🏅' },
  { id: 'sconti', label: 'Sconti', icon: '🏷' },
  { id: 'banner', label: 'Banner', icon: '📢' },
  { id: 'seo', label: 'SEO', icon: '🔍' },
  { id: 'settings', label: 'Impostazioni', icon: '⚙️' },
]

// ─── Main AdminPanel ──────────────────────────────────────────────────────────
export default function AdminPanel() {
  const { isAdmin, setIsAdmin, catalog, reviews, gistSyncStatus, gistSyncMessage } = useApp()
  const [open, setOpen] = useState(false)
  const [loginVisible, setLoginVisible] = useState(false)
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [storageWarning, setStorageWarning] = useState(false)

  // Monitor localStorage usage and show warning when >75% full
  useEffect(() => {
    const checkStorage = () => {
      try {
        let total = 0
        for (const k in localStorage) {
          if (Object.prototype.hasOwnProperty.call(localStorage, k)) {
            total += (localStorage[k].length * 2) // UTF-16
          }
        }
        setStorageWarning(total > 3_800_000) // warn at ~3.8MB (limit is ~5MB)
      } catch {}
    }
    checkStorage()
    window.addEventListener('mnt-storage-full', () => setStorageWarning(true))
    const interval = setInterval(checkStorage, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleAdminClick = () => { if (isAdmin) setOpen(true); else setLoginVisible(true) }
  const handleLogin = () => { setIsAdmin(true); setLoginVisible(false); setOpen(true) }
  const close = () => setOpen(false)
  const logout = () => { clearAdminToken(); setIsAdmin(false); setOpen(false) }

  const clearImageStorage = () => {
    // Remove base64 images from catalog items to free space
    const mntMedia = localStorage.getItem('mnt_media')
    if (mntMedia) localStorage.removeItem('mnt_media')
    alert('Cache immagini media liberata. Le immagini caricate nella libreria media sono state rimosse. Le immagini dei prodotti nel catalogo restano intatte.')
    setStorageWarning(false)
  }

  return (
    <>
      <button onClick={handleAdminClick} style={{ position: 'fixed', bottom: 24, left: 24, zIndex: 99999, background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.12)', color: 'rgba(201,168,76,0.35)', width: 28, height: 28, fontFamily: 'Cinzel, serif', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Admin Panel" aria-label="Admin">⚙</button>

      <AnimatePresence>
        {loginVisible && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><AdminLogin onLogin={handleLogin} onClose={() => setLoginVisible(false)} /></motion.div>}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', flexDirection: 'column' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ background: '#0d0a07', borderBottom: '1px solid rgba(201,168,76,0.12)', padding: '0 clamp(1rem,3vw,2rem)', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button onClick={() => setSidebarCollapsed(p => !p)} style={{ background: 'none', border: 'none', color: '#9a8a78', cursor: 'pointer', fontSize: '1rem', padding: '0 4px' }}>{sidebarCollapsed ? '▶' : '◀'}</button>
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.6rem', letterSpacing: '0.3em', color: '#c9a84c', textTransform: 'uppercase' }}>Admin · Emporio 46</span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                {/* ── Gist sync status badge ── */}
                {gistSyncStatus !== 'idle' && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '0.3rem 0.7rem',
                    background: (gistSyncStatus === 'saving' || gistSyncStatus === 'pending') ? 'rgba(201,168,76,0.08)'
                      : gistSyncStatus === 'saved' ? 'rgba(111,207,151,0.10)'
                      : 'rgba(235,87,87,0.10)',
                    border: `1px solid ${gistSyncStatus === 'saving' ? 'rgba(201,168,76,0.3)'
                      : gistSyncStatus === 'saved' ? 'rgba(111,207,151,0.35)'
                      : 'rgba(235,87,87,0.35)'}`,
                    fontFamily: 'Cinzel, serif', fontSize: '0.44rem', letterSpacing: '0.12em',
                    color: (gistSyncStatus === 'saving' || gistSyncStatus === 'pending') ? '#c9a84c'
                      : gistSyncStatus === 'saved' ? '#6fcf97'
                      : '#eb5757',
                    transition: 'all 0.3s',
                  }}>
                    {gistSyncStatus === 'pending' && '… Modifiche in attesa'}
                    {gistSyncStatus === 'saving' && '⟳ Sincronizzazione…'}
                    {gistSyncStatus === 'warning' && '⚠ Salvato con avviso'}
                    {gistSyncStatus === 'local' && 'ℹ Solo locale'}
                    {gistSyncStatus === 'saved' && '✓ Salvato su Gist'}
                    {gistSyncStatus === 'error' && `⚠ ${gistSyncMessage || 'Sync fallita'}`}
                    {gistSyncStatus === 'conflict' && `⚠ ${gistSyncMessage || 'Conflitto: ricarica la pagina'}`}
                    {gistSyncStatus === 'auth' && `⚠ ${gistSyncMessage || 'Sessione scaduta: rifai il login'}`}
                  </div>
                )}
                {storageWarning && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(235,87,87,0.12)', border: '1px solid rgba(235,87,87,0.35)', padding: '0.3rem 0.7rem', fontFamily: 'Cinzel, serif', fontSize: '0.44rem', letterSpacing: '0.1em', color: '#eb5757' }}>
                    ⚠ Memoria quasi piena
                    <button onClick={clearImageStorage} style={{ background: 'rgba(235,87,87,0.2)', border: 'none', color: '#eb5757', cursor: 'pointer', fontFamily: 'Cinzel, serif', fontSize: '0.42rem', padding: '2px 6px', marginLeft: 4 }}>Libera</button>
                  </div>
                )}
                <button onClick={logout} style={{ ...btnGhost, fontSize: '0.5rem', padding: '0.4rem 0.9rem' }}>Logout</button>
                <button onClick={close} style={{ background: 'none', border: 'none', color: '#9a8a78', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              <motion.div animate={{ width: sidebarCollapsed ? 52 : 210 }} transition={{ duration: 0.25 }} style={{ background: '#0d0a07', borderRight: '1px solid rgba(201,168,76,0.1)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
                {NAV_ITEMS.map(item => (
                  <button key={item.id} onClick={() => setActiveTab(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: sidebarCollapsed ? '0.85rem 0' : '0.85rem 1.2rem', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', background: activeTab === item.id ? 'rgba(201,168,76,0.07)' : 'none', border: 'none', borderLeft: activeTab === item.id ? '2px solid #c9a84c' : '2px solid transparent', cursor: 'pointer', transition: 'all 0.2s', width: '100%' }}>
                    <span style={{ fontSize: '1rem', flexShrink: 0, color: (item as any).iconColor || 'inherit' }}>{item.icon}</span>
                    {!sidebarCollapsed && <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.52rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: activeTab === item.id ? '#c9a84c' : '#9a8a78', whiteSpace: 'nowrap' }}>{item.label}</span>}
                  </button>
                ))}
              </motion.div>

              <div style={{ flex: 1, overflowY: 'auto', background: '#100d09', padding: 'clamp(1.5rem, 4vw, 2.5rem)' }}>
                {activeTab === 'dashboard' && <Dashboard setTab={setActiveTab} catalog={catalog} reviews={reviews} />}
                {activeTab === 'catalog' && <CatalogAdmin />}
                {activeTab === 'reviews' && <ReviewsAdmin />}
                {activeTab === 'settings' && <SettingsAdmin />}
                {activeTab === 'seo' && <SEOAdmin />}
                {activeTab === 'media' && <MediaAdmin />}
                {activeTab === 'analytics' && <AnalyticsAdmin catalog={catalog} reviews={reviews} />}
                {activeTab === 'orari' && <OrariAdmin />}
                {activeTab === 'aspetto' && <AspettoAdmin />}
                {activeTab === 'sfondi' && <SfondiAdmin />}
                {activeTab === 'poltrona' && <PoltronaAdmin />}
                {activeTab === 'accrediti' && <AccreditiAdmin />}
                {activeTab === 'sconti' && <ScontiAdmin />}
                {activeTab === 'banner' && <BannerAdmin />}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
