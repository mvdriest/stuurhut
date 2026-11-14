// Tijd en geld per klant: uren tegenover budget, euro per uur, offertes en factureren.
import type { Project, QuoteStatus } from '~/types'

export function useWork() {
  const { state } = useStore()
  const clients = useClients()
  const finance = useFinance()
  const today = todayISO()

  const hoursFor = (projectId: string) => state.value.timeEntries.filter(e => e.projectId === projectId).reduce((s, e) => s + e.hours, 0)
  const entriesFor = (projectId: string) => state.value.timeEntries.filter(e => e.projectId === projectId).sort((a, b) => b.date.localeCompare(a.date))

  function stats(p: Project) {
    const hours = hoursFor(p.id)
    const budgetHours = p.hourlyRate ? p.budget / p.hourlyRate : 0
    const billable = Math.max(0, Math.min(hours, budgetHours) - p.billedHours)
    const over = Math.max(0, hours - budgetHours)
    return { hours, budgetHours, pct: budgetHours ? hours / budgetHours : 0, over, billable, billableAmount: billable * p.hourlyRate }
  }

  /** Wat je per klant echt per uur verdient (omzet excl. btw gedeeld door gewerkte uren). */
  const perHour = computed(() => state.value.clients
    .map((c) => {
      const hours = clients.projectsFor(c.id).reduce((s, p) => s + hoursFor(p.id), 0)
      const revenueEx = finance.revenueFor(c.id) / (1 + state.value.prefs.tax.vat)
      return { client: c, hours, revenueEx, rate: hours ? revenueEx / hours : 0 }
    })
    .filter(x => x.hours > 0)
    .sort((a, b) => b.rate - a.rate))

  function logHours(projectId: string, hours: number, note?: string) {
    state.value.timeEntries.push({ id: uid('te'), projectId, date: today, hours, note })
  }

  /** Factuur voor de gewerkte uren binnen budget. Meer uren dan begroot vragen eerst om een gesprek. */
  function invoiceProject(projectId: string) {
    const p = state.value.projects.find(x => x.id === projectId)
    if (!p) return null
    const s = stats(p)
    if (s.billable <= 0) return null
    const nums = state.value.invoices.map(i => Number(i.number.split('-').pop())).filter(Number.isFinite)
    const number = `F-${today.slice(0, 4)}-${String(Math.max(0, ...nums) + 1).padStart(3, '0')}`
    const amount = Math.round(s.billableAmount * (1 + state.value.prefs.tax.vat) * 100) / 100
    const inv = { id: uid('f'), number, clientId: p.clientId, amount, sentOn: today, due: addDays(today, 30) }
    state.value.invoices.push(inv)
    p.billedHours += s.billable
    return inv
  }

  // ---------- Offertes ----------
  const quotesFor = (clientId: string) => state.value.quotes.filter(q => q.clientId === clientId)
  const quoteDays = (q: { sentOn?: string }) => (q.sentOn ? diffDays(today, q.sentOn) : 0)
  const followUps = computed(() => state.value.quotes.filter(q => q.status === 'verstuurd' && quoteDays(q) >= 5))
  const pipeline = computed(() => {
    const open = state.value.quotes.filter(q => q.status === 'concept' || q.status === 'verstuurd')
    return { count: open.length, amount: open.reduce((s, q) => s + q.amount, 0) }
  })

  function setQuoteStatus(id: string, status: QuoteStatus) {
    const q = state.value.quotes.find(x => x.id === id)
    if (!q) return
    q.status = status
    if (status === 'verstuurd') q.sentOn = today
    if (status === 'akkoord' || status === 'afgewezen') q.decidedOn = today
    if (status === 'akkoord') {
      const c = clients.byId(q.clientId)
      if (c && c.status === 'lead') c.status = 'lopend'
      const existing = clients.projectsFor(q.clientId).find(p => p.status === 'lead' || p.name === q.title)
      if (existing) Object.assign(existing, { status: 'lopend', budget: q.amount })
      else state.value.projects.push({ id: uid('pr'), clientId: q.clientId, name: q.title, status: 'lopend', progress: 0, budget: q.amount, hourlyRate: MEERWERK_TARIEF, billedHours: 0 })
      c?.timeline.unshift({ id: uid('tl'), kind: 'notitie', date: today, title: `Akkoord op offerte: ${q.title}`, body: euro(q.amount) })
    }
  }
  function addQuote(clientId: string, title: string, amount: number) {
    state.value.quotes.push({ id: uid('q'), clientId, title, amount, status: 'concept' })
  }

  return { hoursFor, entriesFor, stats, perHour, logHours, invoiceProject, quotesFor, quoteDays, followUps, pipeline, setQuoteStatus, addQuote }
}
