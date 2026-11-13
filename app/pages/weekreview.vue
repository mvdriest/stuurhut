<script setup lang="ts">
// Weekreview: cijfers, wat ging goed, wat bleef liggen, focus voor volgende week.
import { CATEGORIES, categoryOfTask } from '~/utils/category'

useHead({ title: 'Weekreview · Stuurhut' })
const root = ref<HTMLElement | null>(null)
useMotion(root)

const { state } = useStore()
const rituals = useRituals()
const tasks = useTasks()
const cal = useCalendar()
const R = useRoutines()
const opps = useOpportunities()
const { goals } = useGoals()
const toast = useToast()
const today = todayISO()
const monday = rituals.monday

const step = ref(0)
const STEPS = 5

// ---------- 1. Cijfers ----------
const weekTasks = computed(() => state.value.tasks.filter(t => t.date && t.date >= monday && t.date <= today))
const stats = computed(() => {
  const events = state.value.events.filter(e => e.date >= monday && e.date <= today && !e.cancelled)
  const revenue = state.value.transactions.filter(t => t.date >= monday && t.date <= today && t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const work = state.value.rhythm.slice(-7).reduce((s, d) => s + d.workH, 0)
  const evenings = goals.value.find(g => g.id === 'g6')
  return [
    { label: 'Taken gedaan', value: `${weekTasks.value.filter(t => t.done).length}/${weekTasks.value.length}`, icon: 'tabler:checkbox' },
    { label: 'Afspraken', value: `${events.length}`, icon: 'tabler:users' },
    { label: 'Binnengekomen', value: euroRound(revenue), icon: 'tabler:coin-euro' },
    { label: 'Ritmescore', value: `${Math.round(R.score.value.now * 100)}%`, icon: 'tabler:wave-sine' },
    { label: 'Werkuren (7 dagen)', value: `${Math.round(work)} u`, icon: 'tabler:briefcase', warn: work > 42 },
    { label: 'Avonden zonder werk', value: evenings ? `${evenings.current}/${evenings.target}` : '–', icon: 'tabler:moon' },
  ]
})

// ---------- 2. Wat ging goed ----------
// Eerst wat er af is: dat zie je in de drukte meestal niet
const S = useSleep()
const done = computed(() => progressIn(state.value, monday, today))
const doneTiles = computed(() => {
  const d = done.value
  const mornings = S.thisWeekScore.value
  return [
    { label: 'Opdrachten klaar', value: `${d.done.length}`, show: true },
    { label: 'Uren gewerkt', value: `${dec1(d.hours).replace(',0', '')} u`, show: d.hours > 0 },
    { label: 'Gefactureerd', value: euroRound(d.invoiced), show: d.invoiced > 0 },
    { label: 'Offertes verstuurd', value: `${d.quotes}`, show: d.quotes > 0 },
    { label: 'Keer een routine gedaan', value: `${d.routinesDone}`, show: d.routinesDone > 0 },
    { label: 'Ochtenden op tijd op', value: `${mornings.done}/${mornings.of}`, show: mornings.of > 0 },
  ].filter(t => t.show)
})
const extraWins = ref<string[]>([])
const newWin = ref('')
const wins = computed(() => {
  const list: { text: string, source: string }[] = rituals.winsThisWeek.value.map(w => ({ text: w.win, source: cap(weekdayLong(w.date)) }))
  for (const t of weekTasks.value.filter(t => t.done && t.important)) list.push({ text: `${t.title} afgerond`, source: 'Telde' })
  for (const rt of R.routines.value.filter(rt => R.week(rt).reached)) list.push({ text: `${rt.name}: weekdoel gehaald`, source: 'Ritme' })
  for (const w of extraWins.value) list.push({ text: w, source: 'Net toegevoegd' })
  return list
})
function addWin() {
  if (newWin.value.trim()) extraWins.value.push(newWin.value.trim())
  newWin.value = ''
}

// ---------- 3. Wat bleef liggen ----------
type Choice = 'plan' | 'los' | 'houd'
const leftover = computed(() => state.value.tasks.filter(t => !t.done && (!t.date || (t.date >= monday && t.date < today))))
const choices = reactive<Record<string, Choice>>({})
let released = 0
function applyLeftover() {
  for (const t of [...leftover.value]) {
    const c = choices[t.id] ?? 'houd'
    if (c === 'los') { tasks.remove(t.id); released++ }
    if (c === 'plan') {
      const slot = cal.findSlot(t.durationMin, { deep: t.deep, excludeTaskId: t.id, domain: domainOfTask(t) })
      if (slot) tasks.schedule(t.id, slot.date, slot.start)
    }
  }
}
const CHOICES: { v: Choice, l: string }[] = [{ v: 'plan', l: 'Inplannen' }, { v: 'houd', l: 'Laten staan' }, { v: 'los', l: 'Laat los' }]

// ---------- 4. Focus volgende week ----------
const focusCandidates = computed(() => [
  ...state.value.tasks.filter(t => !t.done && !t.date && (t.important || t.deep)).map(t => ({ id: `t:${t.id}`, title: t.title, kind: 'Taak', icon: CATEGORIES[categoryOfTask(t)].icon, fill: CATEGORIES[categoryOfTask(t)].fill })),
  ...opps.opportunities.value.filter(o => o.status === 'onderzoeken' || o.status === 'nieuw').slice(0, 2).map(o => ({ id: `o:${o.id}`, title: o.title, kind: 'Kans', icon: 'tabler:bulb', fill: 'bg-cat-admin' })),
  ...goals.value.filter(g => !g.ok).slice(0, 3).map(g => ({ id: `g:${g.id}`, title: g.title, kind: 'Doel', icon: 'tabler:flag', fill: g.domain === 'prive' ? 'bg-cat-prive' : 'bg-cat-meeting' })),
])
const focus = ref<string[]>([])
function toggleFocus(id: string) {
  if (focus.value.includes(id)) focus.value = focus.value.filter(x => x !== id)
  else if (focus.value.length < 3) focus.value = [...focus.value, id]
  else toast.push({ text: 'Drie focuspunten is genoeg.' })
}
function applyFocus() {
  let planned = 0
  for (const f of focus.value) {
    const [kind, id] = f.split(':') as [string, string]
    if (kind === 't') {
      const t = tasks.byId(id)
      const slot = t ? cal.findSlot(t.durationMin, { deep: true, preferMorning: true, excludeTaskId: id, domain: domainOfTask(t) }) : null
      if (t && slot) { tasks.schedule(id, slot.date, slot.start); t.important = true; planned++ }
    }
    if (kind === 'o' && opps.setStatus(id, 'ingepland')) planned++
  }
  return planned
}
const focusTitle = (id: string) => focusCandidates.value.find(c => c.id === id)?.title ?? ''

// ---------- 5. Klaar ----------
const isFriday = fromISO(today).getDay() === 5
let plannedCount = 0

function next() {
  if (step.value === 2) applyLeftover()
  if (step.value === 3) plannedCount = applyFocus()
  if (step.value === STEPS - 1) {
    rituals.saveWeekReview({ focus: focus.value.map(focusTitle), released })
    const close = state.value.routines.find(r => r.id === 'r3' && r.days.includes(fromISO(today).getDay()))
    if (close) R.mark(close.id, true)
    toast.push({ text: isFriday ? 'Week afgesloten. Fijn weekend.' : 'Weekreview gedaan.' })
    navigateTo('/')
    return
  }
  step.value++
}
</script>

<template>
  <div ref="root">
    <RitualShell title="Weekreview" icon="tabler:calendar-week" tone="mint" :step="step" :steps="STEPS" :next-label="step === STEPS - 1 ? (isFriday ? 'Fijn weekend' : 'Klaar') : 'Volgende'" @next="next" @back="step--">
      <!-- 1 -->
      <div v-if="step === 0">
        <p class="eyebrow">Week van {{ shortDate(monday) }}</p>
        <h2 class="mt-1 text-[26px] leading-tight">Je week in cijfers</h2>
        <dl class="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
          <div v-for="s in stats" :key="s.label" class="rounded-[14px] border border-line bg-surface/85 p-3.5">
            <dt class="flex items-center gap-1.5 text-[13px] text-muted"><Icon :name="s.icon" class="size-4" />{{ s.label }}</dt>
            <dd class="num mt-1.5 text-[26px] leading-none" :class="s.warn ? 'text-copper-ink' : ''">{{ s.value }}</dd>
          </div>
        </dl>
      </div>

      <!-- 2 -->
      <div v-else-if="step === 1">
        <h2 class="text-[26px] leading-tight">Wat ging goed?</h2>
        <p class="mt-1 text-[15px] text-muted">Eerst wat er af is. Dat zie je in de drukte meestal niet.</p>
        <dl class="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
          <div v-for="t in doneTiles" :key="t.label" class="rounded-[14px] bg-surface/85 p-3">
            <dt class="text-[13px] text-muted">{{ t.label }}</dt>
            <dd class="num mt-1 text-[24px] leading-none">{{ t.value }}</dd>
          </div>
        </dl>
        <ul v-if="done.done.length" class="mt-2 flex flex-wrap gap-1.5" aria-label="Opdrachten klaar">
          <li v-for="a in done.done" :key="a.id" class="chip bg-green-soft text-green-ink"><Icon name="tabler:check" class="size-3.5" />{{ a.title }}</li>
        </ul>
        <p class="mt-5 text-[15px] text-muted">En uit je dagafsluitingen. Even stilstaan mag.</p>
        <ul class="mt-4 space-y-2">
          <li v-for="(w, i) in wins" :key="i" class="flex items-center gap-3 rounded-[14px] bg-surface/85 p-3">
            <span class="grid size-8 shrink-0 place-items-center rounded-full bg-green-bar text-white"><Icon name="tabler:check" class="size-4" /></span>
            <span class="min-w-0 flex-1 text-[15px]">{{ w.text }}</span>
            <span class="shrink-0 text-[12.5px] text-muted">{{ w.source }}</span>
          </li>
          <li v-if="!wins.length" class="rounded-[14px] bg-surface/80 p-4 text-muted">Nog niets genoteerd. Wat ging er deze week goed?</li>
        </ul>
        <form class="mt-3 flex gap-2" @submit.prevent="addWin">
          <input v-model="newWin" class="field-input" placeholder="Nog iets dat goed ging…" aria-label="Iets dat goed ging">
          <button type="submit" class="btn-outline shrink-0" :disabled="!newWin.trim()">Voeg toe</button>
        </form>
      </div>

      <!-- 3 -->
      <div v-else-if="step === 2">
        <h2 class="text-[26px] leading-tight">Wat bleef liggen?</h2>
        <p class="mt-1 text-[15px] text-muted">Kies per ding. Loslaten is ook een keuze.</p>
        <ul class="mt-4 space-y-2">
          <li v-for="t in leftover" :key="t.id" class="rounded-[14px] border border-line bg-surface/85 p-3">
            <p class="flex items-center gap-2 text-[15.5px]"><span class="size-2 shrink-0 rounded-full" :class="CATEGORIES[categoryOfTask(t)].fill" />{{ t.title }} <span class="text-[12.5px] text-muted">· {{ t.date ? `stond ${weekdayShort(t.date)}` : 'zonder plek' }}</span></p>
            <div class="mt-2 grid grid-cols-3 gap-1.5">
              <button v-for="c in CHOICES" :key="c.v" type="button" class="min-h-10 rounded-full border text-[13.5px]" :class="(choices[t.id] ?? 'houd') === c.v ? 'border-transparent bg-primary text-on-primary' : 'border-line-strong'" :aria-pressed="(choices[t.id] ?? 'houd') === c.v" @click="choices[t.id] = c.v">{{ c.l }}</button>
            </div>
          </li>
          <li v-if="!leftover.length" class="rounded-[14px] bg-surface/80 p-4 text-muted">Niets bleef liggen. Knap.</li>
        </ul>
      </div>

      <!-- 4 -->
      <div v-else-if="step === 3">
        <h2 class="text-[26px] leading-tight">Volgende week: drie focuspunten</h2>
        <p class="mt-1 text-[15px] text-muted">Taken zet ik vroeg in de week op een ochtend, kansen krijgen een uitwerkblok. <span class="num text-ink">{{ focus.length }}/3</span></p>
        <ul class="mt-4 space-y-2">
          <li v-for="c in focusCandidates" :key="c.id">
            <button type="button" class="flex min-h-14 w-full items-center gap-3 rounded-[14px] border p-2.5 text-left" :class="focus.includes(c.id) ? 'border-ink bg-surface' : 'border-line bg-surface/70'" :aria-pressed="focus.includes(c.id)" @click="toggleFocus(c.id)">
              <span class="grid size-7 shrink-0 place-items-center rounded-full border-2" :class="focus.includes(c.id) ? 'border-ink bg-ink text-surface' : 'border-ui-border'"><Icon v-if="focus.includes(c.id)" name="tabler:check" class="size-4" /></span>
              <span class="grid size-8 shrink-0 place-items-center rounded-[10px] text-cat-ink" :class="c.fill"><Icon :name="c.icon" class="size-4" /></span>
              <span class="min-w-0 flex-1 truncate text-[15.5px]">{{ c.title }}</span>
              <span class="text-[12.5px] text-muted">{{ c.kind }}</span>
            </button>
          </li>
        </ul>
      </div>

      <!-- 5 -->
      <div v-else class="py-4 text-center">
        <span class="mx-auto grid size-14 place-items-center rounded-full bg-primary text-on-primary"><Icon name="tabler:check" class="size-7" /></span>
        <h2 class="mt-4 text-[28px] leading-tight">{{ isFriday ? 'Je week zit erop.' : 'Je week staat.' }}</h2>
        <p class="mt-1 text-[15px] text-muted">{{ plannedCount ? `${plannedCount} focuspunten staan al in je week.` : 'Je focus voor volgende week:' }}</p>
        <ul class="mx-auto mt-3 max-w-[420px] space-y-1.5 text-left">
          <li v-for="(f, i) in focus" :key="f" class="flex items-center gap-3 rounded-[12px] bg-surface/85 px-3.5 py-2.5"><span class="num text-muted">{{ i + 1 }}</span><span class="text-[15px]">{{ focusTitle(f) }}</span></li>
        </ul>
        <p v-if="isFriday" class="mt-4 text-[14.5px] text-muted">Je routine "Week afsluiten" heb ik voor je afgevinkt.</p>
        <NuxtLink to="/terugblik" class="mt-4 inline-flex min-h-11 items-center gap-2 text-[14.5px] underline underline-offset-4">Kijk terug op de afgelopen vier weken<Icon name="tabler:arrow-right" class="size-4" /></NuxtLink>
      </div>
    </RitualShell>
  </div>
</template>
