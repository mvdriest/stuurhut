<script setup lang="ts">
import type { Destination, InboxItem } from '~/types'
import { parseCreate } from '~/utils/stuurman.mock'

useHead({ title: 'Hoofd leeg · Stuurhut' })
const root = ref<HTMLElement | null>(null)
useMotion(root)

const inbox = useInbox()
const clients = useClients()
const toast = useToast()
const picking = ref<string | null>(null)
const fresh = ref<string | null>(null)

const DEST: Record<Destination, { label: string, icon: string, fill: string, nav?: string }> = {
  inplannen: { label: 'Inplannen', icon: 'tabler:calendar-event', fill: 'bg-cat-taak', nav: 'week' },
  klant: { label: 'Bij klant', icon: 'tabler:users', fill: 'bg-cat-meeting', nav: 'klanten' },
  kans: { label: 'Als kans', icon: 'tabler:bulb', fill: 'bg-cat-focus', nav: 'kansen' },
  weg: { label: 'Weggooien', icon: 'tabler:trash', fill: 'bg-surface-3' },
}
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
    case 'klant': return a.client?.name ?? 'Bij klant'
    case 'kans': return 'Kans'
    default: return a.why.startsWith('Staat al') ? 'Staat al gepland' : 'Weg'
  }
}

function go(item: InboxItem, dest: Destination, el: EventTarget | null, clientId?: string) {
  const card = (el as HTMLElement)?.closest('article')
  if (dest === 'klant' && !clientId && !inbox.advice(item).clientId) {
    picking.value = picking.value === item.id ? null : item.id
    return
  }
  picking.value = null
  if (dest === 'weg') {
    const undo = inbox.remove(item.id)
    toast.push({ text: 'Weggegooid.', undo })
    return
  }
  flyTo(card ?? null, DEST[dest].nav)
  const res = inbox.route(item, dest, clientId)
  toast.push({ text: res.text, to: res.to, toLabel: 'Bekijk' })
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
</script>

<template>
  <div ref="root">
    <PageHeader title="Hoofd leeg" sub="Gooi het erin. Tik op het voorstel om het een plek te geven.">
      <template #actions><DomainSwitch class="hidden w-[270px] md:grid xl:hidden" /></template>
    </PageHeader>
    <p v-if="hidden" class="-mt-2 mb-4 text-[13.5px] text-muted">{{ hidden }} {{ D.effective.value === 'prive' ? 'zakelijke items' : 'privé-items' }} verborgen. <button type="button" class="underline underline-offset-4" @click="D.set('alle')">Toon alles</button></p>

    <div class="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-12">
      <div class="space-y-4 lg:col-span-8">
        <div data-enter>
          <CaptureBar large stay-here placeholder="Wat zit er in je hoofd?" @added="onAdded" />
        </div>

        <!-- Teller op mobiel -->
        <div class="flex items-center justify-between px-1 lg:hidden" data-enter>
          <p class="text-[15px]"><span class="num font-semibold">{{ inbox.count.value }}</span> <span class="text-muted">nog te ordenen</span></p>
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
                <button v-else type="button" class="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-full py-1 pl-1 pr-4 text-[14px] text-cat-ink sm:flex-none" :class="DEST[a.destination].fill" :title="a.why" @click="go(item, a.destination, $event.currentTarget, a.clientId)">
                  <span class="grid size-8 shrink-0 place-items-center rounded-full bg-white/65"><Icon :name="DEST[a.destination].icon" class="size-4" /></span>
                  <span class="truncate">{{ proposal(a) }}</span>
                  <Icon name="tabler:check" class="ml-auto size-4 shrink-0" />
                </button>
                <button type="button" class="icon-btn shrink-0 border border-line" :aria-expanded="open === item.id" aria-label="Andere plek kiezen" @click="open = open === item.id ? null : item.id">
                  <Icon name="tabler:dots" class="size-[18px]" />
                </button>
              </div>
            </div>

            <div v-if="open === item.id" class="mt-3 border-t border-line pt-3">
              <p class="mb-2 flex gap-1.5 text-[13.5px] text-muted"><Icon name="tabler:info-circle" class="mt-px size-4 shrink-0" />{{ a.why }}</p>
              <div class="flex flex-wrap gap-2">
                <button v-for="d in (Object.keys(DEST) as Destination[]).filter(d => d !== a.destination)" :key="d" type="button" class="flex min-h-11 items-center gap-2 rounded-full py-1 pl-1 pr-3.5 text-[14px] text-cat-ink" :class="DEST[d].fill" @click="go(item, d, $event.currentTarget)">
                  <span class="grid size-8 place-items-center rounded-full bg-white/65"><Icon :name="DEST[d].icon" class="size-4" /></span>{{ DEST[d].label }}
                </button>
              </div>
            </div>

            <div v-if="picking === item.id" class="mt-3">
              <p class="label mb-2">Bij welke klant?</p>
              <div class="flex flex-wrap gap-2">
                <button v-for="c in clients.clients.value" :key="c.id" type="button" class="flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3.5 text-[14px] hover:bg-surface-2" @click="go(item, 'klant', $event.currentTarget, c.id)">
                  <UiAvatar :name="c.name" :tint="c.tint" :size="32" /> {{ c.name }}
                </button>
              </div>
            </div>
          </article>
        </TransitionGroup>

        <div v-if="!inbox.count.value" class="card-hero p-8 text-center" data-enter>
          <p class="lead text-[28px] leading-tight">Alles heeft een plek.</p>
          <p class="mt-2 text-[15px] text-muted">Je hoofd is leeg. Even uitademen.</p>
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
          <ul class="space-y-2.5 text-[14.5px]">
            <li class="flex items-center gap-3"><span class="grid size-9 place-items-center rounded-full bg-cat-taak text-cat-ink"><Icon name="tabler:calendar-event" class="size-[18px]" /></span><span>Week</span></li>
            <li class="flex items-center gap-3"><span class="grid size-9 place-items-center rounded-full bg-cat-meeting text-cat-ink"><Icon name="tabler:users" class="size-[18px]" /></span><span>Klant</span></li>
            <li class="flex items-center gap-3"><span class="grid size-9 place-items-center rounded-full bg-cat-focus text-cat-ink"><Icon name="tabler:bulb" class="size-[18px]" /></span><span>Kans</span></li>
            <li class="flex items-center gap-3"><span class="grid size-9 place-items-center rounded-full bg-surface-3"><Icon name="tabler:trash" class="size-[18px]" /></span><span>Weg</span></li>
          </ul>
        </section>
      </aside>
    </div>
  </div>
</template>
