// Kansen, financiën en ritme. Alle bedragen en namen zijn verzonnen.
import type { Goal, Invoice, LifeItem, Opportunity, Quote, RhythmDay, Routine, SleepPlan, Subscription, TimeEntry, Transaction } from '~/types'
import { clock, clockMin, FALL_ASLEEP, wakeTarget } from '~/utils/sleep'
import { addDays, fromISO, todayISO, toISO } from '~/utils/date'

export function seedOpportunities(): Opportunity[] {
  return [
    {
      id: 'o1',
      title: 'Eenvoudig reserveringssysteem voor kleine bedrijven',
      source: 'Terug in drie klantgesprekken',
      sourceClientIds: ['camping', 'plein', 'mira'],
      confidence: 'hoog',
      buildTime: 'ongeveer 3 weken',
      buildHours: 100,
      revenue: 14400,
      why: 'Camping Aan de Rijn, Fysio Het Plein en Atelier Mira vroegen er los van elkaar naar. Ze willen allemaal hetzelfde: zelf een plek of tijd laten kiezen, zonder duur pakket.',
      nextStep: 'Twee ochtenden uittrekken voor een eerste schets en een prijsidee',
      status: 'onderzoeken',
      featured: true,
    },
    {
      id: 'o2',
      title: 'Bestelpagina als vast pakket voor bakkers',
      source: 'Project Bakkerij De Korenaar',
      sourceClientIds: ['korenaar'],
      confidence: 'middel',
      buildTime: 'ongeveer 2 weken',
      buildHours: 60,
      revenue: 6000,
      why: 'De bestelpagina leverde op één zaterdag 38 bestellingen op. Andere bakkers in de regio hebben vaak hetzelfde probleem.',
      nextStep: 'Henk vragen of je de bestelpagina als voorbeeld mag tonen',
      status: 'nieuw',
    },
    {
      id: 'o3',
      title: 'Workshop "zelf je site bijhouden"',
      source: 'Afronding Atelier Mira',
      sourceClientIds: ['mira'],
      confidence: 'middel',
      buildTime: '3 dagen voorbereiding',
      buildHours: 24,
      revenue: 2400,
      why: 'Mira wilde graag zelf leren aanpassen. Een kleine groepsworkshop scheelt jou losse vragen achteraf.',
      nextStep: 'Een datum in het voorjaar prikken en drie oud-klanten polsen',
      status: 'nieuw',
    },
    {
      id: 'o4',
      title: 'Fotografie doorverkopen via een partner',
      source: 'Meeting Studio Noordlicht',
      sourceClientIds: ['noordlicht'],
      confidence: 'laag',
      buildTime: '2 dagen afstemmen',
      buildHours: 16,
      revenue: 1200,
      why: 'Sanne vroeg ernaar, maar het is eenmalig en het vraagt veel afstemming voor een kleine marge.',
      nextStep: 'Eerst kijken of een tweede klant hierom vraagt',
      status: 'nieuw',
    },
  ]
}

const MONTH_IN: Record<string, number>[] = [
  { korenaar: 2100, vandijk: 2850, mira: 1500 },
  { korenaar: 1320, camping: 2000, mira: 1500 },
  { vandijk: 4680, camping: 3000, mira: 1500 },
  { korenaar: 2240, vandijk: 2500, camping: 2500 },
  { korenaar: 1320, vandijk: 2350, mira: 1960 },
  { camping: 3500, korenaar: 1320, vandijk: 2070 },
]
const MONTH_OUT = [3120, 2980, 3460, 3210, 3050, 2740]

export function seedSubscriptions(): Subscription[] {
  return [
    { id: 's1', name: 'Werkplek in de gedeelde studio', monthly: 475, kind: 'vaste last' },
    { id: 's2', name: 'Pensioenpot', monthly: 400, kind: 'vaste last' },
    { id: 's3', name: 'Bedrijfsverzekering', monthly: 86.4, kind: 'vaste last' },
    { id: 's4', name: 'Ontwerpsoftware', monthly: 62, kind: 'abonnement' },
    { id: 's5', name: 'Hosting klantensites', monthly: 48, kind: 'abonnement', note: 'Je rekent hier zelf niets voor door' },
    { id: 's6', name: 'Telefoon en data', monthly: 32.5, kind: 'abonnement' },
    { id: 's7', name: 'Boekhoudpakket', monthly: 29, kind: 'abonnement' },
    { id: 's8', name: 'Fotobank', monthly: 24, kind: 'abonnement', note: 'Drie maanden niet gebruikt' },
    { id: 's9', name: 'Lettertypenlicentie', monthly: 15, kind: 'abonnement' },
    { id: 's10', name: 'Cloudopslag', monthly: 9.99, kind: 'abonnement' },
  ]
}

export function seedTransactions(subs: Subscription[]): Transaction[] {
  const now = new Date()
  const out: Transaction[] = []
  for (let k = 0; k < 6; k++) {
    const monthsBack = 5 - k
    const isCurrent = monthsBack === 0
    const day = (d: number) => {
      const date = new Date(now.getFullYear(), now.getMonth() - monthsBack, d)
      if (isCurrent && date > now) return toISO(now)
      return toISO(date)
    }
    let i = 0
    for (const [clientId, amount] of Object.entries(MONTH_IN[k]!)) {
      out.push({ id: `tx-${k}-in-${clientId}`, date: day(4 + i * 7), amount, label: 'Betaling factuur', clientId, category: 'omzet' })
      i++
    }
    let spent = 0
    for (const s of subs) {
      out.push({ id: `tx-${k}-${s.id}`, date: day(1), amount: -s.monthly, label: s.name, category: s.kind === 'vaste last' ? 'vaste lasten' : 'abonnement' })
      spent += s.monthly
    }
    out.push({ id: `tx-${k}-overig`, date: day(9), amount: -(MONTH_OUT[k]! - spent), label: 'Overige uitgaven', category: 'overig' })
  }
  return out
}

export function seedInvoices(): Invoice[] {
  const t = todayISO()
  return [
    { id: 'f1', number: 'F-2026-041', clientId: 'vandijk', amount: 2850, sentOn: addDays(t, -42), due: addDays(t, -12) },
    { id: 'f2', number: 'F-2026-044', clientId: 'korenaar', amount: 1320, sentOn: addDays(t, -21), due: addDays(t, 9) },
    { id: 'f3', number: 'F-2026-045', clientId: 'mira', amount: 960, sentOn: addDays(t, -9), due: addDays(t, 21) },
  ]
}

/** Het slaapplan: begonnen twee weken geleden, van 09:30 naar 08:00. */
export function seedSleepPlan(): SleepPlan {
  const t = todayISO()
  const wd = fromISO(t).getDay()
  const monday = addDays(t, (wd === 0 ? -6 : 1 - wd) - 14)
  // Twee weken gelukt, dus twee keer een stap verder. Hoe vaak precies, vult de seed in na het ritme.
  const weeks: SleepPlan['weeks'] = {
    [monday]: { wake: '09:15', decision: 'start' },
    [addDays(monday, 7)]: { wake: '09:00', decision: 'stap' },
    [addDays(monday, 14)]: { wake: '08:45', decision: 'stap' },
  }
  return { startWake: '09:30', goalWake: '08:00', startedOn: monday, stepMin: 15, needH: 8, windDownMin: 90, weeks, morning: { firstBlock: false, offsetMin: 45, blockMin: 90 } }
}

/**
 * Acht weken ritme, eindigend gisteren. Deterministisch zodat het elke keer hetzelfde voelt.
 * Slaap gaat over de nacht vóór de dag. Het verhaal in de cijfers: je stond rond 09:30 op,
 * sinds twee weken schuift dat per week een kwartier op. Je bedtijd loopt nog wat achter,
 * en op avonden dat je doorwerkt ga je later naar bed.
 */
export function seedRhythm(plan: SleepPlan = seedSleepPlan()): RhythmDay[] {
  let s = 7
  const rand = () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
  let s2 = 23
  const r2 = () => {
    s2 = (s2 * 16807) % 2147483647
    return (s2 - 1) / 2147483646
  }
  const days: RhythmDay[] = []
  const t = todayISO()
  for (let i = 56; i >= 1; i--) {
    const date = addDays(t, -i)
    const wd = fromISO(date).getDay()
    const weekend = wd === 0 || wd === 6
    const lateWeeks = i <= 14
    rand() // vaste volgorde van de reeks, zodat beweging en werk gelijk blijven
    const moveMin = Math.round(weekend ? 40 + rand() * 50 : 10 + rand() * 45)
    const workH = weekend ? Math.round(rand() * 2 * 2) / 2 : Math.round((7.4 + rand() * 1.6 + (lateWeeks ? 1.3 : 0)) * 2) / 2

    // Slaap
    const inPlan = date >= plan.startedOn
    const target = clockMin(wakeTarget(plan, date))
    let woke = inPlan ? target - 10 + r2() * 20 + (r2() < 0.15 ? 30 : 0) : 9 * 60 + 30 - 10 + r2() * 35
    if (weekend) woke += 30 + r2() * 30
    const prevWorkday = [1, 2, 3, 4, 5].includes(fromISO(addDays(date, -1)).getDay())
    const worked = prevWorkday && r2() < 0.22 + (lateWeeks ? 0.33 : 0)
    let bed = (inPlan ? 60 : 80) + (r2() - 0.5) * 70 + ([0, 6].includes(wd) ? 30 : 0)
    if (worked) bed += 50 + r2() * 45
    const lastWork = worked ? Math.min(-30, Math.round((bed - 75 - r2() * 45) / 15) * 15) : null
    woke = Math.round(woke / 5) * 5
    bed = Math.round(bed / 5) * 5
    const sleepH = Math.round(Math.min(9.5, Math.max(4.8, (woke - bed - FALL_ASLEEP) / 60)) * 10) / 10
    let rested: 1 | 2 | 3 = sleepH >= 7.9 ? 3 : sleepH >= 7.1 ? 2 : 1
    if (lastWork !== null && rested === 3 && r2() < 0.4) rested = 2

    // Een vast ritme geeft wat extra energie: op tijd op in het plan telt mee
    const onTime = inPlan && !weekend && woke <= target + 15
    let e = 3 + (sleepH - 7) * 1.1 + (moveMin > 35 ? 0.5 : 0) + (onTime ? 0.6 : 0) + (rand() - 0.5) * 0.8
    e = Math.max(1, Math.min(5, Math.round(e)))
    days.push({ date, sleepH, moveMin, energy: e as RhythmDay['energy'], workH, bed: clock(bed), woke: clock(woke), rested, lastWork: lastWork === null ? undefined : clock(lastWork) })
  }
  return days
}

/**
 * Routines met zes weken geschiedenis, afgeleid van het ritme zodat de patronen kloppen:
 * wandelen sneuvelt op lange werkdagen, de telefoon vergeten kost slaap,
 * sporten sla je over na een korte nacht.
 */
export function seedRoutines(rhythm: RhythmDay[]): Routine[] {
  let s = 11
  const rand = () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
  const byDate = new Map(rhythm.map(d => [d.date, d]))
  const routines: Routine[] = [
    { id: 'r1', name: 'Wandelen na de lunch', cue: 'Na de lunch, een kwartier', why: '’s Middags scherp blijven', goal: 5, days: [1, 2, 3, 4, 5], icon: 'tabler:walk', log: {}, domain: 'prive' },
    { id: 'r2', name: 'Telefoon weg om half elf', cue: '22:30, telefoon in de keuken', why: 'Beter slapen', goal: 7, days: [0, 1, 2, 3, 4, 5, 6], icon: 'tabler:moon', log: {}, domain: 'prive' },
    { id: 'r3', name: 'Week afsluiten', cue: 'Vrijdag 16:00', why: 'Met een leeg hoofd het weekend in', goal: 1, days: [5], icon: 'tabler:briefcase', log: {}, domain: 'zakelijk' },
    { id: 'r4', name: 'Sporten', cue: 'Dinsdag en donderdag 07:30', why: 'Energie en een sterke rug', goal: 2, days: [2, 4], icon: 'tabler:bolt', log: {}, domain: 'prive' },
  ]
  for (const d of rhythm) {
    const wd = fromISO(d.date).getDay()
    const next = byDate.get(addDays(d.date, 1))
    // Wandelen
    if (routines[0]!.days.includes(wd)) {
      const busy = d.workH > 8.5
      const done = rand() < (busy ? 0.25 : 0.85)
      routines[0]!.log[d.date] = done ? { done } : { done, reason: busy ? 'geen tijd' : rand() < 0.5 ? 'omstandigheden' : 'geen zin' }
    }
    // Telefoon weg: gemist → korte nacht erna
    const shortNight = next ? next.sleepH < 7.2 : rand() < 0.3
    routines[1]!.log[d.date] = shortNight ? { done: false, reason: rand() < 0.75 ? 'vergeten' : 'geen zin' } : { done: true }
    // Week afsluiten
    if (wd === 5) routines[2]!.log[d.date] = rand() < 0.5 ? { done: true } : { done: false, reason: 'geen tijd' }
    // Sporten: na een korte nacht te moe
    if (routines[3]!.days.includes(wd)) {
      const tired = d.sleepH < 7.2
      routines[3]!.log[d.date] = (tired ? rand() < 0.2 : rand() < 0.9) ? { done: true } : { done: false, reason: tired ? 'te moe' : 'omstandigheden' }
    }
  }
  return routines
}

export function seedGoals(): Goal[] {
  return [
    { id: 'g1', title: 'Maandomzet', kind: 'geld', current: 0, target: 8000, period: 'deze maand', link: '/financien' },
    { id: 'g2', title: 'Nieuwe klanten', kind: 'aantal', current: 1, target: 3, period: 'dit kwartaal', link: '/klanten' },
    { id: 'g3', title: 'Reserveringsmodule als product', kind: 'mijlpaal', current: 1, target: 4, period: 'voor maart', link: '/kansen', steps: ['Getoetst bij klanten', 'Eerste schets', 'Prijs bepalen', 'Eerste klant live'] },
    { id: 'g4', title: 'Werkweek', kind: 'grens', current: 0, target: 42, period: 'max. uur per week', link: '/ritme' },
    { id: 'g5', title: 'Zomervakantie geregeld', kind: 'mijlpaal', current: 1, target: 3, period: 'voor februari', link: '/week', steps: ['Bestemming kiezen', 'Weken vrij blokken', 'Boeken'], domain: 'prive' },
    { id: 'g6', title: 'Avonden zonder werk', kind: 'aantal', current: 0, target: 5, period: 'komende 5 werkdagen', link: '/week', domain: 'prive' },
  ]
}

/** Uren op projecten, zes weken terug. Van Dijk loopt over budget, Mira liep uit. */
export function seedTimeEntries(): TimeEntry[] {
  const totals: Record<string, number> = { 'pr-korenaar': 98, 'pr-vandijk': 188, 'pr-mira': 95, 'pr-camping': 118 }
  const notes = ['Ontwerp', 'Bouwen', 'Overleg', 'Testen', 'Aanpassingen', 'Content']
  const out: TimeEntry[] = []
  const t = todayISO()
  let k = 0
  for (const [projectId, total] of Object.entries(totals)) {
    // Werkdagen in de afgelopen tien weken, een deel ervan aan dit project
    const dates: string[] = []
    for (let i = 70; i >= 1; i--) {
      const date = addDays(t, -i)
      const wd = fromISO(date).getDay()
      if (wd !== 0 && wd !== 6 && (i + projectId.length) % 4 !== 0) dates.push(date)
    }
    const per = total / dates.length
    let left = total
    dates.forEach((date, idx) => {
      if (left <= 0) return
      const h = idx === dates.length - 1 ? left : Math.min(left, Math.max(0.5, Math.round((per + [-1, 0.5, 0, 1, -0.5][k++ % 5]!) * 2) / 2))
      out.push({ id: `te-${projectId}-${idx}`, projectId, date, hours: h, note: notes[k % notes.length] })
      left -= h
    })
  }
  return out
}

export function seedQuotes(): Quote[] {
  const t = todayISO()
  return [
    { id: 'q1', clientId: 'noordlicht', title: 'Huisstijl en website', amount: 6000, status: 'concept' },
    { id: 'q2', clientId: 'plein', title: 'Website met online afspraken', amount: 7800, status: 'verstuurd', sentOn: addDays(t, -6) },
    { id: 'q3', clientId: 'camping', title: 'Meerwerk: reserveren op de site', amount: 3200, status: 'verstuurd', sentOn: addDays(t, -2) },
    { id: 'q4', clientId: 'mira', title: 'Workshopagenda', amount: 6460, status: 'akkoord', sentOn: addDays(t, -95), decidedOn: addDays(t, -88) },
    { id: 'q5', clientId: 'vandijk', title: 'Klantportaal storingen', amount: 14450, status: 'akkoord', sentOn: addDays(t, -70), decidedOn: addDays(t, -66) },
  ]
}

/** Levensadmin: dingen die terugkomen. */
export function seedLife(): LifeItem[] {
  const t = todayISO()
  return [
    { id: 'l1', title: 'APK auto', category: 'auto', due: addDays(t, 18), repeatMonths: 12, remindDays: 21, note: 'Garage aan de Dijk, vorig jaar 2 weken van tevoren gebeld' },
    { id: 'l2', title: 'Sportschool: opzegtermijn verloopt', category: 'abonnement', due: addDays(t, 9), remindDays: 14, note: 'Gebruik je hem nog? Anders loopt hij een jaar door.' },
    { id: 'l3', title: 'Autoverzekering verlengt', category: 'verzekering', due: addDays(t, 25), repeatMonths: 12, remindDays: 30, note: 'Even vergelijken voor hij automatisch verlengt' },
    { id: 'l4', title: 'Zorgverzekering: overstappen of blijven', category: 'verzekering', due: addDays(t, 50), repeatMonths: 12, remindDays: 30 },
    { id: 'l5', title: 'Tandarts controle', category: 'gezondheid', due: addDays(t, 40), repeatMonths: 6, remindDays: 21 },
    { id: 'l6', title: 'Cv-ketel onderhoud', category: 'huis', due: addDays(t, 70), repeatMonths: 12, remindDays: 30 },
    { id: 'l7', title: 'Paspoort verloopt', category: 'documenten', due: addDays(t, 150), repeatMonths: 120, remindDays: 90, note: 'Op tijd aanvragen, zeker voor de zomervakantie' },
    { id: 'l8', title: 'Rijbewijs verlengen', category: 'documenten', due: addDays(t, 420), repeatMonths: 120, remindDays: 60 },
  ]
}
