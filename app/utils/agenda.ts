export interface AgendaItem {
  id: string
  titel: string
  categorie: 'klantwerk' | 'eigen_werk' | 'prive'
  startMin: number | null
  duurMin: number
  contextLabel: string | null
}

export interface AgendaDag {
  datum: string
  weekdagLabel: string
  dagLabel: string
  vandaag: boolean
  items: AgendaItem[]
}
