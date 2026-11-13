// Dagstart, dagafsluiting en weekreview: de vaste momenten waar Stuurhut op leunt.
import type { DayEnd, DayStart, ISODate, WeekReview } from '~/types'

export type RitualKey = 'dagstart' | 'afsluiten' | 'weekreview'

export function useRituals() {
  const { state } = useStore()
  const D = useDomain()
  const today = todayISO()
  const monday = weekStart(today)

  const r = computed(() => state.value.rituals)
  const started = computed(() => r.value.dayStart[today] ?? null)
  const ended = computed(() => r.value.dayEnd[today] ?? null)
  const reviewed = computed(() => r.value.weekReview[monday] ?? null)

  /** Welk moment past nu? */
  const recommended = computed<RitualKey | null>(() => {
    const h = new Date().getHours()
    const fri = fromISO(today).getDay() === 5
    if (!started.value && h < 12 && !D.off.value) return 'dagstart'
    if (fri && !reviewed.value && h >= 14) return 'weekreview'
    if (!ended.value && (D.off.value || h >= 17)) return 'afsluiten'
    if (!started.value && h < 15) return 'dagstart'
    return null
  })

  function saveDayStart(d: Omit<DayStart, 'at'>) {
    r.value.dayStart[today] = { ...d, at: new Date().toISOString() }
  }
  function saveDayEnd(d: Omit<DayEnd, 'at'>) {
    r.value.dayEnd[today] = { ...d, at: new Date().toISOString() }
  }
  function saveWeekReview(d: Omit<WeekReview, 'at'>) {
    r.value.weekReview[monday] = { ...d, at: new Date().toISOString() }
  }
  const winsThisWeek = computed(() => Object.entries(r.value.dayEnd)
    .filter(([d, e]) => d >= monday && d <= today && e.win)
    .map(([d, e]) => ({ date: d as ISODate, win: e.win! })))

  return { today, monday, started, ended, reviewed, recommended, saveDayStart, saveDayEnd, saveWeekReview, winsThisWeek }
}
