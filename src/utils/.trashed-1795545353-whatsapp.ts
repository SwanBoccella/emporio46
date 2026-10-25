// Dynamic WA number — reads from localStorage settings at call time
function getWaNumber(): string {
  try {
    const s = localStorage.getItem('mnt_settings')
    if (s) { const parsed = JSON.parse(s); if (parsed.whatsapp) return parsed.whatsapp }
  } catch {}
  return '393756106713'
}

export function waLink(msg: string) {
  return `https://wa.me/${getWaNumber()}?text=${encodeURIComponent(msg)}`
}
export function waItemLink(nome: string, era: string) {
  return waLink(`Ciao, sono interessato/a all'oggetto: ${nome} (${era}). Potrebbe darmi maggiori informazioni?`)
}
export function waBookLink() {
  return waLink('Ciao, vorrei passare a trovarvi in negozio.')
}
export function waSearchLink() {
  return waLink("Ciao, sto cercando un pezzo vintage...")
}
export function waEstimateLink() {
  return waLink("Ciao, vorrei qualche informazione su un pezzo...")
}
