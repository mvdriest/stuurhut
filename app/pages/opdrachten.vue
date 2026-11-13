<script setup lang="ts">
// Opdrachten: het bord. Kolommen komen uit de Status in Notion.
// Slepen met de muis, of op iPhone even vasthouden en dan slepen.
// Een kaart openen kan altijd: daar kies je ook de status (toetsenbord en voorlezen).
import type { Assignment } from '~/types'

useHead({ title: 'Opdrachten · Stuurhut' })
const root = ref<HTMLElement | null>(null)
useMotion(root)

const A = useAssignments()
const S = useStuurman()
const D = useDomain()
const W = useWork()
const clients = useClients()
const editor = useEditor()
const toast = useToast()
const route = useRoute()
const isMd = useMediaQuery('(min-width: 768px)')

if (typeof route.query.klant === 'string') A.clientFilter.value = route.query.klant
const suggestion = computed(() => S.current.value[0])

// ---------- Overzicht ----------
const waitingLong = computed(() => A.open.value.filter(a => A.kindOf(a) === 'waiting' && A.waitingDays(a) >= 5))
const dueSoon = computed(() => A.open.value.filter(a => (A.dueDays(a) ?? 99) <= 7))
const sinceText = computed(() => {
  const m = Math.round((Date.now() - new Date(A.sync.value.lastPull).getTime()) / 60000)
  return m < 1 ? 'zojuist' : m < 60 ? `${m} min geleden` : 'vandaag'
})
async function refresh() {
  await A.refresh()
  toast.push({ text: 'Bijgewerkt. Testdata, dus er veranderde niets.' })
}

// ---------- Mobiel: één kolom tegelijk, swipen of tikken ----------
const board = ref<HTMLElement | null>(null)
const active = ref(0)
function onScroll() {
  if (isMd.value || !board.value) return
  const w = board.value.querySelector<HTMLElement>('[data-column]')?.offsetWidth ?? 1
  active.value = Math.round(board.value.scrollLeft / (w + 12))
}
function showColumn(i: number) {
  const el = board.value?.querySelectorAll<HTMLElement>('[data-column]')[i]
  if (el && board.value) board.value.scrollTo({ left: el.offsetLeft - board.value.offsetLeft - 16, behavior: prefersReduced() ? 'auto' : 'smooth' })
}

// ---------- Klaar tonen ----------
const showAllDone = ref(false)
function cards(name: string) {
  const list = A.inColumn(name)
  return A.column(name)?.kind === 'done' && !showAllDone.value ? list.slice(0, 4) : list
}

// ---------- Slepen ----------
const drag = reactive({ id: '' as string, x: 0, y: 0, ox: 0, oy: 0, w: 0, over: '' as string, index: -1 })
const dragged = computed(() => (drag.id ? A.byId(drag.id) : undefined))
let pending: { id: string, sx: number, sy: number, el: HTMLElement, touch: boolean, timer?: ReturnType<typeof setTimeout> } | null = null
let suppressClick = false

function down(e: PointerEvent, a: Assignment) {
  if (e.button !== 0) return
  const el = e.currentTarget as HTMLElement
  pending = { id: a.id, sx: e.clientX, sy: e.clientY, el, touch: e.pointerType !== 'mouse' }
  if (pending.touch) pending.timer = setTimeout(() => begin(pending!.sx, pending!.sy), 320)
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
  window.addEventListener('pointercancel', cancel)
}
function begin(x: number, y: number) {
  if (!pending) return
  const r = pending.el.getBoundingClientRect()
  Object.assign(drag, { id: pending.id, x, y, ox: pending.sx - r.left, oy: pending.sy - r.top, w: r.width, over: '', index: -1 })
  if (pending.touch) navigator.vibrate?.(8)
  window.addEventListener('touchmove', blockScroll, { passive: false })
  hit(x, y)
}
function blockScroll(e: TouchEvent) { if (drag.id) e.preventDefault() }
function move(e: PointerEvent) {
  if (!drag.id && pending) {
    const dist = Math.hypot(e.clientX - pending.sx, e.clientY - pending.sy)
    if (pending.touch) { if (dist > 8) cleanup() } // dan wil je scrollen
    else if (dist > 5) begin(e.clientX, e.clientY)
    return
  }
  if (!drag.id) return
  drag.x = e.clientX
  drag.y = e.clientY
  hit(e.clientX, e.clientY)
  // Bij de rand van het bord meeschuiven
  const b = board.value
  if (b) {
    const r = b.getBoundingClientRect()
    if (e.clientX < r.left + 40) b.scrollLeft -= 14
    else if (e.clientX > r.right - 40) b.scrollLeft += 14
  }
}
/** Boven welke kolom, en op welke plek tussen de kaarten? */
function hit(x: number, y: number) {
  const col = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-column]')
  if (!col) { drag.over = ''; drag.index = -1; return }
  drag.over = col.dataset.column!
  const others = [...col.querySelectorAll<HTMLElement>('[data-card]')].filter(c => c.dataset.card !== drag.id)
  const i = others.findIndex(c => { const r = c.getBoundingClientRect(); return y < r.top + r.height / 2 })
  drag.index = i < 0 ? others.length : i
}
function up() {
  if (drag.id && drag.over) {
    const a = A.byId(drag.id)!
    const from = a.status
    A.move(drag.id, drag.over, drag.index)
    afterMove(a, from)
    suppressClick = true
    setTimeout(() => { suppressClick = false }, 50)
  }
  cleanup()
}
function cancel() { cleanup() }
function cleanup() {
  if (pending?.timer) clearTimeout(pending.timer)
  pending = null
  drag.id = ''
  window.removeEventListener('pointermove', move)
  window.removeEventListener('pointerup', up)
  window.removeEventListener('pointercancel', cancel)
  window.removeEventListener('touchmove', blockScroll)
}
onBeforeUnmount(cleanup)

function openCard(a: Assignment) {
  if (suppressClick) return
  editor.open({ kind: 'opdracht', id: a.id })
}

// ---------- Na het verplaatsen ----------
const finished = ref<{ id: string, hours: number } | null>(null)
function afterMove(a: Assignment, from: string) {
  if (from === a.status) return
  const kind = A.kindOf(a)
  if (kind === 'done') {
    const left = Math.max(0, (a.estimateH ?? 0) - A.loggedH(a))
    finished.value = { id: a.id, hours: Math.round(left * 2) / 2 || 1 }
  }
  else if (kind === 'doing' && A.overWip.value) {
    toast.push({ text: `${A.doing.value.length} opdrachten tegelijk in ${a.status}. Drie houdt je hoofd rustiger.` })
  }
}
const finishedItem = computed(() => (finished.value ? A.byId(finished.value.id) : undefined))
function logFinished() {
  if (!finished.value || !finishedItem.value) return
  const a = finishedItem.value
  A.logHours(a.id, finished.value.hours)
  const p = clients.projectsFor(a.clientId ?? '').find(x => x.id === A.projectFor(a))
  const s = p ? W.stats(p) : null
  toast.push({
    text: s && s.billableAmount > 0 ? `${dec1(finished.value.hours).replace(',0', '')} uur gelogd. ${euroRound(s.billableAmount)} te factureren bij ${clients.byId(a.clientId)?.name}.` : `${dec1(finished.value.hours).replace(',0', '')} uur gelogd.`,
    to: s && s.billableAmount > 0 ? `/klanten?id=${a.clientId}` : undefined,
    toLabel: 'Factureren',
  })
  finished.value = null
}
</script>

<template>
  <div ref="root">
    <PageHeader title="Opdrachten" sub="Je werk per stap. Hier plan je het in.">
      <template #actions>
        <button type="button" class="chip min-h-11 !gap-2 border border-line bg-surface !px-3.5 !text-[13.5px] text-muted" :title="A.sourceLabel === 'testdata' ? 'Dit is testdata.' : 'Opnieuw ophalen'" @click="refresh">
          <Icon name="tabler:refresh" class="size-4" :class="A.pulling.value || A.sync.value.pending ? 'motion-safe:animate-spin' : ''" />
          <span>{{ A.sync.value.pending ? 'Opslaan…' : A.pulling.value ? 'Ophalen…' : A.sourceLabel === 'testdata' ? `Testdata · ${sinceText}` : `Bijgewerkt ${sinceText}` }}</span>
        </button>
        <button type="button" class="btn-primary" @click="editor.open({ kind: 'opdracht', prefill: { clientId: A.clientFilter.value ?? '' } })"><Icon name="tabler:plus" class="size-4" /><span class="hidden sm:inline">Nieuwe opdracht</span><span class="sm:hidden">Nieuw</span></button>
      </template>
    </PageHeader>

    <!-- Na werktijd -->
    <div v-if="D.effective.value === 'prive'" class="mb-4 flex items-center gap-3 rounded-[16px] bg-cat-prive p-3.5 text-cat-ink" data-enter>
      <Icon name="tabler:moon" class="size-5 shrink-0" />
      <p class="flex-1 text-[14.5px]">Het is na werktijd. Dit bord kan wachten tot {{ relDay(D.nextWorkStart.value.date) }} {{ D.nextWorkStart.value.start }}.</p>
    </div>

    <!-- In één oogopslag -->
    <div class="card mb-3 grid grid-cols-2 divide-line md:grid-cols-4 md:divide-x" data-enter>
      <div class="flex items-baseline gap-2 px-4 py-3"><span class="num text-[24px] leading-none">{{ A.open.value.length }}</span><span class="text-[13.5px] text-muted">open</span></div>
      <div class="flex items-baseline gap-2 px-4 py-3" :class="A.overWip.value ? 'text-copper-ink' : ''"><span class="num text-[24px] leading-none">{{ A.doing.value.length }}<span class="text-[15px] opacity-70">/{{ A.wip.value }}</span></span><span class="text-[13.5px]" :class="A.overWip.value ? '' : 'text-muted'">tegelijk bezig</span></div>
      <div class="flex items-baseline gap-2 px-4 py-3" :class="waitingLong.length ? 'text-copper-ink' : ''"><span class="num text-[24px] leading-none">{{ waitingLong.length }}</span><span class="text-[13.5px]" :class="waitingLong.length ? '' : 'text-muted'">wacht te lang</span></div>
      <div class="flex items-baseline gap-2 px-4 py-3"><span class="num text-[24px] leading-none">{{ dueSoon.length }}</span><span class="text-[13.5px] text-muted">deadline deze week</span></div>
    </div>

    <!-- Stuurman -->
    <div v-if="suggestion" :key="suggestion.id" class="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2.5 rounded-[18px] p-3 pl-3.5 text-cat-ink" :class="TONES[suggestion.tone].fill" data-enter>
      <span class="grid size-10 shrink-0 place-items-center rounded-[12px] bg-white/55"><Icon :name="suggestion.icon" class="size-5" /></span>
      <div class="min-w-0 flex-1 basis-[240px]">
        <p class="flex items-center gap-1 text-[12.5px] text-cat-ink-muted"><Icon name="tabler:steering-wheel" class="size-3.5" />{{ AI_NAME }} · {{ suggestion.title }}</p>
        <p class="text-[15px] leading-snug">{{ suggestion.text }}</p>
      </div>
      <div class="flex gap-1.5">
        <button type="button" class="min-h-11 rounded-full bg-cat-ink px-4 text-[14px] text-white" @click="S.accept(suggestion)">{{ suggestion.acceptLabel }}</button>
        <button type="button" class="min-h-11 rounded-full px-3 text-[14px] hover:bg-white/40" @click="S.dismiss(suggestion)">Nu niet</button>
      </div>
    </div>

    <!-- Klaar: uren loggen -->
    <div v-if="finishedItem && finished" class="mb-4 flex flex-wrap items-center gap-3 rounded-[18px] bg-cat-focus p-4 text-cat-ink" role="status">
      <span class="grid size-10 shrink-0 place-items-center rounded-full bg-white/60"><Icon name="tabler:check" class="size-5" /></span>
      <div class="min-w-0 flex-1">
        <p class="text-[15.5px]">{{ finishedItem.title }} is klaar.</p>
        <p class="text-[13.5px] text-cat-ink-muted">Hoeveel uur zet je erop?</p>
      </div>
      <div class="flex items-center gap-1.5">
        <button type="button" class="grid size-11 place-items-center rounded-full bg-white/60" aria-label="Halfuur minder" @click="finished.hours = Math.max(0.5, finished.hours - 0.5)"><Icon name="tabler:minus" class="size-4" /></button>
        <span class="num w-14 text-center text-[18px]">{{ dec1(finished.hours).replace(',0', '') }} u</span>
        <button type="button" class="grid size-11 place-items-center rounded-full bg-white/60" aria-label="Halfuur meer" @click="finished.hours += 0.5"><Icon name="tabler:plus" class="size-4" /></button>
      </div>
      <div class="flex gap-2">
        <button type="button" class="min-h-11 rounded-full bg-cat-ink px-4 text-[14px] text-white" @click="logFinished">Uren loggen</button>
        <button type="button" class="min-h-11 rounded-full px-3 text-[14px]" @click="finished = null">Niet nu</button>
      </div>
    </div>

    <!-- Filter op klant -->
    <div class="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0" data-enter>
      <button type="button" class="min-h-10 shrink-0 rounded-full border px-3.5 text-[14px]" :class="!A.clientFilter.value ? 'border-transparent bg-primary text-on-primary' : 'border-line-strong'" :aria-pressed="!A.clientFilter.value" @click="A.clientFilter.value = null">Alle klanten</button>
      <button v-for="c in A.clientsOnBoard.value" :key="c.id" type="button" class="flex min-h-10 shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-3.5 text-[14px]" :class="A.clientFilter.value === c.id ? 'border-transparent bg-primary text-on-primary' : 'border-line-strong'" :aria-pressed="A.clientFilter.value === c.id" @click="A.clientFilter.value = A.clientFilter.value === c.id ? null : c.id">
        <UiAvatar :name="c.name" :tint="c.tint" :size="28" />{{ c.name }}
      </button>
    </div>

    <!-- Mobiel: kolommen als tabs -->
    <div class="mb-2 flex gap-1.5 overflow-x-auto md:hidden" role="tablist" aria-label="Kolommen">
      <button v-for="(c, i) in A.columns.value" :key="c.name" type="button" role="tab" class="flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13.5px]" :class="active === i ? NOTION_FILL[c.color].fill : 'text-muted'" :aria-selected="active === i" @click="showColumn(i)">
        {{ c.name }}<span class="num opacity-75">{{ A.inColumn(c.name).length }}</span>
      </button>
    </div>
    <p class="mb-2 text-[13px] text-muted md:hidden">Houd een kaart vast om hem te verslepen.</p>

    <!-- Het bord -->
    <div
      ref="board"
      class="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0"
      :class="drag.id ? '' : 'snap-x snap-mandatory md:snap-none'"
      aria-label="Opdrachtenbord"
      data-enter
      @scroll.passive="onScroll"
    >
      <section
        v-for="c in A.columns.value"
        :key="c.name"
        :data-column="c.name"
        class="flex w-[calc(100vw-48px)] shrink-0 snap-start flex-col rounded-[20px] p-2 transition-colors md:w-[272px]"
        :class="drag.id && drag.over === c.name ? 'bg-surface-3' : 'bg-surface-2'"
        :aria-label="`${c.name}, ${A.inColumn(c.name).length} opdrachten`"
      >
        <header class="flex items-center gap-2 px-1.5 pb-2 pt-1">
          <span class="chip !py-1.5 !text-[13.5px]" :class="NOTION_FILL[c.color].fill">{{ c.name }}</span>
          <span class="num text-[14px]" :class="c.wip && A.inColumn(c.name).length > c.wip && !A.clientFilter.value ? 'text-copper-ink' : 'text-muted'">
            {{ A.inColumn(c.name).length }}<template v-if="c.wip"> / {{ c.wip }}</template>
          </span>
          <button v-if="c.kind !== 'done'" type="button" class="icon-btn ml-auto !size-10 text-muted" :aria-label="`Nieuwe opdracht in ${c.name}`" @click="editor.open({ kind: 'opdracht', prefill: { status: c.name, clientId: A.clientFilter.value ?? '' } })"><Icon name="tabler:plus" class="size-[18px]" /></button>
        </header>

        <ul class="flex min-h-24 flex-1 flex-col gap-2">
          <template v-for="(a, i) in cards(c.name)" :key="a.id">
            <li v-if="drag.id && drag.over === c.name && drag.index === cards(c.name).filter(x => x.id !== drag.id).indexOf(a)" class="h-1 rounded-full bg-ink/60" aria-hidden="true" />
            <li :data-card="a.id" :class="drag.id === a.id ? 'opacity-35' : ''">
              <button
                type="button"
                class="block w-full touch-manipulation select-none rounded-[16px] [-webkit-touch-callout:none] md:cursor-grab"
                :aria-label="`${a.title}, ${clients.byId(a.clientId)?.name ?? 'geen klant'}. Openen om te bewerken of te verplaatsen.`"
                @pointerdown="down($event, a)"
                @click="openCard(a)"
                @contextmenu.prevent
              >
                <AssignmentCard :a="a" :compact="c.kind === 'done'" />
              </button>
            </li>
          </template>
          <li v-if="drag.id && drag.over === c.name && drag.index >= cards(c.name).filter(x => x.id !== drag.id).length" class="h-1 rounded-full bg-ink/60" aria-hidden="true" />
          <li v-if="!A.inColumn(c.name).length && !drag.id" class="grid h-24 place-items-center rounded-[16px] border border-dashed border-line-strong p-4 text-center text-[13.5px] text-muted">
            {{ c.kind === 'waiting' ? 'Je wacht nergens op.' : c.kind === 'done' ? 'Nog niets afgerond.' : 'Leeg.' }}
          </li>
        </ul>
        <button v-if="c.kind === 'done' && A.inColumn(c.name).length > 4" type="button" class="mt-2 min-h-10 rounded-full text-[13.5px] text-muted hover:bg-surface-3" @click="showAllDone = !showAllDone">
          {{ showAllDone ? 'Minder tonen' : `Alle ${A.inColumn(c.name).length} tonen` }}
        </button>
      </section>
    </div>

    <!-- De kaart die je vasthoudt -->
    <Teleport to="body">
      <div
        v-if="dragged"
        class="pointer-events-none fixed left-0 top-0 z-[95]"
        :style="{ width: `${drag.w}px`, transform: `translate3d(${drag.x - drag.ox}px, ${drag.y - drag.oy}px, 0) rotate(1.5deg)` }"
        aria-hidden="true"
      >
        <AssignmentCard :a="dragged" ghost />
      </div>
    </Teleport>
  </div>
</template>
