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

// ---------- Opdelen met Stuurman ----------
// Een grote of vage taak deelt Stuurman op in een user story en subtaken. Jij past aan of laat het.
const ai = useStuurmanAI()
type SubDraft = { title: string, durationMin: number, kind: Task['kind'], deep: boolean }
const split = reactive({
  status: 'idle' as 'idle' | 'loading' | 'done' | 'error',
  error: '',
  askedFor: '',
  use: true,
  worth: false,
  reason: '',
  story: null as null | { asA: string, iWant: string, soThat: string },
  criteria: [] as string[],
  subtasks: [] as SubDraft[],
})
const subtotal = computed(() => split.subtasks.reduce((s, t) => s + t.durationMin, 0))
const willSplit = computed(() => !existing.value && split.status === 'done' && split.worth && split.use && split.subtasks.length > 1)
const looksBig = computed(() => f.title.trim().length >= 4 && (f.durationMin >= 60 || f.kind === 'focus'))
const askKey = computed(() => `${f.title.trim()}|${f.durationMin}|${f.kind}`)

async function askSplit() {
  if (f.title.trim().length < 3 || split.status === 'loading') return
  split.status = 'loading'
  split.askedFor = askKey.value
  try {
    const r = await ai.breakdown({ title: f.title.trim(), kind: f.kind, domain: f.domain, durationMin: f.durationMin, clientId: f.clientId || undefined })
    Object.assign(split, { status: 'done', worth: r.worthSplitting, reason: r.reason, story: r.story, criteria: r.criteria, subtasks: r.subtasks.map(s => ({ ...s })), use: r.worthSplitting })
  }
  catch (e) {
    split.status = 'error'
    split.error = (e as Error).message
  }
}
// Vanzelf kijken bij een nieuwe, grote taak: even wachten tot je klaar bent met typen
watchDebounced(askKey, () => {
  if (existing.value || !looksBig.value || split.askedFor === askKey.value) return
  askSplit()
}, { debounce: 1400 })
function removeSub(i: number) { split.subtasks.splice(i, 1) }
function addSub() { split.subtasks.push({ title: '', durationMin: 30, kind: f.kind, deep: false }) }

function saveSplit(slotFor: (dur: number, deep: boolean) => { date: string, start: string } | null) {
  const subs = split.subtasks.filter(s => s.title.trim())
  const parent = tasks.add({
    title: f.title.trim(), durationMin: subtotal.value, kind: f.kind, clientId: f.clientId || undefined, important: f.important, deep: f.kind === 'focus', domain: f.domain,
    story: split.story ? { ...split.story, criteria: split.criteria.filter(c => c.trim()) } : undefined,
  })
  let first: { date: string, start: string } | null = null
  subs.forEach((s, i) => {
    const slot = i === 0 ? slotFor(s.durationMin, s.deep) : null
    if (slot) first = slot
    tasks.add({ title: s.title.trim(), durationMin: s.durationMin, kind: s.kind, deep: s.deep, clientId: f.clientId || undefined, domain: f.domain, parentId: parent.id, step: i + 1, ...(slot ? { date: slot.date, start: slot.start } : {}) })
  })
  const when = first as { date: string, start: string } | null
  toast.push({ text: `Opgedeeld in ${subs.length} stappen.${when ? ` De eerste staat ${relDay(when.date)} om ${when.start}.` : ''}`, to: '/week', toLabel: 'Bekijk' })
  editor.saved(parent.id)
}

// Bestaande opgedeelde taak: story en stappen tonen
const subs = computed(() => (existing.value ? tasks.subtasksOf(existing.value.id) : []))
// Subtaak: de hoofdtaak (met de story) is één tik weg
const parentTask = computed(() => (existing.value?.parentId ? tasks.byId(existing.value.parentId) : undefined))

function save() {
  tried.value = true
  if (!valid.value) return
  if (willSplit.value) {
    return saveSplit((dur, deep) => f.when === 'stuurman'
      ? cal.findSlot(dur, { deep, domain: f.domain })
      : f.when === 'zelf' ? { date: f.date, start: f.start } : null)
  }
  // Een opgedeelde taak komt zelf niet in de agenda: dat doen zijn stappen
  const slot = subs.value.length ? null : f.when === 'stuurman' ? suggestion.value : f.when === 'zelf' ? { date: f.date, start: f.start } : null
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

    <button v-if="parentTask" type="button" class="flex w-full items-center gap-3 rounded-[14px] border border-line bg-surface-2 p-3 text-left hover:bg-surface-3" @click="editor.open({ kind: 'taak', id: parentTask.id })">
      <Icon name="tabler:clipboard-list" class="size-[18px] shrink-0 text-muted" />
      <span class="flex-1 text-[14.5px]"><span class="text-muted">Stap {{ existing?.step }} van</span> {{ parentTask.title }}</span>
      <Icon name="tabler:arrow-right" class="size-4 text-muted" />
    </button>

    <!-- Opdelen met Stuurman (nieuwe taak) -->
    <section v-if="!existing" class="rounded-[16px] border border-line bg-surface-2 p-3.5" aria-live="polite">
      <div v-if="split.status === 'idle'" class="flex items-center gap-3">
        <Icon name="tabler:steering-wheel" class="size-[18px] shrink-0 text-muted" />
        <p class="flex-1 text-[14px] text-muted">{{ looksBig ? 'Stuurman kijkt zo of dit op te delen is.' : 'Groot of vaag? Laat Stuurman het opdelen.' }}</p>
        <button type="button" class="btn-outline !min-h-9 !px-3 text-[13.5px]" :disabled="f.title.trim().length < 3" @click="askSplit">Opdelen</button>
      </div>
      <div v-else-if="split.status === 'loading'" class="flex items-center gap-3 text-[14px] text-muted">
        <Icon name="tabler:loader-2" class="size-[18px] shrink-0 animate-spin" />Stuurman deelt het op…
      </div>
      <div v-else-if="split.status === 'error'" class="flex items-center gap-3">
        <Icon name="tabler:alert-circle" class="size-[18px] shrink-0 text-copper-ink" />
        <p class="flex-1 text-[14px] text-copper-ink">{{ split.error }}</p>
        <button type="button" class="btn-outline !min-h-9 !px-3 text-[13.5px]" @click="askSplit">Opnieuw</button>
      </div>
      <div v-else-if="!split.worth" class="flex items-center gap-3">
        <Icon name="tabler:check" class="size-[18px] shrink-0 text-green-ink" />
        <p class="flex-1 text-[14px] text-muted">{{ split.reason }}</p>
        <button v-if="split.askedFor !== askKey" type="button" class="btn-outline !min-h-9 !px-3 text-[13.5px]" @click="askSplit">Opnieuw</button>
      </div>
      <div v-else class="space-y-3">
        <label class="flex min-h-9 items-center gap-3">
          <input v-model="split.use" type="checkbox" class="size-5 accent-[var(--ink)]">
          <span class="flex-1 text-[15px]">Opdelen in {{ split.subtasks.length }} stappen <span class="num text-muted">· {{ duration(subtotal) }}</span></span>
          <button v-if="split.askedFor !== askKey" type="button" class="text-[13px] text-muted underline" @click="askSplit">Opnieuw</button>
        </label>
        <template v-if="split.use">
          <div v-if="split.story" class="rounded-[12px] bg-surface p-3 text-[14.5px] leading-relaxed">
            <p><span class="text-muted">Als</span> {{ split.story.asA }} <span class="text-muted">wil ik</span> {{ split.story.iWant }}<span class="text-muted">, zodat</span> {{ split.story.soThat }}.</p>
            <ul v-if="split.criteria.length" class="mt-2 space-y-1 text-[13.5px]">
              <li v-for="(c, i) in split.criteria" :key="i" class="flex gap-2"><Icon name="tabler:check" class="mt-0.5 size-3.5 shrink-0 text-green-ink" />{{ c }}</li>
            </ul>
          </div>
          <ol class="space-y-1.5">
            <li v-for="(s, i) in split.subtasks" :key="i" class="flex items-center gap-2">
              <span class="num w-5 shrink-0 text-center text-[13px] text-muted">{{ i + 1 }}</span>
              <input v-model="s.title" class="field-input !min-h-10 flex-1 !py-1.5 text-[14.5px]" :aria-label="`Stap ${i + 1}`">
              <select v-model.number="s.durationMin" class="field-input !min-h-10 !w-[104px] shrink-0 !px-2.5 !py-1.5 text-[14px]" :aria-label="`Duur stap ${i + 1}`">
                <option v-for="d in DURATIONS" :key="d" :value="d">{{ duration(d) }}</option>
              </select>
              <Icon v-if="s.deep" name="tabler:bulb" class="size-4 shrink-0 text-muted" title="Denkwerk" />
              <button type="button" class="icon-btn !size-9 shrink-0" :aria-label="`Stap ${i + 1} weghalen`" @click="removeSub(i)"><Icon name="tabler:x" class="size-4" /></button>
            </li>
          </ol>
          <button type="button" class="flex items-center gap-1.5 text-[14px] text-muted hover:text-ink" @click="addSub"><Icon name="tabler:plus" class="size-4" />Stap toevoegen</button>
          <p class="text-[13px] text-muted">De eerste stap komt op de plek hieronder. De rest staat bij nog in te plannen.</p>
        </template>
      </div>
    </section>

    <!-- Bestaande opgedeelde taak -->
    <section v-else-if="existing && (existing.story || subs.length)" class="rounded-[16px] border border-line bg-surface-2 p-3.5">
      <p v-if="existing.story" class="text-[14.5px] leading-relaxed"><span class="text-muted">Als</span> {{ existing.story.asA }} <span class="text-muted">wil ik</span> {{ existing.story.iWant }}<span class="text-muted">, zodat</span> {{ existing.story.soThat }}.</p>
      <ul v-if="existing.story?.criteria.length" class="mt-2 space-y-1 text-[13.5px]">
        <li v-for="(c, i) in existing.story.criteria" :key="i" class="flex gap-2"><Icon name="tabler:check" class="mt-0.5 size-3.5 shrink-0 text-green-ink" />{{ c }}</li>
      </ul>
      <ol v-if="subs.length" class="mt-3 space-y-1">
        <li v-for="s in subs" :key="s.id" class="flex min-h-10 items-center gap-3">
          <input type="checkbox" :checked="s.done" class="size-5 accent-[var(--ink)]" :aria-label="`${s.title} gedaan`" @change="tasks.toggleDone(s.id)">
          <span class="flex-1 text-[14.5px]" :class="s.done ? 'text-muted line-through' : ''">{{ s.title }}</span>
          <span class="num text-[13px] text-muted">{{ s.date ? `${weekdayShort(s.date)} ${s.start}` : duration(s.durationMin) }}</span>
        </li>
      </ol>
    </section>
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
    <div v-if="!subs.length">
      <span class="field-label">{{ willSplit ? 'Wanneer begin je' : 'Wanneer' }}</span>
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
