import type { Traject } from '~/composables/useTrajecten'

export interface TrajectGroepen {
  jijAanZet: Traject[]
  wachtOpAnderen: Traject[]
}

/**
 * "Jij bent aan zet" vs. "Wacht op iemand anders" — afgeleid uit de bestaande
 * status-kolom (er is geen "afgerond"-status in het schema, dus alle trajecten vallen
 * in een van de twee groepen).
 */
export function groepeerTrajecten(trajecten: Traject[]): TrajectGroepen {
  return {
    jijAanZet: trajecten.filter(t => t.status !== 'wachtend'),
    wachtOpAnderen: trajecten.filter(t => t.status === 'wachtend')
  }
}
