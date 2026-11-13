import type { EditorKind } from '~/types'

/** Wat je overal kunt aanmaken. */
export const CREATE_ITEMS: { kind: EditorKind, label: string, icon: string, fill: string }[] = [
  { kind: 'taak', label: 'Taak', icon: 'tabler:checkbox', fill: 'bg-cat-taak' },
  { kind: 'opdracht', label: 'Opdracht', icon: 'tabler:layout-kanban', fill: 'bg-cat-focus' },
  { kind: 'afspraak', label: 'Afspraak', icon: 'tabler:calendar-event', fill: 'bg-cat-meeting' },
  { kind: 'klant', label: 'Klant', icon: 'tabler:user-plus', fill: 'bg-cat-admin' },
  { kind: 'routine', label: 'Routine', icon: 'tabler:repeat', fill: 'bg-cat-prive' },
  { kind: 'admin', label: 'Levensadmin', icon: 'tabler:clipboard-list', fill: 'bg-cat-focus' },
]
