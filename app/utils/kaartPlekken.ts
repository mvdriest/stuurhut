// De "wegen" op de kaart van Utrecht. Posities zijn in procenten van het kaartbeeld
// (public/images/kaart/utrecht.webp), zodat ze kloppen bij elke zoom en schermgrootte.
// Bij een nieuw kaartbeeld alleen deze x/y bijstellen. Houd ze vrij van de linkerkolom
// (x < ~36 valt er op kleinere schermen achter) en van de "Plan je dag"-kaart rechtsonder.
//
// De plekken zijn niet willekeurig gekozen: de Dom (de klok) is de Agenda, de bergen
// zijn de Doelen (een top om te halen), het kantorendistrict zijn de Financiën.

export type KaartPlekId = 'doelen' | 'trajecten' | 'agenda' | 'todos' | 'financien' | 'aanrader'

export type KaartBestemming =
  | { soort: 'pagina', to: string }
  | { soort: 'paneel' }

export interface KaartPlek {
  id: KaartPlekId
  label: string
  icoon: string
  /** Kleur van het pin-rondje (verloop van → tot). */
  kleur: [string, string]
  x: number
  y: number
  bestemming: KaartBestemming
}

export const KAART_PLEKKEN: KaartPlek[] = [
  { id: 'todos', label: "To-do's", icoon: 'i-lucide-list-checks', kleur: ['#f2777a', '#d9427f'], x: 38, y: 64, bestemming: { soort: 'paneel' } },
  { id: 'trajecten', label: 'Trajecten', icoon: 'i-lucide-route', kleur: ['#7d93ff', '#2544d8'], x: 37, y: 35, bestemming: { soort: 'pagina', to: '/trajecten' } },
  { id: 'agenda', label: 'Agenda', icoon: 'i-lucide-calendar', kleur: ['#ffb64d', '#ea7b2b'], x: 46.5, y: 41, bestemming: { soort: 'pagina', to: '/agenda' } },
  { id: 'doelen', label: 'Doelen', icoon: 'i-lucide-target', kleur: ['#b8e05a', '#35722f'], x: 64, y: 33, bestemming: { soort: 'paneel' } },
  { id: 'financien', label: 'Financiën', icoon: 'i-lucide-wallet', kleur: ['#4fd1b5', '#1b8a73'], x: 85, y: 42, bestemming: { soort: 'paneel' } },
  { id: 'aanrader', label: 'AI Aanrader', icoon: 'i-lucide-sparkles', kleur: ['#c9a2ff', '#7a3fe0'], x: 74, y: 62, bestemming: { soort: 'paneel' } }
]
