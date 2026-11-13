import type { Opportunity, OpportunityStatus } from '~/types'

export function useOpportunities() {
  const { state } = useStore()
  const tasks = useTasks()
  const cal = useCalendar()

  const opportunities = computed(() => state.value.opportunities)
  const byId = (id: string) => state.value.opportunities.find(o => o.id === id)

  function add(o: Omit<Opportunity, 'id' | 'status'> & { status?: OpportunityStatus }) {
    const opp: Opportunity = { status: 'nieuw', ...o, id: uid('o') }
    state.value.opportunities.unshift(opp)
    return opp
  }

  /** Uitwerkblok voor een kans in Week zetten. */
  function planBlock(id: string, durationMin = 120) {
    const o = byId(id)
    if (!o) return null
    const existing = state.value.tasks.find(t => t.opportunityId === id && t.kind === 'focus' && t.date && !t.done)
    if (existing) return { date: existing.date!, start: existing.start! }
    const slot = cal.findSlot(durationMin, { deep: true, preferMorning: true })
    if (!slot) return null
    tasks.add({ title: `Uitwerken: ${o.title}`, durationMin, kind: 'focus', opportunityId: id, deep: true, date: slot.date, start: slot.start })
    return slot
  }

  function setStatus(id: string, status: OpportunityStatus) {
    const o = byId(id)
    if (!o) return null
    const prev = o.status
    o.status = status
    if (status === 'ingepland') return planBlock(id)
    if (prev === 'ingepland') {
      state.value.tasks = state.value.tasks.filter(t => !(t.opportunityId === id && t.kind === 'focus' && t.title.startsWith('Uitwerken')))
    }
    return null
  }

  return { opportunities, byId, add, setStatus, planBlock }
}
