<script setup lang="ts">
// Slaapritme op Ritme: het plan, je laatste twee weken, en wat je eigen nachten laten zien.
import type { Night } from '~/composables/useSleep'
import { PASS } from '~/utils/sleep'

const S = useSleep()
const editor = useEditor()
const DAY_LABEL = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za']

// ---------- Grafiek: elke nacht een balk van naar bed tot opstaan ----------
const TOP = -120 // 22:00
const BOTTOM = 11 * 60 // 11:00
const H = 168
const y = (m: number) => ((Math.min(BOTTOM, Math.max(TOP, m)) - TOP) / (BOTTOM - TOP)) * H
const GRID = [{ m: -120, l: '22:00' }, { m: 0, l: '00:00' }, { m: 240, l: '04:00' }, { m: 480, l: '08:00' }]
const hover = ref<number | null>(null)
const restedLabel = (r?: number) => (r === 3 ? 'uitgerust' : r === 2 ? 'gaat wel' : r === 1 ? 'moe' : '')
const tip = (n: Night) => [`${weekdayShort(n.date)} ${dayNum(n.date)}`, `${n.bed} tot ${n.woke}`, `${dec1(n.sleepH)} u`, restedLabel(n.rested), n.lastWork ? `werkte tot ${n.lastWork}` : ''].filter(Boolean).join(' · ')
const chartLabel = computed(() => {
  const l = S.last14.value
  if (!l.length) return 'Nog geen nachten'
  const on = l.filter(n => n.onTime).length
  return `Laatste ${l.length} nachten. ${on} keer op tijd op. Gemiddeld ${dec1(l.reduce((s, n) => s + n.sleepH, 0) / l.length)} uur slaap.`
})
const showTable = ref(false)
const PASS_DAYS = PASS

// ---------- Ochtend en weekend ----------
const R = useRoutines()
const toast = useToast()
const nextWorkday = computed(() => planDays(5).find(d => d > todayISO() && useStore().state.value.prefs.workHours.days.includes(fromISO(d).getDay())) ?? planDays(2)[1]!)
const anchorNext = computed(() => S.anchorFor(nextWorkday.value))
function toggleBlock() {
  const on = !S.morning.value.firstBlock
  S.setFirstBlock(on)
  const n = useStore().state.value.tasks.filter(t => t.anchor && !t.done).length
  toast.push(on ? { text: `Je eerste blok staat op ${n === 1 ? 'één werkdag' : `${n} werkdagen`}. Waar al iets begint, is dat je start.`, to: '/week', toLabel: 'Bekijk' } : { text: 'Vaste eerste blokken weggehaald.' })
}
function stepBack() {
  S.stepBack(S.missedTwice.value?.latest)
  toast.push({ text: `Deze week op om ${S.wakeToday.value}. Lukt het, dan gaan we volgende week weer verder.` })
}
function keepGoing() {
  S.keepGoing(S.missedTwice.value?.latest)
  toast.push({ text: 'Goed. Morgen gewoon weer.' })
}
function addRoutine() {
  S.addMorningRoutine()
  toast.push({ text: 'Staat bij je routines. Vijf keer per week is genoeg.' })
}
</script>

<template>
  <section class="mt-7" aria-labelledby="slaap">
    <div class="mb-3 flex items-center justify-between gap-3" data-enter>
      <h2 id="slaap" class="text-[19px]">Slaapritme</h2>
      <button type="button" class="btn-outline !min-h-10 !px-3.5 !text-[14px]" @click="editor.open({ kind: 'slaap' })"><Icon name="tabler:pencil" class="size-4" />Aanpassen</button>
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <!-- Het plan -->
      <article class="card-sea p-5 md:p-6 lg:col-span-7" data-enter>
        <p class="text-[14px] text-sea-ink">Deze week op om</p>
        <p class="num mt-1 text-[52px] leading-none tracking-[-0.03em]">{{ S.wakeToday.value }}</p>
        <p v-if="S.verdictText.value" class="mt-2 text-[14.5px]">{{ S.verdictText.value }}</p>
        <p class="mt-1 text-[14.5px] text-muted">{{ S.nextWeekText.value }}</p>

        <!-- Twee keer gemist: één rustige vraag -->
        <div v-if="S.missedTwice.value" class="mt-4 rounded-[14px] bg-surface/90 p-3.5">
          <p class="text-[15px] leading-snug">De laatste twee ochtenden lukte {{ S.wakeToday.value }} niet. Is de stap te groot? Dan houden we deze week {{ S.stepBackWake.value }} aan.</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <button type="button" class="btn-primary !min-h-11" @click="stepBack">Ja, een stap terug</button>
            <button type="button" class="btn-outline !min-h-11" @click="keepGoing">Nee, ik ga door</button>
          </div>
        </div>

        <!-- Stappen -->
        <ol class="mt-4 flex flex-wrap gap-1.5" aria-label="Stappen naar je doel">
          <li class="chip bg-surface/80 text-muted"><span class="num">{{ S.plan.value.startWake }}</span></li>
          <li v-for="st in S.steps.value" :key="st.key" class="chip" :class="st.state === 'nu' ? 'bg-ink text-surface' : st.state === 'gedaan' ? 'bg-green-soft text-green-ink' : st.state === 'straks' ? 'bg-surface/80 text-muted' : 'bg-surface/80 text-ink'">
            <Icon v-if="st.state === 'gedaan'" name="tabler:check" class="size-3.5" />
            <Icon v-else-if="st.state === 'blijft' || st.state === 'terug'" name="tabler:repeat" class="size-3.5" />
            <span class="num">{{ st.wake }}</span>
            <span v-if="st.state === 'nu'" class="sr-only">, deze week</span>
            <span v-else-if="st.state === 'blijft'" class="sr-only">, bleef staan</span>
            <span v-else-if="st.state === 'terug'" class="sr-only">, stap terug</span>
          </li>
        </ol>

        <!-- Deze week -->
        <p class="mt-5 text-[13.5px] text-muted">Deze week · <span class="num text-ink">{{ S.thisWeekScore.value.done }} van {{ S.thisWeekScore.value.of }}</span> ochtenden gelukt</p>
        <ul class="mt-2 grid grid-cols-7 gap-1.5">
          <li v-for="d in S.thisWeek.value" :key="d.date" class="flex flex-col items-center gap-1 rounded-[12px] py-2" :class="d.night ? (d.night.onTime ? 'bg-green-soft' : 'bg-surface/80') : 'bg-surface/50'">
            <span class="text-[12px] text-muted">{{ DAY_LABEL[fromISO(d.date).getDay()] }}</span>
            <Icon v-if="d.night?.onTime" name="tabler:check" class="size-4 text-green-ink" :aria-label="`op om ${d.night.woke}, gelukt`" />
            <span v-else-if="d.night" class="num text-[12.5px]">{{ d.night.woke }}</span>
            <span v-else class="num text-[12.5px]" :class="d.date === todayISO() ? 'text-ink' : 'text-muted'">{{ d.future || d.date === todayISO() ? d.target : '–' }}</span>
          </li>
        </ul>
        <p class="mt-3 text-[13px] text-muted">Gelukt is binnen een kwartier, in het weekend binnen een uur. Lukken {{ PASS_DAYS }} doordeweekse ochtenden, dan gaat de volgende stap door. Anders blijft de tijd staan.</p>
      </article>

      <!-- Wat ik zie -->
      <article class="card p-5 lg:col-span-5" data-enter>
        <h3 class="flex items-center gap-2 text-[15px]"><Icon name="tabler:steering-wheel" class="size-4" />Wat ik zie in je nachten</h3>
        <ul v-if="S.patterns.value.length" class="mt-3 space-y-2.5">
          <li v-for="p in S.patterns.value" :key="p.id" class="rounded-[14px] bg-surface-2 p-3">
            <p class="flex gap-2.5 text-[14.5px] leading-snug"><Icon :name="p.icon" class="mt-0.5 size-4 shrink-0" />{{ p.text }}</p>
            <div v-if="p.compare" class="mt-2.5 grid grid-cols-2 gap-2 pl-6">
              <p><span class="num block text-[19px] leading-none">{{ p.compare.a }}</span><span class="text-[12.5px] text-muted">{{ p.compare.aLabel }}</span></p>
              <p><span class="num block text-[19px] leading-none text-copper-ink">{{ p.compare.b }}</span><span class="text-[12.5px] text-muted">{{ p.compare.bLabel }}</span></p>
            </div>
          </li>
        </ul>
        <p v-else class="mt-3 text-[14.5px] text-muted">Na een week of twee dagstarts zie ik hier wat jouw slaap verschuift.</p>
        <p v-if="S.tiredDespiteSleep.value" class="mt-3 flex gap-2.5 rounded-[14px] bg-sea-soft p-3 text-[14px] leading-snug">
          <Icon name="tabler:stethoscope" class="mt-0.5 size-4 shrink-0" />Je slaapt de laatste tijd genoeg en wordt toch vaak moe wakker. Dat is goed om een keer met je huisarts te bespreken. Er kan iets anders meespelen, en dat is na te kijken.
        </p>
      </article>

      <!-- Wat het je oplevert -->
      <article v-if="S.effects.value" class="card p-5 lg:col-span-12" aria-labelledby="oplevert" data-enter>
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="oplevert" class="text-[15px]">Wat het je oplevert</h3>
          <p class="text-[13px] text-muted">Doordeweeks, voor je begon tegenover de {{ S.effects.value.weeks === 1 ? 'eerste week' : `${S.effects.value.weeks} weken` }} sindsdien</p>
        </div>
        <dl class="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          <div v-for="e in S.effects.value.list" :key="e.id" class="rounded-[14px] p-3" :class="e.better ? 'bg-green-soft' : 'bg-surface-2'">
            <dt class="text-[13px] text-muted">{{ e.label }}</dt>
            <dd class="mt-1 flex items-center gap-1.5">
              <span class="num text-[24px] leading-none">{{ e.since }}</span>
              <Icon v-if="e.better" name="tabler:trending-up" class="size-4 text-green-ink" aria-label="beter dan eerst" />
            </dd>
            <dd class="mt-1 text-[12.5px] text-muted">eerst <span class="num">{{ e.before }}</span></dd>
          </div>
        </dl>
        <ul class="mt-3 space-y-1">
          <li v-for="e in S.effects.value.list.filter(x => x.text)" :key="e.id" class="text-[14.5px] leading-snug">{{ e.text }}</li>
        </ul>
      </article>

      <!-- Een reden om op te staan -->
      <article class="card p-5 lg:col-span-6" data-enter>
        <h3 class="text-[15px]">Een reden om op te staan</h3>
        <ul class="mt-3 space-y-2">
          <li class="flex items-center gap-3 rounded-[14px] bg-surface-2 p-3">
            <span class="grid size-10 shrink-0 place-items-center rounded-[12px] bg-cat-taak text-cat-ink"><Icon name="tabler:sun" class="size-5" /></span>
            <span class="min-w-0 flex-1">
              <span class="block text-[15px]">Eerst naar buiten</span>
              <span class="block text-[13px] text-muted">Tien minuten daglicht na het opstaan zet je klok.</span>
            </span>
            <span v-if="S.morningRoutine.value" class="chip bg-green-soft text-green-ink"><Icon name="tabler:check" class="size-3.5" /><span class="num">{{ R.week(S.morningRoutine.value).done }}/{{ S.morningRoutine.value.goal }}</span> deze week</span>
            <button v-else type="button" class="btn-outline !min-h-11 !px-3.5 !text-[14px]" @click="addRoutine">Maak routine</button>
          </li>
          <li class="flex items-center gap-3 rounded-[14px] bg-surface-2 p-3">
            <span class="grid size-10 shrink-0 place-items-center rounded-[12px] bg-cat-focus text-cat-ink"><Icon name="tabler:sunrise" class="size-5" /></span>
            <span class="min-w-0 flex-1">
              <span id="eerste-blok" class="block text-[15px]">Vast eerste werkblok</span>
              <span class="block text-[13px] text-muted">Werkdagen om <span class="num">{{ anchorNext }}</span>, tot anderhalf uur. Schuift mee met je opstaantijd.</span>
            </span>
            <button type="button" role="switch" :aria-checked="S.morning.value.firstBlock" aria-labelledby="eerste-blok" class="relative h-11 w-[60px] shrink-0 rounded-full transition-colors" :class="S.morning.value.firstBlock ? 'bg-green-bar' : 'bg-ui-border'" @click="toggleBlock">
              <span class="absolute top-1.5 left-1.5 size-8 rounded-full bg-white shadow-card transition-transform" :class="S.morning.value.firstBlock ? 'translate-x-4' : ''" />
            </button>
          </li>
        </ul>
        <p class="mt-3 text-[13px] text-muted">In de dagstart zet ik je eerste denkwerk zonder tijd in dat blok.</p>
      </article>

      <!-- Het weekend -->
      <article class="card p-5 lg:col-span-6" data-enter>
        <h3 class="text-[15px]">Het weekend</h3>
        <p class="mt-1 text-[14px] text-muted">Uitslapen mag, binnen een uur van je doordeweekse tijd.</p>
        <dl class="mt-3 grid grid-cols-2 gap-2">
          <div v-for="d in S.nextWeekend.value" :key="d.date" class="rounded-[14px] bg-surface-2 p-3">
            <dt class="text-[13px] text-muted">{{ cap(weekdayLong(d.date)) }}, uiterlijk</dt>
            <dd class="num mt-1 text-[24px] leading-none">{{ d.latest }}</dd>
          </div>
        </dl>
        <p v-if="S.lastWeekend.value" class="mt-3 text-[14px] leading-snug">
          Vorig weekend: <span class="num">{{ S.lastWeekend.value.nights.map(n => `${weekdayShort(n.date)} ${n.woke}`).join(', ') }}</span>.
          <template v-if="S.lastWeekend.value.later >= 15">{{ minText(S.lastWeekend.value.later) }} later dan doordeweeks, {{ S.lastWeekend.value.later <= 60 ? 'dus binnen het uur.' : 'dus net wat te ver.' }}</template>
          <template v-else>Bijna hetzelfde als doordeweeks.</template>
        </p>
        <p class="mt-2 text-[13px] text-muted">Op vrijdag stel ik iets kleins voor in de ochtend, zodat je een reden hebt om op te staan.</p>
      </article>

      <!-- Twee weken nachten -->
      <article class="card p-5 lg:col-span-12" data-enter>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h3 class="text-[15px]">Laatste twee weken</h3>
          <ul class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted" aria-label="Legenda">
            <li class="flex items-center gap-1.5"><span class="h-3 w-2.5 rounded-[3px] bg-sea" />Slaap</li>
            <li class="flex items-center gap-1.5"><span class="h-0.5 w-3.5 rounded-full bg-ink" />Doel opstaan</li>
            <li class="flex items-center gap-1.5"><span class="size-2 rounded-full bg-copper" />Nog gewerkt</li>
            <li><button type="button" class="min-h-10 underline underline-offset-4" :aria-pressed="showTable" @click="showTable = !showTable">{{ showTable ? 'Grafiek' : 'Tabel' }}</button></li>
          </ul>
        </div>

        <div v-if="!showTable" class="relative mt-4 flex gap-2" role="img" :aria-label="chartLabel">
          <!-- As -->
          <div class="relative w-10 shrink-0" :style="{ height: `${H}px` }">
            <span v-for="g in GRID" :key="g.m" class="num absolute right-0 -translate-y-1/2 text-[11.5px] text-muted" :style="{ top: `${y(g.m)}px` }">{{ g.l }}</span>
          </div>
          <div class="relative flex-1">
            <span v-for="g in GRID" :key="g.m" class="absolute inset-x-0 h-px bg-line" :style="{ top: `${y(g.m)}px` }" />
            <div class="relative flex gap-[2px]" :style="{ height: `${H}px` }">
              <div
                v-for="(n, i) in S.last14.value"
                :key="n.date"
                class="relative flex-1 cursor-default"
                @pointerenter="hover = i"
                @pointerleave="hover = null"
              >
                <span class="absolute inset-x-[18%] rounded-[4px] bg-sea transition-opacity" :class="hover !== null && hover !== i ? 'opacity-45' : ''" :style="{ top: `${y(nightMin(n.bed))}px`, height: `${Math.max(4, y(clockMin(n.woke)) - y(nightMin(n.bed)))}px` }" />
                <span class="absolute inset-x-[6%] h-0.5 rounded-full bg-ink" :style="{ top: `${y(clockMin(n.target)) - 1}px` }" />
                <span v-if="n.lastWork" class="absolute left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-copper ring-2 ring-surface" :style="{ top: `${y(nightMin(n.lastWork))}px` }" />
              </div>
            </div>
            <div class="mt-1.5 flex gap-[2px]">
              <span v-for="n in S.last14.value" :key="n.date" class="flex-1 text-center text-[11px] text-muted">{{ DAY_LABEL[fromISO(n.date).getDay()] }}</span>
            </div>
            <p v-if="hover !== null && S.last14.value[hover]" class="pointer-events-none absolute -top-2 z-10 -translate-y-full whitespace-nowrap rounded-[10px] bg-ink px-2.5 py-1.5 text-[12.5px] text-surface shadow-float" :style="{ left: `clamp(0px, calc(${((hover + 0.5) / S.last14.value.length) * 100}% - 110px), calc(100% - 220px))` }">
              {{ tip(S.last14.value[hover]!) }}
            </p>
          </div>
        </div>

        <div v-else class="mt-3 overflow-x-auto">
          <table class="w-full min-w-[520px] text-left text-[13.5px]">
            <thead class="text-muted"><tr><th class="py-1.5 font-normal">Nacht</th><th class="font-normal">Naar bed</th><th class="font-normal">Op</th><th class="font-normal">Doel</th><th class="font-normal">Slaap</th><th class="font-normal">Wakker</th><th class="font-normal">Gewerkt tot</th></tr></thead>
            <tbody class="num">
              <tr v-for="n in [...S.last14.value].reverse()" :key="n.date" class="border-t border-line">
                <td class="py-1.5">{{ weekdayShort(n.date) }} {{ dayNum(n.date) }}</td><td>{{ n.bed }}</td><td>{{ n.woke }}</td><td>{{ n.target }}</td><td>{{ dec1(n.sleepH) }} u</td><td>{{ restedLabel(n.rested) }}</td><td>{{ n.lastWork ?? '–' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </div>
  </section>
</template>
