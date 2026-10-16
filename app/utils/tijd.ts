// Tijd in Nederland, onafhankelijk van waar de code draait. De server (SSR) staat
// in productie op UTC; zonder vaste tijdzone krijgen server en browser een ander
// uur, en dus een andere begroeting/hero-foto (hydration-mismatch).
const TIJDZONE = 'Europe/Amsterdam'

const MAAND_NAMEN = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december'
]

export interface NederlandseTijd {
  jaar: number
  maand: number // 0-11
  dag: number
  uur: number
}

export function nederlandseTijd(moment: number | Date = Date.now()): NederlandseTijd {
  const delen = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIJDZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    hourCycle: 'h23'
  }).formatToParts(moment)
  const deel = (type: Intl.DateTimeFormatPartTypes) => Number(delen.find(d => d.type === type)?.value)
  return { jaar: deel('year'), maand: deel('month') - 1, dag: deel('day'), uur: deel('hour') }
}

// YYYY-MM-DD van de Nederlandse kalenderdag waarin `moment` valt.
export function nederlandseDatum(moment: number | string | Date = Date.now()) {
  return new Date(moment).toLocaleDateString('en-CA', { timeZone: TIJDZONE })
}

export function formatDatumNl(tijd: NederlandseTijd) {
  return `${tijd.dag} ${MAAND_NAMEN[tijd.maand]} ${tijd.jaar}`
}
