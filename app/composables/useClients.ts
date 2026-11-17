import { guessDomain } from '~/utils/domain'
import type { Client, ClientStatus, ISODate, LeadStage, LostReason, Project } from '~/types'

export interface ClientInput {
  name: string
  contact: string
  sector: string
  status: ClientStatus
  nextStep: string
  projectName?: string
  projectBudget?: number
  /** Alleen bij status lead */
  leadStage?: LeadStage
  leadSource?: string
  leadFollowUp?: ISODate
  leadOpportunityId?: string
}

function leadFrom(i: ClientInput, prev?: Client['lead']): Client['lead'] {
  if (i.status !== 'lead' && !prev) return undefined
  const stage = i.leadStage ?? prev?.stage ?? 'gespot'
  const log = prev?.log ?? []
  if (i.status === 'lead' && stage !== prev?.stage) log.push({ date: todayISO(), stage })
  return {
    stage,
    log,
    source: i.leadSource?.trim() || undefined,
    followUp: i.leadFollowUp || undefined,
    opportunityId: i.leadOpportunityId || undefined,
  }
}

const TINTS: Client['tint'][] = ['copper', 'sea', 'green', 'sand']
/** Woorden die in veel bedrijfsnamen staan en niets zeggen */
const GENERIC = new Set(['installatie', 'studio', 'het', 'aan', 'van', 'de', 'den', 'praktijk', 'bedrijf'])

export function useClients() {
  const { state } = useStore()

  const clients = computed(() => state.value.clients)
  const projects = computed(() => state.value.projects)
  const byId = (id?: string) => state.value.clients.find(c => c.id === id)
  const projectsFor = (id: string) => state.value.projects.filter(p => p.clientId === id)

  function search(q: string, status: ClientStatus | 'alle') {
    const n = q.trim().toLowerCase()
    return state.value.clients.filter((c) => {
      if (status !== 'alle' && c.status !== status) return false
      if (!n) return true
      const hay = [c.name, c.contact, c.sector, ...projectsFor(c.id).map(p => p.name)].join(' ').toLowerCase()
      return hay.includes(n)
    })
  }

  function addNote(clientId: string, text: string) {
    const c = byId(clientId)
    if (!c) return
    c.timeline.unshift({ id: uid('tl'), kind: 'notitie', date: todayISO(), title: text, body: 'Uit Hoofd leeg' })
  }

  function toggleCommitment(clientId: string, id: string) {
    const c = byId(clientId)
    const cm = c?.commitments.find(x => x.id === id)
    if (cm) cm.done = !cm.done
  }

  /**
   * Welke klanten in een tekst genoemd kunnen worden, met een score.
   * Volledige naam en een woord dat alleen bij één klant voorkomt tellen zwaar.
   * Een voornaam of een woord dat meerdere klanten delen ("camping") telt licht:
   * dat is een hint, geen besluit.
   */
  function matchClients(text: string) {
    const t = ` ${text.toLowerCase()} `
    const all = state.value.clients
    const words = (s: string) => s.toLowerCase().split(/[^a-zà-ÿ0-9']+/).filter(w => w.length >= 4 && !GENERIC.has(w))
    const has = (w: string) => new RegExp(`(^|[^a-zà-ÿ])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-zà-ÿ]|$)`, 'i').test(t)
    const freq = new Map<string, number>()
    for (const c of all) for (const w of new Set(words(c.name))) freq.set(w, (freq.get(w) ?? 0) + 1)
    const firstNames = new Map<string, number>()
    for (const c of all) {
      const f = c.contact.split(' ')[0]?.toLowerCase()
      if (f) firstNames.set(f, (firstNames.get(f) ?? 0) + 1)
    }
    const personal = guessDomain(text) === 'prive'
    return all.map((c) => {
      let score = 0
      if (t.includes(c.name.toLowerCase())) score = 100
      else if (c.contact && t.includes(c.contact.toLowerCase())) score = 80
      else {
        for (const w of words(c.name)) if (has(w)) score = Math.max(score, freq.get(w) === 1 ? 60 : 20)
        const first = c.contact.split(' ')[0]?.toLowerCase()
        if (!personal && first && first.length >= 3 && has(first)) score = Math.max(score, firstNames.get(first) === 1 ? 35 : 15)
      }
      if (score && c.status === 'verloren') score -= 10
      return { client: c, score }
    }).filter(m => m.score > 0).sort((a, b) => b.score - a.score)
  }

  /** Alleen een klant als het duidelijk is. Twijfel = geen klant, dan kies je zelf. */
  function matchInText(text: string) {
    const [top, second] = matchClients(text)
    if (!top || top.score < 50) return undefined
    if (second && second.score >= top.score) return undefined
    return top.client
  }

  // ---------- Aanmaken, wijzigen, verwijderen ----------
  function addClient(i: ClientInput): Client {
    const id = uid('c')
    const c: Client = {
      id,
      name: i.name.trim(),
      contact: i.contact.trim(),
      sector: i.sector.trim(),
      status: i.status,
      tint: TINTS[state.value.clients.length % TINTS.length]!,
      nextStep: i.nextStep.trim() || 'Kennismaken en wensen ophalen',
      nextStepDurationMin: 45,
      commitments: [],
      timeline: [{ id: uid('tl'), kind: 'notitie', date: todayISO(), title: i.status === 'lead' ? 'Lead aangemaakt' : 'Klant aangemaakt' }],
      lead: leadFrom(i),
    }
    state.value.clients.unshift(c)
    if (i.projectName?.trim()) {
      state.value.projects.push({ id: uid('pr'), clientId: id, name: i.projectName.trim(), status: i.status, progress: 0, budget: i.projectBudget ?? 0, hourlyRate: MEERWERK_TARIEF, billedHours: 0 })
    }
    return state.value.clients[0]!
  }

  function updateClient(id: string, i: ClientInput) {
    const c = byId(id)
    if (!c) return
    const oldStep = c.nextStep
    Object.assign(c, { name: i.name.trim(), contact: i.contact.trim(), sector: i.sector.trim(), status: i.status, nextStep: i.nextStep.trim() || c.nextStep, lead: leadFrom(i, c.lead) })
    // De volgende stap staat in Supabase bij het traject (zo kan Telegram hem ook bijwerken)
    const own = projectsFor(id).find(p => p.nextStep && p.nextStep === oldStep) ?? projectsFor(id).find(p => p.status !== 'afgerond')
    if (own && c.nextStep !== oldStep) own.nextStep = c.nextStep
    const p = projectsFor(id)[0]
    if (p && i.projectName?.trim()) Object.assign(p, { name: i.projectName.trim(), budget: i.projectBudget ?? p.budget, status: i.status })
    else if (!p && i.projectName?.trim()) state.value.projects.push({ id: uid('pr'), clientId: id, name: i.projectName.trim(), status: i.status, progress: 0, budget: i.projectBudget ?? 0, hourlyRate: MEERWERK_TARIEF, billedHours: 0 })
  }

  // ---------- Verloren ----------
  /** Melden dat je een lead of klant kwijt bent. Lopende projecten stoppen mee. */
  function markLost(id: string, reason: LostReason, note?: string) {
    const c = byId(id)
    if (!c || c.status === 'verloren') return
    c.lost = { date: todayISO(), reason, note: note?.trim() || undefined, from: c.status }
    if (c.lead) c.lead.followUp = undefined
    c.status = 'verloren'
    for (const p of projectsFor(id).filter(p => p.status !== 'afgerond')) p.status = 'verloren'
    // Opvolgtaken hebben geen zin meer
    state.value.tasks = state.value.tasks.filter(t => !(t.clientId === id && !t.done && t.title.startsWith('Opvolgen:')))
    c.timeline.unshift({ id: uid('tl'), kind: 'notitie', date: todayISO(), title: c.lost.from === 'lead' ? 'Lead verloren' : 'Klant verloren', body: [cap(reason), c.lost.note].filter(Boolean).join('. ') })
  }

  /** Toch niet verloren: terug naar waar hij stond. */
  function restore(id: string) {
    const c = byId(id)
    if (!c?.lost) return
    const from = c.lost.from
    c.status = from
    for (const p of projectsFor(id).filter(p => p.status === 'verloren')) p.status = from
    c.lost = undefined
    c.timeline.unshift({ id: uid('tl'), kind: 'notitie', date: todayISO(), title: 'Teruggehaald' })
  }

  const lostIn = (from: ISODate, to: ISODate) => state.value.clients.filter(c => c.status === 'verloren' && c.lost && c.lost.date >= from && c.lost.date <= to)

  /** Verwijdert klant en projecten. Geeft een functie terug om het ongedaan te maken. */
  function removeClient(id: string) {
    const idx = state.value.clients.findIndex(c => c.id === id)
    if (idx < 0) return () => {}
    const [client] = state.value.clients.splice(idx, 1)
    const projects: Project[] = state.value.projects.filter(p => p.clientId === id)
    state.value.projects = state.value.projects.filter(p => p.clientId !== id)
    return () => {
      state.value.clients.splice(idx, 0, client!)
      state.value.projects.push(...projects)
    }
  }

  return { clients, projects, byId, projectsFor, search, addNote, toggleCommitment, matchClients, matchInText, addClient, updateClient, removeClient, markLost, restore, lostIn }
}
