<script setup lang="ts">
const { state } = useStore()
const editor = useEditor()
const toast = useToast()
const D = useDomain()
const DAYS = [1, 2, 3, 4, 5, 6, 0]
const DAY_LABEL = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za']
const wh = state.value.prefs.workHours
const f = reactive({ days: [...wh.days], start: wh.start, end: wh.end })
const toggle = (d: number) => { f.days = f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d] }
const hours = computed(() => Math.max(0, ((toMin(f.end) - toMin(f.start)) / 60) * f.days.length))
const tried = ref(false)
const valid = computed(() => f.days.length > 0 && toMin(f.end) > toMin(f.start))

function save() {
  tried.value = true
  if (!valid.value) return
  state.value.prefs.workHours = { days: [...f.days].sort(), start: f.start, end: f.end }
  toast.push({ text: `Werktijden: ${f.start}–${f.end}. Ik plan werk alleen nog daarbinnen.` })
  editor.saved('werktijden')
}
defineExpose({ save })
</script>

<template>
  <form class="space-y-5" @submit.prevent="save">
    <p class="text-[14.5px] text-muted">Binnen je werktijden plant Stuurman werk. Daarbuiten is het van jou: privé eerst, en zakelijk wacht tot de volgende werkdag.</p>
    <div>
      <span class="field-label">Werkdagen</span>
      <div class="grid grid-cols-7 gap-1.5">
        <button v-for="d in DAYS" :key="d" type="button" class="min-h-11 rounded-[12px] border text-[14px]" :class="f.days.includes(d) ? 'border-transparent bg-primary text-on-primary' : 'border-line-strong'" :aria-pressed="f.days.includes(d)" @click="toggle(d)">{{ DAY_LABEL[d] }}</button>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <label class="field"><span class="field-label">Begin</span><input v-model="f.start" type="time" step="900" class="field-input" data-autofocus></label>
      <label class="field"><span class="field-label">Einde</span><input v-model="f.end" type="time" step="900" class="field-input"></label>
    </div>
    <p v-if="tried && !valid" class="text-[13px] text-copper-ink">Kies minstens één dag, en een einde na het begin.</p>
    <p class="rounded-[12px] bg-surface-2 px-3.5 py-3 text-[14px]">Dat is <span class="num">{{ Math.round(hours) }}</span> uur per week. <span class="text-muted">Je grens staat op 42 uur.</span></p>

    <label class="flex min-h-11 items-center gap-3 rounded-[12px] border border-line p-3">
      <input v-model="D.previewOff.value" type="checkbox" class="size-5 accent-[var(--ink)]">
      <span class="text-[14.5px]">Avondmodus nu bekijken <span class="block text-[13px] text-muted">Alsof je werkdag erop zit. Alleen om te proberen.</span></span>
    </label>
  </form>
</template>
