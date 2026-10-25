/**
 * Impostazioni comuni per le animazioni d'ingresso.
 * Ogni elemento parte da solo quando entra davvero nella schermata (non quando la sezione intera tocca il bordo),
 * con un margine in basso: l'animazione si vede mentre si scorre, non prima.
 */
export const REVEAL_VP = { once: true, amount: 'some', margin: '0px 0px -14% 0px' } as const

/** Le entrate durano più a lungo, così si riesce a seguirle. */
export const REVEAL_SLOW = 1.6
