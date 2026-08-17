export const TRAJECT_KLEUREN = ['groen', 'rood', 'oranje', 'blauw', 'paars', 'geel', 'roze', 'grijs'] as const

export type TrajectKleur = typeof TRAJECT_KLEUREN[number]

export const trajectKleurHex: Record<TrajectKleur, string> = {
  groen: '#35722f',
  rood: '#e03a2c',
  oranje: '#ea7b2b',
  blauw: '#2544d8',
  paars: '#5b2472',
  geel: '#f2e63e',
  roze: '#d9427f',
  grijs: '#6b6b6b'
}

/**
 * Geel is te licht voor witte tekst; die kleur krijgt inkt-tekst in plaats van wit.
 * Gebruikt door FolderTab en de traject-pill op de Vandaag-kaarten.
 */
const DONKERE_TEKST_KLEUREN = new Set<TrajectKleur>(['geel'])

export function trajectTekstKleur(kleur: TrajectKleur) {
  return DONKERE_TEKST_KLEUREN.has(kleur) ? '#1c1c1c' : '#ffffff'
}
