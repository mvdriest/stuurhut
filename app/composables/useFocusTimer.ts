export const FOCUS_WERK_MINUTEN = 50
export const FOCUS_PAUZE_MINUTEN = 10

interface FocusTimerState {
  fase: 'idle' | 'werk' | 'pauze'
  eindTijd: number | null
  trajectId: string | null
  subtaakId: string | null
}

const STORAGE_KEY = 'stuurhut-focus-timer'

function leesOpgeslagenState(): FocusTimerState {
  if (import.meta.client) {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        return JSON.parse(raw) as FocusTimerState
      } catch {
        // corrupte data negeren, terugvallen op idle
      }
    }
  }
  return { fase: 'idle', eindTijd: null, trajectId: null, subtaakId: null }
}

function speelGeluid() {
  if (!import.meta.client) return
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    osc.connect(ctx.destination)
    osc.frequency.value = 880
    osc.start()
    osc.stop(ctx.currentTime + 0.3)
  } catch {
    // geluid is best-effort
  }
}

function meldFaseWissel(titel: string) {
  speelGeluid()
  if (!import.meta.client || !('Notification' in window)) return
  if (Notification.permission === 'granted') {
    new Notification(titel)
  }
}

let intervalGestart = false
let hersteld = false

export function useFocusTimer() {
  const state = useState<FocusTimerState>('focus-timer-state', () => ({ fase: 'idle', eindTijd: null, trajectId: null, subtaakId: null }))
  const resterendeSeconden = useState('focus-timer-resterend', () => 0)

  function bewaar() {
    if (import.meta.client) localStorage.setItem(STORAGE_KEY, JSON.stringify(state.value))
  }

  async function logSessie(type: 'werk' | 'pauze', duurMinuten: number, voltooid: boolean) {
    try {
      await $fetch('/api/focus-sessies', {
        method: 'POST',
        body: { type, duurMinuten, voltooid, trajectId: state.value.trajectId, subtaakId: state.value.subtaakId }
      })
    } catch {
      // loggen mag falen zonder de timer te blokkeren
    }
  }

  function tick() {
    if (state.value.fase === 'idle' || state.value.eindTijd === null) {
      resterendeSeconden.value = 0
      return
    }
    const over = Math.max(0, Math.round((state.value.eindTijd - Date.now()) / 1000))
    resterendeSeconden.value = over
    if (over === 0) {
      faseAfronden(true)
    }
  }

  async function faseAfronden(voltooid: boolean) {
    const afgelopenFase = state.value.fase
    if (afgelopenFase === 'idle') return

    const duur = afgelopenFase === 'werk' ? FOCUS_WERK_MINUTEN : FOCUS_PAUZE_MINUTEN
    await logSessie(afgelopenFase, duur, voltooid)

    if (afgelopenFase === 'werk' && voltooid) {
      meldFaseWissel('Focusblok klaar — tijd voor een pauze')
      state.value = { ...state.value, fase: 'pauze', eindTijd: Date.now() + FOCUS_PAUZE_MINUTEN * 60_000 }
    } else {
      if (afgelopenFase === 'pauze' && voltooid) meldFaseWissel('Pauze voorbij — klaar voor de volgende sessie')
      state.value = { fase: 'idle', eindTijd: null, trajectId: null, subtaakId: null }
    }
    bewaar()
    tick()
  }

  function start(opties?: { trajectId?: string | null, subtaakId?: string | null }) {
    if (import.meta.client && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    state.value = {
      fase: 'werk',
      eindTijd: Date.now() + FOCUS_WERK_MINUTEN * 60_000,
      trajectId: opties?.trajectId ?? null,
      subtaakId: opties?.subtaakId ?? null
    }
    bewaar()
    tick()
  }

  function stop() {
    faseAfronden(false)
  }

  if (import.meta.client) {
    onMounted(() => {
      if (hersteld) return
      hersteld = true
      const opgeslagen = leesOpgeslagenState()
      if (opgeslagen.fase !== 'idle') {
        state.value = opgeslagen
        tick()
      }
    })
  }

  if (import.meta.client && !intervalGestart) {
    intervalGestart = true
    setInterval(tick, 1000)
    tick()
  }

  return { state, resterendeSeconden, start, stop }
}
