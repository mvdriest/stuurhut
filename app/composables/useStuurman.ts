// De brug tussen de UI en Stuurman. Nu de mock in utils/stuurman.mock.ts,
// later de echte AI. De UI gebruikt alleen deze composable.
import type { PageKey, StuurmanSuggestion } from '~/types'
import { buildSuggestions, dayLine, gapOptions, QUESTIONS, type StuurmanContext } from '~/utils/stuurman.mock'

const ROUTE_PAGE: Record<string, PageKey> = {
  '/': 'thuis',
  '/hoofd-leeg': 'inbox',
  '/week': 'week',
  '/opdrachten': 'opdrachten',
  '/klanten': 'klanten',
  '/kansen': 'kansen',
  '/financien': 'financien',
  '/ritme': 'ritme',
  '/admin': 'admin',
}

export function useStuurman() {
  const { state } = useStore()
  const route = useRoute()
  const cal = useCalendar()
  const tasks = useTasks()
  const clients = useClients()
  const opps = useOpportunities()
  const finance = useFinance()
  const inbox = useInbox()
  const toast = useToast()
  const assignments = useAssignments()

  const open = useState('stuurman-open', () => false)
  const tab = useState<'voorstellen' | 'chat'>('stuurman-tab', () => 'voorstellen')
  const docked = useLocalStorage('stuurhut:panel-docked', true)
  /** Paneel openen op de chat (desktop: vastgezet, mobiel/iPad: schuifpaneel). */
  function openChat() {
    tab.value = 'chat'
    docked.value = true
    open.value = true
  }

  const page = computed<PageKey>(() => ROUTE_PAGE[route.path] ?? 'thuis')

  const ctx = computed<StuurmanContext>(() => ({
    state: state.value,
    slot: (dur, o) => cal.findSlot(dur, o ?? {}),
    load: d => cal.dayLoad(d),
    clientName: id => clients.byId(id)?.name ?? '',
  }))

  const domain = useDomain()
  const sleep = useSleep()
  // In privé-stand of avondmodus: alleen voorstellen over jou (ritme). Zakelijk wacht.
  // Na laptoptijd: geen voorstellen meer. De avond is van jou.
  // Twee ochtenden achter elkaar niet gelukt: één rustige vraag, bovenaan
  const missSuggestion = computed<StuurmanSuggestion[]>(() => {
    const m = sleep.missedTwice.value
    if (!m || state.value.suggestionStatus[`slaap-twee-keer-${m.latest}`]) return []
    return [{
      id: `slaap-twee-keer-${m.latest}`,
      // Op Ritme staat de vraag in de slaapkaart zelf
      pages: ['thuis'],
      title: 'Is de stap te groot?',
      meta: `${sleep.stepBackWake.value} deze week`,
      icon: 'tabler:sunrise',
      tone: 'ritme',
      text: `De laatste twee ochtenden lukte ${sleep.wakeToday.value} niet. Is de stap te groot? Dan houden we deze week ${sleep.stepBackWake.value} aan.`,
      why: 'Eén keer missen is niets. Twee keer achter elkaar is het moment om bij te sturen, voordat het een nieuw patroon wordt.',
      acceptLabel: 'Ja, een stap terug',
      action: { type: 'sleepStepBack' },
    }]
  })
  // Routine twee keer gemist: dezelfde vraag als op de kaart, nu ook op Thuisbasis
  const routines = useRoutines()
  const routineMissSuggestion = computed<StuurmanSuggestion[]>(() => {
    for (const r of routines.routines.value) {
      const m = routines.doubleMiss(r)
      if (!m?.accept) continue
      const id = `routine-twee-keer-${r.id}-${m.latest}`
      if (state.value.suggestionStatus[id]) continue
      return [{
        id, pages: ['thuis'], title: `${r.name}: twee keer niet gelukt`, meta: m.reason, icon: r.icon, tone: 'ritme',
        text: m.text, why: 'Eén keer missen is niets. Twee keer achter elkaar is het moment om bij te sturen.',
        acceptLabel: m.accept.label, action: { type: 'answerRoutineMiss', routineId: r.id, answer: m.accept.action },
      }]
    }
    return []
  })
  const all = computed(() => sleep.quiet.value ? [] : [...missSuggestion.value, ...routineMissSuggestion.value, ...buildSuggestions(ctx.value)].filter(s => !state.value.suggestionStatus[s.id]).filter(s => domain.effective.value !== 'prive' || s.tone === 'ritme'))
  const forPage = (p: PageKey) => all.value.filter(s => s.pages.includes(p))
  const current = computed(() => forPage(page.value))
  /**
   * Wat het paneel toont: alles voor deze pagina, behalve wat de pagina zelf al laat zien
   * (op Thuisbasis het eerste voorstel, op Ritme de oplossingen bij de routines).
   */
  const panel = computed(() => {
    if (page.value === 'thuis' || page.value === 'opdrachten') return current.value.slice(1)
    if (page.value === 'ritme') return current.value.filter(s => !s.id.startsWith('routine-'))
    if (page.value === 'financien') return current.value.filter(s => s.id !== 'onderhoud-abonnement')
    return current.value
  })
  const line = computed(() => dayLine(ctx.value))
  const questions = computed(() => QUESTIONS.filter(q => q.page === page.value))
  const gap = computed(() => state.value.events.find(e => e.cancelled && !state.value.gapResolved[e.id]) ?? null)
  const gapChoices = computed(() => gapOptions(ctx.value))

  const slotText = (s: { date: string, start: string } | null) => (s ? `${relDay(s.date)} om ${s.start}` : '')

  function accept(s: StuurmanSuggestion) {
    const a = s.action
    let msg = 'Gedaan.'
    let to: string | undefined
    switch (a.type) {
      case 'scheduleTask': {
        tasks.schedule(a.taskId, a.date, a.start)
        msg = `Staat in je week, ${slotText(a)}.`
        to = '/week'
        break
      }
      case 'planInvoiceReminder': {
        const slot = finance.planReminder(a.invoiceId)
        msg = slot ? `Herinnering staat ${slotText(slot)}.` : 'Ik vond geen plek deze week.'
        to = '/week'
        break
      }
      case 'createOpportunity': {
        opps.add({ title: a.title, source: a.source, revenue: a.revenue, buildTime: a.buildTime, buildHours: 8, why: a.why, confidence: 'middel', nextStep: 'Een prijs per maand bepalen en aan twee oud-klanten voorleggen' })
        msg = 'Bewaard bij Kansen.'
        to = '/kansen'
        break
      }
      case 'planFirstStep': {
        const as = a.assignmentId ? state.value.assignments.find(x => x.id === a.assignmentId) : undefined
        const t = tasks.planFirstStep(a.text, { assignmentId: a.assignmentId, taskId: a.taskId, clientId: as?.clientId ?? (a.taskId ? tasks.byId(a.taskId)?.clientId : undefined) })
        if (!t) { msg = 'Ik vond geen kwartier binnen je werktijd deze week.'; break }
        msg = `Eerste stap staat ${relDay(t.date!)} om ${t.start}. Alleen dat, meer niet.`
        to = '/week'
        break
      }
      case 'answerRoutineMiss': {
        msg = routines.answerMiss(a.routineId, a.answer)
        to = '/ritme'
        break
      }
      case 'sleepStepBack': {
        sleep.stepBack(sleep.missedTwice.value?.latest)
        msg = `Deze week op om ${sleep.wakeToday.value}. Lukt het, dan gaan we volgende week weer verder.`
        to = '/ritme'
        break
      }
      case 'setFirstBlock': {
        sleep.setFirstBlock(true)
        const n = state.value.tasks.filter(t => t.anchor && !t.done).length
        msg = n ? `Je eerste blok staat op ${n === 1 ? 'één werkdag' : `${n} werkdagen`}. Het schuift mee met je opstaantijd.` : 'Staat aan. Waar al iets gepland stond, heb ik niets gezet.'
        to = '/week'
        break
      }
      case 'setMorningFocus': {
        state.value.prefs.morningFocus = true
        const moved = rescheduleDeepToMorning()
        msg = moved ? `Voortaan staat denkwerk in de ochtend. Ik heb ${moved === 1 ? 'één blok' : `${moved} blokken`} verschoven.` : 'Voortaan plan ik denkwerk in de ochtend.'
        to = '/week'
        break
      }
      case 'planOpportunity': {
        const slot = opps.setStatus(a.opportunityId, 'ingepland')
        msg = slot ? `Uitwerktijd staat ${slotText(slot)}.` : 'Ingepland.'
        to = '/week'
        break
      }
      case 'setOpportunityStatus':
        opps.setStatus(a.opportunityId, a.status)
        msg = a.status === 'laten gaan' ? 'Losgelaten. Hij blijft bewaard.' : 'Bijgewerkt.'
        break
      case 'sortInbox': {
        const n = inbox.sortClients()
        msg = `${n} items bij de juiste klant gezet.`
        to = '/klanten'
        break
      }
      case 'addTask': {
        tasks.add({ title: a.title, date: a.date, start: a.start, durationMin: a.durationMin, kind: a.kind, domain: a.domain, clientId: a.clientId })
        msg = `Staat erin, ${slotText(a)}.`
        to = '/week'
        break
      }
      case 'addRoutineBlocks': {
        let n = 0
        const r = state.value.routines.find(x => x.id === a.routineId)
        for (const d of cal.days.value) {
          if (r && !r.days.includes(fromISO(d).getDay())) continue
          const slot = cal.findSlotOn(d, a.durationMin, toMin(a.start))
          if (slot && toMin(slot.start) <= toMin(a.start) + 90) {
            tasks.add({ title: 'Wandelen', durationMin: a.durationMin, kind: 'persoonlijk', date: slot.date, start: slot.start })
            n++
          }
        }
        msg = `${n} wandelblokken staan in je week.`
        to = '/week'
        break
      }
      case 'setReminder':
        state.value.prefs.reminders[a.routineId] = a.time
        msg = `Ik geef je elke avond om ${a.time} een seintje.`
        break
      case 'moveOutsideWork': {
        const D = domain
        let n = 0
        for (const t of state.value.tasks) {
          if (!t.date || !t.start || t.done || domainOfTask(t) !== 'zakelijk') continue
          if (!D.outsideWork(t.date, t.start, fromMin(toMin(t.start) + t.durationMin))) continue
          const slot = cal.findSlot(t.durationMin, { deep: t.deep, excludeTaskId: t.id, domain: 'zakelijk' })
          if (slot) { t.date = slot.date; t.start = slot.start; n++ }
        }
        msg = n ? `${n === 1 ? 'Eén taak' : `${n} taken`} verschoven naar binnen je werktijd.` : 'Ik vond geen plek binnen je werktijd.'
        to = '/week'
        break
      }
      case 'moveAssignment': {
        assignments.move(a.assignmentId, a.status, 0)
        msg = `Terug naar ${a.status}. Eerst afmaken wat loopt.`
        to = '/opdrachten'
        break
      }
      case 'planAssignment': {
        const slot = assignments.plan(a.assignmentId)
        msg = slot ? `${duration(slot.dur)} staat ${slotText(slot)}.` : 'Geen plek binnen je werktijd deze week.'
        to = '/week'
        break
      }
      case 'markSetAside':
        state.value.prefs.tax.setAside[todayISO().slice(0, 7)] = true
        msg = 'Genoteerd als apart gezet.'
        break
      case 'none':
        break
      case 'navigate':
        navigateTo(a.to)
        open.value = false
        return
    }
    state.value.suggestionStatus[s.id] = 'accepted'
    toast.push({ text: msg, to: to && to !== route.path ? to : undefined, toLabel: 'Bekijk' })
  }

  function dismiss(s: StuurmanSuggestion) {
    state.value.suggestionStatus[s.id] = 'dismissed'
    // "Nu niet" op de vraag na twee gemiste ochtenden betekent: ik ga door, deze tijd blijft
    if (s.id.startsWith('slaap-twee-keer-')) sleep.keepGoing(s.id.slice('slaap-twee-keer-'.length))
    if (s.action.type === 'answerRoutineMiss') routines.answerMiss(s.action.routineId)
  }

  /** Bij de ochtendvoorkeur: denkblokken in de middag naar een ochtend verplaatsen. */
  function rescheduleDeepToMorning() {
    let moved = 0
    const today = todayISO()
    for (const t of state.value.tasks) {
      if (!t.deep || !t.date || !t.start || t.done || t.date === today) continue
      if (toMin(t.start) < 12 * 60) continue
      const slot = cal.findSlot(t.durationMin, { deep: true, preferMorning: true, excludeTaskId: t.id })
      if (slot && toMin(slot.start) < 12 * 60) {
        t.date = slot.date
        t.start = slot.start
        moved++
      }
    }
    return moved
  }

  function resolveGap(option: 'task' | 'focus' | 'vrij') {
    const g = gap.value
    if (!g) return
    const choice = gapChoices.value.find(c => c.id === option)
    const dur = toMin(g.end) - toMin(g.start)
    if (option === 'task' && choice?.taskId) {
      tasks.schedule(choice.taskId, g.date, g.start)
    }
    else if (option === 'task') {
      tasks.add({ title: choice?.title ?? 'Kleine dingen', durationMin: dur, kind: 'admin', date: g.date, start: g.start })
    }
    else if (option === 'focus') {
      const o = opps.byId('o1')
      tasks.add({ title: `Uitwerken: ${o?.title ?? 'kans'}`, durationMin: dur, kind: 'focus', opportunityId: 'o1', deep: true, date: g.date, start: g.start })
      if (o && o.status !== 'ingepland') o.status = 'ingepland'
    }
    else {
      tasks.add({ title: 'Vrij: even niets', durationMin: dur, kind: 'persoonlijk', date: g.date, start: g.start })
    }
    state.value.gapResolved[g.id] = option
    toast.push({ text: option === 'vrij' ? 'Gat vrijgehouden. Geniet ervan.' : `Gevuld: ${choice?.title}.` })
  }

  return { open, tab, openChat, page, current, panel, forPage, all, line, questions, accept, dismiss, gap, gapChoices, resolveGap }
}
