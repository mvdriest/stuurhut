// Soorten in de agenda. Eén plek voor naam, icoon en kleurklassen.
import type { CalendarEvent, Task } from '~/types'

export type Category = 'meeting' | 'taak' | 'focus' | 'admin' | 'prive'

export const CATEGORIES: Record<Category, { label: string, icon: string, fill: string, dot: string }> = {
  meeting: { label: 'Meeting', icon: 'tabler:users', fill: 'bg-cat-meeting', dot: 'bg-cat-meeting-dot' },
  taak: { label: 'Taak', icon: 'tabler:checkbox', fill: 'bg-cat-taak', dot: 'bg-cat-taak-dot' },
  focus: { label: 'Uitwerken', icon: 'tabler:bulb', fill: 'bg-cat-focus', dot: 'bg-cat-focus-dot' },
  admin: { label: 'Administratie', icon: 'tabler:receipt', fill: 'bg-cat-admin', dot: 'bg-cat-admin-dot' },
  prive: { label: 'Privé', icon: 'tabler:heart', fill: 'bg-cat-prive', dot: 'bg-cat-prive-dot' },
}
export const CATEGORY_ORDER: Category[] = ['meeting', 'taak', 'focus', 'admin', 'prive']

export function categoryOfTask(t: Task): Category {
  return t.kind === 'focus' ? 'focus' : t.kind === 'admin' ? 'admin' : t.kind === 'persoonlijk' ? 'prive' : 'taak'
}
export function categoryOf(item: { type: 'event' | 'task', ref: CalendarEvent | Task }): Category {
  if (item.type === 'event') return (item.ref as CalendarEvent).domain === 'prive' ? 'prive' : 'meeting'
  return categoryOfTask(item.ref as Task)
}
