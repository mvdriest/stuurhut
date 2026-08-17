export interface VandaagPrioriteit {
  id: string
  userId: string
  tekst: string
  klaar: boolean
  datum: string
  volgorde: number
  createdAt: string
}

export function useVandaag() {
  const items = useState<VandaagPrioriteit[]>('vandaag-prioriteiten', () => [])
  const pending = useState('vandaag-pending', () => false)

  async function refresh() {
    pending.value = true
    try {
      items.value = await useRequestFetch()('/api/vandaag')
      return items.value
    } finally {
      pending.value = false
    }
  }

  return { items, pending, refresh }
}
