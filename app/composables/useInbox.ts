import type { Destination, Domain, EditorRequest, InboxItem, NoteKind } from '~/types'
import { guessDomain } from '~/utils/domain'
import { adviseInbox, type StuurmanContext } from '~/utils/stuurman.mock'

export function useInbox() {
  const { state } = useStore()
  const tasks = useTasks()
  const cal = useCalendar()
  const clients = useClients()
  const opps = useOpportunities()
  const notes = useNotes()

  const items = computed(() => state.value.inbox)
  const count = computed(() => state.value.inbox.length)

  const ctx = (): StuurmanContext => ({
    state: state.value,
    slot: (d, o) => cal.findSlot(d, o ?? {}),
    load: d => cal.dayLoad(d),
    clientName: id => clients.byId(id)?.name ?? '',
  })

  function add(text: string) {
    const t = text.trim()
    if (!t) return null
    const item: InboxItem = { id: uid('i'), text: t, createdAt: new Date().toISOString() }
    state.value.inbox.unshift(item)
    return item
  }

  /** Privé of zakelijk: zelf gekozen, anders geraden. */
  function domainFor(item: InboxItem): Domain {
    return item.domain ?? guessDomain(item.text)
  }
  function toggleDomain(id: string) {
    const it = state.value.inbox.find(i => i.id === id)
    if (it) it.domain = domainFor(it) === 'prive' ? 'zakelijk' : 'prive'
  }

  /** Klanten die genoemd kunnen worden, beste eerst. Voor de keuzelijst. */
  const candidates = (item: InboxItem) => clients.matchClients(item.text).filter(m => m.score >= 15).map(m => m.client)

  function advice(item: InboxItem) {
    let a = adviseInbox(item.text, ctx(), t => clients.matchInText(t))
    // Twijfel over de klant: niet gokken, maar vragen
    if (a.destination === 'notitie') {
      const maybe = candidates(item)
      if (maybe.length) {
        const names = maybe.slice(0, 2).map(c => c.name)
        a = { ...a, destination: 'klant', clientId: undefined, why: `Gaat dit over ${names.join(' of ')}? Ik weet het niet zeker, dus kies jij.` }
      }
    }
    const slot = a.destination === 'inplannen' ? cal.findSlot(a.durationMin || 30, { fromIndex: a.later ? 4 : 0, domain: domainFor(item) }) : null
    return { ...a, slot, client: clients.byId(a.clientId) }
  }

  function remove(id: string) {
    const idx = state.value.inbox.findIndex(i => i.id === id)
    if (idx < 0) return () => {}
    const [removed] = state.value.inbox.splice(idx, 1)
    return () => { state.value.inbox.splice(idx, 0, removed!) }
  }

  /** Bestemmingen die eerst een formulier openen: jij vult aan, dan pas weg uit de bak. */
  function editorFor(item: InboxItem, dest: Destination, clientId?: string): EditorRequest | null {
    const cap1 = (s: string) => s.replace(/^\w/, c => c.toUpperCase())
    const text = item.text.replace(/^(lead|tip( van [^:]+)?|opdracht|idee):\s*/i, '').trim()
    if (dest === 'opdracht') return { kind: 'opdracht', prefill: { title: cap1(text), clientId: clientId ?? advice(item).clientId } }
    if (dest === 'admin') return { kind: 'admin', prefill: { title: cap1(text) } }
    if (dest === 'lead') {
      const via = item.text.match(/^tip van ([^:]+):/i)?.[1]
      return { kind: 'klant', prefill: { status: 'lead', name: '', leadStage: 'gespot', leadSource: via ? `Tip van ${via.trim()}` : 'Uit Hoofd leeg', nextStep: cap1(text) } }
    }
    return null
  }

  /** Item naar zijn bestemming. Geeft een korte zin terug voor de melding. */
  function route(item: InboxItem, dest: Destination, clientId?: string): { text: string, to?: string } {
    const a = advice(item)
    const cid = clientId ?? (dest === a.destination ? a.clientId : undefined)
    if (dest === 'inplannen') {
      const dur = a.destination === 'inplannen' ? a.durationMin : 30
      const domain = domainFor(item)
      const slot = cal.findSlot(dur, { fromIndex: a.destination === 'inplannen' && a.later ? 4 : 0, domain })
      tasks.add({ title: item.text, durationMin: dur, kind: a.destination === 'inplannen' ? a.kind : 'taak', clientId: cid, domain, ...(slot ? { date: slot.date, start: slot.start } : {}) })
      remove(item.id)
      return { text: slot ? `Ingepland ${relDay(slot.date)} om ${slot.start}.` : 'In Week bij nog in te plannen.', to: '/week' }
    }
    if (dest === 'notitie' || dest === 'idee' || dest === 'ooit') {
      notes.add(item.text, dest as NoteKind, { clientId: cid, domain: domainFor(item) })
      remove(item.id)
      const where = { notitie: 'notities', idee: 'ideeën', ooit: 'Ooit' }[dest]
      return { text: `Bewaard bij ${where}.`, to: '/hoofd-leeg?bewaard=1' }
    }
    if (dest === 'klant') {
      // Nooit gokken: zonder gekozen klant gebeurt er niets
      if (!cid) return { text: 'Kies eerst een klant.' }
      const target = cid
      clients.addNote(target, item.text)
      remove(item.id)
      return { text: `Bij ${clients.byId(target)?.name} gezet.`, to: `/klanten?id=${target}` }
    }
    if (dest === 'kans') {
      opps.add({
        title: item.text.replace(/^idee:\s*/i, '').replace(/^\w/, c => c.toUpperCase()),
        source: 'Uit Hoofd leeg',
        sourceClientIds: cid ? [cid] : [],
        confidence: 'laag',
        buildTime: 'nog onbekend',
        buildHours: 0,
        revenue: 0,
        why: 'Je schreef het zelf op. Ik houd in de gaten of het vaker terugkomt.',
        nextStep: 'Opschrijven voor wie dit iets oplost',
      })
      remove(item.id)
      return { text: 'Bewaard als kans.', to: '/kansen' }
    }
    remove(item.id)
    return { text: 'Weggegooid.' }
  }

  function sortClients() {
    let n = 0
    for (const item of [...state.value.inbox]) {
      const a = advice(item)
      if (a.destination === 'klant' && a.clientId) {
        route(item, 'klant', a.clientId)
        n++
      }
    }
    return n
  }

  return { items, count, add, advice, candidates, editorFor, remove, route, sortClients, domainFor, toggleDomain }
}
