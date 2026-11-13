<script setup lang="ts">
import type { Task } from '~/types'
import { greeting } from '~/utils/stuurman.mock'
import { CATEGORIES, categoryOf, categoryOfTask } from '~/utils/category'

useHead({ title: 'Thuisbasis · Stuurhut' })
const root = ref<HTMLElement | null>(null)
useMotion(root)

const today = todayISO()
const tasks = useTasks()
const cal = useCalendar()
const clients = useClients()
const finance = useFinance()
const inbox = useInbox()
const stuurman = useStuurman()
const R = useRoutines()
const { goals } = useGoals()
const toast = useToast()
const D = useDomain()
const Sl = useSleep()
const rituals = useRituals()
const work = useWork()
const L = useLife()
const MOMENTS = computed(() => [
  { key: 'dagstart', to: '/dagstart', label: 'Dagstart', icon: 'tabler:sun', done: !!rituals.started.value, time: '2 min' },
  { key: 'afsluiten', to: '/afsluiten', label: 'Dag afsluiten', icon: 'tabler:moon', done: !!rituals.ended.value, time: '2 min' },
  { key: 'weekreview', to: '/weekreview', label: 'Weekreview', icon: 'tabler:calendar-week', done: !!rituals.reviewed.value, time: '5 min' },
] as const)
const show = (i: { type: 'event' | 'task', ref: any }) => D.matches(domainOf(i))

const now = ref(nowMin())
useIntervalFn(() => { now.value = nowMin() }, 60_000)

// ---------- Vandaag ----------
const dayItems = computed(() => cal.dayItems(today).filter(show))
const todayTasks = computed(() => tasks.tasks.value.filter(t => t.date === today && D.matches(domainOfTask(t))))
const doneCount = computed(() => todayTasks.value.filter(t => t.done).length)
const noTime = computed(() => tasks.tasks.value.filter(t => t.important && !t.date && !t.done && D.matches(domainOfTask(t))))
// Wat er zakelijk ligt te wachten tot morgen (voor de avondmodus)
const waiting = computed(() => finance.openInvoices.value.filter(i => i.daysLate > 0).length + (stuurman.gap.value ? 1 : 0) + tasks.tasks.value.filter(t => t.important && !t.done && domainOfTask(t) === 'zakelijk' && (!t.date || t.date === today)).length)
const nowIndex = computed(() => dayItems.value.findIndex(i => toMin(i.end) > now.value))
const nextUp = computed(() => dayItems.value.find(i => toMin(i.start) >= now.value))
const meetings = computed(() => dayItems.value.filter(i => i.type === 'event').length)

function planNow(t: Task, el: EventTarget | null) {
  const slot = cal.findSlot(t.durationMin, { deep: t.deep, domain: domainOfTask(t) })
  if (!slot) return toast.push({ text: 'Ik vond geen plek deze week.' })
  flyTo((el as HTMLElement)?.closest('li'), 'week')
  tasks.schedule(t.id, slot.date, slot.start)
  toast.push({ text: `Ingepland ${relDay(slot.date)} om ${slot.start}.`, to: '/week', toLabel: 'Bekijk' })
}

// ---------- Vraagt aandacht ----------
const attention = computed(() => {
  const list: { id: string, icon: string, title: string, meta: string, to: string, tone: 'copper' | 'plain', action?: () => void, actionLabel?: string }[] = []
  const biz = D.matches('zakelijk')
  for (const inv of biz ? finance.openInvoices.value.filter(i => i.daysLate > 0) : []) {
    list.push({ id: inv.id, icon: 'tabler:receipt', title: `Factuur ${inv.client.name}`, meta: `${inv.daysLate} dagen te laat · ${euroRound(inv.amount)}`, to: '/financien', tone: 'copper', action: inv.reminderPlanned ? undefined : () => remind(inv.id), actionLabel: 'Herinner' })
  }
  const g = stuurman.gap.value
  for (const q of biz ? work.followUps.value : []) {
    const c = clients.byId(q.clientId)
    list.push({ id: q.id, icon: 'tabler:send', title: `Offerte ${c?.name}`, meta: `${work.quoteDays(q)} dagen geen reactie`, to: `/klanten?id=${q.clientId}`, tone: 'plain' })
  }
  for (const l of D.matches('prive') ? L.soon.value.filter(l => L.days(l) <= 14) : []) {
    list.push({ id: l.id, icon: LIFE_CATEGORIES[l.category].icon, title: l.title, meta: L.days(l) <= 0 ? 'Nu regelen' : `Over ${L.days(l)} dagen · privé`, to: '/admin', tone: 'plain' })
  }
  if (g && biz) list.push({ id: 'gap', icon: 'tabler:calendar-event', title: `${cap(weekdayLong(g.date))} ${g.start} vrijgekomen`, meta: `${g.title} is afgezegd`, to: '/week#gat', tone: 'copper' })
  if (inbox.count.value) list.push({ id: 'inbox', icon: 'tabler:inbox', title: `${inbox.count.value} dingen in Hoofd leeg`, meta: 'Nog te ordenen', to: '/hoofd-leeg', tone: 'plain' })
  const los = tasks.unscheduled.value.filter(t => D.matches(domainOfTask(t)))
  if (los.length) list.push({ id: 'los', icon: 'tabler:checkbox', title: `${los.length} taken zonder plek`, meta: 'In Week', to: '/week', tone: 'plain' })
  return list
})
function remind(id: string) {
  const slot = finance.planReminder(id)
  if (slot) toast.push({ text: `Herinnering staat ${relDay(slot.date)} om ${slot.start}.`, to: '/week', toLabel: 'Bekijk' })
}

const suggestion = computed(() => stuurman.forPage('thuis')[0] ?? null)

// ---------- Kerncijfers ----------
const month = finance.thisMonth
const revenueGoal = computed(() => goals.value.find(g => g.id === 'g1'))

// ---------- Routines vandaag ----------
function routineDone(id: string) {
  R.mark(id, true)
  toast.push({ text: 'Genoteerd. Goed bezig.' })
}

// ---------- Deze week ----------
const week = computed(() => cal.days.value.map(d => ({ date: d, load: cal.dayLoad(d), items: cal.dayItems(d).filter(show) })))
const goalGroups = computed(() => (['zakelijk', 'prive'] as const).filter(d => D.matches(d)).map(d => ({ domain: d, list: goals.value.filter(g => g.domain === d) })).filter(g => g.list.length))
const routinesToday = computed(() => R.dueToday.value.filter(r => D.matches(domainOfRoutine(r))))
const tomorrowFirst = computed(() => cal.dayItems(D.nextWorkStart.value.date).find(i => domainOf(i) === 'zakelijk'))
</script>

<template>
  <div ref="root">
    <!-- Welkom -->
    <section class="card-warm p-5 md:p-7" aria-labelledby="welkom" data-enter>
      <div class="mb-3 flex items-center gap-2 md:hidden">
        <AppMark :size="28" />
        <span class="text-[14px]">{{ APP_NAME }}</span>
      </div>
      <div class="mb-3 xl:hidden"><DomainSwitch class="max-w-[340px]" /></div>
      <p class="eyebrow">{{ longDate(today) }}</p>
      <h1 id="welkom" class="mt-1 text-[32px] leading-[1.08] tracking-[-0.02em] md:text-[40px]">{{ greeting() }}, {{ USER_NAME }}</h1>
      <p v-if="!D.evening.value" class="mt-2 max-w-[56ch] text-[16px] text-muted md:text-[17px]">{{ stuurman.line.value }}</p>
      <div v-else-if="!Sl.quiet.value" class="mt-3 flex flex-wrap items-center gap-3 rounded-[14px] bg-cat-prive/70 p-3.5 text-cat-ink">
        <span class="grid size-10 shrink-0 place-items-center rounded-full bg-white/60"><Icon name="tabler:moon" class="size-5" /></span>
        <div class="min-w-0 flex-1">
          <p class="text-[16px]">Je werkdag zit erop.</p>
          <p class="text-[13.5px] text-cat-ink-muted">{{ waiting ? `${waiting} zakelijke dingen wachten tot ${relDay(D.nextWorkStart.value.date)} ${D.nextWorkStart.value.start}.` : 'Er wacht niets zakelijks.' }} Nu is het jouw tijd.</p>
        </div>
        <button type="button" class="min-h-10 rounded-full bg-white/70 px-3.5 text-[13.5px]" @click="D.showAllAnyway.value = true">Toch alles tonen</button>
        <button v-if="D.previewOff.value && !Sl.preview.value" type="button" class="min-h-10 rounded-full px-3.5 text-[13.5px] underline underline-offset-4" @click="D.previewOff.value = false">Voorbeeld uit</button>
      </div>
      <EveningCard v-if="Sl.phase.value !== 'dag' && (D.off.value || Sl.preview.value)" class="mt-3" />

      <nav class="mt-4 flex flex-wrap gap-2" aria-label="Momenten">
        <NuxtLink
          v-for="m in MOMENTS"
          :key="m.key"
          :to="m.to"
          class="flex min-h-11 items-center gap-2 rounded-full py-1 pl-1 pr-4 text-[14.5px] transition-colors"
          :class="rituals.recommended.value === m.key ? 'bg-primary text-on-primary' : 'border border-line bg-surface/85 hover:bg-surface'"
        >
          <span class="grid size-8 place-items-center rounded-full" :class="rituals.recommended.value === m.key ? 'bg-white/15' : m.done ? 'bg-green-bar text-white' : 'bg-surface-2'"><Icon :name="m.done && rituals.recommended.value !== m.key ? 'tabler:check' : m.icon" class="size-4" /></span>
          {{ m.label }}
          <span class="text-[12.5px]" :class="rituals.recommended.value === m.key ? 'opacity-70' : 'text-muted'">{{ m.done ? 'gedaan' : m.time }}</span>
        </NuxtLink>
      </nav>

      <dl class="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        <NuxtLink to="/week" class="rounded-[14px] border border-line bg-surface/85 p-3.5 hover:bg-surface">
          <dt class="flex items-center gap-1.5 text-[13px] text-muted"><Icon name="tabler:users" class="size-4" />Afspraken</dt>
          <dd class="num mt-1 text-[26px] leading-none">{{ meetings }}</dd>
          <dd class="mt-1 truncate text-[12.5px] text-muted">{{ nextUp ? `Volgende ${nextUp.start}` : 'Niets meer vandaag' }}</dd>
        </NuxtLink>
        <a href="#vandaag" class="rounded-[14px] border border-line bg-surface/85 p-3.5 hover:bg-surface">
          <dt class="flex items-center gap-1.5 text-[13px] text-muted"><Icon name="tabler:checkbox" class="size-4" />Taken</dt>
          <dd class="num mt-1 text-[26px] leading-none">{{ doneCount }}<span class="text-[16px] text-muted">/{{ todayTasks.length }}</span></dd>
          <dd class="mt-1 text-[12.5px] text-muted">gedaan vandaag</dd>
        </a>
        <NuxtLink v-if="D.effective.value === 'prive'" to="/week" class="rounded-[14px] border border-line bg-surface/85 p-3.5 hover:bg-surface">
          <dt class="flex items-center gap-1.5 text-[13px] text-muted"><Icon name="tabler:sun" class="size-4" />{{ cap(relDay(D.nextWorkStart.value.date)) }}</dt>
          <dd class="num mt-1 text-[26px] leading-none">{{ D.nextWorkStart.value.start }}</dd>
          <dd class="mt-1 truncate text-[12.5px] text-muted">{{ tomorrowFirst ? `Eerst: ${tomorrowFirst.title}` : 'Werk begint' }}</dd>
        </NuxtLink>
        <NuxtLink v-else to="/financien" class="rounded-[14px] border border-line bg-surface/85 p-3.5 hover:bg-surface">
          <dt class="flex items-center gap-1.5 text-[13px] text-muted"><Icon name="tabler:coin-euro" class="size-4" />Omzet {{ month.name }}</dt>
          <dd class="num mt-1 text-[26px] leading-none">{{ euroRound(month.income) }}</dd>
          <dd v-if="revenueGoal" class="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3"><div class="h-full rounded-full bg-green-bar" :style="{ width: `${revenueGoal.pct * 100}%` }" /></dd>
        </NuxtLink>
        <NuxtLink to="/ritme" class="rounded-[14px] border border-line bg-surface/85 p-3.5 hover:bg-surface">
          <dt class="flex items-center gap-1.5 text-[13px] text-muted"><Icon name="tabler:wave-sine" class="size-4" />Ritme</dt>
          <dd class="num mt-1 text-[26px] leading-none">{{ Math.round(R.score.value.now * 100) }}%</dd>
          <dd class="mt-1 text-[12.5px] text-muted">van wat tot nu toe kon</dd>
        </NuxtLink>
      </dl>
    </section>

    <div class="my-4" data-enter><CaptureBar /></div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <!-- Vandaag -->
      <section id="vandaag" class="card scroll-mt-6 p-5 md:p-6 lg:col-span-7 lg:row-span-2" aria-labelledby="vandaag-t" data-enter>
        <div class="flex items-center justify-between gap-3">
          <h2 id="vandaag-t" class="text-[19px]">Vandaag</h2>
          <NuxtLink to="/week" class="inline-flex min-h-10 items-center gap-1 text-[14px] text-muted hover:text-ink">Week <Icon name="tabler:arrow-right" class="size-4" /></NuxtLink>
        </div>
        <div class="mt-2 flex items-center gap-3">
          <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"><div class="h-full rounded-full bg-ink transition-[width] duration-500" :style="{ width: `${todayTasks.length ? (doneCount / todayTasks.length) * 100 : 0}%` }" /></div>
          <span class="num text-[13px] text-muted">{{ doneCount }} van {{ todayTasks.length }} taken</span>
        </div>

        <ol class="mt-4 space-y-2">
          <template v-for="(i, idx) in dayItems" :key="i.id">
            <li v-if="idx === nowIndex" class="flex items-center gap-2" aria-label="Nu">
              <span class="num w-12 text-[13px] text-copper-ink">{{ fromMin(now) }}</span>
              <span class="size-2 rounded-full bg-copper" /><span class="h-0.5 flex-1 rounded-full bg-copper" />
            </li>
            <li class="flex items-center gap-3" :class="toMin(i.end) <= now ? 'opacity-50' : ''">
              <div class="w-12 shrink-0">
                <p class="num text-[15px] leading-tight">{{ i.start }}</p>
                <p class="num text-[12.5px] text-muted">{{ i.end }}</p>
              </div>
              <div class="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-[14px] px-3 py-2 text-cat-ink" :class="CATEGORIES[categoryOf(i)].fill">
                <button v-if="i.type === 'task'" type="button" class="grid size-9 shrink-0 place-items-center rounded-full" :aria-label="(i.ref as Task).done ? `${i.title} weer open` : `${i.title} afvinken`" :aria-pressed="!!(i.ref as Task).done" @click="tasks.toggleDone(i.id)">
                  <span class="grid size-6 place-items-center rounded-full border-2 border-cat-ink/60" :class="(i.ref as Task).done ? 'bg-cat-ink border-cat-ink text-white' : 'bg-white/50'"><Icon v-if="(i.ref as Task).done" name="tabler:check" class="size-3.5" /></span>
                </button>
                <span v-else class="grid size-9 shrink-0 place-items-center rounded-full bg-white/50"><Icon :name="CATEGORIES[categoryOf(i)].icon" class="size-4" /></span>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-[15.5px]" :class="i.type === 'task' && (i.ref as Task).done ? 'line-through' : ''">{{ i.title }}</p>
                  <p class="truncate text-[13px] text-cat-ink-muted">{{ clients.byId(i.ref.clientId)?.name ?? CATEGORIES[categoryOf(i)].label }}</p>
                </div>
              </div>
            </li>
          </template>
          <li v-if="!dayItems.length" class="rounded-[14px] bg-surface-2 p-5 text-muted">Niets gepland vandaag.</li>
        </ol>

        <div v-if="noTime.length" class="mt-5">
          <p class="mb-2 text-[13px] text-muted">Belangrijk, nog zonder tijd</p>
          <ul class="space-y-2">
            <li v-for="t in noTime" :key="t.id" class="flex items-center gap-3 rounded-[14px] border border-dashed border-ui-border p-2 pl-3">
              <span class="grid size-8 shrink-0 place-items-center rounded-full text-cat-ink" :class="CATEGORIES[categoryOfTask(t)].fill"><Icon :name="CATEGORIES[categoryOfTask(t)].icon" class="size-4" /></span>
              <span class="min-w-0 flex-1"><span class="block truncate text-[15px]">{{ t.title }}</span><span class="text-[12.5px] text-muted">{{ duration(t.durationMin) }}</span></span>
              <button type="button" class="btn-primary !min-h-10 !px-4 !text-[14px]" @click="planNow(t, $event.currentTarget)">Plan in</button>
            </li>
          </ul>
        </div>
      </section>

      <!-- Vraagt aandacht -->
      <section class="card p-5 lg:col-span-5" aria-labelledby="aandacht" data-enter>
        <div class="mb-3 flex items-center justify-between">
          <h2 id="aandacht" class="text-[17px]">Vraagt aandacht</h2>
          <span class="num chip bg-surface-2 text-ink">{{ attention.length }}</span>
        </div>
        <ul class="divide-y divide-line">
          <li v-for="a in attention" :key="a.id" class="flex items-center gap-3 py-2.5">
            <span class="grid size-10 shrink-0 place-items-center rounded-[12px]" :class="a.tone === 'copper' ? 'bg-copper-soft text-copper-ink' : 'bg-surface-2'"><Icon :name="a.icon" class="size-5" /></span>
            <NuxtLink :to="a.to" class="min-w-0 flex-1">
              <span class="block truncate text-[15px]">{{ a.title }}</span>
              <span class="block truncate text-[13px]" :class="a.tone === 'copper' ? 'text-copper-ink' : 'text-muted'">{{ a.meta }}</span>
            </NuxtLink>
            <button v-if="a.action" type="button" class="btn-accent !min-h-10 !px-3.5 !text-[13.5px]" @click="a.action()">{{ a.actionLabel }}</button>
            <NuxtLink v-else :to="a.to" class="icon-btn shrink-0" :aria-label="`Naar ${a.title}`"><Icon name="tabler:arrow-right" class="size-4" /></NuxtLink>
          </li>
          <li v-if="!attention.length" class="py-3 text-[15px] text-muted">Niets dat wacht. Alles loopt.</li>
        </ul>
      </section>

      <!-- Stuurman -->
      <div class="lg:col-span-5" data-enter>
        <StuurmanCard v-if="suggestion" :suggestion="suggestion" variant="focus" />
      </div>

      <!-- Doelen -->
      <section class="card p-5 md:p-6 lg:col-span-7" aria-labelledby="doelen" data-enter>
        <h2 id="doelen" class="mb-4 text-[17px]">Doelen</h2>
        <div v-for="grp in goalGroups" :key="grp.domain" class="mb-5 last:mb-0">
        <p class="mb-3 flex items-center gap-1.5 text-[12.5px] uppercase tracking-[0.06em] text-muted"><span class="size-2 rounded-full" :class="DOMAINS[grp.domain].dot" />{{ DOMAINS[grp.domain].label }}</p>
        <ul class="space-y-4">
          <li v-for="g in grp.list" :key="g.id">
            <NuxtLink :to="g.link" class="block">
              <div class="flex items-baseline justify-between gap-3">
                <p class="min-w-0 truncate text-[15px]">{{ g.title }} <span class="text-[13px] text-muted">· {{ g.period }}</span></p>
                <p class="num shrink-0 text-[15px]">{{ g.value }} <span class="text-muted">/ {{ g.of }}</span></p>
              </div>
              <div v-if="g.kind === 'mijlpaal'" class="mt-2 grid gap-1" :style="{ gridTemplateColumns: `repeat(${g.target}, minmax(0,1fr))` }">
                <div v-for="(st, i) in g.steps" :key="st">
                  <div class="h-2 rounded-full" :class="i < g.current ? 'bg-green-bar' : 'bg-surface-3'" />
                  <p class="mt-1 truncate text-[11.5px]" :class="i < g.current ? 'text-ink' : 'text-muted'">{{ st }}</p>
                </div>
              </div>
              <div v-else class="mt-2 h-2 overflow-hidden rounded-full bg-surface-3">
                <div class="h-full rounded-full" :class="g.kind === 'grens' ? (g.ok ? 'bg-green-bar' : 'bg-copper') : 'bg-green-bar'" :style="{ width: `${g.pct * 100}%` }" />
              </div>
              <p v-if="g.kind === 'grens' && !g.ok" class="mt-1 text-[12.5px] text-copper-ink">{{ Math.round(g.current - g.target) }} uur boven je grens vorige week</p>
            </NuxtLink>
          </li>
        </ul>
        </div>
      </section>

      <!-- Routines vandaag -->
      <section class="card p-5 lg:col-span-5" aria-labelledby="routines" data-enter>
        <div class="mb-2 flex items-center justify-between">
          <h2 id="routines" class="text-[17px]">Routines vandaag</h2>
          <NuxtLink to="/ritme" class="inline-flex min-h-10 items-center gap-1 text-[14px] text-muted hover:text-ink">Ritme <Icon name="tabler:arrow-right" class="size-4" /></NuxtLink>
        </div>
        <ul class="divide-y divide-line">
          <li v-for="rt in routinesToday" :key="rt.id" class="flex items-center gap-3 py-2.5">
            <span class="grid size-10 shrink-0 place-items-center rounded-[12px] bg-surface-2"><Icon :name="rt.icon" class="size-5" /></span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-[15px]">{{ rt.name }}</p>
              <p class="truncate text-[12.5px] text-muted">{{ R.week(rt).done }}/{{ rt.goal }} deze week · {{ rt.cue }}</p>
            </div>
            <button v-if="R.stateOn(rt, today) === 'open'" type="button" class="grid size-11 shrink-0 place-items-center rounded-full border-2 border-ink/70 hover:bg-surface-2" :aria-label="`${rt.name} gedaan`" @click="routineDone(rt.id)"><Icon name="tabler:check" class="size-5" /></button>
            <span v-else class="grid size-11 shrink-0 place-items-center rounded-full" :class="R.stateOn(rt, today) === 'done' ? 'bg-green-bar text-white' : 'bg-copper-soft text-copper-ink'"><Icon :name="R.stateOn(rt, today) === 'done' ? 'tabler:check' : 'tabler:x'" class="size-5" /></span>
          </li>
          <li v-if="!routinesToday.length" class="py-3 text-[15px] text-muted">Vandaag geen routines.</li>
        </ul>
      </section>

      <!-- Deze week -->
      <section class="card p-5 lg:col-span-12" aria-labelledby="dezeweek" data-enter>
        <div class="mb-3 flex items-center justify-between">
          <h2 id="dezeweek" class="text-[17px]">Komende dagen</h2>
          <div class="hidden gap-3 text-[12.5px] text-muted sm:flex">
            <span v-for="c in (['meeting', 'taak', 'focus', 'prive'] as const)" :key="c" class="flex items-center gap-1.5"><span class="size-2.5 rounded-[3px]" :class="CATEGORIES[c].fill" />{{ CATEGORIES[c].label }}</span>
          </div>
        </div>
        <div class="-mx-5 flex gap-2 overflow-x-auto px-5 no-scrollbar md:mx-0 md:grid md:grid-cols-5 md:px-0">
          <NuxtLink v-for="d in week" :key="d.date" to="/week" class="flex min-w-[120px] flex-col rounded-[14px] p-3 transition-colors md:min-w-0" :class="d.date === today ? 'bg-primary text-on-primary' : 'bg-surface-2 hover:bg-surface-3'">
            <div class="flex items-baseline justify-between">
              <span class="text-[13px] capitalize" :class="d.date === today ? 'opacity-75' : 'text-muted'">{{ d.date === today ? 'vandaag' : weekdayLong(d.date) }}</span>
              <span class="num text-[20px] leading-none">{{ dayNum(d.date) }}</span>
            </div>
            <div class="mt-3 flex h-[72px] flex-col gap-1 overflow-hidden">
              <span v-for="i in d.items.slice(0, 6)" :key="i.id" class="w-full shrink-0 rounded-[4px]" :class="CATEGORIES[categoryOf(i)].fill" :style="{ height: `${Math.max(6, Math.min(18, (toMin(i.end) - toMin(i.start)) / 6))}px` }" :title="`${i.start} ${i.title}`" />
            </div>
            <span class="mt-2 flex items-center gap-1.5 text-[12.5px]" :class="d.date === today ? 'opacity-80' : 'text-muted'">
              <span class="size-1.5 rounded-full" :class="{ rustig: 'bg-green-bar', normaal: 'bg-sea', vol: 'bg-copper' }[d.load.level]" />{{ d.load.level }} · {{ d.items.length }}
            </span>
          </NuxtLink>
        </div>
      </section>
    </div>
  </div>
</template>
