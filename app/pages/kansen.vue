<script setup lang="ts">
import type { Confidence, Opportunity, OpportunityStatus } from '~/types'

useHead({ title: 'Kansen · Stuurhut' })
const root = ref<HTMLElement | null>(null)
useMotion(root)

const { state } = useStore()
const route = useRoute()
const opps = useOpportunities()
const clients = useClients()
const toast = useToast()

const STATUSES: OpportunityStatus[] = ['nieuw', 'onderzoeken', 'ingepland', 'laten gaan']
const active = computed(() => opps.opportunities.value.filter(o => o.status !== 'laten gaan').sort((a, b) => Number(!!b.featured) - Number(!!a.featured)))
const letGo = computed(() => opps.opportunities.value.filter(o => o.status === 'laten gaan'))
const potential = computed(() => active.value.reduce((s, o) => s + o.revenue, 0))
const showLetGo = ref(false)
const conf: Record<Confidence, number> = { laag: 1, middel: 2, hoog: 3 }

function block(o: Opportunity) {
  return state.value.tasks.find(t => t.opportunityId === o.id && t.kind === 'focus' && t.date && !t.done)
}
function setStatus(o: Opportunity, s: OpportunityStatus, el: EventTarget | null) {
  if (o.status === s) return
  const slot = opps.setStatus(o.id, s)
  if (s === 'ingepland') {
    flyTo((el as HTMLElement)?.closest('article'), 'week')
    toast.push({ text: slot ? `Uitwerkblok staat ${relDay(slot.date)} om ${slot.start}.` : 'Ingepland. Ik vond nog geen vrije ochtend.', to: '/week', toLabel: 'Bekijk' })
  }
  else if (s === 'laten gaan') toast.push({ text: 'Losgelaten. Hij blijft bewaard.' })
}
const focusId = computed(() => route.query.focus as string | undefined)
onMounted(() => {
  if (focusId.value) nextTick(() => document.getElementById(`kans-${focusId.value}`)?.scrollIntoView({ block: 'center', behavior: prefersReduced() ? 'auto' : 'smooth' }))
})
</script>

<template>
  <div ref="root">
    <PageHeader title="Kansen" sub="Wat ik zie terugkomen in je werk. Jij beslist wat je ermee doet.">
      <template #actions>
        <div class="text-right">
          <p class="label">Samen mogelijk</p>
          <p class="num text-[24px] font-semibold"><UiCountUp :value="potential" :format="euroRound" /></p>
        </div>
      </template>
    </PageHeader>

    <div class="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-2">
      <article
        v-for="o in active"
        :id="`kans-${o.id}`"
        :key="o.id"
        class="scroll-mt-6 p-5 md:p-6"
        :class="[o.featured ? 'card-focus lg:col-span-2' : 'card', focusId === o.id && !o.featured ? 'ring-2 ring-sea' : '']"
        data-enter
      >
        <div :class="o.featured ? 'lg:grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-8' : ''">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="chip" :class="o.featured ? 'bg-white/10 text-on-focus' : 'bg-surface-2 text-ink'"><Icon name="tabler:bulb" class="size-3.5" />{{ o.source }}</span>
              <span v-if="o.sourceClientIds?.length" class="flex -space-x-2">
                <UiAvatar v-for="cid in o.sourceClientIds" :key="cid" :name="clients.byId(cid)?.name ?? ''" :tint="clients.byId(cid)?.tint" :size="28" class="ring-2" :class="o.featured ? 'ring-focus' : 'ring-surface'" />
              </span>
            </div>
            <h2 class="mt-3 font-semibold leading-tight tracking-[-0.01em] text-pretty" :class="o.featured ? 'text-[28px] md:text-[32px]' : 'text-[20px]'">{{ o.title }}</h2>
            <p class="mt-2 text-[14.5px] leading-relaxed" :class="[o.featured ? 'text-on-focus-muted line-clamp-3' : 'text-muted line-clamp-2']" :title="o.why">{{ o.why }}</p>
          </div>

          <div class="mt-5 lg:mt-0">
            <div class="flex items-end justify-between gap-3">
              <div>
                <p class="text-[12.5px]" :class="o.featured ? 'text-on-focus-muted' : 'text-muted'">Opbrengst</p>
                <p class="num text-[34px] leading-none tracking-[-0.02em]">{{ o.revenue ? euroRound(o.revenue) : '—' }}</p>
              </div>
              <span class="chip !py-1.5" :class="o.featured ? 'bg-white/10 text-on-focus' : 'bg-surface-2 text-ink'"><Icon name="tabler:clock" class="size-3.5" />{{ o.buildTime.replace('ongeveer ', '± ') }}</span>
            </div>
            <div class="mt-4" :aria-label="`Zekerheid ${o.confidence}`" role="img">
              <div class="flex gap-1">
                <span v-for="n in 3" :key="n" class="h-2 flex-1 rounded-full" :class="n <= conf[o.confidence] ? (o.confidence === 'hoog' ? 'bg-green-bar' : o.confidence === 'middel' ? 'bg-cat-taak-dot' : 'bg-copper') : (o.featured ? 'bg-white/12' : 'bg-surface-3')" />
              </div>
              <p class="mt-1.5 text-[12.5px]" :class="o.featured ? 'text-on-focus-muted' : 'text-muted'">Zekerheid {{ o.confidence }}</p>
            </div>
            <p class="mt-3 flex items-start gap-2 text-[14.5px]">
              <Icon name="tabler:arrow-right" class="mt-0.5 size-4 shrink-0" :class="o.featured ? 'text-on-focus-muted' : 'text-muted'" />
              <span><span class="font-semibold">Volgende stap:</span> {{ o.nextStep }}</span>
            </p>
            <p v-if="block(o)" class="mt-2 text-[13.5px]" :class="o.featured ? 'text-on-focus-muted' : 'text-muted'">
              Uitwerkblok staat {{ relDay(block(o)!.date!) }} om {{ block(o)!.start }}.
              <NuxtLink to="/week" class="font-semibold underline underline-offset-2">Naar Week</NuxtLink>
            </p>

            <div class="mt-4 grid gap-1 p-1" :class="[o.featured ? 'bg-white/8 grid-cols-2 rounded-[14px]' : 'bg-surface-2 grid-cols-2 sm:grid-cols-4 rounded-[14px] sm:rounded-full']" role="radiogroup" :aria-label="`Status van ${o.title}`">
              <button
                v-for="s in STATUSES"
                :key="s"
                type="button"
                role="radio"
                :aria-checked="o.status === s"
                class="min-h-10 rounded-full px-1 text-[12.5px] font-semibold transition-colors sm:text-[13px]"
                :class="o.status === s
                  ? (o.featured ? 'bg-on-focus text-focus' : 'bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]')
                  : (o.featured ? 'text-on-focus-muted hover:text-on-focus' : 'text-muted hover:text-ink')"
                @click="setStatus(o, s, $event.currentTarget)"
              >{{ s }}</button>
            </div>
          </div>
        </div>
      </article>
    </div>

    <section v-if="letGo.length" class="mt-6" data-enter>
      <button type="button" class="btn-ghost -ml-3" :aria-expanded="showLetGo" @click="showLetGo = !showLetGo">
        Losgelaten ({{ letGo.length }})
        <Icon name="tabler:chevron-left" class="size-4 transition-transform" :class="showLetGo ? 'rotate-90' : '-rotate-90'" />
      </button>
      <ul v-if="showLetGo" class="mt-2 space-y-2">
        <li v-for="o in letGo" :key="o.id" class="card flex items-center justify-between gap-3 p-4">
          <span class="text-[15px] text-muted">{{ o.title }}</span>
          <button type="button" class="btn-soft !min-h-10 !text-[14px]" @click="setStatus(o, 'nieuw', null)">Terughalen</button>
        </li>
      </ul>
    </section>
  </div>
</template>
