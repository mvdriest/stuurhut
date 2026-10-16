import type { Doel } from '~/composables/useDoelen'

export function gehaald(doel: Doel): number {
  return doel.mijlpalen.filter(m => m.afgerond).length
}

export function voortgang(doel: Doel): number {
  if (doel.mijlpalen.length === 0) return 0
  return Math.round((gehaald(doel) / doel.mijlpalen.length) * 100)
}

/** De eerste niet-afgeronde mijlpaal, op volgorde — of null als alles gehaald is. */
export function eerstvolgendeMijlpaal(doel: Doel) {
  return [...doel.mijlpalen]
    .sort((a, b) => a.volgorde - b.volgorde)
    .find(m => !m.afgerond) ?? null
}
