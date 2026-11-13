// Afspraken, dagbelasting en het vinden van een vrije plek. Ritme (energiepatroon) stuurt mee.
import type { CalendarEvent, Domain, ISODate, Task, Time } from '~/types'
import { domainOf } from '~/utils/domain'

export const DAY_START = 8 * 60
export const DAY_END = 21 * 60

export type DayItem =
  | { type: 'event', id: string, start: Time, end: Time, title: string, ref: CalendarEvent }
  | { type: 'task', id: string, start: Time, end: Time, title: string, ref: Task }

export type LoadLevel = 'rustig' | 'normaal' | 'vol'

export function useCalendar() {
  const { state } = useStore()
  const tasks = useTasks()

  const days = computed(() => planDays(5))
  const events = computed(() => state.value.events)
  const eventsOn = (date: ISODate) =>
    state.value.events.filter(e => e.date === date).sort((a, b) => toMin(a.start) - toMin(b.start))

  function dayItems(date: ISODate, includeCancelled = false): DayItem[] {
    const ev: DayItem[] = eventsOn(date)
      .filter(e => includeCancelled || !e.cancelled)
      .map(e => ({ type: 'event', id: e.id, start: e.start, end: e.end, title: e.title, ref: e }))
    const tk: DayItem[] = tasks.scheduledOn(date).map(t => ({
      type: 'task', id: t.id, start: t.start!, end: fromMin(toMin(t.start!) + t.durationMin), title: t.title, ref: t,
    }))
    return [...ev, ...tk].sort((a, b) => toMin(a.start) - toMin(b.start))
  }

  /** Werkbelasting: alleen zakelijk telt mee. */
  function dayLoad(date: ISODate) {
    const minutes = dayItems(date).filter(i => domainOf(i) === 'zakelijk').reduce((s, i) => s + (toMin(i.end) - toMin(i.start)), 0)
    const level: LoadLevel = minutes < 150 ? 'rustig' : minutes < 330 ? 'normaal' : 'vol'
    return { minutes, level, ratio: Math.min(1, minutes / 480) }
  }

  function isFree(date: ISODate, start: number, dur: number, excludeTaskId?: string) {
    return dayItems(date).every((i) => {
      if (i.type === 'task' && i.id === excludeTaskId) return true
      return toMin(i.end) <= start || toMin(i.start) >= start + dur
    })
  }

  /**
   * Zoekt een eerlijke plek. Zakelijk: alleen binnen je werktijden, geen volle dagen als het
   * niet hoeft, denkwerk ’s ochtends als de ochtendvoorkeur aan staat. Privé: na je werktijd.
   * Nooit in het verleden.
   */
  function findSlot(dur: number, opts: { deep?: boolean, preferMorning?: boolean, excludeTaskId?: string, fromIndex?: number, domain?: Domain } = {}) {
    const wh = state.value.prefs.workHours
    const list = days.value.slice(opts.fromIndex ?? 0)
    const today = todayISO()
    const earliest = Math.ceil((nowMin() + 15) / 15) * 15
    if (opts.domain === 'prive') {
      for (const date of list) {
        const from = wh.days.includes(fromISO(date).getDay()) ? toMin(wh.end) : 10 * 60
        for (let s = Math.ceil(from / 15) * 15; s + dur <= DAY_END; s += 15) {
          if (date === today && s < earliest) continue
          if (isFree(date, s, dur, opts.excludeTaskId)) return { date, start: fromMin(s) }
        }
      }
      return null
    }
    const morning = opts.preferMorning || (opts.deep && state.value.prefs.morningFocus)
    const ws = Math.max(toMin(wh.start), 9 * 60)
    const we = toMin(wh.end)
    const passes: { avoidFull: boolean, latestEnd: number }[] = [
      ...(morning ? [{ avoidFull: true, latestEnd: Math.min(we, 12 * 60 + 30) }] : []),
      { avoidFull: true, latestEnd: we },
      { avoidFull: false, latestEnd: we },
    ]
    for (const p of passes) {
      for (const date of list) {
        if (!wh.days.includes(fromISO(date).getDay())) continue
        if (p.avoidFull && dayLoad(date).level === 'vol') continue
        for (let s = ws; s + dur <= p.latestEnd; s += 15) {
          if (date === today && s < earliest) continue
          if (isFree(date, s, dur, opts.excludeTaskId)) return { date, start: fromMin(s) }
        }
      }
    }
    return null
  }

  /** Eerste vrije plek op één bepaalde dag, vanaf een gewenst tijdstip. */
  function findSlotOn(date: ISODate, dur: number, from = 9 * 60, excludeTaskId?: string) {
    const earliest = date === todayISO() ? Math.ceil((nowMin() + 15) / 15) * 15 : DAY_START
    for (let s = Math.max(from, earliest); s + dur <= DAY_END; s += 15) {
      if (isFree(date, s, dur, excludeTaskId)) return { date, start: fromMin(s) }
    }
    return null
  }

  function eventById(id: string) {
    return state.value.events.find(e => e.id === id)
  }

  function addEvent(e: Omit<CalendarEvent, 'id'>) {
    const ev: CalendarEvent = { ...e, id: uid('e') }
    state.value.events.push(ev)
    return ev
  }
  function updateEvent(id: string, patch: Partial<CalendarEvent>) {
    const e = eventById(id)
    if (e) Object.assign(e, patch)
  }
  function removeEvent(id: string) {
    const idx = state.value.events.findIndex(e => e.id === id)
    if (idx < 0) return () => {}
    const [e] = state.value.events.splice(idx, 1)
    return () => { state.value.events.splice(idx, 0, e!) }
  }

  return { days, events, eventsOn, eventById, dayItems, dayLoad, isFree, findSlot, findSlotOn, addEvent, updateEvent, removeEvent }
}
