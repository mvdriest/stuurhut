<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 40 })
</script>

<template>
  <!-- Stuurhut-merkje: horizon met opkomende zon -->
  <span class="inline-grid shrink-0 place-items-center rounded-[12px] bg-primary text-on-primary" :style="{ width: `${size}px`, height: `${size}px` }" aria-hidden="true">
    <svg :width="size * 0.6" :height="size * 0.6" viewBox="0 0 24 24" fill="none">
      <path d="M4 15.5h16" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
      <path d="M7.5 15.5a4.5 4.5 0 0 1 9 0" stroke="#F09A62" stroke-width="1.9" stroke-linecap="round" />
      <path d="M7 19h10" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" opacity=".5" />
    </svg>
  </span>
</template>
