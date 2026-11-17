// Bewaard: notities, ideeën en dingen voor ooit. Geen taak, wel uit je hoofd.
import type { Domain, Note, NoteKind } from '~/types'

export const NOTE_KINDS: Record<NoteKind, { label: string, plural: string, icon: string, fill: string }> = {
  notitie: { label: 'Notitie', plural: 'Notities', icon: 'tabler:note', fill: 'bg-cat-admin' },
  idee: { label: 'Idee', plural: 'Ideeën', icon: 'tabler:sparkles', fill: 'bg-cat-focus' },
  ooit: { label: 'Ooit', plural: 'Ooit', icon: 'tabler:archive', fill: 'bg-surface-3' },
}

export function useNotes() {
  const { state } = useStore()
  const opps = useOpportunities()

  // Oudere opgeslagen state heeft nog geen notes
  if (!state.value.notes) state.value.notes = []
  const notes = computed(() => state.value.notes)
  const byKind = (k: NoteKind) => state.value.notes.filter(n => n.kind === k)

  function add(text: string, kind: NoteKind, extra: { clientId?: string, domain?: Domain } = {}) {
    const n: Note = { id: uid('n'), text: text.trim(), kind, createdAt: new Date().toISOString(), ...extra }
    state.value.notes.unshift(n)
    return n
  }

  function remove(id: string) {
    const idx = state.value.notes.findIndex(n => n.id === id)
    if (idx < 0) return () => {}
    const [n] = state.value.notes.splice(idx, 1)
    return () => { state.value.notes.splice(idx, 0, n!) }
  }

  /** Terug in de bak, om het toch een andere plek te geven. */
  function backToInbox(id: string) {
    const n = state.value.notes.find(x => x.id === id)
    if (!n) return
    remove(id)
    state.value.inbox.unshift({ id: uid('i'), text: n.text, createdAt: new Date().toISOString(), domain: n.domain })
  }

  function setKind(id: string, kind: NoteKind) {
    const n = state.value.notes.find(x => x.id === id)
    if (n) n.kind = kind
  }

  /** Een idee dat geld kan opleveren wordt een kans. */
  function toOpportunity(id: string) {
    const n = state.value.notes.find(x => x.id === id)
    if (!n) return null
    const o = opps.add({
      title: n.text.replace(/^idee:\s*/i, '').replace(/^\w/, c => c.toUpperCase()),
      source: 'Uit je ideeën',
      sourceClientIds: n.clientId ? [n.clientId] : [],
      confidence: 'laag',
      buildTime: 'nog onbekend',
      buildHours: 0,
      revenue: 0,
      why: 'Je schreef het zelf op. Ik houd in de gaten of het vaker terugkomt.',
      nextStep: 'Opschrijven voor wie dit iets oplost',
    })
    remove(id)
    return o
  }

  return { notes, byKind, add, remove, backToInbox, setKind, toOpportunity }
}
