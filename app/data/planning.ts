// Afspraken, taken en Hoofd leeg-items. Dag 0 is vandaag, dan de eerstvolgende werkdagen.
// Dag 1 is opvallend vol, dag 3 is rustig, op dag 2 vervalt een afspraak (de "verschuiving").
import type { CalendarEvent, InboxItem, Task } from '~/types'
import { planDays } from '~/utils/date'

export function seedEvents(): CalendarEvent[] {
  const [d0, d1, d2, d3, d4] = planDays(5)
  return [
    { id: 'e1', title: 'Weekstart met Atelier Mira', date: d0!, start: '09:30', end: '10:15', clientId: 'mira', location: 'Videobellen' },
    { id: 'e2', title: 'Menukaart doorlopen', date: d0!, start: '11:00', end: '12:00', clientId: 'korenaar', location: 'In de bakkerij' },
    { id: 'e3', title: 'Workshop indeling site', date: d1!, start: '09:00', end: '10:30', clientId: 'camping', location: 'Op de camping' },
    { id: 'e4', title: 'Demo online afspraken', date: d1!, start: '11:00', end: '12:00', clientId: 'plein' },
    { id: 'e5', title: 'Oplevering klantportaal', date: d1!, start: '14:00', end: '15:30', clientId: 'vandijk', location: 'Werkplaats Van Dijk' },
    { id: 'e6', title: 'Feedback huisstijl', date: d2!, start: '10:00', end: '11:00', clientId: 'noordlicht', location: 'Studio Noordlicht' },
    { id: 'e7', title: 'Wensen doorlopen met Ruben', date: d2!, start: '14:00', end: '15:30', clientId: 'plein', cancelled: true, cancelNote: 'Ruben heeft afgezegd en stelt volgende week voor.' },
    { id: 'e8', title: 'Belafspraak reserveren', date: d4!, start: '10:00', end: '11:00', clientId: 'camping' },
    // Privé
    { id: 'e9', title: 'Etentje met Lotte en Sem', date: d1!, start: '19:00', end: '21:00', location: 'Thuis', domain: 'prive' },
    { id: 'e10', title: 'Padel met Thijs', date: d3!, start: '18:30', end: '19:30', domain: 'prive' },
    { id: 'e11', title: 'Ouders bellen', date: d0!, start: '19:30', end: '20:00', domain: 'prive' },
  ]
}

export function seedTasks(): Task[] {
  const [d0, d1, d2, d3, d4] = planDays(5)
  return [
    // Vandaag
    { id: 't2', title: 'Teksten menukaart aanleveren', durationMin: 45, date: d0, start: '15:30', kind: 'taak', clientId: 'korenaar', important: true },
    { id: 't3', title: 'Factuur Atelier Mira versturen', durationMin: 20, date: d0, start: '16:30', kind: 'admin', clientId: 'mira', important: true },
    // Volle dag
    { id: 't7', title: 'Plan van aanpak fase 2', durationMin: 60, date: d1, start: '12:30', kind: 'taak', clientId: 'vandijk', deep: true },
    { id: 't8', title: 'Foto’s camping selecteren', durationMin: 45, date: d1, start: '16:00', kind: 'taak', clientId: 'camping' },
    { id: 't13', title: 'Mails wegwerken', durationMin: 30, date: d1, start: '08:15', kind: 'admin' },
    // Dag met verschuiving
    // Werk dat in de avond kruipt
    { id: 't15', title: 'Offerte Korenaar nalezen', durationMin: 30, date: d2, start: '19:30', kind: 'taak', clientId: 'korenaar' },
    { id: 't12', title: 'Huisstijl Noordlicht verwerken', durationMin: 90, date: d2, start: '11:15', kind: 'taak', clientId: 'noordlicht', deep: true },
    // Rustige dag
    { id: 't10', title: 'Wandeling na de lunch', durationMin: 30, date: d3, start: '13:00', kind: 'persoonlijk' },
    // Laatste dag
    { id: 't11', title: 'Week afsluiten en vooruitkijken', durationMin: 45, date: d4, start: '15:30', kind: 'admin' },
    { id: 't14', title: 'Btw-aangifte voorbereiden', durationMin: 60, date: d4, start: '13:00', kind: 'admin', moved: 3 },
    // Nog niet ingepland
    { id: 't1', title: 'Offerte Studio Noordlicht afronden', durationMin: 90, kind: 'taak', clientId: 'noordlicht', important: true, deep: true },
    { id: 't5', title: 'Reserveringsmodule: eerste schets', durationMin: 120, kind: 'focus', opportunityId: 'o1', deep: true },
    { id: 't9', title: 'Content website Fysio verzamelen', durationMin: 60, kind: 'taak', clientId: 'plein' },
    { id: 't4', title: 'Auto aanmelden voor de APK', durationMin: 15, kind: 'persoonlijk' },
    { id: 't6', title: 'Offertesjabloon opfrissen', durationMin: 45, kind: 'admin' },
  ]
}

export function seedInbox(): InboxItem[] {
  const texts = [
    'Nieuwe klant: Bakkerij Zoet, contact Anna de Wit',
    'Offerte Studio Noordlicht nog versturen',
    'Idee: reserveringsmodule voor kleine campings',
    'Tandarts bellen',
    'Volgende week eerlijk plannen',
    'Noordlicht wil de fotograaf als partner in de offerte',
    'Korenaar: zijn de foto’s van de nieuwe broden al binnen?',
    'Misschien een vaste onderhoudsprijs per maand aanbieden',
    'Abonnement fotobank opzeggen, gebruik ik niet',
    'Van Dijk: garantievoorwaarden meenemen in de oplevering',
    'Cadeau voor Lotte regelen, verjaardag zaterdag',
    'Boek over prijzen terugbrengen naar de bieb',
    'Oude screenshots van het bureaublad opruimen',
  ]
  const now = Date.now()
  return texts.map((text, i) => ({ id: `i${i + 1}`, text, createdAt: new Date(now - i * 3_600_000 * 5).toISOString() }))
}
