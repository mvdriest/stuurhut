// ============================================================
//  VOORTGANG
//  Freelancers zien vooral wat er nog moet. Dit telt wat er af
//  is in een periode, zodat de weekreview en de terugblik het
//  kunnen laten zien. Alleen wat Stuurhut zelf al weet.
// ============================================================
import type { AppState, ISODate } from '~/types'
import { addDays, fromISO } from './date'
import { clockMin, clock } from './sleep'

export interface Progress {
  done: { id: string, title: string }[]
  hours: number
  invoiced: number
  quotes: number
  tasksDone: number
  routinesDone: number
  wins: number
  energy: number | null
  wake: string | null
  freeEvenings: { free: number, of: number } | null
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const inRange = (d: ISODate | undefined, from: ISODate, to: ISODate) => !!d && d >= from && d <= to

/** Wat er af is tussen `from` en `to` (beide meegeteld). */
export function progressIn(s: AppState, from: ISODate, to: ISODate): Progress {
  const doneKind = new Set(s.board.filter(c => c.kind === 'done').map(c => c.name))
  const days = s.rhythm.filter(d => inRange(d.date, from, to))
  const weekdays = days.filter(d => ![0, 6].includes(fromISO(d.date).getDay()))
  // Een avond zonder werk: de nacht erna staat er geen "nog gewerkt" bij
  const evenings = days.filter(d => [2, 3, 4, 5, 6].includes(fromISO(d.date).getDay()) && d.bed)
  const wakeAvg = avg(weekdays.filter(d => d.woke).map(d => clockMin(d.woke!)))
  let routinesDone = 0
  for (const r of s.routines) for (const [d, l] of Object.entries(r.log)) if (l.done && inRange(d, from, to)) routinesDone++
  return {
    done: s.assignments.filter(a => doneKind.has(a.status) && inRange(a.statusSince, from, to)).map(a => ({ id: a.id, title: a.title })),
    hours: s.timeEntries.filter(e => inRange(e.date, from, to)).reduce((sum, e) => sum + e.hours, 0),
    invoiced: s.invoices.filter(i => inRange(i.sentOn, from, to)).reduce((sum, i) => sum + i.amount, 0),
    quotes: s.quotes.filter(q => inRange(q.sentOn, from, to)).length,
    tasksDone: s.tasks.filter(t => t.done && inRange(t.date, from, to)).length,
    routinesDone,
    wins: Object.entries(s.rituals.dayEnd).filter(([d, e]) => inRange(d, from, to) && e.win).length,
    energy: avg(days.map(d => d.energy).filter((e): e is NonNullable<typeof e> => e != null)),
    wake: wakeAvg === null ? null : clock(wakeAvg),
    freeEvenings: evenings.length ? { free: evenings.filter(d => !d.lastWork).length, of: evenings.length } : null,
  }
}

/** Twee periodes van `days` dagen naast elkaar: de laatste, en die ervoor. Gisteren is de laatste dag. */
export function comparePeriods(s: AppState, today: ISODate, days = 28) {
  const end = addDays(today, -1)
  const start = addDays(end, -(days - 1))
  const prevEnd = addDays(start, -1)
  const prevStart = addDays(prevEnd, -(days - 1))
  return { now: progressIn(s, start, end), before: progressIn(s, prevStart, prevEnd), range: { start, end, prevStart, prevEnd } }
}
