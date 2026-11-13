<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })
const docked = defineModel<boolean>('docked', { default: true })
const isXl = useMediaQuery('(min-width: 1440px)')
const isMd = useMediaQuery('(min-width: 768px)')
const { current } = useStuurman()
const route = useRoute()
watch(() => route.path, () => { if (!isXl.value) open.value = false })

const showDocked = computed(() => isXl.value && docked.value)
const showFab = computed(() => !showDocked.value)

function openPanel() {
  if (isXl.value) docked.value = true
  else open.value = true
}
onKeyStroke('Escape', () => { open.value = false })
</script>

<template>
  <!-- Desktop: vast paneel rechts -->
  <aside v-if="showDocked" class="fixed inset-y-0 right-0 z-30 w-[340px] border-l border-line bg-surface" aria-label="Stuurman">
    <StuurmanPanel close-label="Stuurman inklappen" close-icon="tabler:layout-sidebar-right" @close="docked = false" />
  </aside>

  <!-- Zwevende knop -->
  <button
    v-if="showFab && !open"
    type="button"
    class="fixed z-40 flex items-center gap-2 rounded-full bg-primary p-2 md:pr-4 text-on-primary shadow-float min-h-14 right-4 bottom-[calc(80px+env(safe-area-inset-bottom))] md:bottom-6 md:right-6"
    aria-label="Open Stuurman"
    @click="openPanel"
  >
    <span class="grid size-10 place-items-center"><Icon name="tabler:steering-wheel" class="size-6" /></span>
    <span class="hidden text-[15px] font-semibold md:inline">{{ AI_NAME }}</span>
    <span v-if="current.length" class="num absolute -right-1 -top-1 md:static grid size-6 place-items-center rounded-full bg-copper text-[12px] text-on-copper">{{ current.length }}</span>
  </button>

  <!-- iPad en iPhone: schuifpaneel / bottom sheet -->
  <Teleport to="body">
    <Transition enter-from-class="opacity-0" leave-to-class="opacity-0" enter-active-class="transition-opacity duration-200" leave-active-class="transition-opacity duration-200">
      <div v-if="open && !showDocked" class="fixed inset-0 z-[55] bg-black/30" @click="open = false" />
    </Transition>
    <Transition
      :enter-from-class="isMd ? 'translate-x-6 opacity-0' : 'translate-y-8 opacity-0'"
      :leave-to-class="isMd ? 'translate-x-6 opacity-0' : 'translate-y-8 opacity-0'"
      enter-active-class="transition duration-300 ease-out"
      leave-active-class="transition duration-200 ease-in"
    >
      <aside
        v-if="open && !showDocked"
        class="fixed z-[60] bg-surface shadow-float border border-line overflow-hidden"
        :class="isMd ? 'right-4 top-4 bottom-4 w-[380px] rounded-card' : 'inset-x-0 bottom-0 h-[86dvh] rounded-t-[30px] pb-safe'"
        role="dialog"
        aria-modal="true"
        aria-label="Stuurman"
      >
        <div v-if="!isMd" class="mx-auto mt-2 h-1.5 w-10 rounded-full bg-surface-3" aria-hidden="true" />
        <StuurmanPanel @close="open = false" />
      </aside>
    </Transition>
  </Teleport>
</template>
