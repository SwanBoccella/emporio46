import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

let lenisInstance: Lenis | null = null

export function getLenis() {
  return lenisInstance
}

export function useLenis() {
  useEffect(() => {
    // Destroy any previous instance (important with React StrictMode double-mount)
    if (lenisInstance) {
      lenisInstance.destroy()
      gsap.ticker.remove((lenisInstance as any).__onTick)
      lenisInstance = null
    }

    const lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
      // Lenis >= 1.1 supports autoRaf — set false so GSAP ticker drives it
      autoRaf: false,
    })

    lenisInstance = lenis

    // Sync Lenis scroll events → GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update)

    // Drive Lenis via GSAP ticker (single RAF loop — best practice)
    const onTick = (time: number) => {
      lenis.raf(time * 1000)
    }
    ;(lenis as any).__onTick = onTick

    gsap.ticker.add(onTick)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(onTick)
      lenis.destroy()
      lenisInstance = null
    }
  }, [])
}
