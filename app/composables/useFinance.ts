// Inzicht in geld, geen financieel advies.
export function useFinance() {
  const { state } = useStore()
  const tasks = useTasks()
  const cal = useCalendar()
  const clients = useClients()

  const months = computed(() => {
    const now = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const tx = state.value.transactions.filter(t => t.date.startsWith(key) && t.category !== 'prive')
      const income = tx.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
      const out = Math.abs(tx.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0))
      return { key, label: monthShort(d.getMonth()), name: monthName(d.getMonth()), income, out, net: income - out }
    })
  })

  const thisMonth = computed(() => months.value[5]!)
  const lastMonth = computed(() => months.value[4]!)
  const avgIncome = computed(() => months.value.reduce((s, m) => s + m.income, 0) / 6)

  const revenueByClient = computed(() => {
    const map = new Map<string, number>()
    for (const t of state.value.transactions) {
      if (t.category === 'omzet' && t.clientId) map.set(t.clientId, (map.get(t.clientId) ?? 0) + t.amount)
    }
    const total = [...map.values()].reduce((s, v) => s + v, 0)
    return [...map.entries()]
      .map(([id, amount]) => ({ client: clients.byId(id)!, amount, share: amount / total }))
      .sort((a, b) => b.amount - a.amount)
  })
  const revenueFor = (clientId: string) => revenueByClient.value.find(r => r.client.id === clientId)?.amount ?? 0

  /** Privé opgenomen dit jaar (telt niet als kosten) */
  const privateYear = computed(() => Math.abs(state.value.transactions.filter(t => t.category === 'prive' && t.amount < 0 && t.date.startsWith(todayISO().slice(0, 4))).reduce((s, t) => s + t.amount, 0)))
  const subscriptions = computed(() => state.value.subscriptions)
  const monthlyFixed = computed(() => state.value.subscriptions.reduce((s, x) => s + x.monthly, 0))

  const openInvoices = computed(() =>
    state.value.invoices
      .filter(i => !i.paid)
      .map(i => ({ ...i, client: clients.byId(i.clientId) ?? { id: '', name: i.clientName || 'Onbekende klant' }, daysLate: Math.max(0, diffDays(todayISO(), i.due)), daysLeft: diffDays(i.due, todayISO()) }))
      .sort((a, b) => a.due.localeCompare(b.due)),
  )
  const openTotal = computed(() => openInvoices.value.reduce((s, i) => s + i.amount, 0))
  const invoicesFor = (clientId: string) => openInvoices.value.filter(i => i.clientId === clientId)

  function planReminder(invoiceId: string) {
    const inv = state.value.invoices.find(i => i.id === invoiceId)
    if (!inv) return null
    const slot = cal.findSlot(15)
    if (!slot) return null
    const c = clients.byId(inv.clientId)
    tasks.add({ title: `Herinnering factuur ${inv.number} (${c?.name ?? inv.clientName ?? 'klant'})`, durationMin: 15, kind: 'admin', invoiceId, date: slot.date, start: slot.start, important: slot.date === todayISO() })
    inv.reminderPlanned = true
    return slot
  }

  function markPaid(invoiceId: string) {
    const inv = state.value.invoices.find(i => i.id === invoiceId)
    if (!inv) return
    inv.paid = true
    state.value.transactions.push({ id: uid('tx'), date: todayISO(), amount: inv.amount, label: `Betaling ${inv.number}`, clientId: inv.clientId, category: 'omzet' })
  }

  return { months, thisMonth, lastMonth, avgIncome, revenueByClient, revenueFor, subscriptions, monthlyFixed, privateYear, openInvoices, openTotal, invoicesFor, planReminder, markPaid }
}
