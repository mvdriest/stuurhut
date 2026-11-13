<script setup lang="ts">
// Eén voorstel als rij in het paneel: kleur en titel om te scannen, uitklappen voor de rest.
import type { StuurmanSuggestion } from '~/types'

defineProps<{ suggestion: StuurmanSuggestion }>()
const open = defineModel<boolean>('open', { default: false })
const { accept, dismiss } = useStuurman()
</script>

<template>
  <li class="overflow-hidden rounded-[16px] border border-line bg-surface">
    <button type="button" class="flex min-h-14 w-full items-center gap-3 px-3 py-2.5 text-left" :aria-expanded="open" @click="open = !open">
      <span class="grid size-10 shrink-0 place-items-center rounded-[12px] text-cat-ink" :class="TONES[suggestion.tone].fill"><Icon :name="suggestion.icon" class="size-5" /></span>
      <span class="min-w-0 flex-1">
        <span class="block text-[15px] leading-snug">{{ suggestion.title }}</span>
        <span class="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-muted"><span class="size-1.5 rounded-full" :class="TONES[suggestion.tone].dot" />{{ TONES[suggestion.tone].label }}<template v-if="suggestion.meta"> · {{ suggestion.meta }}</template></span>
      </span>
      <Icon name="tabler:chevron-down" class="size-4 shrink-0 text-muted transition-transform" :class="open ? 'rotate-180' : ''" />
    </button>
    <div v-if="open" class="px-3 pb-3">
      <div class="rounded-[12px] p-3 text-cat-ink" :class="TONES[suggestion.tone].fill">
        <p class="text-[14.5px] leading-snug">{{ suggestion.text }}</p>
        <p class="mt-1.5 flex gap-1.5 text-[13px] leading-snug text-cat-ink-muted"><Icon name="tabler:info-circle" class="mt-px size-4 shrink-0" />{{ suggestion.why }}</p>
      </div>
      <div class="mt-3 flex gap-2">
        <button type="button" class="btn-primary !min-h-10 !px-4 !text-[14px]" @click="accept(suggestion)">{{ suggestion.acceptLabel }}</button>
        <button type="button" class="btn-ghost !min-h-10 !px-4 !text-[14px]" @click="dismiss(suggestion)">Nu niet</button>
      </div>
    </div>
  </li>
</template>
