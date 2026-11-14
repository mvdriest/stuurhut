// Wanneer is een factuurtermijn aan de beurt? Gedeeld door app, Stuurman en de pushmeldingen.
import type { InvoiceTerm, Project } from '~/types'

export function termDue(p: Pick<Project, 'status' | 'stops'>, t: Pick<InvoiceTerm, 'status' | 'trigger' | 'date'>, today: string) {
  if (t.status !== 'open') return false
  if (t.trigger === 'start') return true
  if (t.trigger === 'datum') return !!t.date && t.date <= today
  return p.status === 'afgerond' || (!!p.stops?.total && p.stops.done === p.stops.total)
}
