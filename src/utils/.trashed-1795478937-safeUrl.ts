// Impedisce URL pericolosi (es. javascript:) provenienti da dati modificabili (Gist/admin).
export function safeHref(value?: string | null, fallback = '#'): string {
  const v = (value || '').trim()
  if (!v) return fallback
  try {
    const u = new URL(v, window.location.origin)
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(u.protocol) ? v : fallback
  } catch { return fallback }
}

// ID Google Analytics ammessi (G-XXXX, GT-XXXX, AW-XXXX, UA-XXXX-X)
export function safeGtagId(value?: string | null): string {
  const v = (value || '').trim()
  return /^(G|GT|AW)-[A-Z0-9]{4,16}$/i.test(v) || /^UA-\d{4,10}-\d{1,3}$/i.test(v) ? v : ''
}
