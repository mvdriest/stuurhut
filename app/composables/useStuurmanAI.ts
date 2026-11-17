// De echte Stuurman: taken opdelen en de week plannen met Gemini, via server/api/stuurman.
// Alles komt terug als voorstel. Pas als jij accepteert, verandert er iets in je agenda.
import type { Assignment, BreakdownResult, Domain, ISODate, PlanBlock, PlanDraft, Task, Time } from '~/types'

type Item = {
  id: string
  title: string
  durationMin: number
  kind: Task['kind']
  domain: Domain
  deep: boolean
  source: 'taak' | 'opdracht'
  due?: ISODate
  priority?: string
  moved?: number
  important?: boolean
  client?: string
  partOf?: string
  step?: number
  clientId?: string
  assignmentId?: string
}

type RawPlan = {
  summary: string
  top3: string[]
  blocks: { itemId: string, date: string, start: string, durationMin: number, why: string }[]
  fallback: { itemId: string, why: string } | null
  leftOut: { itemId: string, why: string }[]
}

function errorText(e: unknown) {
  const err = e as { data?: { statusMessage?: string, message?: string }, statusMessage?: string }
  return err?.data?.statusMessage || err?.statusMessage || 'Stuurman is nu niet bereikbaar.'
}

export function useStuurmanAI() {
  const { state } = useStore()
  const tasks = useTasks()
  const cal = useCalendar()
  const clients = useClients()
  const assignments = useAssignments()
  const finance = useFinance()
  const { goals } = useGoals()

  // ---------- Opdelen ----------
  async function breakdown(t: { title: string, kind: Task['kind'], domain: Domain, durationMin: number, clientId?: string }): Promise<BreakdownResult> {
    try {
      return await $fetch<BreakdownResult>('/api/stuurman/breakdown', {
        method: 'POST',
        body: { title: t.title, kind: t.kind, domain: t.domain, durationMin: t.durationMin, clientName: clients.byId(t.clientId)?.name },
      })
    }
    catch (e) { throw new Error(errorText(e)) }
  }

  // ---------- Week plannen ----------
  const draft = useState<PlanDraft | null>('stuurman-weekplan', () => null)
  const planning = useState('stuurman-planning', () => false)
  const items = new Map<string, Item>()

  /** Vrije vensters van minstens een half uur, in stappen van een kwartier. */
  function windows(date: ISODate, from: number, to: number) {
    const out: { start: Time, end: Time }[] = []
    const earliest = date === todayISO() ? Math.ceil((nowMin() + 15) / 15) * 15 : 0
    let open: number | null = null
    for (let s = Math.max(from, earliest); s < to; s += 15) {
      const free = cal.isFree(date, s, 15)
      if (free && open === null) open = s
      if (!free && open !== null) { if (s - open >= 30) out.push({ start: fromMin(open), end: fromMin(s) }); open = null }
    }
    if (open !== null && to - open >= 30) out.push({ start: fromMin(open), end: fromMin(to) })
    return out
  }

  function energyByWeekday() {
    const sum: Record<number, { s: number, n: number }> = {}
    for (const d of state.value.rhythm.slice(-42)) {
      // Geen dagstart gedaan: dan weten we die dag niets over je energie
      if (d.energy == null) continue
      const wd = fromISO(d.date).getDay()
      sum[wd] ??= { s: 0, n: 0 }
      sum[wd].s += d.energy
      sum[wd].n++
    }
    return (date: ISODate) => {
      const e = sum[fromISO(date).getDay()]
      return e ? Math.round((e.s / e.n) * 10) / 10 : null
    }
  }

  function candidates(): Item[] {
    const list: Item[] = []
    for (const t of tasks.unscheduled.value) {
      const parent = t.parentId ? tasks.byId(t.parentId) : undefined
      list.push({
        id: t.id, title: t.title, durationMin: t.durationMin, kind: t.kind, domain: domainOfTask(t), deep: !!t.deep, source: 'taak',
        moved: t.moved, important: t.important, client: clients.byId(t.clientId)?.name, partOf: parent?.title, step: t.step, clientId: t.clientId,
      })
    }
    for (const a of assignments.open.value as Assignment[]) {
      const kind = assignments.kindOf(a)
      if ((kind !== 'todo' && kind !== 'doing') || assignments.plannedMin(a) > 0) continue
      const leftMin = Math.max(30, Math.round(((a.estimateH ?? 1) - assignments.loggedH(a)) * 60))
      const deep = a.tags.some(t => t === 'Bouwen' || t === 'Ontwerp')
      list.push({
        id: `a:${a.id}`, title: a.title, durationMin: Math.min(120, Math.ceil(leftMin / 15) * 15), kind: deep ? 'focus' : 'taak', domain: 'zakelijk', deep,
        source: 'opdracht', due: a.due, priority: a.priority, client: clients.byId(a.clientId)?.name, clientId: a.clientId, assignmentId: a.id,
      })
    }
    return list
  }

  async function planWeek(wish?: string) {
    const wh = state.value.prefs.workHours
    const energy = energyByWeekday()
    const days = cal.days.value.map(date => ({
      date,
      weekday: weekdayLong(date),
      load: cal.dayLoad(date).level,
      energy: energy(date),
      work: wh.days.includes(fromISO(date).getDay()) ? windows(date, Math.max(toMin(wh.start), DAY_START), toMin(wh.end)) : [],
      evening: windows(date, wh.days.includes(fromISO(date).getDay()) ? toMin(wh.end) : 10 * 60, DAY_END),
    }))
    const list = candidates()
    items.clear()
    for (const i of list) items.set(i.id, i)
    if (!list.length) throw new Error('Alles heeft al een plek. Er is niets om in te plannen.')

    const reviews = Object.entries(state.value.rituals.weekReview).sort(([a], [b]) => b.localeCompare(a))
    planning.value = true
    try {
      const res = await $fetch<RawPlan>('/api/stuurman/plan', {
        method: 'POST',
        body: {
          today: todayISO(),
          now: fromMin(nowMin()),
          wish: wish || undefined,
          focus: reviews[0]?.[1].focus ?? [],
          morningFocus: state.value.prefs.morningFocus,
          days,
          items: list.map(({ clientId, assignmentId, ...rest }) => rest),
          goals: goals.value.filter(g => g.kind === 'geld' || g.kind === 'aantal').map(g => ({ name: g.title, current: g.current, target: g.target })),
          lateInvoices: finance.openInvoices.value.filter(i => i.daysLate > 0).length,
        },
      })
      draft.value = validate(res, days)
      return draft.value
    }
    catch (e) { throw new Error(e instanceof Error && !(e as { data?: unknown }).data ? e.message : errorText(e)) }
    finally { planning.value = false }
  }

  /** Alleen wat echt past: bestaande items, op een gegeven dag, vrij in je agenda en niet over elkaar heen. */
  function validate(res: RawPlan, days: { date: ISODate, work: { start: Time, end: Time }[], evening: { start: Time, end: Time }[] }[]): PlanDraft {
    const blocks: PlanBlock[] = []
    const used = new Set<string>()
    let dropped = 0
    const overlaps = (b: { date: string, start: number, dur: number }) =>
      blocks.some(x => x.date === b.date && toMin(x.start) < b.start + b.dur && b.start < toMin(x.start) + x.durationMin)
    for (const b of res.blocks) {
      const item = items.get(b.itemId)
      const start = /^\d{1,2}:\d{2}$/.test(b.start) ? Math.round(toMin(b.start) / 15) * 15 : Number.NaN
      const dur = Math.max(15, Math.min(item?.durationMin ?? 0, Math.round((b.durationMin || 0) / 15) * 15 || (item?.durationMin ?? 0)))
      const day = days.find(d => d.date === b.date)
      // Zakelijk binnen je werktijd, privé erna: precies de vensters die Stuurman kreeg
      const inWindow = !!item && !!day && (item.domain === 'prive' ? day.evening : day.work)
        .some(w => start >= toMin(w.start) && start + dur <= toMin(w.end))
      const ok = item && !used.has(b.itemId) && inWindow && Number.isFinite(start)
        && start + dur <= DAY_END && !(b.date === todayISO() && start < nowMin())
        && cal.isFree(b.date, start, dur) && !overlaps({ date: b.date, start, dur })
      if (!ok) { dropped++; continue }
      used.add(b.itemId)
      blocks.push({ key: uid('pb'), itemId: item.id, title: item.title, date: b.date, start: fromMin(start), durationMin: dur, why: b.why, domain: item.domain, kind: item.kind, firstStep: dur < item.durationMin, deep: item.deep, clientId: item.clientId, assignmentId: item.assignmentId })
    }
    blocks.sort((a, b) => a.date.localeCompare(b.date) || toMin(a.start) - toMin(b.start))
    const named = (id: string) => items.get(id)?.title
    return {
      summary: res.summary,
      top3: res.top3.filter(named).slice(0, 3).map(id => ({ itemId: id, title: named(id)! })),
      blocks,
      fallback: res.fallback && named(res.fallback.itemId) ? { ...res.fallback, title: named(res.fallback.itemId)! } : null,
      leftOut: res.leftOut.filter(l => named(l.itemId)).map(l => ({ ...l, title: named(l.itemId)! })),
      dropped,
      at: new Date().toISOString(),
    }
  }

  function removeBlock(key: string) {
    if (!draft.value) return
    draft.value.blocks = draft.value.blocks.filter(b => b.key !== key)
  }

  /** Zet de conceptblokken in je agenda. Geeft terug hoeveel er zijn ingepland. */
  function acceptBlocks(keys?: string[]) {
    if (!draft.value) return 0
    const chosen = draft.value.blocks.filter(b => !keys || keys.includes(b.key))
    let n = 0
    for (const b of chosen) {
      if (!cal.isFree(b.date, toMin(b.start), b.durationMin)) continue
      if (b.assignmentId) {
        tasks.add({ title: b.title, durationMin: b.durationMin, kind: b.kind, deep: b.deep, clientId: b.clientId, assignmentId: b.assignmentId, domain: 'zakelijk', date: b.date, start: b.start })
      }
      else if (b.firstStep) {
        tasks.add({ title: `Eerste stap: ${b.title}`, durationMin: b.durationMin, kind: b.kind, domain: b.domain, clientId: b.clientId, firstStepOf: b.itemId, date: b.date, start: b.start })
      }
      else {
        if (!tasks.byId(b.itemId)) continue
        tasks.schedule(b.itemId, b.date, b.start)
      }
      n++
    }
    draft.value.blocks = draft.value.blocks.filter(b => !chosen.includes(b))
    if (!draft.value.blocks.length) draft.value = null
    return n
  }

  function discard() { draft.value = null }

  return { breakdown, planWeek, planning, draft, removeBlock, acceptBlocks, discard }
}
