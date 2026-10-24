import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { AppProvider } from './context/AppContext'
import App from './App'
import './index.css'

// StrictMode rimosso: causa double-mount con Lenis, GSAP ScrollTrigger e Three.js
// che produce schermo nero / animazioni non visibili in sviluppo
createRoot(document.getElementById('root')!).render(
  <HelmetProvider>
    <AppProvider>
      <App />
    </AppProvider>
  </HelmetProvider>,
)

// Pagina offline: il service worker mostra /offline.html se il sito non è raggiungibile.
// Solo in produzione, per non interferire con l'HMR di Vite in sviluppo.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
