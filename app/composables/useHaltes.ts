import type { HalteDienst, HalteFase } from '~/utils/route'

export interface Halte {
  id: string
  userId: string
  trajectId: string
  titel: string
  dienst: HalteDienst
  fase: HalteFase
  icoon: string
  volgorde: number
  streefdatum: string | null
  afgerondOp: string | null
  createdAt: string
}

/** Alle haltes van alle trajecten; per traject filteren met `routeVan()`. */
export function useHaltes() {
  const haltes = useState<Halte[]>('haltes', () => [])

  async function refresh() {
    haltes.value = await useRequestFetch()<Halte[]>('/api/haltes')
    return haltes.value
  }

  function routeVan(trajectId: string) {
    return haltes.value.filter(h => h.trajectId === trajectId).sort((a, b) => a.volgorde - b.volgorde)
  }

  return { haltes, refresh, routeVan }
}

/** De halte waar een traject nu is: de eerste die nog niet is afgerond. */
export function huidigeHalte(route: Halte[]) {
  return route.find(h => !h.afgerondOp) ?? null
}
