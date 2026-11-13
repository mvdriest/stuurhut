<script setup lang="ts">
// "Mijn dag": afspraken en taken in de kleur van hun soort, tijd links.
import type { ISODate, Task } from '~/types'
import { CATEGORIES, categoryOf } from '~/utils/category'

const props = defineProps<{ date: ISODate }>()
const cal = useCalendar()
const clients = useClients()
const items = computed(() => cal.dayItems(props.date))
const isToday = computed(() => props.date === todayISO())
const now = ref(nowMin())
useIntervalFn(() => { now.value = nowMin() }, 60_000)
const nowIndex = computed(() => (isToday.value ? items.value.findIndex(i => toMin(i.end) > now.value) : -1))
const past = (end: string) => isToday.value && toMin(end) <= now.value
</script>

<template>
  <ol v-if="items.length" class="space-y-2">
    <template v-for="(i, idx) in items" :key="i.id">
      <li v-if="idx === nowIndex" class="flex items-center gap-2" aria-label="Nu">
        <span class="num w-12 text-[13px] text-copper-ink">{{ fromMin(now) }}</span>
        <span class="size-2 rounded-full bg-copper" />
        <span class="h-0.5 flex-1 rounded-full bg-copper" />
      </li>
      <li class="flex items-center gap-3" :class="past(i.end) ? 'opacity-50' : ''">
        <div class="w-12 shrink-0">
          <p class="num text-[15px] leading-tight">{{ i.start }}</p>
          <p class="num text-[12.5px] text-muted">{{ i.end }}</p>
        </div>
        <div class="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-[14px] px-3.5 py-2.5 text-cat-ink" :class="CATEGORIES[categoryOf(i)].fill">
          <Icon :name="CATEGORIES[categoryOf(i)].icon" class="size-[18px] shrink-0" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-[15.5px]" :class="i.type === 'task' && (i.ref as Task).done ? 'line-through' : ''">{{ i.title }}</p>
            <p class="truncate text-[13px] text-cat-ink-muted">{{ clients.byId(i.ref.clientId)?.name ?? CATEGORIES[categoryOf(i)].label }}</p>
          </div>
        </div>
      </li>
    </template>
  </ol>
  <p v-else class="rounded-[14px] bg-surface-2 p-5 text-[15px] text-muted">Niets gepland.</p>
</template>
