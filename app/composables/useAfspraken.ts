export interface Afspraak {
  id: string
  userId: string
  titel: string
  categorie: 'klantwerk' | 'eigen_werk' | 'prive'
  trajectId: string | null
  datum: string
  startTijd: string
  eindTijd: string
  createdAt: string
}

export function useAfspraken() {
  const afspraken = useState<Afspraak[]>('afspraken', () => [])
  const pending = useState('afspraken-pending', () => false)

  async function refresh() {
    pending.value = true
    try {
      afspraken.value = await useRequestFetch()('/api/afspraken')
      return afspraken.value
    } finally {
      pending.value = false
    }
  }

  return { afspraken, pending, refresh }
}
