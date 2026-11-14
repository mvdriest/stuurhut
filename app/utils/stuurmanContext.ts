// Een compacte samenvatting van je data voor de AI van Stuurman. Alleen wat helpt om te antwoorden.
import type { AppState, StuurmanSuggestion } from '~/types'
import { addDays, todayISO } from './date'

const kort = (s: string | undefined, n = 160) => (s && s.length > n ? `${s.slice(0, n)}…` : s)

export function stuurmanContext(s: AppState, extra: { page: string, suggestions: StuurmanSuggestion[] }) {
  const vandaag = todayISO()
  const over7 = addDays(vandaag, 7)
  const klant = (id?: string) => (id ? s.clients.find(c => c.id === id)?.name : undefined)
  const nu = new Date()
  return {
    nu: { datum: vandaag, tijd: `${String(nu.getHours()).padStart(2, '0')}:${String(nu.getMinutes()).padStart(2, '0')}`, weekdag: nu.toLocaleDateString('nl-NL', { weekday: 'long' }), pagina: extra.page },
    werktijden: s.prefs.workHours,
    afspraken: s.events
      .filter(e => !e.cancelled && e.date >= addDays(vandaag, -1) && e.date <= over7)
      .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
      .slice(0, 40)
      .map(e => ({ datum: e.date, van: e.start, tot: e.end, titel: e.title, soort: e.domain, klant: klant(e.clientId), waar: e.location })),
    taken: s.tasks
      .filter(t => !t.done || (t.date && t.date >= addDays(vandaag, -1)))
      .slice(0, 60)
      .map(t => ({ titel: t.title, datum: t.date, start: t.start, minuten: t.durationMin, klaar: !!t.done, belangrijk: !!t.important, klant: klant(t.clientId), soort: t.domain })),
    trajecten: s.projects.map(p => ({ naam: p.name, klant: klant(p.clientId), status: p.status, volgendeStap: p.nextStep, wachtOp: p.waitingOn, wachtSinds: p.waitingSince, deadline: p.due, haltes: p.stops ? `${p.stops.done}/${p.stops.total}` : undefined })),
    klanten: s.clients.map(c => ({
      naam: c.name, contact: c.contact, status: c.status, volgendeStap: c.nextStep,
      laatsteNotities: [...c.timeline].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3).map(t => ({ datum: t.date, titel: kort(t.title, 80), tekst: kort(t.body) })),
    })),
    hoofdLeeg: s.inbox.slice(0, 20).map(i => kort(i.text, 120)),
    doelen: s.goals.map(g => ({ titel: g.title, nu: g.current, doel: g.target, periode: g.period })),
    kansen: s.opportunities.filter(o => o.status !== 'laten gaan').slice(0, 10).map(o => ({ titel: o.title, omzet: o.revenue, volgendeStap: o.nextStep, status: o.status })),
    facturenOpen: s.invoices.filter(i => !i.paid).map(i => ({ klant: klant(i.clientId), bedrag: i.amount, vervalt: i.due })),
    ritme: s.rhythm.filter(r => r.date >= addDays(vandaag, -7)).map(r => ({ datum: r.date, slaapUur: r.sleepH, opgestaan: r.woke, energie: r.energy, werkUur: r.workH, beweegMin: r.moveMin })),
    routines: s.routines.map(r => ({ naam: r.name, wanneer: r.cue, doelPerWeek: r.goal, gedaanDezeWeek: Object.entries(r.log).filter(([d, l]) => d >= addDays(vandaag, -6) && l.done).length })),
    stuurmanZiet: extra.suggestions.slice(0, 8).map(x => ({ titel: x.title, tekst: kort(x.text) })),
  }
}
