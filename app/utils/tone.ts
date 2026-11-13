// Kleuren per thema van een Stuurman-voorstel. Zelfde pastels als de agenda.
import type { SuggestionTone } from '~/types'

export const TONES: Record<SuggestionTone, { label: string, fill: string, dot: string, icon: string }> = {
  planning: { label: 'Planning', fill: 'bg-cat-taak', dot: 'bg-cat-taak-dot', icon: 'tabler:calendar-event' },
  geld: { label: 'Geld', fill: 'bg-cat-focus', dot: 'bg-cat-focus-dot', icon: 'tabler:coin-euro' },
  kans: { label: 'Kans', fill: 'bg-cat-admin', dot: 'bg-cat-admin-dot', icon: 'tabler:bulb' },
  ritme: { label: 'Ritme', fill: 'bg-cat-prive', dot: 'bg-cat-prive-dot', icon: 'tabler:wave-sine' },
  klant: { label: 'Klant', fill: 'bg-cat-meeting', dot: 'bg-cat-meeting-dot', icon: 'tabler:users' },
}
