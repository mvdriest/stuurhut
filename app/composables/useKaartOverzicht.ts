export interface KaartOverzicht {
  doelenActief: number
  trajectenLopend: number
  afsprakenVandaag: number
  volgendeAfspraak: { titel: string, startTijd: string } | null
  openTaken: number
  focusMinutenVandaag: number
}

export function useKaartOverzicht() {
  const overzicht = useState<KaartOverzicht | null>('kaart-overzicht', () => null)

  async function refresh() {
    overzicht.value = await useRequestFetch()<KaartOverzicht>('/api/kaart/overzicht')
    return overzicht.value
  }

  return { overzicht, refresh }
}
