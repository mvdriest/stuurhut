export type StalenessNiveau = 'vers' | 'traag' | 'stil'

export interface Staleness {
  dagen: number
  niveau: StalenessNiveau
  label: string
}

/**
 * Hoe lang geleden een traject voor het laatst is aangeraakt, afgeleid uit
 * `updated_at` (geen apart veld nodig). Drempels gelijk aan het Trajecten-mockup.
 */
export function staleness(updatedAt: string): Staleness {
  const ms = Date.now() - new Date(updatedAt).getTime()
  const dagen = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))

  if (dagen <= 3) {
    return { dagen, niveau: 'vers', label: dagen <= 1 ? 'gisteren aangeraakt' : `${dagen} dagen geleden aangeraakt` }
  }
  if (dagen <= 10) {
    return { dagen, niveau: 'traag', label: `${dagen} dagen niets gebeurd` }
  }
  return { dagen, niveau: 'stil', label: `${dagen} dagen stil` }
}
