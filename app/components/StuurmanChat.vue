<script setup lang="ts">
// Chat met Stuurman: bubbels, voorstellen die je direct kunt uitvoeren, en vervolgvragen.
const chat = useChat()
const { state } = useStore()
const text = ref('')
const list = ref<HTMLElement | null>(null)
const input = ref<HTMLInputElement | null>(null)

function send(t = text.value) {
  chat.send(t)
  text.value = ''
}
function scrollDown() {
  nextTick(() => list.value?.scrollTo({ top: list.value.scrollHeight, behavior: prefersReduced() ? 'auto' : 'smooth' }))
}
watch(() => [chat.messages.value.length, chat.typing.value], scrollDown)
onMounted(() => { scrollDown(); input.value?.focus({ preventScroll: true }) })
const time = (iso: string) => new Date(iso).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
const lastChips = computed(() => {
  const last = [...chat.messages.value].reverse().find(m => m.role === 'stuurman')
  return last?.chips ?? []
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div ref="list" class="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 no-scrollbar" aria-live="polite">
      <!-- Lege staat -->
      <div v-if="!chat.messages.value.length" class="rounded-[16px] p-4 text-cat-ink" style="background: linear-gradient(140deg, var(--cat-meeting), var(--cat-focus))">
        <p class="text-[17px]">Vraag het maar.</p>
        <p class="mt-1 text-[14px] text-cat-ink-muted">Over je dag, je week, geld, kansen of je routines. Of zeg "plan …" of "onthoud …".</p>
      </div>

      <template v-for="m in chat.messages.value" :key="m.id">
        <div v-if="m.role === 'user'" class="flex justify-end">
          <p class="max-w-[85%] rounded-[18px] rounded-br-[6px] bg-primary px-4 py-2.5 text-[15px] leading-snug text-on-primary">{{ m.text }}</p>
        </div>
        <div v-else class="flex items-end gap-2">
          <span class="grid size-8 shrink-0 place-items-center rounded-[10px] bg-cat-meeting text-cat-ink"><Icon name="tabler:steering-wheel" class="size-4" /></span>
          <div class="max-w-[85%] space-y-2">
            <p class="rounded-[18px] rounded-bl-[6px] bg-surface-2 px-4 py-2.5 text-[15px] leading-snug">{{ m.text }}</p>
            <div v-if="m.suggestion && !state.suggestionStatus[m.suggestion.id]" class="rounded-[14px] p-3 text-cat-ink" :class="TONES[m.suggestion.tone].fill">
              <p class="flex items-center gap-2 text-[14.5px]"><Icon :name="m.suggestion.icon" class="size-4 shrink-0" /><span class="flex-1">{{ m.suggestion.title }}</span><span v-if="m.suggestion.meta" class="text-[12.5px] text-cat-ink-muted">{{ m.suggestion.meta }}</span></p>
              <button type="button" class="mt-2.5 min-h-10 w-full rounded-full bg-cat-ink px-4 text-[14px] text-white" @click="chat.acceptIn(m)">{{ m.suggestion.acceptLabel }}</button>
            </div>
            <button v-if="m.form" type="button" class="flex min-h-10 items-center gap-2 rounded-full border border-line-strong px-3.5 text-[14px] hover:bg-surface-2" @click="chat.openForm(m)"><Icon name="tabler:pencil" class="size-4" />Formulier openen</button>
            <p class="text-[11.5px] text-muted">{{ time(m.at) }}</p>
          </div>
        </div>
      </template>

      <div v-if="chat.typing.value" class="flex items-end gap-2" aria-label="Stuurman typt">
        <span class="grid size-8 shrink-0 place-items-center rounded-[10px] bg-cat-meeting text-cat-ink"><Icon name="tabler:steering-wheel" class="size-4" /></span>
        <span class="flex gap-1 rounded-[18px] rounded-bl-[6px] bg-surface-2 px-4 py-3.5">
          <span v-for="i in 3" :key="i" class="size-1.5 animate-pulse rounded-full bg-muted" :style="{ animationDelay: `${i * 150}ms` }" />
        </span>
      </div>
    </div>

    <!-- Vervolgvragen + invoer -->
    <div class="border-t border-line p-3">
      <div class="-mx-3 mb-2 flex gap-1.5 overflow-x-auto px-3 no-scrollbar">
        <button v-for="c in (chat.messages.value.length ? lastChips : chat.starters.value)" :key="c" type="button" class="min-h-9 shrink-0 rounded-full border border-line-strong px-3 text-[13.5px] hover:bg-surface-2" @click="send(c)">{{ c }}</button>
      </div>
      <form class="flex items-center gap-2" @submit.prevent="send()">
        <label for="chat-input" class="sr-only">Bericht aan Stuurman</label>
        <input id="chat-input" ref="input" v-model="text" autocomplete="off" enterkeyhint="send" placeholder="Vraag Stuurman iets…" class="min-h-11 min-w-0 flex-1 rounded-full bg-surface-2 px-4 text-[15px] outline-none placeholder:text-muted focus:ring-2 focus:ring-sea">
        <button type="submit" class="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-on-primary disabled:opacity-40" :disabled="!text.trim() || chat.typing.value" aria-label="Verstuur"><Icon name="tabler:arrow-up" class="size-5" /></button>
      </form>
      <button v-if="chat.messages.value.length" type="button" class="mt-2 text-[12.5px] text-muted underline underline-offset-4" @click="chat.clear()">Gesprek wissen</button>
    </div>
  </div>
</template>
