// Privé en zakelijk: één label per ding, met verstandige standaarden.
import type { CalendarEvent, Domain, Routine, Task } from '~/types'

export const DOMAINS: Record<Domain, { label: string, icon: string, dot: string, chip: string }> = {
  zakelijk: { label: 'Zakelijk', icon: 'tabler:briefcase', dot: 'bg-sea', chip: 'bg-sea-soft text-sea-ink' },
  prive: { label: 'Privé', icon: 'tabler:heart', dot: 'bg-cat-prive-dot', chip: 'bg-cat-prive text-cat-ink' },
}

export const domainOfTask = (t: Pick<Task, 'domain' | 'kind'>): Domain => t.domain ?? (t.kind === 'persoonlijk' ? 'prive' : 'zakelijk')
export const domainOfEvent = (e: Pick<CalendarEvent, 'domain'>): Domain => e.domain ?? 'zakelijk'
export const domainOfRoutine = (r: Pick<Routine, 'domain'>): Domain => r.domain ?? 'prive'
export function domainOf(i: { type: 'event' | 'task', ref: CalendarEvent | Task }): Domain {
  return i.type === 'event' ? domainOfEvent(i.ref as CalendarEvent) : domainOfTask(i.ref as Task)
}
/** Raad bij vrije tekst (Hoofd leeg). */
export function guessDomain(text: string): Domain {
  return /tandarts|huisarts|cadeau|verjaardag|bieb|apk|boodschappen|vakantie|ouders|moeder|vader|vrienden|sporten|padel|etentje|feest|lotte|sem|thijs/i.test(text) ? 'prive' : 'zakelijk'
}
