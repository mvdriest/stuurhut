<script setup lang="ts">
withDefaults(defineProps<{ size?: number, tone?: 'copper' | 'focus' | 'plain' }>(), { size: 32, tone: 'plain' })
</script>

<template>
  <span class="inline-grid shrink-0 place-items-center rounded-[10px] border" :class="tone === 'focus' ? 'border-white/10 bg-white/8 text-on-focus' : 'border-line bg-surface-2 text-ink'" :style="{ width: `${size}px`, height: `${size}px` }" aria-hidden="true">
    <Icon name="tabler:steering-wheel" :style="{ width: `${size * 0.55}px`, height: `${size * 0.55}px` }" />
  </span>
</template>
