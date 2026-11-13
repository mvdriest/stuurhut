// ============================================================
//  EEN EERSTE STAP
//  Werk dat blijft liggen is meestal te groot of te vaag, niet
//  te saai. Beginnen is het moeilijkste deel. Daarom stelt
//  Stuurman één stap van een kwartier voor, en geen hele taak.
// ============================================================
import type { AppState, Assignment, Task } from '~/types'
import { diffDays, todayISO } from './date'

/** Een kleine, concrete eerste stap. Je kunt hem altijd zelf herschrijven. */
const BY_TAG: Record<string, string> = {
  Bouwen: 'Zet een leeg bestand klaar en schrijf in commentaar de drie onderdelen op. Nog niets bouwen.',
  Ontwerp: 'Verzamel drie voorbeelden die je mooi vindt, in één map.',
  Content: 'Schrijf alleen de koppen op. De tekst komt later.',
  Oplevering: 'Maak een lijstje van wat er nog moet gebeuren voor de oplevering.',
  Overleg: 'Schrijf de drie vragen op die je wilt stellen.',
}
const BY_WORD: [RegExp, string][] = [
  [/btw|aangifte|belasting/i, 'Zet de bonnetjes van dit kwartaal in één map. Verder nog niets.'],
  [/offerte|kostenraming|raming/i, 'Schrijf de onderdelen onder elkaar, nog zonder bedragen.'],
  [/plan van aanpak|plan/i, 'Schrijf in vijf regels wat het doel is en wat er níet in hoort.'],
  [/factuur/i, 'Zet de uren en het bedrag klaar in een concept.'],
  [/mail|bellen/i, 'Schrijf de eerste zin van het bericht.'],
]
export function firstStepFor(title: string, tags: string[] = []): string {
  for (const [re, step] of BY_WORD) if (re.test(title)) return step
  for (const t of tags) if (BY_TAG[t]) return BY_TAG[t]!
  return 'Schrijf op wat het allereerste is dat je moet doen, en doe alleen dat.'
}

/** Zo lang mag iets liggen voordat ik een eerste stap voorstel. */
export const STUCK_TODO_DAYS = 10
export const STUCK_DOING_DAYS = 8

/** Opdrachten die blijven liggen: lang in Te doen of Bezig, zonder werkblok in je agenda. */
export function stuckAssignments(s: AppState): { a: Assignment, days: number }[] {
  const today = todayISO()
  const kind = (a: Assignment) => s.board.find(c => c.name === a.status)?.kind
  const planned = (a: Assignment) => s.tasks.some(t => t.assignmentId === a.id && !t.done && t.date && t.date >= today)
  return s.assignments
    .map(a => ({ a, days: diffDays(today, a.statusSince), k: kind(a) }))
    .filter(x => !planned(x.a) && ((x.k === 'todo' && x.days >= STUCK_TODO_DAYS) || (x.k === 'doing' && x.days >= STUCK_DOING_DAYS)))
    .sort((x, y) => y.days - x.days)
    .map(({ a, days }) => ({ a, days }))
}

/** Taken die je steeds doorschuift. */
export function stuckTasks(s: AppState): Task[] {
  return s.tasks.filter(t => !t.done && (t.moved ?? 0) >= 2 && !s.tasks.some(x => x.firstStepOf === t.id && !x.done)).sort((a, b) => (b.moved ?? 0) - (a.moved ?? 0))
}
