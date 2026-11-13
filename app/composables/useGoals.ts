// Doelen met hun actuele stand. De stand komt uit de andere bronnen waar dat kan.
export function useGoals() {
  const { state } = useStore()
  const finance = useFinance()

  const goals = computed(() => state.value.goals.map((g) => {
    let current = g.current
    if (g.id === 'g1') current = finance.thisMonth.value.income
    if (g.id === 'g4') current = state.value.rhythm.slice(-7).reduce((s, d) => s + d.workH, 0)
    if (g.id === 'g6') {
      const wh = state.value.prefs.workHours
      current = planDays(5).filter(d => !state.value.tasks.some(t => t.date === d && t.start && domainOfTask(t) === 'zakelijk' && toMin(t.start) + t.durationMin > toMin(wh.end))
        && !state.value.events.some(e => e.date === d && !e.cancelled && domainOfEvent(e) === 'zakelijk' && toMin(e.end) > toMin(wh.end))).length
    }
    if (g.id === 'g3') {
      const o1 = state.value.opportunities.find(o => o.id === 'o1')
      const sketch = state.value.tasks.some(t => (t.id === 't5' && t.date) || (t.opportunityId === 'o1' && t.date))
      current = 1 + (sketch || o1?.status === 'ingepland' ? 1 : 0)
    }
    const pct = g.kind === 'grens' ? Math.min(1, current / g.target) : Math.min(1, current / g.target)
    const ok = g.kind === 'grens' ? current <= g.target : pct >= 1
    const value = g.kind === 'geld' ? euroRound(current) : g.kind === 'grens' ? `${Math.round(current)} u` : `${current}`
    const of = g.kind === 'geld' ? euroRound(g.target) : g.kind === 'grens' ? `${g.target} u` : `${g.target}`
    return { ...g, domain: g.domain ?? 'zakelijk', current, pct, ok, value, of }
  }))

  return { goals }
}
