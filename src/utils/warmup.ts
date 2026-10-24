/**
 * Coordinamento "tutto pronto prima di aprire il sito".
 * I componenti pesanti (canvas, WebGL…) segnalano con markReady() di aver già disegnato il primo frame;
 * il Loader attende questi segnali (waitReady) e poi lascia sfiatare il main thread (settle),
 * così alla scomparsa del loader non c'è più nulla da inizializzare.
 */
const done = new Set<string>()

export function markReady(key: string) {
  if (done.has(key)) return
  done.add(key)
  window.dispatchEvent(new CustomEvent('e46-ready', { detail: key }))
}

export function waitReady(keys: string[], timeout = 12000): Promise<void> {
  return new Promise(resolve => {
    const pending = () => keys.filter(k => !done.has(k))
    if (!pending().length) return resolve()
    const finish = () => { clearTimeout(t); window.removeEventListener('e46-ready', check); resolve() }
    const check = () => { if (!pending().length) finish() }
    const t = setTimeout(finish, timeout)
    window.addEventListener('e46-ready', check)
  })
}

const frames = (n: number) => new Promise<void>(res => {
  const step = () => (--n <= 0 ? res() : requestAnimationFrame(step))
  requestAnimationFrame(step)
})

/** Un paio di frame + un momento di calma del main thread (con tetto massimo: tab in background non blocca). */
export function settle(maxMs = 1500): Promise<void> {
  const work = frames(2)
    .then(() => new Promise<void>(res => {
      const ric = (window as any).requestIdleCallback as undefined | ((cb: () => void, o?: { timeout: number }) => void)
      ric ? ric(() => res(), { timeout: 700 }) : setTimeout(res, 120)
    }))
    .then(() => frames(2))
  return Promise.race([work, new Promise<void>(r => setTimeout(r, maxMs))])
}
