<script setup lang="ts">
// Slaapritme instellen. Verander je begin, doel of stap, dan begint het plan deze week opnieuw.
const S = useSleep()
const D = useDomain()
const editor = useEditor()
const toast = useToast()
const p = S.plan.value
const f = reactive({ startWake: p.startWake, goalWake: p.goalWake, stepMin: p.stepMin, needH: p.needH, windDownMin: p.windDownMin })
const NEED = [7, 7.5, 8, 8.5, 9]
const WIND = [60, 90, 120]
const STEP = [10, 15, 20]
const valid = computed(() => clockMin(f.goalWake) <= clockMin(f.startWake))
const restartsEarly = () => f.startWake !== p.startWake || f.goalWake !== p.goalWake || f.stepMin !== p.stepMin
// Ongewijzigd plan: wat er nog over is. Nieuw plan: vanaf deze week, die meetelt.
const weeks = computed(() => (restartsEarly() ? Math.ceil((clockMin(f.startWake) - clockMin(f.goalWake)) / f.stepMin) : S.weeksLeft.value))
const bed = computed(() => clock(clockMin(f.goalWake) - f.needH * 60 - FALL_ASLEEP))
const laptop = computed(() => clock(nightMin(bed.value) - f.windDownMin))
const restarts = computed(restartsEarly)
const tried = ref(false)

function save() {
  tried.value = true
  if (!valid.value) return
  S.setPlan({ ...f })
  toast.push({ text: `Deze week op om ${S.wakeToday.value}. Laptop dicht om ${S.forMorning(addDays(todayISO(), 1)).laptop}.` })
  editor.saved('slaap')
}
async function previewEvening() {
  S.preview.value = true
  D.previewOff.value = true
  await nextTick() // eerst opslaan, dan pas het venster sluiten
  editor.close()
  navigateTo('/')
}
defineExpose({ save })
</script>

<template>
  <form class="space-y-5" @submit.prevent="save">
    <p class="text-[14.5px] text-muted">Je opstaantijd is het anker. Elke week een stapje eerder, tot je doel. Je bedtijd en het moment dat je laptop dichtgaat reken ik daaruit terug.</p>
    <div class="grid grid-cols-2 gap-3">
      <label class="field"><span class="field-label">Nu sta je op om</span><input v-model="f.startWake" type="time" step="300" class="field-input" data-autofocus></label>
      <label class="field"><span class="field-label">Je doel</span><input v-model="f.goalWake" type="time" step="300" class="field-input"></label>
    </div>
    <p v-if="tried && !valid" class="text-[13px] text-copper-ink">Je doel ligt na je huidige tijd. Kies een vroegere tijd, of laat het zo.</p>
    <div>
      <span class="field-label">Per week eerder</span>
      <div class="seg"><button v-for="m in STEP" :key="m" type="button" class="seg-btn num" :aria-pressed="f.stepMin === m" @click="f.stepMin = m">{{ m }} min</button></div>
    </div>
    <div>
      <span class="field-label">Hoeveel slaap heb je nodig?</span>
      <div class="seg"><button v-for="h in NEED" :key="h" type="button" class="seg-btn num" :aria-pressed="f.needH === h" @click="f.needH = h">{{ dec1(h).replace(',0', '') }} u</button></div>
    </div>
    <div>
      <span class="field-label">Laptop dicht voor bedtijd</span>
      <div class="seg"><button v-for="m in WIND" :key="m" type="button" class="seg-btn" :aria-pressed="f.windDownMin === m" @click="f.windDownMin = m">{{ duration(m) }}</button></div>
    </div>
    <p class="rounded-[12px] bg-surface-2 px-3.5 py-3 text-[14px]">
      <template v-if="valid && weeks > 0">Over <span class="num">{{ weeks }}</span> {{ weeks === 1 ? 'week' : 'weken' }} sta je om {{ f.goalWake }} op.</template>
      <template v-else-if="valid">Je zit al op je doel.</template>
      Dan gaat je laptop om <span class="num">{{ laptop }}</span> dicht en lig je om <span class="num">{{ bed }}</span> in bed.
      <span v-if="restarts" class="mt-1 block text-muted">Het plan begint deze week opnieuw.</span>
    </p>
    <button type="button" class="flex min-h-11 items-center gap-2 text-[14.5px] underline underline-offset-4" @click="previewEvening"><Icon name="tabler:moon-stars" class="size-4" />Bekijk hoe je avond eruitziet</button>
  </form>
</template>
