<script setup lang="ts">
// Project: uren tegenover budget, uren loggen en factureren.
import type { Project } from '~/types'

const props = defineProps<{ project: Project }>()
const work = useWork()
const tasks = useTasks()
const cal = useCalendar()
const clients = useClients()
const toast = useToast()
const s = computed(() => work.stats(props.project))
const tone = computed(() => (s.value.pct > 1 ? 'bg-copper' : s.value.pct > 0.85 ? 'bg-cat-taak-dot' : 'bg-green-bar'))
const recent = computed(() => work.entriesFor(props.project.id).slice(0, 3))
const waitDays = computed(() => (props.project.waitingSince ? diffDays(todayISO(), props.project.waitingSince) : 0))
const dueDays = computed(() => (props.project.due ? diffDays(props.project.due, todayISO()) : 0))
const logging = ref(false)
const note = ref('')

function log(h: number) {
  work.logHours(props.project.id, h, note.value.trim() || undefined)
  note.value = ''
  logging.value = false
  toast.push({ text: `${dec1(h).replace(',0', '')} uur gelogd op ${props.project.name}.` })
}
function invoice() {
  const inv = work.invoiceProject(props.project.id)
  if (inv) toast.push({ text: `Factuur ${inv.number} van ${euro(inv.amount)} staat klaar.`, to: '/financien', toLabel: 'Bekijk' })
}
function planTalk() {
  const c = clients.byId(props.project.clientId)
  const slot = cal.findSlot(30, { domain: 'zakelijk' })
  if (!slot) return
  tasks.add({ title: `Meerwerk bespreken met ${c?.contact.split(' ')[0] ?? c?.name}`, durationMin: 30, kind: 'taak', clientId: c?.id, domain: 'zakelijk', important: true, date: slot.date, start: slot.start })
  toast.push({ text: `Gesprek staat ${relDay(slot.date)} om ${slot.start}.`, to: '/week', toLabel: 'Bekijk' })
}
</script>

<template>
  <div class="rounded-[14px] bg-surface-2 p-4">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-[15.5px]">{{ project.name }}</p>
        <p class="text-[12.5px] text-muted">{{ euroRound(project.budget) }} · {{ euroRound(project.hourlyRate) }} per uur · {{ project.status }}</p>
      </div>
      <p class="num shrink-0 text-right text-[15px]">{{ dec1(s.hours).replace(',0', '') }}<span class="text-muted"> / {{ Math.round(s.budgetHours) }} u</span></p>
    </div>
    <ul v-if="project.nextStep || project.waitingOn || project.due || project.stops" class="mt-2.5 space-y-1 text-[13px]">
      <li v-if="project.waitingOn" class="flex gap-2" :class="waitDays >= 5 ? 'text-copper-ink' : 'text-muted'"><Icon name="tabler:hourglass" class="mt-0.5 size-4 shrink-0" /><span>Wacht op: {{ project.waitingOn }}<template v-if="waitDays > 0"> · {{ waitDays }} {{ waitDays === 1 ? 'dag' : 'dagen' }}</template></span></li>
      <li v-if="project.nextStep" class="flex gap-2 text-ink"><Icon name="tabler:arrow-right" class="mt-0.5 size-4 shrink-0 text-muted" /><span>{{ project.nextStep }}</span></li>
      <li v-if="project.due" class="flex gap-2" :class="dueDays < 0 ? 'text-copper-ink' : 'text-muted'"><Icon name="tabler:flag" class="mt-0.5 size-4 shrink-0" /><span>{{ dueDays < 0 ? `Streefdatum ${shortDate(project.due)} is voorbij` : `Streefdatum ${relDay(project.due)}` }}</span></li>
      <li v-if="project.stops" class="flex gap-2 text-muted"><Icon name="tabler:route" class="mt-0.5 size-4 shrink-0" /><span>Route: {{ project.stops.done }} van {{ project.stops.total }} haltes</span></li>
    </ul>
    <div class="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-3" role="img" :aria-label="`${Math.round(s.pct * 100)}% van de begrote uren`">
      <div class="h-full rounded-full transition-[width] duration-500" :class="tone" :style="{ width: `${Math.min(100, s.pct * 100)}%` }" />
    </div>
    <p class="mt-1.5 text-[12.5px]" :class="s.over ? 'text-copper-ink' : 'text-muted'">
      {{ s.over ? `${Math.round(s.over)} uur boven budget. Bespreek meerwerk voordat je verder gaat.` : `${Math.round(s.pct * 100)}% van de begrote uren` }}
    </p>

    <div class="mt-3 flex flex-wrap items-center gap-2">
      <button v-if="project.status !== 'afgerond'" type="button" class="btn-outline !min-h-10 !px-3.5 !text-[13.5px]" :aria-expanded="logging" @click="logging = !logging"><Icon name="tabler:clock" class="size-4" />Uren loggen</button>
      <button v-if="s.billable > 0" type="button" class="btn-primary !min-h-10 !px-3.5 !text-[13.5px]" @click="invoice"><Icon name="tabler:file-invoice" class="size-4" />Factureer {{ dec1(s.billable).replace(',0', '') }} u · {{ euroRound(s.billableAmount) }}</button>
      <button v-if="s.over && project.status !== 'afgerond'" type="button" class="btn-accent !min-h-10 !px-3.5 !text-[13.5px]" @click="planTalk">Plan gesprek</button>
    </div>
    <div v-if="logging" class="mt-3 rounded-[12px] bg-surface p-3">
      <input v-model="note" class="field-input !min-h-10" placeholder="Waaraan gewerkt? (mag leeg)" aria-label="Omschrijving">
      <div class="mt-2 flex gap-1.5">
        <button v-for="h in [0.5, 1, 2, 4]" :key="h" type="button" class="seg-btn num flex-1" @click="log(h)">{{ dec1(h).replace(',0', '') }} u</button>
      </div>
    </div>
    <ul v-if="recent.length" class="mt-3 space-y-1 text-[12.5px] text-muted">
      <li v-for="e in recent" :key="e.id" class="flex justify-between gap-2"><span>{{ cap(relDay(e.date)) }} · {{ e.note ?? 'Werk' }}</span><span class="num">{{ dec1(e.hours).replace(',0', '') }} u</span></li>
    </ul>
  </div>
</template>
