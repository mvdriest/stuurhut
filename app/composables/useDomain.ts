// Filter (alles/zakelijk/privé), werktijden en avondmodus.
import type { Domain, ISODate } from '~/types'

export type DomainFilter = 'alle' | Domain

const now = ref(new Date())
if (typeof window !== 'undefined') setInterval(() => { now.value = new Date() }, 60_000)

export function useDomain() {
  const { state } = useStore()
  const choice = useLocalStorage<DomainFilter>('stuurhut:domain', 'alle')
  // Avondmodus proberen: blijft staan zolang dit tabblad open is
  const previewOff = useSessionStorage('stuurhut:preview-off', false)
  const work = computed(() => state.value.prefs.workHours)
  // "Toch alles tonen" in de avondmodus: geldt voor deze avond, morgenavond is het weer privé eerst
  const allTonight = useLocalStorage('stuurhut:all-tonight', '')
  const showAllAnyway = computed({
    get: () => allTonight.value === toISO(now.value),
    set: (v: boolean) => { allTonight.value = v ? toISO(now.value) : '' },
  })

  const isWorkday = (date: ISODate) => work.value.days.includes(fromISO(date).getDay())
  function isWorkTime(date: ISODate, min: number) {
    return isWorkday(date) && min >= toMin(work.value.start) && min < toMin(work.value.end)
  }
  /** Valt (een deel van) dit blok buiten werktijd? */
  function outsideWork(date: ISODate, start: string, end: string) {
    if (!isWorkday(date)) return true
    return toMin(start) < toMin(work.value.start) || toMin(end) > toMin(work.value.end)
  }

  const off = computed(() => previewOff.value || !isWorkTime(toISO(now.value), now.value.getHours() * 60 + now.value.getMinutes()))
  /** Avondmodus: buiten werktijd en geen eigen keuze gemaakt → privé eerst. */
  const evening = computed(() => choice.value === 'alle' && off.value && !showAllAnyway.value)
  const effective = computed<DomainFilter>(() => (choice.value !== 'alle' ? choice.value : evening.value ? 'prive' : 'alle'))
  const matches = (d: Domain) => effective.value === 'alle' || effective.value === d

  /** Wanneer begint de volgende werkdag? */
  const nextWorkStart = computed(() => {
    let d = toISO(now.value)
    const nowM = now.value.getHours() * 60 + now.value.getMinutes()
    if (isWorkday(d) && nowM < toMin(work.value.start)) return { date: d, start: work.value.start }
    for (let i = 0; i < 8; i++) {
      d = addDays(d, 1)
      if (isWorkday(d)) return { date: d, start: work.value.start }
    }
    return { date: d, start: work.value.start }
  })

  /** Bewust "Alles" kiezen in de avond betekent: vanavond echt alles tonen. */
  function set(f: DomainFilter) {
    choice.value = f
    showAllAnyway.value = f === 'alle' && off.value
  }

  return { choice, effective, evening, off, matches, set, showAllAnyway, previewOff, work, isWorkday, isWorkTime, outsideWork, nextWorkStart }
}
