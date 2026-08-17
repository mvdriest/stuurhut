export interface Taak {
  id: string
  userId: string
  trajectId: string | null
  tekst: string
  geschatteDuur: number
  status: 'to_do' | 'bezig' | 'review' | 'klaar'
  volgorde: number
  createdAt: string
}

export function useTaken() {
  const taken = useState<Taak[]>('taken', () => [])
  const pending = useState('taken-pending', () => false)

  async function refresh() {
    pending.value = true
    try {
      taken.value = await useRequestFetch()('/api/taken')
      return taken.value
    } finally {
      pending.value = false
    }
  }

  return { taken, pending, refresh }
}
