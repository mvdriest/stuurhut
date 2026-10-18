import type { TrajectKleur } from '~/utils/kleuren'
import type { Dienst } from '~/utils/route'

export interface Traject {
  id: string
  userId: string
  naam: string
  status: 'actief' | 'wachtend' | 'on_hold'
  eerstvolgendeActie: string | null
  kleur: TrajectKleur
  doelId: string | null
  createdAt: string
  updatedAt: string
  scope: 'zakelijk' | 'prive'
  wachtOp: string | null
  streefdatum: string | null
  bedragAfgesproken: number | null
  bedragGefactureerd: number | null
  financieelNotitie: string | null
  klantId: string | null
  contactId: string | null
  diensten: Dienst[]
}

export function useTrajecten() {
  const trajecten = useState<Traject[]>('trajecten', () => [])
  const pending = useState('trajecten-pending', () => false)

  async function refresh() {
    pending.value = true
    try {
      trajecten.value = await useRequestFetch()<Traject[]>('/api/trajecten')
      return trajecten.value
    } finally {
      pending.value = false
    }
  }

  return { trajecten, pending, refresh }
}
