<script setup lang="ts">
import type { DayItem } from '~/composables/useCalendar'
import type { CalendarEvent, ISODate, Task } from '~/types'
import { CATEGORIES, CATEGORY_ORDER, categoryOf, categoryOfTask, type Category } from '~/utils/category'

useHead({ title: 'Week · Stuurhut' })
const root = ref<HTMLElement | null>(null)
useMotion(root)

const { state } = useStore()
const cal = useCalendar()
const tasks = useTasks()
const clients = useClients()
const stuurman = useStuurman()
const toast = useToast()
const route = useRoute()
const isLg = useMediaQuery('(min-width: 1024px)')
const editor = useEditor()
function editItem(i: DayItem) {
  pop.value = null
  editor.open({ kind: i.type === 'task' ? 'taak' : 'afspraak', id: i.id })
}

const days = cal.days
const today = todayISO()
const selected = ref<ISODate>(today)
const view = ref<'week' | 'dag'>('week')
const HOUR = 64
const hours = Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }, (_, i) => DAY_START / 60 + i)
const top = (t: string) => ((toMin(t) - DAY_START) / 60) * HOUR
const height = (a: string, b: string) => Math.max(28, ((toMin(b) - toMin(a)) / 60) * HOUR - 4)
const D = useDomain()
const items = (d: ISODate) => cal.dayItems(d, true).filter(i => D.matches(domainOf(i)))
const outside = (i: DayItem) => domainOf(i) === 'zakelijk' && D.outsideWork(i.ref.date ?? '', i.start, i.end)
const outsideCount = computed(() => days.value.reduce((n, d) => n + cal.dayItems(d).filter(i => domainOf(i) === 'zakelijk' && D.outsideWork(d, i.start, i.end)).length, 0))
const wh = computed(() => state.value.prefs.workHours)
const unscheduledVisible = computed(() => tasks.unscheduled.value.filter(t => D.matches(domainOfTask(t))))
const visible = (i: DayItem) => !(i.type === 'event' && (i.ref as CalendarEvent).cancelled)
const isGap = (i: DayItem) => i.type === 'event' && (i.ref as CalendarEvent).cancelled && !state.value.gapResolved[i.id]
const isDone = (i: DayItem) => i.type === 'task' && !!(i.ref as Task).done
const clientName = (id?: string) => clients.byId(id)?.name
const clientOf = (i: DayItem) => clients.byId(i.ref.clientId)

// Tellers per soort deze week
const catCounts = computed(() => {
  const c: Record<Category, number> = { meeting: 0, taak: 0, focus: 0, admin: 0, prive: 0 }
  for (const d of days.value) for (const i of items(d)) if (visible(i)) c[categoryOf(i)]++
  return c
})

function selectDay(d: ISODate) {
  selected.value = d
  view.value = 'dag'
}

// ---------- Detailkaart (popover) ----------
const gridEl = ref<HTMLElement | null>(null)
const pop = ref<{ id: string, date: ISODate, x: number, y: number } | null>(null)
const popItem = computed(() => (pop.value ? items(pop.value.date).find(i => i.id === pop.value!.id) ?? null : null))
function openPop(e: MouseEvent, i: DayItem, date: ISODate, col: number) {
  if (!gridEl.value) return
  const g = gridEl.value.getBoundingClientRect()
  const b = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const W = 300
  const x = col >= 3 ? b.left - g.left - W - 8 : b.right - g.left + 8
  const y = Math.min(b.top - g.top, g.height - 340)
  pop.value = pop.value?.id === i.id ? null : { id: i.id, date, x: Math.max(0, x), y: Math.max(0, y) }
}
onKeyStroke('Escape', () => { pop.value = null })
onClickOutside(gridEl, () => { pop.value = null })

// ---------- Inplannen ----------
function highlight(id: string) {
  nextTick(() => document.querySelectorAll(`[data-block="${id}"]`).forEach(el => softAppear(el)))
}
function planSuggested(t: Task) {
  const slot = cal.findSlot(t.durationMin, { deep: t.deep, excludeTaskId: t.id, domain: domainOfTask(t) })
  if (!slot) return toast.push({ text: 'Ik vond geen plek deze week.' })
  tasks.schedule(t.id, slot.date, slot.start)
  selected.value = slot.date
  highlight(t.id)
  toast.push({ text: `${t.title}: ${relDay(slot.date)} om ${slot.start}.` })
}
function planOnSelected(t: Task) {
  const slot = cal.findSlotOn(selected.value, t.durationMin, 9 * 60, t.id)
  if (!slot) return toast.push({ text: `Op ${relDay(selected.value)} past het niet meer.` })
  tasks.schedule(t.id, slot.date, slot.start)
  highlight(t.id)
  toast.push({ text: `${t.title}: ${relDay(slot.date)} om ${slot.start}.` })
}
const suggestFor = (t: Task) => cal.findSlot(t.durationMin, { deep: t.deep, excludeTaskId: t.id, domain: domainOfTask(t) })

// ---------- Slepen ----------
const dragId = ref<string | null>(null)
const dropDay = ref<ISODate | null>(null)
function onDragStart(e: DragEvent, id: string) {
  pop.value = null
  dragId.value = id
  e.dataTransfer?.setData('text/plain', id)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
function onDrop(e: DragEvent, date: ISODate) {
  const id = e.dataTransfer?.getData('text/plain') || dragId.value
  dropDay.value = null
  dragId.value = null
  const t = id ? tasks.byId(id) : null
  if (!t) return
  const col = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const wanted = Math.round((((e.clientY - col.top) / HOUR) * 60 + DAY_START) / 15) * 15
  const from = Math.max(DAY_START, Math.min(wanted, DAY_END - t.durationMin))
  const slot = cal.isFree(date, from, t.durationMin, t.id) && !(date === today && from < nowMin())
    ? { date, start: fromMin(from) }
    : cal.findSlotOn(date, t.durationMin, from, t.id)
  if (!slot) return toast.push({ text: `Op ${relDay(date)} past dit niet meer.` })
  tasks.schedule(t.id, slot.date, slot.start)
  highlight(t.id)
  if (slot.start !== fromMin(from)) toast.push({ text: `Daar zat al iets. Nu om ${slot.start}.` })
}
function backToList(id: string) {
  tasks.unschedule(id)
  pop.value = null
}

// ---------- Het gat ----------
const gap = stuurman.gap
const gapEl = ref<HTMLElement | null>(null)
function fill(opt: 'task' | 'focus' | 'vrij') {
  const g = gap.value
  if (!g) return
  stuurman.resolveGap(opt)
  selected.value = g.date
  nextTick(() => state.value.tasks.filter(t => t.date === g.date && t.start === g.start).forEach(t => highlight(t.id)))
}
const toGap = () => gapEl.value?.scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth', block: 'center' })
onMounted(() => { if (route.hash === '#gat') nextTick(toGap) })
const gapIcon = { task: 'tabler:checkbox', focus: 'tabler:bulb', vrij: 'tabler:heart' } as const
const gapCat = { task: 'taak', focus: 'focus', vrij: 'prive' } as const
</script>

<template>
  <div ref="root">
    <PageHeader title="Week">
      <template #actions>
        <DomainSwitch class="w-[270px] xl:hidden" />
        <button type="button" class="btn-outline !px-3.5" @click="editor.open({ kind: 'taak', prefill: { } })"><Icon name="tabler:plus" class="size-4" />Taak</button>
        <button type="button" class="btn-outline !px-3.5" @click="editor.open({ kind: 'afspraak', prefill: { date: selected } })"><Icon name="tabler:plus" class="size-4" />Afspraak</button>
        <div class="hidden rounded-full bg-surface-3/70 p-1 lg:flex" role="tablist" aria-label="Weergave">
          <button v-for="v in (['week', 'dag'] as const)" :key="v" type="button" role="tab" :aria-selected="view === v" class="min-h-9 rounded-full px-4 text-[14px] capitalize transition-colors" :class="view === v ? 'bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]' : 'text-muted hover:text-ink'" @click="view = v">{{ v }}</button>
        </div>
      </template>
    </PageHeader>

    <!-- Soorten: kleur = betekenis -->
    <div class="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Soorten" data-enter>
      <span v-for="c in CATEGORY_ORDER" :key="c" class="flex shrink-0 items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-1.5 pr-3 text-[14px]">
        <span class="grid size-6 place-items-center rounded-full text-cat-ink" :class="CATEGORIES[c].fill"><Icon :name="CATEGORIES[c].icon" class="size-3.5" /></span>
        {{ CATEGORIES[c].label }}
        <span class="num text-muted">{{ catCounts[c] }}</span>
      </span>
    </div>

    <div class="-mt-1 mb-4 flex flex-wrap items-center gap-2" data-enter>
      <button type="button" class="chip border border-line bg-surface !py-2 hover:bg-surface-2" @click="editor.open({ kind: 'werktijden' })">
        <Icon name="tabler:clock" class="size-3.5" />Werktijden {{ wh.start }}–{{ wh.end }}
      </button>
      <span v-if="outsideCount" class="chip bg-copper-soft text-copper-ink !py-2"><Icon name="tabler:alert-circle" class="size-3.5" />{{ outsideCount }}× werk buiten werktijd</span>
      <span v-else class="chip bg-green-soft text-green-ink !py-2"><Icon name="tabler:check" class="size-3.5" />Werk blijft binnen je werktijd</span>
    </div>

    <!-- De verschuiving -->
    <section v-if="gap" id="gat" ref="gapEl" class="card mb-4 scroll-mt-6 p-4 md:p-5" aria-labelledby="gat-titel" data-enter>
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span class="chip bg-copper text-on-copper">Vrijgekomen</span>
        <h2 id="gat-titel" class="text-[17px]">{{ cap(weekdayLong(gap.date)) }} {{ gap.start }} → {{ gap.end }}</h2>
        <span class="text-[14px] text-muted">{{ gap.title }} is afgezegd</span>
      </div>
      <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button v-for="o in stuurman.gapChoices.value" :key="o.id" type="button" class="flex min-h-14 items-center gap-3 rounded-[14px] p-3 text-left text-cat-ink transition-transform hover:-translate-y-px" :class="CATEGORIES[gapCat[o.id]].fill" :title="o.why" @click="fill(o.id)">
          <span class="grid size-9 shrink-0 place-items-center rounded-full bg-white/60"><Icon :name="gapIcon[o.id]" class="size-[18px]" /></span>
          <span class="flex-1 text-[15px] leading-snug">{{ o.title }}</span>
          <Icon name="tabler:plus" class="size-4 shrink-0" />
        </button>
      </div>
    </section>

    <div class="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1fr)_260px]">
      <!-- ===== Desktop ===== -->
      <section v-if="isLg" ref="gridEl" class="card relative p-4" aria-label="Weekoverzicht" data-enter>
        <!-- Dagtegels -->
        <div class="grid gap-2" :class="view === 'week' ? 'grid-cols-[44px_repeat(5,minmax(0,1fr))]' : 'grid-cols-[44px_repeat(5,minmax(0,1fr))]'">
          <span class="grid place-items-center text-muted"><Icon name="tabler:calendar" class="size-5" /></span>
          <button
            v-for="d in days"
            :key="d"
            type="button"
            class="flex flex-col items-center rounded-[14px] py-2.5 transition-colors"
            :class="(view === 'dag' ? selected === d : d === today) ? 'bg-primary text-on-primary' : 'bg-surface-2 hover:bg-surface-3'"
            :aria-pressed="selected === d"
            @click="selectDay(d)"
          >
            <span class="text-[13px] capitalize" :class="(view === 'dag' ? selected === d : d === today) ? 'opacity-75' : 'text-muted'">{{ weekdayLong(d) }}</span>
            <span class="num text-[26px] leading-tight">{{ dayNum(d) }}</span>
            <span class="mt-0.5 flex items-center gap-1 text-[11.5px]" :class="(view === 'dag' ? selected === d : d === today) ? 'opacity-75' : 'text-muted'">
              <span class="size-1.5 rounded-full" :class="{ rustig: 'bg-green-bar', normaal: 'bg-sea', vol: 'bg-copper' }[cal.dayLoad(d).level]" />{{ cal.dayLoad(d).level }}
            </span>
          </button>
        </div>

        <!-- Weekraster -->
        <div v-if="view === 'week'" class="mt-3 grid grid-cols-[44px_repeat(5,minmax(0,1fr))] gap-x-2">
          <div class="relative" :style="{ height: `${(hours.length - 1) * HOUR}px` }">
            <span v-for="h in hours" :key="h" class="num absolute -translate-y-1/2 text-[12px] text-muted" :style="{ top: `${(h - 8) * HOUR}px` }">{{ h }}:00</span>
          </div>
          <div
            v-for="(d, col) in days"
            :key="`col-${d}`"
            class="relative rounded-[14px] transition-colors"
            :class="dropDay === d ? 'bg-sea-soft' : ''"
            :style="{ height: `${(hours.length - 1) * HOUR}px` }"
            @dragover.prevent="dropDay = d"
            @dragleave="dropDay = null"
            @drop.prevent="onDrop($event, d)"
          >
            <div v-for="h in hours.slice(0, -1)" :key="h" class="pointer-events-none absolute inset-x-0 border-t border-line" :style="{ top: `${(h - 8) * HOUR}px` }" />
            <!-- Buiten werktijd: gearceerd -->
            <template v-if="D.isWorkday(d)">
              <div class="off-hours pointer-events-none absolute inset-x-0 top-0 rounded-t-[14px]" :style="{ height: `${Math.max(0, top(wh.start))}px` }" />
              <div class="off-hours pointer-events-none absolute inset-x-0 bottom-0 rounded-b-[14px]" :style="{ top: `${top(wh.end)}px` }">
                <span class="absolute left-1.5 top-1 text-[11px] text-muted">na werktijd</span>
              </div>
            </template>
            <div v-else class="off-hours pointer-events-none absolute inset-0 rounded-[14px]" />
            <div v-if="d === today && nowMin() > DAY_START && nowMin() < DAY_END" class="pointer-events-none absolute inset-x-0 z-[2] h-0.5 bg-copper" :style="{ top: `${((nowMin() - DAY_START) / 60) * HOUR}px` }"><span class="absolute -left-1 -top-1 size-2.5 rounded-full bg-copper" /></div>

            <template v-for="i in items(d)" :key="i.id">
              <button
                v-if="isGap(i)"
                type="button"
                class="absolute inset-x-0.5 grid place-items-center rounded-[12px] border-2 border-dashed border-ui-border text-muted hover:border-copper hover:text-copper-ink"
                :style="{ top: `${top(i.start) + 2}px`, height: `${height(i.start, i.end)}px` }"
                aria-label="Vrijgekomen tijd vullen"
                @click="toGap"
              >
                <span class="grid size-8 place-items-center rounded-full border border-current"><Icon name="tabler:plus" class="size-4" /></span>
              </button>
              <button
                v-else-if="visible(i)"
                type="button"
                :data-block="i.id"
                :draggable="i.type === 'task'"
                class="absolute inset-x-0.5 overflow-hidden rounded-[12px] px-2.5 py-2 text-left text-cat-ink transition-[filter] hover:brightness-[0.97]"
                :class="[CATEGORIES[categoryOf(i)].fill, isDone(i) ? 'opacity-45' : '', pop?.id === i.id ? 'ring-2 ring-ink' : outside(i) ? 'ring-2 ring-copper' : '', i.type === 'task' ? 'cursor-grab active:cursor-grabbing' : '']"
                :title="outside(i) ? 'Werk buiten werktijd' : undefined"
                :style="{ top: `${top(i.start) + 2}px`, height: `${height(i.start, i.end)}px` }"
                @dragstart="onDragStart($event, i.id)"
                @click="openPop($event, i, d, col)"
              >
                <span class="line-clamp-2 text-[13.5px] leading-tight" :class="isDone(i) ? 'line-through' : ''">{{ i.title }}</span>
                <span v-if="height(i.start, i.end) > 46" class="num mt-0.5 block text-[12px] text-cat-ink-muted">{{ i.start }} – {{ i.end }}</span>
                <span v-if="height(i.start, i.end) > 84 && clientOf(i)" class="absolute bottom-2 left-2.5 grid size-6 place-items-center rounded-full bg-white/70 text-[10px]">{{ initials(clientOf(i)!.name) }}</span>
              </button>
            </template>
          </div>
        </div>

        <!-- Dagweergave -->
        <ol v-else class="mt-3 space-y-2">
          <li v-for="i in items(selected).filter(x => visible(x) || isGap(x))" :key="i.id" :data-block="i.id">
            <button v-if="isGap(i)" type="button" class="flex min-h-14 w-full items-center gap-3 rounded-[14px] border-2 border-dashed border-ui-border px-4 text-muted" @click="toGap">
              <span class="num w-[110px] text-[15px]">{{ i.start }} – {{ i.end }}</span><Icon name="tabler:plus" class="size-4" />Vrijgekomen
            </button>
            <div v-else class="flex min-h-14 items-center gap-4 rounded-[14px] px-4 py-3 text-cat-ink" :class="[CATEGORIES[categoryOf(i)].fill, isDone(i) ? 'opacity-45' : '']">
              <span class="num w-[110px] shrink-0 text-[15px]">{{ i.start }} – {{ i.end }}</span>
              <Icon :name="CATEGORIES[categoryOf(i)].icon" class="size-[18px] shrink-0" />
              <span class="min-w-0 flex-1 text-[16px]" :class="isDone(i) ? 'line-through' : ''">{{ i.title }}</span>
              <span v-if="clientOf(i)" class="hidden text-[14px] text-cat-ink-muted md:inline">{{ clientOf(i)!.name }}</span>
              <button v-if="i.type === 'task'" type="button" class="rounded-full bg-white/60 px-3 py-1.5 text-[13px]" @click="tasks.toggleDone(i.id)">{{ isDone(i) ? 'Open' : 'Gedaan' }}</button>
            </div>
          </li>
          <li v-if="!items(selected).length" class="rounded-[14px] bg-surface-2 p-5 text-muted">Niets gepland.</li>
        </ol>

        <!-- Detailkaart -->
        <Transition enter-from-class="opacity-0 translate-y-1" enter-active-class="transition duration-200 ease-out" leave-to-class="opacity-0" leave-active-class="transition duration-150">
          <div v-if="pop && popItem" class="absolute z-20 w-[300px] rounded-[18px] border border-line bg-surface p-5 shadow-float" :style="{ left: `${pop.x}px`, top: `${pop.y}px` }" role="dialog" :aria-label="popItem.title">
            <div class="flex items-start gap-2">
              <h3 class="flex-1 text-[19px] leading-snug">{{ popItem.title }}</h3>
              <button type="button" class="-mt-2 icon-btn" aria-label="Bewerken" title="Bewerken" @click="editItem(popItem)"><Icon name="tabler:pencil" class="size-4" /></button>
              <button type="button" class="-mr-2 -mt-2 icon-btn" aria-label="Sluiten" @click="pop = null"><Icon name="tabler:x" class="size-4" /></button>
            </div>
            <div class="mt-4 space-y-2 text-[14.5px]">
              <p class="flex items-center gap-3"><Icon name="tabler:calendar" class="size-[18px] text-muted" /><span class="rounded-[10px] bg-surface-2 px-3 py-1.5">{{ cap(longDate(pop.date)) }}</span></p>
              <p class="flex items-center gap-3"><Icon name="tabler:clock" class="size-[18px] text-muted" /><span class="num rounded-[10px] bg-surface-2 px-3 py-1.5">{{ popItem.start }}</span><Icon name="tabler:arrow-right" class="size-4 text-muted" /><span class="num rounded-[10px] bg-surface-2 px-3 py-1.5">{{ popItem.end }}</span></p>
              <p v-if="popItem.type === 'event' && (popItem.ref as CalendarEvent).location" class="flex items-center gap-3"><Icon name="tabler:map-pin" class="size-[18px] text-muted" /><span class="rounded-[10px] bg-surface-2 px-3 py-1.5">{{ (popItem.ref as CalendarEvent).location }}</span></p>
            </div>
            <div class="mt-4 flex flex-wrap gap-2">
              <span class="chip text-cat-ink !py-1.5" :class="CATEGORIES[categoryOf(popItem)].fill"><Icon :name="CATEGORIES[categoryOf(popItem)].icon" class="size-3.5" />{{ CATEGORIES[categoryOf(popItem)].label }}</span>
              <NuxtLink v-if="clientOf(popItem)" :to="`/klanten?id=${clientOf(popItem)!.id}`" class="chip border border-line !py-1.5 hover:bg-surface-2"><UiAvatar :name="clientOf(popItem)!.name" :tint="clientOf(popItem)!.tint" :size="18" />{{ clientOf(popItem)!.name }}</NuxtLink>
            </div>
            <div v-if="popItem.type === 'task'" class="mt-5 flex gap-2">
              <button type="button" class="btn-primary flex-1" @click="tasks.toggleDone(popItem.id); pop = null">{{ isDone(popItem) ? 'Weer open' : 'Gedaan' }}</button>
              <button type="button" class="btn-outline" @click="backToList(popItem.id)">Terug naar lijst</button>
            </div>
            <NuxtLink v-else-if="clientOf(popItem)" :to="`/klanten?id=${clientOf(popItem)!.id}`" class="btn-primary mt-5 w-full">Naar klant</NuxtLink>
          </div>
        </Transition>
      </section>

      <!-- ===== Mobiel/tablet ===== -->
      <section v-else aria-label="Dag kiezen" data-enter>
        <div class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:px-0">
          <button
            v-for="d in days"
            :key="d"
            type="button"
            class="flex min-w-[64px] flex-1 flex-col items-center rounded-[14px] py-2.5 transition-colors"
            :class="selected === d ? 'bg-primary text-on-primary' : 'bg-surface border border-line'"
            :aria-pressed="selected === d"
            @click="selected = d"
          >
            <span class="text-[12.5px]" :class="selected === d ? 'opacity-75' : 'text-muted'">{{ d === today ? 'vandaag' : weekdayShort(d) }}</span>
            <span class="num text-[22px] leading-tight">{{ dayNum(d) }}</span>
            <span class="mt-1 size-1.5 rounded-full" :class="{ rustig: 'bg-green-bar', normaal: 'bg-sea', vol: 'bg-copper' }[cal.dayLoad(d).level]" />
          </button>
        </div>
        <ol class="mt-3 space-y-2">
          <li v-for="i in items(selected).filter(x => visible(x) || isGap(x))" :key="i.id" :data-block="i.id">
            <button v-if="isGap(i)" type="button" class="flex min-h-16 w-full items-center gap-3 rounded-[16px] border-2 border-dashed border-ui-border px-4 text-left text-muted" @click="toGap">
              <span class="num w-12 text-[15px]">{{ i.start }}</span><Icon name="tabler:plus" class="size-4" /><span class="text-[15px]">Vrijgekomen</span>
            </button>
            <div v-else class="flex min-h-16 items-center gap-3 rounded-[16px] px-4 py-3 text-cat-ink" :class="[CATEGORIES[categoryOf(i)].fill, isDone(i) ? 'opacity-45' : '']">
              <div class="w-12 shrink-0">
                <p class="num text-[15px] leading-tight">{{ i.start }}</p>
                <p class="num text-[12.5px] text-cat-ink-muted">{{ i.end }}</p>
              </div>
              <button type="button" class="min-w-0 flex-1 text-left" :aria-label="`${i.title} bewerken`" @click="editItem(i)">
                <p class="text-[16px] leading-snug" :class="isDone(i) ? 'line-through' : ''">{{ i.title }}</p>
                <p class="flex items-center gap-1.5 text-[13px] text-cat-ink-muted"><Icon :name="CATEGORIES[categoryOf(i)].icon" class="size-3.5" />{{ clientName(i.ref.clientId) ?? CATEGORIES[categoryOf(i)].label }}</p>
              </button>
              <button v-if="i.type === 'task'" type="button" class="grid size-11 shrink-0 place-items-center rounded-full bg-white/60" :aria-label="isDone(i) ? 'Weer open' : 'Gedaan'" @click="tasks.toggleDone(i.id)"><Icon name="tabler:check" class="size-5" /></button>
            </div>
          </li>
          <li v-if="!items(selected).length" class="rounded-[16px] bg-surface p-5 text-[15px] text-muted">Niets gepland.</li>
        </ol>
      </section>

      <!-- ===== Nog niet ingepland ===== -->
      <aside class="min-w-0 lg:order-first 2xl:order-none" aria-labelledby="los">
        <section class="card p-4" data-enter>
          <div class="mb-3 flex items-center justify-between px-1">
            <h2 id="los" class="text-[16px]">Nog in te plannen <span class="num ml-1 text-muted">{{ unscheduledVisible.length }}</span></h2>
            <span class="hidden text-[13px] text-muted lg:inline">Sleep naar een dag</span>
          </div>
          <ul class="space-y-2 lg:flex lg:gap-2 lg:space-y-0 lg:overflow-x-auto lg:pb-1 no-scrollbar 2xl:block 2xl:space-y-2">
            <li
              v-for="t in unscheduledVisible"
              :key="t.id"
              draggable="true"
              class="flex items-center gap-3 rounded-[14px] p-2.5 text-cat-ink lg:w-[250px] lg:shrink-0 lg:cursor-grab 2xl:w-auto"
              :class="CATEGORIES[categoryOfTask(t)].fill"
              @dragstart="onDragStart($event, t.id)"
            >
              <span class="grid size-9 shrink-0 place-items-center rounded-[10px] bg-white/60"><Icon :name="CATEGORIES[categoryOfTask(t)].icon" class="size-[18px]" /></span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[14.5px]">{{ t.title }}</span>
                <span class="block text-[12.5px] text-cat-ink-muted">{{ duration(t.durationMin) }}</span>
              </span>
              <button type="button" class="min-h-10 shrink-0 rounded-full bg-cat-ink px-3 text-[13px] text-white" :title="suggestFor(t) ? `Stuurman: ${relDay(suggestFor(t)!.date)} ${suggestFor(t)!.start}` : 'Plan in'" @click="isLg ? planSuggested(t) : planOnSelected(t)">
                {{ isLg && suggestFor(t) ? `${weekdayShort(suggestFor(t)!.date)} ${suggestFor(t)!.start}` : 'Plan in' }}
              </button>
            </li>
            <li v-if="!unscheduledVisible.length" class="rounded-[14px] bg-surface-2 p-4 text-[14px] text-muted">Alles heeft een plek.</li>
          </ul>
        </section>
      </aside>
    </div>
  </div>
</template>
