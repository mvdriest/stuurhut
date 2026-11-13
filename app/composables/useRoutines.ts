// Routines: wat je wilt volhouden, wat er deze week gebeurt en waarom het soms niet lukt.
import type { Domain, ISODate, Routine, SkipReason } from '~/types'

export interface RoutineInput {
  name: string
  cue: string
  why: string
  goal: number
  days: number[]
  icon: string
  domain: Domain
}

export type DayState = 'done' | 'missed' | 'open' | 'future' | 'rest'

export const SKIP_REASONS: SkipReason[] = ['geen tijd', 'te moe', 'vergeten', 'omstandigheden', 'geen zin']

/** Maandag van de week waarin `iso` valt. */
export function weekStart(iso: ISODate) {
  const wd = fromISO(iso).getDay()
  return addDays(iso, wd === 0 ? -6 : 1 - wd)
}

export function useRoutines() {
  const { state } = useStore()
  const today = todayISO()

  const routines = computed(() => state.value.routines.filter(r => !r.paused))
  const paused = computed(() => state.value.routines.filter(r => r.paused))
  const byId = (id: string) => state.value.routines.find(r => r.id === id)
  const thisWeek = computed(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart(today), i)))

  function stateOn(r: Routine, date: ISODate): DayState {
    if (r.paused || !r.days.includes(fromISO(date).getDay())) return 'rest'
    const log = r.log[date]
    if (log) return log.done ? 'done' : 'missed'
    if (date === today) return 'open'
    return date > today ? 'future' : 'missed'
  }

  function doneIn(r: Routine, start: ISODate) {
    let n = 0
    for (let i = 0; i < 7; i++) if (r.log[addDays(start, i)]?.done) n++
    return n
  }

  /** Voortgang deze week, en of het nog haalbaar is. */
  function week(r: Routine) {
    const done = doneIn(r, weekStart(today))
    const left = thisWeek.value.filter(d => ['open', 'future'].includes(stateOn(r, d))).length
    const need = Math.max(0, r.goal - done)
    return { done, goal: r.goal, need, left, reached: done >= r.goal, feasible: need <= left }
  }

  /** Zes afgeronde weken + deze week: percentage van het doel. */
  function history(r: Routine) {
    const start = weekStart(today)
    return Array.from({ length: 7 }, (_, i) => {
      const s = addDays(start, (i - 6) * 7)
      return { start: s, rate: Math.min(1, doneIn(r, s) / r.goal), current: i === 6 }
    })
  }

  function reasons(r: Routine) {
    const counts = new Map<SkipReason, number>()
    for (const l of Object.values(r.log)) if (!l.done && l.reason) counts.set(l.reason, (counts.get(l.reason) ?? 0) + 1)
    const total = [...counts.values()].reduce((s, n) => s + n, 0)
    return { total, list: [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([reason, n]) => ({ reason, n, share: n / (total || 1) })) }
  }

  /** Ritmescore: hoeveel van je weekdoelen je haalt, gemiddeld over zes weken. */
  const score = computed(() => {
    const active = state.value.routines.filter(r => !r.paused)
    if (!active.length) return { now: 1, last: 1, sixWeeks: 1, weeks: [1, 1, 1, 1, 1, 1, 1] }
    const per = active.map(r => history(r))
    const avg = (i: number) => per.reduce((s, h) => s + h[i]!.rate, 0) / per.length
    // Deze week: wat je deed tegenover wat tot nu toe kon (anders lijkt woensdag altijd slecht)
    let done = 0
    let possible = 0
    for (const r of active) {
      const sofar = thisWeek.value.filter(d => d < today || (d === today && r.log[d])).filter(d => r.days.includes(fromISO(d).getDay())).length
      const exp = Math.min(r.goal, sofar)
      possible += exp
      done += Math.min(doneIn(r, weekStart(today)), exp)
    }
    const now = possible ? done / possible : 1
    const weeks = [0, 1, 2, 3, 4, 5].map(avg).concat(now)
    return { now, last: avg(5), sixWeeks: [0, 1, 2, 3, 4, 5].reduce((s, i) => s + avg(i), 0) / 6, weeks }
  })

  const dueToday = computed(() => routines.value.filter(r => stateOn(r, today) !== 'rest'))

  function mark(id: string, done: boolean, reason?: SkipReason, date = today) {
    const r = byId(id)
    if (r) r.log[date] = done ? { done: true } : { done: false, reason }
  }
  function clear(id: string, date = today) {
    const r = byId(id)
    if (r) delete r.log[date]
  }

  // ---------- Een tempo dat zich aanpast ----------
  /** Weken waarin je iets invulde: alleen die tellen mee. */
  function loggedWeeks(r: Routine) {
    const start = weekStart(today)
    return [1, 2, 3, 4, 5, 6].map(i => addDays(start, -7 * i))
      .filter(s => Array.from({ length: 7 }, (_, d) => addDays(s, d)).some(d => r.log[d]))
      .map(s => ({ start: s, done: doneIn(r, s) }))
  }
  /**
   * Drie weken op rij gehaald: voorstel om op te schuiven.
   * Twee weken onder de helft: voorstel om het doel omlaag te doen, zodat het weer lukt.
   */
  function tempo(r: Routine) {
    if (r.paused || r.tempoAck === weekStart(today)) return null
    const w = loggedWeeks(r)
    const last3 = w.slice(0, 3)
    if (last3.length === 3 && last3.every(x => x.done >= r.goal) && r.goal < r.days.length) {
      return { dir: 'op' as const, to: r.goal + 1, text: `Drie weken op rij gehaald. Zin om naar ${r.goal + 1} keer per week te gaan?` }
    }
    const last2 = w.slice(0, 2)
    if (last2.length === 2 && last2.every(x => x.done < r.goal / 2) && r.goal > 1) {
      const avgDone = (last2[0]!.done + last2[1]!.done) / 2
      // Niet te ver omlaag: wat lukte plus één, en minstens de helft van het oude doel
      const to = Math.max(1, Math.min(r.goal - 1, Math.max(Math.ceil(avgDone) + 1, Math.ceil(r.goal / 2))))
      const how = last2.every(x => x.done === 0) ? 'niet' : `${last2.map(x => x.done).join(' en ')} keer, van de ${r.goal}`
      return { dir: 'neer' as const, to, text: `De laatste twee weken lukte het ${how}. Zullen we het doel op ${to} zetten? Dan lukt het weer, en bouw je daarna op.` }
    }
    return null
  }
  function setGoal(id: string, goal: number) {
    const r = byId(id)
    if (r) Object.assign(r, { goal, tempoAck: weekStart(today) })
  }
  function keepGoal(id: string) {
    const r = byId(id)
    if (r) r.tempoAck = weekStart(today)
  }

  // ---------- Nooit twee keer missen ----------
  /** De laatste twee keren niet gelukt. De vraag hangt af van de reden die je zelf opgaf. */
  function doubleMiss(r: Routine) {
    if (r.paused) return null
    const past: ISODate[] = []
    for (let i = 0; i < 21 && past.length < 2; i++) {
      const d = addDays(today, -i)
      const st = stateOn(r, d)
      if (st === 'rest' || st === 'open') continue
      past.push(d)
    }
    if (past.length < 2 || !past.every(d => stateOn(r, d) === 'missed')) return null
    const latest = past[0]!
    if (diffDays(today, latest) > 3 || (r.missAck && r.missAck >= latest)) return null
    const reason = r.log[latest]?.reason
    const offer = MISS_OFFER[reason ?? 'omstandigheden'](r)
    return { latest, reason, ...offer }
  }
  const MISS_OFFER: Record<SkipReason, (r: Routine) => { text: string, accept?: { label: string, action: 'lager' | 'pauze' | 'herinner' } }> = {
    'geen tijd': r => ({ text: `${r.name} lukte de laatste twee keer niet, omdat er geen tijd was. ${r.goal > 1 ? `Eén keer minder per week, dan past het weer?` : 'Misschien past een ander moment beter.'}`, accept: r.goal > 1 ? { label: `Naar ${r.goal - 1}× per week`, action: 'lager' } : undefined }),
    'te moe': r => ({ text: `${r.name} lukte de laatste twee keer niet, omdat je moe was. Dan is rust ook goed. ${r.goal > 1 ? 'Deze week een keer minder?' : ''}`.trim(), accept: r.goal > 1 ? { label: `Naar ${r.goal - 1}× per week`, action: 'lager' } : undefined }),
    'vergeten': r => ({ text: `${r.name} schoot de laatste twee keer erbij in. Vergeten is geen falen, het is een seintje dat ontbreekt.`, accept: state.value.prefs.reminders[r.id] ? undefined : { label: 'Herinner me', action: 'herinner' } }),
    'geen zin': r => ({ text: r.why ? `${r.name} lukte de laatste twee keer niet. Je schreef ooit: "${r.why}". Klopt dat nog, of pauzeer je het even?` : `${r.name} lukte de laatste twee keer niet. Wil je doorgaan, of pauzeer je het even?`, accept: { label: 'Even pauzeren', action: 'pauze' } }),
    'omstandigheden': r => ({ text: `${r.name} lukte de laatste twee keer niet, door omstandigheden. Dat gebeurt. Volgende keer gewoon weer.` }),
  }
  /** Een tijd uit het moment halen ("22:30, telefoon…"), een kwartier eerder. Anders 20:00. */
  function reminderTime(r: Routine) {
    const m = r.cue.match(/(\d{1,2})[:.](\d{2})/)
    if (!m) return '20:00'
    const min = Number(m[1]) * 60 + Number(m[2]) - 15
    return fromMin(Math.max(0, min))
  }
  function answerMiss(id: string, action?: 'lager' | 'pauze' | 'herinner') {
    const r = byId(id)
    const miss = r && doubleMiss(r)
    if (!r || !miss) return ''
    r.missAck = miss.latest
    if (action === 'lager') { r.goal = Math.max(1, r.goal - 1); r.tempoAck = weekStart(today); return `${r.name}: nu ${r.goal}× per week.` }
    if (action === 'pauze') { r.paused = true; return `${r.name} staat even op pauze. Je vindt hem onder Gepauzeerd.` }
    if (action === 'herinner') { const t = reminderTime(r); state.value.prefs.reminders[r.id] = t; return `Ik geef je een seintje om ${t}.` }
    return 'Goed. Volgende keer gewoon weer.'
  }

  // ---------- Wat het je oplevert ----------
  /** Energie op dagen dat het lukte, tegenover dagen dat het niet lukte. Alleen met genoeg dagen. */
  function pays(r: Routine) {
    const energy = new Map(state.value.rhythm.map(d => [d.date, d.energy]))
    for (const [d, e] of Object.entries(state.value.checkins)) energy.set(d, e as 1 | 2 | 3 | 4 | 5)
    const yes: number[] = []
    const no: number[] = []
    for (const [d, l] of Object.entries(r.log)) {
      const e = energy.get(d)
      if (e) (l.done ? yes : no).push(e)
    }
    if (yes.length < 4 || no.length < 4) return null
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
    const diff = avg(yes) - avg(no)
    if (Math.abs(diff) < 0.3) return null
    return { yes: avg(yes), no: avg(no), better: diff > 0 }
  }

  // ---------- Aanmaken, wijzigen, pauzeren, verwijderen ----------
  function addRoutine(i: RoutineInput): Routine {
    const r: Routine = { id: uid('r'), name: i.name.trim(), cue: i.cue.trim(), why: i.why.trim(), goal: i.goal, days: [...i.days].sort(), icon: i.icon, log: {}, domain: i.domain }
    state.value.routines.push(r)
    return state.value.routines[state.value.routines.length - 1]!
  }
  function updateRoutine(id: string, i: RoutineInput) {
    const r = byId(id)
    if (r) Object.assign(r, { name: i.name.trim(), cue: i.cue.trim(), why: i.why.trim(), goal: i.goal, days: [...i.days].sort(), icon: i.icon, domain: i.domain })
  }
  function setPaused(id: string, value: boolean) {
    const r = byId(id)
    if (r) r.paused = value
  }
  function removeRoutine(id: string) {
    const idx = state.value.routines.findIndex(r => r.id === id)
    if (idx < 0) return () => {}
    const [r] = state.value.routines.splice(idx, 1)
    return () => { state.value.routines.splice(idx, 0, r!) }
  }

  return { routines, paused, byId, thisWeek, stateOn, week, history, reasons, score, dueToday, mark, clear, addRoutine, updateRoutine, setPaused, removeRoutine, tempo, setGoal, keepGoal, doubleMiss, answerMiss, pays }
}
