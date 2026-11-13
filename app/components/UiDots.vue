<script setup lang="ts">
withDefaults(defineProps<{ value: number, total: number, tone?: 'copper' | 'sea' | 'green' | 'focus', label?: string }>(), { tone: 'sea' })
</script>

<template>
  <span class="inline-flex items-center gap-1" role="img" :aria-label="label ?? `${value} van ${total}`">
    <span v-for="i in total" :key="i" class="size-2 rounded-full" :class="i <= value ? { copper: 'bg-copper', sea: 'bg-sea', green: 'bg-green', focus: 'bg-on-focus' }[tone] : 'bg-surface-3'" />
  </span>
</template>
