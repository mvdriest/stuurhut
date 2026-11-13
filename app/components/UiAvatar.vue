<script setup lang="ts">
const props = withDefaults(defineProps<{ name: string, tint?: 'copper' | 'sea' | 'green' | 'sand', size?: number }>(), { tint: 'sand', size: 40 })
const bg = computed(() => ({ copper: 'bg-copper-soft text-copper-ink', sea: 'bg-sea-soft text-sea-ink', green: 'bg-green-soft text-green', sand: 'bg-surface-3 text-ink' })[props.tint])
</script>

<template>
  <span class="inline-grid shrink-0 place-items-center rounded-full font-semibold" :class="bg" :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.36)}px` }" aria-hidden="true">
    {{ initials(name) }}
  </span>
</template>
