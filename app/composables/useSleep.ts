// Slaapritme: het plan, je avond, en wat je eigen nachten laten zien.
// Alles blijft op dit apparaat. Stuurhut merkt op en stelt voor, meer niet.
import type { ISODate, RhythmDay, SleepPlan, Time } from '~/types'
import {
  allowance, anchorTime, bedTarget, decideWeek, monday, MORNING_DEFAULT, PASS, weekendLatest, weekScore, clock, clockMin, isWeekend, laptopTarget, minText, nightMin, planWeek, sleepHours, wakeTarget, weeksToGoal,
} from '~/utils/sleep'

export interface Night {
  date: ISODate
  bed: Time
  woke: Time
  sleepH: number
  rested?: 1 | 2 | 3
  lastWork?: Time
  energy?: number
  target: Time
  /** Binnen de speling opgestaan */
  onTime: boolean
}

export type EveningPhase = 'dag' | 'avond' | 'bijna' | 'afbouwen' | 'laat'

const now = ref(new Date())
if (typeof window !== 'undefined') setInterval(() => { now.value = new Date() }, 30_000)
// Om de avond overdag te kunnen bekijken: doet alsof het net na laptoptijd is.
// Eén gedeelde ref, zodat hij blijft staan als het scherm dat hem aanzette verdwijnt.
const preview = typeof window !== 'undefined' ? useSessionStorage('stuurhut:preview-winddown', false) : ref(false)

export function useSleep() {
  const { state } = useStore()
  const plan = computed<SleepPlan>(() => state.value.prefs.sleep)
  const today = toISO(now.value)

  // ---------- Het plan ----------
  const wakeToday = computed(() => wakeTarget(plan.value, today))
  const weekIndex = computed(() => planWeek(plan.value, today))
  const nextWeekWake = computed(() => wakeTarget(plan.value, addDays(today, 7)))
  const weeksLeft = computed(() => weeksToGoal(plan.value, today))
  const atGoal = computed(() => clockMin(wakeToday.value) <= clockMin(plan.value.goalWake))
  /** Het besluit voor deze week, en waarom. */
  const thisWeekPlan = computed(() => plan.value.weeks?.[monday(today)])
  /**
   * De stappen van begin tot doel: wat er al besloten is, en wat er komt als het lukt.
   * Een week die bleef staan, zie je terug als dezelfde tijd.
   */
  const steps = computed(() => {
    const p = plan.value
    const thisMon = monday(today)
    const out: { key: string, wake: Time, state: 'gedaan' | 'blijft' | 'terug' | 'nu' | 'straks' }[] = []
    for (const [mon, w] of Object.entries(p.weeks ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
      if (mon > thisMon) continue
      out.push({ key: mon, wake: w.wake, state: mon === thisMon ? 'nu' : w.decision === 'blijft' ? 'blijft' : w.decision === 'terug' ? 'terug' : 'gedaan' })
    }
    let m = clockMin(out.at(-1)?.wake ?? wakeToday.value)
    for (let i = 1; m > clockMin(p.goalWake) && i < 20; i++) {
      m = Math.max(clockMin(p.goalWake), m - p.stepMin)
      out.push({ key: `straks-${i}`, wake: clock(m), state: 'straks' })
    }
    return out
  })

  // ---------- Nachten ----------
  const nights = computed<Night[]>(() => {
    const list: Night[] = state.value.rhythm
      .filter((d): d is RhythmDay & { bed: Time, woke: Time } => !!d.bed && !!d.woke)
      .map(d => toNight(d.date, d.bed, d.woke, d.sleepH, d.rested, d.lastWork, d.energy))
    // Vandaag uit de dagstart, plus of je gisteravond nog werkte
    const ds = state.value.rituals.dayStart[today]
    if (ds?.bed && ds.woke) {
      const closed = state.value.evenings[addDays(today, -1)]?.closedAt
      const late = closed && nightMin(closed) > nightMin(state.value.prefs.workHours.end) ? closed : undefined
      list.push(toNight(today, ds.bed, ds.woke, ds.sleep ?? sleepHours(ds.bed, ds.woke), ds.rested, late, ds.energy))
    }
    return list
  })
  function toNight(date: ISODate, bed: Time, woke: Time, sleepH: number, rested?: 1 | 2 | 3, lastWork?: Time, energy?: number): Night {
    const target = wakeTarget(plan.value, date)
    return { date, bed, woke, sleepH, rested, lastWork, energy, target, onTime: clockMin(woke) <= clockMin(target) + allowance(date) }
  }
  const last14 = computed(() => nights.value.slice(-14))

  /** Deze week: per dag of het lukte. */
  const thisWeek = computed(() => {
    const mon = addDays(today, fromISO(today).getDay() === 0 ? -6 : 1 - fromISO(today).getDay())
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(mon, i)
      const n = nights.value.find(x => x.date === date)
      return { date, night: n, future: date > today, target: wakeTarget(plan.value, date) }
    })
  })
  const thisWeekScore = computed(() => {
    const past = thisWeek.value.filter(d => d.night)
    return { done: past.filter(d => d.night!.onTime).length, of: past.length }
  })

  // ---------- Een tempo dat zich aanpast ----------
  const mornings = computed(() => nights.value.map(n => ({ date: n.date, woke: n.woke })))
  /** Begint er een nieuwe week, dan besluit ik of de stap doorgaat. Eén keer per week. */
  function ensureWeek() {
    const p = plan.value
    const mon = monday(today)
    if (planWeek(p, today) < 0 || p.weeks?.[mon]) return
    // Ook weken die je oversloeg (vakantie, app niet open) krijgen een besluit
    const weeks = { ...(p.weeks ?? {}) }
    let cur = Object.keys(weeks).sort().at(-1) ?? addDays(p.startedOn, -7)
    while (cur < mon) {
      cur = addDays(cur, 7)
      weeks[cur] = decideWeek({ ...p, weeks }, mornings.value, cur)
    }
    state.value.prefs.sleep = { ...p, weeks }
  }
  /** Wat er volgende week gebeurt, eerlijk gezegd. */
  const nextWeekText = computed(() => {
    if (atGoal.value) return 'Je zit op je doel. Nu vooral zo houden.'
    const mon = monday(today)
    const sc = weekScore(plan.value, mornings.value, mon)
    const left = [0, 1, 2, 3, 4].map(i => addDays(mon, i)).filter(d => d > today || (d === today && !nights.value.some(n => n.date === today))).length
    const need = Math.max(0, PASS - sc.done)
    if (need === 0) return `Deze week is al gelukt. Volgende week ${nextWeekWake.value}.`
    if (need > left) return `Deze week haal je de ${PASS} ochtenden niet meer. Dan blijft het volgende week ${wakeToday.value}, en dat is prima.`
    return `Volgende week ${nextWeekWake.value}, als nog ${need === 1 ? 'één ochtend' : `${need} ochtenden`} deze week lukt.`
  })
  /** Waarom deze week deze tijd heeft */
  const verdictText = computed(() => {
    const w = thisWeekPlan.value
    if (!w) return ''
    if (w.decision === 'start') return 'Je eerste week.'
    if (w.decision === 'stap') return `Vorige week lukte ${w.done} van de ${w.of} ochtenden, dus een stap verder.`
    if (w.decision === 'blijft') return `Vorige week lukte ${w.done ?? 0} van de ${w.of ?? 0} ochtenden. Deze week dezelfde tijd, rustig aan.`
    return 'Je koos voor een stap terug. Dat is ook bijsturen.'
  })

  // ---------- Nooit twee keer missen ----------
  /** De laatste twee ochtenden allebei niet gelukt, en je gaf er nog geen antwoord op. */
  function missedTwiceWith(extra?: { date: ISODate, woke: Time }) {
    const list = nights.value.filter(n => n.date !== extra?.date).map(n => ({ date: n.date, onTime: n.onTime }))
    if (extra) list.push({ date: extra.date, onTime: clockMin(extra.woke) <= clockMin(wakeTarget(plan.value, extra.date)) + allowance(extra.date) })
    const [a, b] = list.slice(-2)
    if (!a || !b || a.onTime || b.onTime) return null
    if (diffDays(today, b.date) > 1 || diffDays(b.date, a.date) > 1) return null
    if (plan.value.missAck && plan.value.missAck >= b.date) return null
    if (thisWeekPlan.value?.decision === 'terug') return null
    return { latest: b.date }
  }
  const missedTwice = computed(() => missedTwiceWith())
  /** Wat een stap terug zou zijn deze week */
  const stepBackWake = computed(() => clock(Math.min(clockMin(plan.value.startWake), clockMin(wakeToday.value) + plan.value.stepMin)))
  function stepBack(latest: ISODate = today) {
    const weeks = { ...(plan.value.weeks ?? {}) }
    weeks[monday(today)] = { wake: stepBackWake.value, decision: 'terug' }
    state.value.prefs.sleep = { ...plan.value, weeks, missAck: latest }
  }
  function keepGoing(latest: ISODate = today) {
    state.value.prefs.sleep = { ...plan.value, missAck: latest }
  }

  // ---------- Wat het je oplevert ----------
  /** Voor je begon tegenover sinds je begon. Alleen wat je zelf invulde. */
  const effects = computed(() => {
    const p = plan.value
    const before = nights.value.filter(n => planWeek(p, n.date) < 0 && !isWeekend(n.date))
    const since = nights.value.filter(n => planWeek(p, n.date) >= 0 && !isWeekend(n.date))
    if (before.length < 5 || since.length < 5) return null
    const share = (xs: Night[], f: (n: Night) => boolean) => xs.filter(f).length / xs.length
    const out: { id: string, label: string, before: string, since: string, better: boolean, text: string }[] = []
    const eB = avg(before.filter(n => n.energy).map(n => n.energy!))
    const eS = avg(since.filter(n => n.energy).map(n => n.energy!))
    out.push({ id: 'energie', label: 'Energie', before: dec1(eB), since: dec1(eS), better: eS > eB + 0.15, text: eS > eB + 0.15 ? `Je geeft je energie gemiddeld ${dec1(eS - eB)} punt hoger dan voor je begon.` : 'Je energie is nog ongeveer gelijk. Dat verschil komt vaak pas na een week of vier.' })
    const rB = share(before, n => n.rested === 3)
    const rS = share(since, n => n.rested === 3)
    out.push({ id: 'uitgerust', label: 'Uitgerust wakker', before: `${Math.round(rB * 100)}%`, since: `${Math.round(rS * 100)}%`, better: rS > rB + 0.05, text: rS > rB + 0.05 ? `Je wordt vaker uitgerust wakker: ${Math.round(rS * 100)}% van de ochtenden, eerst ${Math.round(rB * 100)}%.` : 'Uitgerust wakker worden gebeurt nog even vaak als eerst.' })
    const wB = avg(before.map(n => clockMin(n.woke)))
    const wS = avg(since.map(n => clockMin(n.woke)))
    out.push({ id: 'op', label: 'Op, doordeweeks', before: clock(wB), since: clock(wS), better: wS < wB - 5, text: '' })
    const anchors = state.value.tasks.filter(t => t.anchor && t.date && t.date < today)
    if (anchors.length >= 3) {
      const done = anchors.filter(t => t.done).length
      out.push({ id: 'blok', label: 'Eerste blok gedaan', before: '–', since: `${done}/${anchors.length}`, better: done / anchors.length >= 0.6, text: `Je eerste werkblok lukte ${done} van de ${anchors.length} keer.` })
    }
    return { list: out, weeks: planWeek(p, today) + 1 }
  })

  // ---------- Wat je nachten laten zien ----------
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
  const patterns = computed(() => {
    const out: { id: string, icon: string, text: string, compare?: { a: string, aLabel: string, b: string, bLabel: string } }[] = []
    const all = nights.value
    if (all.length < 10) return out

    // 1. Doorwerken in de avond
    const weekdayNights = all.filter(n => [2, 3, 4, 5, 6].includes(fromISO(n.date).getDay()))
    const worked = weekdayNights.filter(n => n.lastWork)
    const free = weekdayNights.filter(n => !n.lastWork)
    if (worked.length >= 3 && free.length >= 3) {
      const later = avg(worked.map(n => nightMin(n.bed))) - avg(free.map(n => nightMin(n.bed)))
      const shorter = (avg(free.map(n => n.sleepH)) - avg(worked.map(n => n.sleepH))) * 60
      if (later >= 20) {
        out.push({
          id: 'werk',
          icon: 'tabler:device-laptop',
          text: `Op avonden dat je nog werkte (${worked.length} keer), ging je gemiddeld ${minText(later)} later naar bed${shorter >= 15 ? ` en sliep je ${minText(shorter)} korter` : ''}.`,
          compare: { a: clock(avg(free.map(n => nightMin(n.bed)))), aLabel: 'in bed zonder werk', b: clock(avg(worked.map(n => nightMin(n.bed)))), bLabel: 'na doorwerken' },
        })
      }
    }

    // 2. Korte nachten en energie
    const short = all.filter(n => n.sleepH < 7 && n.energy)
    const good = all.filter(n => n.sleepH >= 7.75 && n.energy)
    if (short.length >= 3 && good.length >= 3) {
      const diff = avg(good.map(n => n.energy!)) - avg(short.map(n => n.energy!))
      if (diff >= 0.5) out.push({ id: 'energie', icon: 'tabler:bolt', text: `Na een nacht onder de zeven uur geef je je energie gemiddeld ${dec1(diff)} punt lager.` })
    }

    // 3. Uitgerust of moe
    const rested = all.filter(n => n.rested === 3)
    const tired = all.filter(n => n.rested === 1)
    if (rested.length >= 3 && tired.length >= 3) {
      out.push({
        id: 'uitgerust',
        icon: 'tabler:moon',
        text: `Uitgerust word je wakker na gemiddeld ${dec1(avg(rested.map(n => n.sleepH)))} uur slaap, moe na ${dec1(avg(tired.map(n => n.sleepH)))} uur. Je slaapbehoefte staat op ${dec1(plan.value.needH).replace(',0', '')} uur.`,
      })
    }

    // 4. Het weekend
    const recent = all.slice(-28)
    const we = recent.filter(n => isWeekend(n.date))
    const wd = recent.filter(n => !isWeekend(n.date))
    if (we.length >= 3 && wd.length >= 6) {
      const shift = avg(we.map(n => clockMin(n.woke))) - avg(wd.map(n => clockMin(n.woke)))
      if (shift >= 30) out.push({ id: 'weekend', icon: 'tabler:calendar-week', text: `In het weekend sta je gemiddeld ${minText(shift)} later op. ${shift > 60 ? 'Binnen een uur blijft je ritme makkelijker staan.' : 'Dat valt binnen het uur, dus dat houdt je ritme heel.'}` })
    }

    // 5. Hoe het plan gaat
    const inPlan = all.filter(n => planWeek(plan.value, n.date) >= 0)
    if (inPlan.length >= 5) {
      const before = all.filter(n => planWeek(plan.value, n.date) < 0 && !isWeekend(n.date))
      const during = inPlan.filter(n => !isWeekend(n.date))
      const earlier = avg(before.map(n => clockMin(n.woke))) - avg(during.map(n => clockMin(n.woke)))
      const bedEarlier = avg(before.map(n => nightMin(n.bed))) - avg(during.map(n => nightMin(n.bed)))
      if (earlier >= 10) {
        out.push({
          id: 'plan',
          icon: 'tabler:sunrise',
          text: `Sinds je begon sta je doordeweeks ${minText(earlier)} eerder op. ${bedEarlier >= earlier - 10 ? 'Je bedtijd schuift netjes mee.' : `Je bedtijd schuift ${bedEarlier >= 10 ? `${minText(bedEarlier)} mee` : 'nog niet mee'}. Dat komt vaak vanzelf, als je opstaantijd blijft staan.`}`,
        })
      }
    }
    return out
  })

  /** Twee weken lang genoeg geslapen en toch vaak moe: rustig naar de huisarts wijzen. */
  const tiredDespiteSleep = computed(() => last14.value.filter(n => n.sleepH >= 7.5 && n.rested === 1).length >= 5)

  // ---------- Vanavond ----------
  /** De ochtend waar deze avond naartoe gaat. Na middernacht is dat vandaag. */
  const wakeDate = computed(() => (now.value.getHours() < 12 ? toISO(now.value) : addDays(toISO(now.value), 1)))
  const eveningDate = computed(() => addDays(wakeDate.value, -1))
  /** Laptop, bed en opstaan voor de ochtend van `wake`. */
  const forMorning = (wake: ISODate) => ({
    wake: wakeTarget(plan.value, wake),
    bed: bedTarget(plan.value, wake),
    laptop: laptopTarget(plan.value, wake),
    wakeDate: wake,
  })
  const tonight = computed(() => forMorning(wakeDate.value))
  /** Minuten rond middernacht, zoals de avond ze beleeft */
  const nowNight = computed(() => {
    if (preview.value) return nightMin(tonight.value.laptop) + 10
    const m = now.value.getHours() * 60 + now.value.getMinutes()
    return m >= 12 * 60 ? m - 1440 : m
  })
  const phase = computed<EveningPhase>(() => {
    const n = nowNight.value
    const laptop = nightMin(tonight.value.laptop)
    const bed = nightMin(tonight.value.bed)
    if (n < -6 * 60 || n > 5 * 60) return 'dag'
    if (n < laptop - 60) return 'avond'
    if (n < laptop) return 'bijna'
    if (n < bed) return 'afbouwen'
    return 'laat'
  })
  const minutesTo = (t: Time) => nightMin(t) - nowNight.value
  const evening = computed(() => state.value.evenings[eveningDate.value] ?? {})
  /** Na laptoptijd wordt de app stil: geen voorstellen, geen werk. */
  const quiet = computed(() => phase.value === 'afbouwen' || phase.value === 'laat')

  function closeLaptop() {
    const m = preview.value ? nowNight.value : now.value.getHours() * 60 + now.value.getMinutes()
    state.value.evenings[eveningDate.value] = { ...evening.value, closedAt: clock(m) }
  }
  function keepWorking() {
    state.value.evenings[eveningDate.value] = { ...evening.value, kept: true }
  }

  // ---------- Een reden om op te staan ----------
  const tasks = useTasks()
  const cal = useCalendar()
  const R = useRoutines()
  const morning = computed(() => plan.value.morning ?? MORNING_DEFAULT)
  const anchorFor = (date: ISODate) => anchorTime(plan.value, date)
  const morningRoutine = computed(() => (morning.value.routineId ? R.byId(morning.value.routineId) : undefined))

  /**
   * Houdt het vaste eerste werkblok bij voor de komende werkdagen.
   * Schuift mee als je opstaantijd een week verder is. Staat er al iets, dan laat ik het staan.
   */
  function syncAnchors() {
    const wh = state.value.prefs.workHours
    const nowM = new Date().getHours() * 60 + new Date().getMinutes()
    const mine = state.value.tasks.filter(t => t.anchor && !t.done && t.date && t.date >= today)
    if (!morning.value.firstBlock) {
      for (const t of mine) tasks.remove(t.id)
      return
    }
    for (const date of planDays(5)) {
      if (!wh.days.includes(fromISO(date).getDay())) continue
      const start = anchorFor(date)
      if (date === today && clockMin(start) <= nowM) continue
      const existing = mine.find(t => t.date === date)
      if (existing) {
        if (existing.start !== start && cal.isFree(date, clockMin(start), existing.durationMin, existing.id)) tasks.schedule(existing.id, date, start)
        continue
      }
      // Zo lang als past tot de volgende afspraak, minstens drie kwartier.
      // Begint er om die tijd al iets, dan is dat je reden om op te staan.
      const from = clockMin(start)
      const items = cal.dayItems(date)
      if (items.some(i => clockMin(i.start) <= from && clockMin(i.end) > from)) continue
      const nextStart = Math.min(...items.map(i => clockMin(i.start)).filter(m => m > from), from + morning.value.blockMin)
      const dur = Math.floor((nextStart - from) / 15) * 15
      if (dur >= 45) tasks.add({ title: 'Eerste blok', durationMin: dur, kind: 'focus', deep: true, domain: 'zakelijk', anchor: true, date, start })
    }
  }
  function setFirstBlock(on: boolean) {
    state.value.prefs.sleep = { ...plan.value, morning: { ...morning.value, firstBlock: on } }
    syncAnchors()
  }
  /** Tien minuten naar buiten na het opstaan: daglicht zet je klok. */
  function addMorningRoutine() {
    const r = R.addRoutine({ name: 'Naar buiten na het opstaan', cue: 'Na het opstaan, tien minuten buiten met je koffie', why: 'Daglicht in het eerste uur zet je klok', goal: 5, days: [0, 1, 2, 3, 4, 5, 6], icon: 'tabler:sun', domain: 'prive' })
    state.value.prefs.sleep = { ...plan.value, morning: { ...morning.value, routineId: r.id } }
    return r
  }

  // ---------- Het weekend ----------
  const latestWeekend = (date: ISODate) => weekendLatest(plan.value, date)
  /** Vorig weekend: hoe laat je opstond, en hoeveel later dan doordeweeks. */
  const lastWeekend = computed(() => {
    const we = nights.value.filter(n => isWeekend(n.date) && diffDays(today, n.date) <= 8)
    const wd = nights.value.filter(n => !isWeekend(n.date) && diffDays(today, n.date) <= 9)
    if (!we.length || !wd.length) return null
    const later = avg(we.map(n => clockMin(n.woke))) - avg(wd.map(n => clockMin(n.woke)))
    return { nights: we, later, within: we.every(n => n.onTime) }
  })
  const nextWeekend = computed(() => {
    let d = today
    while (fromISO(d).getDay() !== 6) d = addDays(d, 1)
    return [d, addDays(d, 1)].map(date => ({ date, latest: latestWeekend(date) }))
  })

  // ---------- Aanpassen ----------
  function setPlan(p: Partial<SleepPlan>) {
    const cur = plan.value
    const restart = (p.startWake && p.startWake !== cur.startWake) || (p.goalWake && p.goalWake !== cur.goalWake) || (p.stepMin && p.stepMin !== cur.stepMin)
    if (!restart) {
      state.value.prefs.sleep = { ...cur, ...p }
      return
    }
    // Opnieuw beginnen: deze week is week één
    state.value.prefs.sleep = { ...cur, ...p, startedOn: monday(today), weeks: {}, missAck: undefined }
    ensureWeek()
  }

  return {
    plan, preview, wakeToday, weekIndex, nextWeekWake, weeksLeft, atGoal, steps, thisWeekPlan, ensureWeek, nextWeekText, verdictText, missedTwice, missedTwiceWith, stepBackWake, stepBack, keepGoing, effects,
    nights, last14, thisWeek, thisWeekScore, patterns, tiredDespiteSleep,
    tonight, forMorning, phase, morning, anchorFor, morningRoutine, syncAnchors, setFirstBlock, addMorningRoutine, latestWeekend, lastWeekend, nextWeekend, minutesTo, evening, quiet, closeLaptop, keepWorking, setPlan,
  }
}
