// ============================================================
//  SLAAPRITME
//  Je opstaantijd is het anker. Elke week een kwartier eerder,
//  tot je doel. Je bedtijd en het moment dat de laptop dichtgaat
//  worden daaruit teruggerekend.
// ============================================================
import type { ISODate, SleepPlan, SleepWeek, Time } from '~/types'
import { addDays, diffDays, fromISO } from './date'

const DAY = 1440
const pad = (n: number) => String(n).padStart(2, '0')

/** Minuten sinds middernacht */
export const clockMin = (t: Time) => {
  const [h, m] = t.split(':').map(Number)
  return h! * 60 + m!
}
/** Minuten (ook negatief of boven 24 uur) terug naar een klok. */
export const clock = (min: number): Time => {
  const m = ((Math.round(min) % DAY) + DAY) % DAY
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
}
/** Een avond- of nachttijd rond middernacht: 22:00 → −120, 00:30 → 30. */
export const nightMin = (t: Time) => {
  const m = clockMin(t)
  return m >= 12 * 60 ? m - DAY : m
}
/** Inslapen duurt ongeveer een kwartier. */
export const FALL_ASLEEP = 15

/** Slaap in uren tussen naar bed en opstaan. */
export const sleepHours = (bed: Time, woke: Time) => Math.max(0, (clockMin(woke) - nightMin(bed) - FALL_ASLEEP) / 60)

export const monday = (iso: ISODate) => {
  const wd = fromISO(iso).getDay()
  return addDays(iso, wd === 0 ? -6 : 1 - wd)
}
export const isWeekend = (iso: ISODate) => [0, 6].includes(fromISO(iso).getDay())

/** Welke week van het plan (0 = de eerste). Negatief = voor je begon. */
export const planWeek = (p: SleepPlan, date: ISODate) => Math.floor(diffDays(monday(date), p.startedOn) / 7)

/**
 * Je opstaantijd voor een bepaalde ochtend. Voor weken die al besloten zijn, staat het vast.
 * Verder vooruit: één stap per week vanaf het laatste besluit, als het lukt.
 */
export function wakeTarget(p: SleepPlan, date: ISODate): Time {
  const w = planWeek(p, date)
  if (w < 0) return p.startWake
  const mon = monday(date)
  const rec = p.weeks?.[mon]
  if (rec) return rec.wake
  const last = Object.keys(p.weeks ?? {}).filter(k => k <= mon).sort().at(-1)
  if (last) return clock(Math.max(clockMin(p.goalWake), clockMin(p.weeks![last]!.wake) - p.stepMin * (diffDays(mon, last) / 7)))
  return clock(Math.max(clockMin(p.goalWake), clockMin(p.startWake) - p.stepMin * (w + 1)))
}

/** Zoveel doordeweekse ochtenden moeten lukken voor de volgende stap. */
export const PASS = 3

/** Hoe ging een week? Telt de doordeweekse ochtenden die je invulde. */
export function weekScore(p: SleepPlan, mornings: { date: ISODate, woke: Time }[], mon: ISODate) {
  const days = mornings.filter(m => m.date >= mon && m.date <= addDays(mon, 4))
  const done = days.filter(m => clockMin(m.woke) <= clockMin(wakeTarget(p, m.date)) + 15).length
  return { done, of: days.length }
}

/** Het besluit voor een nieuwe week: een stap eerder als de vorige week lukte, anders dezelfde tijd. */
export function decideWeek(p: SleepPlan, mornings: { date: ISODate, woke: Time }[], mon: ISODate): SleepWeek {
  const prevMon = addDays(mon, -7)
  const prev = wakeTarget(p, prevMon)
  if (planWeek(p, mon) === 0) return { wake: clock(Math.max(clockMin(p.goalWake), clockMin(p.startWake) - p.stepMin)), decision: 'start' }
  const { done, of } = weekScore(p, mornings, prevMon)
  if (done >= PASS) return { wake: clock(Math.max(clockMin(p.goalWake), clockMin(prev) - p.stepMin)), decision: 'stap', done, of }
  return { wake: prev, decision: 'blijft', done, of }
}
/** Hoeveel speling telt nog als gelukt: een kwartier, in het weekend een uur. */
export const allowance = (date: ISODate) => (isWeekend(date) ? 60 : 15)

/** In bed, voor de ochtend van `wakeDate`. */
export const bedTarget = (p: SleepPlan, wakeDate: ISODate): Time =>
  clock(clockMin(wakeTarget(p, wakeDate)) - p.needH * 60 - FALL_ASLEEP)
/** Laptop dicht, de avond voor `wakeDate`. */
export const laptopTarget = (p: SleepPlan, wakeDate: ISODate): Time =>
  clock(nightMin(bedTarget(p, wakeDate)) - p.windDownMin)

/** Nog zoveel weken tot je doel, deze week niet meegeteld. */
export function weeksToGoal(p: SleepPlan, date: ISODate) {
  return Math.max(0, Math.ceil((clockMin(wakeTarget(p, date)) - clockMin(p.goalWake)) / p.stepMin))
}

/** Verschil in minuten, als tekst: "25 min", "1 u 10 min". */
export function minText(min: number) {
  const m = Math.round(Math.abs(min))
  if (m < 60) return `${m} min`
  return m % 60 ? `${Math.floor(m / 60)} u ${m % 60} min` : `${m / 60} uur`
}

export const MORNING_DEFAULT: NonNullable<SleepPlan['morning']> = { firstBlock: false, offsetMin: 45, blockMin: 90 }
/** Je eerste werkblok: zoveel na je opstaantijd, op een heel kwartier. */
export function anchorTime(p: SleepPlan, date: ISODate): Time {
  const m = p.morning ?? MORNING_DEFAULT
  return clock(Math.ceil((clockMin(wakeTarget(p, date)) + m.offsetMin) / 15) * 15)
}
/** Uiterlijk opstaan in het weekend: een uur na je doordeweekse tijd. */
export const weekendLatest = (p: SleepPlan, date: ISODate): Time => clock(clockMin(wakeTarget(p, date)) + 60)
