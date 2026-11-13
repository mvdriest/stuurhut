<script setup lang="ts">
const emit = defineEmits<{ close: [] }>()
defineProps<{ closeLabel?: string, closeIcon?: string }>()
const { page, panel: current, questions, tab } = useStuurman()
const openQ = ref<string | null>(null)
const openS = ref<string | null>(null)
watch(page, () => { openQ.value = null; openS.value = null })
watch(current, (list) => { if (!list.some(s => s.id === openS.value)) openS.value = list[0]?.id ?? null }, { immediate: true })
</script>

<template>
  <div class="flex h-full flex-col">
    <header class="border-b border-line px-5 pt-4 pb-3" style="background: var(--grad-stuurman)">
      <div class="flex items-center gap-3">
        <span class="grid size-11 shrink-0 place-items-center rounded-[12px] bg-primary text-on-primary"><Icon name="tabler:steering-wheel" class="size-6" /></span>
        <div class="min-w-0 flex-1">
          <h2 class="text-[18px] leading-tight">{{ AI_NAME }}</h2>
          <p class="text-[13px] text-muted">Kijkt mee op {{ PAGE_LABEL[page] }}</p>
        </div>
        <button type="button" class="icon-btn" :aria-label="closeLabel ?? 'Sluit Stuurman'" @click="emit('close')">
          <Icon :name="closeIcon ?? 'tabler:x'" class="size-5" />
        </button>
      </div>
      <div class="mt-3 grid grid-cols-2 rounded-full bg-surface/70 p-1" role="tablist" aria-label="Stuurman">
        <button type="button" role="tab" :aria-selected="tab === 'voorstellen'" class="flex min-h-9 items-center justify-center gap-1.5 rounded-full text-[14px] transition-colors" :class="tab === 'voorstellen' ? 'bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.1)]' : 'text-muted'" @click="tab = 'voorstellen'">
          Voorstellen <span v-if="current.length" class="num grid size-5 place-items-center rounded-full bg-copper text-[11px] text-on-copper">{{ current.length }}</span>
        </button>
        <button type="button" role="tab" :aria-selected="tab === 'chat'" class="flex min-h-9 items-center justify-center gap-1.5 rounded-full text-[14px] transition-colors" :class="tab === 'chat' ? 'bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.1)]' : 'text-muted'" @click="tab = 'chat'">
          <Icon name="tabler:message-circle" class="size-4" />Chat
        </button>
      </div>
    </header>

    <StuurmanChat v-if="tab === 'chat'" class="min-h-0 flex-1" />

    <template v-else>
      <div class="flex-1 space-y-3 overflow-y-auto p-4 no-scrollbar">
        <ul v-if="current.length" class="space-y-2">
          <StuurmanRow v-for="s in current" :key="s.id" :suggestion="s" :open="openS === s.id" @update:open="v => openS = v ? s.id : null" />
        </ul>
        <div v-else class="rounded-[16px] bg-cat-focus p-5 text-cat-ink">
          <p class="text-[17px]">Niets van mij op deze pagina.</p>
          <p class="mt-1 text-[14px] text-cat-ink-muted">Als er iets speelt, zeg ik het op tijd.</p>
        </div>

        <section class="card overflow-hidden" aria-label="Vraag het Stuurman">
          <h3 class="px-4 pt-4 pb-2 text-[13px] text-muted">Snel gevraagd</h3>
          <ul class="divide-y divide-line">
            <li v-for="q in questions" :key="q.question">
              <button type="button" class="flex min-h-12 w-full items-center gap-3 px-4 text-left text-[15px] hover:bg-surface-2" :aria-expanded="openQ === q.question" @click="openQ = openQ === q.question ? null : q.question">
                <span class="flex-1">{{ q.question }}</span>
                <Icon name="tabler:chevron-down" class="size-4 text-muted transition-transform" :class="openQ === q.question ? 'rotate-180' : ''" />
              </button>
              <p v-if="openQ === q.question" class="px-4 pb-4 text-[14.5px] leading-relaxed text-muted">{{ q.answer }}</p>
            </li>
          </ul>
          <button type="button" class="flex min-h-12 w-full items-center gap-2 border-t border-line px-4 text-[14.5px] text-sea-ink hover:bg-surface-2" @click="tab = 'chat'">
            <Icon name="tabler:message-circle" class="size-4" />Iets anders vragen
          </button>
        </section>
      </div>
      <p class="border-t border-line px-5 py-3 text-[12.5px] text-muted">Voorstellen en antwoorden zijn nu voorgeprogrammeerd. Hier komt later de echte {{ AI_NAME }}.</p>
    </template>
  </div>
</template>
