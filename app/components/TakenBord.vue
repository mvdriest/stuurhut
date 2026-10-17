<script setup lang="ts">
import type { Taak } from '~/composables/useTaken'
import type { Halte } from '~/composables/useHaltes'

const props = defineProps<{
  trajectId: string
  /** Route van het traject: nieuwe taken landen standaard bij de huidige halte. */
  haltes?: Halte[]
}>()

const { taken, pending, refresh: refreshTaken } = useTaken()
const { start: startFocus } = useFocusTimer()

await useAsyncData('taken-bord-init', () => refreshTaken())

const kolommen: { status: Taak['status'], label: string }[] = [
  { status: 'to_do', label: 'To-do' },
  { status: 'bezig', label: 'In progress' },
  { status: 'review', label: 'Review' },
  { status: 'klaar', label: 'Ready' }
]

function takenVanTraject() {
  return taken.value.filter(t => t.trajectId === props.trajectId)
}

function takenVoorKolom(status: Taak['status']) {
  return takenVanTraject()
    .filter(t => t.status === status)
    .sort((a, b) => a.volgorde - b.volgorde)
}

const nieuweTekst = ref('')
const nieuweDuur = ref<number | null>(null)
const nieuweHalteId = ref<string | null>(null)

const halteOpties = computed(() => [
  { label: 'Geen halte', value: null },
  ...(props.haltes ?? []).map(h => ({ label: h.titel, value: h.id }))
])

watch(() => props.haltes, (haltes) => {
  if (nieuweHalteId.value === null || !haltes?.some(h => h.id === nieuweHalteId.value)) {
    nieuweHalteId.value = haltes?.find(h => !h.afgerondOp)?.id ?? null
  }
}, { immediate: true })

function halteNaam(id: string | null) {
  return id === null ? null : props.haltes?.find(h => h.id === id)?.titel ?? null
}

async function taakToevoegen() {
  if (!nieuweTekst.value.trim()) return
  const body: Record<string, unknown> = { trajectId: props.trajectId, tekst: nieuweTekst.value.trim(), halteId: nieuweHalteId.value }
  if (nieuweDuur.value) body.geschatteDuur = nieuweDuur.value
  await $fetch('/api/taken', { method: 'POST', body })
  nieuweTekst.value = ''
  nieuweDuur.value = null
  await refreshTaken()
}

async function taakVerwijderen(id: string) {
  await $fetch(`/api/taken/${id}`, { method: 'DELETE' })
  await refreshTaken()
}

const gesleeptId = ref<string | null>(null)

function onDragStart(id: string) {
  gesleeptId.value = id
}

async function onDrop(status: Taak['status']) {
  if (gesleeptId.value === null) return
  const id = gesleeptId.value
  gesleeptId.value = null
  const taak = taken.value.find(t => t.id === id)
  if (!taak || taak.status === status) return
  await $fetch(`/api/taken/${id}`, { method: 'PATCH', body: { status } })
  await refreshTaken()
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <form class="flex flex-wrap gap-2" @submit.prevent="taakToevoegen">
      <UInput v-model="nieuweTekst" placeholder="Nieuwe taak..." class="flex-1 min-w-48" />
      <USelect v-if="haltes?.length" v-model="nieuweHalteId" :items="halteOpties" value-key="value" class="w-44" />
      <UInput v-model.number="nieuweDuur" type="number" placeholder="min" class="w-24" />
      <UButton type="submit" icon="i-lucide-plus">Toevoegen</UButton>
    </form>

    <div class="bord">
      <div
        v-for="kolom in kolommen"
        :key="kolom.status"
        class="bord__kolom"
        @dragover.prevent
        @drop="onDrop(kolom.status)"
      >
        <h3 class="bord__kop">{{ kolom.label }} ({{ takenVoorKolom(kolom.status).length }})</h3>

        <article
          v-for="taak in takenVoorKolom(kolom.status)"
          :key="taak.id"
          class="taakkaart"
          draggable="true"
          @dragstart="onDragStart(taak.id)"
        >
          <div class="flex items-start justify-between gap-2">
            <span class="taakkaart__duur">{{ taak.geschatteDuur }} min</span>
            <div class="taakkaart__acties">
              <UButton icon="i-lucide-timer" size="xs" color="neutral" variant="ghost" @click="startFocus({ trajectId: trajectId, subtaakId: taak.id })" />
              <UButton icon="i-lucide-trash-2" size="xs" color="error" variant="ghost" @click="taakVerwijderen(taak.id)" />
            </div>
          </div>
          <p class="taakkaart__titel">{{ taak.tekst }}</p>
          <span v-if="halteNaam(taak.halteId)" class="taakkaart__halte"><UIcon name="i-lucide-map-pin" class="size-3" /> {{ halteNaam(taak.halteId) }}</span>
        </article>

        <p v-if="takenVoorKolom(kolom.status).length === 0" class="bord__leeg">Leeg</p>
      </div>
    </div>

    <p v-if="!pending && takenVanTraject().length === 0" class="text-sm text-stuurhut-muted">
      Nog geen taken voor dit traject.
    </p>
  </div>
</template>

<style scoped>
.bord {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(15rem, 100%), 1fr));
  gap: 0.75rem;
  align-items: start;
}

.bord__kolom {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 8rem;
  padding: 0.9rem;
  border-radius: 1.25rem;
  background: rgb(253 250 244 / 0.55);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.bord__kop {
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.1rem 0.25rem 0.4rem;
}

.taakkaart {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.85rem 1rem;
  border-radius: 1rem;
  background: var(--color-stuurhut-glas);
  box-shadow: 0 6px 18px rgb(30 40 50 / 0.1);
  cursor: grab;
}

.taakkaart:active {
  cursor: grabbing;
}

.taakkaart__duur {
  font-size: 0.75rem;
  color: var(--color-stuurhut-muted);
}

.taakkaart__acties {
  display: flex;
  gap: 0.125rem;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 150ms ease-out;
}

.taakkaart:hover .taakkaart__acties,
.taakkaart:focus-within .taakkaart__acties {
  opacity: 1;
}

.taakkaart__titel {
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1.3;
}

.taakkaart__halte {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  align-self: flex-start;
  padding: 0.1rem 0.5rem;
  border-radius: 9999px;
  background: var(--color-stuurhut-subtle);
  font-size: 0.7rem;
  color: var(--color-stuurhut-muted);
}

.bord__leeg {
  padding: 0 0.25rem;
  font-size: 0.8rem;
  color: var(--color-stuurhut-muted);
}
</style>
