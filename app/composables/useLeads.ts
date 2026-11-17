// Acquisitie: leads door de pipeline, opvolgen op tijd, en een vast blok per week.
import type { Client, ISODate, LeadInfo, LeadStage, Opportunity } from '~/types'
import { ACQUISITION_MIN, ACQUISITION_TITLE, FOLLOW_UP_DAYS, STAGE_LABEL } from '~/utils/leads'

export function useLeads() {
  const { state } = useStore()
  const tasks = useTasks()
  const cal = useCalendar()
  const today = todayISO()

  /** Elke lead heeft pipelinegegevens. Oude leads zonder krijgen ze hier. */
  function info(c: Client): LeadInfo {
    if (!c.lead) c.lead = { stage: 'gespot', log: [] }
    return c.lead
  }

  const leads = computed(() => state.value.clients.filter(c => c.status === 'lead'))
  const active = computed(() => leads.value.filter(c => c.lead?.stage !== 'niet nu'))
  const byStage = (s: LeadStage) => leads.value.filter(c => (c.lead?.stage ?? 'gespot') === s)

  /** Leads waarbij het tijd is om iets van je te laten horen. */
  const due = computed(() => active.value
    .filter(c => c.lead?.followUp && c.lead.followUp <= today)
    .sort((a, b) => a.lead!.followUp!.localeCompare(b.lead!.followUp!)))

  function setStage(c: Client, stage: LeadStage) {
    const l = info(c)
    if (l.stage === stage) return
    l.stage = stage
    l.log.push({ date: today, stage })
    const days = FOLLOW_UP_DAYS[stage]
    l.followUp = days === null ? undefined : addDays(today, days)
    c.timeline.unshift({ id: uid('tl'), kind: 'notitie', date: today, title: `Lead: ${STAGE_LABEL[stage].toLowerCase()}` })
  }

  function setFollowUp(c: Client, date?: ISODate) {
    info(c).followUp = date || undefined
  }

  /** Een opvolgtaak in Week. Bestaat hij al, dan krijg je die plek terug. */
  function planFollowUp(c: Client) {
    const title = `Opvolgen: ${c.name}`
    const t = state.value.tasks.find(x => x.clientId === c.id && x.title === title && !x.done)
      ?? tasks.add({ title, durationMin: 20, kind: 'taak', clientId: c.id, domain: 'zakelijk' })
    if (t.date) return { date: t.date, start: t.start! }
    const slot = cal.findSlot(t.durationMin, { excludeTaskId: t.id, domain: 'zakelijk' })
    if (slot) {
      tasks.schedule(t.id, slot.date, slot.start)
      info(c).followUp = slot.date
    }
    return slot
  }

  /** Lead wordt klant: telt mee voor je doel "Nieuwe klanten". */
  function win(c: Client) {
    c.status = 'lopend'
    // De pipelinegegevens blijven staan: de weekreview telt ze nog mee
    if (c.lead) c.lead.followUp = undefined
    for (const p of state.value.projects.filter(p => p.clientId === c.id && p.status === 'lead')) p.status = 'lopend'
    c.timeline.unshift({ id: uid('tl'), kind: 'notitie', date: today, title: 'Klant geworden' })
    const goal = state.value.goals.find(g => g.id === 'g2')
    if (goal) goal.current++
  }

  /** Wie lijkt op de klanten achter een kans: hun branches, als zoekrichting. */
  function lookalike(o: Opportunity) {
    const sectors = (o.sourceClientIds ?? [])
      .map(id => state.value.clients.find(c => c.id === id)?.sector)
      .filter((s): s is string => !!s)
    return [...new Set(sectors)]
  }
  const forOpportunity = (id: string) => leads.value.filter(c => c.lead?.opportunityId === id)

  /** Wat er deze week (of in een andere periode) in de pipeline gebeurde. */
  function moved(from: ISODate, to: ISODate) {
    const count = (s: LeadStage) => state.value.clients
      .reduce((n, c) => n + (c.lead?.log.filter(e => e.stage === s && e.date >= from && e.date <= to).length ?? 0), 0)
    return { spotted: count('gespot'), approached: count('benaderd'), talks: count('gesprek'), quotes: count('offerte') }
  }

  // ---------- Het vaste blok ----------
  const monday = (() => {
    const wd = fromISO(today).getDay()
    return addDays(today, wd === 0 ? -6 : 1 - wd)
  })()
  const blocksThisWeek = computed(() => state.value.tasks.filter(t => t.title === ACQUISITION_TITLE && t.date && t.date >= monday && t.date <= addDays(monday, 6)))
  const nextBlock = computed(() => blocksThisWeek.value.filter(t => !t.done && t.date! >= today).sort((a, b) => (a.date! + a.start).localeCompare(b.date! + b.start))[0])

  function planAcquisition() {
    if (nextBlock.value) return { date: nextBlock.value.date!, start: nextBlock.value.start! }
    const t = tasks.add({ title: ACQUISITION_TITLE, durationMin: ACQUISITION_MIN, kind: 'taak', domain: 'zakelijk' })
    const slot = cal.findSlot(ACQUISITION_MIN, { excludeTaskId: t.id, domain: 'zakelijk' })
    if (slot) tasks.schedule(t.id, slot.date, slot.start)
    else tasks.remove(t.id)
    return slot
  }

  return { leads, active, byStage, due, info, setStage, setFollowUp, planFollowUp, win, lookalike, forOpportunity, moved, blocksThisWeek, nextBlock, planAcquisition }
}
