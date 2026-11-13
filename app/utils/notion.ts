// ============================================================
//  NOTION → STUURHUT
//  Hier staat hoe een pagina uit je Notion-database "Opdrachten"
//  een kaart op het bord wordt, en andersom. Klopt een naam in
//  je echte Notion niet, dan pas je alleen NOTION_SCHEMA aan.
//  Er wordt nu niets opgehaald: de bron is testdata in dezelfde
//  vorm als wat de Notion-API teruggeeft.
// ============================================================
import type { Assignment, BoardColumn, ColumnKind, NotionColor, Priority } from '~/types'

/** Welke eigenschap in Notion welk veld is. */
export const NOTION_SCHEMA = {
  database: 'Opdrachten',
  title: 'Naam',
  status: 'Status',
  client: 'Klant', // relatie naar de database Klanten
  project: 'Project', // relatie naar de database Projecten
  due: 'Deadline',
  priority: 'Prioriteit',
  estimate: 'Geschatte uren',
  tags: 'Soort',
  note: 'Notitie',
} as const

/** Wat elke status betekent. Onbekende statussen gaan naar de groep waar Notion ze zelf in zet. */
export const STATUS_KIND: Record<string, ColumnKind> = {
  'Te doen': 'todo',
  'Bezig': 'doing',
  'Wacht op klant': 'waiting',
  'Review': 'review',
  'Klaar': 'done',
}
const GROUP_KIND: Record<string, ColumnKind> = { 'To-do': 'todo', 'In progress': 'doing', 'Complete': 'done' }

/** Grens aan het aantal opdrachten tegelijk in Bezig. */
export const WIP_LIMIT = 3

// ---------- De vorm van de Notion-API (alleen wat we gebruiken) ----------
export interface NotionRichText { plain_text: string }
export interface NotionStatusOption { id: string, name: string, color: NotionColor }
export interface NotionPage {
  object: 'page'
  id: string
  last_edited_time: string
  properties: Record<string, any>
}
export interface NotionDatabase {
  id: string
  title: NotionRichText[]
  properties: {
    Status: { type: 'status', status: { options: NotionStatusOption[], groups: { name: string, option_ids: string[] }[] } }
    [k: string]: any
  }
}

/** Kolommen uit de Status-opties van de database, in de volgorde van Notion. */
export function columnsFromDatabase(db: NotionDatabase): BoardColumn[] {
  const { options, groups } = db.properties.Status.status
  return options.map((o) => {
    const group = groups.find(g => g.option_ids.includes(o.id))
    const kind = STATUS_KIND[o.name] ?? GROUP_KIND[group?.name ?? ''] ?? 'todo'
    return { name: o.name, color: o.color, kind, wip: kind === 'doing' ? WIP_LIMIT : undefined }
  })
}

const text = (p: any) => (p?.title ?? p?.rich_text ?? []).map((t: NotionRichText) => t.plain_text).join('')
const PRIORITIES: Record<string, Priority> = { Hoog: 'hoog', Normaal: 'normaal', Laag: 'laag' }

/**
 * Eén Notion-pagina naar een opdracht.
 * `lookup` vertaalt Notion-ids van klanten en projecten naar die in Stuurhut.
 * `local` is wat Stuurhut zelf al wist (volgorde, sinds wanneer in deze kolom).
 */
export function mapNotionPage(
  page: NotionPage,
  lookup: { client: (notionId: string) => string | undefined, project: (notionId: string) => string | undefined },
  local?: Partial<Assignment>,
): Assignment {
  const P = page.properties
  const S = NOTION_SCHEMA
  const status = P[S.status]?.status?.name ?? 'Te doen'
  return {
    id: local?.id ?? `as-${page.id}`,
    notionId: page.id,
    title: text(P[S.title]) || 'Zonder titel',
    status,
    clientId: lookup.client(P[S.client]?.relation?.[0]?.id ?? ''),
    projectId: lookup.project(P[S.project]?.relation?.[0]?.id ?? ''),
    due: P[S.due]?.date?.start?.slice(0, 10) ?? undefined,
    priority: PRIORITIES[P[S.priority]?.select?.name ?? ''] ?? 'normaal',
    estimateH: P[S.estimate]?.number ?? undefined,
    tags: (P[S.tags]?.multi_select ?? []).map((t: { name: string }) => t.name),
    note: text(P[S.note]) || undefined,
    // Wisselt de status in Notion, dan begint de teller opnieuw
    statusSince: local?.status === status && local?.statusSince ? local.statusSince : page.last_edited_time.slice(0, 10),
    order: local?.order ?? 0,
  }
}

/** Wat Stuurhut straks naar Notion stuurt (pages.update) als je een kaart verschuift of bewerkt. */
export function toNotionPatch(a: Partial<Assignment>, lookup?: { client: (id: string) => string | undefined }) {
  const S = NOTION_SCHEMA
  const properties: Record<string, unknown> = {}
  if (a.title !== undefined) properties[S.title] = { title: [{ text: { content: a.title } }] }
  if (a.status !== undefined) properties[S.status] = { status: { name: a.status } }
  if (a.due !== undefined) properties[S.due] = { date: a.due ? { start: a.due } : null }
  if (a.priority !== undefined) properties[S.priority] = { select: { name: a.priority.charAt(0).toUpperCase() + a.priority.slice(1) } }
  if (a.estimateH !== undefined) properties[S.estimate] = { number: a.estimateH ?? null }
  if (a.clientId !== undefined && lookup) {
    const id = a.clientId ? lookup.client(a.clientId) : undefined
    properties[S.client] = { relation: id ? [{ id }] : [] }
  }
  return { properties }
}

/** Notion-kleuren op de kleuren van Stuurhut. `fill` bevat ook de tekstkleur, zodat het in beide thema's leesbaar blijft. */
export const NOTION_FILL: Record<NotionColor, { fill: string, dot: string }> = {
  default: { fill: 'bg-surface-3 text-ink', dot: 'bg-muted' },
  gray: { fill: 'bg-surface-3 text-ink', dot: 'bg-muted' },
  brown: { fill: 'bg-copper-soft text-copper-ink', dot: 'bg-copper' },
  orange: { fill: 'bg-copper-soft text-copper-ink', dot: 'bg-copper' },
  yellow: { fill: 'bg-cat-taak text-cat-ink', dot: 'bg-cat-taak-dot' },
  green: { fill: 'bg-cat-focus text-cat-ink', dot: 'bg-cat-focus-dot' },
  blue: { fill: 'bg-cat-meeting text-cat-ink', dot: 'bg-cat-meeting-dot' },
  purple: { fill: 'bg-cat-admin text-cat-ink', dot: 'bg-cat-admin-dot' },
  pink: { fill: 'bg-cat-prive text-cat-ink', dot: 'bg-cat-prive-dot' },
  red: { fill: 'bg-copper-soft text-copper-ink', dot: 'bg-copper' },
}

/** Soort werk, met dezelfde kleurtaal als Week. */
export const TAG_FILL: Record<string, string> = {
  Bouwen: 'bg-cat-focus text-cat-ink',
  Ontwerp: 'bg-cat-admin text-cat-ink',
  Content: 'bg-cat-taak text-cat-ink',
  Oplevering: 'bg-cat-meeting text-cat-ink',
  Overleg: 'bg-copper-soft text-copper-ink',
}
export const TAGS = Object.keys(TAG_FILL)
