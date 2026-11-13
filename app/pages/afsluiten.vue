<script setup lang="ts">
// Dag afsluiten: wat is er gebeurd, wat gaat door, routines, wat ging goed, en morgen.
import type { SkipReason, Task } from '~/types'
import { CATEGORIES, categoryOf, categoryOfTask } from '~/utils/category'
import { SKIP_REASONS } from '~/composables/useRoutines'

useHead({ title: 'Dag afsluiten · Stuurhut' })
const root = ref<HTMLElement | null>(null)
useMotion(root)

const { state } = useStore()
const rituals = useRituals()
const rhythm = useRhythm()
const tasks = useTasks()
const cal = useCalendar()
const R = useRoutines()
const D = useDomain()
const toast = useToast()
const today = todayISO()

const step = ref(0)
const STEPS = 5

// ---------- 1. Gedaan ----------
const todays = computed(() => tasks.tasks.value.filter(t => t.date === today).sort((a, b) => (a.start ?? '').localeCompare(b.start ?? '')))
const done = computed(() => todays.value.filter(t => t.done).length)

// ---------- 2. Wat gaat door ----------
type Choice = 'morgen' | 'later' | 'los'
const open = computed(() => todays.value.filter(t => !t.done))
const choices = reactive<Record<string, Choice>>({})
const nextDay = computed(() => cal.days.value.find(d => d > today && D.isWorkday(d)) ?? cal.days.value[1]!)
function carryOver() {
  let n = 0
  for (const t of [...open.value]) {
    const c = choices[t.id] ?? 'morgen'
    if (c === 'los') { tasks.remove(t.id); continue }
    if (c === 'later') { tasks.unschedule(t.id); n++; continue }
    const isPrive = domainOfTask(t) === 'prive'
    const slot = isPrive
      ? cal.findSlot(t.durationMin, { domain: 'prive', excludeTaskId: t.id, fromIndex: 1 })
      : cal.findSlotOn(nextDay.value, t.durationMin, toMin(state.value.prefs.workHours.start), t.id) ?? cal.findSlot(t.durationMin, { excludeTaskId: t.id, fromIndex: 1, deep: t.deep })
    if (slot) tasks.schedule(t.id, slot.date, slot.start)
    else tasks.unschedule(t.id)
    n++
  }
  return n
}
const CHOICES: { v: Choice, l: string }[] = [{ v: 'morgen', l: 'Morgen' }, { v: 'later', l: 'Later' }, { v: 'los', l: 'Laat los' }]

// ---------- 3. Routines ----------
const asking = ref<string | null>(null)
function routineDone(id: string) { R.mark(id, true) }
function routineSkip(id: string, reason: SkipReason) { R.mark(id, false, reason); asking.value = null }

// ---------- 4. Wat ging goed ----------
const win = ref(rituals.ended.value?.win ?? '')
const energy = ref<number | null>(rituals.ended.value?.energy ?? null)
const winIdeas = computed(() => todays.value.filter(t => t.done).slice(0, 3).map(t => `${t.title} afgerond`))

// ---------- 5. Morgen ----------
const tomorrowItems = computed(() => cal.dayItems(nextDay.value).filter(i => domainOf(i) === 'zakelijk'))
const tomorrowLoad = computed(() => cal.dayLoad(nextDay.value))
let carried = 0

function next() {
  if (step.value === 1) carried = carryOver()
  if (step.value === 3 && energy.value) rhythm.checkIn(energy.value)
  if (step.value === STEPS - 1) {
    rituals.saveDayEnd({ win: win.value.trim() || undefined, energy: energy.value ?? undefined, carried })
    toast.push({ text: 'Dag afgesloten. Laptop dicht.' })
    navigateTo('/')
    return
  }
  step.value++
}
</script>

<template>
  <div ref="root">
    <RitualShell title="Dag afsluiten" icon="tabler:moon" tone="sea" :step="step" :steps="STEPS" :next-label="step === STEPS - 1 ? 'Laptop dicht' : 'Volgende'" @next="next" @back="step--">
      <!-- 1 -->
      <div v-if="step === 0">
        <h2 class="text-[26px] leading-tight">Wat heb je gedaan?</h2>
        <p class="mt-1 text-[15px] text-muted">Vink af wat klaar is. <span class="num text-ink">{{ done }} van {{ todays.length }}</span></p>
        <ul class="mt-4 space-y-2">
          <li v-for="t in todays" :key="t.id">
            <button type="button" class="flex min-h-14 w-full items-center gap-3 rounded-[14px] border border-line bg-surface/85 p-2.5 text-left" :aria-pressed="!!t.done" @click="tasks.toggleDone(t.id)">
              <span class="grid size-7 shrink-0 place-items-center rounded-full border-2" :class="t.done ? 'border-green-bar bg-green-bar text-white' : 'border-ui-border'"><Icon v-if="t.done" name="tabler:check" class="size-4" /></span>
              <span class="grid size-8 shrink-0 place-items-center rounded-[10px] text-cat-ink" :class="CATEGORIES[categoryOfTask(t)].fill"><Icon :name="CATEGORIES[categoryOfTask(t)].icon" class="size-4" /></span>
              <span class="min-w-0 flex-1 truncate text-[15.5px]" :class="t.done ? 'text-muted line-through decoration-1' : ''">{{ t.title }}</span>
              <span class="num text-[13px] text-muted">{{ t.start }}</span>
            </button>
          </li>
          <li v-if="!todays.length" class="rounded-[14px] bg-surface/80 p-4 text-muted">Er stonden vandaag geen taken.</li>
        </ul>
      </div>

      <!-- 2 -->
      <div v-else-if="step === 1">
        <h2 class="text-[26px] leading-tight">Wat gaat door?</h2>
        <p class="mt-1 text-[15px] text-muted">{{ open.length ? `Zonder keuze zet ik het op ${relDay(nextDay)}.` : 'Alles is klaar. Niets om mee te nemen.' }}</p>
        <ul class="mt-4 space-y-2">
          <li v-for="t in open" :key="t.id" class="rounded-[14px] border border-line bg-surface/85 p-3">
            <p class="text-[15.5px]">{{ t.title }}</p>
            <div class="mt-2 grid grid-cols-3 gap-1.5">
              <button v-for="c in CHOICES" :key="c.v" type="button" class="min-h-10 rounded-full border text-[13.5px] transition-colors" :class="(choices[t.id] ?? 'morgen') === c.v ? 'border-transparent bg-primary text-on-primary' : 'border-line-strong'" :aria-pressed="(choices[t.id] ?? 'morgen') === c.v" @click="choices[t.id] = c.v">{{ c.v === 'morgen' ? cap(relDay(nextDay)) : c.l }}</button>
            </div>
          </li>
        </ul>
      </div>

      <!-- 3 -->
      <div v-else-if="step === 2">
        <h2 class="text-[26px] leading-tight">Je routines</h2>
        <p class="mt-1 text-[15px] text-muted">Eerlijk is genoeg. Een gemiste dag is informatie, geen falen.</p>
        <ul class="mt-4 space-y-2">
          <li v-for="rt in R.dueToday.value" :key="rt.id" class="rounded-[14px] border border-line bg-surface/85 p-3">
            <div class="flex items-center gap-3">
              <span class="grid size-10 shrink-0 place-items-center rounded-[12px] bg-cat-prive text-cat-ink"><Icon :name="rt.icon" class="size-5" /></span>
              <div class="min-w-0 flex-1"><p class="truncate text-[15.5px]">{{ rt.name }}</p><p class="text-[12.5px] text-muted">{{ R.week(rt).done }}/{{ rt.goal }} deze week</p></div>
              <template v-if="R.stateOn(rt, today) === 'open'">
                <button type="button" class="grid size-11 place-items-center rounded-full border-2 border-ink/70" :aria-label="`${rt.name} gedaan`" @click="routineDone(rt.id)"><Icon name="tabler:check" class="size-5" /></button>
                <button type="button" class="grid size-11 place-items-center rounded-full border border-line-strong text-muted" :aria-label="`${rt.name} niet gelukt`" @click="asking = asking === rt.id ? null : rt.id"><Icon name="tabler:x" class="size-5" /></button>
              </template>
              <span v-else class="grid size-11 place-items-center rounded-full" :class="R.stateOn(rt, today) === 'done' ? 'bg-green-bar text-white' : 'bg-copper-soft text-copper-ink'"><Icon :name="R.stateOn(rt, today) === 'done' ? 'tabler:check' : 'tabler:x'" class="size-5" /></span>
            </div>
            <div v-if="asking === rt.id" class="mt-3 flex flex-wrap gap-1.5">
              <button v-for="r in SKIP_REASONS" :key="r" type="button" class="min-h-10 rounded-full border border-line-strong px-3.5 text-[14px]" @click="routineSkip(rt.id, r)">{{ r }}</button>
            </div>
          </li>
          <li v-if="!R.dueToday.value.length" class="rounded-[14px] bg-surface/80 p-4 text-muted">Vandaag geen routines.</li>
        </ul>
      </div>

      <!-- 4 -->
      <div v-else-if="step === 3">
        <h2 class="text-[26px] leading-tight">Wat ging goed vandaag?</h2>
        <p class="mt-1 text-[15px] text-muted">Eén ding is genoeg. In de weekreview zie je ze terug.</p>
        <input v-model="win" class="field-input mt-4" placeholder="Bijv. offerte de deur uit" aria-label="Wat ging goed vandaag">
        <div v-if="winIdeas.length" class="mt-2 flex flex-wrap gap-1.5">
          <button v-for="w in winIdeas" :key="w" type="button" class="min-h-9 rounded-full bg-surface/85 px-3 text-[13.5px]" @click="win = w">{{ w }}</button>
        </div>
        <p class="mt-5 field-label">Hoe is je energie nu?</p>
        <div class="grid grid-cols-5 gap-1.5">
          <button v-for="v in 5" :key="v" type="button" class="num min-h-12 rounded-[14px] border text-[18px]" :class="energy === v ? 'border-transparent bg-primary text-on-primary' : 'border-line bg-surface/85'" :aria-pressed="energy === v" @click="energy = v">{{ v }}</button>
        </div>
      </div>

      <!-- 5 -->
      <div v-else>
        <h2 class="text-[26px] leading-tight">{{ cap(relDay(nextDay)) }}</h2>
        <p class="mt-1 text-[15px] text-muted">{{ tomorrowItems.length ? `Je begint om ${tomorrowItems[0]!.start} met ${tomorrowItems[0]!.title.toLowerCase()}.` : 'Nog niets gepland.' }} {{ cap(tomorrowLoad.level) }}, {{ duration(tomorrowLoad.minutes) }} werk.</p>
        <ul class="mt-4 space-y-1.5">
          <li v-for="i in tomorrowItems.slice(0, 5)" :key="i.id" class="flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-cat-ink" :class="CATEGORIES[categoryOf(i)].fill">
            <span class="num w-12 text-[14px]">{{ i.start }}</span><span class="min-w-0 flex-1 truncate text-[15px]">{{ i.title }}</span>
          </li>
        </ul>
        <div class="mt-4 flex items-center gap-3 rounded-[14px] bg-surface/85 p-3.5">
          <Icon name="tabler:moon" class="size-5 shrink-0" />
          <p class="text-[14.5px]">Je werkdag zit erop. Telefoon om 22:30 weg, dan slaap je beter.</p>
        </div>
      </div>
    </RitualShell>
  </div>
</template>
