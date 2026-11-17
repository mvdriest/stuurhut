<script setup lang="ts">
import type { Client, Destination, InboxItem, NoteKind } from '~/types'
import { parseCreate } from '~/utils/stuurman.mock'
import { NOTE_KINDS } from '~/composables/useNotes'

useHead({ title: 'Hoofd leeg · Stuurhut' })
const root = ref<HTMLElement | null>(null)
useMotion(root)

const route = useRoute()
const router = useRouter()
const inbox = useInbox()
const notes = useNotes()
const clients = useClients()
const toast = useToast()
const picking = ref<string | null>(null)
const pickQuery = ref('')
const fresh = ref<string | null>(null)

const DEST: Record<Destination, { label: string, icon: string, fill: string, nav?: string }> = {
  inplannen: { label: 'Inplannen', icon: 'tabler:calendar-event', fill: 'bg-cat-taak', nav: 'week' },
  opdracht: { label: 'Opdracht', icon: 'tabler:layout-kanban', fill: 'bg-cat-taak', nav: 'opdrachten' },
  admin: { label: 'Levensadmin', icon: 'tabler:clipboard-list', fill: 'bg-cat-taak' },
  klant: { label: 'Bij klant', icon: 'tabler:users', fill: 'bg-cat-meeting', nav: 'klanten' },
  lead: { label: 'Als lead', icon: 'tabler:user-plus', fill: 'bg-cat-meeting', nav: 'klanten' },
  notitie: { label: 'Notitie', icon: 'tabler:note', fill: 'bg-cat-admin' },
  idee: { label: 'Idee', icon: 'tabler:sparkles', fill: 'bg-cat-focus' },
  kans: { label: 'Kans', icon: 'tabler:bulb', fill: 'bg-cat-focus', nav: 'kansen' },
  ooit: { label: 'Ooit', icon: 'tabler:archive', fill: 'bg-surface-3' },
  weg: { label: 'Weggooien', icon: 'tabler:trash', fill: 'bg-surface-3' },
}
const GROUPS: { label: string, items: Destination[] }[] = [
  { label: 'Doen', items: ['inplannen', 'opdracht', 'admin'] },
  { label: 'Mensen', items: ['klant', 'lead'] },
  { label: 'Bewaren', items: ['notitie', 'idee', 'kans', 'ooit'] },
  { label: 'Niets', items: ['weg'] },
]
const EDITOR_DEST: Destination[] = ['opdracht', 'admin', 'lead']

const open = ref<string | null>(null)
const editor = useEditor()
const CREATE_PILL: Record<string, { label: string, icon: string, fill: string }> = Object.fromEntries(CREATE_ITEMS.map(c => [c.kind, { label: `${c.label} aanmaken`, icon: c.icon, fill: c.fill }]))
function createFrom(item: InboxItem, req: NonNullable<ReturnType<typeof parseCreate>>) {
  editor.open(req, () => { inbox.remove(item.id) })
}

const D = useDomain()
const advised = computed(() => inbox.items.value.filter(item => D.matches(inbox.domainFor(item))).map(item => ({ item, a: inbox.advice(item), create: parseCreate(item.text), domain: inbox.domainFor(item) })))
const hidden = computed(() => inbox.count.value - advised.value.length)

function proposal(a: ReturnType<typeof inbox.advice>) {
  switch (a.destination) {
    case 'inplannen': return a.slot ? `${cap(relDay(a.slot.date))} ${a.slot.start}` : 'Deze week'
    case 'klant': return a.client ? `Bij ${a.client.name}` : 'Bij welke klant?'
    case 'opdracht': return a.client ? `Opdracht ${a.client.name}` : 'Opdracht'
    case 'weg': return a.why.startsWith('Staat al') ? 'Staat al gepland' : 'Weg'
    default: return DEST[a.destination].label
  }
}

function go(item: InboxItem, dest: Destination, el: EventTarget | null, clientId?: string) {
  const card = (el as HTMLElement)?.closest('article')
  // Bij klant zonder gekozen klant: altijd zelf kiezen, nooit gokken
  if (dest === 'klant' && !clientId) {
    picking.value = picking.value === item.id ? null : item.id
    pickQuery.value = ''
    open.value = null
    return
  }
  picking.value = null
  open.value = null
  if (dest === 'weg') {
    const undo = inbox.remove(item.id)
    toast.push({ text: 'Weggegooid.', undo })
    return
  }
  if (EDITOR_DEST.includes(dest)) {
    const req = inbox.editorFor(item, dest, clientId)
    if (req) editor.open(req, () => inbox.remove(item.id))
    return
  }
  flyTo(card ?? null, DEST[dest].nav)
  const res = inbox.route(item, dest, clientId)
  toast.push({ text: res.text, to: res.to, toLabel: 'Bekijk' })
}

/** Klantkiezer: wie genoemd wordt eerst, dan lopende klanten en leads, verloren onderaan. */
const ORDER: Record<Client['status'], number> = { lopend: 0, lead: 1, afgerond: 2, verloren: 3 }
function pickList(item: InboxItem) {
  const maybe = inbox.candidates(item)
  const q = pickQuery.value.trim().toLowerCase()
  const rest = clients.clients.value
    .filter(c => !maybe.includes(c))
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.name.localeCompare(b.name))
  const match = (c: Client) => !q || [c.name, c.contact, c.sector].join(' ').toLowerCase().includes(q)
  return { maybe: maybe.filter(match), rest: rest.filter(match) }
}
function pickFirst(item: InboxItem, el: EventTarget | null) {
  const l = pickList(item)
  const c = l.maybe[0] ?? l.rest[0]
  if (c) go(item, 'klant', el, c.id)
}

function ago(iso: string) {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)
  if (h < 1) return 'net'
  if (h < 24) return `${h} uur geleden`
  const d = Math.floor(h / 24)
  return d === 1 ? 'gisteren' : `${d} dagen geleden`
}

function onAdded(id: string) {
  fresh.value = id
  nextTick(() => softAppear(document.getElementById(`item-${id}`)))
}

// ---------- Bewaard ----------
const tab = computed(() => (route.query.bewaard ? 'bewaard' : 'ordenen'))
function setTab(t: 'ordenen' | 'bewaard') {
  router.replace({ query: t === 'bewaard' ? { bewaard: '1' } : {} })
}
const noteFilter = ref<NoteKind | 'alle'>('alle')
const shownNotes = computed(() => notes.notes.value.filter(n => (noteFilter.value === 'alle' || n.kind === noteFilter.value) && D.matches(n.domain ?? 'zakelijk')))
function noteBack(id: string) {
  notes.backToInbox(id)
  toast.push({ text: 'Terug bij te ordenen.' })
}
function noteRemove(id: string) {
  const undo = notes.remove(id)
  toast.push({ text: 'Weggegooid.', undo })
}
function noteToKans(id: string) {
  const o = notes.toOpportunity(id)
  if (o) toast.push({ text: 'Is nu een kans.', to: `/kansen?focus=${o.id}`, toLabel: 'Bekijk' })
}
</script>

<template>
  <div ref="root">
    <PageHeader title="Hoofd leeg" sub="Gooi er alles in. Een taak, een notitie, een idee. Ordenen doe je later.">
      <template #actions><DomainSwitch class="hidden w-[270px] md:grid xl:hidden" /></template>
    </PageHeader>

    <div class="mb-4 flex gap-1.5" role="tablist" aria-label="Weergave" data-enter>
      <button type="button" role="tab" :aria-selected="tab === 'ordenen'" class="min-h-10 rounded-full px-4 text-[14px] font-semibold transition-colors" :class="tab === 'ordenen' ? 'bg-focus text-on-focus' : 'bg-surface border border-line text-ink'" @click="setTab('ordenen')">
        Te ordenen <span class="num ml-1 opacity-70">{{ inbox.count.value }}</span>
      </button>
      <button type="button" role="tab" :aria-selected="tab === 'bewaard'" class="min-h-10 rounded-full px-4 text-[14px] font-semibold transition-colors" :class="tab === 'bewaard' ? 'bg-focus text-on-focus' : 'bg-surface border border-line text-ink'" @click="setTab('bewaard')">
        Bewaard <span class="num ml-1 opacity-70">{{ notes.notes.value.length }}</span>
      </button>
    </div>

    <p v-if="hidden && tab === 'ordenen'" class="-mt-1 mb-4 text-[13.5px] text-muted">{{ hidden }} {{ D.effective.value === 'prive' ? 'zakelijke items' : 'privé-items' }} verborgen. <button type="button" class="underline underline-offset-4" @click="D.set('alle')">Toon alles</button></p>

    <div class="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-12">
      <!-- Te ordenen -->
      <div v-if="tab === 'ordenen'" class="space-y-4 lg:col-span-8">
        <div data-enter>
          <CaptureBar large stay-here placeholder="Wat zit er in je hoofd?" @added="onAdded" />
        </div>

        <TransitionGroup tag="div" class="relative space-y-3" leave-active-class="transition duration-200 ease-in absolute w-full" leave-to-class="opacity-0" move-class="transition-transform duration-300 ease-out">
          <article v-for="{ item, a, create, domain } in advised" :id="`item-${item.id}`" :key="item.id" class="card p-3 pl-4" data-enter>
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div class="min-w-0 flex-1">
                <p class="text-[16.5px] leading-snug text-pretty">{{ item.text }}</p>
                <p class="mt-1 flex items-center gap-2 text-[12.5px] text-muted">
                  <button type="button" class="chip !py-1" :class="DOMAINS[domain].chip" :title="`Wissel naar ${domain === 'prive' ? 'zakelijk' : 'privé'}`" @click="inbox.toggleDomain(item.id)"><span class="size-1.5 rounded-full" :class="DOMAINS[domain].dot" />{{ DOMAINS[domain].label }}</button>
                  {{ fresh === item.id ? 'net' : ago(item.createdAt) }}
                </p>
              </div>
              <div class="flex items-center gap-1.5">
                <!-- Het voorstel van Stuurman is zelf de knop: één tik -->
                <button v-if="create" type="button" class="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-full py-1 pl-1 pr-4 text-[14px] text-cat-ink sm:flex-none" :class="CREATE_PILL[create.kind]!.fill" @click="createFrom(item, create)">
                  <span class="grid size-8 shrink-0 place-items-center rounded-full bg-white/65"><Icon :name="CREATE_PILL[create.kind]!.icon" class="size-4" /></span>
                  <span class="truncate">{{ CREATE_PILL[create.kind]!.label }}</span>
                  <Icon name="tabler:pencil" class="ml-auto size-4 shrink-0" />
                </button>
                <button v-else type="button" class="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-full py-1 pl-1 pr-4 text-[14px] text-cat-ink sm:max-w-[260px] sm:flex-none" :class="DEST[a.destination].fill" :title="a.why" @click="go(item, a.destination, $event.currentTarget, a.clientId)">
                  <span class="grid size-8 shrink-0 place-items-center rounded-full bg-white/65"><Icon :name="DEST[a.destination].icon" class="size-4" /></span>
                  <span class="truncate">{{ proposal(a) }}</span>
                  <Icon :name="a.destination === 'klant' && !a.clientId ? 'tabler:chevron-down' : EDITOR_DEST.includes(a.destination) ? 'tabler:pencil' : 'tabler:check'" class="ml-auto size-4 shrink-0" />
                </button>
                <button type="button" class="icon-btn shrink-0 border border-line" :aria-expanded="open === item.id" aria-label="Andere plek kiezen" @click="open = open === item.id ? null : item.id; picking = null">
                  <Icon name="tabler:dots" class="size-[18px]" />
                </button>
              </div>
            </div>

            <div v-if="open === item.id" class="mt-3 border-t border-line pt-3">
              <p class="mb-3 flex gap-1.5 text-[13.5px] text-muted"><Icon name="tabler:info-circle" class="mt-px size-4 shrink-0" />{{ a.why }}</p>
              <div class="space-y-2.5">
                <div v-for="g in GROUPS" :key="g.label" class="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                  <p class="w-16 shrink-0 text-[12.5px] font-semibold text-muted">{{ g.label }}</p>
                  <div class="flex flex-wrap gap-2">
                    <button
                      v-for="d in g.items"
                      :key="d"
                      type="button"
                      class="flex min-h-11 items-center gap-2 rounded-full py-1 pl-1 pr-3.5 text-[14px] text-cat-ink"
                      :class="[DEST[d].fill, d === a.destination ? 'ring-2 ring-ink/25' : '']"
                      @click="go(item, d, $event.currentTarget)"
                    >
                      <span class="grid size-8 place-items-center rounded-full bg-white/65"><Icon :name="DEST[d].icon" class="size-4" /></span>{{ DEST[d].label }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="picking === item.id" class="mt-3 border-t border-line pt-3">
              <label class="flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-3.5">
                <Icon name="tabler:search" class="size-4 text-muted" />
                <span class="sr-only">Zoek een klant</span>
                <input v-model="pickQuery" type="search" class="min-w-0 flex-1 bg-transparent py-2 text-[15px] outline-none placeholder:text-muted" placeholder="Bij welke klant?" data-autofocus @keydown.enter.prevent="pickFirst(item, $event.currentTarget)">
              </label>
              <template v-for="(group, gi) in [pickList(item).maybe, pickList(item).rest]" :key="gi">
                <p v-if="group.length" class="label mb-2 mt-3">{{ gi === 0 ? 'Genoemd' : (pickList(item).maybe.length ? 'Andere klanten' : 'Klanten') }}</p>
                <div class="flex flex-wrap gap-2">
                  <button v-for="c in group" :key="c.id" type="button" class="flex min-h-11 items-center gap-2 rounded-full border py-1 pl-1 pr-3.5 text-[14px] hover:bg-surface-2" :class="gi === 0 ? 'border-sea bg-sea-soft/40' : 'border-line bg-surface'" @click="go(item, 'klant', $event.currentTarget, c.id)">
                    <UiAvatar :name="c.name" :tint="c.tint" :size="32" /> {{ c.name }}
                    <span v-if="c.status !== 'lopend'" class="text-[12.5px] text-muted">{{ c.status }}</span>
                  </button>
                </div>
              </template>
              <p v-if="!pickList(item).maybe.length && !pickList(item).rest.length" class="mt-3 text-[14px] text-muted">Geen klant met "{{ pickQuery }}". <button type="button" class="font-semibold underline underline-offset-2" @click="go(item, 'lead', $event.currentTarget)">Maak er een lead van</button></p>
            </div>
          </article>
        </TransitionGroup>

        <div v-if="!inbox.count.value" class="card-hero p-8 text-center" data-enter>
          <p class="lead text-[28px] leading-tight">Alles heeft een plek.</p>
          <p class="mt-2 text-[15px] text-muted">Je hoofd is leeg. Even uitademen.</p>
        </div>
      </div>

      <!-- Bewaard -->
      <div v-else class="space-y-4 lg:col-span-8">
        <div class="flex gap-1.5 overflow-x-auto no-scrollbar" role="group" aria-label="Filter bewaard" data-enter>
          <button v-for="k in (['alle', 'notitie', 'idee', 'ooit'] as const)" :key="k" type="button" class="min-h-10 shrink-0 rounded-full px-3.5 text-[14px] font-semibold transition-colors" :class="noteFilter === k ? 'bg-focus text-on-focus' : 'bg-surface border border-line text-ink'" :aria-pressed="noteFilter === k" @click="noteFilter = k">
            {{ k === 'alle' ? 'Alles' : NOTE_KINDS[k].plural }}
            <span class="num ml-0.5 opacity-60">{{ k === 'alle' ? notes.notes.value.length : notes.byKind(k).length }}</span>
          </button>
        </div>
        <TransitionGroup tag="ul" class="relative space-y-3" leave-active-class="transition duration-200 ease-in absolute w-full" leave-to-class="opacity-0" move-class="transition-transform duration-300 ease-out">
          <li v-for="n in shownNotes" :key="n.id" class="card p-4" data-enter>
            <div class="flex items-start gap-3">
              <span class="grid size-9 shrink-0 place-items-center rounded-full text-cat-ink" :class="NOTE_KINDS[n.kind].fill"><Icon :name="NOTE_KINDS[n.kind].icon" class="size-[18px]" /></span>
              <div class="min-w-0 flex-1">
                <p class="text-[16px] leading-snug text-pretty">{{ n.text }}</p>
                <p class="mt-1 flex flex-wrap items-center gap-x-2 text-[12.5px] text-muted">
                  {{ NOTE_KINDS[n.kind].label }} · {{ ago(n.createdAt) }}
                  <NuxtLink v-if="n.clientId && clients.byId(n.clientId)" :to="`/klanten?id=${n.clientId}`" class="font-semibold text-sea-ink">{{ clients.byId(n.clientId)!.name }}</NuxtLink>
                </p>
              </div>
            </div>
            <div class="mt-3 flex flex-wrap gap-1.5 pl-12">
              <button v-if="n.kind === 'idee'" type="button" class="btn-soft !min-h-9 !px-3 !text-[13.5px]" @click="noteToKans(n.id)"><Icon name="tabler:bulb" class="size-4" />Maak er een kans van</button>
              <button v-for="k in (['notitie', 'idee', 'ooit'] as const).filter(k => k !== n.kind)" :key="k" type="button" class="btn-ghost !min-h-9 !px-3 !text-[13.5px]" @click="notes.setKind(n.id, k)">Naar {{ NOTE_KINDS[k].plural.toLowerCase() }}</button>
              <button type="button" class="btn-ghost !min-h-9 !px-3 !text-[13.5px]" @click="noteBack(n.id)"><Icon name="tabler:arrow-back-up" class="size-4" />Toch ordenen</button>
              <button type="button" class="btn-ghost !min-h-9 !px-3 !text-[13.5px] text-muted" :aria-label="`Weggooien: ${n.text}`" @click="noteRemove(n.id)"><Icon name="tabler:trash" class="size-4" /></button>
            </div>
          </li>
        </TransitionGroup>
        <div v-if="!shownNotes.length" class="card p-8 text-center text-[15px] text-muted" data-enter>
          Hier staat nog niets. Kies bij een item in Te ordenen voor Notitie, Idee of Ooit.
        </div>
      </div>

      <!-- Zijkolom -->
      <aside class="hidden space-y-4 lg:col-span-4 lg:block">
        <section class="card-focus p-6" data-enter>
          <p class="text-[13px] font-semibold text-on-focus-muted">Nog te ordenen</p>
          <UiCountUp :value="inbox.count.value" class="mt-1 block text-[80px] font-semibold leading-none tracking-[-0.04em]" />
          <p class="mt-3 text-[14.5px] text-on-focus-muted">{{ inbox.count.value ? 'Geen haast. Orden als je er zin in hebt.' : 'Alles staat waar het hoort.' }}</p>
        </section>
        <section class="card p-5" data-enter>
          <h2 class="label mb-3">Waar het heen kan</h2>
          <div class="space-y-3">
            <div v-for="g in GROUPS" :key="g.label">
              <p class="mb-1.5 text-[12.5px] font-semibold text-muted">{{ g.label }}</p>
              <ul class="flex flex-wrap gap-1.5">
                <li v-for="d in g.items" :key="d" class="inline-flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-[13.5px] text-cat-ink" :class="DEST[d].fill">
                  <span class="grid size-6 place-items-center rounded-full bg-white/65"><Icon :name="DEST[d].icon" class="size-3.5" /></span>{{ DEST[d].label }}
                </li>
              </ul>
            </div>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>
