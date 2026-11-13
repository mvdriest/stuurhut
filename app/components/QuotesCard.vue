<script setup lang="ts">
// Offertes van een klant: concept → verstuurd → akkoord (wordt project) of afgewezen.
import type { QuoteStatus } from '~/types'

const props = defineProps<{ clientId: string }>()
const work = useWork()
const tasks = useTasks()
const cal = useCalendar()
const clients = useClients()
const toast = useToast()
const list = computed(() => work.quotesFor(props.clientId).slice().reverse())
const STATUS: Record<QuoteStatus, string> = { concept: 'bg-surface-3 text-ink', verstuurd: 'bg-cat-meeting text-cat-ink', akkoord: 'bg-cat-focus text-cat-ink', afgewezen: 'bg-copper-soft text-copper-ink' }
const adding = ref(false)
const title = ref('')
const amount = ref<number | undefined>()

function set(id: string, s: QuoteStatus) {
  work.setQuoteStatus(id, s)
  toast.push({ text: s === 'akkoord' ? 'Akkoord. Het project staat klaar, de klant is nu lopend.' : s === 'verstuurd' ? 'Verstuurd. Over vijf dagen vraag ik of je iets hebt gehoord.' : 'Genoteerd.' })
}
function followUp(title: string) {
  const c = clients.byId(props.clientId)
  const slot = cal.findSlot(15, { domain: 'zakelijk' })
  if (!slot) return
  tasks.add({ title: `${c?.contact.split(' ')[0] ?? 'Klant'} bellen over offerte "${title}"`, durationMin: 15, kind: 'taak', clientId: props.clientId, domain: 'zakelijk', date: slot.date, start: slot.start })
  toast.push({ text: `Belmoment staat ${relDay(slot.date)} om ${slot.start}.`, to: '/week', toLabel: 'Bekijk' })
}
function add() {
  if (!title.value.trim() || !amount.value) return
  work.addQuote(props.clientId, title.value.trim(), amount.value)
  title.value = ''
  amount.value = undefined
  adding.value = false
}
</script>

<template>
  <div>
    <div class="mb-3 flex items-center justify-between">
      <p class="label">Offertes</p>
      <button type="button" class="inline-flex min-h-9 items-center gap-1 text-[13.5px] text-sea-ink" @click="adding = !adding"><Icon name="tabler:plus" class="size-4" />Nieuwe offerte</button>
    </div>
    <form v-if="adding" class="mb-3 grid grid-cols-[1fr_110px_auto] gap-2" @submit.prevent="add">
      <input v-model="title" class="field-input !min-h-10" placeholder="Waarvoor?" aria-label="Omschrijving">
      <input v-model.number="amount" type="number" min="0" step="100" class="field-input !min-h-10" placeholder="€" aria-label="Bedrag">
      <button type="submit" class="btn-primary !min-h-10 !px-3.5">Voeg toe</button>
    </form>
    <ul class="space-y-2">
      <li v-for="q in list" :key="q.id" class="rounded-[14px] border border-line p-3">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[15px]">{{ q.title }}</p>
            <p class="text-[12.5px]" :class="q.status === 'verstuurd' && work.quoteDays(q) >= 5 ? 'text-copper-ink' : 'text-muted'">
              <template v-if="q.status === 'verstuurd'">{{ work.quoteDays(q) === 0 ? 'Vandaag verstuurd' : `${work.quoteDays(q)} dagen geleden verstuurd${work.quoteDays(q) >= 5 ? ', geen reactie' : ''}` }}</template>
              <template v-else-if="q.decidedOn">{{ q.status === 'akkoord' ? 'Akkoord' : 'Afgewezen' }} op {{ shortDate(q.decidedOn) }}</template>
              <template v-else>Nog niet verstuurd</template>
            </p>
          </div>
          <div class="shrink-0 text-right">
            <p class="num text-[15px]">{{ euroRound(q.amount) }}</p>
            <span class="chip mt-1" :class="STATUS[q.status]">{{ q.status }}</span>
          </div>
        </div>
        <div v-if="q.status === 'concept' || q.status === 'verstuurd'" class="mt-2.5 flex flex-wrap gap-1.5">
          <button v-if="q.status === 'concept'" type="button" class="btn-primary !min-h-9 !px-3 !text-[13px]" @click="set(q.id, 'verstuurd')"><Icon name="tabler:send" class="size-3.5" />Verstuurd</button>
          <template v-else>
            <button type="button" class="btn-primary !min-h-9 !px-3 !text-[13px]" @click="set(q.id, 'akkoord')"><Icon name="tabler:check" class="size-3.5" />Akkoord</button>
            <button type="button" class="btn-outline !min-h-9 !px-3 !text-[13px]" @click="followUp(q.title)">Nabellen</button>
            <button type="button" class="btn-ghost !min-h-9 !px-3 !text-[13px]" @click="set(q.id, 'afgewezen')">Afgewezen</button>
          </template>
        </div>
      </li>
      <li v-if="!list.length" class="text-[14px] text-muted">Nog geen offertes.</li>
    </ul>
  </div>
</template>
