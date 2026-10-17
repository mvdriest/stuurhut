export interface Contact {
  id: string
  userId: string
  klantId: string | null
  naam: string
  email: string | null
  telefoon: string | null
  rol: string | null
  voorkeur: string | null
  notities: string | null
  createdAt: string
  updatedAt: string
}

export interface Klant {
  id: string
  userId: string
  naam: string
  domeinen: string[]
  website: string | null
  adres: string | null
  kvk: string | null
  btw: string | null
  notities: string | null
  createdAt: string
  updatedAt: string
  contacten: Contact[]
}

export function useKlanten() {
  const klanten = useState<Klant[]>('klanten', () => [])
  const losseContacten = useState<Contact[]>('losse-contacten', () => [])

  async function refresh() {
    const data = await useRequestFetch()<{ klanten: Klant[], losseContacten: Contact[] }>('/api/klanten')
    klanten.value = data.klanten
    losseContacten.value = data.losseContacten
    return klanten.value
  }

  const contacten = computed(() => [...klanten.value.flatMap(k => k.contacten), ...losseContacten.value])

  function klantVan(id: string | null | undefined) {
    return id ? klanten.value.find(k => k.id === id) ?? null : null
  }

  function contactVan(id: string | null | undefined) {
    return id ? contacten.value.find(c => c.id === id) ?? null : null
  }

  return { klanten, losseContacten, contacten, refresh, klantVan, contactVan }
}
