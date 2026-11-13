// De reis van een klant: elk zakelijk traject krijgt een route van haltes. De route
// hangt af van welke diensten er zijn afgenomen — een los fotoproject loopt anders dan
// een pakket van branding + website + video. Een route wordt één keer uit deze
// sjablonen samengesteld en is daarna vrij aan te passen per traject (haltes
// hernoemen, weghalen, toevoegen); de sjablonen zijn alleen het startpunt.

export const DIENSTEN = ['branding', 'website', 'video', 'foto'] as const
export type Dienst = typeof DIENSTEN[number]
export type HalteDienst = Dienst | 'algemeen'
export type HalteFase = 'verkennen' | 'uitvoeren' | 'afronden'

export const DIENST_INFO: Record<HalteDienst, { label: string, icoon: string, kleur: [string, string] }> = {
  algemeen: { label: 'Algemeen', icoon: 'i-lucide-route', kleur: ['#7d93ff', '#2544d8'] },
  branding: { label: 'Branding', icoon: 'i-lucide-palette', kleur: ['#c9a2ff', '#7a3fe0'] },
  website: { label: 'Website', icoon: 'i-lucide-monitor', kleur: ['#6fc3ff', '#1f6fd1'] },
  video: { label: 'Video', icoon: 'i-lucide-clapperboard', kleur: ['#f2777a', '#d9427f'] },
  foto: { label: 'Foto', icoon: 'i-lucide-camera', kleur: ['#ffb64d', '#ea7b2b'] }
}

export const FASE_LABELS: Record<HalteFase, string> = {
  verkennen: 'Verkennen',
  uitvoeren: 'Onderweg',
  afronden: 'Afronden'
}

export interface HalteSjabloon {
  titel: string
  dienst: HalteDienst
  fase: HalteFase
  icoon: string
}

const START: HalteSjabloon[] = [
  { titel: 'Eerste contact', dienst: 'algemeen', fase: 'verkennen', icoon: 'i-lucide-sparkle' },
  { titel: 'Kennismaking', dienst: 'algemeen', fase: 'verkennen', icoon: 'i-lucide-coffee' },
  { titel: 'Voorstel', dienst: 'algemeen', fase: 'verkennen', icoon: 'i-lucide-file-text' },
  { titel: 'Akkoord', dienst: 'algemeen', fase: 'verkennen', icoon: 'i-lucide-handshake' }
]

const EIND: HalteSjabloon[] = [
  { titel: 'Oplevering', dienst: 'algemeen', fase: 'afronden', icoon: 'i-lucide-package-check' },
  { titel: 'Nazorg', dienst: 'algemeen', fase: 'afronden', icoon: 'i-lucide-mountain' }
]

/** De haltes die bij één dienst horen, in volgorde. Video en foto delen hun voorbereiding en shootdag. */
export function haltesVoorDiensten(diensten: readonly Dienst[]): HalteSjabloon[] {
  const heeft = (d: Dienst) => diensten.includes(d)
  const haltes: HalteSjabloon[] = []

  // Branding eerst: website en content bouwen voort op de huisstijl.
  if (heeft('branding')) {
    haltes.push(
      { titel: 'Strategie', dienst: 'branding', fase: 'uitvoeren', icoon: 'i-lucide-compass' },
      { titel: 'Concept', dienst: 'branding', fase: 'uitvoeren', icoon: 'i-lucide-lightbulb' },
      { titel: 'Huisstijl', dienst: 'branding', fase: 'uitvoeren', icoon: 'i-lucide-palette' }
    )
  }

  const video = heeft('video')
  const foto = heeft('foto')
  if (video || foto) {
    const dienst: Dienst = video ? 'video' : 'foto'
    haltes.push(
      { titel: 'Pre-productie', dienst, fase: 'uitvoeren', icoon: 'i-lucide-clipboard-list' },
      { titel: video && foto ? 'Shootdag' : video ? 'Opnames' : 'Fotoshoot', dienst, fase: 'uitvoeren', icoon: video ? 'i-lucide-clapperboard' : 'i-lucide-camera' }
    )
    if (video) haltes.push({ titel: 'Montage', dienst: 'video', fase: 'uitvoeren', icoon: 'i-lucide-film' })
    if (foto) haltes.push({ titel: 'Selectie & retouche', dienst: 'foto', fase: 'uitvoeren', icoon: 'i-lucide-image' })
  }

  // Website als laatste: daar komen huisstijl én beeld samen.
  if (heeft('website')) {
    haltes.push(
      { titel: 'Ontwerp', dienst: 'website', fase: 'uitvoeren', icoon: 'i-lucide-pen-tool' },
      { titel: 'Bouw', dienst: 'website', fase: 'uitvoeren', icoon: 'i-lucide-code' },
      { titel: 'Livegang', dienst: 'website', fase: 'uitvoeren', icoon: 'i-lucide-rocket' }
    )
  }

  return haltes
}

export function routeSjabloon(diensten: readonly Dienst[]): HalteSjabloon[] {
  return [...START, ...haltesVoorDiensten(diensten), ...EIND]
}

/** Iconen om uit te kiezen bij een eigen halte. */
export const HALTE_ICONEN = [
  'i-lucide-flag', 'i-lucide-sparkle', 'i-lucide-coffee', 'i-lucide-file-text', 'i-lucide-handshake',
  'i-lucide-compass', 'i-lucide-lightbulb', 'i-lucide-palette', 'i-lucide-pen-tool', 'i-lucide-code',
  'i-lucide-rocket', 'i-lucide-clipboard-list', 'i-lucide-camera', 'i-lucide-clapperboard', 'i-lucide-film',
  'i-lucide-image', 'i-lucide-message-circle', 'i-lucide-receipt', 'i-lucide-package-check', 'i-lucide-mountain'
] as const
