// Testdata in precies de vorm die de Notion-API teruggeeft voor de database "Opdrachten".
// Verzonnen opdrachten, verzonnen klanten. Straks komt dit van het echte endpoint.
import type { NotionDatabase, NotionPage } from '~/utils/notion'
import { addDays, todayISO } from '~/utils/date'

/** Notion-ids van klanten en projecten. In Stuurhut staan ze als notionId bij de klant. */
export const NOTION_CLIENT_IDS: Record<string, string> = {
  korenaar: 'ntn-klant-korenaar',
  noordlicht: 'ntn-klant-noordlicht',
  plein: 'ntn-klant-plein',
  vandijk: 'ntn-klant-vandijk',
  mira: 'ntn-klant-mira',
  camping: 'ntn-klant-camping',
}
export const NOTION_PROJECT_IDS: Record<string, string> = {
  'pr-korenaar': 'ntn-proj-korenaar',
  'pr-noordlicht': 'ntn-proj-noordlicht',
  'pr-vandijk': 'ntn-proj-vandijk',
  'pr-mira': 'ntn-proj-mira',
  'pr-camping': 'ntn-proj-camping',
}

export function notionDatabase(): NotionDatabase {
  return {
    id: 'ntn-db-opdrachten',
    title: [{ plain_text: 'Opdrachten' }],
    properties: {
      Status: {
        type: 'status',
        status: {
          options: [
            { id: 's1', name: 'Te doen', color: 'gray' },
            { id: 's2', name: 'Bezig', color: 'blue' },
            { id: 's3', name: 'Wacht op klant', color: 'yellow' },
            { id: 's4', name: 'Review', color: 'purple' },
            { id: 's5', name: 'Klaar', color: 'green' },
          ],
          groups: [
            { name: 'To-do', option_ids: ['s1'] },
            { name: 'In progress', option_ids: ['s2', 's3', 's4'] },
            { name: 'Complete', option_ids: ['s5'] },
          ],
        },
      },
    },
  }
}

interface Row {
  id: string
  title: string
  status: string
  client: string
  project?: string
  due?: number
  priority?: 'Hoog' | 'Normaal' | 'Laag'
  hours?: number
  tags: string[]
  /** Dagen geleden dat de status wisselde */
  since: number
  note?: string
}

const ROWS: Row[] = [
  // Bakkerij De Korenaar
  { id: 'a1', title: 'Bestelpagina kerstbroden bouwen', status: 'Bezig', client: 'korenaar', project: 'pr-korenaar', due: 9, priority: 'Hoog', hours: 12, tags: ['Bouwen'], since: 4, note: 'Bestellen tot 22 december, ophalen op 24 december.' },
  { id: 'a2', title: 'Teksten menukaart verwerken', status: 'Wacht op klant', client: 'korenaar', project: 'pr-korenaar', due: 11, hours: 2, tags: ['Content'], since: 3, note: 'Henk levert de teksten aan.' },
  { id: 'a3', title: 'Foto’s nieuwe broden plaatsen', status: 'Te doen', client: 'korenaar', project: 'pr-korenaar', due: 6, hours: 2, tags: ['Content'], since: 8 },
  // Van Dijk Installatie
  { id: 'a4', title: 'Klantportaal opleveren', status: 'Review', client: 'vandijk', project: 'pr-vandijk', due: 2, priority: 'Hoog', hours: 4, tags: ['Oplevering'], since: 1, note: 'Marco test met twee monteurs.' },
  { id: 'a5', title: 'Foto bij storingsmelding', status: 'Bezig', client: 'vandijk', project: 'pr-vandijk', due: 5, hours: 6, tags: ['Bouwen'], since: 6 },
  { id: 'a6', title: 'Garantievoorwaarden in de oplevering', status: 'Te doen', client: 'vandijk', project: 'pr-vandijk', due: 3, priority: 'Hoog', hours: 2, tags: ['Content'], since: 10 },
  { id: 'a7', title: 'Plan van aanpak fase 2', status: 'Te doen', client: 'vandijk', project: 'pr-vandijk', due: 12, hours: 3, tags: ['Overleg'], since: 15 },
  // Camping Aan de Rijn
  { id: 'a8', title: 'Homepage-foto’s selecteren', status: 'Bezig', client: 'camping', project: 'pr-camping', due: 4, hours: 1.5, tags: ['Content'], since: 2 },
  { id: 'a9', title: 'Indeling site laten goedkeuren', status: 'Wacht op klant', client: 'camping', project: 'pr-camping', due: 10, hours: 1, tags: ['Ontwerp'], since: 7, note: 'Ellen kijkt naar de schets met de velden.' },
  { id: 'a10', title: 'Kostenraming online reserveren', status: 'Te doen', client: 'camping', project: 'pr-camping', due: 14, priority: 'Laag', hours: 3, tags: ['Overleg'], since: 4 },
  // Studio Noordlicht
  { id: 'a11', title: 'Moodboard huisstijl', status: 'Te doen', client: 'noordlicht', project: 'pr-noordlicht', priority: 'Laag', hours: 4, tags: ['Ontwerp'], since: 3 },
  // Fysio Het Plein
  { id: 'a12', title: 'Demo online afspraken', status: 'Bezig', client: 'plein', due: 8, hours: 3, tags: ['Bouwen'], since: 9 },
  // Klaar
  { id: 'a13', title: 'Workshopagenda live zetten', status: 'Klaar', client: 'mira', project: 'pr-mira', hours: 6, tags: ['Oplevering'], since: 2 },
  { id: 'a14', title: 'Handleiding voor de monteurs', status: 'Klaar', client: 'vandijk', project: 'pr-vandijk', hours: 3, tags: ['Content'], since: 5 },
  { id: 'a15', title: 'Openingstijden op de site', status: 'Klaar', client: 'korenaar', project: 'pr-korenaar', hours: 0.5, tags: ['Content'], since: 9 },
]

/** Zoals databases.query: een lijst pagina's met eigenschappen. */
export function notionQuery(): { results: NotionPage[] } {
  const t = todayISO()
  return {
    results: ROWS.map(r => ({
      object: 'page',
      id: `ntn-${r.id}`,
      last_edited_time: `${addDays(t, -r.since)}T09:12:00.000Z`,
      properties: {
        Naam: { type: 'title', title: [{ plain_text: r.title }] },
        Status: { type: 'status', status: { name: r.status } },
        Klant: { type: 'relation', relation: [{ id: NOTION_CLIENT_IDS[r.client] }] },
        Project: { type: 'relation', relation: r.project ? [{ id: NOTION_PROJECT_IDS[r.project] }] : [] },
        Deadline: { type: 'date', date: r.due !== undefined ? { start: addDays(t, r.due) } : null },
        Prioriteit: { type: 'select', select: { name: r.priority ?? 'Normaal' } },
        'Geschatte uren': { type: 'number', number: r.hours ?? null },
        Soort: { type: 'multi_select', multi_select: r.tags.map(name => ({ name })) },
        Notitie: { type: 'rich_text', rich_text: r.note ? [{ plain_text: r.note }] : [] },
      },
    })),
  }
}
