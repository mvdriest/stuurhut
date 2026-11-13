<script setup lang="ts">
// Opdracht aanmaken of bewerken. Alles hier hoort straks bij een pagina in Notion.
import type { Priority } from '~/types'

const props = defineProps<{ id?: string, prefill?: Record<string, unknown> }>()
const editor = useEditor()
const A = useAssignments()
const clients = useClients()
const toast = useToast()
const existing = computed(() => (props.id ? A.byId(props.id) : undefined))

const PRIORITIES: Priority[] = ['hoog', 'normaal', 'laag']
const HOURS = [1, 2, 3, 4, 6, 8, 12]
const f = reactive({
  title: existing.value?.title ?? (props.prefill?.title as string) ?? '',
  clientId: existing.value?.clientId ?? (props.prefill?.clientId as string || clients.matchInText((props.prefill?.title as string) ?? '')?.id) ?? '',
  status: existing.value?.status ?? (props.prefill?.status as string) ?? A.firstOf('todo'),
  due: existing.value?.due ?? '',
  priority: (existing.value?.priority ?? 'normaal') as Priority,
  estimateH: existing.value?.estimateH ?? 2,
  tags: [...(existing.value?.tags ?? [])],
  note: existing.value?.note ?? '',
})
const tried = ref(false)
const valid = computed(() => f.title.trim().length > 1)
const toggleTag = (t: string) => { f.tags = f.tags.includes(t) ? f.tags.filter(x => x !== t) : [...f.tags, t] }

async function save() {
  tried.value = true
  if (!valid.value) return
  const projectId = f.clientId ? clients.projectsFor(f.clientId).find(p => p.status !== 'afgerond')?.id : undefined
  const data = { title: f.title.trim(), clientId: f.clientId || undefined, projectId, status: f.status, due: f.due || undefined, priority: f.priority, estimateH: f.estimateH, tags: f.tags, note: f.note.trim() || undefined }
  if (existing.value) {
    A.update(existing.value.id, data)
    toast.push({ text: 'Bijgewerkt.' })
    editor.saved(existing.value.id)
  }
  else {
    editor.saved('opdracht')
    await A.add(data)
    toast.push({ text: `Staat in ${f.status}.`, to: '/opdrachten', toLabel: 'Bekijk' })
  }
}
function remove() {
  if (!existing.value) return
  const undo = A.remove(existing.value.id)
  editor.close()
  toast.push({ text: 'Van het bord gehaald.', undo })
}
function plan() {
  if (!existing.value) return
  const slot = A.plan(existing.value.id)
  toast.push({ text: slot ? `${duration(slot.dur)} staat ${relDay(slot.date)} om ${slot.start}.` : 'Geen plek binnen je werktijd deze week.', to: slot ? '/week' : undefined, toLabel: 'Bekijk' })
}
const block = computed(() => (existing.value ? A.nextBlock(existing.value) : undefined))
// Blijft liggen? Begin met één stap van een kwartier. De tekst kun je zelf aanpassen.
const { state } = useStore()
const tasks = useTasks()
const stuck = computed(() => (existing.value ? stuckAssignments(state.value).find(x => x.a.id === existing.value!.id) : undefined))
const step = ref(existing.value ? firstStepFor(existing.value.title, existing.value.tags) : '')
function planStep() {
  if (!existing.value || step.value.trim().length < 3) return
  const t = tasks.planFirstStep(step.value.trim(), { assignmentId: existing.value.id, clientId: existing.value.clientId })
  toast.push(t ? { text: `Eerste stap staat ${relDay(t.date!)} om ${t.start}. Alleen dat, meer niet.`, to: '/week', toLabel: 'Bekijk' } : { text: 'Ik vond geen kwartier binnen je werktijd deze week.' })
}
defineExpose({ save })
</script>

<template>
  <form class="space-y-4" @submit.prevent="save">
    <label class="field">
      <span class="field-label">Opdracht *</span>
      <input v-model="f.title" class="field-input" placeholder="Bijv. bestelpagina bouwen" autocomplete="off" data-autofocus>
      <span v-if="tried && !valid" class="mt-1 block text-[13px] text-copper-ink">Vul een titel in.</span>
    </label>

    <div v-if="stuck" class="rounded-[14px] bg-cat-taak p-3.5 text-cat-ink">
      <p class="text-[14.5px] leading-snug">Ligt al {{ stuck.days }} dagen. Begin klein, met alleen de eerste stap:</p>
      <label class="sr-only" for="eerste-stap">Eerste stap</label>
      <input id="eerste-stap" v-model="step" class="field-input mt-2 !bg-white/80" autocomplete="off">
      <button type="button" class="mt-2 min-h-11 rounded-full bg-cat-ink px-4 text-[14px] text-white" @click="planStep"><Icon name="tabler:player-play" class="mr-1 inline size-4" />Plan een kwartier</button>
    </div>

    <div v-if="existing" class="flex flex-wrap items-center gap-2 rounded-[14px] bg-surface-2 p-3">
      <span class="min-w-0 flex-1 text-[14px]">
        <template v-if="block">Volgend werkblok: {{ relDay(block.date!) }} om {{ block.start }}</template>
        <template v-else>Nog geen tijd in je agenda.</template>
        <span v-if="A.loggedH(existing) || existing.estimateH" class="block text-[13px] text-muted">{{ dec1(A.loggedH(existing)).replace(',0', '') }} van {{ existing.estimateH ?? '?' }} uur gewerkt</span>
      </span>
      <button type="button" class="btn-outline !min-h-10 !px-3.5 !text-[13.5px]" @click="plan"><Icon name="tabler:calendar-event" class="size-4" />{{ block ? 'Nog een blok' : 'Plan in' }}</button>
    </div>

    <div>
      <span class="field-label">Status</span>
      <div class="seg">
        <button v-for="c in A.columns.value" :key="c.name" type="button" class="flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-[14px]" :class="[NOTION_FILL[c.color].fill, f.status === c.name ? 'ring-2 ring-ink' : '']" :aria-pressed="f.status === c.name" @click="f.status = c.name">{{ c.name }}</button>
      </div>
    </div>
    <label class="field">
      <span class="field-label">Klant</span>
      <select v-model="f.clientId" class="field-input"><option value="">Geen</option><option v-for="c in clients.clients.value" :key="c.id" :value="c.id">{{ c.name }}</option></select>
    </label>
    <div class="grid grid-cols-2 gap-3">
      <label class="field"><span class="field-label">Deadline</span><input v-model="f.due" type="date" class="field-input"></label>
      <div>
        <span class="field-label">Prioriteit</span>
        <div class="seg"><button v-for="p in PRIORITIES" :key="p" type="button" class="seg-btn" :aria-pressed="f.priority === p" @click="f.priority = p">{{ cap(p) }}</button></div>
      </div>
    </div>
    <div>
      <span class="field-label">Geschatte uren</span>
      <div class="seg"><button v-for="h in HOURS" :key="h" type="button" class="seg-btn num" :aria-pressed="f.estimateH === h" @click="f.estimateH = h">{{ h }}</button></div>
    </div>
    <div>
      <span class="field-label">Soort werk</span>
      <div class="seg">
        <button v-for="t in TAGS" :key="t" type="button" class="flex min-h-10 items-center rounded-full px-3.5 text-[14px]" :class="[TAG_FILL[t], f.tags.includes(t) ? 'ring-2 ring-ink' : 'opacity-80']" :aria-pressed="f.tags.includes(t)" @click="toggleTag(t)">{{ t }}</button>
      </div>
    </div>
    <label class="field"><span class="field-label">Notitie</span><input v-model="f.note" class="field-input" placeholder="Bijv. waar je op wacht"></label>

    <p class="flex items-center gap-2 text-[13px] text-muted"><Icon name="tabler:refresh" class="size-4 shrink-0" />{{ existing ? 'Komt uit Notion. Wijzigingen gaan straks terug naar dezelfde pagina.' : 'Wordt straks een nieuwe pagina in je Notion-database Opdrachten.' }}</p>
    <button v-if="existing" type="button" class="flex min-h-11 items-center gap-2 text-[14.5px] text-copper-ink" @click="remove"><Icon name="tabler:trash" class="size-4" />Van het bord halen</button>
  </form>
</template>
