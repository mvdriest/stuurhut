<script setup lang="ts">
// "+ Nieuw": Iets kwijt, taak, afspraak, klant of routine.
const editor = useEditor()
const open = ref(false)
const root = ref<HTMLElement | null>(null)
onClickOutside(root, () => { open.value = false })
onKeyStroke('Escape', () => { open.value = false })
function pick(kind: (typeof CREATE_ITEMS)[number]['kind']) {
  open.value = false
  editor.open({ kind })
}
</script>

<template>
  <div ref="root" class="relative">
    <button type="button" class="btn-primary !min-h-11 w-full !px-0 xl:!px-4 xl:justify-start" :aria-expanded="open" aria-haspopup="menu" aria-label="Nieuw" @click="open = !open">
      <Icon name="tabler:plus" class="size-5" />
      <span class="hidden flex-1 text-left xl:inline">Nieuw</span>
      <Icon name="tabler:chevron-down" class="hidden size-4 transition-transform xl:inline" :class="open ? 'rotate-180' : ''" />
    </button>
    <Transition enter-from-class="opacity-0 -translate-y-1" enter-active-class="transition duration-150 ease-out" leave-to-class="opacity-0" leave-active-class="transition duration-100">
      <div v-if="open" class="absolute left-0 top-[calc(100%+6px)] z-50 w-[230px] rounded-[16px] border border-line bg-surface p-1.5 shadow-float" role="menu">
        <NuxtLink to="/hoofd-leeg" class="flex min-h-11 items-center gap-3 rounded-[12px] px-2.5 text-[15px] hover:bg-surface-2" role="menuitem" @click="open = false">
          <span class="grid size-8 place-items-center rounded-[10px] bg-surface-2"><Icon name="tabler:inbox" class="size-4" /></span>Iets kwijt
        </NuxtLink>
        <div class="my-1 h-px bg-line" />
        <button v-for="c in CREATE_ITEMS" :key="c.kind" type="button" class="flex min-h-11 w-full items-center gap-3 rounded-[12px] px-2.5 text-left text-[15px] hover:bg-surface-2" role="menuitem" @click="pick(c.kind)">
          <span class="grid size-8 place-items-center rounded-[10px] text-cat-ink" :class="c.fill"><Icon :name="c.icon" class="size-4" /></span>{{ c.label }}
        </button>
      </div>
    </Transition>
  </div>
</template>
