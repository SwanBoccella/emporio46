// @ts-nocheck
import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion'
import { useApp } from '../../context/AppContext'

// ─── Detect touch/mobile device ──────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const check = () => setMobile(window.matchMedia('(hover: none) and (pointer: coarse)').matches)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return mobile
}

// ─── Touch Ripple (mobile only) ───────────────────────────────────────────────
interface Ripple { id: number; x: number; y: number }

function TouchRipples() {
  const [ripples, setRipples] = useState<Ripple[]>([])
  const counter = useRef(0)

  useEffect(() => {
    const onTouch = (e: TouchEvent) => {
      const touches = Array.from(e.changedTouches)
      touches.forEach(t => {
        const id = ++counter.current
        setRipples(prev => [...prev, { id, x: t.clientX, y: t.clientY }])
        setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 900)
      })
    }
    document.addEventListener('touchstart', onTouch, { passive: true })
    return () => document.removeEventListener('touchstart', onTouch)
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, pointerEvents: 'none' }}>
      <AnimatePresence>
        {ripples.map(r => (
          <motion.span
            key={r.id}
            style={{
              position: 'absolute',
              left: r.x,
              top: r.y,
              x: '-50%',
              y: '-50%',
              borderRadius: '50%',
              border: '1.5px solid rgba(var(--color-primary-rgb), 0.7)',
              background: 'radial-gradient(circle, rgba(var(--color-primary-rgb), 0.18) 0%, transparent 70%)',
            }}
            initial={{ width: 0, height: 0, opacity: 1 }}
            animate={{ width: 80, height: 80, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

// ─── Desktop Animated Cursor ──────────────────────────────────────────────────
function DesktopCursor() {
  const [visible, setVisible] = useState(false)
  const [clicking, setClicking] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [label, setLabel] = useState('')
  const cursorX = useMotionValue(-100)
  const cursorY = useMotionValue(-100)
  const springX = useSpring(cursorX, { stiffness: 500, damping: 40 })
  const springY = useSpring(cursorY, { stiffness: 500, damping: 40 })
  const ringX = useSpring(cursorX, { stiffness: 120, damping: 22 })
  const ringY = useSpring(cursorY, { stiffness: 120, damping: 22 })

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      cursorX.set(e.clientX)
      cursorY.set(e.clientY)
      if (!visible) setVisible(true)
    }
    const onDown = () => setClicking(true)
    const onUp = () => setClicking(false)
    const onLeave = () => setVisible(false)
    const onEnter = () => setVisible(true)

    const onHoverIn = (e: Event) => {
      const target = e.target as HTMLElement
      setHovering(true)
      setLabel(target.dataset.cursor || '')
    }
    const onHoverOut = () => { setHovering(false); setLabel('') }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('mouseup', onUp)
    document.addEventListener('mouseleave', onLeave)
    document.addEventListener('mouseenter', onEnter)

    const attach = () => {
      const interactives = document.querySelectorAll('a, button, [data-cursor]')
      interactives.forEach(el => {
        el.removeEventListener('mouseenter', onHoverIn)
        el.removeEventListener('mouseleave', onHoverOut)
        el.addEventListener('mouseenter', onHoverIn)
        el.addEventListener('mouseleave', onHoverOut)
      })
    }
    attach()

    const obs = new MutationObserver(attach)
    obs.observe(document.body, { childList: true, subtree: true })

    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('mouseup', onUp)
      document.removeEventListener('mouseleave', onLeave)
      document.removeEventListener('mouseenter', onEnter)
      obs.disconnect()
    }
  }, [])

  return (
    <>
      <motion.div
        style={{ position: 'fixed', left: springX, top: springY, x: '-50%', y: '-50%', zIndex: 99999, pointerEvents: 'none', width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)', mixBlendMode: 'screen' }}
        animate={{ scale: clicking ? 0.5 : hovering ? 1.5 : 1, opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.15 }}
      />
      <motion.div
        style={{ position: 'fixed', left: ringX, top: ringY, x: '-50%', y: '-50%', zIndex: 99998, pointerEvents: 'none', borderRadius: '50%', border: '1px solid rgba(var(--color-primary-rgb), 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        animate={{
          width: hovering ? (label ? 72 : 52) : clicking ? 20 : 32,
          height: hovering ? (label ? 72 : 52) : clicking ? 20 : 32,
          borderColor: hovering ? 'var(--color-primary)' : 'rgba(var(--color-primary-rgb), 0.5)',
          opacity: visible ? 1 : 0,
        }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        {label && (
          <motion.span style={{ fontFamily: 'var(--font-label)', fontSize: '0.66rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--color-primary-text, var(--color-primary))', textAlign: 'center', lineHeight: 1.2 }}
            initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            {label}
          </motion.span>
        )}
      </motion.div>
    </>
  )
}

export default function Cursor() {
  const { settings } = useApp()
  const isMobile = useIsMobile()
  if (!settings.showCursor) return null
  return isMobile ? <TouchRipples /> : <DesktopCursor />
}
