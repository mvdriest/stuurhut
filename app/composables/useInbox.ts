export interface InboxItem {
  id: string
  userId: string
  tekst: string
  createdAt: string
}

export function useInbox() {
  const items = useState<InboxItem[]>('inbox-items', () => [])
  const pending = useState('inbox-pending', () => false)

  async function refresh() {
    pending.value = true
    try {
      items.value = await useRequestFetch()('/api/inbox')
      return items.value
    } finally {
      pending.value = false
    }
  }

  return { items, pending, refresh }
}
