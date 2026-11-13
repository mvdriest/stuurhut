<script setup lang="ts">
// Eén kaart op het bord. Te scannen: soort, titel, klant, en wat er speelt.
import type { Assignment } from '~/types'

const props = defineProps<{ a: Assignment, ghost?: boolean, compact?: boolean }>()
const A = useAssignments()
const clients = useClients()
const client = computed(() => clients.byId(props.a.clientId))
const kind = computed(() => A.kindOf(props.a))
const due = computed(() => A.dueDays(props.a))
const dueText = computed(() => {
  const d = due.value
  if (d === null || !props.a.due) return ''
  if (d < 0) return `${-d === 1 ? "1 dag" : `${-d} dagen`} te laat`
  return relDay(props.a.due)
})
const dueUrgent = computed(() => due.value !== null && due.value <= 3)
const waiting = computed(() => (kind.value === 'waiting' ? A.waitingDays(props.a) : null))
const block = computed(() => (kind.value === 'done' ? undefined : A.nextBlock(props.a)))
const logged = computed(() => A.loggedH(props.a))
// Ligt het te lang stil, zonder werkblok? Dan zie je dat op de kaart.
const stuckDays = computed(() => {
  if (block.value) return null
  const d = A.waitingDays(props.a)
  return (kind.value === 'todo' && d >= STUCK_TODO_DAYS) || (kind.value === 'doing' && d >= STUCK_DOING_DAYS) ? d : null
})
const hoursText = computed(() => {
  const e = props.a.estimateH
  if (!e) return logged.value ? `${dec1(logged.value).replace(',0', '')} u` : ''
  return logged.value ? `${dec1(logged.value).replace(',0', '')}/${e} u` : `${dec1(e).replace(',0', '')} u`
})
</script>

<template>
  <div
    class="rounded-[16px] border bg-surface p-3 text-left"
    :class="[ghost ? 'border-line-strong shadow-float' : 'border-line', kind === 'done' ? 'opacity-80' : '']"
  >
    <div class="flex items-center gap-1.5">
      <span v-for="t in a.tags.slice(0, 2)" :key="t" class="chip !px-2 !py-[5px] !text-[12px]" :class="TAG_FILL[t] ?? 'bg-surface-3 text-ink'">{{ t }}</span>
      <span v-if="a.priority === 'hoog' && kind !== 'done'" class="ml-auto inline-flex items-center gap-1 text-[12.5px] text-copper-ink"><Icon name="tabler:flag" class="size-3.5" />Hoog</span>
      <Icon v-if="kind === 'done'" name="tabler:check" class="ml-auto size-4 text-green-ink" />
    </div>
    <p class="mt-2 text-[15px] leading-snug" :class="[compact ? 'line-clamp-1' : 'line-clamp-2', kind === 'done' ? 'text-muted' : '']">{{ a.title }}</p>
    <p v-if="client" class="mt-1.5 flex items-center gap-1.5 text-[13px] text-muted">
      <UiAvatar :name="client.name" :tint="client.tint" :size="20" />
      <span class="truncate">{{ client.name }}</span>
    </p>
    <div v-if="!compact && kind !== 'done' && (dueText || hoursText || waiting !== null || block || stuckDays)" class="mt-2.5 flex flex-wrap gap-1.5">
      <span v-if="stuckDays" class="chip bg-cat-taak text-cat-ink"><Icon name="tabler:player-play" class="size-3.5" />ligt {{ stuckDays }} dagen</span>
      <span v-if="waiting !== null" class="chip" :class="waiting >= 5 ? 'bg-copper-soft text-copper-ink' : 'bg-surface-2 text-ink'"><Icon name="tabler:clock" class="size-3.5" />wacht {{ waiting === 1 ? "1 dag" : `${waiting} dagen` }}</span>
      <span v-if="dueText" class="chip" :class="dueUrgent ? 'bg-copper-soft text-copper-ink' : 'bg-surface-2 text-ink'"><Icon name="tabler:calendar" class="size-3.5" />{{ dueText }}</span>
      <span v-if="block" class="chip bg-green-soft text-green-ink"><Icon name="tabler:calendar-event" class="size-3.5" />{{ relDay(block.date!) === 'vandaag' ? '' : `${weekdayShort(block.date!)} ` }}{{ block.start }}</span>
      <span v-if="hoursText" class="chip bg-surface-2 text-muted">{{ hoursText }}</span>
    </div>
  </div>
</template>
