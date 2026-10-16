import type { Traject } from '~/composables/useTrajecten'

export const TRAJECT_STATUS_STYLES: Record<Traject['status'], { label: string, color: 'success' | 'warning' | 'neutral' }> = {
  actief: { label: 'Actief', color: 'success' },
  wachtend: { label: 'Wachtend', color: 'warning' },
  on_hold: { label: 'On hold', color: 'neutral' }
}
