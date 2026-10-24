import { useEffect, useRef } from 'react'
import { useApp } from '../../context/AppContext'
import { markReady } from '../../utils/warmup'

/**
 * Medaglione "46" dell'Hero — canvas 2D interattivo.
 *
 * - Il disco arancione ha luce/ombra che seguono il mouse (tilt) e "respira" con una molla.
 * - Click sinistro: onda d'acqua sul disco, esplosione di scintille, calcio all'anello di testo
 *   e una raffica di palline che rimbalzano dentro il cerchio (fisica con collisioni).
 * - Tenendo premuto il tasto sinistro le palline "colano" dal puntatore.
 * - Muovendo il mouse sopra, le palline vengono respinte e l'anello di testo si gonfia verso il puntatore.
 * - La gravità ruota lentamente: anche senza input le palline rotolano lungo il bordo.
 */

type Ball = { x: number; y: number; vx: number; vy: number; r: number; col: number }
type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; col: number }
type Ripple = { x: number; y: number; t: number }

const MAX_BALLS = 54
const TAU = Math.PI * 2

function hexToRgb(hex: string | undefined, fb: [number, number, number] = [196, 86, 31]): [number, number, number] {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return fb
  const h = m[1].length === 3 ? m[1].split('').map(c => c + c).join('') : m[1]
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
const mix = (c: [number, number, number], to: number, k: number) =>
  `rgb(${Math.round(c[0] + (to - c[0]) * k)},${Math.round(c[1] + (to - c[1]) * k)},${Math.round(c[2] + (to - c[2]) * k)})`
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

export default function HeroOrb({ label }: { label: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { settings, lang } = useApp()
  const primary = settings.primaryColor
  const hint = lang === 'en' ? 'click me' : 'clicca'

  useEffect(() => {
    const wrap = wrapRef.current, canvas = canvasRef.current
    if (!wrap || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const pr = hexToRgb(primary)
    const pal = {
      bg: '#f3e8d4', text: '#2b1a12', accent: '#2f6f73', onPrimary: '#f3e8d4', ringText: '#b04a18',
      fontDisplay: 'serif', fontLabel: 'sans-serif',
      light: mix(pr, 255, 0.42), base: mix(pr, 0, 0), dark: mix(pr, 0, 0.38),
    }
    const readPal = () => {
      const cs = getComputedStyle(document.documentElement)
      const g = (n: string, fb: string) => cs.getPropertyValue(n).trim() || fb
      pal.bg = g('--color-bg', pal.bg)
      pal.text = g('--color-text', pal.text)
      pal.accent = g('--color-accent', pal.accent)
      pal.onPrimary = g('--color-on-primary', pal.bg)
      pal.ringText = g('--color-primary-text', pal.base)
      pal.fontDisplay = g('--font-display', pal.fontDisplay)
      pal.fontLabel = g('--font-label', pal.fontLabel)
      pal.light = mix(pr, 255, 0.42); pal.base = mix(pr, 0, 0); pal.dark = mix(pr, 0, 0.38)
    }
    readPal()
    const ballCols = () => [pal.bg, pal.text, pal.accent, pal.light]

    // ── stato ───────────────────────────────────────────────────────────
    let S = 0, dpr = 1
    const balls: Ball[] = []
    const sparks: Spark[] = []
    const ripples: Ripple[] = []
    const ptr = { x: 0, y: 0, inside: false, px: 0, py: 0 } // x,y normalizzati sul raggio del disco
    let pressed = false, pressT = 0, pourT = 0
    let tx = 0, ty = 0, stx = 0, sty = 0                      // tilt (target / smussato)
    let scale = 1, scaleV = 0                                 // molla di "respiro"
    let ang = 0, angV = reduce ? 0 : 0.21                     // rotazione anello
    const baseAngV = reduce ? 0 : 0.21
    let hintA = 1, clicks = 0
    let visible = true, rafId = 0, last = performance.now(), time = 0, frame = 0

    const addBall = (x: number, y: number, vx: number, vy: number) => {
      const d = Math.hypot(x, y), lim = 0.8
      if (d > lim) { x *= lim / d; y *= lim / d }
      if (balls.length >= MAX_BALLS) balls.shift()
      balls.push({ x, y, vx, vy, r: 0.05 + Math.random() * 0.06, col: Math.floor(Math.random() * 4) })
    }
    // palline di partenza così il medaglione è "vivo" subito
    for (let i = 0; i < 7; i++) {
      const a = Math.random() * TAU, d = Math.random() * 0.55
      addBall(Math.cos(a) * d, Math.sin(a) * d, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6)
    }

    // ── layout / resize ─────────────────────────────────────────────────
    let ringKey = '', ringChars: { ch: string; w: number }[] = [], ringFont = 10, ringSpacing = 0
    const resize = () => {
      const r = wrap.getBoundingClientRect()
      S = Math.max(120, r.width)
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = canvas.height = Math.round(S * dpr)
      ringKey = ''
    }
    resize()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null
    ro?.observe(wrap)

    const layoutRing = () => {
      const u = S / 2, r = 0.82 * u
      const key = `${S}|${label}|${pal.fontLabel}`
      if (key === ringKey) return
      ringKey = key
      const unit = `${label.toUpperCase()} · `
      let fs = 0.1 * u
      ctx.font = `500 ${fs}px ${pal.fontLabel}`
      const C = TAU * r
      const unitW = [...unit].reduce((s, c) => s + ctx.measureText(c).width, 0) || 1
      const reps = Math.max(1, Math.round(C / unitW))
      const str = unit.repeat(reps)
      let chars = [...str].map(ch => ({ ch, w: ctx.measureText(ch).width }))
      let total = chars.reduce((s, c) => s + c.w, 0)
      if (total > C * 0.94) { // testo troppo lungo: rimpicciolisco
        fs *= (C * 0.94) / total
        ctx.font = `500 ${fs}px ${pal.fontLabel}`
        chars = [...str].map(ch => ({ ch, w: ctx.measureText(ch).width }))
        total = chars.reduce((s, c) => s + c.w, 0)
      }
      ringChars = chars; ringFont = fs
      ringSpacing = (C - total) / chars.length // spalmo le lettere su tutta la circonferenza
    }

    // ── interazione ─────────────────────────────────────────────────────
    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      const px = ((e.clientX - r.left) / r.width) * S, py = ((e.clientY - r.top) / r.height) * S
      return { px, py, nx: (px - S / 2) / (0.66 * S / 2), ny: (py - S / 2) / (0.66 * S / 2) }
    }
    const burst = (nx: number, ny: number, px: number, py: number) => {
      clicks++
      ripples.push({ x: nx, y: ny, t: 0 })
      if (ripples.length > 6) ripples.shift()
      scaleV += -2.2                                   // "schiaccia" il disco, poi la molla lo rilancia
      angV += 4.2                                       // calcio all'anello di testo
      const cols = 3
      for (let i = 0; i < 16; i++) {
        const a = Math.random() * TAU, sp = 0.9 + Math.random() * 2.4
        sparks.push({ x: px, y: py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 0.55 + Math.random() * 0.5, size: 1.4 + Math.random() * 2.6, col: i % cols })
      }
      if (Math.hypot(nx, ny) < 1.25) {
        for (let i = 0; i < 5; i++) {
          const a = Math.random() * TAU, sp = 0.8 + Math.random() * 1.6
          addBall(nx + Math.cos(a) * 0.06, ny + Math.sin(a) * 0.06, Math.cos(a) * sp, Math.sin(a) * sp)
        }
      }
    }
    const onMove = (e: PointerEvent) => {
      const { px, py, nx, ny } = local(e)
      ptr.x = nx; ptr.y = ny; ptr.px = px; ptr.py = py; ptr.inside = true
      tx = clamp((px - S / 2) / (S / 2), -1, 1); ty = clamp((py - S / 2) / (S / 2), -1, 1)
    }
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return            // solo tasto sinistro
      const { px, py, nx, ny } = local(e)
      ptr.x = nx; ptr.y = ny; ptr.px = px; ptr.py = py; ptr.inside = true
      pressed = true; pressT = 0; pourT = 0
      try { canvas.setPointerCapture(e.pointerId) } catch { /* noop */ }
      burst(nx, ny, px, py)
    }
    const onUp = (e: PointerEvent) => {
      if (e.button !== 0) return
      pressed = false
      try { canvas.releasePointerCapture(e.pointerId) } catch { /* noop */ }
    }
    const onLeave = () => { if (!pressed) { ptr.inside = false; tx = 0; ty = 0 } }
    const onCancel = () => { pressed = false; ptr.inside = false; tx = 0; ty = 0 }
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointerleave', onLeave)
    canvas.addEventListener('pointercancel', onCancel)

    const io = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([en]) => { visible = en.isIntersecting }, { threshold: 0.05 }) : null
    io?.observe(wrap)

    // ── fisica ──────────────────────────────────────────────────────────
    const physics = (dt: number) => {
      const gA = reduce ? 0 : time * 0.45
      const gx = reduce ? 0 : Math.sin(gA) * 1.5, gy = reduce ? 0.9 : Math.cos(gA) * 1.5
      for (const b of balls) {
        b.vx += gx * dt; b.vy += gy * dt
        if (ptr.inside) { // il puntatore respinge
          const dx = b.x - ptr.x, dy = b.y - ptr.y, d = Math.hypot(dx, dy) || 1e-3, R = 0.42
          if (d < R) { const f = (1 - d / R) * 14 * dt; b.vx += (dx / d) * f; b.vy += (dy / d) * f }
        }
        b.vx *= 1 - 0.18 * dt; b.vy *= 1 - 0.18 * dt
        b.x += b.vx * dt; b.y += b.vy * dt
        const d = Math.hypot(b.x, b.y), lim = 0.97 - b.r
        if (d > lim) { // rimbalzo sul bordo circolare
          const nx = b.x / d, ny = b.y / d
          b.x = nx * lim; b.y = ny * lim
          const vn = b.vx * nx + b.vy * ny
          if (vn > 0) { b.vx -= 1.8 * vn * nx; b.vy -= 1.8 * vn * ny; b.vx *= 0.985; b.vy *= 0.985 }
        }
      }
      for (let i = 0; i < balls.length; i++) { // collisioni palla-palla
        const a = balls[i]
        for (let j = i + 1; j < balls.length; j++) {
          const c = balls[j], dx = c.x - a.x, dy = c.y - a.y, min = a.r + c.r
          const d2 = dx * dx + dy * dy
          if (d2 >= min * min || d2 === 0) continue
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = (min - d) / 2
          a.x -= nx * ov; a.y -= ny * ov; c.x += nx * ov; c.y += ny * ov
          const ma = a.r * a.r, mc = c.r * c.r
          const vn = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny
          if (vn < 0) {
            const jimp = (-(1 + 0.88) * vn) / (1 / ma + 1 / mc)
            a.vx -= (jimp / ma) * nx; a.vy -= (jimp / ma) * ny
            c.vx += (jimp / mc) * nx; c.vy += (jimp / mc) * ny
          }
        }
      }
    }

    // ── render ──────────────────────────────────────────────────────────
    const draw = () => {
      layoutRing()
      const u = S / 2, D = 0.66 * u, cx = u, cy = u
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, S, S)

      // 1) anello di testo
      ctx.save()
      ctx.translate(cx, cy)
      ctx.fillStyle = pal.ringText
      ctx.font = `500 ${ringFont}px ${pal.fontLabel}`
      ctx.textBaseline = 'alphabetic'
      const r0 = 0.82 * u
      const pAng = Math.atan2(ptr.py - cy, ptr.px - cx)
      let cum = 0
      for (const { ch, w } of ringChars) {
        const th = ang + (cum + w / 2) / r0 - Math.PI / 2
        cum += w + ringSpacing
        let bulge = 0
        if (ptr.inside) { // l'anello si gonfia verso il puntatore
          let da = Math.atan2(Math.sin(th - pAng), Math.cos(th - pAng))
          da = Math.abs(da)
          bulge = Math.exp(-(da * da) / (2 * 0.32 * 0.32)) * 0.07 * u
        }
        const rr = r0 + bulge
        ctx.save()
        ctx.translate(Math.cos(th) * rr, Math.sin(th) * rr)
        ctx.rotate(th + Math.PI / 2)
        ctx.fillText(ch, -w / 2, 0)
        ctx.restore()
      }
      ctx.restore()

      // 2) disco (con molla, tilt e luce che segue il mouse)
      ctx.save()
      ctx.translate(cx, cy); ctx.scale(scale, scale); ctx.translate(-cx, -cy)

      const sx = 0.1 * u * (0.7 - 0.6 * stx), sy = 0.1 * u * (0.7 - 0.6 * sty)
      ctx.beginPath(); ctx.arc(cx + sx, cy + sy, D, 0, TAU); ctx.fillStyle = pal.text; ctx.fill()

      const hx = cx - D * 0.3 + stx * D * 0.4, hy = cy - D * 0.35 + sty * D * 0.4
      const g = ctx.createRadialGradient(hx, hy, D * 0.05, cx, cy, D * 1.08)
      g.addColorStop(0, pal.light); g.addColorStop(0.5, pal.base); g.addColorStop(1, pal.dark)
      ctx.beginPath(); ctx.arc(cx, cy, D, 0, TAU); ctx.fillStyle = g; ctx.fill()
      ctx.lineWidth = Math.max(1.5, S * 0.0055); ctx.strokeStyle = pal.text; ctx.stroke()

      ctx.save()
      ctx.beginPath(); ctx.arc(cx, cy, D - 1, 0, TAU); ctx.clip()

      // lucido
      const gl = ctx.createRadialGradient(hx, hy, 0, hx, hy, D * 0.7)
      gl.addColorStop(0, 'rgba(255,255,255,0.32)'); gl.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = gl; ctx.fillRect(cx - D, cy - D, D * 2, D * 2)

      // anello tratteggiato interno che gira al contrario
      ctx.save()
      ctx.translate(cx, cy); ctx.rotate(-ang * 1.6)
      ctx.beginPath(); ctx.arc(0, 0, D * 0.9, 0, TAU)
      ctx.setLineDash([D * 0.02, D * 0.07]); ctx.lineWidth = 1.2
      ctx.strokeStyle = pal.onPrimary; ctx.globalAlpha = 0.45; ctx.stroke()
      ctx.restore()

      // onde d'acqua dei click
      for (const rp of ripples) {
        const k = rp.t / 1.1
        if (k >= 1) continue
        const px = cx + rp.x * D, py = cy + rp.y * D
        for (let i = 0; i < 3; i++) {
          const kk = k - i * 0.1
          if (kk <= 0) continue
          ctx.beginPath(); ctx.arc(px, py, kk * D * 2.1, 0, TAU)
          ctx.lineWidth = (1 - kk) * 3.2 + 0.4
          ctx.strokeStyle = i === 0 ? 'rgba(255,255,255,' + (1 - kk) * 0.7 + ')' : pal.bg
          ctx.globalAlpha = i === 0 ? 1 : (1 - kk) * 0.35
          ctx.stroke()
        }
      }
      ctx.globalAlpha = 1

      // alone sotto il puntatore
      if (ptr.inside) {
        const pg = ctx.createRadialGradient(ptr.px, ptr.py, 0, ptr.px, ptr.py, D * 0.5)
        pg.addColorStop(0, 'rgba(255,255,255,0.22)'); pg.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = pg; ctx.fillRect(cx - D, cy - D, D * 2, D * 2)
      }

      // "46"
      ctx.fillStyle = pal.onPrimary
      ctx.font = `italic 400 ${D * 0.82}px ${pal.fontDisplay}`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('46', cx - stx * D * 0.04, cy + D * 0.04 - sty * D * 0.04)

      // palline
      const cols = ballCols()
      for (const b of balls) {
        const bx = cx + b.x * D, by = cy + b.y * D, br = b.r * D
        const c = cols[b.col]
        const bg = ctx.createRadialGradient(bx - br * 0.4, by - br * 0.4, br * 0.1, bx, by, br)
        bg.addColorStop(0, 'rgba(255,255,255,0.85)'); bg.addColorStop(0.45, c); bg.addColorStop(1, c)
        ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU)
        ctx.fillStyle = bg; ctx.fill()
        ctx.lineWidth = 1.4; ctx.strokeStyle = pal.text; ctx.stroke()
      }

      // suggerimento
      if (hintA > 0.01) {
        ctx.globalAlpha = hintA * (0.55 + 0.25 * Math.sin(time * 3))
        ctx.fillStyle = pal.onPrimary
        ctx.font = `italic 400 ${D * 0.12}px ${pal.fontLabel}`
        ctx.textBaseline = 'middle'
        ctx.fillText(hint.toUpperCase().split('').join(' '), cx, cy + D * 0.7)
        ctx.globalAlpha = 1
      }
      ctx.restore() // clip disco
      ctx.restore() // scala molla

      // 3) scintille (sopra a tutto, non ritagliate)
      const sc = [pal.base, pal.text, pal.accent]
      for (const s of sparks) {
        const k = s.life / s.max
        ctx.globalAlpha = 1 - k
        ctx.fillStyle = sc[s.col]
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size * (1 - k * 0.6), 0, TAU); ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    let warmed = false
    // ── loop ────────────────────────────────────────────────────────────
    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick)
      const dt = Math.min(0.033, (now - last) / 1000); last = now
      if (!visible || document.hidden || document.documentElement.dataset.menu === '1') return
      time += dt; frame++
      if (frame % 45 === 0) readPal() // segue i cambi di tema dall'admin

      // tilt smussato
      stx += (tx - stx) * Math.min(1, dt * 8); sty += (ty - sty) * Math.min(1, dt * 8)
      // molla di respiro
      const target = pressed ? 0.955 : 1
      scaleV += ((target - scale) * 180 - scaleV * 11) * dt; scale += scaleV * dt
      // rotazione anello
      angV += (baseAngV - angV) * Math.min(1, dt * 1.4); ang += angV * dt
      // tasto premuto: versa palline
      if (pressed) {
        pressT += dt
        if (pressT > 0.3) {
          pourT -= dt
          if (pourT <= 0) {
            pourT = 0.07
            const a = Math.random() * TAU
            addBall(ptr.x, ptr.y, Math.cos(a) * 0.5, Math.sin(a) * 0.5)
          }
        }
      }
      if (clicks > 0) hintA = Math.max(0, hintA - dt * 1.2)
      for (const rp of ripples) rp.t += dt
      while (ripples.length && ripples[0].t > 1.3) ripples.shift()
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]; s.life += dt
        if (s.life >= s.max) { sparks.splice(i, 1); continue }
        s.x += s.vx * 60 * dt; s.y += s.vy * 60 * dt; s.vy += 3.2 * dt; s.vx *= 1 - 1.4 * dt; s.vy *= 1 - 1.4 * dt
      }
      physics(dt / 2); physics(dt / 2)
      draw()
      if (!warmed) { warmed = true; markReady('hero-orb') }   // primo frame disegnato: il loader può aprirsi
    }
    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
      ro?.disconnect(); io?.disconnect()
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('pointercancel', onCancel)
    }
  }, [primary, label, hint])

  return (
    <div ref={wrapRef} className="hero-badge" data-cursor
      style={{ justifySelf: 'center', position: 'relative', width: 'min(32vw, 380px)', aspectRatio: '1 / 1' }}>
      <canvas ref={canvasRef} role="img" aria-label={label}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer', touchAction: 'manipulation', userSelect: 'none' }} />
    </div>
  )
}
