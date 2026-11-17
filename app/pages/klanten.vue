<script setup lang="ts">
import type { ClientStatus, LeadStage, LostReason } from '~/types'
import { LEAD_STAGES, LOST_REASONS, STAGE_LABEL } from '~/utils/leads'

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
const stage = ref<LeadStage | null>(null)
const list = computed(() => clients.search(q.value, status.value).filter(c => !stage.value || (c.status === 'lead' && (c.lead?.stage ?? 'gespot') === stage.value)))
watch(status, (s) => { if (s !== 'lead') stage.value = null })

// ---------- Pipeline ----------
const leads = useLeads()
function filterStage(s: LeadStage) {
  const off = stage.value === s
  status.value = off ? 'alle' : 'lead'
  stage.value = off ? null : s
}
const isDue = (c: { status: ClientStatus, lead?: { stage: LeadStage, followUp?: string } }) => c.status === 'lead' && c.lead?.stage !== 'niet nu' && !!c.lead?.followUp && c.lead.followUp <= todayISO()
function planBlock() {
  const slot = leads.planAcquisition()
  if (!slot) return toast.push({ text: 'Ik vond deze week geen 45 minuten meer.' })
  toast.push({ text: `Acquisitieblok staat ${relDay(slot.date)} om ${slot.start}.`, to: '/week', toLabel: 'Bekijk' })
}
function planFollowUp() {
  const c = client.value
  if (!c) return
  const slot = leads.planFollowUp(c)
  if (!slot) return toast.push({ text: 'Ik vond geen plek deze week.' })
  toast.push({ text: `Opvolgen staat ${relDay(slot.date)} om ${slot.start}.`, to: '/week', toLabel: 'Bekijk' })
}
const followUpTask = computed(() => client.value ? tasks.tasks.value.find(t => t.clientId === client.value!.id && t.title === `Opvolgen: ${client.value!.name}` && !t.done && t.date) : undefined)
function winClient() {
  const c = client.value
  if (!c) return
  leads.win(c)
  toast.push({ text: `${c.name} is klant geworden. Dat telt mee voor je doel.` })
}
// ---------- Verloren melden ----------
const losing = ref(false)
const lostReason = ref<LostReason | null>(null)
const lostNote = ref('')
function confirmLost() {
  const c = client.value
  if (!c || !lostReason.value) return
  const wasLead = c.status === 'lead'
  clients.markLost(c.id, lostReason.value, lostNote.value)
  losing.value = false
  lostReason.value = null
  lostNote.value = ''
  toast.push({ text: `${c.name} staat bij verloren. ${wasLead ? 'Goed dat je het meldt: zo zie je waar leads afhaken.' : 'Vervelend. Goed dat je het vastlegt.'}`, undo: () => clients.restore(c.id) })
}
const lostQuarter = computed(() => clients.lostIn(addDays(todayISO(), -90), todayISO()))
const topLostReason = computed(() => {
  const n: Record<string, number> = {}
  for (const c of lostQuarter.value) n[c.lost!.reason] = (n[c.lost!.reason] ?? 0) + 1
  const top = Object.entries(n).sort((a, b) => b[1] - a[1])[0]
  return top && top[1] > 1 ? top[0] : null
})
const leadOpp = computed(() => client.value?.lead?.opportunityId ? opps.byId(client.value.lead.opportunityId) : undefined)
const STATUS: (ClientStatus | 'alle')[] = ['alle', 'lead', 'lopend', 'afgerond', 'verloren']

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

const statusClass = (s: ClientStatus) => ({ lead: 'bg-copper-soft text-copper-ink', lopend: 'bg-sea-soft text-sea-ink', afgerond: 'bg-green-soft text-green', verloren: 'bg-surface-3 text-muted' })[s]
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
// Ander klant gekozen: meldformulier dicht
watch(selectedId, () => { losing.value = false; lostReason.value = null; lostNote.value = '' })
</script>

<template>
  <div ref="root">
    <PageHeader title="Klanten" sub="Wie er speelt, wat je hebt toegezegd en wat er nog openstaat.">
      <template #actions>
        <button type="button" class="btn-primary" @click="newClient"><Icon name="tabler:plus" class="size-4" />Nieuwe klant</button>
      </template>
    </PageHeader>

    <section v-show="isLg || !route.query.id" class="card mb-4 p-4 md:mb-5 md:p-5" aria-label="Pipeline" data-enter>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="label">Pipeline</p>
          <p class="mt-0.5 text-[14px] text-muted">
            {{ leads.active.value.length }} {{ leads.active.value.length === 1 ? 'lead' : 'leads' }} in gesprek of in beeld<template v-if="leads.due.value.length">, <span class="font-semibold text-copper-ink">{{ leads.due.value.length }} wacht{{ leads.due.value.length === 1 ? '' : 'en' }} op opvolging</span></template>.
          </p>
        </div>
        <p v-if="leads.nextBlock.value" class="inline-flex min-h-10 items-center gap-2 rounded-full bg-surface-2 px-4 text-[14px]"><Icon name="tabler:target-arrow" class="size-4 text-sea-ink" />Acquisitie {{ relDay(leads.nextBlock.value.date!) }} om {{ leads.nextBlock.value.start }}</p>
        <button v-else type="button" class="btn-soft !min-h-10 !text-[14px]" @click="planBlock"><Icon name="tabler:target-arrow" class="size-4" />Plan acquisitieblok</button>
      </div>
      <div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button
          v-for="(s, i) in LEAD_STAGES"
          :key="s"
          type="button"
          class="relative rounded-[14px] p-3 text-left transition-colors"
          :class="stage === s ? 'bg-focus text-on-focus' : 'bg-surface-2 hover:bg-surface-3'"
          :aria-pressed="stage === s"
          @click="filterStage(s)"
        >
          <span class="flex items-center justify-between text-[13px] font-semibold" :class="stage === s ? 'text-on-focus-muted' : 'text-muted'">
            {{ STAGE_LABEL[s] }}
            <Icon v-if="i < LEAD_STAGES.length - 1" name="tabler:chevron-right" class="hidden size-4 opacity-50 sm:block" />
          </span>
          <span class="num mt-1 block text-[26px] leading-none">{{ leads.byStage(s).length }}</span>
          <span class="mt-2 flex h-6 -space-x-1.5">
            <UiAvatar v-for="c in leads.byStage(s).slice(0, 4)" :key="c.id" :name="c.name" :tint="c.tint" :size="24" class="ring-2" :class="stage === s ? 'ring-focus' : 'ring-surface-2'" />
          </span>
        </button>
      </div>
      <p v-if="leads.byStage('niet nu').length || lostQuarter.length" class="mt-3 text-[13px] text-muted">
        <template v-if="leads.byStage('niet nu').length">
          <button type="button" class="font-semibold underline underline-offset-2" @click="filterStage('niet nu')">{{ leads.byStage('niet nu').length }} op "niet nu"</button>, bewaard voor later.
        </template>
        <template v-if="lostQuarter.length">
          <button type="button" class="font-semibold underline underline-offset-2" @click="status = 'verloren'">{{ lostQuarter.length }} verloren</button> in de laatste drie maanden<template v-if="topLostReason">, vaakst om "{{ topLostReason }}"</template>.
        </template>
      </p>
    </section>

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
              <span v-if="isDue(c)" class="size-2 shrink-0 rounded-full bg-copper" title="Tijd om op te volgen" />
              <span class="chip" :class="statusClass(c.status)">{{ c.status === 'lead' ? STAGE_LABEL[c.lead?.stage ?? 'gespot'].toLowerCase() : c.status }}</span>
            </button>
          </li>
          <li v-if="!list.length" class="p-5 text-[14.5px] text-muted">{{ q ? `Geen klant gevonden met "${q}".` : 'Hier staat nog niemand.' }}</li>
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
              <p v-if="client.email || client.phone" class="mt-0.5 flex flex-wrap gap-x-3 text-[13.5px]">
                <a v-if="client.email" :href="`mailto:${client.email}`" class="text-sea-ink">{{ client.email }}</a>
                <a v-if="client.phone" :href="`tel:${client.phone.replace(/\s/g, '')}`" class="text-sea-ink">{{ client.phone }}</a>
              </p>
            </div>
            <span class="chip" :class="statusClass(client.status)">{{ client.status }}</span>
            <button v-if="client.status === 'lopend' || client.status === 'afgerond'" type="button" class="icon-btn shrink-0" :aria-label="`${client.name} als verloren melden`" title="Klant verloren" :aria-expanded="losing" @click="losing = !losing"><Icon name="tabler:heart-broken" class="size-[18px]" /></button>
            <button type="button" class="icon-btn -mr-2 shrink-0" :aria-label="`${client.name} bewerken`" title="Bewerken" @click="editor.open({ kind: 'klant', id: client.id })"><Icon name="tabler:pencil" class="size-[18px]" /></button>
          </div>
          <div class="mt-4 space-y-3">
            <ProjectCard v-for="p in clients.projectsFor(client.id)" :key="p.id" :project="p" />
          </div>
          <button type="button" class="btn-ghost mt-2 -ml-3 !text-[14px]" @click="editor.open({ kind: 'akkoord', prefill: { clientId: client.id } })"><Icon name="tabler:file-check" class="size-4" />Akkoord op een offerte vastleggen</button>
        </div>

        <div v-if="client.status === 'verloren' && client.lost" class="card flex flex-wrap items-center gap-3 p-4 md:p-5" data-enter data-detail>
          <span class="grid size-11 shrink-0 place-items-center rounded-full bg-surface-3 text-muted"><Icon name="tabler:heart-broken" class="size-5" /></span>
          <span class="min-w-0 flex-1">
            <span class="block text-[15px] font-semibold">{{ client.lost.from === 'lead' ? 'Lead' : 'Klant' }} verloren {{ relDay(client.lost.date) }}</span>
            <span class="block text-[13.5px] text-muted">{{ cap(client.lost.reason) }}<template v-if="client.lost.note">. {{ client.lost.note }}</template></span>
          </span>
          <button type="button" class="btn-soft !min-h-10 !text-[14px]" @click="clients.restore(client.id); toast.push({ text: `${client.name} is teruggehaald.` })"><Icon name="tabler:history" class="size-4" />Terughalen</button>
        </div>

        <div v-if="losing" class="card p-5 md:p-6" data-detail>
          <p class="text-[17px] font-semibold">{{ client.status === 'lead' ? 'Lead verloren' : 'Klant verloren' }}</p>
          <p class="mt-1 text-[14px] text-muted">Wat was de reden? Na een paar keer zie je een patroon.</p>
          <div class="seg mt-3" role="radiogroup" aria-label="Reden">
            <button v-for="r in LOST_REASONS" :key="r" type="button" role="radio" class="seg-btn" :aria-checked="lostReason === r" :aria-pressed="lostReason === r" @click="lostReason = r">{{ cap(r) }}</button>
          </div>
          <label class="field mt-3"><span class="field-label">Toelichting <span class="text-muted">(mag leeg)</span></span><input v-model="lostNote" class="field-input" placeholder="Bijv. koos voor een groot bureau" @keydown.enter.prevent="confirmLost"></label>
          <div class="mt-4 flex flex-wrap gap-2">
            <button type="button" class="btn-primary" :disabled="!lostReason" :class="!lostReason ? 'opacity-50' : ''" @click="confirmLost">Meld als verloren</button>
            <button type="button" class="btn-ghost" @click="losing = false">Annuleer</button>
          </div>
        </div>

        <div v-if="client.status === 'lead'" class="card p-5 md:p-6" data-enter data-detail>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="label">Lead</p>
            <span v-if="client.lead?.source" class="chip bg-surface-2 text-ink"><Icon name="tabler:route" class="size-3.5" />{{ client.lead.source }}</span>
          </div>
          <div class="mt-3 grid grid-cols-2 gap-1 rounded-[14px] bg-surface-2 p-1 sm:grid-cols-5 sm:rounded-full" role="radiogroup" aria-label="Stap in de pipeline">
            <button
              v-for="s in [...LEAD_STAGES, 'niet nu' as const]"
              :key="s"
              type="button"
              role="radio"
              :aria-checked="(client.lead?.stage ?? 'gespot') === s"
              class="min-h-10 rounded-full px-2 text-[13px] font-semibold transition-colors"
              :class="(client.lead?.stage ?? 'gespot') === s ? 'bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]' : 'text-muted hover:text-ink'"
              @click="leads.setStage(client, s)"
            >{{ STAGE_LABEL[s] }}</button>
          </div>
          <div class="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14.5px]">
            <label class="inline-flex items-center gap-2">
              <Icon name="tabler:bell" class="size-4" :class="isDue(client) ? 'text-copper-ink' : 'text-muted'" />
              <span :class="isDue(client) ? 'font-semibold text-copper-ink' : ''">Opvolgen {{ client.lead?.followUp ? relDay(client.lead.followUp) : 'niet gepland' }}</span>
              <input type="date" class="field-input !min-h-9 !w-auto !py-1 !text-[13.5px]" :value="client.lead?.followUp ?? ''" aria-label="Opvolgdatum" @change="leads.setFollowUp(client, ($event.target as HTMLInputElement).value)">
            </label>
            <NuxtLink v-if="leadOpp" :to="`/kansen?focus=${leadOpp.id}`" class="inline-flex items-center gap-1.5 font-semibold text-sea-ink"><Icon name="tabler:bulb" class="size-4" />{{ leadOpp.title }}</NuxtLink>
          </div>
          <div class="mt-4 flex flex-wrap gap-2">
            <p v-if="followUpTask" class="inline-flex min-h-10 items-center gap-2 rounded-full bg-surface-2 px-4 text-[14px]"><Icon name="tabler:check" class="size-4" />Opvolgen staat {{ relDay(followUpTask.date!) }} om {{ followUpTask.start }}</p>
            <button v-else type="button" class="btn-soft !min-h-10 !text-[14px]" @click="planFollowUp"><Icon name="tabler:calendar-plus" class="size-4" />Opvolging inplannen</button>
            <button type="button" class="btn-ghost !min-h-10 !text-[14px]" @click="winClient"><Icon name="tabler:confetti" class="size-4" />Wordt klant</button>
            <button type="button" class="btn-ghost !min-h-10 !text-[14px] text-muted" :aria-expanded="losing" @click="losing = !losing"><Icon name="tabler:heart-broken" class="size-4" />Verloren</button>
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
          <div v-if="client.status !== 'verloren'" class="card-focus p-5 md:p-6" data-enter data-detail>
            <p class="text-[13px] font-semibold text-on-focus-muted">Volgende stap</p>
            <template v-if="!client.nextStep">
              <p class="lead mt-2 text-[22px] leading-snug">Nog geen volgende stap</p>
              <p class="mt-1 text-[13.5px] text-on-focus-muted">Wat moet er hierna gebeuren?</p>
              <button type="button" class="btn-primary mt-4 !bg-on-focus !text-focus" @click="editor.open({ kind: 'klant', id: client.id })"><Icon name="tabler:pencil" class="size-4" />Stap invullen</button>
            </template>
            <template v-else>
            <p class="lead mt-2 text-[22px] leading-snug">{{ client.nextStep }}</p>
            <p class="mt-1 text-[13.5px] text-on-focus-muted">{{ duration(client.nextStepDurationMin) }}</p>
            <p v-if="nextTask?.date" class="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-[14px]"><Icon name="tabler:check" class="size-4" />Staat {{ relDay(nextTask.date) }} om {{ nextTask.start }}</p>
            <button v-else type="button" class="btn-primary mt-4 !bg-on-focus !text-focus" @click="planNext">Plan in <Icon name="tabler:arrow-right" class="size-4" /></button>
            </template>
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
