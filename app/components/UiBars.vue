<script setup lang="ts">
// Per maand: een spoor met een groene verloopstaaf (in) en een streep voor wat eruit ging.
import { gsap } from 'gsap'

const props = defineProps<{ data: { label: string, income: number, out: number }[], highlightLast?: boolean }>()
const max = computed(() => Math.max(...props.data.map(d => Math.max(d.income, d.out))) * 1.1)
const root = ref<HTMLElement | null>(null)
onMounted(() => {
  if (prefersReduced() || !root.value) return
  gsap.from(root.value.querySelectorAll('[data-bar]'), { scaleY: 0, transformOrigin: '50% 100%', duration: 0.55, ease: 'power2.out', stagger: 0.05, clearProps: 'transform' })
})
</script>

<template>
  <div ref="root" role="img" :aria-label="data.map(d => `${d.label}: in ${euroRound(d.income)}, uit ${euroRound(d.out)}`).join('; ')">
    <div class="grid h-[180px] items-end gap-3" :style="{ gridTemplateColumns: `repeat(${data.length}, minmax(0,1fr))` }">
      <div v-for="(d, i) in data" :key="d.label" class="relative mx-auto h-full w-full max-w-[44px] rounded-[12px] bg-surface-2">
        <div data-bar class="absolute inset-x-0 bottom-0 rounded-[12px]" :style="{ height: `${(d.income / max) * 100}%`, background: highlightLast && i === data.length - 1 ? 'linear-gradient(180deg, var(--copper), color-mix(in srgb, var(--copper) 35%, transparent))' : 'linear-gradient(180deg, var(--green-bar), color-mix(in srgb, var(--green-bar) 25%, transparent))' }" />
        <div class="absolute inset-x-1.5 h-[3px] rounded-full bg-ink" :style="{ bottom: `${(d.out / max) * 100}%` }" />
      </div>
    </div>
    <div class="mt-2 grid gap-3" :style="{ gridTemplateColumns: `repeat(${data.length}, minmax(0,1fr))` }">
      <span v-for="(d, i) in data" :key="d.label" class="text-center text-[12.5px]" :class="i === data.length - 1 ? 'text-ink' : 'text-muted'">{{ d.label }}</span>
    </div>
  </div>
</template>
