// Factuurtermijnen bij een vaste prijs: wat je wanneer factureert, en wat er nog openstaat.
import type { InvoiceTerm, Project, TermStatus, TermTrigger } from '~/types'

export const TERM_PRESETS: { id: string, label: string, terms: Pick<InvoiceTerm, 'label' | 'pct' | 'trigger'>[] }[] = [
  { id: '100', label: '100% bij oplevering', terms: [{ label: 'Factuur', pct: 100, trigger: 'oplevering' }] },
  { id: '50-50', label: '50 / 50', terms: [{ label: 'Aanbetaling', pct: 50, trigger: 'start' }, { label: 'Eindfactuur', pct: 50, trigger: 'oplevering' }] },
  { id: '30-40-30', label: '30 / 40 / 30', terms: [{ label: 'Aanbetaling', pct: 30, trigger: 'start' }, { label: 'Tussentijds', pct: 40, trigger: 'datum' }, { label: 'Eindfactuur', pct: 30, trigger: 'oplevering' }] },
]
export const TRIGGER_LABEL: Record<TermTrigger, string> = { start: 'bij akkoord', oplevering: 'bij oplevering', datum: 'op datum' }

export interface TermRow {
  project: Project
  term: InvoiceTerm
  /** Status, met betaald zodra e-Boekhouden de factuur als betaald ziet */
  status: TermStatus
  /** Het moment is daar: nu factureren */
  due: boolean
  /** Wanneer, in woorden */
  when: string
}

export function useTerms() {
  const { state } = useStore()
  const clients = useClients()

  function statusOf(t: InvoiceTerm): TermStatus {
    if (t.status !== 'gefactureerd' || !t.invoiceNumber) return t.status
    const inv = state.value.invoices.find(i => i.number?.trim() === t.invoiceNumber?.trim())
    return inv?.paid ? 'betaald' : t.status
  }
  function row(project: Project, term: InvoiceTerm): TermRow {
    const status = statusOf(term)
    const due = termDue(project, { ...term, status }, todayISO())
    const when = term.trigger === 'datum' ? (term.date ? relDay(term.date) : 'datum nog kiezen') : TRIGGER_LABEL[term.trigger]
    return { project, term, status, due, when }
  }

  const rows = computed(() => state.value.projects.flatMap(p => (p.terms ?? []).map(t => row(p, t))))
  const forProject = (id: string) => rows.value.filter(r => r.project.id === id)
  /** Nog niet gefactureerd: nu, later of uitgesteld */
  const unbilled = computed(() => rows.value.filter(r => r.status === 'open' || r.status === 'uitgesteld'))
  const toInvoice = computed(() => unbilled.value.filter(r => r.due))
  const unbilledTotal = computed(() => unbilled.value.reduce((s, r) => s + r.term.amount, 0))

  function patch(projectId: string, termId: string, x: Partial<InvoiceTerm>) {
    const t = state.value.projects.find(p => p.id === projectId)?.terms?.find(t => t.id === termId)
    if (t) Object.assign(t, x)
  }
  const markInvoiced = (projectId: string, termId: string, invoiceNumber?: string) =>
    patch(projectId, termId, { status: 'gefactureerd', invoicedOn: todayISO(), invoiceNumber: invoiceNumber?.trim() || undefined, reason: undefined })
  const postpone = (projectId: string, termId: string, reason: string) => patch(projectId, termId, { status: 'uitgesteld', reason: reason.trim() || undefined })
  const reopen = (projectId: string, termId: string) => patch(projectId, termId, { status: 'open', reason: undefined, invoicedOn: undefined, invoiceNumber: undefined })

  /** Termijnen maken uit percentages; het laatste bedrag vangt afronding op. */
  function build(price: number, parts: Pick<InvoiceTerm, 'label' | 'pct' | 'trigger' | 'date'>[], old: InvoiceTerm[] = []): InvoiceTerm[] {
    let rest = Math.round(price * 100)
    return parts.map((x, i) => {
      const cents = i === parts.length - 1 ? rest : Math.round(price * x.pct)
      rest -= cents
      const prev = old[i]
      return { id: prev?.id ?? uid('tm'), label: x.label.trim() || `Termijn ${i + 1}`, pct: x.pct, amount: cents / 100, trigger: x.trigger, date: x.trigger === 'datum' ? x.date : undefined, status: prev?.status ?? 'open', reason: prev?.reason, invoicedOn: prev?.invoicedOn, invoiceNumber: prev?.invoiceNumber }
    })
  }

  const clientName = (p: Project) => clients.byId(p.clientId)?.name ?? 'Klant'

  return { rows, forProject, unbilled, toInvoice, unbilledTotal, markInvoiced, postpone, reopen, build, clientName }
}
