<script setup lang="ts">
// Het formulierpaneel. iPhone: bottom sheet. iPad en Mac: venster in het midden.
import type { EditorKind } from '~/types'

const editor = useEditor()
const isMd = useMediaQuery('(min-width: 768px)')
const form = ref<{ save: () => void } | null>(null)
const body = ref<HTMLElement | null>(null)
const TITLES: Record<EditorKind, [string, string]> = {
  akkoord: ['Akkoord vastleggen', 'Afspraken bewerken'],
  klant: ['Nieuwe klant', 'Klant bewerken'],
  routine: ['Nieuwe routine', 'Routine bewerken'],
  taak: ['Nieuwe taak', 'Taak bewerken'],
  afspraak: ['Nieuwe afspraak', 'Afspraak bewerken'],
  werktijden: ['Werktijden', 'Werktijden'],
  admin: ['Nieuw in levensadmin', 'Levensadmin bewerken'],
  opdracht: ['Nieuwe opdracht', 'Opdracht bewerken'],
  slaap: ['Slaapritme', 'Slaapritme'],
}
const title = computed(() => (editor.req.value ? TITLES[editor.req.value.kind][editor.req.value.id ? 1 : 0] : ''))
watch(() => editor.req.value, (r) => {
  if (r) nextTick(() => body.value?.querySelector<HTMLInputElement>('[data-autofocus]')?.focus())
})
onKeyStroke('Escape', () => { if (editor.req.value) editor.close() })
</script>

<template>
  <Teleport to="body">
    <Transition enter-from-class="opacity-0" leave-to-class="opacity-0" enter-active-class="transition-opacity duration-200" leave-active-class="transition-opacity duration-150">
      <div v-if="editor.req.value" class="fixed inset-0 z-[80] bg-black/35" @click="editor.close()" />
    </Transition>
    <Transition
      :enter-from-class="isMd ? 'opacity-0 scale-[0.98]' : 'translate-y-8 opacity-0'"
      :leave-to-class="isMd ? 'opacity-0 scale-[0.98]' : 'translate-y-8 opacity-0'"
      enter-active-class="transition duration-250 ease-out"
      leave-active-class="transition duration-150 ease-in"
    >
      <section
        v-if="editor.req.value"
        class="fixed z-[90] flex flex-col overflow-hidden bg-surface shadow-float"
        :class="isMd ? 'left-1/2 top-1/2 max-h-[88vh] w-[540px] -translate-x-1/2 -translate-y-1/2 rounded-[22px] border border-line' : 'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[26px] pb-safe'"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <div v-if="!isMd" class="mx-auto mt-2 h-1.5 w-10 rounded-full bg-surface-3" aria-hidden="true" />
        <header class="flex items-center gap-3 border-b border-line px-5 py-3.5">
          <h2 class="flex-1 text-[19px]">{{ title }}</h2>
          <button type="button" class="icon-btn -mr-2" aria-label="Sluiten" @click="editor.close()"><Icon name="tabler:x" class="size-5" /></button>
        </header>
        <div ref="body" class="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <FormDeal v-if="editor.req.value.kind === 'akkoord'" ref="form" :id="editor.req.value.id" :prefill="editor.req.value.prefill" />
          <FormClient v-else-if="editor.req.value.kind === 'klant'" ref="form" :id="editor.req.value.id" :prefill="editor.req.value.prefill" />
          <FormRoutine v-else-if="editor.req.value.kind === 'routine'" ref="form" :id="editor.req.value.id" :prefill="editor.req.value.prefill" />
          <FormTask v-else-if="editor.req.value.kind === 'taak'" ref="form" :id="editor.req.value.id" :prefill="editor.req.value.prefill" />
          <FormAssignment v-else-if="editor.req.value.kind === 'opdracht'" ref="form" :id="editor.req.value.id" :prefill="editor.req.value.prefill" />
          <FormLife v-else-if="editor.req.value.kind === 'admin'" ref="form" :id="editor.req.value.id" :prefill="editor.req.value.prefill" />
          <FormWorkHours v-else-if="editor.req.value.kind === 'werktijden'" ref="form" />
          <FormSleep v-else-if="editor.req.value.kind === 'slaap'" ref="form" />
          <FormEvent v-else ref="form" :id="editor.req.value.id" :prefill="editor.req.value.prefill" />
        </div>
        <footer class="flex gap-2 border-t border-line px-5 py-3.5">
          <button type="button" class="btn-ghost" @click="editor.close()">Annuleer</button>
          <button type="button" class="btn-primary ml-auto min-w-[140px]" @click="form?.save()">{{ editor.req.value.kind === 'akkoord' && !editor.req.value.id ? 'Vastleggen' : editor.req.value.id || editor.req.value.kind === 'werktijden' || editor.req.value.kind === 'slaap' ? 'Opslaan' : 'Aanmaken' }}</button>
        </footer>
      </section>
    </Transition>
  </Teleport>
</template>
