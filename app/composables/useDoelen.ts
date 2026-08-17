export interface DoelMijlpaal {
  id: string
  userId: string
  doelId: string
  titel: string
  beloning: string | null
  afgerond: boolean
  volgorde: number
  createdAt: string
  updatedAt: string
}

export interface Doel {
  id: string
  userId: string
  titel: string
  omschrijving: string | null
  deadline: string | null
  status: 'actief' | 'afgerond'
  volgorde: number
  createdAt: string
  updatedAt: string
  mijlpalen: DoelMijlpaal[]
}

export function useDoelen() {
  const doelen = useState<Doel[]>('doelen', () => [])
  const pending = useState('doelen-pending', () => false)

  async function refresh() {
    pending.value = true
    try {
      doelen.value = await useRequestFetch()('/api/doelen')
      return doelen.value
    } finally {
      pending.value = false
    }
  }

  return { doelen, pending, refresh }
}
