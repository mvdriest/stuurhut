// ============================================================
//  STUURMAN (mock)
//  Hier komt later de echte AI. Nu: vaste, voorgeprogrammeerde
//  voorstellen per pagina, gevoed met de huidige state zodat
//  ze kloppen met wat je ziet. De UI praat alleen met
//  useStuurman(), dus deze file kan straks vervangen worden.
// ============================================================
import type { AppState, ChatMessage, Destination, EditorRequest, SuggestionTone, GapOption, ISODate, PageKey, StuurmanQuestion, StuurmanSuggestion, Task, Time } from '~/types'
import { addDays, diffDays, fromISO, planDays, relDay, todayISO, weekdayLong, weekdayShort } from './date'
import { dec1, duration, euroRound } from './format'
import { domainOfTask, guessDomain } from './domain'
import { firstStepFor, stuckAssignments, stuckTasks } from './firststep'
import { anchorTime, clock, clockMin, isWeekend, minText, weekendLatest } from './sleep'

const LIFE_ICON: Record<string, string> = { auto: 'tabler:car', gezondheid: 'tabler:heart', verzekering: 'tabler:shield', abonnement: 'tabler:repeat', documenten: 'tabler:id', huis: 'tabler:home-2' }
const addMin = (t: string, m: number) => { const v = Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) + m; return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}` }

export interface Slot { date: ISODate, start: Time }

export interface StuurmanContext {
  state: AppState
  slot: (dur: number, opts?: { deep?: boolean, preferMorning?: boolean, domain?: 'zakelijk' | 'prive' }) => Slot | null
  load: (date: ISODate) => { level: 'rustig' | 'normaal' | 'vol', minutes: number }
  clientName: (id?: string) => string
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const when = (s: Slot) => `${relDay(s.date)} om ${s.start}`

// ---------- Groet en daglijn ----------
export function greeting(hour = new Date().getHours()) {
  if (hour < 6) return 'Goedenacht'
  if (hour < 12) return 'Goedemorgen'
  if (hour < 18) return 'Goedemiddag'
  return 'Goedenavond'
}

export function dayLine(ctx: StuurmanContext): string {
  const [d0, d1] = planDays(2)
  const today = ctx.load(d0!)
  const tomorrow = ctx.load(d1!)
  const events = ctx.state.events.filter(e => e.date === d0 && !e.cancelled).length
  const base = today.level === 'rustig'
    ? 'Een rustige dag vandaag.'
    : today.level === 'vol'
      ? 'Een volle dag vandaag, dus ik houd het kort.'
      : `Een gewone dag met ${events === 1 ? 'één afspraak' : `${events} afspraken`}.`
  const offerte = ctx.state.tasks.find(t => t.id === 't1')
  const offerteSlot = offerte && !offerte.date ? ctx.slot(offerte.durationMin, { deep: true }) : null
  if (tomorrow.level === 'vol' && offerteSlot?.date === d0) {
    return `${base} ${cap(relDay(d1!))} wordt het vol, dus vandaag is een goed moment voor de offerte van Studio Noordlicht.`
  }
  if (tomorrow.level === 'vol') return `${base} ${cap(relDay(d1!))} wordt het vol. Houd vanavond gerust vrij.`
  return `${base} Er is ruimte, en niets wat brandt.`
}

// ---------- Hoofd leeg: bestemming voorstellen ----------
export interface InboxAdvice {
  destination: Destination
  clientId?: string
  durationMin: number
  kind: Task['kind']
  why: string
  /** Pas later deze week inplannen */
  later?: boolean
}

export function adviseInbox(text: string, ctx: StuurmanContext, matchClient: (t: string) => { id: string } | undefined): InboxAdvice {
  const t = text.toLowerCase()
  const client = matchClient(text)
  const personal = /tandarts|cadeau|verjaardag|bieb|apk|huisarts|boodschappen/.test(t)

  if (/opruimen|screenshots|ooit eens/.test(t)) {
    return { destination: 'weg', durationMin: 0, kind: 'taak', why: 'Dit hoeft niet op je lijst. Weggooien lucht meer op dan bewaren.' }
  }
  if (client && /^offerte/.test(t) && ctx.state.tasks.some(x => x.clientId === client.id && /offerte/i.test(x.title) && !x.done)) {
    return { destination: 'weg', clientId: client.id, durationMin: 0, kind: 'taak', why: 'Staat al als taak in je planning. Dubbel bewaren hoeft niet.' }
  }
  if (/^idee|misschien|aanbieden|pakket|abonnement voor/.test(t)) {
    return { destination: 'kans', clientId: client?.id, durationMin: 0, kind: 'focus', why: 'Klinkt als iets dat geld kan opleveren. Bij Kansen kan het rustig rijpen.' }
  }
  if (/bellen|versturen|plannen|regelen|opzeggen|terugbrengen|maken|sturen|aanmelden/.test(t) || personal) {
    const durationMin = /bellen|opzeggen|aanmelden/.test(t) ? 15 : /plannen/.test(t) ? 30 : /versturen/.test(t) ? 45 : 20
    return {
      destination: 'inplannen',
      clientId: client?.id,
      durationMin,
      later: /volgende week|later/.test(t),
      kind: personal ? 'persoonlijk' : /opzeggen|plannen/.test(t) ? 'admin' : 'taak',
      why: personal ? 'Klein en persoonlijk. Ik zet het op een rustig moment, dan is het gewoon gedaan.' : 'Dit is een taak met een duidelijke volgende stap. Ik zoek een plek die past.',
    }
  }
  if (client) {
    return { destination: 'klant', clientId: client.id, durationMin: 0, kind: 'taak', why: `Hoort bij ${ctx.clientName(client.id)}. In de tijdlijn vind je het terug bij het volgende gesprek.` }
  }
  return { destination: 'inplannen', durationMin: 30, kind: 'taak', why: 'Ik zie geen klant of kans hierin, dus ik geef het een plek in je week.' }
}

// ---------- Voorstellen per pagina ----------
type Draft = Omit<StuurmanSuggestion, 'title' | 'icon' | 'tone'> & Partial<Pick<StuurmanSuggestion, 'title' | 'icon' | 'meta' | 'tone'>>

const TITLES: [RegExp, string][] = [
  [/^offerte-noordlicht/, 'Offerte Noordlicht inplannen'],
  [/^factuur-vandijk/, 'Herinnering factuur Van Dijk'],
  [/^inbox-klanten/, 'Klantitems in één keer sorteren'],
  [/^schets-reservering/, 'Schets reserveringsmodule'],
  [/^gat-/, 'Vrijgekomen tijd vullen'],
  [/^patroon-reserveren/, 'Patroon: online reserveren'],
  [/^fysio-content/, 'Content Fysio verzamelen'],
  [/^kans-uitwerken/, 'Uitwerktijd reserveringssysteem'],
  [/^kans-loslaten/, 'Fotografie-kans loslaten'],
  [/^onderhoud-abonnement/, 'Onderhoudsabonnement als kans'],
  [/^fotobank-opzeggen/, 'Fotobank opzeggen'],
  [/^ochtend-focus/, 'Denkwerk in de ochtend'],
  [/^vrije-middag/, 'Middag voor jezelf'],
  [/^routine-wandelblok/, 'Wandelblok in je week'],
  [/^routine-herinnering/, 'Herinnering om 22:15'],
  [/^routine-afsluiten/, 'Weekafsluiting inplannen'],
]
const ICONS: Record<string, string> = {
  scheduleTask: 'tabler:calendar-event', addTask: 'tabler:calendar-event', addRoutineBlocks: 'tabler:walk', fillGap: 'tabler:calendar-event',
  planInvoiceReminder: 'tabler:receipt', createOpportunity: 'tabler:bulb', planOpportunity: 'tabler:bulb', setOpportunityStatus: 'tabler:bulb',
  setMorningFocus: 'tabler:sun', moveOutsideWork: 'tabler:moon', markSetAside: 'tabler:pig-money', setReminder: 'tabler:clock', sortInbox: 'tabler:inbox', navigate: 'tabler:arrow-right', none: 'tabler:info-circle',
}
function toneOf(d: Draft): SuggestionTone {
  const t = d.action.type
  if (/^(routine-|ochtend-focus|vrije-middag)/.test(d.id) || t === 'setMorningFocus' || t === 'setReminder' || t === 'addRoutineBlocks') return 'ritme'
  if (/^(factuur|fotobank|onderhoud)/.test(d.id) || t === 'planInvoiceReminder') return 'geld'
  if (/^(kans|patroon|schets)/.test(d.id) || t === 'planOpportunity' || t === 'setOpportunityStatus' || t === 'createOpportunity') return 'kans'
  if (/^(inbox|fysio)/.test(d.id) || t === 'sortInbox') return 'klant'
  return 'planning'
}
export function decorate(d: Draft): StuurmanSuggestion {
  const a = d.action as { type: string, date?: string, start?: string }
  const meta = d.meta ?? (a.date && a.start ? `${weekdayShort(a.date)} ${a.start}` : undefined)
  return { ...d, title: d.title ?? TITLES.find(([re]) => re.test(d.id))?.[1] ?? 'Voorstel', icon: d.icon ?? ICONS[a.type] ?? 'tabler:steering-wheel', tone: d.tone ?? toneOf(d), meta }
}

export function buildSuggestions(ctx: StuurmanContext): StuurmanSuggestion[] {
  const s = ctx.state
  const out: Draft[] = []
  const task = (id: string) => s.tasks.find(t => t.id === id)
  const days = planDays(5)

  // Offerte Noordlicht
  const offerte = task('t1')
  if (offerte && !offerte.date) {
    const slot = ctx.slot(offerte.durationMin, { deep: true })
    if (slot) {
      out.push({
        id: 'offerte-noordlicht',
        pages: ['thuis', 'week', 'klanten'],
        text: `${cap(when(slot))} heb je anderhalf uur vrij. Zal ik de offerte voor Studio Noordlicht daar neerzetten?`,
        why: 'Sanne wil in januari live, en later deze week is er weinig ruimte voor denkwerk.',
        acceptLabel: 'Zet erin',
        action: { type: 'scheduleTask', taskId: 't1', date: slot.date, start: slot.start },
      })
    }
  }

  // Factuur Van Dijk
  const f1 = s.invoices.find(i => i.id === 'f1')
  if (f1 && !f1.paid && !f1.reminderPlanned) {
    const late = diffDays(todayISO(), f1.due)
    out.push({
      id: 'factuur-vandijk',
      meta: `${late} dagen te laat`,
      pages: ['thuis', 'financien', 'klanten'],
      text: `De factuur van Van Dijk Installatie staat ${late} dagen over de termijn. Zal ik een herinnering inplannen?`,
      why: 'Marco zei dat hij ernaar zou kijken. Een vriendelijke herinnering is nu passend en kost je een kwartier.',
      acceptLabel: 'Plan herinnering',
      action: { type: 'planInvoiceReminder', invoiceId: 'f1' },
    })
  }

  // Hoofd leeg: klant-items in één keer
  const klantItems = s.inbox.filter(i => /noordlicht|korenaar|van dijk|camping|mira|fysio/i.test(i.text) && !/^offerte|^idee/i.test(i.text))
  if (klantItems.length >= 2) {
    out.push({
      id: `inbox-klanten-${klantItems.length}`,
      meta: `${klantItems.length} items`,
      pages: ['inbox'],
      text: `${klantItems.length} items gaan over een klant. Zal ik ze in één keer bij de juiste klant zetten?`,
      why: 'Dan staan ze in de tijdlijn bij het gesprek waar ze bij horen, en hoef je ze hier niet los te ordenen.',
      acceptLabel: 'Ja, zet ze goed',
      action: { type: 'sortInbox', destination: 'klant' },
    })
  }

  // Week: schets reserveringsmodule
  const schets = task('t5')
  if (schets && !schets.date) {
    const slot = ctx.slot(schets.durationMin, { deep: true, preferMorning: true })
    if (slot) {
      const quiet = ctx.load(slot.date).level === 'rustig'
      out.push({
        id: 'schets-reservering',
        pages: ['week', 'kansen'],
        text: `${cap(when(slot))} is nog ruimte. Zal ik de eerste schets voor de reserveringsmodule daar neerzetten?`,
        why: slot.start < '12:00'
          ? (quiet ? 'Je energie is ’s ochtends het hoogst, en die dag is verder rustig. Goed moment voor denkwerk.' : 'Je energie is ’s ochtends het hoogst. Twee uur aan één stuk geeft je een eerlijk beeld van de bouwtijd.')
          : 'De ochtenden zitten vol deze week. Dit is de eerste plek met twee uur aan één stuk.',
        acceptLabel: 'Zet erin',
        action: { type: 'scheduleTask', taskId: 't5', date: slot.date, start: slot.start },
      })
    }
  }

  // Week: het gat
  const gap = s.events.find(e => e.cancelled && !s.gapResolved[e.id])
  if (gap) {
    out.push({
      id: `gat-${gap.id}`,
      meta: `${weekdayShort(gap.date)} ${gap.start}`,
      pages: ['week', 'thuis'],
      text: `${cap(relDay(gap.date))} is ${gap.start} tot ${gap.end} vrijgekomen. Ik heb drie ideeën om dat gat te vullen.`,
      why: gap.cancelNote ?? 'Een afspraak is vervallen.',
      acceptLabel: 'Bekijk opties',
      action: { type: 'navigate', to: '/week#gat' },
    })
  }

  // Klanten: patroon
  const o1 = s.opportunities.find(o => o.id === 'o1')
  if (o1) {
    out.push({
      id: 'patroon-reserveren',
      meta: '3 klanten',
      pages: ['klanten'],
      text: 'Camping Aan de Rijn, Fysio Het Plein en Atelier Mira vroegen alle drie naar online reserveren. Ik heb er een kans van gemaakt.',
      why: 'Drie losse vragen naar hetzelfde is een patroon, en het past bij wat je al bouwt.',
      acceptLabel: 'Bekijk de kans',
      action: { type: 'navigate', to: '/kansen?focus=o1' },
    })
  }
  const fysio = task('t9')
  if (fysio && !fysio.date) {
    const slot = ctx.slot(fysio.durationMin)
    if (slot) {
      out.push({
        id: 'fysio-content',
        pages: ['klanten', 'week'],
        text: `Ruben wacht op een voorstel. Zal ik het verzamelen van de content ${when(slot)} inplannen?`,
        why: 'Zonder content kan de site niet verder, en een uur is genoeg om alles op te vragen.',
        acceptLabel: 'Plan in',
        action: { type: 'scheduleTask', taskId: 't9', date: slot.date, start: slot.start },
      })
    }
  }

  // Kansen
  if (o1 && o1.status !== 'ingepland') {
    out.push({
      id: 'kans-uitwerken',
      pages: ['kansen'],
      text: 'Het reserveringssysteem komt het vaakst terug. Zal ik een ochtend uitwerktijd voor je inplannen?',
      why: 'Met een eerste schets weet je of drie weken bouwtijd klopt, voordat je het iemand voorstelt.',
      acceptLabel: 'Plan uitwerktijd',
      action: { type: 'planOpportunity', opportunityId: 'o1' },
    })
  }
  const o4 = s.opportunities.find(o => o.id === 'o4')
  if (o4 && o4.status === 'nieuw') {
    out.push({
      id: 'kans-loslaten',
      pages: ['kansen'],
      text: 'Fotografie doorverkopen levert weinig op voor de afstemming die het vraagt. Zal ik hem laten gaan?',
      why: 'Hij blijft bewaard. Als een tweede klant ernaar vraagt, haal ik hem terug.',
      acceptLabel: 'Laat gaan',
      action: { type: 'setOpportunityStatus', opportunityId: 'o4', status: 'laten gaan' },
    })
  }

  // Financiën: meer verdienen
  if (!s.opportunities.some(o => o.title.startsWith('Onderhoudsabonnement'))) {
    out.push({
      id: 'onderhoud-abonnement',
      meta: '+ € 2.700 per jaar',
      pages: ['financien', 'kansen'],
      text: 'Je doet elke maand zo’n zes uur onderhoud voor oud-klanten zonder dat je het factureert. Zal ik een onderhoudsabonnement als kans bewaren?',
      why: `Bij € 45 per site per maand en vijf sites is dat ${euroRound(45 * 5 * 12)} per jaar, voor werk dat je nu al doet.`,
      acceptLabel: 'Bewaar als kans',
      action: {
        type: 'createOpportunity',
        title: 'Onderhoudsabonnement voor websites',
        source: 'Financiën: onderhoud zonder vaste prijs',
        revenue: 2700,
        buildTime: '1 dag om uit te werken',
        why: 'Je doet het werk al. Een vaste maandprijs maakt je inkomsten voorspelbaarder en je klanten weten waar ze aan toe zijn.',
      },
    })
  }
  const fotobank = s.subscriptions.find(x => x.id === 's8')
  if (fotobank && !s.tasks.some(t => t.title === 'Fotobank opzeggen')) {
    const slot = ctx.slot(10)
    if (slot) {
      out.push({
        id: 'fotobank-opzeggen',
        meta: `${euroRound(fotobank.monthly * 12)} per jaar`,
        pages: ['financien'],
        text: 'Je fotobank is drie maanden niet gebruikt. Zal ik opzeggen op je lijst zetten?',
        why: `Dat scheelt ${euroRound(fotobank.monthly * 12)} per jaar. Je kunt altijd weer instappen als je hem mist.`,
        acceptLabel: 'Zet op mijn lijst',
        action: { type: 'addTask', title: 'Fotobank opzeggen', date: slot.date, start: slot.start, durationMin: 10, kind: 'admin' },
      })
    }
  }

  // Ritme
  if (!s.prefs.morningFocus) {
    out.push({
      id: 'ochtend-focus',
      pages: ['ritme', 'week'],
      text: 'Je energie is ’s ochtends het hoogst. Zal ik denkwerk voortaan in de ochtend plannen?',
      why: 'Over zes weken geef je ’s ochtends gemiddeld een 4, na drie uur een 2,8. Hetzelfde werk kost dan minder moeite.',
      acceptLabel: 'Ja, doe dat',
      action: { type: 'setMorningFocus' },
    })
  }
  const last = [...days].reverse().find(d => fromISO(d).getDay() === 5) ?? days[days.length - 1]!
  if (!s.tasks.some(t => t.title === 'Vrij: even niets')) {
    out.push({
      id: 'vrije-middag',
      pages: ['ritme'],
      text: `Je werkweken liepen op naar zo’n 47 uur. Zal ik ${weekdayLong(last)} vanaf half vijf voor jezelf vrijhouden?`,
      why: 'Na langere weken zakt je energie aan het begin van de week erna. Een vroeg einde helpt daar het meest bij.',
      acceptLabel: 'Houd vrij',
      action: { type: 'addTask', title: 'Vrij: even niets', date: last, start: '16:30', durationMin: 90, kind: 'persoonlijk' },
    })
  }

  // Offertes zonder reactie → nabellen
  for (const q of s.quotes.filter(q => q.status === 'verstuurd' && q.sentOn && diffDays(todayISO(), q.sentOn) >= 5)) {
    const c = s.clients.find(x => x.id === q.clientId)
    const title = `${c?.contact.split(' ')[0] ?? 'Klant'} bellen over offerte "${q.title}"`
    if (s.tasks.some(t => t.title === title)) continue
    const slot = ctx.slot(15, { domain: 'zakelijk' })
    if (!slot) continue
    out.push({
      id: `offerte-nabellen-${q.id}`, pages: ['klanten', 'thuis'], tone: 'klant', icon: 'tabler:send',
      title: `Offerte ${c?.name} nabellen`, meta: `${diffDays(todayISO(), q.sentOn!)} dagen stil`,
      text: `${c?.name} heeft ${diffDays(todayISO(), q.sentOn!)} dagen niet gereageerd op je offerte van ${euroRound(q.amount)}. Zal ik ${when(slot)} een kwartier inplannen om even te bellen?`,
      why: 'Na vijf dagen is een belletje vriendelijk en geen druk. Vaak ligt het gewoon nog op de stapel.',
      acceptLabel: 'Plan belmoment', action: { type: 'addTask', title, date: slot.date, start: slot.start, durationMin: 15, kind: 'taak', domain: 'zakelijk' },
    })
  }

  // Projecten over budget → meerwerk bespreken
  for (const p of s.projects.filter(p => p.status === 'lopend')) {
    const hours = s.timeEntries.filter(e => e.projectId === p.id).reduce((a, e) => a + e.hours, 0)
    const over = hours - p.budget / p.hourlyRate
    const c = s.clients.find(x => x.id === p.clientId)
    const title = `Meerwerk bespreken met ${c?.contact.split(' ')[0] ?? c?.name}`
    if (over < 2 || s.tasks.some(t => t.title === title)) continue
    const slot = ctx.slot(30, { domain: 'zakelijk' })
    if (!slot) continue
    out.push({
      id: `meerwerk-${p.id}`, pages: ['klanten', 'financien', 'thuis'], tone: 'geld', icon: 'tabler:clock',
      title: `Meerwerk ${c?.name}`, meta: `${Math.round(over)} u over budget`,
      text: `${p.name} zit ${Math.round(over)} uur boven budget. Dat is ${euroRound(over * p.hourlyRate)} werk dat je nu niet factureert. Zal ik een gesprek over meerwerk inplannen?`,
      why: 'Hoe eerder je het bespreekt, hoe makkelijker. Achteraf voelt het als een verrassing.',
      acceptLabel: 'Plan gesprek', action: { type: 'addTask', title, date: slot.date, start: slot.start, durationMin: 30, kind: 'taak', domain: 'zakelijk' },
    })
  }

  // ---------- Opdrachten (bord) ----------
  const kindOf = (status: string) => s.board.find(c => c.name === status)?.kind ?? 'todo'
  const openA = s.assignments.filter(a => kindOf(a.status) !== 'done')
  const clientOf = (id?: string) => s.clients.find(c => c.id === id)
  const dueIn = (a: { due?: string }) => (a.due ? diffDays(a.due, todayISO()) : 99)
  const PRIO = { hoog: 0, normaal: 1, laag: 2 } as const

  // Een deadline dichtbij en nog geen tijd in je agenda
  const urgent = openA
    .filter(a => ['todo', 'doing'].includes(kindOf(a.status)) && dueIn(a) <= 3 && !s.tasks.some(t => t.assignmentId === a.id && !t.done && t.date && t.date >= todayISO()))
    .sort((a, b) => dueIn(a) - dueIn(b) || PRIO[a.priority] - PRIO[b.priority])[0]
  if (urgent) {
    const d = dueIn(urgent)
    out.push({
      id: `opdracht-plan-${urgent.id}`, pages: ['opdrachten', 'week'], tone: 'planning', icon: 'tabler:calendar-event',
      title: `${urgent.title} inplannen`, meta: d < 0 ? 'te laat' : d === 0 ? 'vandaag' : relDay(urgent.due!),
      text: `${urgent.title} moet ${d <= 0 ? 'nu af' : relDay(urgent.due!) + ' af'}, en er staat nog geen tijd voor in je agenda.`,
      why: `Zonder blok in je week schuift het door. Ik zoek de eerste plek binnen je werktijd${urgent.estimateH ? ` voor de ${urgent.estimateH} uur die je schatte` : ''}.`,
      acceptLabel: 'Plan in', action: { type: 'planAssignment', assignmentId: urgent.id },
    })
  }

  // Te veel tegelijk in Bezig
  const doingCol = s.board.find(c => c.kind === 'doing')
  const doing = openA.filter(a => kindOf(a.status) === 'doing')
  if (doingCol?.wip && doing.length > doingCol.wip) {
    const calm = [...doing].sort((a, b) => PRIO[b.priority] - PRIO[a.priority] || dueIn(b) - dueIn(a))[0]!
    const todo = s.board.find(c => c.kind === 'todo')?.name ?? 'Te doen'
    out.push({
      id: `opdracht-wip-${calm.id}-${doing.length}`, pages: ['opdrachten', 'thuis'], tone: 'planning', icon: 'tabler:layout-kanban',
      title: 'Minder tegelijk', meta: `${doing.length} bezig`,
      text: `Je hebt ${doing.length} opdrachten tegelijk open. Zal ik ${calm.title} terugzetten naar ${todo}?`,
      why: `${calm.title} heeft de minste haast. Met drie tegelijk maak je dingen eerder af en wissel je minder.`,
      acceptLabel: `Terug naar ${todo}`, action: { type: 'moveAssignment', assignmentId: calm.id, status: todo },
    })
  }

  // Wacht al lang op de klant
  for (const a of openA.filter(a => kindOf(a.status) === 'waiting' && diffDays(todayISO(), a.statusSince) >= 5)) {
    const c = clientOf(a.clientId)
    const who = c?.contact.split(' ')[0] ?? c?.name ?? 'de klant'
    const title = `Navragen bij ${who}: ${a.title.toLowerCase()}`
    if (s.tasks.some(t => t.title === title)) continue
    const slot = ctx.slot(15, { domain: 'zakelijk' })
    if (!slot) continue
    const n = diffDays(todayISO(), a.statusSince)
    out.push({
      id: `opdracht-wacht-${a.id}`, pages: ['opdrachten', 'klanten', 'thuis'], tone: 'klant', icon: 'tabler:send',
      title: `Navragen bij ${who}`, meta: `${n} dagen`,
      text: `${a.title} wacht al ${n} dagen op ${c?.name ?? 'de klant'}. Zal ik ${when(slot)} een kwartier zetten om even te vragen hoe het staat?`,
      why: 'Wachten houdt je werk stil. Een kort berichtje is vriendelijk en houdt de vaart erin.',
      acceptLabel: 'Plan een kwartier', action: { type: 'addTask', title, date: slot.date, start: slot.start, durationMin: 15, kind: 'taak', domain: 'zakelijk', clientId: a.clientId },
    })
  }

  // Geld apart zetten deze maand
  const monthKey = todayISO().slice(0, 7)
  if (!s.prefs.tax.setAside[monthKey]) {
    const paid = s.transactions.filter(t => t.category === 'omzet' && t.amount > 0 && t.date.startsWith(monthKey))
    const vat = s.prefs.tax.vat
    const amount = paid.reduce((a, t) => a + (t.amount * vat) / (1 + vat) + (t.amount / (1 + vat)) * s.prefs.tax.reserve, 0)
    if (amount > 0) {
      out.push({
        id: `apart-${monthKey}`, pages: ['financien', 'thuis'], tone: 'geld', icon: 'tabler:pig-money',
        title: 'Geld apart zetten', meta: euroRound(amount),
        text: `Van wat er deze maand binnenkwam is zo’n ${euroRound(amount)} voor btw en belasting. Zet je het naar je spaarrekening?`,
        why: 'Wat apart staat, kun je niet per ongeluk uitgeven. Dan is de aanslag geen schrik.',
        acceptLabel: 'Heb ik gedaan', action: { type: 'markSetAside' },
      })
    }
  }

  // Levensadmin
  for (const l of s.life.filter(l => !l.done && diffDays(l.due, todayISO()) <= l.remindDays).sort((a, b) => a.due.localeCompare(b.due))) {
    if (s.tasks.some(t => t.title === l.title && !t.done)) continue
    const d = diffDays(l.due, todayISO())
    const slot = ctx.slot(15, { domain: 'prive' })
    if (!slot) continue
    out.push({
      id: `life-${l.id}-${l.due}`, pages: ['admin', 'thuis'], tone: 'ritme', icon: LIFE_ICON[l.category],
      title: l.title, meta: d <= 0 ? 'nu' : `over ${d} dagen`,
      text: `${l.title}: ${d <= 0 ? 'dat is nu' : `over ${d} dagen`}. Zal ik ${when(slot)} een kwartier vrijmaken om het te regelen?`,
      why: l.note ?? 'Nu regelen kost een kwartier. Te laat kost meestal meer.',
      acceptLabel: 'Plan een kwartier', action: { type: 'addTask', title: l.title, date: slot.date, start: slot.start, durationMin: 15, kind: 'persoonlijk', domain: 'prive' },
    })
  }

  // Werk buiten werktijd → terug binnen de grens
  const wh = s.prefs.workHours
  const late = s.tasks.filter(t => t.date && t.start && !t.done && domainOfTask(t) === 'zakelijk'
    && (!wh.days.includes(fromISO(t.date).getDay()) || t.start < wh.start || addMin(t.start, t.durationMin) > wh.end))
  if (late.length) {
    out.push({
      id: `werk-buiten-${late.length}`,
      pages: ['week', 'thuis'],
      title: late.length === 1 ? 'Werktaak buiten werktijd' : `${late.length} werktaken buiten werktijd`,
      meta: late.map(t => `${weekdayShort(t.date!)} ${t.start}`).join(', '),
      tone: 'ritme',
      icon: 'tabler:moon',
      text: `${late.map(t => `"${t.title}"`).join(' en ')} ${late.length === 1 ? 'staat' : 'staan'} buiten je werktijd. Zal ik ${late.length === 1 ? 'hem' : 'ze'} naar een plek binnen ${wh.start}–${wh.end} verschuiven?`,
      why: 'Je avonden zijn van jou. Werk dat erin kruipt, kost je slaap en energie de dag erna.',
      acceptLabel: 'Verschuif',
      action: { type: 'moveOutsideWork' },
    })
  }

  // Begin van de maand: terugkijken op vier weken
  const dom = fromISO(todayISO()).getDate()
  if (dom <= 7) {
    out.push({
      id: `terugblik-${todayISO().slice(0, 7)}`,
      pages: ['thuis', 'ritme'],
      title: 'Terugkijken op je maand',
      meta: '5 min',
      tone: 'ritme',
      icon: 'tabler:history',
      text: 'Een nieuwe maand. Zin om terug te kijken op de afgelopen vier weken? Je ziet wat er af is en wat er beter gaat dan een maand geleden.',
      why: 'Kleine winst zie je pas als je terugkijkt. In de drukte zie je vooral wat er nog moet.',
      acceptLabel: 'Kijk terug',
      action: { type: 'navigate', to: '/terugblik' },
    })
  }

  // Werk dat blijft liggen: één eerste stap van een kwartier
  const stuck = stuckAssignments(s)[0]
  if (stuck) {
    const step = firstStepFor(stuck.a.title, stuck.a.tags)
    out.push({
      id: `eerste-stap-${stuck.a.id}`,
      pages: ['opdrachten', 'thuis'],
      title: `${stuck.a.title}: begin klein`,
      meta: `ligt ${stuck.days} dagen`,
      tone: 'planning',
      icon: 'tabler:player-play',
      text: `"${stuck.a.title}" ligt al ${stuck.days} dagen ${stuck.a.status === 'Bezig' ? 'stil' : 'te wachten'}. Zal ik op een ochtend een kwartier zetten voor alleen de eerste stap: ${step.charAt(0).toLowerCase() + step.slice(1)}`,
      why: 'Wat blijft liggen is meestal te groot of te vaag. Beginnen is het moeilijkste deel, daarna gaat het vaak vanzelf.',
      acceptLabel: 'Plan een kwartier',
      action: { type: 'planFirstStep', assignmentId: stuck.a.id, text: step },
    })
  }
  const pushed = stuckTasks(s)[0]
  if (pushed) {
    const step = firstStepFor(pushed.title)
    out.push({
      id: `eerste-stap-taak-${pushed.id}`,
      pages: ['thuis', 'week'],
      title: `${pushed.title}: begin klein`,
      meta: `${pushed.moved}× doorgeschoven`,
      tone: 'planning',
      icon: 'tabler:player-play',
      text: `"${pushed.title}" heb je ${pushed.moved} keer doorgeschoven. Zal ik een kwartier zetten voor alleen de eerste stap: ${step.charAt(0).toLowerCase() + step.slice(1)}`,
      why: 'Doorschuiven betekent meestal dat de taak te groot voelt. Een kwartier is klein genoeg om gewoon te beginnen.',
      acceptLabel: 'Plan een kwartier',
      action: { type: 'planFirstStep', taskId: pushed.id, text: step },
    })
  }

  // Slaapritme: een vaste start van je werkdag
  const sp = s.prefs.sleep
  if (sp && !sp.morning?.firstBlock) {
    const next = days.find(d => s.prefs.workHours.days.includes(fromISO(d).getDay()) && d > todayISO()) ?? days[1]!
    const at = anchorTime(sp, next)
    out.push({
      id: 'eerste-blok',
      pages: ['ritme', 'thuis'],
      title: 'Vast eerste werkblok',
      meta: `werkdagen ${at}`,
      tone: 'ritme',
      icon: 'tabler:sunrise',
      text: `Zal ik op je werkdagen om ${at} een vast eerste blok van anderhalf uur zetten? Dan is opstaan een afspraak, geen wilskracht.`,
      why: 'Een vaste start houdt je opstaantijd overeind. Het blok schuift mee als je opstaantijd een stap eerder gaat.',
      acceptLabel: 'Zet in Week',
      action: { type: 'setFirstBlock' },
    })
  }

  // Slaapritme: het weekend dichtbij houden (vrijdag en zaterdag)
  const wdNow = fromISO(todayISO()).getDay()
  if (sp && (wdNow === 5 || wdNow === 6)) {
    const sat = wdNow === 5 ? addDays(todayISO(), 1) : todayISO()
    const day = wdNow === 5 ? sat : addDays(sat, 1)
    const latest = weekendLatest(sp, day)
    const start = clock(Math.ceil((clockMin(latest) + 30) / 15) * 15)
    const busyMorning = s.tasks.some(t => t.date === day && t.start && t.start < '12:00') || s.events.some(e => e.date === day && e.start < '12:00' && !e.cancelled)
    const recent = s.rhythm.filter(d => d.woke && diffDays(todayISO(), d.date) <= 9)
    const we = recent.filter(d => isWeekend(d.date))
    const wd = recent.filter(d => !isWeekend(d.date))
    const avgM = (xs: typeof recent) => xs.reduce((a, d) => a + clockMin(d.woke!), 0) / xs.length
    const later = we.length && wd.length ? avgM(we) - avgM(wd) : 0
    if (!busyMorning) {
      out.push({
        id: `weekend-ritme-${day}`,
        pages: ['thuis', 'ritme', 'week'],
        title: 'Weekend binnen een uur',
        meta: `${weekdayShort(day)} op vóór ${latest}`,
        tone: 'ritme',
        icon: 'tabler:calendar-week',
        text: `Uitslapen mag, tot uiterlijk ${latest}. Zal ik ${relDay(day)} om ${start} iets kleins buiten de deur zetten, zoals koffie halen? Dan heb je een reden om op te staan.`,
        why: later > 60 ? `Vorig weekend stond je ${minText(later)} later op dan doordeweeks. Binnen een uur blijft je ritme makkelijker staan.` : later >= 30 ? `Vorig weekend stond je ${minText(later)} later op dan doordeweeks. Dat viel binnen het uur, en zo houd je het.` : 'Binnen een uur van je doordeweekse tijd blijft je ritme makkelijker staan.',
        acceptLabel: 'Zet erin',
        action: { type: 'addTask', title: 'Koffie halen, even naar buiten', date: day, start, durationMin: 30, kind: 'persoonlijk', domain: 'prive' },
      })
    }
  }

  // Routines: oplossingen voor wat er misgaat (staan op Ritme bij de routine zelf)
  for (const ins of routineInsights(s)) {
    if (!ins.fix) continue
    out.push({ id: ins.fix.id, pages: ['ritme'], text: ins.fix.text, why: ins.headline, acceptLabel: ins.fix.acceptLabel, action: ins.fix.action, meta: ins.fix.meta })
  }

  return out.map(decorate)
}

// ---------- Routines: wat gaat er mis? ----------
export interface RoutineInsight {
  routineId: string
  headline: string
  /** Twee vergelijkbare getallen: wanneer het lukt vs wanneer niet */
  compare?: { a: string, aLabel: string, b: string, bLabel: string }
  fix?: { id: string, text: string, acceptLabel: string, meta?: string, action: StuurmanSuggestion['action'] }
}

export function routineInsights(s: AppState): RoutineInsight[] {
  const byDate = new Map(s.rhythm.map(d => [d.date, d]))
  const r = (id: string) => s.routines.find(x => x.id === id && !x.paused)
  const pct = (xs: boolean[]) => (xs.length ? Math.round((xs.filter(Boolean).length / xs.length) * 100) : 0)
  const out: RoutineInsight[] = []

  const walk = r('r1')
  if (walk) {
    const busy: boolean[] = []
    const calm: boolean[] = []
    for (const [date, l] of Object.entries(walk.log)) {
      const d = byDate.get(date)
      if (d) (d.workH > 8.5 ? busy : calm).push(l.done)
    }
    out.push({
      routineId: 'r1',
      headline: 'Op lange werkdagen schiet wandelen erbij in. Je reden is dan bijna altijd "geen tijd".',
      compare: { a: `${pct(calm)}%`, aLabel: 'gewone dag', b: `${pct(busy)}%`, bLabel: 'dag > 8,5 uur' },
      fix: s.tasks.some(t => t.title === 'Wandelen') ? undefined : { id: 'routine-wandelblok', text: 'Zal ik op je werkdagen om 12:45 een kwartier wandelen in Week zetten? Dan staat het er, ook als het druk is.', acceptLabel: 'Zet in Week', meta: 'elke werkdag', action: { type: 'addRoutineBlocks', routineId: 'r1', start: '12:45', durationMin: 15 } },
    })
  }
  const phone = r('r2')
  if (phone) {
    const ok: number[] = []
    const miss: number[] = []
    for (const [date, l] of Object.entries(phone.log)) {
      const next = byDate.get(addDays(date, 1))
      if (next) (l.done ? ok : miss).push(next.sleepH)
    }
    const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
    out.push({
      routineId: 'r2',
      headline: 'Meestal vergeet je het gewoon. En dat merk je: je slaapt dan ruim een uur korter.',
      compare: { a: `${dec1(avg(ok))} u`, aLabel: 'slaap als het lukt', b: `${dec1(avg(miss))} u`, bLabel: 'als het niet lukt' },
      fix: s.prefs.reminders.r2 ? undefined : { id: 'routine-herinnering', text: 'Zal ik je om 22:15 een seintje geven? Dan heb je een kwartier om af te ronden.', acceptLabel: 'Ja, herinner me', meta: 'elke avond', action: { type: 'setReminder', routineId: 'r2', time: '22:15' } },
    })
  }
  const close = r('r3')
  if (close) {
    const fri = planDays(5).find(d => fromISO(d).getDay() === 5)
    out.push({
      routineId: 'r3',
      headline: 'De helft van de vrijdagen loopt de dag uit en schiet het erbij in.',
      fix: !fri || s.tasks.some(t => t.title === 'Week afsluiten' && t.date === fri) ? undefined : { id: 'routine-afsluiten', text: 'Zal ik vrijdag 16:00 een halfuur blokken, zodat er niets anders in kan?', acceptLabel: 'Blok vrijdag', meta: `${weekdayShort(fri)} 16:00`, action: { type: 'addTask', title: 'Week afsluiten', date: fri, start: '16:00', durationMin: 30, kind: 'admin' } },
    })
  }
  const sport = r('r4')
  if (sport) {
    const rested: boolean[] = []
    const tired: boolean[] = []
    for (const [date, l] of Object.entries(sport.log)) {
      const d = byDate.get(date)
      if (d) (d.sleepH < 7.2 ? tired : rested).push(l.done)
    }
    out.push({
      routineId: 'r4',
      headline: 'Na een korte nacht sla je sporten bijna altijd over. Telefoon op tijd weg helpt hier dus ook.',
      compare: { a: `${pct(rested)}%`, aLabel: 'na goede nacht', b: `${pct(tired)}%`, bLabel: 'na korte nacht' },
    })
  }
  return out
}

// ---------- Het gat in Week ----------
export function gapOptions(ctx: StuurmanContext): GapOption[] {
  const offerte = ctx.state.tasks.find(t => t.id === 't1' && !t.date)
  const sjabloon = ctx.state.tasks.find(t => t.id === 't6' && !t.date)
  const first: GapOption = offerte
    ? { id: 'task', title: 'Offerte Studio Noordlicht afronden', why: 'Past precies in anderhalf uur. Dan is hij de deur uit vóór het weekend.', taskId: 't1' }
    : { id: 'task', title: sjabloon ? 'Offertesjabloon opfrissen' : 'Mails en kleine dingen', why: 'Klein werk dat anders blijft liggen.', taskId: sjabloon?.id }
  return [
    first,
    { id: 'focus', title: 'Uitwerkmoment reserveringssysteem', why: 'Je kans met de hoogste zekerheid. Een eerste schets maakt hem concreet.', opportunityId: 'o1' },
    { id: 'vrij', title: 'Vrijhouden voor jezelf', why: 'Je werkuren liepen op. Een lege middag is ook een keuze.' },
  ]
}

// ---------- Inzichten ----------
export function financeInsights(n: { avgIncome: number, thisIncome: number, thisOut: number, lastOut: number, lateCount: number, fixed: number, topShare: number, topName: string }) {
  return {
    good: [
      { title: 'Je houdt elke maand iets over', body: `Zes maanden op rij meer in dan uit, gemiddeld ${euroRound(n.avgIncome)} omzet per maand.` },
      { title: 'Je uitgaven dalen', body: `Deze maand ${euroRound(n.lastOut - n.thisOut)} minder uit dan vorige maand, zonder dat je iets hebt moeten laten.` },
    ],
    watch: [
      { title: `${n.lateCount === 1 ? 'Eén factuur is' : `${n.lateCount} facturen zijn`} te laat`, body: 'Van Dijk Installatie is 12 dagen over de termijn. Meestal betalen ze na één herinnering.' },
      { title: 'Veel hangt aan één klant', body: `${n.topName} is goed voor ${Math.round(n.topShare * 100)}% van je omzet. Dat is prima, zolang je het weet.` },
    ],
  }
}

export function rhythmObservations() {
  return [
    { id: 'obs-slaap', title: 'Slaap en energie hangen samen', body: 'Na nachten onder de zeven uur geef je je energie die dag gemiddeld een punt lager.' },
    { id: 'obs-ochtend', title: 'Je ochtenden zijn het sterkst', body: 'Denkwerk voor de lunch kost je merkbaar minder moeite dan na drie uur.', suggestionId: 'ochtend-focus' },
    { id: 'obs-werk', title: 'Je werkweken lopen op', body: 'De laatste twee weken werkte je zo’n 47 uur, tegen 40 daarvoor. Je bewoog wel gewoon door, mooi.', suggestionId: 'vrije-middag' },
  ]
}

// ---------- Vragen (voorgeprogrammeerd) ----------
export const QUESTIONS: StuurmanQuestion[] = [
  { page: 'thuis', question: 'Wat is het belangrijkste vandaag?', answer: 'De offerte voor Studio Noordlicht. De rest kan schuiven, die niet echt: Sanne wil in januari live.' },
  { page: 'thuis', question: 'Hoe ziet morgen eruit?', answer: 'Vol: drie afspraken en drie taken. Ik zou vanavond niets meer oppakken.' },
  { page: 'inbox', question: 'Hoe kies je een bestemming?', answer: 'Ik kijk of er een klant in staat, of het een idee is, of dat het een klus met een werkwoord is. Twijfel ik, dan stel ik inplannen voor.' },
  { page: 'inbox', question: 'Moet alles vandaag weg?', answer: 'Nee. Hoofd leeg is er om je hoofd leeg te maken, niet om een tweede takenlijst te worden. Orden als je er zin in hebt.' },
  { page: 'week', question: 'Waarom staat denkwerk ’s ochtends?', answer: 'Je ritme laat zien dat je energie voor de lunch het hoogst is. Daar zet ik werk dat concentratie vraagt.' },
  { page: 'week', question: 'Is deze week te vol?', answer: 'Eén dag is vol, de rest is normaal tot rustig. Als je de rustige dag rustig houdt, is de week goed te doen.' },
  { page: 'klanten', question: 'Wie heeft aandacht nodig?', answer: 'Studio Noordlicht wacht op een offerte en Van Dijk op betaling. De rest loopt.' },
  { page: 'klanten', question: 'Wat heb ik toegezegd?', answer: 'Vijf open toezeggingen, waarvan twee deze week: de offerte voor Noordlicht en de oplevering bij Van Dijk.' },
  { page: 'kansen', question: 'Welke kans eerst?', answer: 'Het reserveringssysteem. Hoge zekerheid, drie klanten die erom vragen, en je kunt het hergebruiken.' },
  { page: 'kansen', question: 'Hoe zeker ben je?', answer: 'Zekerheid betekent hoe vaak en hoe concreet ik het terugzie in gesprekken. Het is een inschatting, geen belofte.' },
  { page: 'financien', question: 'Gaat het goed?', answer: 'Ja. Je houdt elke maand iets over en je vaste lasten zijn overzichtelijk. Let alleen op de factuur van Van Dijk.' },
  { page: 'financien', question: 'Is dit financieel advies?', answer: 'Nee. Ik laat zien wat er gebeurt en waar ruimte zit. Beslissingen over geld neem jij, eventueel met je boekhouder.' },
  { page: 'ritme', question: 'Waarom geen streaks?', answer: 'Omdat een gemiste dag geen falen is. Ik kijk naar het patroon over weken, niet naar één dag.' },
  { page: 'ritme', question: 'Wat doet de check-in?', answer: 'Eén tik per dag. Daarmee leer ik wanneer je energie hoog is, zodat ik je week daarop kan afstemmen.' },
]

export const PAGE_LABEL: Record<PageKey, string> = {
  thuis: 'Thuisbasis',
  inbox: 'Hoofd leeg',
  week: 'Week',
  opdrachten: 'Opdrachten',
  klanten: 'Klanten',
  kansen: 'Kansen',
  financien: 'Financiën',
  ritme: 'Ritme',
  admin: 'Levensadmin',
}

// ---------- Chat (voorgeprogrammeerd) ----------
// Herkent een handvol vragen op trefwoord en antwoordt met wat de data laat zien.
// Hier komt later de echte AI: zelfde invoer, zelfde soort antwoord.
export interface ChatContext {
  state: AppState
  page: PageKey
  slot: StuurmanContext['slot']
  load: StuurmanContext['load']
  suggestions: StuurmanSuggestion[]
  today: { meetings: number, tasks: number, done: number, next?: { start: string, title: string }, noTime: string[] }
  money: { month: string, income: number, goal: number, open: number, late: { client: string, days: number, amount: number }[] }
  ritme: { score: number, weakest?: { name: string, done: number, goal: number, reason?: string } }
}
export type ChatReply = Pick<ChatMessage, 'text' | 'suggestion' | 'chips' | 'form'> & { capture?: string }

export const CHAT_STARTERS: Record<PageKey, string[]> = {
  thuis: ['Begin mijn dag', 'Wat moet ik vandaag doen?', 'Hoe staat het met geld?'],
  inbox: ['Onthoud: offerte bakker nabellen', 'Nieuwe klant: Bakkerij Zoet, contact Anna'],
  week: ['Nieuwe afspraak: lunch met Joris vrijdag 12:30', 'Plan 1 uur voor de btw-aangifte', 'Is mijn week te vol?'],
  opdrachten: ['Wat moet ik eerst doen?', 'Waar wacht ik op?', 'Nieuwe opdracht: moodboard camping'],
  klanten: ['Nieuwe klant: Bakkerij Zoet, contact Anna', 'Hoe staat het met Van Dijk?', 'Wie heeft aandacht nodig?'],
  kansen: ['Welke kans eerst?', 'Hoe staat het met geld?'],
  financien: ['Hoe staat het met geld?', 'Welke facturen staan open?'],
  admin: ['Wat moet ik binnenkort regelen?', 'Hoe staat het met geld?'],
  ritme: ['Nieuwe routine: hardlopen 3x per week na het werk', 'Hoe gaan mijn routines?', 'Waarom lukt wandelen niet?'],
}

const pick = (c: ChatContext, re: RegExp) => c.suggestions.find(s => re.test(s.id))

export function chatReply(input: string, c: ChatContext): ChatReply {
  const t = input.toLowerCase().trim()
  const days = planDays(5)

  // Momenten
  const moment = /begin (mijn|de) dag|dagstart/.test(t) ? ['/dagstart', 'Dagstart', 'tabler:sun', 'Twee minuten: hoe je binnenkomt, wat er staat en wat telt.']
    : /sluit|afsluiten|einde van de dag|klaar voor vandaag/.test(t) && !/week/.test(t) ? ['/afsluiten', 'Dag afsluiten', 'tabler:moon', 'Wat je deed, wat doorgaat, je routines en wat goed ging.']
      : /weekreview|week afsluiten|terugblik/.test(t) ? ['/weekreview', 'Weekreview', 'tabler:calendar-week', 'Je week in cijfers, wat goed ging, wat bleef liggen en je focus voor volgende week.']
        : null
  if (moment) {
    return {
      text: `${moment[3]} Zullen we?`,
      suggestion: decorate({ id: `chat-moment-${Date.now()}`, pages: [c.page], title: moment[1]!, icon: moment[2], tone: 'ritme', text: moment[3]!, why: 'Een vast moment houdt je hoofd leeg.', acceptLabel: `Start ${moment[1]!.toLowerCase()}`, action: { type: 'navigate', to: moment[0]! } }),
    }
  }

  // Iets aanmaken → ingevuld formulier
  const create = parseCreate(input)
  if (create) {
    const what = (create.prefill?.name ?? create.prefill?.title) as string
    return { text: `Ik heb een ${CREATE_LABEL[create.kind]} voor je klaargezet: "${what}". Kijk even of het klopt en tik op Aanmaken.`, form: create }
  }

  // Iets onthouden → Hoofd leeg
  const capture = input.match(/^(onthoud|noteer|schrijf op|zet in hoofd leeg)[:,]?\s+(.+)/i)
  if (capture) {
    return { text: `Staat in Hoofd leeg: "${capture[2]}". Ik stel daar een plek voor als je wilt ordenen.`, capture: capture[2], chips: ['Wat moet ik vandaag doen?'] }
  }

  // Iets inplannen
  const plan = input.match(/^(plan|zet)\s+(?:(\d+(?:[.,]\d+)?)\s*(uur|u|min|minuten)\s+(?:voor\s+)?)?(.+?)(?:\s+in (?:mijn )?(?:week|agenda))?$/i)
  if (plan && !/^(zet|plan) (het|dat|die)$/i.test(t)) {
    const n = plan[2] ? Number(plan[2].replace(',', '.')) : 1
    const dur = plan[3] && /min/.test(plan[3]) ? Math.round(n) : Math.round(n * 60)
    const title = plan[4]!.replace(/^(de|het|een)\s+/i, '').replace(/^\w/, ch => ch.toUpperCase())
    const deep = /offerte|schets|plan van aanpak|ontwerp|uitwerk/i.test(title)
    const dom = guessDomain(title)
    const slot = c.slot(dur, { deep, domain: dom })
    if (!slot) return { text: 'Ik vind deze week geen plek van die lengte. Zal ik het in Hoofd leeg zetten?', chips: [`Onthoud: ${title}`] }
    return {
      text: `${cap(relDay(slot.date))} om ${slot.start} is er ${duration(dur)} vrij${deep ? ', en dat is een goed moment voor denkwerk' : ''}. Zal ik "${title}" daar neerzetten?`,
      suggestion: decorate({ id: `chat-plan-${Date.now()}`, pages: [c.page], title: `${title} inplannen`, text: title, why: 'Eerste vrije plek die past.', acceptLabel: 'Zet erin', action: { type: 'addTask', title, date: slot.date, start: slot.start, durationMin: dur, kind: dom === 'prive' ? 'persoonlijk' : deep ? 'focus' : 'taak', domain: dom } }),
    }
  }

  if (/^(hoi|hallo|hey|goedemorgen|goedemiddag|goedenavond)\b/.test(t)) {
    return { text: `${greeting()}. ${c.today.meetings ? `Je hebt vandaag ${c.today.meetings === 1 ? 'één afspraak' : `${c.today.meetings} afspraken`}` : 'Geen afspraken vandaag'} en ${c.today.tasks - c.today.done} taken open. Waar kan ik mee helpen?`, chips: CHAT_STARTERS[c.page] }
  }
  if (/dank|top|thanks|fijn/.test(t)) return { text: 'Graag gedaan. Ik houd het in de gaten.' }

  if (/opdracht|kanban|\bbord\b|wacht ik|tegelijk/.test(t) || (c.page === 'opdrachten' && /eerst|bezig|wacht/.test(t))) {
    const kindOf = (st: string) => c.state.board.find(b => b.name === st)?.kind ?? 'todo'
    const open = c.state.assignments.filter(a => kindOf(a.status) !== 'done')
    const waiting = open.filter(a => kindOf(a.status) === 'waiting').map(a => ({ a, n: diffDays(todayISO(), a.statusSince) })).sort((x, y) => y.n - x.n)
    const nameOf = (id?: string) => c.state.clients.find(x => x.id === id)?.name ?? 'de klant'
    if (/wacht/.test(t)) {
      return {
        text: waiting.length ? `Je wacht op ${waiting.length === 1 ? 'één ding' : `${waiting.length} dingen`}: ${waiting.map(w => `${w.a.title.toLowerCase()} bij ${nameOf(w.a.clientId)} (${w.n} dagen)`).join(', ')}.` : 'Je wacht nergens op. Alles ligt bij jou.',
        suggestion: pick(c, /^opdracht-wacht/),
      }
    }
    const doing = open.filter(a => kindOf(a.status) === 'doing')
    const wip = c.state.board.find(b => b.kind === 'doing')?.wip ?? 3
    const first = [...open].filter(a => a.due && kindOf(a.status) !== 'waiting').sort((a, b) => a.due!.localeCompare(b.due!))[0]
    return {
      text: `${open.length} opdrachten open, ${doing.length} tegelijk bezig${doing.length > wip ? `, dat is er ${doing.length - wip === 1 ? 'één' : doing.length - wip} meer dan je grens van ${wip}` : ''}. ${first ? `Eerst: ${first.title.toLowerCase()}, ${relDay(first.due!)} af.` : ''}`.trim(),
      suggestion: pick(c, /^opdracht-(plan|wip)/),
      chips: ['Waar wacht ik op?'],
    }
  }
  if (/regelen|levensadmin|apk|verzeker|paspoort|binnenkort/.test(t)) {
    const soon = c.state.life.filter(l => !l.done && diffDays(l.due, todayISO()) <= l.remindDays).sort((a, b) => a.due.localeCompare(b.due))
    return {
      text: soon.length ? `Binnenkort: ${soon.map(l => `${l.title.toLowerCase()} (over ${diffDays(l.due, todayISO())} dagen)`).join(', ')}.` : 'Niets dat binnenkort geregeld moet worden.',
      suggestion: c.suggestions.find(s => s.id.startsWith('life-')),
    }
  }
  if (/btw|belasting|apart|uitbetalen/.test(t)) {
    const a = c.suggestions.find(s => s.id.startsWith('apart-'))
    return { text: `${a ? `Deze maand is zo’n ${a.meta} voor btw en belasting.` : 'Deze maand staat het al apart.'} De volledige verdeling per betaling staat bij Financiën, onder Apart zetten.`, suggestion: a }
  }

  if (/morgen/.test(t)) {
    const l = c.load(days[1]!)
    const ev = c.state.events.filter(e => e.date === days[1] && !e.cancelled)
    return {
      text: `${cap(weekdayLong(days[1]!))} is ${l.level}: ${ev.length} afspraken, ${duration(l.minutes)} gepland in totaal. ${ev[0] ? `Je begint om ${ev[0].start} met ${ev[0].title.toLowerCase()}.` : ''}${l.level === 'vol' ? ' Ik zou vanavond niets meer oppakken.' : ''}`,
      chips: ['Is mijn week te vol?'],
    }
  }

  if (/vandaag|planning|moet ik|belangrijk|eerst doen/.test(t)) {
    const parts = [`Vandaag: ${c.today.meetings} afspraken en ${c.today.tasks} taken, waarvan ${c.today.done} gedaan.`]
    if (c.today.next) parts.push(`Hierna: ${c.today.next.title} om ${c.today.next.start}.`)
    if (c.today.noTime.length) parts.push(`Belangrijk maar nog zonder tijd: ${c.today.noTime.join(', ')}.`)
    return { text: parts.join(' '), suggestion: pick(c, /^offerte-noordlicht/), chips: ['Hoe ziet morgen eruit?'] }
  }

  if (/week|vol|druk|tijd over|ruimte/.test(t)) {
    const lines = days.map(d => `${weekdayShort(d)} ${c.load(d).level}`).join(' · ')
    const full = days.filter(d => c.load(d).level === 'vol').length
    return { text: `${lines}. ${full ? `${full === 1 ? 'Eén dag is' : `${full} dagen zijn`} vol, de rest is goed te doen.` : 'Geen volle dagen. Een eerlijke week.'}`, suggestion: pick(c, /^gat-|^schets-/), chips: ['Plan 1 uur voor de btw-aangifte'] }
  }

  if (/geld|omzet|financ|verdien|factu|betaal|open/.test(t)) {
    const pct = Math.round((c.money.income / c.money.goal) * 100)
    const late = c.money.late[0]
    return {
      text: `In ${c.money.month} staat de omzet op ${euroRound(c.money.income)}, ${pct}% van je doel van ${euroRound(c.money.goal)}. Er staat ${euroRound(c.money.open)} aan facturen open${late ? `, waarvan ${euroRound(late.amount)} bij ${late.client} ${late.days} dagen te laat` : ''}.`,
      suggestion: pick(c, /^factuur-vandijk/) ?? pick(c, /^onderhoud/),
      chips: ['Welke kans eerst?'],
    }
  }

  if (/kans|idee|meer verdienen|product/.test(t)) {
    const o = c.state.opportunities.filter(x => x.status !== 'laten gaan').sort((a, b) => b.revenue - a.revenue)[0]
    if (!o) return { text: 'Er staan nu geen open kansen.' }
    return { text: `${o.title}: zekerheid ${o.confidence}, ${o.buildTime}, zo’n ${euroRound(o.revenue)}. ${o.why.split('.')[0]}.`, suggestion: pick(c, /^kans-uitwerken|^schets-/), chips: ['Hoe staat het met geld?'] }
  }

  if (/routine|wandel|sport|ritme|slaap|telefoon|energie|lukt/.test(t)) {
    const w = c.ritme.weakest
    return {
      text: `Je ritmescore deze week is ${Math.round(c.ritme.score * 100)}%.${w ? ` ${w.name} loopt het minst: ${w.done} van ${w.goal}${w.reason ? `, meestal door "${w.reason}"` : ''}.` : ''}`,
      suggestion: pick(c, /^routine-/),
      chips: ['Hoe ziet morgen eruit?'],
    }
  }

  const client = c.state.clients.find(cl => cl.name.toLowerCase().split(/\s+/).filter(x => x.length > 3 && !['installatie'].includes(x)).some(x => t.includes(x)))
  if (client || /klant|aandacht nodig/.test(t)) {
    if (!client) return { text: 'Studio Noordlicht wacht op een offerte en Van Dijk Installatie op betaling. De rest loopt.', chips: ['Hoe staat het met Van Dijk?'] }
    const open = c.state.invoices.filter(i => i.clientId === client.id && !i.paid)
    return {
      text: `${client.name} (${client.status}). Volgende stap: ${client.nextStep.toLowerCase()}.${open.length ? ` Open: ${open.map(i => euroRound(i.amount)).join(', ')}.` : ' Niets openstaand.'}`,
      suggestion: client.id === 'vandijk' ? pick(c, /^factuur-vandijk/) : client.id === 'noordlicht' ? pick(c, /^offerte/) : undefined,
    }
  }

  return { text: 'Dat kan ik nog niet. Dit is een voorproefje: hier komt later de echte Stuurman. Probeer een van deze:', chips: CHAT_STARTERS[c.page] }
}

// ---------- Aanmaken door het te zeggen ----------
// "Nieuwe klant: Bakkerij Zoet, contact Anna" → ingevuld klantformulier.
const WEEKDAYS = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']
export const CREATE_LABEL: Record<EditorRequest['kind'], string> = { klant: 'klant', routine: 'routine', taak: 'taak', afspraak: 'afspraak', admin: 'herinnering', werktijden: 'werktijd', opdracht: 'opdracht', slaap: 'slaapritme' }

export function parseCreate(text: string): EditorRequest | null {
  const t = text.trim()
  const m = t.match(/^(?:(?:nieuwe?|maak(?: een)?|voeg)\s+)?(klant|routine|taak|afspraak|opdracht)(?:\s+(?:toevoegen|aanmaken|toe))?\s*[:,-]\s*(.+)$/i)
    ?? t.match(/^nieuwe?\s+(klant|routine|taak|afspraak|opdracht)\s+(.+)$/i)
  if (!m) return null
  const kind = m[1]!.toLowerCase() as EditorRequest['kind']
  let rest = m[2]!.trim()
  const capFirst = (s: string) => s.replace(/^\w/, c => c.toUpperCase())

  if (kind === 'klant') {
    const c = rest.match(/,?\s*(?:contact(?:persoon)?|met)\s+(.+)$/i)
    if (c) rest = rest.slice(0, c.index).trim()
    return { kind, prefill: { name: capFirst(rest.replace(/,$/, '')), contact: c?.[1]?.trim() ?? '' } }
  }
  if (kind === 'routine') {
    let days: number[] | undefined
    let goal: number | undefined
    if (/elke dag|dagelijks|iedere dag/i.test(rest)) { days = [0, 1, 2, 3, 4, 5, 6]; goal = 7 }
    else if (/doordeweeks|werkdagen|elke werkdag/i.test(rest)) { days = [1, 2, 3, 4, 5]; goal = 5 }
    const g = rest.match(/(\d)\s*(?:x|×|keer)(?:\s+per\s+week)?/i)
    if (g) { goal = Number(g[1]); days ??= goal >= 5 ? [1, 2, 3, 4, 5] : goal === 4 ? [1, 2, 4, 5] : goal === 3 ? [1, 3, 5] : goal === 2 ? [2, 4] : [5] }
    const cue = rest.match(/\b(om\s+\d{1,2}[:.]\d{2}|na\s+(?:de|het)\s+\w+|voor\s+(?:het|de)\s+\w+|'s\s+\w+)/i)
    const name = rest
      .replace(/elke dag|dagelijks|iedere dag|doordeweeks|elke werkdag|werkdagen/gi, '')
      .replace(/(\d)\s*(?:x|×|keer)(?:\s+per\s+week)?/gi, '')
      .replace(cue?.[0] ?? '§', '')
      .replace(/\s{2,}/g, ' ').replace(/[,\s]+$/, '').trim()
    return { kind, prefill: { name: capFirst(name || rest), cue: cue ? capFirst(cue[0].replace('.', ':')) : '', ...(days ? { days } : {}), ...(goal ? { goal } : {}) } }
  }
  if (kind === 'afspraak') {
    const days = planDays(5)
    let date: string | undefined
    if (/\bmorgen\b/i.test(rest)) date = days[1]
    else if (/\bvandaag\b/i.test(rest)) date = days[0]
    else {
      const wd = WEEKDAYS.findIndex(w => new RegExp(`\\b${w}\\b`, 'i').test(rest))
      if (wd >= 0) date = days.find(d => fromISO(d).getDay() === wd)
    }
    const time = rest.match(/\b(?:om\s+)?(\d{1,2})(?:[:.](\d{2}))?\s*(?:uur)?\b(?=\s|$)/i)
    const hh = time ? Number(time[1]) : undefined
    const start = hh !== undefined && hh >= 7 && hh <= 21 ? `${String(hh).padStart(2, '0')}:${time![2] ?? '00'}` : undefined
    const title = rest
      .replace(/\b(vandaag|morgen|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)\b/gi, '')
      .replace(time && start ? time[0] : '§', '')
      .replace(/\bom\b/gi, '').replace(/\s{2,}/g, ' ').replace(/[,\s]+$/, '').trim()
    return { kind, prefill: { title: capFirst(title || rest), ...(date ? { date } : {}), ...(start ? { start, end: fromMinutes(toMinutes(start) + 60) } : {}) } }
  }
  return { kind, prefill: { title: capFirst(rest) } }
}
const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
const fromMinutes = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
