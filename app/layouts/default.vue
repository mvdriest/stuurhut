<script setup lang="ts">
const { open } = useStuurman()
const docked = useLocalStorage('stuurhut:panel-docked', true)
provide('panelDocked', docked)
// Het vaste eerste werkblok schuift mee met je opstaantijd
const sleep = useSleep()
onMounted(() => { sleep.ensureWeek(); sleep.syncAnchors() })
watch(() => sleep.plan.value, () => sleep.syncAnchors(), { deep: true })
</script>

<template>
  <div class="min-h-dvh">
    <AppRail />

    <main
      class="md:pl-[76px] xl:pl-[240px] pb-[calc(96px+env(safe-area-inset-bottom))] md:pb-12 transition-[padding] duration-300"
      :class="docked ? 'min-[1440px]:pr-[340px]' : ''"
    >
      <div class="mx-auto w-full max-w-[1180px] px-4 sm:px-6 md:px-8 pt-[calc(env(safe-area-inset-top)+16px)] md:pt-7">
        <slot />
      </div>
    </main>

    <StuurmanDock v-model:open="open" v-model:docked="docked" />
    <AppTabbar />
    <EditorSheet />
    <ToastHost />
  </div>
</template>
