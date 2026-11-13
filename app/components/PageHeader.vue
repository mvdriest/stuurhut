<script setup lang="ts">
defineProps<{ title: string, eyebrow?: string, sub?: string }>()
</script>

<template>
  <header class="mb-5 md:mb-7 flex flex-wrap items-end justify-between gap-4" data-enter>
    <div class="min-w-0">
      <div class="mb-2 flex items-center gap-2 md:hidden">
        <AppMark :size="28" />
        <span class="text-[14px] font-semibold">{{ APP_NAME }}</span>
      </div>
      <p v-if="eyebrow" class="eyebrow mb-1">{{ eyebrow }}</p>
      <h1 class="text-[30px] md:text-[36px] font-semibold leading-[1.1] tracking-[-0.02em]">{{ title }}</h1>
      <p v-if="sub" class="mt-1.5 hidden max-w-[60ch] text-[15.5px] text-muted sm:block">{{ sub }}</p>
    </div>
    <div class="flex items-center gap-2"><slot name="actions" /></div>
  </header>
</template>
