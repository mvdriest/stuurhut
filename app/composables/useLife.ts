// Levensadmin: dingen die terugkomen. Eén keer erin, Stuurman meldt ze op tijd.
import type { LifeCategory, LifeItem } from '~/types'

export const LIFE_CATEGORIES: Record<LifeCategory, { label: string, icon: string, fill: string }> = {
  auto: { label: 'Auto', icon: 'tabler:car', fill: 'bg-cat-meeting' },
  gezondheid: { label: 'Gezondheid', icon: 'tabler:heart', fill: 'bg-cat-prive' },
  verzekering: { label: 'Verzekering', icon: 'tabler:shield', fill: 'bg-cat-focus' },
  abonnement: { label: 'Abonnement', icon: 'tabler:repeat', fill: 'bg-cat-admin' },
  documenten: { label: 'Documenten', icon: 'tabler:id', fill: 'bg-cat-taak' },
  huis: { label: 'Huis', icon: 'tabler:home-2', fill: 'bg-surface-3' },
}

export function useLife() {
  const { state } = useStore()
  const tasks = useTasks()
  const cal = useCalendar()
  const today = todayISO()

  const days = (l: LifeItem) => diffDays(l.due, today)
  const status = (l: LifeItem) => (l.done ? 'geregeld' : days(l) < 0 ? 'te laat' : days(l) <= l.remindDays ? 'binnenkort' : 'later')
  const items = computed(() => [...state.value.life].sort((a, b) => a.due.localeCompare(b.due)))
  const soon = computed(() => items.value.filter(l => !l.done && days(l) <= l.remindDays))
  const later = computed(() => items.value.filter(l => !l.done && days(l) > l.remindDays))
  const doneList = computed(() => items.value.filter(l => l.done))

  /** Geregeld: terugkerend schuift door, eenmalig gaat naar geregeld. Geeft herstellen terug. */
  function complete(id: string) {
    const l = state.value.life.find(x => x.id === id)
    if (!l) return () => {}
    const before = { due: l.due, done: l.done }
    if (l.repeatMonths) l.due = addMonths(l.due, l.repeatMonths)
    else l.done = true
    return () => Object.assign(l, before)
  }

  /** Een kwartier privé-tijd om het te regelen. */
  function plan(id: string) {
    const l = state.value.life.find(x => x.id === id)
    if (!l) return null
    const slot = cal.findSlot(15, { domain: 'prive' })
    if (!slot) return null
    tasks.add({ title: l.title, durationMin: 15, kind: 'persoonlijk', domain: 'prive', date: slot.date, start: slot.start })
    return slot
  }

  function add(l: Omit<LifeItem, 'id'>) {
    state.value.life.push({ ...l, id: uid('l') })
  }
  function update(id: string, patch: Partial<LifeItem>) {
    const l = state.value.life.find(x => x.id === id)
    if (l) Object.assign(l, patch)
  }
  function remove(id: string) {
    const idx = state.value.life.findIndex(x => x.id === id)
    if (idx < 0) return () => {}
    const [l] = state.value.life.splice(idx, 1)
    return () => { state.value.life.splice(idx, 0, l!) }
  }

  return { items, soon, later, doneList, days, status, complete, plan, add, update, remove }
}
