<script setup lang="ts">
import type { Domain } from '~/types'

const props = defineProps<{ id?: string, prefill?: Record<string, unknown> }>()
const editor = useEditor()
const R = useRoutines()
const toast = useToast()
const existing = computed(() => (props.id ? R.byId(props.id) : undefined))

const ICON_CHOICES = ['tabler:walk', 'tabler:bolt', 'tabler:moon', 'tabler:book', 'tabler:leaf', 'tabler:sun', 'tabler:heart', 'tabler:briefcase']
const DAYS = [1, 2, 3, 4, 5, 6, 0]
const DAY_LABEL = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za']

const f = reactive({
  name: (existing.value?.name ?? props.prefill?.name ?? '') as string,
  cue: (existing.value?.cue ?? props.prefill?.cue ?? '') as string,
  why: (existing.value?.why ?? '') as string,
  days: [...((existing.value?.days ?? props.prefill?.days ?? [1, 3, 5]) as number[])],
  goal: (existing.value?.goal ?? props.prefill?.goal ?? 3) as number,
  icon: (existing.value?.icon ?? 'tabler:walk') as string,
  domain: (existing.value ? domainOfRoutine(existing.value) : 'prive') as Domain,
})
watch(() => f.days.length, (n) => { if (f.goal > n) f.goal = Math.max(1, n) })
function toggleDay(d: number) {
  f.days = f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d]
}
const tried = ref(false)
const valid = computed(() => f.name.trim().length > 1 && f.days.length > 0)
// Stuurman: realistisch beginnen houdt langer vol.
const tooMuch = computed(() => !existing.value && (f.goal >= 5 || (f.goal === f.days.length && f.days.length >= 4)))

function save() {
  tried.value = true
  if (!valid.value) return
  if (existing.value) {
    R.updateRoutine(existing.value.id, f)
    toast.push({ text: 'Routine bijgewerkt.' })
    editor.saved(existing.value.id)
  }
  else {
    const r = R.addRoutine(f)
    toast.push({ text: `${r.name} staat bij Ritme. Vandaag kun je al afvinken.`, to: '/ritme', toLabel: 'Bekijk' })
    editor.saved(r.id)
  }
}
function pause() {
  if (!existing.value) return
  const p = !existing.value.paused
  R.setPaused(existing.value.id, p)
  toast.push({ text: p ? 'Gepauzeerd. Telt niet mee, geschiedenis blijft.' : 'Weer actief.' })
  editor.close()
}
function remove() {
  if (!existing.value) return
  const name = existing.value.name
  const undo = R.removeRoutine(existing.value.id)
  editor.close()
  toast.push({ text: `${name} verwijderd.`, undo })
}
defineExpose({ save })
</script>

<template>
  <form class="space-y-4" @submit.prevent="save">
    <label class="field">
      <span class="field-label">Wat wil je volhouden? *</span>
      <input v-model="f.name" class="field-input" placeholder="Bijv. hardlopen" autocomplete="off" data-autofocus>
      <span v-if="tried && f.name.trim().length < 2" class="mt-1 block text-[13px] text-copper-ink">Geef de routine een naam.</span>
    </label>
    <div>
      <span class="field-label">Icoon</span>
      <div class="flex flex-wrap gap-1.5" role="group" aria-label="Icoon">
        <button v-for="i in ICON_CHOICES" :key="i" type="button" class="grid size-11 place-items-center rounded-[12px] border transition-colors" :class="f.icon === i ? 'border-transparent bg-primary text-on-primary' : 'border-line-strong'" :aria-pressed="f.icon === i" :aria-label="i.replace('tabler:', '')" @click="f.icon = i"><Icon :name="i" class="size-5" /></button>
      </div>
    </div>
    <div>
      <span class="field-label">Privé of zakelijk</span>
      <div class="seg">
        <button v-for="d in (['zakelijk', 'prive'] as const)" :key="d" type="button" class="seg-btn flex items-center gap-1.5" :aria-pressed="f.domain === d" @click="f.domain = d"><span class="size-2 rounded-full" :class="DOMAINS[d].dot" />{{ DOMAINS[d].label }}</button>
      </div>
    </div>
    <label class="field"><span class="field-label">Wanneer? Een vast moment helpt</span><input v-model="f.cue" class="field-input" placeholder="Bijv. na het werk, of 07:30"></label>
    <div>
      <span class="field-label">Op welke dagen?</span>
      <div class="grid grid-cols-7 gap-1.5" role="group" aria-label="Dagen">
        <button v-for="d in DAYS" :key="d" type="button" class="min-h-11 rounded-[12px] border text-[14px] transition-colors" :class="f.days.includes(d) ? 'border-transparent bg-primary text-on-primary' : 'border-line-strong'" :aria-pressed="f.days.includes(d)" @click="toggleDay(d)">{{ DAY_LABEL[d] }}</button>
      </div>
      <span v-if="tried && !f.days.length" class="mt-1 block text-[13px] text-copper-ink">Kies minstens één dag.</span>
    </div>
    <div>
      <span class="field-label">Doel per week</span>
      <div class="flex items-center gap-3">
        <button type="button" class="icon-btn border border-line-strong" aria-label="Minder" :disabled="f.goal <= 1" @click="f.goal = Math.max(1, f.goal - 1)"><span class="text-[20px] leading-none">−</span></button>
        <span class="num min-w-[86px] text-center text-[22px]">{{ f.goal }}× <span class="text-[14px] text-muted">van {{ f.days.length }}</span></span>
        <button type="button" class="icon-btn border border-line-strong" aria-label="Meer" :disabled="f.goal >= f.days.length" @click="f.goal = Math.min(f.days.length, f.goal + 1)"><Icon name="tabler:plus" class="size-4" /></button>
      </div>
    </div>
    <div v-if="tooMuch" class="flex gap-3 rounded-[14px] bg-cat-prive p-3.5 text-cat-ink">
      <Icon name="tabler:steering-wheel" class="mt-0.5 size-5 shrink-0" />
      <div class="min-w-0 flex-1">
        <p class="text-[14.5px] leading-snug">Begin met 3× per week. Houd je dat drie weken vol, dan stel ik voor er één bij te doen.</p>
        <p class="mt-1 text-[13px] text-cat-ink-muted">Een doel met ruimte voor een gemiste dag houd je langer vol.</p>
        <button type="button" class="mt-2 min-h-9 rounded-full bg-cat-ink px-3.5 text-[13.5px] text-white" @click="f.goal = Math.min(3, f.days.length)">Maak er 3× van</button>
      </div>
    </div>
    <label class="field"><span class="field-label">Waarom? Daar herinner ik je aan als het lastig wordt</span><input v-model="f.why" class="field-input" placeholder="Bijv. fitter en meer energie"></label>

    <div v-if="existing" class="flex flex-wrap gap-x-5 gap-y-1 pt-1">
      <button type="button" class="flex min-h-11 items-center gap-2 text-[14.5px]" @click="pause"><Icon :name="existing.paused ? 'tabler:player-play' : 'tabler:player-pause'" class="size-4" />{{ existing.paused ? 'Hervatten' : 'Pauzeren' }}</button>
      <button type="button" class="flex min-h-11 items-center gap-2 text-[14.5px] text-copper-ink" @click="remove"><Icon name="tabler:trash" class="size-4" />Verwijderen</button>
    </div>
  </form>
</template>
