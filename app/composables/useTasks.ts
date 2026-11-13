import type { ISODate, Task, Time } from '~/types'

export function useTasks() {
  const { state } = useStore()

  const tasks = computed(() => state.value.tasks)
  const unscheduled = computed(() => state.value.tasks.filter(t => !t.date && !t.done))
  const byId = (id: string) => state.value.tasks.find(t => t.id === id)
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
    if (t) t.done = !t.done
  }
  function remove(id: string) {
    const idx = state.value.tasks.findIndex(t => t.id === id)
    if (idx < 0) return () => {}
    const [t] = state.value.tasks.splice(idx, 1)
    return () => { state.value.tasks.splice(idx, 0, t!) }
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

  return { planFirstStep, tasks, unscheduled, byId, scheduledOn, add, schedule, unschedule, toggleDone, remove, update }
}
