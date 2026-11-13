<script setup lang="ts">
import type { Domain } from '~/types'

const props = defineProps<{ id?: string, prefill?: Record<string, unknown> }>()
const editor = useEditor()
const cal = useCalendar()
const clients = useClients()
const toast = useToast()
const D = useDomain()
const existing = computed(() => (props.id ? cal.eventById(props.id) : undefined))
/** Komt uit je agenda: tijd en titel pas je daar aan, hier alleen privé/zakelijk en de klant */
const extern = computed(() => !!existing.value?.bron)

const f = reactive({
  title: (existing.value?.title ?? props.prefill?.title ?? '') as string,
  date: (existing.value?.date ?? props.prefill?.date ?? todayISO()) as string,
  start: (existing.value?.start ?? props.prefill?.start ?? '10:00') as string,
  end: (existing.value?.end ?? props.prefill?.end ?? '11:00') as string,
  clientId: (existing.value?.clientId ?? props.prefill?.clientId ?? '') as string,
  location: (existing.value?.location ?? '') as string,
  domain: (existing.value ? domainOfEvent(existing.value) : props.prefill?.domain ?? 'zakelijk') as Domain,
})
watch(() => f.start, (s, old) => {
  // Eind schuift mee met dezelfde duur
  const dur = toMin(f.end) - toMin(old)
  f.end = fromMin(Math.min(23 * 60 + 45, toMin(s) + Math.max(15, dur)))
})
const days = computed(() => {
  const list = cal.days.value
  return list.includes(f.date) ? list : [f.date, ...list]
})
const overlap = computed(() => cal.dayItems(f.date).find(i => i.id !== existing.value?.id && toMin(i.start) < toMin(f.end) && toMin(i.end) > toMin(f.start)))
const tried = ref(false)
const valid = computed(() => f.title.trim().length > 1 && toMin(f.end) > toMin(f.start))

function save() {
  tried.value = true
  if (!valid.value) return
  const data = { title: f.title.trim(), date: f.date, start: f.start, end: f.end, clientId: f.clientId || undefined, location: f.location.trim() || undefined, domain: f.domain }
  if (existing.value && extern.value) {
    cal.updateEvent(existing.value.id, { domain: f.domain, clientId: f.clientId || undefined, domainSet: true })
    toast.push({ text: 'Bewaard. De volgende sync laat dit staan.' })
    editor.saved(existing.value.id)
  }
  else if (existing.value) {
    cal.updateEvent(existing.value.id, data)
    toast.push({ text: 'Afspraak bijgewerkt.' })
    editor.saved(existing.value.id)
  }
  else {
    const e = cal.addEvent(data)
    toast.push({ text: `Afspraak staat ${relDay(e.date)} om ${e.start}.`, to: '/week', toLabel: 'Bekijk' })
    editor.saved(e.id)
  }
}
function remove() {
  if (!existing.value) return
  const undo = cal.removeEvent(existing.value.id)
  editor.close()
  toast.push({ text: 'Afspraak verwijderd.', undo })
}
defineExpose({ save })
</script>

<template>
  <form class="space-y-4" @submit.prevent="save">
    <div v-if="extern && existing" class="rounded-[14px] bg-surface-2 p-3.5">
      <p class="text-[15.5px] font-semibold leading-snug">{{ existing.title }}</p>
      <p class="mt-0.5 text-[13.5px] text-muted">{{ cap(relDay(existing.date)) }} · {{ existing.start }}–{{ existing.end }}<template v-if="existing.location"> · {{ existing.location }}</template></p>
      <p class="mt-2 flex items-center gap-1.5 text-[13px] text-muted"><Icon name="tabler:calendar" class="size-4" />Uit {{ existing.agenda ?? 'je agenda' }}. Tijd en titel pas je daar aan.</p>
    </div>
    <label v-if="!extern" class="field">
      <span class="field-label">Wat? *</span>
      <input v-model="f.title" class="field-input" placeholder="Bijv. kennismaking Bakkerij Zoet" autocomplete="off" data-autofocus>
      <span v-if="tried && f.title.trim().length < 2" class="mt-1 block text-[13px] text-copper-ink">Vul een titel in.</span>
    </label>
    <div>
      <span class="field-label">Privé of zakelijk</span>
      <div class="seg">
        <button v-for="d in (['zakelijk', 'prive'] as const)" :key="d" type="button" class="seg-btn flex items-center gap-1.5" :aria-pressed="f.domain === d" @click="f.domain = d"><span class="size-2 rounded-full" :class="DOMAINS[d].dot" />{{ DOMAINS[d].label }}</button>
      </div>
    </div>
    <p v-if="f.domain === 'zakelijk' && D.outsideWork(f.date, f.start, f.end)" class="-mt-2 text-[13px] text-copper-ink">Dit valt buiten je werktijden ({{ D.work.value.start }}–{{ D.work.value.end }}).</p>
    <template v-if="!extern">
    <label class="field">
      <span class="field-label">Dag</span>
      <select v-model="f.date" class="field-input"><option v-for="d in days" :key="d" :value="d">{{ cap(relDay(d)) }} {{ dayNum(d) }}</option></select>
    </label>
    <div class="grid grid-cols-2 gap-3">
      <label class="field"><span class="field-label">Van</span><input v-model="f.start" type="time" step="900" class="field-input"></label>
      <label class="field"><span class="field-label">Tot</span><input v-model="f.end" type="time" step="900" class="field-input"></label>
    </div>
    <p v-if="tried && toMin(f.end) <= toMin(f.start)" class="text-[13px] text-copper-ink">Het einde moet na het begin liggen.</p>
    <p v-else-if="overlap" class="text-[13px] text-copper-ink">Overlapt met "{{ overlap.title }}" ({{ overlap.start }}–{{ overlap.end }}).</p>
    </template>
    <label class="field">
      <span class="field-label">Klant</span>
      <select v-model="f.clientId" class="field-input"><option value="">Geen</option><option v-for="c in clients.clients.value" :key="c.id" :value="c.id">{{ c.name }}</option></select>
    </label>
    <label v-if="!extern" class="field"><span class="field-label">Waar</span><input v-model="f.location" class="field-input" placeholder="Bijv. videobellen"></label>
    <button v-if="existing && !extern" type="button" class="flex min-h-11 items-center gap-2 text-[14.5px] text-copper-ink" @click="remove"><Icon name="tabler:trash" class="size-4" />Afspraak verwijderen</button>
  </form>
</template>
