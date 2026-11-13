// Verzonnen klanten en projecten. Geen echte personen of bedrijven.
import type { Client, Project } from '~/types'
import { addDays, todayISO } from '~/utils/date'

export function seedClients(): Client[] {
  const t = todayISO()
  const ago = (n: number) => addDays(t, -n)

  return [
    {
      id: 'korenaar',
      name: 'Bakkerij De Korenaar',
      contact: 'Henk Brouwer',
      sector: 'Ambachtelijke bakkerij',
      status: 'lopend',
      tint: 'copper',
      nextStep: 'Teksten voor de nieuwe menukaart aanleveren',
      nextStepDurationMin: 45,
      commitments: [
        { id: 'c1', text: 'Bestelpagina vóór de kerstdrukte live', done: false },
        { id: 'c2', text: 'Foto’s van de nieuwe broden verwerken', done: false },
        { id: 'c3', text: 'Openingstijden aanpassen op de site', done: true },
      ],
      timeline: [
        { id: 'k1', kind: 'meeting', date: ago(2), title: 'Menukaart doorgelopen', body: 'Henk wil minder tekst en grotere foto’s. De kerstbroden krijgen een eigen blok.' },
        { id: 'k2', kind: 'mail', date: ago(6), title: 'Foto’s volgen deze week', body: 'De fotograaf komt donderdag langs in de bakkerij.' },
        { id: 'k3', kind: 'notitie', date: ago(13), title: 'Bestellen vooraf werkt', body: 'Zaterdagochtend zijn er 38 bestellingen via de site binnengekomen.' },
        { id: 'k4', kind: 'mail', date: ago(24), title: 'Factuur september betaald' },
      ],
    },
    {
      id: 'noordlicht',
      name: 'Studio Noordlicht',
      contact: 'Sanne Vermeer',
      sector: 'Fotostudio',
      status: 'lead',
      tint: 'sea',
      nextStep: 'Offerte huisstijl en website versturen',
      nextStepDurationMin: 90,
      commitments: [
        { id: 'c1', text: 'Offerte deze week versturen', done: false },
        { id: 'c2', text: 'Twee voorbeelden van portfoliosites delen', done: true },
      ],
      timeline: [
        { id: 'n1', kind: 'meeting', date: ago(3), title: 'Kennismaking in de studio', body: 'Ze zoeken een rustige site waar het werk voorop staat. Budget rond de € 6.000.' },
        { id: 'n2', kind: 'mail', date: ago(1), title: 'Vraag over fotografie', body: 'Kan de fotograaf van de studio ook in de offerte, als partner?' },
        { id: 'n3', kind: 'notitie', date: ago(3), title: 'Klik was goed', body: 'Ze wil in januari live. Dat is haalbaar als de offerte nu de deur uitgaat.' },
      ],
    },
    {
      id: 'plein',
      name: 'Fysio Het Plein',
      contact: 'Ruben Smit',
      sector: 'Fysiotherapie',
      status: 'lead',
      tint: 'green',
      nextStep: 'Content voor de nieuwe website verzamelen',
      nextStepDurationMin: 60,
      commitments: [
        { id: 'c1', text: 'Demo van online afspraken maken', done: false },
      ],
      timeline: [
        { id: 'p1', kind: 'meeting', date: ago(9), title: 'Eerste gesprek', body: 'Patiënten bellen nu voor elke afspraak. Ze willen eenvoudig online laten reserveren.' },
        { id: 'p2', kind: 'mail', date: ago(5), title: 'Wensenlijst ontvangen', body: 'Drie behandelaars, vaste tijdsloten, herinnering per sms.' },
        { id: 'p3', kind: 'notitie', date: ago(4), title: 'Lijkt op de camping-vraag', body: 'Weer een vraag naar simpel reserveren zonder duur pakket.' },
      ],
    },
    {
      id: 'vandijk',
      name: 'Van Dijk Installatie',
      contact: 'Marco van Dijk',
      sector: 'Installatiebedrijf',
      status: 'lopend',
      tint: 'sand',
      nextStep: 'Plan van aanpak voor fase 2 schrijven',
      nextStepDurationMin: 60,
      commitments: [
        { id: 'c1', text: 'Oplevering klantportaal deze week', done: false },
        { id: 'c2', text: 'Garantievoorwaarden in de oplevering meenemen', done: false },
        { id: 'c3', text: 'Handleiding voor de monteurs', done: true },
      ],
      timeline: [
        { id: 'v1', kind: 'meeting', date: ago(7), title: 'Tussentijdse demo portaal', body: 'Monteurs zijn blij met de storingslijst. Wens: foto bij elke melding.' },
        { id: 'v2', kind: 'mail', date: ago(12), title: 'Herinnering factuur', body: 'Factuur F-2026-041 staat nog open, Marco kijkt ernaar.' },
        { id: 'v3', kind: 'notitie', date: ago(15), title: 'Fase 2 in de lucht', body: 'Planning koppelen aan het portaal, mogelijk in het voorjaar.' },
        { id: 'v4', kind: 'mail', date: ago(26), title: 'Akkoord op meerwerk', body: 'Twee extra dagen voor de import van oude meldingen.' },
        { id: 'v5', kind: 'meeting', date: ago(40), title: 'Start project' },
      ],
    },
    {
      id: 'mira',
      name: 'Atelier Mira',
      contact: 'Mira Jansen',
      sector: 'Keramiekatelier',
      status: 'afgerond',
      tint: 'copper',
      nextStep: 'Over een maand even vragen hoe de workshopagenda loopt',
      nextStepDurationMin: 15,
      commitments: [
        { id: 'c1', text: 'Laatste factuur versturen', done: true },
      ],
      timeline: [
        { id: 'm1', kind: 'meeting', date: ago(1), title: 'Afronding workshopagenda', body: 'Alles staat. Mira vroeg of mensen ook direct een plek kunnen reserveren en betalen.' },
        { id: 'm2', kind: 'mail', date: ago(8), title: 'Bedankt voor de fijne samenwerking' },
        { id: 'm3', kind: 'notitie', date: ago(8), title: 'Reserveren komt weer terug', body: 'Derde keer deze maand dat iemand hiernaar vraagt.' },
      ],
    },
    {
      id: 'camping',
      name: 'Camping Aan de Rijn',
      contact: 'Ellen de Boer',
      sector: 'Kleine camping',
      status: 'lopend',
      tint: 'green',
      nextStep: 'Foto’s van de velden selecteren voor de homepage',
      nextStepDurationMin: 45,
      commitments: [
        { id: 'c1', text: 'Nieuwe website vóór 1 maart live', done: false },
        { id: 'c2', text: 'Uitzoeken wat reserveren zou kosten', done: false },
      ],
      timeline: [
        { id: 'r1', kind: 'meeting', date: ago(4), title: 'Workshop indeling site', body: 'Ellen wil dat gasten zelf een plek kunnen kiezen. Nu gaat alles via mail.' },
        { id: 'r2', kind: 'mail', date: ago(11), title: 'Aanbetaling ontvangen' },
        { id: 'r3', kind: 'notitie', date: ago(4), title: 'Reserveren is de kern', body: 'Veertig plekken, seizoen april tot oktober. Grote pakketten zijn te duur voor hen.' },
        { id: 'r4', kind: 'mail', date: ago(18), title: 'Foto’s van de velden', body: 'Een map met 120 foto’s, de mooiste moeten op de homepage.' },
      ],
    },
  ]
}

export function seedProjects(): Project[] {
  return [
    { id: 'pr-korenaar', clientId: 'korenaar', name: 'Menukaart en bestelpagina', status: 'lopend', progress: 0.6, budget: 9500, hourlyRate: 85, billedHours: 90 },
    { id: 'pr-noordlicht', clientId: 'noordlicht', name: 'Huisstijl en website', status: 'lead', progress: 0.1, budget: 6000, hourlyRate: 85, billedHours: 0 },
    { id: 'pr-vandijk', clientId: 'vandijk', name: 'Klantportaal storingen', status: 'lopend', progress: 0.85, budget: 14450, hourlyRate: 85, billedHours: 170 },
    { id: 'pr-mira', clientId: 'mira', name: 'Workshopagenda', status: 'afgerond', progress: 1, budget: 6460, hourlyRate: 85, billedHours: 76 },
    { id: 'pr-camping', clientId: 'camping', name: 'Nieuwe website', status: 'lopend', progress: 0.35, budget: 15000, hourlyRate: 90, billedHours: 100 },
  ]
}
