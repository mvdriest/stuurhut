<script setup lang="ts">
import type { StuurmanSuggestion } from '~/types'

const props = withDefaults(defineProps<{ suggestion: StuurmanSuggestion, variant?: 'focus' | 'plain' }>(), { variant: 'plain' })
const { accept, dismiss, openChat } = useStuurman()
const el = ref<HTMLElement | null>(null)
onMounted(() => softAppear(el.value))
watch(() => props.suggestion.id, () => nextTick(() => softAppear(el.value)))
const focus = computed(() => props.variant === 'focus')
</script>

<template>
  <article ref="el" class="p-5" :class="focus ? 'card-focus' : 'card'">
    <header class="flex items-center gap-3">
      <span class="grid size-11 shrink-0 place-items-center rounded-[12px] text-cat-ink" :class="TONES[suggestion.tone].fill"><Icon :name="suggestion.icon" class="size-5" /></span>
      <div class="min-w-0 flex-1">
        <p class="flex items-center gap-1.5 text-[12.5px]" :class="focus ? 'text-on-focus-muted' : 'text-muted'"><Icon name="tabler:steering-wheel" class="size-3.5" />{{ AI_NAME }} · {{ TONES[suggestion.tone].label }}</p>
        <h3 class="truncate text-[17px] leading-tight">{{ suggestion.title }}</h3>
      </div>
      <span v-if="suggestion.meta" class="chip shrink-0 !py-1.5 text-cat-ink" :class="TONES[suggestion.tone].fill">{{ suggestion.meta }}</span>
    </header>
    <p class="mt-3 line-clamp-2 text-[14.5px] leading-snug" :class="focus ? 'text-on-focus-muted' : 'text-muted'" :title="`${suggestion.text} ${suggestion.why}`">{{ suggestion.why }}</p>
    <div class="mt-4 flex items-center gap-2">
      <button type="button" :class="focus ? 'btn bg-on-focus text-focus hover:opacity-90' : 'btn-primary'" @click="accept(suggestion)">{{ suggestion.acceptLabel }}</button>
      <button type="button" :class="focus ? 'btn-ghost-focus' : 'btn-ghost'" @click="dismiss(suggestion)">Nu niet</button>
      <button type="button" class="icon-btn ml-auto" :class="focus ? '!text-on-focus hover:!bg-white/10' : ''" aria-label="Chat met Stuurman" title="Chat met Stuurman" @click="openChat()"><Icon name="tabler:message-circle" class="size-5" /></button>
    </div>
  </article>
</template>
