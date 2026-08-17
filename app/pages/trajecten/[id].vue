<script setup lang="ts">
import { TRAJECT_STATUS_STYLES } from '~/utils/trajectStatus'

definePageMeta({
  pageTransition: { name: 'stuurhut-nav', mode: 'out-in' }
})

const route = useRoute()
const trajectId = computed(() => String(route.params.id))

const { trajecten, refresh: refreshTrajecten } = useTrajecten()

await useAsyncData('traject-detail-init', () => refreshTrajecten())

const traject = computed(() => trajecten.value.find(t => t.id === trajectId.value))

const activeSection = ref('taken')

const secties = [
  { key: 'taken', label: 'Taken' },
  { key: 'meetings', label: 'Meetings' },
  { key: 'offertes', label: 'Offertes' },
  { key: 'overig', label: 'Overig' }
]
</script>

<template>
  <div class="bg-stuurhut-mist min-h-screen">
    <AppHeaderFoto
      compact
      :titel="traject?.naam ?? 'Traject'"
      :subtitel="traject ? TRAJECT_STATUS_STYLES[traject.status].label : undefined"
    />
    <div v-if="traject" class="h-2" :style="{ backgroundColor: trajectKleurHex[traject.kleur] }" />

    <div class="stuurhut-kolom flex flex-col gap-6 py-[clamp(2rem,5vw,4rem)]">
      <SectieTabs
        v-if="traject"
        v-model="activeSection"
        :secties="secties"
        :color="trajectKleurHex[traject.kleur]"
        :text-color="trajectTekstKleur(traject.kleur)"
      />

      <Transition name="panel-fade" mode="out-in">
        <TakenBord v-if="activeSection === 'taken'" key="taken" :traject-id="trajectId" />

        <div v-else-if="activeSection === 'meetings'" key="meetings" class="rounded-2xl border border-dashed border-black/20 p-10 text-center">
          <p class="text-sm text-stuurhut-muted">Meetings — nog niet gebouwd.</p>
        </div>

        <div v-else-if="activeSection === 'offertes'" key="offertes" class="rounded-2xl border border-dashed border-black/20 p-10 text-center">
          <p class="text-sm text-stuurhut-muted">Offertes — nog niet gebouwd.</p>
        </div>

        <div v-else key="overig" class="rounded-2xl bg-white p-6 flex flex-col gap-4">
          <div v-if="traject">
            <p class="text-xs uppercase tracking-widest text-stuurhut-muted mb-1">Status</p>
            <UBadge :color="TRAJECT_STATUS_STYLES[traject.status].color" variant="subtle">
              {{ TRAJECT_STATUS_STYLES[traject.status].label }}
            </UBadge>
          </div>
          <div>
            <p class="text-xs uppercase tracking-widest text-stuurhut-muted mb-1">Eerstvolgende actie</p>
            <p class="text-sm">{{ traject?.eerstvolgendeActie || 'Geen eerstvolgende actie ingesteld.' }}</p>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.panel-fade-enter-active,
.panel-fade-leave-active {
  transition: opacity 180ms ease;
}
.panel-fade-enter-from,
.panel-fade-leave-to {
  opacity: 0;
}
</style>
