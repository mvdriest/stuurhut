// Dagstart, dagafsluiting en weekreview: de vaste momenten waar Stuurhut op leunt.
import type { DayEnd, DayStart, ISODate, RhythmDay, WeekReview } from '~/types'

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
    // Ook in je ritme van vandaag (slaap uit Gezondheid blijft staan als die er al is)
    const list = state.value.rhythm
    const i = list.findIndex(x => x.date === today)
    const prev = i >= 0 ? list[i]! : undefined
    const day = {
      date: today,
      sleepH: prev?.sleepH || d.sleep || (d.bed && d.woke ? sleepHours(d.bed, d.woke) : 0),
      moveMin: prev?.moveMin ?? 0,
      workH: prev?.workH ?? 0,
      ...(prev ?? {}),
      bed: d.bed ?? prev?.bed,
      woke: d.woke ?? prev?.woke,
      energy: (d.energy ?? prev?.energy) as RhythmDay['energy'],
      rested: d.rested ?? prev?.rested,
    }
    const clean = JSON.parse(JSON.stringify(day)) as RhythmDay
    if (i >= 0) list.splice(i, 1, clean)
    else list.push(clean)
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
