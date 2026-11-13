import type { AppState } from '~/types'
import { addDays, fromISO, todayISO } from '~/utils/date'
import type { Rituals } from '~/types'
import { seedClients, seedProjects } from './clients'
import { seedEvents, seedInbox, seedTasks } from './planning'
import { NOTION_CLIENT_IDS, NOTION_PROJECT_IDS, notionDatabase, notionQuery } from './notion-opdrachten'
import { columnsFromDatabase, mapNotionPage } from '~/utils/notion'
import { weekScore } from '~/utils/sleep'
import type { Assignment, Client, Project } from '~/types'
import { seedInvoices, seedOpportunities, seedRhythm, seedSleepPlan, seedGoals, seedLife, seedQuotes, seedRoutines, seedSubscriptions, seedTimeEntries, seedTransactions } from './business'

export const STATE_VERSION = 14

/** De volledige testdataset. "Zet testdata terug" roept dit opnieuw aan. */
export function createSeed(): AppState {
  const subscriptions = seedSubscriptions()
  const sleep = seedSleepPlan()
  const rhythm = seedRhythm(sleep)
  // Hoe de vorige weken gingen, zodat het besluit per week klopt met de nachten
  const mornings = rhythm.filter(d => d.woke).map(d => ({ date: d.date, woke: d.woke! }))
  for (const [mon, w] of Object.entries(sleep.weeks ?? {})) {
    if (w.decision === 'start') continue
    Object.assign(w, weekScore(sleep, mornings, addDays(mon, -7)))
  }
  const clients = seedClients().map(c => ({ ...c, notionId: NOTION_CLIENT_IDS[c.id] }))
  const projects = seedProjects().map(p => ({ ...p, notionId: NOTION_PROJECT_IDS[p.id] }))
  return {
    version: STATE_VERSION,
    seededOn: todayISO(),
    tasks: seedTasks(),
    events: seedEvents(),
    inbox: seedInbox(),
    clients,
    projects,
    opportunities: seedOpportunities(),
    transactions: seedTransactions(subscriptions),
    invoices: seedInvoices(),
    subscriptions,
    rhythm,
    routines: seedRoutines(rhythm),
    goals: seedGoals(),
    chat: [],
    rituals: seedRituals(),
    timeEntries: seedTimeEntries(),
    quotes: seedQuotes(),
    life: seedLife(),
    assignments: seedAssignments(clients, projects),
    board: columnsFromDatabase(notionDatabase()),
    sync: { source: 'testdata', lastPull: new Date().toISOString(), pending: 0 },
    checkins: {},
    evenings: {},
    suggestionStatus: {},
    gapResolved: {},
    prefs: { morningFocus: false, reminders: {}, workHours: { days: [1, 2, 3, 4, 5], start: '08:30', end: '17:30' }, tax: { vat: 0.21, reserve: 0.3, setAside: {} }, sleep },
  }
}

/** Eerdere dagafsluitingen deze week, zodat de weekreview iets te vertellen heeft. */
function seedRituals(): Rituals {
  const t = todayISO()
  const wd = fromISO(t).getDay()
  const monday = addDays(t, wd === 0 ? -6 : 1 - wd)
  const wins = ['Klantportaal Van Dijk getest met twee monteurs', 'Mira was blij met de workshopagenda', 'Eerste schets bestelpagina af', 'Rustige avond, vroeg naar bed']
  const dayEnd: Rituals['dayEnd'] = {}
  for (let i = 0; i < 4; i++) {
    const d = addDays(monday, i)
    if (d >= t) break
    dayEnd[d] = { win: wins[i], energy: [3, 4, 3, 4][i], carried: [1, 0, 2, 1][i]!, at: `${d}T21:10:00` }
  }
  return { dayStart: {}, dayEnd, weekReview: {} }
}

/** Opdrachten zoals ze uit Notion komen, vertaald naar Stuurhut. */
export function seedAssignments(clients: Client[], projects: Project[]): Assignment[] {
  const lookup = {
    client: (n: string) => clients.find(c => c.notionId === n)?.id,
    project: (n: string) => projects.find(p => p.notionId === n)?.id,
  }
  return notionQuery().results.map((page, i) => ({ ...mapNotionPage(page, lookup), order: i }))
}

/** De kolommen van het bord als Supabase de bron is (subtaken.status). */
export const SUPABASE_BOARD: AppState['board'] = [
  { name: 'Te doen', color: 'gray', kind: 'todo' },
  { name: 'Bezig', color: 'blue', kind: 'doing', wip: 3 },
  { name: 'Wacht op klant', color: 'orange', kind: 'waiting' },
  { name: 'Review', color: 'purple', kind: 'review' },
  { name: 'Klaar', color: 'green', kind: 'done' },
]

/** Een lege start voor je echte data. Wat in Supabase staat, komt hier bovenop. */
export function createEmpty(): AppState {
  const t = todayISO()
  const wd = fromISO(t).getDay()
  const monday = addDays(t, wd === 0 ? -6 : 1 - wd)
  return {
    version: STATE_VERSION,
    seededOn: t,
    tasks: [],
    events: [],
    inbox: [],
    clients: [],
    projects: [],
    opportunities: [],
    transactions: [],
    invoices: [],
    subscriptions: [],
    rhythm: [],
    routines: [],
    goals: [],
    chat: [],
    rituals: { dayStart: {}, dayEnd: {}, weekReview: {} },
    timeEntries: [],
    quotes: [],
    life: [],
    assignments: [],
    board: SUPABASE_BOARD,
    sync: { source: 'supabase', lastPull: new Date().toISOString(), pending: 0 },
    checkins: {},
    evenings: {},
    suggestionStatus: {},
    gapResolved: {},
    prefs: {
      morningFocus: false,
      reminders: {},
      workHours: { days: [1, 2, 3, 4, 5], start: '08:30', end: '17:30' },
      tax: { vat: 0.21, reserve: 0.3, setAside: {} },
      sleep: { startWake: '08:00', goalWake: '08:00', startedOn: monday, stepMin: 15, needH: 8, windDownMin: 60, weeks: { [monday]: { wake: '08:00', decision: 'start' } }, morning: { firstBlock: false, offsetMin: 45, blockMin: 90 } },
    },
  }
}
