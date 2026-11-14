import type { Client, ClientStatus, Project } from '~/types'

export interface ClientInput {
  name: string
  contact: string
  sector: string
  status: ClientStatus
  nextStep: string
  projectName?: string
  projectBudget?: number
}

const TINTS: Client['tint'][] = ['copper', 'sea', 'green', 'sand']

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

  /** Klanten herkennen in vrije tekst (voor Hoofd leeg). */
  function matchInText(text: string) {
    const t = text.toLowerCase()
    const generic = new Set(['installatie', 'het', 'aan', 'van', 'de'])
    return state.value.clients.find((c) => {
      const words = c.name.toLowerCase().split(/\s+/).filter(w => w.length >= 4 && !generic.has(w))
      const word = (w: string) => new RegExp(`(^|[^a-zà-ÿ])${w}`, 'i').test(t)
      return t.includes(c.name.toLowerCase()) || words.some(word) || new RegExp(`(^|[^a-zà-ÿ])${c.contact.split(' ')[0]!.toLowerCase()}([^a-zà-ÿ]|$)`, 'i').test(t)
    })
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
      timeline: [{ id: uid('tl'), kind: 'notitie', date: todayISO(), title: 'Klant aangemaakt' }],
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
    Object.assign(c, { name: i.name.trim(), contact: i.contact.trim(), sector: i.sector.trim(), status: i.status, nextStep: i.nextStep.trim() || c.nextStep })
    // De volgende stap staat in Supabase bij het traject (zo kan Telegram hem ook bijwerken)
    const own = projectsFor(id).find(p => p.nextStep && p.nextStep === oldStep) ?? projectsFor(id).find(p => p.status !== 'afgerond')
    if (own && c.nextStep !== oldStep) own.nextStep = c.nextStep
    const p = projectsFor(id)[0]
    if (p && i.projectName?.trim()) Object.assign(p, { name: i.projectName.trim(), budget: i.projectBudget ?? p.budget, status: i.status })
    else if (!p && i.projectName?.trim()) state.value.projects.push({ id: uid('pr'), clientId: id, name: i.projectName.trim(), status: i.status, progress: 0, budget: i.projectBudget ?? 0, hourlyRate: MEERWERK_TARIEF, billedHours: 0 })
  }

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

  return { clients, projects, byId, projectsFor, search, addNote, toggleCommitment, matchInText, addClient, updateClient, removeClient }
}
