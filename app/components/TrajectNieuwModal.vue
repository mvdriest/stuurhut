<script setup lang="ts">
import type { Traject } from '~/composables/useTrajecten'

// Het "Nieuw traject"-venster, globaal gemount in app.vue zodat het vanaf de
// trajectenpagina én vanuit het ⌘K-snelmenu te openen is.
const { nieuwTrajectOpen, nieuwTrajectZin } = useSnelMenu()
const { refresh } = useTrajecten()
const { refresh: refreshHaltes } = useHaltes()

async function maakTraject(payload: Record<string, unknown>) {
  const traject = await $fetch<Traject>('/api/trajecten', { method: 'POST', body: payload })
  nieuwTrajectOpen.value = false
  await Promise.all([refresh(), refreshHaltes()])
  await navigateTo(`/trajecten/${traject.id}`)
}
</script>

<template>
  <UModal v-model:open="nieuwTrajectOpen" title="Nieuw traject" description="Beschrijf het in een zin, of vul alleen de naam in. De rest kan later in het dossier.">
    <template #body>
      <TrajectNieuw :start-zin="nieuwTrajectZin" @submit="maakTraject" @cancel="nieuwTrajectOpen = false" />
    </template>
  </UModal>
</template>
