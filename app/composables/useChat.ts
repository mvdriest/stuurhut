// Chat met Stuurman. Opdrachten ("Nieuwe afspraak: …", "Onthoud: …", dagstart) handelt de app zelf af;
// al het andere beantwoordt de AI met jouw data. In de demo, of als de AI niet bereikbaar is: vaste antwoorden.
import type { ChatMessage } from '~/types'
import { chatReply, CHAT_STARTERS, type ChatContext } from '~/utils/stuurman.mock'

const typing = ref(false)

export function useChat() {
  const { state, mode } = useStore()
  const stuurman = useStuurman()
  const cal = useCalendar()
  const tasks = useTasks()
  const finance = useFinance()
  const inbox = useInbox()
  const R = useRoutines()
  const { goals } = useGoals()
  const editor = useEditor()

  const messages = computed(() => state.value.chat)
  const starters = computed(() => CHAT_STARTERS[stuurman.page.value])

  function context(): ChatContext {
    const today = todayISO()
    const items = cal.dayItems(today)
    const now = nowMin()
    const next = items.find(i => toMin(i.start) >= now)
    const weakest = R.routines.value.map(r => ({ r, w: R.week(r), reasons: R.reasons(r) })).sort((a, b) => a.w.done / a.w.goal - b.w.done / b.w.goal)[0]
    return {
      state: state.value,
      page: stuurman.page.value,
      slot: (d, o) => cal.findSlot(d, o ?? {}),
      load: d => cal.dayLoad(d),
      suggestions: stuurman.all.value,
      today: {
        meetings: items.filter(i => i.type === 'event').length,
        tasks: tasks.tasks.value.filter(t => t.date === today).length,
        done: tasks.tasks.value.filter(t => t.date === today && t.done).length,
        next: next ? { start: next.start, title: next.title } : undefined,
        noTime: tasks.tasks.value.filter(t => t.important && !t.date && !t.done).map(t => t.title),
      },
      money: {
        month: finance.thisMonth.value.name,
        income: finance.thisMonth.value.income,
        goal: goals.value.find(g => g.id === 'g1')?.target ?? 8000,
        open: finance.openTotal.value,
        late: finance.openInvoices.value.filter(i => i.daysLate > 0).map(i => ({ client: i.client.name, days: i.daysLate, amount: i.amount })),
      },
      ritme: { score: R.score.value.now, weakest: weakest ? { name: weakest.r.name, done: weakest.w.done, goal: weakest.w.goal, reason: weakest.reasons.list[0]?.reason } : undefined },
    }
  }

  function push(m: Omit<ChatMessage, 'id' | 'at'>) {
    state.value.chat.push({ ...m, id: uid('m'), at: new Date().toISOString() })
  }

  function send(text: string) {
    const t = text.trim()
    if (!t || typing.value) return
    push({ role: 'user', text: t })
    typing.value = true
    const reply = chatReply(t, context())
    const doetIets = !!(reply.form || reply.capture || reply.suggestion)
    if (mode.value === 'echt' && !doetIets) {
      const geschiedenis = state.value.chat.slice(-13, -1).map(m => ({ rol: m.role, tekst: m.text }))
      $fetch<{ tekst: string, chips: string[] }>('/api/stuurman/chat', {
        method: 'POST',
        body: { vraag: t, geschiedenis, context: stuurmanContext(state.value, { page: stuurman.page.value, suggestions: stuurman.all.value }) },
      })
        .then(r => push({ role: 'stuurman', text: r.tekst, chips: r.chips.length ? r.chips : undefined }))
        .catch(() => push({ role: 'stuurman', text: `Ik kan de AI nu niet bereiken. ${reply.text}`, chips: reply.chips }))
        .finally(() => { typing.value = false })
      return
    }
    // Even "nadenken": kort, zodat het niet ophoudt.
    setTimeout(() => {
      if (reply.capture) inbox.add(reply.capture)
      push({ role: 'stuurman', text: reply.text, suggestion: reply.suggestion, chips: reply.chips, form: reply.form })
      typing.value = false
      if (reply.form) editor.open(reply.form, () => push({ role: 'stuurman', text: 'Staat erin.' }))
    }, prefersReduced() ? 0 : 650)
  }

  function acceptIn(m: ChatMessage) {
    if (!m.suggestion) return
    stuurman.accept(m.suggestion)
    const stored = state.value.chat.find(x => x.id === m.id)
    if (stored) delete stored.suggestion
    push({ role: 'stuurman', text: 'Gedaan.' })
  }

  function clear() {
    state.value.chat = []
  }

  function openForm(m: ChatMessage) {
    if (m.form) editor.open(m.form, () => push({ role: 'stuurman', text: 'Staat erin.' }))
  }

  return { messages, starters, typing, send, acceptIn, openForm, clear }
}
