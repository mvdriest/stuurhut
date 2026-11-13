<script setup lang="ts">
import type { Domain, Task } from '~/types'
import { CATEGORIES, categoryOfTask } from '~/utils/category'

const props = defineProps<{ id?: string, prefill?: Record<string, unknown> }>()
const editor = useEditor()
const tasks = useTasks()
const cal = useCalendar()
const clients = useClients()
const toast = useToast()
const existing = computed(() => (props.id ? tasks.byId(props.id) : undefined))

const DURATIONS = [15, 30, 45, 60, 90, 120]
const KINDS: Task['kind'][] = ['taak', 'focus', 'admin', 'persoonlijk']
const f = reactive({
  title: (existing.value?.title ?? props.prefill?.title ?? '') as string,
  durationMin: (existing.value?.durationMin ?? props.prefill?.durationMin ?? 30) as number,
  kind: (existing.value?.kind ?? props.prefill?.kind ?? 'taak') as Task['kind'],
  clientId: (existing.value?.clientId ?? props.prefill?.clientId ?? '') as string,
  important: existing.value?.important ?? false,
  domain: (existing.value ? domainOfTask(existing.value) : props.prefill?.domain ?? 'zakelijk') as Domain,
  when: (existing.value?.date ? 'zelf' : 'stuurman') as 'stuurman' | 'zelf' | 'later',
  date: (existing.value?.date ?? todayISO()) as string,
  start: (existing.value?.start ?? '09:00') as string,
})
watch(() => f.kind, (k) => { if (k === 'persoonlijk') f.domain = 'prive' })
const suggestion = computed(() => cal.findSlot(f.durationMin, { deep: f.kind === 'focus', excludeTaskId: existing.value?.id, domain: f.domain }))
const conflict = computed(() => f.when === 'zelf' && !cal.isFree(f.date, toMin(f.start), f.durationMin, existing.value?.id))
const tried = ref(false)
const valid = computed(() => f.title.trim().length > 1)

function save() {
  tried.value = true
  if (!valid.value) return
  const slot = f.when === 'stuurman' ? suggestion.value : f.when === 'zelf' ? { date: f.date, start: f.start } : null
  const data: Omit<Task, 'id'> = { title: f.title.trim(), durationMin: f.durationMin, kind: f.kind, clientId: f.clientId || undefined, important: f.important, deep: f.kind === 'focus', domain: f.domain, ...(slot ? { date: slot.date, start: slot.start } : {}) }
  if (existing.value) {
    tasks.update(existing.value.id, data)
    if (!slot) tasks.unschedule(existing.value.id)
    toast.push({ text: 'Taak bijgewerkt.' })
    editor.saved(existing.value.id)
  }
  else {
    const t = tasks.add(data)
    toast.push({ text: slot ? `Staat ${relDay(slot.date)} om ${slot.start}.` : 'Staat bij nog in te plannen.', to: '/week', toLabel: 'Bekijk' })
    editor.saved(t.id)
  }
}
function remove() {
  if (!existing.value) return
  const undo = tasks.remove(existing.value.id)
  editor.close()
  toast.push({ text: 'Taak verwijderd.', undo })
}
defineExpose({ save })
</script>

<template>
  <form class="space-y-4" @submit.prevent="save">
    <label class="field">
      <span class="field-label">Wat moet er gebeuren? *</span>
      <input v-model="f.title" class="field-input" placeholder="Bijv. offerte nabellen" autocomplete="off" data-autofocus>
      <span v-if="tried && !valid" class="mt-1 block text-[13px] text-copper-ink">Vul een titel in.</span>
    </label>
    <div>
      <span class="field-label">Soort</span>
      <div class="seg">
        <button v-for="k in KINDS" :key="k" type="button" class="flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-[14px] text-cat-ink transition-shadow" :class="[CATEGORIES[categoryOfTask({ kind: k } as Task)].fill, f.kind === k ? 'ring-2 ring-ink' : '']" :aria-pressed="f.kind === k" @click="f.kind = k">
          <Icon :name="CATEGORIES[categoryOfTask({ kind: k } as Task)].icon" class="size-4" />{{ CATEGORIES[categoryOfTask({ kind: k } as Task)].label }}
        </button>
      </div>
    </div>
    <div>
      <span class="field-label">Privé of zakelijk</span>
      <div class="seg">
        <button v-for="d in (['zakelijk', 'prive'] as const)" :key="d" type="button" class="seg-btn flex items-center gap-1.5" :aria-pressed="f.domain === d" @click="f.domain = d"><span class="size-2 rounded-full" :class="DOMAINS[d].dot" />{{ DOMAINS[d].label }}</button>
      </div>
    </div>
    <div>
      <span class="field-label">Duur</span>
      <div class="seg"><button v-for="d in DURATIONS" :key="d" type="button" class="seg-btn" :aria-pressed="f.durationMin === d" @click="f.durationMin = d">{{ duration(d) }}</button></div>
    </div>
    <label class="field">
      <span class="field-label">Klant</span>
      <select v-model="f.clientId" class="field-input"><option value="">Geen</option><option v-for="c in clients.clients.value" :key="c.id" :value="c.id">{{ c.name }}</option></select>
    </label>
    <div>
      <span class="field-label">Wanneer</span>
      <div class="seg">
        <button type="button" class="seg-btn" :aria-pressed="f.when === 'stuurman'" @click="f.when = 'stuurman'">Stuurman kiest</button>
        <button type="button" class="seg-btn" :aria-pressed="f.when === 'zelf'" @click="f.when = 'zelf'">Zelf kiezen</button>
        <button type="button" class="seg-btn" :aria-pressed="f.when === 'later'" @click="f.when = 'later'">Later</button>
      </div>
      <p v-if="f.when === 'stuurman'" class="mt-2 text-[14px] text-muted">{{ suggestion ? `${cap(relDay(suggestion.date))} om ${suggestion.start}, eerste plek die past.` : 'Geen plek deze week. Hij komt bij nog in te plannen.' }}</p>
      <div v-if="f.when === 'zelf'" class="mt-3 grid grid-cols-[1fr_120px] gap-3">
        <select v-model="f.date" class="field-input" aria-label="Dag"><option v-for="d in cal.days.value" :key="d" :value="d">{{ cap(relDay(d)) }} {{ dayNum(d) }}</option></select>
        <input v-model="f.start" type="time" step="900" class="field-input" aria-label="Tijd">
      </div>
      <p v-if="conflict" class="mt-1.5 text-[13px] text-copper-ink">Dat overlapt met iets anders. Kan, maar het wordt krap.</p>
    </div>
    <label class="flex min-h-11 items-center gap-3">
      <input v-model="f.important" type="checkbox" class="size-5 accent-[var(--ink)]">
      <span class="text-[15px]">Telt vandaag <span class="text-muted">(komt bovenaan op Thuisbasis)</span></span>
    </label>
    <button v-if="existing" type="button" class="flex min-h-11 items-center gap-2 text-[14.5px] text-copper-ink" @click="remove"><Icon name="tabler:trash" class="size-4" />Taak verwijderen</button>
  </form>
</template>
