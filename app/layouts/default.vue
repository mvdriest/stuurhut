<script setup lang="ts">
const { open } = useStuurman()
const docked = useLocalStorage('stuurhut:panel-docked', true)
provide('panelDocked', docked)
// Het vaste eerste werkblok schuift mee met je opstaantijd
const sleep = useSleep()
// Je eigen data komt uit Supabase. Pas als die er is, mag de app iets aanpassen.
const sync = useSync()
const { mode } = useStore()
onMounted(() => sync.start())
const ready = computed(() => mode.value === 'demo' || sync.ready.value)
watch(ready, (r) => { if (r) { sleep.ensureWeek(); sleep.syncAnchors() } }, { immediate: true })
watch(() => sleep.plan.value, () => { if (ready.value) sleep.syncAnchors() }, { deep: true })
</script>

<template>
  <div class="min-h-dvh">
    <AppRail />

    <main
      class="md:pl-[76px] xl:pl-[240px] pb-[calc(96px+env(safe-area-inset-bottom))] md:pb-12 transition-[padding] duration-300"
      :class="docked ? 'min-[1440px]:pr-[340px]' : ''"
    >
      <div class="mx-auto w-full max-w-[1180px] px-4 sm:px-6 md:px-8 pt-[calc(env(safe-area-inset-top)+16px)] md:pt-7">
        <slot v-if="ready" />
        <div v-else class="grid min-h-[60dvh] place-items-center text-center">
          <div v-if="sync.error.value" class="max-w-sm space-y-3">
            <p class="text-[17px]">Je data kon niet geladen worden.</p>
            <p class="text-[13.5px] text-muted">{{ sync.error.value }}</p>
            <button type="button" class="btn-primary" @click="sync.reload()">Opnieuw proberen</button>
          </div>
          <p v-else class="text-[15px] text-muted">Je data ophalen…</p>
        </div>
      </div>
    </main>

    <StuurmanDock v-model:open="open" v-model:docked="docked" />
    <AppTabbar />
    <EditorSheet />
    <ToastHost />
  </div>
</template>
