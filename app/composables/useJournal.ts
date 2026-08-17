export interface JournalEntry {
  id: string
  userId: string
  inhoud: string
  bron: 'handmatig' | 'telegram'
  createdAt: string
}

export function useJournal() {
  const entries = useState<JournalEntry[]>('journal-entries', () => [])
  const pending = useState('journal-entries-pending', () => false)

  async function refresh() {
    pending.value = true
    try {
      entries.value = await useRequestFetch()('/api/journal')
      return entries.value
    } finally {
      pending.value = false
    }
  }

  return { entries, pending, refresh }
}
