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

// "Ready" is een dagoverzicht: alleen wat vandaag is afgerond, niet de hele historie.
function hoortBijVandaag(taak: Taak) {
  if (taak.status !== 'klaar') return true
  return taak.klaarOp !== null && nederlandseDatum(taak.klaarOp) === nederlandseDatum()
}

function takenVoorKolom(status: Taak['status']) {
  return taken.value
    .filter(t => t.status === status && hoortBijVandaag(t))
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
  <section class="vandaag stuurhut-kolom">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="sh-kicker">Over alle trajecten</p>
        <h2 class="sh-titel text-[clamp(1.75rem,3vw,2.5rem)] mt-1">Takenbord</h2>
      </div>

      <form class="flex flex-wrap gap-2 items-center pb-2" @submit.prevent="taakToevoegen">
        <UInput v-model="nieuweTekst" placeholder="Nieuwe taak..." class="w-56" />
        <USelectMenu v-model="nieuwTrajectId" :items="trajectOpties" value-key="value" class="w-44" />
        <UButton type="submit" icon="i-lucide-plus" />
      </form>
    </div>

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
.vandaag__bord {
  display: grid;
  grid-template-columns: repeat(4, minmax(15rem, 1fr));
  gap: 0.75rem;
  margin-top: 1.25rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
  align-items: start;
}

.vandaag__kolom {
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

.vandaag__kop {
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.1rem 0.25rem 0.4rem;
}

.taakkaart {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.85rem 1rem;
  border-radius: 1rem;
  background: var(--color-stuurhut-glas);
  box-shadow: 0 6px 18px rgb(30 40 50 / 0.1);
  cursor: grab;
}

.taakkaart:active {
  cursor: grabbing;
}

.taakkaart__pil {
  border-radius: 9999px;
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1;
  padding: 0.35em 0.7em;
}

.taakkaart__pil--leeg {
  background-color: var(--color-stuurhut-subtle);
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

.vandaag__leeg {
  padding: 0 0.25rem;
  font-size: 0.8rem;
  color: var(--color-stuurhut-muted);
}
</style>
