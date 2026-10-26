// Configurazione EmailJS dei form di contatto (Passa a trovarci · Cerco un pezzo · Scrivici).
// Priorità: variabili d'ambiente VITE_EMAILJS_* → valori inseriti nel pannello admin → valori predefiniti qui sotto.
// Service ID, Public Key e Template ID NON sono segreti: EmailJS li prevede nel browser (la protezione sta in "Allowed Origins").
// I predefiniti garantiscono che l'INVIA mandi davvero l'email anche se su Netlify non sono impostate le variabili.
const DEFAULTS = {
  service: 'service_m7lkgmr',
  publicKey: '9uhOy7c1M5GntXjls',
  template: 'template_82qn6hr',          // notifica al negozio (tutte e 3 le schede)
  templateClient: 'template_uzprmdo',   // conferma automatica al cliente
}

interface EmailJsSettings {
  emailjsServiceId?: string; emailjsPublicKey?: string
  emailjsTemplateBook?: string; emailjsTemplateRequest?: string; emailjsTemplateEstimate?: string; emailjsTemplateClient?: string
}

export interface EmailJsConfig { serviceId: string; publicKey: string; tplShop: string; tplClient: string; missing: string[]; ready: boolean; fromEnv: boolean }

export function emailJsConfig(s: EmailJsSettings): EmailJsConfig {
  const env = (import.meta.env || {}) as Record<string, string | undefined>
  const pick = (...v: (string | undefined)[]) => (v.find(x => (x || '').trim()) || '').trim()
  const serviceId = pick(env.VITE_EMAILJS_SERVICE, s.emailjsServiceId, DEFAULTS.service)
  const publicKey = pick(env.VITE_EMAILJS_PUBLIC_KEY, s.emailjsPublicKey, DEFAULTS.publicKey)
  const tplShop = pick(env.VITE_EMAILJS_TEMPLATE, s.emailjsTemplateBook, s.emailjsTemplateRequest, s.emailjsTemplateEstimate, DEFAULTS.template)
  const tplClient = pick(env.VITE_EMAILJS_TEMPLATE_CLIENT, s.emailjsTemplateClient, DEFAULTS.templateClient)
  const missing = [!serviceId && 'Service ID', !publicKey && 'Public Key', !tplShop && 'Template negozio'].filter(Boolean) as string[]
  return { serviceId, publicKey, tplShop, tplClient, missing, ready: missing.length === 0, fromEnv: !!env.VITE_EMAILJS_SERVICE }
}
