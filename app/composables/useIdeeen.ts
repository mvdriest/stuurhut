export interface Idee {
  id: string
  userId: string
  trajectId: string | null
  titel: string
  inhoud: string | null
  createdAt: string
  updatedAt: string
}

export function useIdeeen() {
  const ideeen = useState<Idee[]>('ideeen', () => [])
  const pending = useState('ideeen-pending', () => false)

  async function refresh() {
    pending.value = true
    try {
      ideeen.value = await useRequestFetch()('/api/ideeen')
      return ideeen.value
    } finally {
      pending.value = false
    }
  }

  return { ideeen, pending, refresh }
}
