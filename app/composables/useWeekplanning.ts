export interface GeplandeTaak {
  id: string
  subtaakId: string | null
  vrijeTekst: string | null
  omschrijving: string
  trajectId: string | null
  trajectNaam: string | null
  datum: string
  blokType: 'prive' | 'zakelijk'
  startTijd: string | null
  geschatteDuur: number
  status: 'gepland' | 'bevestigd' | 'klaar'
  volgorde: number
}

export interface WeekplanningResponse {
  periode: string[]
  taken: GeplandeTaak[]
}

export function useWeekplanning() {
  const periode = useState<string[]>('weekplanning-periode', () => [])
  const taken = useState<GeplandeTaak[]>('weekplanning-taken', () => [])
  const pending = useState('weekplanning-pending', () => false)
  const genererend = useState('weekplanning-genererend', () => false)
  const herplannend = useState('weekplanning-herplannend', () => false)

  async function refresh() {
    pending.value = true
    try {
      const result = await useRequestFetch()<WeekplanningResponse>('/api/weekplanning')
      periode.value = result.periode
      taken.value = result.taken
      return result
    } finally {
      pending.value = false
    }
  }

  async function genereer() {
    genererend.value = true
    try {
      const result = await $fetch<WeekplanningResponse>('/api/weekplanning/genereer', { method: 'POST' })
      periode.value = result.periode
      taken.value = result.taken
    } finally {
      genererend.value = false
    }
  }

  async function herplan(reden: string) {
    herplannend.value = true
    try {
      const result = await $fetch<WeekplanningResponse>('/api/weekplanning/herplan', { method: 'POST', body: { reden } })
      periode.value = result.periode
      taken.value = result.taken
    } finally {
      herplannend.value = false
    }
  }

  async function bijwerken(id: string, wijziging: Partial<Pick<GeplandeTaak, 'datum' | 'blokType' | 'startTijd' | 'geschatteDuur' | 'status'>>) {
    await $fetch(`/api/weekplanning/taken/${id}`, { method: 'PATCH', body: wijziging })
    await refresh()
  }

  return { periode, taken, pending, genererend, herplannend, refresh, genereer, herplan, bijwerken }
}
