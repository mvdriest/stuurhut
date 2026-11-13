<script setup lang="ts">
import type { LoadLevel } from '~/composables/useCalendar'

defineProps<{ level: LoadLevel }>()
</script>

<template>
  <span class="chip" :class="{ rustig: 'bg-green-soft text-green', normaal: 'bg-sea-soft text-sea-ink', vol: 'bg-copper-soft text-copper-ink' }[level]">
    <span class="size-1.5 rounded-full" :class="{ rustig: 'bg-green', normaal: 'bg-sea', vol: 'bg-copper' }[level]" />
    {{ level }}
  </span>
</template>
