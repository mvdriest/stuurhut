// Domeintypes voor Stuurhut. Later kun je deze vullen vanuit echte bronnen.

export type ISODate = string // 'YYYY-MM-DD'
export type Time = string // 'HH:MM'

/** Privé of zakelijk. Ontbreekt het, dan leidt Stuurhut het af (zie utils/domain.ts). */
export type Domain = 'zakelijk' | 'prive'

export type PageKey = 'thuis' | 'inbox' | 'week' | 'opdrachten' | 'klanten' | 'kansen' | 'financien' | 'ritme' | 'admin'

export interface Task {
  id: string
  title: string
  durationMin: number
  /** Ingepland of niet: zonder date/start staat de taak in de zijbalk van Week */
  date?: ISODate
  start?: Time
  kind: 'taak' | 'focus' | 'admin' | 'persoonlijk'
  clientId?: string
  opportunityId?: string
  invoiceId?: string
  /** Werkblok voor een opdracht van het bord */
  assignmentId?: string
  /** Telt mee voor "Vandaag telt" */
  important?: boolean
  done?: boolean
  /** Denkwerk: Stuurman plant dit bij voorkeur als je energie hoog is */
  deep?: boolean
  domain?: Domain
  /** Het vaste eerste werkblok na het opstaan (beheerd door het slaapritme) */
  anchor?: boolean
  /** Zo vaak naar een latere dag geschoven */
  moved?: number
  /** Een eerste stap van een kwartier voor deze taak of opdracht */
  firstStepOf?: string
}

export interface CalendarEvent {
  id: string
  title: string
  date: ISODate
  start: Time
  end: Time
  clientId?: string
  location?: string
  cancelled?: boolean
  cancelNote?: string
  domain?: Domain
}

export type Destination = 'inplannen' | 'klant' | 'kans' | 'weg'

export interface InboxItem {
  id: string
  text: string
  createdAt: string
  domain?: Domain
}

export type ClientStatus = 'lead' | 'lopend' | 'afgerond'

export interface TimelineItem {
  id: string
  kind: 'mail' | 'meeting' | 'notitie'
  date: ISODate
  title: string
  body?: string
}

export interface Client {
  id: string
  /** Pagina-id in de Notion-database Klanten */
  notionId?: string
  name: string
  contact: string
  sector: string
  status: ClientStatus
  tint: 'copper' | 'sea' | 'green' | 'sand'
  nextStep: string
  nextStepDurationMin: number
  commitments: { id: string, text: string, done: boolean }[]
  timeline: TimelineItem[]
}

export interface Project {
  id: string
  notionId?: string
  clientId: string
  name: string
  status: ClientStatus
  progress: number // 0..1
  budget: number
  /** Uurtarief excl. btw */
  hourlyRate: number
  /** Uren die al gefactureerd zijn */
  billedHours: number
}

export interface TimeEntry {
  id: string
  projectId: string
  date: ISODate
  hours: number
  note?: string
  assignmentId?: string
}

export type QuoteStatus = 'concept' | 'verstuurd' | 'akkoord' | 'afgewezen'
export interface Quote {
  id: string
  clientId: string
  title: string
  amount: number
  status: QuoteStatus
  sentOn?: ISODate
  decidedOn?: ISODate
}

export type LifeCategory = 'auto' | 'gezondheid' | 'verzekering' | 'abonnement' | 'documenten' | 'huis'
export interface LifeItem {
  id: string
  title: string
  category: LifeCategory
  due: ISODate
  /** Elke zoveel maanden terug; leeg = eenmalig */
  repeatMonths?: number
  /** Hoeveel dagen vooraf Stuurman het meldt */
  remindDays: number
  note?: string
  done?: boolean
}

// ---------- Opdrachten (kanban) ----------
/** Wat een kolom betekent. De naam en kleur komen uit Notion, de betekenis koppel je één keer. */
export type ColumnKind = 'todo' | 'doing' | 'waiting' | 'review' | 'done'
/** De kleuren die Notion voor statussen en tags gebruikt */
export type NotionColor = 'default' | 'gray' | 'brown' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'red'

export interface BoardColumn {
  /** Naam van de Status-optie in Notion, bijv. "Wacht op klant" */
  name: string
  color: NotionColor
  kind: ColumnKind
  /** Hooguit zoveel tegelijk (alleen voor Bezig) */
  wip?: number
}

export type Priority = 'hoog' | 'normaal' | 'laag'

export interface Assignment {
  id: string
  /** Pagina-id in Notion. Alles wat Stuurhut zelf bewaart hangt hieraan. */
  notionId: string
  title: string
  /** Naam van de kolom (= Status in Notion) */
  status: string
  clientId?: string
  projectId?: string
  due?: ISODate
  priority: Priority
  estimateH?: number
  tags: string[]
  /** Sinds wanneer in deze kolom: voor "wacht al 6 dagen" */
  statusSince: ISODate
  /** Volgorde binnen de kolom */
  order: number
  note?: string
}

export interface SyncState {
  source: 'testdata' | 'notion' | 'supabase'
  lastPull: string
  /** Wijzigingen die nog naar Notion moeten */
  pending: number
  error?: string
}

export type Confidence = 'laag' | 'middel' | 'hoog'
export type OpportunityStatus = 'nieuw' | 'onderzoeken' | 'ingepland' | 'laten gaan'

export interface Opportunity {
  id: string
  title: string
  source: string
  sourceClientIds?: string[]
  confidence: Confidence
  buildTime: string
  buildHours: number
  revenue: number
  why: string
  nextStep: string
  status: OpportunityStatus
  featured?: boolean
}

export interface Transaction {
  id: string
  date: ISODate
  amount: number // positief = in, negatief = uit
  label: string
  clientId?: string
  category: 'omzet' | 'vaste lasten' | 'abonnement' | 'overig'
}

export interface Invoice {
  id: string
  number: string
  clientId: string
  amount: number
  sentOn: ISODate
  due: ISODate
  paid?: boolean
  reminderPlanned?: boolean
}

export interface Subscription {
  id: string
  name: string
  monthly: number
  kind: 'vaste last' | 'abonnement'
  note?: string
}

export interface RhythmDay {
  date: ISODate
  /** Slaap in de nacht vóór deze dag */
  sleepH: number
  moveMin: number
  energy: 1 | 2 | 3 | 4 | 5
  workH: number
  /** Naar bed (de avond ervoor) en opgestaan (deze ochtend) */
  bed?: Time
  woke?: Time
  /** 1 = moe, 2 = gaat wel, 3 = uitgerust */
  rested?: 1 | 2 | 3
  /** Laatste keer achter je werk, de avond ervoor. Leeg = niet na werktijd. */
  lastWork?: Time
}

/** Eén week van het plan. Stap = een stap eerder, blijft = zelfde tijd, terug = een stap terug. */
export interface SleepWeek { wake: Time, decision: 'start' | 'stap' | 'blijft' | 'terug', done?: number, of?: number }

/** Een slaapritme in stappen: elke week een kwartier eerder op, tot je doel. */
export interface SleepPlan {
  /** Waar je begon */
  startWake: Time
  /** Waar je naartoe wilt */
  goalWake: Time
  /** Maandag van de eerste week */
  startedOn: ISODate
  stepMin: number
  /** Hoeveel slaap je nodig hebt */
  needH: number
  /** Zoveel minuten voor bedtijd gaat de laptop dicht */
  windDownMin: number
  /** Per week (sleutel: maandag) welke opstaantijd geldt, en waarom */
  weeks?: Record<ISODate, SleepWeek>
  /** De laatste gemiste ochtend waar je al antwoord op gaf */
  missAck?: ISODate
  /** Een reden om op te staan: een vast eerste werkblok en een ochtendroutine */
  morning?: { firstBlock: boolean, offsetMin: number, blockMin: number, routineId?: string }
}

export type SkipReason = 'geen tijd' | 'te moe' | 'vergeten' | 'omstandigheden' | 'geen zin'

export interface RoutineLog {
  done: boolean
  reason?: SkipReason
}

export interface Routine {
  id: string
  name: string
  /** Wanneer: het vaste moment of de trigger ("Na de lunch") */
  cue: string
  /** Waarom je het doet, in je eigen woorden */
  why: string
  /** Doel per week */
  goal: number
  /** Weekdagen waarop het gepland staat (0 = zo … 6 = za) */
  days: number[]
  icon: string
  log: Record<ISODate, RoutineLog>
  /** Gepauzeerd telt niet mee, de geschiedenis blijft */
  paused?: boolean
  domain?: Domain
  /** De laatste gemiste keer waar je al antwoord op gaf */
  missAck?: ISODate
  /** De week (maandag) waarin je al antwoord gaf op een voorstel om het doel te veranderen */
  tempoAck?: ISODate
}

export interface Goal {
  id: string
  title: string
  kind: 'geld' | 'aantal' | 'mijlpaal' | 'grens'
  current: number
  target: number
  period: string
  link: string
  steps?: string[]
  domain?: Domain
}

export type StuurmanAction =
  | { type: 'scheduleTask', taskId: string, date: ISODate, start: Time }
  | { type: 'fillGap', eventId: string, option: 'task' | 'focus' | 'vrij', taskId?: string, opportunityId?: string }
  | { type: 'planInvoiceReminder', invoiceId: string }
  | { type: 'createOpportunity', title: string, source: string, revenue: number, buildTime: string, why: string }
  | { type: 'setMorningFocus' }
  | { type: 'none' }
  | { type: 'planOpportunity', opportunityId: string }
  | { type: 'navigate', to: string }
  | { type: 'sortInbox', destination: 'klant' }
  | { type: 'setOpportunityStatus', opportunityId: string, status: OpportunityStatus }
  | { type: 'addTask', title: string, date: ISODate, start: Time, durationMin: number, kind: Task['kind'], domain?: Domain, clientId?: string }
  | { type: 'addRoutineBlocks', routineId: string, start: Time, durationMin: number }
  | { type: 'setReminder', routineId: string, time: Time }
  | { type: 'moveOutsideWork' }
  | { type: 'markSetAside' }
  | { type: 'moveAssignment', assignmentId: string, status: string }
  | { type: 'planAssignment', assignmentId: string }
  | { type: 'setFirstBlock' }
  | { type: 'sleepStepBack' }
  | { type: 'planFirstStep', assignmentId?: string, taskId?: string, text: string }
  | { type: 'answerRoutineMiss', routineId: string, answer: 'lager' | 'pauze' | 'herinner' }

export type SuggestionTone = 'planning' | 'geld' | 'kans' | 'ritme' | 'klant'

export interface ChatMessage {
  id: string
  role: 'user' | 'stuurman'
  text: string
  at: string
  /** Optioneel voorstel dat Stuurman in de chat doet */
  suggestion?: StuurmanSuggestion
  /** Vervolgvragen om op te tikken */
  chips?: string[]
  /** Ingevuld formulier dat Stuurman klaarzet */
  form?: EditorRequest
}

export type EditorKind = 'klant' | 'routine' | 'taak' | 'afspraak' | 'werktijden' | 'admin' | 'opdracht' | 'slaap'
export interface EditorRequest {
  kind: EditorKind
  id?: string
  prefill?: Record<string, unknown>
}

export interface StuurmanSuggestion {
  id: string
  pages: PageKey[]
  /** Korte titel om te scannen, bijv. "Offerte inplannen" */
  title: string
  /** Kort kenmerk rechts, bijv. "vr 12:45" of "€ 2.850" */
  meta?: string
  icon: string
  /** Kleur van het thema: planning, geld, kans, ritme of klant */
  tone: SuggestionTone
  text: string
  why: string
  acceptLabel: string
  action: StuurmanAction
}

export interface GapOption {
  id: 'task' | 'focus' | 'vrij'
  title: string
  why: string
  taskId?: string
  opportunityId?: string
}

export interface StuurmanQuestion {
  page: PageKey
  question: string
  answer: string
}

export interface TaxPrefs {
  /** Btw-tarief, bijv. 0.21 */
  vat: number
  /** Deel van de omzet (excl. btw) dat je apart zet voor inkomstenbelasting */
  reserve: number
  /** Maanden (YYYY-MM) waarvoor je het al apart hebt gezet */
  setAside: Record<string, boolean>
}

export interface WorkHours {
  /** Werkdagen (0 = zo … 6 = za) */
  days: number[]
  start: Time
  end: Time
}

export interface DayStart { sleep?: number, bed?: Time, woke?: Time, rested?: 1 | 2 | 3, energy?: number, picks: string[], at: string }
export interface DayEnd { win?: string, energy?: number, carried: number, at: string }
export interface WeekReview { focus: string[], released: number, note?: string, at: string }
export interface Rituals {
  dayStart: Record<ISODate, DayStart>
  dayEnd: Record<ISODate, DayEnd>
  /** Sleutel: maandag van de week */
  weekReview: Record<ISODate, WeekReview>
}

export interface AppState {
  version: number
  seededOn: ISODate
  tasks: Task[]
  events: CalendarEvent[]
  inbox: InboxItem[]
  clients: Client[]
  projects: Project[]
  opportunities: Opportunity[]
  transactions: Transaction[]
  invoices: Invoice[]
  subscriptions: Subscription[]
  rhythm: RhythmDay[]
  routines: Routine[]
  goals: Goal[]
  chat: ChatMessage[]
  rituals: Rituals
  timeEntries: TimeEntry[]
  quotes: Quote[]
  life: LifeItem[]
  assignments: Assignment[]
  board: BoardColumn[]
  sync: SyncState
  checkins: Record<ISODate, number>
  /** Wanneer de laptop 's avonds dichtging (sleutel: die avond) */
  evenings: Record<ISODate, { closedAt?: Time, kept?: boolean }>
  suggestionStatus: Record<string, 'accepted' | 'dismissed'>
  gapResolved: Record<string, string>
  prefs: { morningFocus: boolean, reminders: Record<string, Time>, workHours: WorkHours, tax: TaxPrefs, sleep: SleepPlan }
}
