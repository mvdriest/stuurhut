export interface TrajectBestand {
  id: string
  userId: string
  trajectId: string
  kind: string
  naam: string
  url: string | null
  createdAt: string
}

export function useTrajectBestanden(trajectId: string) {
  const bestanden = useState<TrajectBestand[]>(`traject-bestanden-${trajectId}`, () => [])
  const pending = useState(`traject-bestanden-pending-${trajectId}`, () => false)

  async function refresh() {
    pending.value = true
    try {
      bestanden.value = await useRequestFetch()(`/api/trajecten/${trajectId}/bestanden`)
      return bestanden.value
    } finally {
      pending.value = false
    }
  }

  return { bestanden, pending, refresh }
}
