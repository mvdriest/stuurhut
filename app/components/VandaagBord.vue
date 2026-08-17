<script setup lang="ts">
import type { Taak } from '~/composables/useTaken'
import { trajectKleurHex, trajectTekstKleur } from '~/utils/kleuren'

const { taken, refresh: refreshTaken } = useTaken()
const { trajecten, refresh: refreshTrajecten } = useTrajecten()
const { start: startFocus } = useFocusTimer()

await useAsyncData('vandaag-bord-init', () => Promise.all([refreshTaken(), refreshTrajecten()]))

const KOLOMMEN: { status: Taak['status'], label: string }[] = [
  { status: 'to_do', label: 'To-do' },
  { status: 'bezig', label: 'In progress' },
  { status: 'review', label: 'Review' },
  { status: 'klaar', label: 'Ready' }
]

function takenVoorKolom(status: Taak['status']) {
  return taken.value
    .filter(t => t.status === status)
    .sort((a, b) => a.volgorde - b.volgorde)
}

function traject(trajectId: string | null) {
  return trajectId === null ? undefined : trajecten.value.find(t => t.id === trajectId)
}

const nieuweTekst = ref('')
const nieuwTrajectId = ref<string | null>(null)

async function taakToevoegen() {
  if (!nieuweTekst.value.trim()) return
  await $fetch('/api/taken', {
    method: 'POST',
    body: { trajectId: nieuwTrajectId.value, tekst: nieuweTekst.value.trim() }
  })
  nieuweTekst.value = ''
  await refreshTaken()
}

async function taakVerwijderen(id: string) {
  await $fetch(`/api/taken/${id}`, { method: 'DELETE' })
  await refreshTaken()
}

const gesleeptId = ref<string | null>(null)

async function onDrop(status: Taak['status']) {
  if (gesleeptId.value === null) return
  const id = gesleeptId.value
  gesleeptId.value = null
  const taak = taken.value.find(t => t.id === id)
  if (!taak || taak.status === status) return
  await $fetch(`/api/taken/${id}`, { method: 'PATCH', body: { status } })
  await refreshTaken()
}

const trajectOpties = computed(() => [
  { label: 'Geen traject', value: null },
  ...trajecten.value.map(t => ({ label: t.naam, value: t.id }))
])
</script>

<template>
  <section class="vandaag">
    <div class="stuurhut-kolom flex flex-wrap items-end justify-between gap-4">
      <h2 class="stuurhut-titel">Vandaag</h2>

      <form class="flex flex-wrap gap-2 items-center pb-2" @submit.prevent="taakToevoegen">
        <UInput v-model="nieuweTekst" placeholder="Nieuwe taak..." class="w-56" />
        <USelectMenu v-model="nieuwTrajectId" :items="trajectOpties" value-key="value" class="w-44" />
        <UButton type="submit" icon="i-lucide-plus" />
      </form>
    </div>

    <!-- Het bord loopt bewust door tot voorbij de rechterrand: er is meer dan past. -->
    <div class="vandaag__bord">
      <div
        v-for="kolom in KOLOMMEN"
        :key="kolom.status"
        class="vandaag__kolom"
        @dragover.prevent
        @drop="onDrop(kolom.status)"
      >
        <h3 class="vandaag__kop">{{ kolom.label }} ({{ takenVoorKolom(kolom.status).length }})</h3>

        <article
          v-for="taak in takenVoorKolom(kolom.status)"
          :key="taak.id"
          class="taakkaart"
          draggable="true"
          @dragstart="gesleeptId = taak.id"
        >
          <div class="flex items-start justify-between gap-2">
            <span
              v-if="traject(taak.trajectId)"
              class="taakkaart__pil"
              :style="{
                backgroundColor: trajectKleurHex[traject(taak.trajectId)!.kleur],
                color: trajectTekstKleur(traject(taak.trajectId)!.kleur)
              }"
            >
              {{ traject(taak.trajectId)!.naam }}
            </span>
            <span v-else class="taakkaart__pil taakkaart__pil--leeg">Los</span>

            <div class="taakkaart__acties">
              <UButton icon="i-lucide-timer" size="xs" color="neutral" variant="ghost" @click="startFocus({ trajectId: taak.trajectId, subtaakId: taak.id })" />
              <UButton icon="i-lucide-trash-2" size="xs" color="error" variant="ghost" @click="taakVerwijderen(taak.id)" />
            </div>
          </div>

          <p class="taakkaart__titel">{{ taak.tekst }}</p>
        </article>

        <p v-if="takenVoorKolom(kolom.status).length === 0" class="vandaag__leeg">Leeg</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.vandaag {
  padding-block: clamp(3rem, 7vw, 7rem);
}

.vandaag__kop {
  font-family: var(--font-display);
  text-transform: uppercase;
  font-size: clamp(1.5rem, 2.3vw, 2.6rem);
  line-height: 1;
  letter-spacing: -0.01em;
  color: var(--color-stuurhut-ink);
  margin-bottom: 1.5rem;
}

.vandaag__bord {
  display: flex;
  gap: clamp(1rem, 2.3vw, 2.75rem);
  margin-top: clamp(2rem, 4vw, 4rem);
  padding-inline: clamp(1.25rem, 8.34vw, 10rem);
  overflow-x: auto;
  scrollbar-width: thin;
}

.vandaag__kolom {
  flex: 0 0 min(28rem, 78vw);
  display: flex;
  flex-direction: column;
  gap: clamp(1rem, 1.6vw, 1.75rem);
}

.taakkaart {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: clamp(1.25rem, 1.8vw, 2rem);
  border-radius: 1.25rem;
  background-color: #fff;
  box-shadow: 0 10px 26px rgb(0 0 0 / 0.08);
  cursor: grab;
}

.taakkaart:active {
  cursor: grabbing;
}

.taakkaart__pil {
  border-radius: 9999px;
  font-family: var(--font-display);
  text-transform: uppercase;
  font-size: clamp(0.875rem, 1vw, 1.125rem);
  line-height: 1;
  padding: 0.75em 1.35em;
}

.taakkaart__pil--leeg {
  background-color: #e4e4e4;
  color: var(--color-stuurhut-ink);
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
  font-size: clamp(1.35rem, 1.9vw, 2.15rem);
  line-height: 0.98;
  letter-spacing: -0.01em;
  color: var(--color-stuurhut-ink);
}

.vandaag__leeg {
  font-size: 0.875rem;
  color: var(--color-stuurhut-muted);
}
</style>
