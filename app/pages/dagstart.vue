<script setup lang="ts">
// Dagstart: twee minuten. Hoe kom je binnen, wat staat er, wat telt, en Stuurman denkt mee.
import type { Task } from '~/types'
import { CATEGORIES, categoryOfTask } from '~/utils/category'

useHead({ title: 'Dagstart · Stuurhut' })
const root = ref<HTMLElement | null>(null)
useMotion(root)

const { state } = useStore()
const rituals = useRituals()
const rhythm = useRhythm()
const tasks = useTasks()
const cal = useCalendar()
const R = useRoutines()
const clients = useClients()
const toast = useToast()
const today = todayISO()

const step = ref(0)
const STEPS = 5
const S = useSleep()
// Slaap: twee tijden en hoe je wakker werd. Vooringevuld, dus meestal alleen bevestigen.
const lastNight = state.value.rhythm.at(-1)
const nowRounded = Math.round(nowMin() / 5) * 5
const bed = ref<string>(rituals.started.value?.bed ?? (lastNight?.bed ? clock(Math.round(nightMin(lastNight.bed) / 15) * 15) : S.forMorning(today).bed))
const woke = ref<string>(rituals.started.value?.woke ?? (lastNight?.date === today && lastNight.woke ? lastNight.woke : null) ?? (nowRounded >= 5 * 60 && nowRounded < 12 * 60 ? clock(nowRounded) : S.wakeToday.value))
const rested = ref<1 | 2 | 3 | null>(rituals.started.value?.rested ?? null)
const RESTED = [{ v: 1, l: 'moe' }, { v: 2, l: 'gaat wel' }, { v: 3, l: 'uitgerust' }] as const
const TIMES = [{ key: 'bed', label: 'Naar bed', r: bed }, { key: 'op', label: 'Opgestaan', r: woke }]
const shift = (r: typeof bed, d: number) => { r.value = clock(clockMin(r.value) + d) }
const sleep = computed(() => Math.round(sleepHours(bed.value, woke.value) * 4) / 4)
const wokeDiff = computed(() => clockMin(woke.value) - clockMin(S.wakeToday.value))
const energy = ref<number | null>(rituals.started.value?.energy ?? rhythm.todayEnergy.value)
// Nooit twee keer missen: één vraag, alleen als ook gisteren niet lukte
const missed = computed(() => S.missedTwiceWith({ date: today, woke: woke.value }))
const missAnswer = ref('')
function answerMiss(back: boolean) {
  if (back) {
    S.stepBack(today)
    missAnswer.value = `Deze week op om ${S.wakeToday.value}. Lukt het, dan gaan we volgende week weer verder.`
  }
  else {
    S.keepGoing(today)
    missAnswer.value = 'Goed. Morgen gewoon weer.'
  }
}
const evening = computed(() => S.forMorning(addDays(today, 1)))
const ENERGY = [{ v: 1, l: 'leeg' }, { v: 2, l: 'moe' }, { v: 3, l: 'oké' }, { v: 4, l: 'goed' }, { v: 5, l: 'sterk' }]

// ---------- Wat telt ----------
const candidates = computed(() => tasks.tasks.value
  .filter(t => !t.done && (t.date === today || (!t.date && (t.important || t.deep))))
  .sort((a, b) => Number(!!b.important) - Number(!!a.important) || (a.start ?? '99').localeCompare(b.start ?? '99'))
  .slice(0, 8))
const picks = ref<string[]>(candidates.value.filter(t => t.important).slice(0, 3).map(t => t.id))
function togglePick(id: string) {
  if (picks.value.includes(id)) picks.value = picks.value.filter(x => x !== id)
  else if (picks.value.length < 3) picks.value = [...picks.value, id]
  else toast.push({ text: 'Drie is genoeg. Haal er eerst één weg.' })
}
const todayAnchor = computed(() => tasks.tasks.value.find(t => t.anchor && t.date === today && !t.done))
const anchorUsed = ref<{ title: string, start: string } | null>(null)
function applyPicks() {
  for (const t of candidates.value) t.important = picks.value.includes(t.id)
  // Je vaste eerste blok krijgt het eerste denkwerk dat nog geen tijd heeft
  const anchor = tasks.tasks.value.find(t => t.anchor && t.date === today && !t.done)
  const first = picks.value.map(id => tasks.byId(id)).find(t => t && !t.date && t.deep && t.durationMin <= 120)
  if (anchor && first) {
    const start = anchor.start!
    tasks.remove(anchor.id)
    tasks.schedule(first.id, today, start)
    anchorUsed.value = { title: first.title, start }
  }
  for (const id of picks.value) {
    const t = tasks.byId(id)
    if (t && !t.date) {
      const slot = cal.findSlotOn(today, t.durationMin, toMin(state.value.prefs.workHours.start), t.id)
      if (slot && toMin(slot.start) + t.durationMin <= toMin(state.value.prefs.workHours.end)) tasks.schedule(t.id, slot.date, slot.start)
    }
  }
}

// ---------- Stuurman denkt mee ----------
const deepToday = computed(() => tasks.tasks.value.filter(t => t.date === today && t.deep && !t.done && t.start && toMin(t.start) > nowMin()))
const lightened = ref(false)
function keepLight() {
  let n = 0
  for (const t of deepToday.value) {
    const slot = cal.findSlot(t.durationMin, { deep: true, preferMorning: true, excludeTaskId: t.id, fromIndex: 1 })
    if (slot) { tasks.schedule(t.id, slot.date, slot.start); n++ }
  }
  lightened.value = true
  toast.push({ text: n ? `${n === 1 ? 'Eén denkblok' : `${n} denkblokken`} naar een betere ochtend geschoven.` : 'Er stond geen denkwerk meer vandaag.' })
}
const firstPick = computed(() => picks.value.map(id => tasks.byId(id)).find(Boolean) as Task | undefined)

function next() {
  if (step.value === 0 && energy.value) rhythm.checkIn(energy.value)
  if (step.value === 2) applyPicks()
  if (step.value === STEPS - 1) {
    rituals.saveDayStart({ sleep: sleep.value, bed: bed.value, woke: woke.value, rested: rested.value ?? undefined, energy: energy.value ?? undefined, picks: picks.value })
    toast.push({ text: 'Fijne dag. Ik houd het in de gaten.' })
    navigateTo('/')
    return
  }
  step.value++
}

const items = computed(() => cal.dayItems(today))
const meetings = computed(() => items.value.filter(i => i.type === 'event'))
const load = computed(() => cal.dayLoad(today))
</script>

<template>
  <div ref="root">
    <RitualShell title="Dagstart" icon="tabler:sun" tone="warm" :step="step" :steps="STEPS" :next-label="step === STEPS - 1 ? 'Begin je dag' : 'Volgende'" :next-disabled="step === 0 && !energy" @next="next" @back="step--">
      <!-- 1. Hoe kom je binnen -->
      <div v-if="step === 0">
        <p class="eyebrow">{{ longDate(today) }}</p>
        <h2 class="mt-1 text-[28px] leading-tight">Goedemorgen, {{ USER_NAME }}. Hoe kom je binnen?</h2>
        <div class="mt-5 grid grid-cols-2 gap-2">
          <div v-for="row in TIMES" :key="row.key" class="rounded-[14px] bg-surface/80 p-2.5">
            <p class="px-1 text-[13px] text-muted">{{ row.label }}</p>
            <div class="mt-1 flex items-center justify-between gap-1">
              <button type="button" class="grid size-11 place-items-center rounded-full hover:bg-surface-2" :aria-label="`${row.label} een kwartier eerder`" @click="shift(row.r, -15)"><Icon name="tabler:minus" class="size-4" /></button>
              <span class="num text-[24px] leading-none" aria-live="polite">{{ row.r.value }}</span>
              <button type="button" class="grid size-11 place-items-center rounded-full hover:bg-surface-2" :aria-label="`${row.label} een kwartier later`" @click="shift(row.r, 15)"><Icon name="tabler:plus" class="size-4" /></button>
            </div>
          </div>
        </div>
        <p class="mt-2 text-[14px] text-muted">
          Ongeveer <span class="num text-ink">{{ duration(Math.round(sleep * 60)) }}</span> slaap.
          <template v-if="wokeDiff <= allowance(today)">Je doel was {{ S.wakeToday.value }}. Gelukt.</template>
          <template v-else>Je doel was {{ S.wakeToday.value }}. Geeft niks, morgen gewoon weer.</template>
        </p>
        <div v-if="missed && !missAnswer" class="mt-3 rounded-[14px] bg-surface/90 p-3.5">
          <p class="text-[15px] leading-snug">Gisteren lukte het ook niet. Is de stap te groot? Dan houden we deze week {{ S.stepBackWake.value }} aan.</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <button type="button" class="btn-primary !min-h-11" @click="answerMiss(true)">Ja, een stap terug</button>
            <button type="button" class="btn-outline !min-h-11" @click="answerMiss(false)">Nee, ik ga door</button>
          </div>
        </div>
        <p v-else-if="missAnswer" class="mt-2 text-[14px]">{{ missAnswer }}</p>
        <p class="mt-4 field-label">Hoe werd je wakker?</p>
        <div class="grid grid-cols-3 gap-1.5">
          <button v-for="o in RESTED" :key="o.v" type="button" class="min-h-12 rounded-[14px] border text-[14.5px] transition-colors" :class="rested === o.v ? 'border-transparent bg-primary text-on-primary' : 'border-line bg-surface/80'" :aria-pressed="rested === o.v" @click="rested = o.v">{{ o.l }}</button>
        </div>
        <p class="mt-5 field-label">Hoeveel energie heb je?</p>
        <div class="grid grid-cols-5 gap-1.5">
          <button v-for="e in ENERGY" :key="e.v" type="button" class="flex min-h-16 flex-col items-center justify-center rounded-[14px] border transition-colors" :class="energy === e.v ? 'border-transparent bg-primary text-on-primary' : 'border-line bg-surface/80'" :aria-pressed="energy === e.v" @click="energy = e.v">
            <span class="num text-[20px] leading-none">{{ e.v }}</span><span class="mt-1 text-[12px]" :class="energy === e.v ? 'opacity-75' : 'text-muted'">{{ e.l }}</span>
          </button>
        </div>
      </div>

      <!-- 2. Dit is je dag -->
      <div v-else-if="step === 1">
        <h2 class="text-[26px] leading-tight">Dit is je dag</h2>
        <p class="mt-1 text-[15px] text-muted">{{ meetings.length ? `${meetings.length} afspraken, de eerste om ${meetings[0]!.start}.` : 'Geen afspraken.' }} {{ duration(load.minutes) }} werk gepland, {{ load.level }}.</p>
        <div class="mt-4 rounded-[16px] bg-surface/85 p-3"><DayAgenda :date="today" /></div>
        <div v-if="R.dueToday.value.length" class="mt-4">
          <p class="field-label">Routines vandaag</p>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="rt in R.dueToday.value" :key="rt.id" class="chip bg-cat-prive !py-2 text-cat-ink"><Icon :name="rt.icon" class="size-3.5" />{{ rt.name }} · {{ rt.cue }}</span>
          </div>
        </div>
      </div>

      <!-- 3. Wat telt -->
      <div v-else-if="step === 2">
        <h2 class="text-[26px] leading-tight">Wat telt vandaag?</h2>
        <p class="mt-1 text-[15px] text-muted">Kies er hooguit drie. De rest mag wachten. <span class="num text-ink">{{ picks.length }}/3</span></p>
        <ul class="mt-4 space-y-2">
          <li v-for="t in candidates" :key="t.id">
            <button type="button" class="flex min-h-14 w-full items-center gap-3 rounded-[14px] border p-2.5 text-left transition-colors" :class="picks.includes(t.id) ? 'border-ink bg-surface' : 'border-line bg-surface/70'" :aria-pressed="picks.includes(t.id)" @click="togglePick(t.id)">
              <span class="grid size-7 shrink-0 place-items-center rounded-full border-2" :class="picks.includes(t.id) ? 'border-ink bg-ink text-surface' : 'border-ui-border'"><Icon v-if="picks.includes(t.id)" name="tabler:check" class="size-4" /></span>
              <span class="grid size-8 shrink-0 place-items-center rounded-[10px] text-cat-ink" :class="CATEGORIES[categoryOfTask(t)].fill"><Icon :name="CATEGORIES[categoryOfTask(t)].icon" class="size-4" /></span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[15.5px]">{{ t.title }}</span>
                <span class="block text-[12.5px] text-muted">{{ [t.start ? `vandaag ${t.start}` : 'nog zonder tijd', duration(t.durationMin), clients.byId(t.clientId)?.name].filter(Boolean).join(' · ') }}</span>
              </span>
            </button>
          </li>
          <li v-if="!candidates.length" class="rounded-[14px] bg-surface/80 p-4 text-muted">Niets openstaands. Een vrije dag om zelf in te vullen.</li>
        </ul>
        <p class="mt-3 text-[13px] text-muted">{{ todayAnchor ? `Het eerste denkwerk zonder tijd komt in je vaste blok van ${todayAnchor.start}. ` : '' }}Wat nog geen tijd heeft, zet ik vandaag binnen je werktijd als het past.</p>
      </div>

      <!-- 4. Stuurman denkt mee -->
      <div v-else-if="step === 3">
        <h2 class="flex items-center gap-2 text-[26px] leading-tight"><Icon name="tabler:steering-wheel" class="size-6" />Stuurman denkt mee</h2>
        <div v-if="(energy ?? 3) <= 2" class="mt-4 rounded-[16px] bg-cat-prive p-4 text-cat-ink">
          <p class="text-[16px] leading-snug">Je zit niet vol energie. Zal ik het denkwerk van vandaag naar een betere ochtend schuiven? Dan houd je vandaag licht.</p>
          <ul v-if="deepToday.length" class="mt-2 text-[14px] text-cat-ink-muted"><li v-for="t in deepToday" :key="t.id">· {{ t.title }} ({{ t.start }})</li></ul>
          <div class="mt-3 flex flex-wrap gap-2">
            <button v-if="!lightened" type="button" class="min-h-10 rounded-full bg-cat-ink px-4 text-[14px] text-white" @click="keepLight">Ja, houd vandaag licht</button>
            <span v-else class="chip bg-white/60 !py-2"><Icon name="tabler:check" class="size-3.5" />Geregeld</span>
          </div>
        </div>
        <div v-else class="mt-4 rounded-[16px] bg-cat-focus p-4 text-cat-ink">
          <p class="text-[16px] leading-snug">{{ (energy ?? 3) >= 4 ? 'Goede energie. Begin met het zwaarste:' : 'Een gewone dag. Begin met:' }} <b class="font-normal underline decoration-1 underline-offset-4">{{ firstPick?.title ?? 'wat je zelf het belangrijkst vindt' }}</b>{{ firstPick?.start ? ` om ${firstPick.start}` : '' }}.</p>
          <p class="mt-1 text-[14px] text-cat-ink-muted">Daarna wordt de rest van de dag lichter.</p>
        </div>
        <div v-if="sleep < 6.5" class="mt-3 rounded-[16px] bg-surface/85 p-4">
          <p class="text-[15px] leading-snug">Korte nacht. Ga vanavond niet eerder naar bed dan je moe bent, maar sta morgen wel om {{ evening.wake }} op. Zo komt je ritme het snelst terug.</p>
        </div>
        <div v-if="anchorUsed" class="mt-3 flex items-center gap-3 rounded-[16px] bg-surface/85 p-4">
          <Icon name="tabler:sunrise" class="size-5 shrink-0" />
          <p class="text-[15px] leading-snug">Je eerste blok om {{ anchorUsed.start }} is voor {{ anchorUsed.title }}.</p>
        </div>
        <div class="mt-3 flex items-center gap-3 rounded-[16px] bg-surface/85 p-4">
          <Icon name="tabler:device-laptop" class="size-5 shrink-0" />
          <p class="text-[15px] leading-snug">Vanavond gaat je laptop om {{ evening.laptop }} dicht. Dan lig je om {{ evening.bed }} in bed, en sta je morgen om {{ evening.wake }} op.</p>
        </div>
      </div>

      <!-- 5. Klaar -->
      <div v-else class="py-4 text-center">
        <span class="mx-auto grid size-14 place-items-center rounded-full bg-primary text-on-primary"><Icon name="tabler:sun" class="size-7" /></span>
        <h2 class="mt-4 text-[28px] leading-tight">Je dag staat.</h2>
        <p class="mt-1 text-[15px] text-muted">Dit telt vandaag:</p>
        <ul class="mx-auto mt-3 max-w-[420px] space-y-1.5 text-left">
          <li v-for="(id, i) in picks" :key="id" class="flex items-center gap-3 rounded-[12px] bg-surface/85 px-3.5 py-2.5"><span class="num text-muted">{{ i + 1 }}</span><span class="flex-1 text-[15px]">{{ tasks.byId(id)?.title }}</span><span class="num text-[13px] text-muted">{{ tasks.byId(id)?.start ?? '' }}</span></li>
        </ul>
      </div>
    </RitualShell>
  </div>
</template>
