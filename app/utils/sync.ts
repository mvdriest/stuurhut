// Vertaling tussen de V2-state en Supabase.
//
// Twee soorten opslag:
// 1. Dingen die V1 en de Telegram-bot ook kennen, staan in hun eigen tabel
//    (klanten, trajecten, subtaken, afspraken, inbox_items, doelen). Wat V2 extra
//    weet, staat in de kolom `extra` van die rij.
// 2. Al het andere staat in `v2_items`: één rij per ding (collection + item_id),
//    of één rij per instelling (collection '_state').
import type { AppState, RhythmDay, Assignment, CalendarEvent, Client, Goal, InboxItem, Project, TimelineItem } from '~/types'
import type { Database, Json } from '~/types/database.types'

type T = Database['public']['Tables']
export type TableName = 'klanten' | 'trajecten' | 'subtaken' | 'afspraken' | 'inbox_items' | 'doelen'
type Row<N extends keyof T> = T[N]['Row']

// ---------- Bord ↔ subtaken.status ----------
const STATUS_TO_DB: Record<string, string> = { 'Te doen': 'to_do', 'Bezig': 'bezig', 'Wacht op klant': 'wacht', 'Review': 'review', 'Klaar': 'klaar' }
const DB_TO_STATUS: Record<string, string> = Object.fromEntries(Object.entries(STATUS_TO_DB).map(([k, v]) => [v, k]))

/** Alles behalve de genoemde velden, voor de kolom `extra`. */
function rest<O extends object>(o: O, keys: (keyof O)[]): Json {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(o)) if (!keys.includes(k as keyof O) && v !== undefined) out[k] = v
  return JSON.parse(JSON.stringify(out)) as Json
}
const ex = <O>(j: Json): Partial<O> => (j && typeof j === 'object' && !Array.isArray(j) ? j : {}) as Partial<O>
const hhmm = (t: string) => t.slice(0, 5)
const TINTS: Client['tint'][] = ['sea', 'green', 'copper', 'sand']
const tintFor = (id: string) => TINTS[[...id].reduce((s, c) => s + c.charCodeAt(0), 0) % TINTS.length]!

export interface Loaded {
  klanten: Row<'klanten'>[]
  contacten: Row<'contacten'>[]
  trajecten: Row<'trajecten'>[]
  subtaken: Row<'subtaken'>[]
  afspraken: Row<'afspraken'>[]
  inbox_items: Row<'inbox_items'>[]
  doelen: Row<'doelen'>[]
  doel_mijlpalen: Row<'doel_mijlpalen'>[]
  traject_haltes: Row<'traject_haltes'>[]
  journal_entries: Row<'journal_entries'>[]
  v2_items: Row<'v2_items'>[]
}

// ---------- Gekoppelde tabellen ----------
export interface Mapped<K extends keyof AppState, I extends { id: string }> {
  key: K
  table: TableName
  toRow: (item: I) => Record<string, unknown>
}

export const MAPPED = [
  {
    key: 'clients',
    table: 'klanten',
    // Contactgegevens en journaal-notities komen uit hun eigen tabel: niet dubbel opslaan.
    toRow: (c: Client) => ({ id: c.id, naam: c.name, extra: rest({ ...c, timeline: c.timeline.filter(t => t.bron !== 'journal') }, ['id', 'name', 'email', 'phone']) }),
  } satisfies Mapped<'clients', Client>,
  {
    key: 'projects',
    table: 'trajecten',
    toRow: (p: Project) => ({
      id: p.id,
      naam: p.name,
      klant_id: p.clientId || null,
      bedrag_afgesproken: p.budget,
      eerstvolgende_actie: p.nextStep || null,
      wacht_op: p.waitingOn || null,
      streefdatum: p.due || null,
      extra: rest(p, ['id', 'name', 'clientId', 'budget', 'nextStep', 'waitingOn', 'due', 'stops']),
    }),
  } satisfies Mapped<'projects', Project>,
  {
    key: 'assignments',
    table: 'subtaken',
    toRow: (a: Assignment) => {
      const status = STATUS_TO_DB[a.status] ?? 'to_do'
      return {
        id: a.id,
        tekst: a.title,
        status,
        traject_id: a.projectId ?? null,
        geschatte_duur: Math.max(5, Math.round((a.estimateH ?? 1) * 60)),
        volgorde: a.order,
        klaar_op: status === 'klaar' ? `${a.statusSince}T12:00:00Z` : null,
        extra: rest(a, ['id', 'title', 'status', 'projectId', 'order']),
      }
    },
  } satisfies Mapped<'assignments', Assignment>,
  {
    key: 'events',
    table: 'afspraken',
    toRow: (e: CalendarEvent) => ({
      id: e.id,
      titel: e.title,
      datum: e.date,
      start_tijd: e.start,
      eind_tijd: e.end,
      categorie: e.domain === 'prive' ? 'prive' : e.clientId ? 'klantwerk' : 'eigen_werk',
      extra: rest(e, ['id', 'title', 'date', 'start', 'end']),
    }),
  } satisfies Mapped<'events', CalendarEvent>,
  {
    key: 'inbox',
    table: 'inbox_items',
    toRow: (i: InboxItem) => ({ id: i.id, tekst: i.text, created_at: i.createdAt, extra: rest(i, ['id', 'text', 'createdAt']) }),
  } satisfies Mapped<'inbox', InboxItem>,
  {
    key: 'goals',
    table: 'doelen',
    toRow: (g: Goal) => ({ id: g.id, titel: g.title, extra: rest(g, ['id', 'title']) }),
  } satisfies Mapped<'goals', Goal>,
] as const

/** In deze volgorde opslaan (verwijzingen eerst), verwijderen in omgekeerde volgorde. */
export const MAPPED_KEYS = MAPPED.map(m => m.key)

// ---------- Overige V2-onderdelen in v2_items ----------
/** Lijsten: één rij per ding. Ritme heeft geen id, daar is de datum de sleutel. */
export const ITEM_LISTS = ['tasks', 'opportunities', 'transactions', 'invoices', 'subscriptions', 'rhythm', 'routines', 'chat', 'timeEntries', 'quotes', 'life'] as const
/** Losse onderdelen: één rij per onderdeel, collection '_state'. */
export const SINGLES = ['rituals', 'checkins', 'evenings', 'suggestionStatus', 'gapResolved', 'prefs'] as const

type ListKey = typeof ITEM_LISTS[number]
export const itemId = (key: ListKey, item: unknown) =>
  key === 'rhythm' ? (item as { date: string }).date : (item as { id: string }).id

// ---------- Van Supabase naar de state ----------
export function fromSupabase(d: Loaded, base: AppState): AppState {
  const s = base
  const trajectKlant = new Map(d.trajecten.map(t => [t.id, t.klant_id]))
  const contactVan = new Map<string, Row<'contacten'>>()
  for (const c of d.contacten) if (c.klant_id && !contactVan.has(c.klant_id)) contactVan.set(c.klant_id, c)
  // Volgende stap: de meest recent bijgewerkte eerstvolgende actie van de trajecten van die klant
  const stapVan = new Map<string, string>()
  for (const t of [...d.trajecten].sort((a, b) => b.updated_at.localeCompare(a.updated_at))) {
    if (t.klant_id && t.eerstvolgende_actie?.trim() && !stapVan.has(t.klant_id)) stapVan.set(t.klant_id, t.eerstvolgende_actie.trim())
  }
  // Journaal-notities bij een traject horen in de tijdlijn van die klant
  const journaalVan = new Map<string, TimelineItem[]>()
  for (const j of d.journal_entries) {
    const klant = j.traject_id ? trajectKlant.get(j.traject_id) : undefined
    if (!klant) continue
    const regel = j.inhoud.split('\n')[0]!.trim()
    const item: TimelineItem = {
      id: j.id,
      kind: 'notitie',
      date: j.created_at.slice(0, 10),
      title: regel.length > 90 ? `${regel.slice(0, 88)}…` : regel,
      body: [regel === j.inhoud.trim() ? '' : j.inhoud.trim(), j.resultaat_label ?? ''].filter(Boolean).join('\n\n') || undefined,
      bron: 'journal',
    }
    journaalVan.set(klant, [...(journaalVan.get(klant) ?? []), item])
  }
  const haltesVan = new Map<string, { done: number, total: number }>()
  for (const h of d.traject_haltes) {
    const v = haltesVan.get(h.traject_id) ?? { done: 0, total: 0 }
    v.total++
    if (h.afgerond_op) v.done++
    haltesVan.set(h.traject_id, v)
  }
  const lopend = new Set(d.trajecten.filter(t => t.status !== 'on_hold').map(t => t.klant_id))

  s.clients = d.klanten.map((k) => {
    const x = ex<Client>(k.extra)
    return {
      ...x,
      id: k.id,
      name: k.naam,
      contact: x.contact || contactVan.get(k.id)?.naam || '',
      email: contactVan.get(k.id)?.email ?? undefined,
      phone: contactVan.get(k.id)?.telefoon ?? undefined,
      sector: x.sector ?? '',
      status: x.status ?? (lopend.has(k.id) ? 'lopend' : 'lead'),
      tint: x.tint ?? tintFor(k.id),
      nextStep: stapVan.get(k.id) ?? x.nextStep ?? '',
      nextStepDurationMin: x.nextStepDurationMin ?? 30,
      commitments: x.commitments ?? [],
      timeline: [...(x.timeline ?? []).filter(t => t.bron !== 'journal'), ...(journaalVan.get(k.id) ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
    }
  })

  // V2 kent alleen projecten bij een klant. Trajecten zonder klant blijven in Supabase staan.
  s.projects = d.trajecten.filter(t => t.klant_id).map((t) => {
    const x = ex<Project>(t.extra)
    const stops = haltesVan.get(t.id)
    return {
      ...x,
      id: t.id,
      clientId: t.klant_id!,
      name: t.naam,
      status: x.status ?? (t.status === 'on_hold' ? 'afgerond' : 'lopend'),
      progress: stops?.total ? stops.done / stops.total : (x.progress ?? 0),
      budget: Number(t.bedrag_afgesproken ?? 0),
      hourlyRate: x.hourlyRate ?? 85,
      billedHours: x.billedHours ?? 0,
      nextStep: t.eerstvolgende_actie?.trim() || undefined,
      waitingOn: t.wacht_op?.trim() || undefined,
      waitingSince: t.wacht_op?.trim() ? (x.waitingSince ?? t.updated_at.slice(0, 10)) : undefined,
      due: /^\d{4}-\d{2}-\d{2}$/.test(t.streefdatum ?? '') ? t.streefdatum! : undefined,
      stops,
    }
  })

  s.assignments = d.subtaken.map((r) => {
    const x = ex<Assignment>(r.extra)
    const klant = r.traject_id ? trajectKlant.get(r.traject_id) : undefined
    return {
      ...x,
      id: r.id,
      notionId: x.notionId || r.id,
      title: r.tekst,
      status: DB_TO_STATUS[r.status] ?? 'Te doen',
      projectId: r.traject_id ?? undefined,
      clientId: klant ?? x.clientId,
      priority: x.priority ?? 'normaal',
      estimateH: x.estimateH ?? r.geschatte_duur / 60,
      tags: x.tags ?? [],
      statusSince: x.statusSince ?? (r.klaar_op ?? r.created_at).slice(0, 10),
      order: r.volgorde,
    }
  })

  s.events = d.afspraken.map((r) => {
    const x = ex<CalendarEvent>(r.extra)
    const klant = r.traject_id ? trajectKlant.get(r.traject_id) : undefined
    return {
      ...x,
      id: r.id,
      title: r.titel,
      date: r.datum,
      start: hhmm(r.start_tijd),
      end: hhmm(r.eind_tijd),
      clientId: klant ?? x.clientId,
      domain: x.domain ?? (r.categorie === 'prive' ? 'prive' : 'zakelijk'),
    }
  })

  s.inbox = d.inbox_items.map(r => ({ ...ex<InboxItem>(r.extra), id: r.id, text: r.tekst, createdAt: r.created_at }))

  s.goals = d.doelen.filter(r => r.status === 'actief').map((r) => {
    const x = ex<Goal>(r.extra)
    const stappen = d.doel_mijlpalen.filter(m => m.doel_id === r.id).sort((a, b) => a.volgorde - b.volgorde)
    // Doelen uit V1 hebben mijlpalen: die bepalen de voortgang.
    const mijlpaal = stappen.length && (!x.kind || x.kind === 'mijlpaal')
    return {
      kind: 'mijlpaal',
      period: r.deadline ? `voor ${r.deadline}` : '',
      link: '',
      ...x,
      id: r.id,
      title: r.titel,
      current: mijlpaal ? stappen.filter(m => m.afgerond).length : (x.current ?? 0),
      target: mijlpaal ? stappen.length : (x.target ?? 1),
      steps: mijlpaal ? stappen.map(m => m.titel) : x.steps,
    } as Goal
  })

  const rec = s as unknown as Record<string, unknown>
  for (const key of ITEM_LISTS) {
    const rows = d.v2_items.filter(r => r.collection === key)
    rec[key] = rows.map(r => r.data)
  }
  if (s.chat.length) s.chat.sort((a, b) => a.at.localeCompare(b.at))
  for (const r of d.v2_items.filter(r => r.collection === '_state')) {
    if ((SINGLES as readonly string[]).includes(r.item_id)) rec[r.item_id] = r.data
  }
  const health = new Map(d.v2_items.filter(r => r.collection === 'health').map(r => [r.item_id, r.data as unknown as Health]))
  s.rhythm = bouwRitme(s, health)
  return s
}

// ---------- Ritme: per dag samengesteld ----------
/** Wat de iOS-opdracht uit Apple Gezondheid stuurt (collection 'health', sleutel = datum) */
export interface Health { date: string, sleepH?: number, bed?: string, woke?: string, moveMin?: number }

/**
 * Eén ritmedag per datum, uit: Gezondheid (slaap, beweging), je dagstart (bedtijd en opstaan
 * zoals jij ze opgaf, energie, uitgerust), je gelogde uren en wanneer de laptop dichtging.
 */
export function bouwRitme(s: AppState, health: Map<string, Health>): RhythmDay[] {
  const oud = new Map(s.rhythm.map(r => [r.date, r]))
  const uren = new Map<string, number>()
  for (const t of s.timeEntries) uren.set(t.date, (uren.get(t.date) ?? 0) + t.hours)
  const datums = new Set([...oud.keys(), ...health.keys(), ...Object.keys(s.rituals.dayStart)])
  const werkEind = s.prefs.workHours.end
  return [...datums].sort().map((date) => {
    const r = oud.get(date)
    const h = health.get(date)
    const ds = s.rituals.dayStart[date]
    const bed = ds?.bed ?? h?.bed ?? r?.bed
    const woke = ds?.woke ?? h?.woke ?? r?.woke
    const dicht = s.evenings[addDays(date, -1)]?.closedAt
    const day: RhythmDay = {
      date,
      sleepH: h?.sleepH ?? ds?.sleep ?? r?.sleepH ?? (bed && woke ? sleepHours(bed, woke) : 0),
      moveMin: h?.moveMin ?? r?.moveMin ?? 0,
      workH: Math.max(uren.get(date) ?? 0, r?.workH ?? 0),
      energy: (ds?.energy ?? r?.energy) as RhythmDay['energy'],
      rested: ds?.rested ?? r?.rested,
      bed,
      woke,
      lastWork: dicht && nightMin(dicht) > nightMin(werkEind) ? dicht : r?.lastWork,
    }
    return JSON.parse(JSON.stringify(day)) as RhythmDay
  })
}

// ---------- Momentopname: wat er nu in Supabase staat ----------
/** Per onderdeel: id → JSON van de rij. Zo zie je wat er veranderd is. */
export type Snapshot = Map<string, Map<string, string>>

export function snapshot(s: AppState): Snapshot {
  const snap: Snapshot = new Map()
  for (const m of MAPPED) {
    const toRow = m.toRow as (i: unknown) => Record<string, unknown>
    snap.set(m.key, new Map((s[m.key] as { id: string }[]).map(i => [i.id, JSON.stringify(toRow(i))])))
  }
  for (const key of ITEM_LISTS) {
    snap.set(key, new Map((s[key] as unknown[]).map(i => [itemId(key, i), JSON.stringify(i)])))
  }
  snap.set('_state', new Map(SINGLES.map(k => [k, JSON.stringify(s[k])])))
  return snap
}
