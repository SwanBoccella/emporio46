/**
 * Impostazioni comuni per le animazioni d'ingresso.
 * Ogni elemento parte da solo quando entra davvero nella schermata (non quando la sezione intera tocca il bordo),
 * con un margine in basso: l'animazione si vede mentre si scorre, non prima.
 */
export const REVEAL_VP = { once: true, amount: 'some', margin: '0px 0px -14% 0px' } as const

/**
 * Come REVEAL_VP, ma senza il margine in basso: per gli elementi in fondo alla pagina (barra finale del footer).
 * Con il margine negativo un elemento che sta negli ultimi pixel della pagina non entra mai nella zona osservata,
 * quindi restava a opacità 0 (succedeva soprattutto in modalità desktop, dove lo schermo è alto).
 */
export const REVEAL_VP_END = { once: true, amount: 'some' } as const

/** Le entrate durano più a lungo, così si riesce a seguirle. */
export const REVEAL_SLOW = 1.6
