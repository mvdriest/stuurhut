// Opdrachten op het bord. Notion is de bron, Stuurhut de plek waar je plant.
// De UI praat alleen met deze composable. De bron is uitwisselbaar:
// nu testdata, straks een klein server-endpoint dat met Notion praat.
import type { Assignment, BoardColumn, ColumnKind } from '~/types'
import { columnsFromDatabase, mapNotionPage, toNotionPatch, type NotionDatabase, type NotionPage } from '~/utils/notion'

// ---------- De bron ----------
export interface AssignmentSource {
  label: string
  /** Alles ophalen. null = niets veranderd sinds de vorige keer. */
  pull: () => Promise<{ db: NotionDatabase, pages: NotionPage[] } | null>
  /** Eén wijziging terugschrijven (Notion: pages.update) */
  push: (notionId: string, patch: ReturnType<typeof toNotionPatch>) => Promise<void>
  /** Nieuwe pagina in de database (Notion: pages.create). Geeft het Notion-id terug. */
  create: (patch: ReturnType<typeof toNotionPatch>) => Promise<string>
  /** Archiveren in Notion (pages.update met in_trash) */
  archive: (notionId: string, restore?: boolean) => Promise<void>
}

const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

/** Testdata: doet alsof, schrijft nergens heen. */
const testdataSource: AssignmentSource = {
  label: 'testdata',
  pull: async () => { await wait(500); return null },
  push: async () => { await wait(300) },
  create: async () => { await wait(300); return uid('ntn') },
  archive: async () => { await wait(300) },
}

/*
 * Straks, met een server-endpoint in server/api/notion/ (de sleutel blijft op de server):
 *
 * const notionSource: AssignmentSource = {
 *   label: 'Notion',
 *   pull: () => $fetch('/api/notion/opdrachten'),
 *   push: (id, patch) => $fetch(`/api/notion/opdrachten/${id}`, { method: 'PATCH', body: patch }),
 *   create: patch => $fetch('/api/notion/opdrachten', { method: 'POST', body: patch }).then(r => r.id),
 *   archive: (id, restore) => $fetch(`/api/notion/opdrachten/${id}`, { method: 'PATCH', body: { in_trash: !restore } }),
 * }
 */
/**
 * Supabase (subtaken): de opslag zelf loopt via useSync(), die elke wijziging in de state
 * terugschrijft. Hier hoeft de bron dus alleen opnieuw op te halen.
 */
const supabaseSource: AssignmentSource = {
  label: 'Supabase',
  pull: async () => { await useSync().reload(); return null },
  push: async () => {},
  create: async () => '',
  archive: async () => {},
}

// ---------- Het bord ----------
const clientFilter = ref<string | null>(null)

export function useAssignments() {
  const { state, mode } = useStore()
  const source = mode.value === 'demo' ? testdataSource : supabaseSource
  const tasks = useTasks()
  const cal = useCalendar()
  const clients = useClients()
  const toast = useToast()
  const today = todayISO()

  const columns = computed<BoardColumn[]>(() => state.value.board)
  const items = computed(() => [...state.value.assignments].sort((a, b) => a.order - b.order))
  const byId = (id: string) => state.value.assignments.find(a => a.id === id)
  const column = (name: string) => columns.value.find(c => c.name === name)
  const kindOf = (a: Assignment): ColumnKind => column(a.status)?.kind ?? 'todo'
  const firstOf = (kind: ColumnKind) => columns.value.find(c => c.kind === kind)?.name ?? columns.value[0]!.name

  const visible = computed(() => items.value.filter(a => !clientFilter.value || a.clientId === clientFilter.value))
  function inColumn(name: string) {
    const list = visible.value.filter(a => a.status === name)
    // Klaar: het laatst afgeronde bovenaan
    return column(name)?.kind === 'done' ? list.sort((a, b) => b.statusSince.localeCompare(a.statusSince)) : list
  }
  const open = computed(() => items.value.filter(a => kindOf(a) !== 'done'))
  const doing = computed(() => items.value.filter(a => kindOf(a) === 'doing'))
  const wip = computed(() => columns.value.find(c => c.kind === 'doing')?.wip ?? 0)
  const overWip = computed(() => wip.value > 0 && doing.value.length > wip.value)
  const clientsOnBoard = computed(() => state.value.clients.filter(c => open.value.some(a => a.clientId === c.id)))

  // ---------- Wat Stuurhut zelf weet ----------
  const loggedH = (a: Assignment) => state.value.timeEntries.filter(e => e.assignmentId === a.id).reduce((s, e) => s + e.hours, 0)
  const waitingDays = (a: Assignment) => diffDays(today, a.statusSince)
  const dueDays = (a: Assignment) => (a.due ? diffDays(a.due, today) : null)
  /** Het eerstvolgende werkblok in je agenda */
  function nextBlock(a: Assignment) {
    return tasks.tasks.value
      .filter(t => t.assignmentId === a.id && !t.done && t.date && t.date >= today)
      .sort((x, y) => (x.date! + x.start).localeCompare(y.date! + y.start))[0]
  }
  const plannedMin = (a: Assignment) => tasks.tasks.value.filter(t => t.assignmentId === a.id && !t.done && t.date && t.date >= today).reduce((s, t) => s + t.durationMin, 0)

  // ---------- Synchroniseren ----------
  const sync = computed(() => state.value.sync)
  const pulling = ref(false)

  async function write(a: Assignment, patch: Partial<Assignment>, revert: () => void) {
    state.value.sync.pending++
    try {
      await source.push(a.notionId, toNotionPatch(patch, { client: id => clients.byId(id)?.notionId }))
      state.value.sync.error = undefined
    }
    catch {
      revert()
      state.value.sync.error = 'Notion gaf geen antwoord. Ik heb het teruggezet.'
      toast.push({ text: 'Opslaan in Notion lukte niet. Ik heb het teruggezet.' })
    }
    finally {
      state.value.sync.pending--
    }
  }

  async function refresh() {
    pulling.value = true
    try {
      const res = await source.pull()
      if (res) {
        state.value.board = columnsFromDatabase(res.db)
        const lookup = {
          client: (n: string) => state.value.clients.find(c => c.notionId === n)?.id,
          project: (n: string) => state.value.projects.find(p => p.notionId === n)?.id,
        }
        const local = new Map(state.value.assignments.map(a => [a.notionId, a]))
        state.value.assignments = res.pages.map((p, i) => mapNotionPage(p, lookup, local.get(p.id) ?? { order: i }))
      }
      state.value.sync.lastPull = new Date().toISOString()
    }
    finally {
      pulling.value = false
    }
  }

  // ---------- Verplaatsen ----------
  /** Naar een kolom, optioneel op een plek. Het scherm verandert meteen, Notion volgt. */
  function move(id: string, status: string, index?: number) {
    const a = byId(id)
    if (!a) return
    const before = { status: a.status, statusSince: a.statusSince, orders: state.value.assignments.map(x => [x.id, x.order] as const) }
    if (a.status !== status) { a.status = status; a.statusSince = today }
    const list = items.value.filter(x => x.status === status && x.id !== id)
    list.splice(index ?? list.length, 0, a)
    list.forEach((x, i) => { x.order = i })
    if (before.status === status) return
    write(a, { status }, () => {
      a.status = before.status
      a.statusSince = before.statusSince
      for (const [xid, o] of before.orders) { const x = byId(xid); if (x) x.order = o }
    })
  }

  async function add(data: Omit<Assignment, 'id' | 'notionId' | 'order' | 'statusSince'>) {
    const a: Assignment = { ...data, id: uid('as'), notionId: '', order: state.value.assignments.length, statusSince: today }
    state.value.assignments.push(a)
    const created = state.value.assignments[state.value.assignments.length - 1]!
    state.value.sync.pending++
    try { created.notionId = (await source.create(toNotionPatch(data, { client: id => clients.byId(id)?.notionId }))) || created.id }
    finally { state.value.sync.pending-- }
    return created
  }

  function update(id: string, patch: Partial<Assignment>) {
    const a = byId(id)
    if (!a) return
    const before = Object.fromEntries(Object.keys(patch).map(k => [k, a[k as keyof Assignment]]))
    if (patch.status && patch.status !== a.status) patch.statusSince = today
    Object.assign(a, patch)
    write(a, patch, () => Object.assign(a, before))
  }

  /** Weg van het bord. In Notion gaat de pagina naar de prullenbak. Geeft herstellen terug. */
  function remove(id: string) {
    const idx = state.value.assignments.findIndex(a => a.id === id)
    if (idx < 0) return () => {}
    const [a] = state.value.assignments.splice(idx, 1)
    source.archive(a!.notionId)
    return () => { state.value.assignments.splice(idx, 0, a!); source.archive(a!.notionId, true) }
  }

  // ---------- Plannen en uren ----------
  /** Het volgende werkblok, binnen je werktijd. Hooguit twee uur in één keer. */
  function plan(id: string) {
    const a = byId(id)
    if (!a) return null
    const leftMin = Math.max(30, Math.round(((a.estimateH ?? 1) - loggedH(a)) * 60) - plannedMin(a))
    const dur = Math.min(120, Math.ceil(leftMin / 15) * 15)
    const deep = a.tags.some(t => t === 'Bouwen' || t === 'Ontwerp')
    const slot = cal.findSlot(dur, { deep, domain: 'zakelijk' })
    if (!slot) return null
    tasks.add({ title: a.title, durationMin: dur, kind: deep ? 'focus' : 'taak', deep, clientId: a.clientId, assignmentId: a.id, domain: 'zakelijk', date: slot.date, start: slot.start })
    return { ...slot, dur }
  }

  function projectFor(a: Assignment) {
    return a.projectId ?? (a.clientId ? clients.projectsFor(a.clientId).find(p => p.status !== 'afgerond')?.id : undefined)
  }

  /** Uren loggen op de opdracht (en dus op het project). */
  function logHours(id: string, hours: number) {
    const a = byId(id)
    if (!a || hours <= 0) return
    state.value.timeEntries.push({ id: uid('te'), projectId: projectFor(a) ?? '', date: today, hours, note: a.title, assignmentId: a.id })
  }

  return {
    columns, items, visible, byId, column, kindOf, firstOf, inColumn, open, doing, wip, overWip, clientsOnBoard, clientFilter,
    loggedH, waitingDays, dueDays, nextBlock, plannedMin, projectFor,
    sync, pulling, refresh, sourceLabel: source.label,
    move, add, update, remove, plan, logHours,
  }
}
