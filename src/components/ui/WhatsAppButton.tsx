// @ts-nocheck
import { motion } from 'framer-motion'
import { useApp } from '../../context/AppContext'

function WAIcon() {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ width: 34, height: 34, position: 'relative', zIndex: 1 }}>
      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.948-1.42A9.956 9.956 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" fill="white" />
      <path d="M16.87 14.814c-.248-.124-1.47-.726-1.697-.808-.228-.083-.394-.124-.56.124-.166.248-.643.808-.788.974-.145.165-.29.186-.538.062-.248-.124-1.049-.387-1.997-1.234-.738-.66-1.236-1.473-1.381-1.722-.145-.248-.015-.382.109-.505.112-.111.248-.29.372-.436.124-.145.165-.248.248-.414.083-.165.041-.31-.021-.434-.062-.124-.56-1.349-.766-1.848-.202-.484-.407-.418-.56-.426-.145-.007-.31-.009-.476-.009a.913.913 0 00-.663.31c-.228.248-.869.85-.869 2.073s.89 2.403 1.014 2.569c.124.165 1.753 2.677 4.248 3.754.594.257 1.057.41 1.419.524.596.19 1.139.163 1.568.099.479-.072 1.47-.601 1.678-1.182.207-.58.207-1.077.145-1.182-.062-.103-.228-.165-.476-.29z" fill="#25d366" />
    </svg>
  )
}

export default function WhatsAppButton() {
  const { settings, lang } = useApp()
  if (!settings.showWhatsApp) return null

  const waNumber = settings.whatsapp || '393756106713'
  const href = `https://wa.me/${waNumber}?text=${encodeURIComponent(lang === 'en' ? `Hello, I'd like to book a visit to the shop.` : `Ciao, vorrei prenotare una visita al negozio.`)}`

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed z-[2000] flex items-center justify-center rounded-full"
      style={{ bottom: 24, right: '1.5rem', width: 58, height: 58, background: 'linear-gradient(145deg, #2ecc71, #25d366, #1ebe5d)', boxShadow: '0 4px 24px rgba(37,211,102,0.45), 0 2px 8px rgba(0,0,0,0.3)' }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 2.5, type: 'spring', stiffness: 200 }}
      whileHover={{ scale: 1.1, boxShadow: '0 6px 32px rgba(37,211,102,0.6), 0 2px 8px rgba(0,0,0,0.3)' }}
      whileTap={{ scale: 0.93 }}
      aria-label="Contattaci su WhatsApp"
    >
      <motion.span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'transparent', border: '2px solid rgba(37,211,102,0.6)' }}
        animate={{ scale: [1, 1.55], opacity: [0.7, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: [0.4, 0, 0.6, 1], repeatDelay: 0.2 }} />
      <motion.span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'transparent', border: '2px solid rgba(37,211,102,0.35)' }}
        animate={{ scale: [1, 1.85], opacity: [0.5, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: [0.4, 0, 0.6, 1], repeatDelay: 0.2, delay: 0.55 }} />
      <WAIcon />
    </motion.a>
  )
}
