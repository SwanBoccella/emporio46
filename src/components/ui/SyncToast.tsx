import type { CSSProperties } from 'react'
import { useApp } from '../../context/AppContext'

// Notifica globale (sempre visibile, anche con il pannello admin aperto) sull'esito del salvataggio.
export default function SyncToast() {
  const { isAdmin, gistSyncStatus: st, gistSyncMessage: msg, gistSyncNow, dismissGistSync } = useApp()
  if (!isAdmin || st === 'idle') return null

  const ok = st === 'saved'
  const busy = st === 'saving' || st === 'pending'
  const warn = st === 'warning' || st === 'local'
  const color = ok ? '#6fcf97' : busy ? '#c9a84c' : warn ? '#e2b04a' : '#eb5757'
  const bg = ok ? 'rgba(20,40,28,0.97)' : busy ? 'rgba(36,29,14,0.97)' : warn ? 'rgba(40,32,12,0.97)' : 'rgba(46,17,17,0.97)'
  const title =
    st === 'pending' ? 'Modifiche in attesa di salvataggio…'
    : st === 'saving' ? 'Salvataggio in corso…'
    : st === 'saved' ? '✓ Salvato'
    : st === 'warning' ? '⚠ Salvato con un avviso'
    : st === 'local' ? 'ℹ Salvato solo in locale'
    : st === 'conflict' ? '✕ Salvataggio non riuscito: conflitto'
    : st === 'auth' ? '✕ Salvataggio non riuscito: sessione scaduta'
    : '✕ Salvataggio non riuscito'
  const canRetry = st === 'error' || st === 'pending'

  return (
    <div role={ok || busy ? 'status' : 'alert'} aria-live={ok || busy ? 'polite' : 'assertive'}
      style={{
        position: 'fixed', left: '50%', transform: 'translateX(-50%)',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)', zIndex: 2147483000,
        width: 'min(460px, calc(100vw - 24px))', boxSizing: 'border-box',
        background: bg, color: '#f5ede0', border: `1px solid ${color}`, borderLeft: `4px solid ${color}`,
        borderRadius: 10, padding: '0.7rem 0.9rem', boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
        fontFamily: 'system-ui, sans-serif', fontSize: '0.85rem', lineHeight: 1.45,
      }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color }}>{title}</div>
          {msg && !busy && <div style={{ marginTop: 3, opacity: 0.92, wordBreak: 'break-word' }}>{msg}</div>}
          {(st === 'error' || st === 'conflict') && (
            <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {st === 'error' && <button onClick={() => gistSyncNow()} style={btn(color)}>Riprova</button>}
              {st === 'conflict' && <button onClick={() => window.location.reload()} style={btn(color)}>Ricarica pagina</button>}
            </div>
          )}
          {st === 'auth' && <div style={{ marginTop: 6 }}><button onClick={() => window.location.reload()} style={btn(color)}>Rifai il login</button></div>}
        </div>
        {!busy && (
          <button onClick={dismissGistSync} aria-label="Chiudi" style={{ background: 'none', border: 'none', color: '#f5ede0', opacity: 0.7, cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: 2 }}>✕</button>
        )}
      </div>
      {canRetry && st === 'pending' && (
        <div style={{ marginTop: 6 }}><button onClick={() => gistSyncNow()} style={btn(color)}>Salva ora</button></div>
      )}
    </div>
  )
}

const btn = (c: string): CSSProperties => ({
  background: 'transparent', color: c, border: `1px solid ${c}`, borderRadius: 6,
  padding: '0.3rem 0.7rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
})
