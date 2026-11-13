// Btw en belasting apart zetten. Inzicht, geen advies: percentages stel je zelf in.
export function useTax() {
  const { state } = useStore()
  const finance = useFinance()
  const clients = useClients()
  const today = todayISO()
  const tax = computed(() => state.value.prefs.tax)

  const now = fromISO(today)
  const q = Math.floor(now.getMonth() / 3)
  const qStart = toISO(new Date(now.getFullYear(), q * 3, 1))
  const qEnd = toISO(new Date(now.getFullYear(), q * 3 + 3, 0))
  const deadline = toISO(new Date(now.getFullYear(), q * 3 + 4, 0))
  const quarter = `Q${q + 1}`
  const monthKey = today.slice(0, 7)

  function split(amount: number) {
    const vat = (amount * tax.value.vat) / (1 + tax.value.vat)
    const ex = amount - vat
    const reserve = ex * tax.value.reserve
    return { vat, reserve, yours: ex - reserve }
  }

  const payments = computed(() => state.value.transactions
    .filter(t => t.category === 'omzet' && t.amount > 0 && t.date >= qStart && t.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(t => ({ ...t, client: clients.byId(t.clientId), ...split(t.amount) })))

  const vatDeductible = computed(() => state.value.transactions
    .filter(t => t.amount < 0 && (t.category === 'abonnement' || t.category === 'overig') && t.date >= qStart && t.date <= today)
    .reduce((s, t) => s + (-t.amount * tax.value.vat) / (1 + tax.value.vat), 0))

  const quarterTotals = computed(() => {
    const received = payments.value.reduce((s, p) => s + p.amount, 0)
    const vatIn = payments.value.reduce((s, p) => s + p.vat, 0)
    const reserve = payments.value.reduce((s, p) => s + p.reserve, 0)
    return { received, vatIn, vatDue: Math.max(0, vatIn - vatDeductible.value), vatDeductible: vatDeductible.value, reserve, yours: received - vatIn - reserve }
  })

  const month = computed(() => {
    const list = payments.value.filter(p => p.date.startsWith(monthKey))
    const vat = list.reduce((s, p) => s + p.vat, 0)
    const reserve = list.reduce((s, p) => s + p.reserve, 0)
    const yours = list.reduce((s, p) => s + p.yours, 0)
    return { vat, reserve, yours, toSetAside: vat + reserve, payYourself: Math.max(0, yours - finance.monthlyFixed.value), done: !!tax.value.setAside[monthKey] }
  })

  const daysToDeadline = diffDays(deadline, today)

  function markSetAside(done = true) {
    state.value.prefs.tax.setAside[monthKey] = done
  }
  function setReserve(pct: number) {
    state.value.prefs.tax.reserve = pct
  }

  return { tax, quarter, qStart, qEnd, deadline, daysToDeadline, payments, quarterTotals, month, split, markSetAside, setReserve }
}
