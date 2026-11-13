<script setup lang="ts">
// Eén routine: deze week in één oogopslag, vandaag afvinken, en wat er misgaat als het niet lukt.
import type { Routine, SkipReason } from '~/types'
import type { RoutineInsight } from '~/utils/stuurman.mock'
import { SKIP_REASONS } from '~/composables/useRoutines'

const props = defineProps<{ routine: Routine, insight?: RoutineInsight, reminder?: string }>()
const R = useRoutines()
const editor = useEditor()
const stuurman = useStuurman()
const toast = useToast()
const today = todayISO()

const week = computed(() => R.week(props.routine))
const days = computed(() => R.thisWeek.value.map(d => ({ date: d, state: R.stateOn(props.routine, d), log: props.routine.log[d] })))
const todayState = computed(() => R.stateOn(props.routine, today))
const hist = computed(() => R.history(props.routine))
const reasons = computed(() => R.reasons(props.routine))
const fix = computed(() => (props.insight?.fix ? stuurman.all.value.find(s => s.id === props.insight!.fix!.id) : undefined))
const asking = ref(false)

const status = computed(() => {
  const w = week.value
  if (w.reached) return { label: 'Gehaald', cls: 'bg-green-soft text-green-ink' }
  if (!w.feasible) return { label: `Nog max. ${w.done + w.left}/${w.goal}`, cls: 'bg-copper-soft text-copper-ink' }
  if (w.need === w.left) return { label: `Nog ${w.need}× nodig`, cls: 'bg-cat-taak text-cat-ink' }
  return { label: 'Op koers', cls: 'bg-sea-soft text-sea-ink' }
})

function done() {
  R.mark(props.routine.id, true)
  const w = R.week(props.routine)
  toast.push({ text: w.reached ? `${props.routine.name}: weekdoel gehaald.` : `Genoteerd. Nog ${w.need} deze week.` })
}
function skip(reason: SkipReason) {
  R.mark(props.routine.id, false, reason)
  asking.value = false
  toast.push({ text: `Genoteerd: ${reason}. Ik kijk of dit vaker gebeurt.`, undo: () => R.clear(props.routine.id) })
}
// ---------- Bijsturen ----------
const miss = computed(() => R.doubleMiss(props.routine))
const tempo = computed(() => (miss.value ? null : R.tempo(props.routine)))
const pays = computed(() => R.pays(props.routine))
function answerMiss(action?: 'lager' | 'pauze' | 'herinner') {
  toast.push({ text: R.answerMiss(props.routine.id, action) })
}
function answerTempo(yes: boolean) {
  const t = tempo.value
  if (!t) return
  if (yes) {
    R.setGoal(props.routine.id, t.to)
    toast.push({ text: `${props.routine.name}: nu ${t.to}× per week.` })
  }
  else {
    R.keepGoal(props.routine.id)
    toast.push({ text: `Het blijft ${props.routine.goal}× per week.` })
  }
}
const REASON_COLOR: Record<SkipReason, string> = { 'geen tijd': 'bg-cat-taak-dot', 'te moe': 'bg-cat-admin-dot', 'vergeten': 'bg-copper', 'omstandigheden': 'bg-cat-meeting-dot', 'geen zin': 'bg-cat-prive-dot' }
</script>

<template>
  <article class="card flex flex-col p-5">
    <!-- Kop -->
    <header class="flex items-start gap-3">
      <span class="grid size-11 shrink-0 place-items-center rounded-[12px] bg-surface-2"><Icon :name="routine.icon" class="size-[22px]" /></span>
      <div class="min-w-0 flex-1">
        <h3 class="text-[17px] leading-tight">{{ routine.name }}</h3>
        <p class="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted"><Icon name="tabler:clock" class="size-3.5" />{{ routine.cue || 'Geen vast moment' }}</p>
      </div>
      <button type="button" class="icon-btn -mt-1.5 shrink-0 text-muted" :aria-label="`${routine.name} bewerken`" title="Bewerken" @click="editor.open({ kind: 'routine', id: routine.id })"><Icon name="tabler:pencil" class="size-[18px]" /></button>
      <div class="text-right">
        <p class="num text-[26px] leading-none">{{ week.done }}<span class="text-[16px] text-muted">/{{ week.goal }}</span></p>
        <span class="chip mt-1.5" :class="status.cls">{{ status.label }}</span>
      </div>
    </header>

    <!-- Deze week -->
    <ol class="mt-4 grid grid-cols-7 gap-1.5" aria-label="Deze week">
      <li v-for="d in days" :key="d.date" class="flex flex-col items-center gap-1">
        <span class="text-[11.5px]" :class="d.date === today ? 'text-ink' : 'text-muted'">{{ weekdayShort(d.date) }}</span>
        <span
          class="grid size-9 place-items-center rounded-full"
          :class="{
            done: 'bg-green-bar text-white',
            missed: 'bg-copper-soft text-copper-ink',
            open: 'border-2 border-ink',
            future: 'border border-dashed border-ui-border',
            rest: 'bg-surface-2',
          }[d.state]"
          :title="d.log?.reason ? `Niet gelukt: ${d.log.reason}` : d.state"
          :aria-label="`${weekdayLong(d.date)}: ${{ done: 'gedaan', missed: 'niet gelukt', open: 'vandaag', future: 'gepland', rest: 'geen dag' }[d.state]}`"
        >
          <Icon v-if="d.state === 'done'" name="tabler:check" class="size-4" />
          <Icon v-else-if="d.state === 'missed'" name="tabler:x" class="size-4" />
        </span>
      </li>
    </ol>

    <NuxtLink v-if="routine.id === 'r3'" to="/weekreview" class="mt-4 flex min-h-11 items-center gap-2 rounded-[12px] bg-cat-focus px-3 text-[14px] text-cat-ink"><Icon name="tabler:calendar-week" class="size-4" />Doe de weekreview, dan vink ik deze af<Icon name="tabler:arrow-right" class="ml-auto size-4" /></NuxtLink>

    <!-- Vandaag -->
    <div v-if="todayState === 'open'" class="mt-4">
      <div v-if="!asking" class="flex gap-2">
        <button type="button" class="btn-primary flex-1" @click="done"><Icon name="tabler:check" class="size-4" />Vandaag gedaan</button>
        <button type="button" class="btn-outline" @click="asking = true">Lukt niet</button>
      </div>
      <div v-else>
        <p class="mb-2 text-[13.5px] text-muted">Wat zit in de weg? Dan leer ik wat er misgaat.</p>
        <div class="flex flex-wrap gap-1.5">
          <button v-for="r in SKIP_REASONS" :key="r" type="button" class="min-h-10 rounded-full border border-line-strong px-3.5 text-[14px] hover:bg-surface-2" @click="skip(r)">{{ r }}</button>
          <button type="button" class="min-h-10 px-2 text-[14px] text-muted" @click="asking = false">Annuleer</button>
        </div>
      </div>
    </div>
    <p v-else-if="routine.log[today]" class="mt-4 flex items-center gap-2 text-[14px] text-muted">
      <Icon :name="routine.log[today]!.done ? 'tabler:check' : 'tabler:x'" class="size-4" />
      {{ routine.log[today]!.done ? 'Vandaag gedaan' : `Vandaag niet: ${routine.log[today]!.reason}` }}
      <button type="button" class="ml-auto min-h-9 text-[13.5px] text-ink underline underline-offset-4" @click="R.clear(routine.id)">Ongedaan</button>
    </p>

    <!-- Twee keer gemist: één vraag, passend bij je reden -->
    <div v-if="miss" class="mt-4 rounded-[14px] bg-cat-prive p-3.5 text-cat-ink">
      <p class="text-[14.5px] leading-snug">{{ miss.text }}</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <button v-if="miss.accept" type="button" class="min-h-11 rounded-full bg-cat-ink px-4 text-[14px] text-white" @click="answerMiss(miss.accept.action)">{{ miss.accept.label }}</button>
        <button type="button" class="min-h-11 rounded-full bg-white/70 px-4 text-[14px]" @click="answerMiss()">{{ miss.accept ? 'Ik ga door' : 'Oké' }}</button>
      </div>
    </div>
    <!-- Tempo: op- of afschalen -->
    <div v-else-if="tempo" class="mt-4 rounded-[14px] p-3.5 text-cat-ink" :class="tempo.dir === 'op' ? 'bg-cat-focus' : 'bg-cat-taak'">
      <p class="text-[14.5px] leading-snug">{{ tempo.text }}</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <button type="button" class="min-h-11 rounded-full bg-cat-ink px-4 text-[14px] text-white" @click="answerTempo(true)">Ja, {{ tempo.to }}× per week</button>
        <button type="button" class="min-h-11 rounded-full bg-white/70 px-4 text-[14px]" @click="answerTempo(false)">Laat {{ routine.goal }}×</button>
      </div>
    </div>

    <!-- Zes weken -->
    <div class="mt-4 flex items-end gap-3">
      <div class="flex h-10 flex-1 items-end gap-1" role="img" :aria-label="`Laatste zes weken: ${hist.slice(0, 6).map(h => Math.round(h.rate * 100) + '%').join(', ')}`">
        <span v-for="h in hist" :key="h.start" class="flex-1 rounded-[4px]" :class="h.current ? 'bg-ink' : h.rate >= 1 ? 'bg-green-bar' : 'bg-surface-3'" :style="{ height: `${Math.max(10, h.rate * 100)}%` }" />
      </div>
      <p class="w-[92px] text-right text-[12.5px] leading-tight text-muted">zeven weken<br><span class="text-ink">{{ hist.filter(h => !h.current && h.rate >= 1).length }}× gehaald</span></p>
    </div>
    <p v-if="pays" class="mt-3 flex items-center gap-2 text-[13.5px]" :class="pays.better ? '' : 'text-muted'">
      <Icon name="tabler:bolt" class="size-4 shrink-0" />
      <template v-if="pays.better">Op dagen dat het lukt, geef je je energie <span class="num">{{ dec1(pays.yes) }}</span>. Anders <span class="num">{{ dec1(pays.no) }}</span>.</template>
      <template v-else>Je energie is op dagen dat het lukt niet hoger. Dat is ook goed om te weten.</template>
    </p>

    <!-- Wat gaat er mis -->
    <div v-if="insight && reasons.total" class="mt-4 border-t border-line pt-4">
      <p class="text-[12.5px] uppercase tracking-[0.06em] text-muted">Wat er misgaat</p>
      <p class="mt-1.5 text-[14.5px] leading-snug">{{ insight.headline }}</p>

      <div v-if="insight.compare" class="mt-3 grid grid-cols-2 gap-2">
        <div class="rounded-[12px] bg-green-soft p-3"><p class="num text-[22px] leading-none text-green-ink">{{ insight.compare.a }}</p><p class="mt-1 text-[12.5px] text-muted">{{ insight.compare.aLabel }}</p></div>
        <div class="rounded-[12px] bg-copper-soft p-3"><p class="num text-[22px] leading-none text-copper-ink">{{ insight.compare.b }}</p><p class="mt-1 text-[12.5px] text-muted">{{ insight.compare.bLabel }}</p></div>
      </div>

      <div class="mt-3">
        <div class="flex h-2.5 overflow-hidden rounded-full" role="img" :aria-label="reasons.list.map(r => `${r.reason} ${r.n}×`).join(', ')">
          <span v-for="r in reasons.list" :key="r.reason" :class="REASON_COLOR[r.reason]" :style="{ width: `${r.share * 100}%` }" />
        </div>
        <ul class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] text-muted">
          <li v-for="r in reasons.list" :key="r.reason" class="flex items-center gap-1.5"><span class="size-2 rounded-full" :class="REASON_COLOR[r.reason]" />{{ r.reason }} <span class="text-ink">{{ r.n }}×</span></li>
        </ul>
      </div>

      <div v-if="fix && miss?.accept?.action !== 'herinner'" class="mt-3 flex items-center gap-3 rounded-[14px] bg-surface-2 p-3">
        <span class="grid size-9 shrink-0 place-items-center rounded-[10px] bg-surface"><Icon :name="fix.icon" class="size-[18px]" /></span>
        <p class="min-w-0 flex-1 text-[14px] leading-snug">{{ fix.title }}<span v-if="fix.meta" class="text-muted"> · {{ fix.meta }}</span></p>
        <button type="button" class="btn-primary !min-h-10 !px-3.5 !text-[13.5px]" :title="fix.text" @click="stuurman.accept(fix)">{{ fix.acceptLabel }}</button>
      </div>
      <p v-else-if="reminder" class="mt-3 text-[13.5px] text-muted">Seintje staat elke avond om {{ reminder }}.</p>
    </div>
  </article>
</template>
