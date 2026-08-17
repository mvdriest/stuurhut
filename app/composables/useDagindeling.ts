export interface DagBlok {
  id: string
  userId: string
  weekdag: number
  type: 'prive' | 'zakelijk'
  startTijd: string
  eindTijd: string
  volgorde: number
  createdAt: string
}

export interface DagBlokInvoer {
  weekdag: number
  type: 'prive' | 'zakelijk'
  startTijd: string
  eindTijd: string
}

export function useDagindeling() {
  const blokken = useState<DagBlok[]>('dagindeling-blokken', () => [])
  const pending = useState('dagindeling-pending', () => false)

  async function refresh() {
    pending.value = true
    try {
      blokken.value = await useRequestFetch()('/api/dagindeling')
      return blokken.value
    } finally {
      pending.value = false
    }
  }

  async function opslaan(nieuw: DagBlokInvoer[]) {
    blokken.value = await $fetch('/api/dagindeling', { method: 'POST', body: { blokken: nieuw } })
  }

  return { blokken, pending, refresh, opslaan }
}
