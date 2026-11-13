<script setup lang="ts">
import { routineInsights } from '~/utils/stuurman.mock'

useHead({ title: 'Ritme · Stuurhut' })
const root = ref<HTMLElement | null>(null)
useMotion(root)

const r = useRhythm()
const stuurman = useStuurman()
const toast = useToast()

const LEVELS = [
  { v: 1, label: 'leeg' },
  { v: 2, label: 'moe' },
  { v: 3, label: 'oké' },
  { v: 4, label: 'goed' },
  { v: 5, label: 'sterk' },
]
function checkIn(v: number) {
  r.checkIn(v)
  toast.push({ text: v <= 2 ? 'Genoteerd. Ik houd vandaag rekening met je.' : 'Genoteerd. Dank je.' })
}
const energyText = computed(() => {
  const e = r.todayEnergy.value
  if (!e) return 'Eén tik, dan weet ik hoe je erbij zit.'
  if (e <= 2) return 'Rustig aan vandaag. Zal ik de middag licht houden?'
  if (e === 3) return 'Een gewone dag. Prima zo.'
  return 'Goed moment voor denkwerk.'
})

const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length
const days = computed(() => r.days.value.slice(-42))
const last14 = computed(() => days.value.slice(-14))
const first28 = computed(() => days.value.slice(0, 28))
const workWeek = (list: typeof days.value) => (avg(list.map(d => d.workH)) * 7)

const patterns = computed(() => [
  { key: 'slaap', label: 'Slaap', icon: 'tabler:moon', tone: 'sea' as const, value: `${dec1(avg(days.value.map(d => d.sleepH)))} u`, sub: 'gemiddeld per nacht', series: days.value.map(d => d.sleepH), min: 5, max: 9, change: avg(last14.value.map(d => d.sleepH)) - avg(first28.value.map(d => d.sleepH)), unit: 'u' },
  { key: 'beweging', label: 'Beweging', icon: 'tabler:walk', tone: 'green' as const, value: `${Math.round(avg(days.value.map(d => d.moveMin)))} min`, sub: 'gemiddeld per dag', series: days.value.map(d => d.moveMin), min: 0, max: 100, change: avg(last14.value.map(d => d.moveMin)) - avg(first28.value.map(d => d.moveMin)), unit: 'min' },
  { key: 'werk', label: 'Werkuren', icon: 'tabler:briefcase', tone: 'copper' as const, value: `${Math.round(workWeek(last14.value))} u`, sub: 'per week, laatste twee weken', series: r.weeks.value.map(w => w.work), min: 20, max: 55, change: workWeek(last14.value) - workWeek(first28.value), unit: 'u' },
  { key: 'energie', label: 'Energie', icon: 'tabler:bolt', tone: 'sea' as const, value: dec1(avg(days.value.map(d => d.energy))), sub: 'gemiddeld, van 1 tot 5', series: days.value.map(d => d.energy), min: 1, max: 5, change: avg(last14.value.map(d => d.energy)) - avg(first28.value.map(d => d.energy)), unit: '' },
])
const fmtChange = (n: number, unit: string) => `${n >= 0 ? '+' : '−'}${unit === 'min' || unit === 'u' && Math.abs(n) >= 2 ? Math.round(Math.abs(n)) : dec1(Math.abs(n))}${unit ? ` ${unit}` : ''}`

const { state } = useStore()
const R = useRoutines()
const editor = useEditor()
const insights = computed(() => routineInsights(state.value))
const insightFor = (id: string) => insights.value.find(i => i.routineId === id)

// Motivatie: wat is er nog nodig om deze week te halen?
const needs = computed(() => R.routines.value.map(rt => ({ rt, w: R.week(rt) })).filter(x => !x.w.reached && x.w.feasible))
const motivation = computed(() => {
  if (!needs.value.length) return 'Alles wat nog kan, heb je deze week gehaald.'
  const parts = needs.value.map(x => `${x.w.need}× ${x.rt.name.toLowerCase().replace(/ na de lunch| om half elf/, '')}`)
  return `Nog ${parts.join(', ').replace(/, ([^,]*)$/, ' en $1')}, dan haal je je week.`
})
const scoreDelta = computed(() => Math.round((R.score.value.now - R.score.value.last) * 100))
const WEEK_LABELS = ['−6', '−5', '−4', '−3', '−2', 'vorige', 'nu']
</script>

<template>
  <div ref="root">
    <PageHeader title="Ritme" sub="Je routines, en wat er gebeurt als ze niet lukken.">
      <template #actions>
        <button type="button" class="btn-primary" @click="editor.open({ kind: 'routine' })"><Icon name="tabler:plus" class="size-4" />Nieuwe routine</button>
      </template>
    </PageHeader>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <!-- Ritmescore -->
      <section class="card-mint p-6 lg:col-span-7" aria-labelledby="score" data-enter>
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 id="score" class="text-[14px] text-green-ink">Ritmescore deze week</h2>
            <p class="mt-1 text-[56px] leading-none tracking-[-0.03em]"><UiCountUp :value="Math.round(R.score.value.now * 100)" />%</p>
            <p class="mt-2 text-[13.5px] text-muted">van wat tot nu toe kon · gemiddeld {{ Math.round(R.score.value.sixWeeks * 100) }}% over zes weken</p>
          </div>
          <span class="chip !py-1.5" :class="scoreDelta >= 0 ? 'bg-green-soft text-green-ink' : 'bg-copper-soft text-copper-ink'">
            <Icon :name="scoreDelta >= 0 ? 'tabler:trending-up' : 'tabler:trending-down'" class="size-3.5" />{{ scoreDelta >= 0 ? '+' : '' }}{{ scoreDelta }}% t.o.v. vorige week
          </span>
        </div>
        <div class="mt-5 flex h-16 items-end gap-2" role="img" :aria-label="`Score per week: ${R.score.value.weeks.map(w => Math.round(w * 100) + '%').join(', ')}`">
          <div v-for="(w, i) in R.score.value.weeks" :key="i" class="flex flex-1 flex-col items-center gap-1">
            <span class="w-full rounded-[6px]" :class="i === 6 ? 'bg-ink' : 'bg-green-bar/70'" :style="{ height: `${Math.max(8, w * 52)}px` }" />
            <span class="text-[11px] text-muted">{{ WEEK_LABELS[i] }}</span>
          </div>
        </div>
        <p class="mt-4 flex items-center gap-2 rounded-[12px] bg-surface/80 px-3 py-2.5 text-[14.5px]"><Icon name="tabler:flag" class="size-4 shrink-0" />{{ motivation }}</p>
      </section>

      <!-- Check-in -->
      <section class="card p-5 lg:col-span-5" aria-labelledby="checkin" data-enter>
        <h2 id="checkin" class="text-[15px]">Energie nu</h2>
        <div class="mt-3 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Energie van 1 tot 5">
          <button v-for="l in LEVELS" :key="l.v" type="button" role="radio" :aria-checked="r.todayEnergy.value === l.v" class="flex min-h-[60px] flex-col items-center justify-center rounded-[14px] border transition-colors" :class="r.todayEnergy.value === l.v ? 'bg-primary text-on-primary border-transparent' : 'bg-surface-2 border-transparent hover:bg-surface-3'" @click="checkIn(l.v)">
            <span class="num text-[19px] leading-none">{{ l.v }}</span>
            <span class="mt-1 text-[11.5px]" :class="r.todayEnergy.value === l.v ? 'opacity-75' : 'text-muted'">{{ l.label }}</span>
          </button>
        </div>
        <p class="mt-3 text-[14px] text-muted">{{ energyText }}</p>
      </section>
    </div>

    <SleepCard />

    <!-- Routines -->
    <h2 class="mb-3 mt-7 text-[19px]" data-enter>Mijn routines</h2>
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div v-for="rt in R.routines.value" :key="rt.id" data-enter>
        <RoutineCard :routine="rt" :insight="insightFor(rt.id)" :reminder="state.prefs.reminders[rt.id]" />
      </div>
      <button type="button" class="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-ui-border text-muted transition-colors hover:border-ink hover:text-ink" data-enter @click="editor.open({ kind: 'routine' })">
        <span class="grid size-11 place-items-center rounded-full border border-current"><Icon name="tabler:plus" class="size-5" /></span>
        <span class="text-[15px]">Nieuwe routine</span>
      </button>
    </div>

    <section v-if="R.paused.value.length" class="mt-5" aria-label="Gepauzeerd">
      <p class="mb-2 text-[13px] text-muted">Gepauzeerd</p>
      <ul class="space-y-2">
        <li v-for="rt in R.paused.value" :key="rt.id" class="card flex items-center gap-3 p-3">
          <span class="grid size-10 place-items-center rounded-[12px] bg-surface-2 text-muted"><Icon :name="rt.icon" class="size-5" /></span>
          <span class="flex-1 text-[15px] text-muted">{{ rt.name }}</span>
          <button type="button" class="btn-outline !min-h-10 !px-3.5 !text-[14px]" @click="R.setPaused(rt.id, false)"><Icon name="tabler:player-play" class="size-4" />Hervatten</button>
        </li>
      </ul>
    </section>

    <!-- Patronen -->
    <section class="mt-7" aria-labelledby="patronen">
      <div class="mb-3 flex items-center justify-between gap-3" data-enter>
        <h2 id="patronen" class="text-[19px]">Zes weken</h2>
        <NuxtLink to="/terugblik" class="inline-flex min-h-10 items-center gap-1 text-[14px] text-muted hover:text-ink"><Icon name="tabler:history" class="size-4" />Terugblik</NuxtLink>
      </div>
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <article v-for="p in patterns" :key="p.key" class="card p-4" data-enter>
          <div class="flex items-center justify-between gap-2">
            <p class="label flex items-center gap-1.5"><Icon :name="p.icon" class="size-4" />{{ p.label }}</p>
            <span class="num text-[12.5px] text-muted">{{ fmtChange(p.change, p.unit) }}</span>
          </div>
          <p class="num mt-2 text-[26px] leading-none">{{ p.value }}</p>
          <div class="mt-3"><UiSpark :values="p.series" :tone="p.tone" :min="p.min" :max="p.max" :height="44" /></div>
        </article>
      </div>
    </section>
  </div>
</template>
