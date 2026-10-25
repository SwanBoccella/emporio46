// Tasto/gesto "indietro" per le finestre sovrapposte (scheda articolo → foto ingrandita).
// Ogni finestra aperta aggiunge una voce alla cronologia: "indietro" chiude solo quella più in alto
// e non porta mai fuori dal sito. Se la finestra si chiude con ✕/Esc/sfondo, la sua voce viene tolta
// solo quando è davvero quella corrente.
type Layer = { depth: number; close: () => void }

const stack: Layer[] = []
let bound = false

const curDepth = (): number => {
  try { return Number((history.state && history.state.__bl) || 0) } catch { return 0 }
}

function onPop() {
  const d = curDepth()
  while (stack.length && stack[stack.length - 1].depth > d) {
    const layer = stack.pop()!
    layer.close()
  }
}

/** Registra una finestra: restituisce la funzione da chiamare quando la finestra sparisce. */
export function pushBackLayer(close: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  if (!bound) { window.addEventListener('popstate', onPop); bound = true }
  const layer: Layer = { depth: curDepth() + 1, close }
  try {
    history.pushState({ __bl: layer.depth }, '')
  } catch {
    return () => {}
  }
  stack.push(layer)
  return () => {
    const i = stack.indexOf(layer)
    if (i === -1) return                      // già chiusa dal tasto "indietro"
    stack.splice(i, 1)
    if (curDepth() === layer.depth) { try { history.back() } catch { /* noop */ } }
  }
}
