import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { AppProvider } from './context/AppContext'
import App from './App'
// Font self-hosted (pacchetti @fontsource): serviti dal sito stesso, non da Google.
// Così non restano mai caratteri di ripiego, anche con blocchi pubblicitari, DNS privato, risparmio dati o rete lenta.
import '@fontsource/fraunces/300.css'
import '@fontsource/fraunces/400.css'
import '@fontsource/fraunces/500.css'
import '@fontsource/fraunces/600.css'
import '@fontsource/fraunces/700.css'
import '@fontsource/fraunces/400-italic.css'
import '@fontsource/fraunces/600-italic.css'
import '@fontsource/jost/300.css'
import '@fontsource/jost/400.css'
import '@fontsource/jost/500.css'
import '@fontsource/jost/600.css'
import '@fontsource/jost/400-italic.css'
import '@fontsource/cinzel/400.css'
import '@fontsource/cinzel/500.css'
import '@fontsource/cinzel/600.css'
import '@fontsource/cormorant-garamond/300.css'
import '@fontsource/cormorant-garamond/400.css'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/400-italic.css'
import '@fontsource/playfair-display/400.css'
import '@fontsource/playfair-display/500.css'
import '@fontsource/playfair-display/700.css'
import '@fontsource/playfair-display/400-italic.css'
import '@fontsource/playfair-display/700-italic.css'
import '@fontsource/eb-garamond/400.css'
import '@fontsource/eb-garamond/500.css'
import '@fontsource/eb-garamond/400-italic.css'
import '@fontsource/libre-baskerville/400.css'
import '@fontsource/libre-baskerville/700.css'
import '@fontsource/libre-baskerville/400-italic.css'
import '@fontsource/lora/400.css'
import '@fontsource/lora/500.css'
import '@fontsource/lora/600.css'
import '@fontsource/lora/400-italic.css'
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
