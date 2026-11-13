<script setup lang="ts">
// Alles · Zakelijk · Privé
const props = withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })
const D = useDomain()
const OPTIONS = [
  { v: 'alle', label: 'Alles', dot: 'bg-gradient-to-r from-sea to-cat-prive-dot' },
  { v: 'zakelijk', label: 'Zakelijk', dot: 'bg-sea' },
  { v: 'prive', label: 'Privé', dot: 'bg-cat-prive-dot' },
] as const
</script>

<template>
  <div class="grid grid-cols-3 rounded-full bg-surface-3/70 p-1" role="radiogroup" aria-label="Privé of zakelijk">
    <button
      v-for="o in OPTIONS"
      :key="o.v"
      type="button"
      role="radio"
      :aria-checked="D.effective.value === o.v"
      class="flex min-h-9 items-center justify-center gap-1.5 rounded-full px-2 transition-colors"
      :class="[D.effective.value === o.v ? 'bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]' : 'text-muted hover:text-ink', props.compact ? 'text-[12.5px]' : 'text-[13.5px]']"
      @click="D.set(o.v)"
    >
      <span class="size-2 shrink-0 rounded-full" :class="o.dot" />{{ o.label }}
    </button>
  </div>
</template>
