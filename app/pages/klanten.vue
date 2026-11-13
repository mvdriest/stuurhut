<script setup lang="ts">
import type { ClientStatus } from '~/types'

useHead({ title: 'Klanten · Stuurhut' })
const root = ref<HTMLElement | null>(null)
const { enter } = useMotion(root)

const route = useRoute()
const router = useRouter()
const clients = useClients()
const finance = useFinance()
const tasks = useTasks()
const cal = useCalendar()
const opps = useOpportunities()
const toast = useToast()
const isLg = useMediaQuery('(min-width: 1024px)')
const editor = useEditor()
function newClient() {
  editor.open({ kind: 'klant' }, id => select(id))
}

const q = ref('')
const status = ref<ClientStatus | 'alle'>('alle')
const list = computed(() => clients.search(q.value, status.value))
const STATUS: (ClientStatus | 'alle')[] = ['alle', 'lead', 'lopend', 'afgerond']

const selectedId = computed(() => (route.query.id as string) || (isLg.value ? list.value[0]?.id : undefined))
const client = computed(() => clients.byId(selectedId.value))
const A = useAssignments()
const clientAssignments = computed(() => A.open.value.filter(a => a.clientId === client.value?.id))
function select(id: string) {
  router.replace({ query: { id } })
  nextTick(() => enter('[data-detail]', { stagger: 0.04 }))
  if (!isLg.value) window.scrollTo({ top: 0 })
}
function back() {
  router.replace({ query: {} })
}

const statusClass = (s: ClientStatus) => ({ lead: 'bg-copper-soft text-copper-ink', lopend: 'bg-sea-soft text-sea-ink', afgerond: 'bg-green-soft text-green' })[s]
const kindIcon = { mail: 'tabler:mail', meeting: 'tabler:messages', notitie: 'tabler:note' }
const kindLabel = { mail: 'Mail', meeting: 'Meeting', notitie: 'Notitie' }

const nextTask = computed(() => client.value ? tasks.tasks.value.find(t => t.clientId === client.value!.id && t.title === client.value!.nextStep && !t.done) : undefined)
function planNext() {
  const c = client.value
  if (!c) return
  const t = nextTask.value ?? tasks.add({ title: c.nextStep, durationMin: c.nextStepDurationMin, kind: 'taak', clientId: c.id })
  const slot = cal.findSlot(t.durationMin, { excludeTaskId: t.id })
  if (!slot) return toast.push({ text: 'Ik vond geen plek deze week.' })
  tasks.schedule(t.id, slot.date, slot.start)
  toast.push({ text: `Volgende stap staat ${relDay(slot.date)} om ${slot.start}.`, to: '/week', toLabel: 'Bekijk' })
}
const pattern = computed(() => opps.opportunities.value.find(o => o.featured && client.value && o.sourceClientIds?.includes(client.value.id)))
const openCommitments = computed(() => client.value?.commitments.filter(c => !c.done).length ?? 0)
</script>

<template>
  <div ref="root">
    <PageHeader title="Klanten" sub="Wie er speelt, wat je hebt toegezegd en wat er nog openstaat.">
      <template #actions>
        <button type="button" class="btn-primary" @click="newClient"><Icon name="tabler:plus" class="size-4" />Nieuwe klant</button>
      </template>
    </PageHeader>

    <div class="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <!-- Lijst -->
      <section v-show="isLg || !route.query.id" class="space-y-3" aria-label="Klantenlijst" data-enter>
        <label class="card flex min-h-14 items-center gap-2 px-4">
          <Icon name="tabler:search" class="size-5 text-muted" />
          <span class="sr-only">Zoek een klant</span>
          <input v-model="q" type="search" placeholder="Zoek op naam, contact of project" class="min-w-0 flex-1 bg-transparent py-3 text-[16px] outline-none placeholder:text-muted">
        </label>
        <div class="flex gap-1.5 overflow-x-auto no-scrollbar" role="group" aria-label="Filter op status">
          <button v-for="s in STATUS" :key="s" type="button" class="min-h-10 rounded-full px-3.5 text-[14px] font-semibold capitalize transition-colors" :class="status === s ? 'bg-focus text-on-focus' : 'bg-surface border border-line text-ink'" :aria-pressed="status === s" @click="status = s">{{ s }}</button>
        </div>
        <ul class="card divide-y divide-line overflow-hidden p-1.5">
          <li v-for="c in list" :key="c.id">
            <button type="button" class="flex w-full items-center gap-3 rounded-[14px] p-3 text-left transition-colors" :class="selectedId === c.id ? 'bg-surface-2' : 'hover:bg-surface-2/60'" @click="select(c.id)">
              <UiAvatar :name="c.name" :tint="c.tint" :size="44" />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[15.5px] font-semibold">{{ c.name }}</span>
                <span class="block truncate text-[13px] text-muted">{{ clients.projectsFor(c.id)[0]?.name ?? c.sector }}</span>
              </span>
              <span class="chip" :class="statusClass(c.status)">{{ c.status }}</span>
            </button>
          </li>
          <li v-if="!list.length" class="p-5 text-[14.5px] text-muted">Geen klant gevonden met "{{ q }}".</li>
        </ul>
      </section>

      <!-- Detail -->
      <section v-if="client" class="min-w-0 space-y-4" :aria-label="client.name">
        <button v-if="!isLg" type="button" class="btn-ghost -ml-3" @click="back">
          <Icon name="tabler:chevron-left" class="size-5" /> Alle klanten
        </button>

        <div class="card p-5 md:p-6" data-enter data-detail>
          <div class="flex items-center gap-4">
            <UiAvatar :name="client.name" :tint="client.tint" :size="60" />
            <div class="min-w-0 flex-1">
              <h2 class="text-[24px] font-semibold leading-tight tracking-[-0.01em]">{{ client.name }}</h2>
              <p class="text-[14px] text-muted">{{ [client.contact, client.sector].filter(Boolean).join(' · ') || 'Nog geen contactpersoon' }}</p>
            </div>
            <span class="chip" :class="statusClass(client.status)">{{ client.status }}</span>
            <button type="button" class="icon-btn -mr-2 shrink-0" :aria-label="`${client.name} bewerken`" title="Bewerken" @click="editor.open({ kind: 'klant', id: client.id })"><Icon name="tabler:pencil" class="size-[18px]" /></button>
          </div>
          <div class="mt-4 space-y-3">
            <ProjectCard v-for="p in clients.projectsFor(client.id)" :key="p.id" :project="p" />
          </div>
        </div>

        <div v-if="clientAssignments.length" class="card p-5 md:p-6" data-enter data-detail>
          <div class="flex items-center justify-between">
            <p class="label">Opdrachten</p>
            <NuxtLink :to="`/opdrachten?klant=${client.id}`" class="inline-flex min-h-8 items-center text-[13.5px] font-semibold text-sea-ink" @click="A.clientFilter.value = client.id">Naar het bord</NuxtLink>
          </div>
          <ul class="mt-3 space-y-1.5">
            <li v-for="a in clientAssignments" :key="a.id">
              <button type="button" class="flex min-h-12 w-full items-center gap-3 rounded-[14px] bg-surface-2 px-3.5 py-2 text-left" @click="editor.open({ kind: 'opdracht', id: a.id })">
                <span class="chip shrink-0" :class="NOTION_FILL[A.column(a.status)?.color ?? 'gray'].fill">{{ a.status }}</span>
                <span class="min-w-0 flex-1 truncate text-[14.5px]">{{ a.title }}</span>
                <span v-if="A.kindOf(a) === 'waiting'" class="shrink-0 text-[13px]" :class="A.waitingDays(a) >= 5 ? 'text-copper-ink' : 'text-muted'">{{ A.waitingDays(a) }} dagen</span>
                <span v-else-if="a.due" class="shrink-0 text-[13px]" :class="(A.dueDays(a) ?? 9) <= 3 ? 'text-copper-ink' : 'text-muted'">{{ relDay(a.due) }}</span>
              </button>
            </li>
          </ul>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div class="card-focus p-5 md:p-6" data-enter data-detail>
            <p class="text-[13px] font-semibold text-on-focus-muted">Volgende stap</p>
            <p class="lead mt-2 text-[22px] leading-snug">{{ client.nextStep }}</p>
            <p class="mt-1 text-[13.5px] text-on-focus-muted">{{ duration(client.nextStepDurationMin) }}</p>
            <p v-if="nextTask?.date" class="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-[14px]"><Icon name="tabler:check" class="size-4" />Staat {{ relDay(nextTask.date) }} om {{ nextTask.start }}</p>
            <button v-else type="button" class="btn-primary mt-4 !bg-on-focus !text-focus" @click="planNext">Plan in <Icon name="tabler:arrow-right" class="size-4" /></button>
          </div>

          <div class="card p-5 md:p-6" data-enter data-detail>
            <div class="flex items-center justify-between">
              <p class="label">Financieel</p>
              <NuxtLink to="/financien" class="text-[13.5px] font-semibold text-sea-ink min-h-8 inline-flex items-center">Financiën</NuxtLink>
            </div>
            <p class="num mt-2 text-[30px] font-semibold tracking-[-0.02em]">{{ euro(finance.revenueFor(client.id)) }}</p>
            <p class="text-[13px] text-muted">omzet afgelopen zes maanden</p>
            <ul class="mt-3 space-y-2">
              <li v-for="inv in finance.invoicesFor(client.id)" :key="inv.id" class="flex items-center justify-between gap-2 rounded-[16px] bg-surface-2 px-3.5 py-2.5">
                <span class="text-[14px]"><span class="font-semibold">{{ inv.number }}</span> <span class="text-muted">· {{ inv.daysLate ? `${inv.daysLate} dagen te laat` : `nog ${inv.daysLeft} dagen` }}</span></span>
                <span class="num text-[14.5px] font-semibold" :class="inv.daysLate ? 'text-copper-ink' : ''">{{ euro(inv.amount) }}</span>
              </li>
              <li v-if="!finance.invoicesFor(client.id).length" class="text-[14px] text-muted">Niets openstaand.</li>
            </ul>
          </div>
        </div>

        <div class="card p-5 md:p-6" data-enter data-detail>
          <QuotesCard :client-id="client.id" />
        </div>

        <NuxtLink v-if="pattern" :to="`/kansen?focus=${pattern.id}`" class="card flex items-center gap-4 p-4 md:p-5 hover:bg-surface-2" data-enter data-detail>
          <span class="grid size-11 shrink-0 place-items-center rounded-full bg-green-soft text-green"><Icon name="tabler:bulb" class="size-5" /></span>
          <span class="min-w-0 flex-1">
            <span class="block text-[15px] font-semibold">Kwam terug in drie gesprekken</span>
            <span class="block text-[13.5px] text-muted">{{ pattern.title }}</span>
          </span>
          <Icon name="tabler:arrow-up-right" class="size-5 text-muted" />
        </NuxtLink>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div class="card p-5 md:col-span-2" data-enter data-detail>
            <div class="mb-3 flex items-center justify-between">
              <p class="label">Toegezegd</p>
              <span class="num text-[13px] text-muted">{{ openCommitments }} open</span>
            </div>
            <p v-if="!client.commitments.length" class="text-[14px] text-muted">Nog niets toegezegd.</p>
            <ul class="space-y-1">
              <li v-for="c in client.commitments" :key="c.id">
                <button type="button" class="flex w-full items-start gap-2.5 rounded-[14px] py-2 text-left" :aria-pressed="c.done" @click="clients.toggleCommitment(client.id, c.id)">
                  <span class="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2" :class="c.done ? 'border-green bg-green text-surface' : 'border-ui-border'"><Icon v-if="c.done" name="tabler:check" class="size-3.5" /></span>
                  <span class="text-[14.5px] leading-snug" :class="c.done ? 'text-muted line-through decoration-1' : ''">{{ c.text }}</span>
                </button>
              </li>
            </ul>
          </div>

          <div class="card p-5 md:col-span-3" data-enter data-detail>
            <p class="label mb-3">Tijdlijn</p>
            <ol class="relative space-y-4 before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-px before:bg-line">
              <li v-for="t in client.timeline" :key="t.id" class="relative flex gap-3">
                <span class="z-[1] grid size-9 shrink-0 place-items-center rounded-full" :class="{ mail: 'bg-sea-soft text-sea-ink', meeting: 'bg-copper-soft text-copper-ink', notitie: 'bg-surface-3 text-ink' }[t.kind]">
                  <Icon :name="kindIcon[t.kind]" class="size-[17px]" />
                </span>
                <div class="min-w-0 flex-1 pt-0.5">
                  <p class="text-[12.5px] text-muted">{{ kindLabel[t.kind] }} · {{ cap(relDay(t.date)) }}</p>
                  <p class="text-[15px] font-semibold leading-snug">{{ t.title }}</p>
                  <p v-if="t.body" class="mt-0.5 line-clamp-2 text-[14px] leading-snug text-muted" :title="t.body">{{ t.body }}</p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
