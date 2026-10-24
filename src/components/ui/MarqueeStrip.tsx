// @ts-nocheck
import { useEffect, useRef, type CSSProperties } from 'react'
import { gsap } from 'gsap'
import { useApp } from '../../context/AppContext'
import SectionBackdrop from './SectionBackdrop'

// Human-readable labels for each category key (IT and EN)
const CAT_LABELS_IT: Record<string, string> = {
  mobili: 'Arredi Vintage',
  lampade: 'Lampade',
  bijoux: 'Bijoux',
  specchi: 'Specchi',
  cornici: 'Cornici',
  complementi: "Complementi d'Arredo",
  ceramiche: 'Ceramiche e Vetri',
  modernariato: 'Modernariato',
  altro: 'Pezzi Rari',
}
const CAT_LABELS_EN: Record<string, string> = {
  mobili: 'Vintage Furniture',
  lampade: 'Lamps',
  bijoux: 'Jewellery',
  specchi: 'Mirrors',
  cornici: 'Frames',
  complementi: 'Home Decor',
  ceramiche: 'Ceramics & Glass',
  modernariato: 'Mid-century Finds',
  altro: 'Rare Pieces',
}

function Star({ size = 14, style }: { size?: number; style?: CSSProperties }) {
  return (
    <svg className="mq-star" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={style}>
      <path d="M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z" fill="currentColor" />
    </svg>
  )
}

const REDUCED = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Striscia categorie a due righe che scorrono in versi opposti.
 * - la velocità segue lo scroll della pagina (più scorri, più corre) e inverte il verso scrollando in su
 * - al passaggio del mouse rallenta e le voci si ingrandiscono
 * - si anima solo quando è visibile (nessun costo fuori schermo)
 * - con "riduci animazioni" attivo scorre lentissima e senza reazione allo scroll
 */
export default function MarqueeStrip({ lang }: { lang: 'it' | 'en' }) {
  const { settings } = useApp()
  const wrapRef = useRef<HTMLDivElement>(null)
  const trackA = useRef<HTMLDivElement>(null)
  const trackB = useRef<HTMLDivElement>(null)

  const labels = lang === 'it' ? CAT_LABELS_IT : CAT_LABELS_EN
  const cats = settings.categorieAttive && settings.categorieAttive.length > 0 ? settings.categorieAttive : Object.keys(labels)
  const names = cats.map(c => labels[c] || c)
  const namesB = [...names].reverse()

  const renderRow = (list: string[], variant: 'solid' | 'outline') => {
    const items = [...list, ...list].map((n, i) => (
      <span key={i} className={`mq-item mq-${variant}`}>
        <span className="mq-text">{n}</span>
        <Star size={variant === 'solid' ? 15 : 12} style={{ animationDelay: `${(i % 6) * -0.7}s` }} />
      </span>
    ))
    return [...items, ...items, ...items]   // 3 copie: il ciclo è 1/3 della larghezza
  }

  useEffect(() => {
    const a = trackA.current, b = trackB.current, wrap = wrapRef.current
    if (!a || !b || !wrap) return
    const reduced = REDUCED()
    const st = { x1: 0, x2: 0, boost: 0, dir: 1, hover: 0, inView: true }
    let lastY = window.scrollY
    let w1 = a.scrollWidth / 3, w2 = b.scrollWidth / 3
    // il -w2 iniziale evita lo "scalino" per la riga che va verso destra
    st.x2 = -w2

    const measure = () => { w1 = a.scrollWidth / 3; w2 = b.scrollWidth / 3 }
    const ro = new ResizeObserver(measure); ro.observe(a); ro.observe(b)
    if ((document as any).fonts?.ready) (document as any).fonts.ready.then(measure)

    const io = new IntersectionObserver(([e]) => { st.inView = e.isIntersecting; wrap.dataset.off = e.isIntersecting ? '0' : '1' }, { rootMargin: '120px' })
    io.observe(wrap)

    const onTick = () => {
      if (!st.inView) { lastY = window.scrollY; return }
      const y = window.scrollY
      const dy = y - lastY; lastY = y
      if (!reduced) {
        // boost proporzionale alla velocità di scroll, con inerzia
        st.boost += (Math.min(Math.abs(dy) * 0.22, 14) - st.boost) * 0.12
        if (Math.abs(dy) > 0.5) st.dir += ((dy > 0 ? 1 : -1) - st.dir) * 0.08
        else st.dir += (1 - st.dir) * 0.012
      }
      const base = reduced ? 0.15 : 0.9 * (1 - st.hover * 0.75)
      const v = base + st.boost
      st.x1 -= v * st.dir
      st.x2 += v * 0.78 * st.dir          // seconda riga: verso opposto, un po' più lenta
      if (st.x1 <= -w1) st.x1 += w1
      if (st.x1 > 0) st.x1 -= w1
      if (st.x2 >= 0) st.x2 -= w2
      if (st.x2 < -w2) st.x2 += w2
      a.style.transform = `translate3d(${st.x1}px,0,0)`
      b.style.transform = `translate3d(${st.x2}px,0,0)`
    }
    gsap.ticker.add(onTick)

    const over = () => gsap.to(st, { hover: 1, duration: 0.5 })
    const out = () => gsap.to(st, { hover: 0, duration: 0.8 })
    wrap.addEventListener('mouseenter', over); wrap.addEventListener('mouseleave', out)
    return () => {
      gsap.ticker.remove(onTick); ro.disconnect(); io.disconnect()
      wrap.removeEventListener('mouseenter', over); wrap.removeEventListener('mouseleave', out)
    }
  }, [lang, names.join('|')])

  return (
    <div ref={wrapRef} className="mq-wrap" style={{ position: 'relative', padding: '2.6rem 0 3rem', overflow: 'hidden' }}>
      {/* Riga 1: piena, colore primario */}
      <div className="mq-band mq-band-a" style={{ background: 'var(--color-primary)', borderTop: '2px solid var(--color-text)', borderBottom: '2px solid var(--color-text)', overflow: 'hidden', position: 'relative', isolation: 'isolate', transform: 'rotate(-1.4deg)', width: '104%', marginLeft: '-2%', zIndex: 2, boxShadow: '0 6px 0 rgba(0,0,0,0.12)' }}>
        <SectionBackdrop slot="marquee" />
        <div ref={trackA} className="mq-track" style={{ display: 'flex', whiteSpace: 'nowrap', willChange: 'transform', padding: '0.95rem 0' }}>
          {renderRow(names, 'solid')}
        </div>
      </div>
      {/* Riga 2: contorno su carta, verso opposto */}
      <div className="mq-band mq-band-b" style={{ background: 'var(--color-bg-card)', borderTop: '2px solid var(--color-text)', borderBottom: '2px solid var(--color-text)', overflow: 'hidden', position: 'relative', transform: 'rotate(1deg)', width: '104%', marginLeft: '-2%', marginTop: '-0.6rem', zIndex: 1 }}>
        <div ref={trackB} className="mq-track" style={{ display: 'flex', whiteSpace: 'nowrap', willChange: 'transform', padding: '0.7rem 0' }}>
          {renderRow(namesB, 'outline')}
        </div>
        {/* dissolvenza ai lati */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(90deg, var(--color-bg-card) 0%, transparent 12%, transparent 88%, var(--color-bg-card) 100%)' }} />
      </div>
    </div>
  )
}
