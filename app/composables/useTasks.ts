import type { ISODate, Task, Time } from '~/types'

export function useTasks() {
  const { state } = useStore()

  const tasks = computed(() => state.value.tasks)
  /** Een opgedeelde taak plan je niet zelf in, wel zijn subtaken. */
  const isParent = (t: Task) => state.value.tasks.some(s => s.parentId === t.id)
  const unscheduled = computed(() => state.value.tasks.filter(t => !t.date && !t.done && !isParent(t)))
  const byId = (id: string) => state.value.tasks.find(t => t.id === id)
  const subtasksOf = (id: string) => state.value.tasks.filter(t => t.parentId === id).sort((a, b) => (a.step ?? 0) - (b.step ?? 0))
  const scheduledOn = (date: ISODate) =>
    state.value.tasks.filter(t => t.date === date && t.start).sort((a, b) => toMin(a.start!) - toMin(b.start!))

  function add(t: Omit<Task, 'id'>): Task {
    const task: Task = { ...t, id: uid('t') }
    state.value.tasks.push(task)
    return state.value.tasks[state.value.tasks.length - 1]!
  }
  function schedule(id: string, date: ISODate, start: Time) {
    const t = byId(id)
    if (!t) return
    // Doorschuiven tellen: daar zie ik aan dat iets blijft liggen
    if (t.date && date > t.date) t.moved = (t.moved ?? 0) + 1
    t.date = date
    t.start = start
  }
  function unschedule(id: string) {
    const t = byId(id)
    if (t) { delete t.date; delete t.start }
  }
  function toggleDone(id: string) {
    const t = byId(id)
    if (!t) return
    t.done = !t.done
    // Alle subtaken af: dan is de hoofdtaak ook af
    if (t.parentId) {
      const parent = byId(t.parentId)
      if (parent) parent.done = subtasksOf(parent.id).every(s => s.done)
    }
  }
  /** Verwijdert de taak en, bij een hoofdtaak, ook de subtaken. */
  function remove(id: string) {
    const removed: { idx: number, t: Task }[] = []
    state.value.tasks.forEach((t, idx) => { if (t.id === id || t.parentId === id) removed.push({ idx, t }) })
    if (!removed.length) return () => {}
    for (const r of [...removed].reverse()) state.value.tasks.splice(r.idx, 1)
    return () => { for (const r of removed) state.value.tasks.splice(r.idx, 0, r.t) }
  }
  function update(id: string, patch: Partial<Task>) {
    const t = byId(id)
    if (t) Object.assign(t, patch)
  }

  /** Een eerste stap van een kwartier, op een goed moment. Geeft de nieuwe taak terug. */
  function planFirstStep(text: string, opts: { assignmentId?: string, taskId?: string, clientId?: string }) {
    const cal = useCalendar()
    const slot = cal.findSlot(15, { preferMorning: true, domain: 'zakelijk' })
    if (!slot) return null
    return add({ title: `Eerste stap: ${text}`, durationMin: 15, kind: 'taak', domain: 'zakelijk', date: slot.date, start: slot.start, assignmentId: opts.assignmentId, clientId: opts.clientId, firstStepOf: opts.taskId ?? opts.assignmentId })
  }

  return { planFirstStep, tasks, unscheduled, byId, subtasksOf, isParent, scheduledOn, add, schedule, unschedule, toggleDone, remove, update }
}
