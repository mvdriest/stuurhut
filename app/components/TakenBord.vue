<script setup lang="ts">
import type { Taak } from '~/composables/useTaken'

const props = defineProps<{
  trajectId: string
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

async function taakToevoegen() {
  if (!nieuweTekst.value.trim()) return
  const body: Record<string, unknown> = { trajectId: props.trajectId, tekst: nieuweTekst.value.trim() }
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
  <div class="flex flex-col gap-8">
    <form class="flex gap-2" @submit.prevent="taakToevoegen">
      <UInput v-model="nieuweTekst" placeholder="Nieuwe taak..." class="flex-1" />
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
  grid-template-columns: repeat(auto-fit, minmax(min(16rem, 100%), 1fr));
  gap: clamp(1rem, 1.8vw, 2rem);
  align-items: start;
}

.bord__kop {
  font-family: var(--font-display);
  text-transform: uppercase;
  font-size: clamp(1.15rem, 1.6vw, 1.75rem);
  line-height: 1;
  letter-spacing: -0.01em;
  color: var(--color-stuurhut-ink);
  margin-bottom: 1rem;
}

.bord__kolom {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 6rem;
}

.taakkaart {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.25rem;
  border-radius: 1rem;
  background-color: #fff;
  box-shadow: 0 8px 22px rgb(0 0 0 / 0.07);
  cursor: grab;
}

.taakkaart:active {
  cursor: grabbing;
}

.taakkaart__duur {
  font-family: var(--font-display);
  text-transform: uppercase;
  font-size: 0.85rem;
  letter-spacing: 0.04em;
  color: var(--color-stuurhut-muted);
}

.taakkaart__acties {
  display: flex;
  gap: 0.125rem;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 150ms ease-out;
}

.taakkaart:hover .taakkaart__acties {
  opacity: 1;
}

.taakkaart__titel {
  font-family: var(--font-display);
  text-transform: uppercase;
  font-size: clamp(1.05rem, 1.35vw, 1.45rem);
  line-height: 1;
  letter-spacing: -0.01em;
  color: var(--color-stuurhut-ink);
}

.bord__leeg {
  font-size: 0.875rem;
  color: var(--color-stuurhut-muted);
}
</style>
