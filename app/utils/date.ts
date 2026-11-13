// Datumhulpjes. Alles is relatief aan vandaag, zodat de testdata altijd actueel is.
import type { ISODate, Time } from '~/types'

const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
export function fromISO(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}
export function todayISO(): ISODate {
  return toISO(new Date())
}
export function addDays(iso: ISODate, n: number): ISODate {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((fromISO(a).getTime() - fromISO(b).getTime()) / 86400000)
}
/** Vandaag plus de eerstvolgende werkdagen (n in totaal). */
export function planDays(n = 5): ISODate[] {
  const out: ISODate[] = [todayISO()]
  let cur = todayISO()
  while (out.length < n) {
    cur = addDays(cur, 1)
    const wd = fromISO(cur).getDay()
    if (wd !== 0 && wd !== 6) out.push(cur)
  }
  return out
}

const WD_SHORT = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za']
const WD_LONG = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']
const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december']
const MONTHS_SHORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

export const weekdayShort = (iso: ISODate) => WD_SHORT[fromISO(iso).getDay()]!
export const weekdayLong = (iso: ISODate) => WD_LONG[fromISO(iso).getDay()]!
export const dayNum = (iso: ISODate) => fromISO(iso).getDate()
export const monthName = (m: number) => MONTHS[m]!
export const monthShort = (m: number) => MONTHS_SHORT[m]!

/** "vandaag", "morgen", "donderdag", of "do 19 nov" verder weg */
export function relDay(iso: ISODate): string {
  const d = diffDays(iso, todayISO())
  if (d === 0) return 'vandaag'
  if (d === 1) return 'morgen'
  if (d === -1) return 'gisteren'
  if (d > 1 && d < 7) return weekdayLong(iso)
  return `${weekdayShort(iso)} ${dayNum(iso)} ${MONTHS_SHORT[fromISO(iso).getMonth()]}`
}
export function longDate(iso: ISODate): string {
  const d = fromISO(iso)
  return `${WD_LONG[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}
export function shortDate(iso: ISODate): string {
  const d = fromISO(iso)
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

export function toMin(t: Time): number {
  const [h, m] = t.split(':').map(Number)
  return h! * 60 + m!
}
export function fromMin(min: number): Time {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`
}
export function nowMin(): number {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

export function addMonths(iso: ISODate, n: number): ISODate {
  const d = fromISO(iso)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, last))
  return toISO(d)
}
