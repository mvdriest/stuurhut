<script setup lang="ts">
import type { LifeCategory } from '~/types'

const props = defineProps<{ id?: string, prefill?: Record<string, unknown> }>()
const editor = useEditor()
const L = useLife()
const { state } = useStore()
const toast = useToast()
const existing = computed(() => state.value.life.find(l => l.id === props.id))
const REPEATS = [{ v: 0, l: 'Eenmalig' }, { v: 1, l: 'Maand' }, { v: 6, l: 'Half jaar' }, { v: 12, l: 'Jaar' }, { v: 60, l: '5 jaar' }, { v: 120, l: '10 jaar' }]
const f = reactive({
  title: (existing.value?.title ?? props.prefill?.title ?? '') as string,
  category: (existing.value?.category ?? 'auto') as LifeCategory,
  due: (existing.value?.due ?? addDays(todayISO(), 30)) as string,
  repeatMonths: existing.value?.repeatMonths ?? 12,
  remindDays: existing.value?.remindDays ?? 21,
  note: existing.value?.note ?? '',
})
const tried = ref(false)
const valid = computed(() => f.title.trim().length > 1 && !!f.due)

function save() {
  tried.value = true
  if (!valid.value) return
  const data = { title: f.title.trim(), category: f.category, due: f.due, repeatMonths: f.repeatMonths || undefined, remindDays: f.remindDays, note: f.note.trim() || undefined }
  if (existing.value) { L.update(existing.value.id, data); toast.push({ text: 'Bijgewerkt.' }) }
  else { L.add(data); toast.push({ text: `Staat erin. Ik meld het ${f.remindDays} dagen van tevoren.`, to: '/admin', toLabel: 'Bekijk' }) }
  editor.saved(existing.value?.id ?? 'admin')
}
function remove() {
  if (!existing.value) return
  const undo = L.remove(existing.value.id)
  editor.close()
  toast.push({ text: 'Verwijderd.', undo })
}
defineExpose({ save })
</script>

<template>
  <form class="space-y-4" @submit.prevent="save">
    <label class="field">
      <span class="field-label">Wat? *</span>
      <input v-model="f.title" class="field-input" placeholder="Bijv. APK auto" autocomplete="off" data-autofocus>
      <span v-if="tried && f.title.trim().length < 2" class="mt-1 block text-[13px] text-copper-ink">Vul in wat het is.</span>
    </label>
    <div>
      <span class="field-label">Soort</span>
      <div class="seg">
        <button v-for="(c, k) in LIFE_CATEGORIES" :key="k" type="button" class="flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-[14px] text-cat-ink" :class="[c.fill, f.category === k ? 'ring-2 ring-ink' : '']" :aria-pressed="f.category === k" @click="f.category = k as LifeCategory"><Icon :name="c.icon" class="size-4" />{{ c.label }}</button>
      </div>
    </div>
    <label class="field"><span class="field-label">Wanneer?</span><input v-model="f.due" type="date" class="field-input"></label>
    <div>
      <span class="field-label">Komt terug</span>
      <div class="seg"><button v-for="r in REPEATS" :key="r.v" type="button" class="seg-btn" :aria-pressed="f.repeatMonths === r.v" @click="f.repeatMonths = r.v">{{ r.l }}</button></div>
    </div>
    <div>
      <span class="field-label">Hoeveel dagen van tevoren melden?</span>
      <div class="seg"><button v-for="d in [7, 14, 21, 30, 60, 90]" :key="d" type="button" class="seg-btn" :aria-pressed="f.remindDays === d" @click="f.remindDays = d">{{ d }}</button></div>
    </div>
    <label class="field"><span class="field-label">Notitie</span><input v-model="f.note" class="field-input" placeholder="Bijv. waar, wie, wat het kostte"></label>
    <button v-if="existing" type="button" class="flex min-h-11 items-center gap-2 text-[14.5px] text-copper-ink" @click="remove"><Icon name="tabler:trash" class="size-4" />Verwijderen</button>
  </form>
</template>
