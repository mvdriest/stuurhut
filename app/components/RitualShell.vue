<script setup lang="ts">
// Een rustig stap-voor-stap-moment: één vraag per scherm, voortgang bovenaan.
const props = defineProps<{ title: string, icon: string, tone: 'warm' | 'mint' | 'sea', step: number, steps: number, nextLabel?: string, nextDisabled?: boolean, hideFooter?: boolean }>()
const emit = defineEmits<{ next: [], back: [] }>()
const body = ref<HTMLElement | null>(null)
watch(() => props.step, () => nextTick(() => {
  softAppear(body.value)
  window.scrollTo({ top: 0, behavior: prefersReduced() ? 'auto' : 'smooth' })
}))
onKeyStroke('Escape', () => navigateTo('/'))
</script>

<template>
  <div class="mx-auto max-w-[720px]">
    <header class="mb-4 flex items-center gap-3">
      <span class="grid size-11 shrink-0 place-items-center rounded-[12px] bg-primary text-on-primary"><Icon :name="icon" class="size-5" /></span>
      <div class="min-w-0 flex-1">
        <p class="text-[13px] text-muted">Stap {{ step + 1 }} van {{ steps }}</p>
        <h1 class="text-[22px] leading-tight">{{ title }}</h1>
      </div>
      <NuxtLink to="/" class="btn-ghost !px-3.5 text-muted">Later</NuxtLink>
    </header>
    <div class="mb-5 grid gap-1.5" :style="{ gridTemplateColumns: `repeat(${steps}, minmax(0,1fr))` }" role="progressbar" :aria-valuenow="step + 1" :aria-valuemin="1" :aria-valuemax="steps">
      <span v-for="i in steps" :key="i" class="h-1.5 rounded-full transition-colors duration-300" :class="i <= step + 1 ? 'bg-ink' : 'bg-surface-3'" />
    </div>

    <section ref="body" class="p-5 md:p-7" :class="{ warm: 'card-warm', mint: 'card-mint', sea: 'card-sea' }[tone]">
      <slot />
    </section>

    <footer v-if="!hideFooter" class="mt-4 flex items-center gap-2">
      <button v-if="step > 0" type="button" class="btn-ghost" @click="emit('back')"><Icon name="tabler:chevron-left" class="size-4" />Terug</button>
      <button type="button" class="btn-primary ml-auto min-w-[160px]" :disabled="nextDisabled" :class="nextDisabled ? 'opacity-40' : ''" @click="emit('next')">
        {{ nextLabel ?? 'Volgende' }}<Icon name="tabler:arrow-right" class="size-4" />
      </button>
    </footer>
  </div>
</template>
