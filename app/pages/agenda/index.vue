<script setup lang="ts">
import type { AgendaDag, AgendaItem } from '~/utils/agenda'

definePageMeta({
  pageTransition: { name: 'stuurhut-nav', mode: 'out-in' }
})

const { periode, taken: geplandeTaken, refresh: refreshWeekplanning } = useWeekplanning()
const { afspraken, refresh: refreshAfspraken } = useAfspraken()
const { trajecten, refresh: refreshTrajecten } = useTrajecten()

await useAsyncData('agenda-init', () => Promise.all([refreshWeekplanning(), refreshAfspraken(), refreshTrajecten()]))

const WEEKDAG_LABELS = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za']

function vandaag(): string {
  return new Date().toLocaleDateString('en-CA')
}

function tijdNaarMinuten(tijd: string | null): number | null {
  if (!tijd) return null
  const [u, m] = tijd.split(':').map(Number)
  return (u ?? 0) * 60 + (m ?? 0)
}

function itemsVoorDag(datum: string): AgendaItem[] {
  const uitGepland: AgendaItem[] = geplandeTaken.value
    .filter(t => t.datum === datum)
    .map(t => ({
      id: `gepland-${t.id}`,
      titel: t.omschrijving,
      categorie: t.trajectId ? 'klantwerk' : (t.blokType === 'zakelijk' ? 'eigen_werk' : 'prive'),
      startMin: tijdNaarMinuten(t.startTijd),
      duurMin: t.geschatteDuur,
      contextLabel: t.trajectNaam
    }))

  const uitAfspraken: AgendaItem[] = afspraken.value
    .filter(a => a.datum === datum)
    .map((a) => {
      const start = tijdNaarMinuten(a.startTijd) ?? 0
      const eind = tijdNaarMinuten(a.eindTijd) ?? start
      const traject = a.trajectId ? trajecten.value.find(t => t.id === a.trajectId) : undefined
      return {
        id: `afspraak-${a.id}`,
        titel: a.titel,
        categorie: a.categorie,
        startMin: start,
        duurMin: Math.max(15, eind - start),
        contextLabel: traject?.naam ?? null
      }
    })

  return [...uitGepland, ...uitAfspraken]
}

function maakDag(datum: string): AgendaDag {
  const d = new Date(`${datum}T00:00:00`)
  return {
    datum,
    weekdagLabel: WEEKDAG_LABELS[d.getDay()]!,
    dagLabel: String(d.getDate()),
    vandaag: datum === vandaag(),
    items: itemsVoorDag(datum)
  }
}

const weergave = ref<'dag' | 'week' | 'maand'>('week')
const geselecteerdeDag = ref(vandaag())

const weekDagen = computed(() => periode.value.map(maakDag))
const dagDagen = computed(() => [maakDag(geselecteerdeDag.value)])

const geselecteerdeDagLabel = computed(() =>
  new Date(`${geselecteerdeDag.value}T00:00:00`).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
)

const weekRangeLabel = computed(() => {
  if (!periode.value.length) return ''
  const eerste = new Date(`${periode.value[0]}T00:00:00`)
  const laatste = new Date(`${periode.value[periode.value.length - 1]}T00:00:00`)
  return `${eerste.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })} — ${laatste.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}`
})

// Maandweergave: alleen afspraken zijn voor elke datum bekend (geplande_taken beperkt
// zich tot de rollende week van AI-weekplanning) — dat is een bewuste vereenvoudiging.
const maandCursor = ref(new Date(`${vandaag()}T00:00:00`))

const maandDagen = computed(() => {
  const jaar = maandCursor.value.getFullYear()
  const maand = maandCursor.value.getMonth()
  const eersteVanMaand = new Date(jaar, maand, 1)
  const startOffset = (eersteVanMaand.getDay() + 6) % 7 // maandag = 0
  const start = new Date(eersteVanMaand)
  start.setDate(start.getDate() - startOffset)

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const datum = d.toLocaleDateString('en-CA')
    return {
      datum,
      dagLabel: d.getDate(),
      inMaand: d.getMonth() === maand,
      vandaag: datum === vandaag(),
      items: itemsVoorDag(datum)
    }
  })
})

const maandLabel = computed(() => maandCursor.value.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' }))

function maandVorige() {
  maandCursor.value = new Date(maandCursor.value.getFullYear(), maandCursor.value.getMonth() - 1, 1)
}
function maandVolgende() {
  maandCursor.value = new Date(maandCursor.value.getFullYear(), maandCursor.value.getMonth() + 1, 1)
}
function kiesDag(datum: string) {
  geselecteerdeDag.value = datum
  weergave.value = 'dag'
}

const legenda = [
  { label: 'Klantwerk', klasse: 'agendagrid__item--klantwerk' },
  { label: 'Eigen werk', klasse: 'agendagrid__item--eigen_werk' },
  { label: 'Privé', klasse: 'agendagrid__item--prive' }
]

const isToevoegen = ref(false)
const nieuwTitel = ref('')
const nieuwCategorie = ref<'klantwerk' | 'eigen_werk' | 'prive'>('eigen_werk')
const nieuwTrajectId = ref<string | null>(null)
const nieuwDatum = ref(vandaag())
const nieuwStart = ref('09:00')
const nieuwEind = ref('10:00')

const trajectOpties = computed(() => [
  { label: 'Geen traject', value: null },
  ...trajecten.value.map(t => ({ label: t.naam, value: t.id }))
])

async function afspraakToevoegen() {
  if (!nieuwTitel.value.trim()) return
  await $fetch('/api/afspraken', {
    method: 'POST',
    body: {
      titel: nieuwTitel.value.trim(),
      categorie: nieuwCategorie.value,
      trajectId: nieuwCategorie.value === 'klantwerk' ? nieuwTrajectId.value : null,
      datum: nieuwDatum.value,
      startTijd: nieuwStart.value,
      eindTijd: nieuwEind.value
    }
  })
  nieuwTitel.value = ''
  isToevoegen.value = false
  await refreshAfspraken()
}
</script>

<template>
  <div class="bg-stuurhut-mist min-h-screen">
    <AppHeaderFoto compact titel="Agenda" subtitel="Zakelijk en privé in één overzicht." />

    <div class="stuurhut-kolom flex flex-col gap-5 py-[clamp(2rem,5vw,4rem)]">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <span class="text-sm text-stuurhut-muted">
          {{ weergave === 'maand' ? maandLabel : weergave === 'dag' ? geselecteerdeDagLabel : weekRangeLabel }}
        </span>
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1 rounded-full bg-black/5 p-1">
            <button
              v-for="mode in [{ key: 'dag', label: 'Dag' }, { key: 'week', label: 'Week' }, { key: 'maand', label: 'Maand' }]"
              :key="mode.key"
              type="button"
              class="agenda__modus"
              :class="{ 'agenda__modus--actief': weergave === mode.key }"
              @click="weergave = mode.key as typeof weergave"
            >
              {{ mode.label }}
            </button>
          </div>
          <UButton icon="i-lucide-plus" class="rounded-full" @click="isToevoegen = !isToevoegen">Toevoegen</UButton>
        </div>
      </div>

      <div v-if="isToevoegen" class="rounded-2xl bg-white p-5 shadow-sm text-stuurhut-ink">
        <form class="flex flex-col gap-3" @submit.prevent="afspraakToevoegen">
          <UInput v-model="nieuwTitel" placeholder="Titel" autofocus />
          <div class="flex flex-wrap gap-2">
            <USelect v-model="nieuwCategorie" :items="[{ label: 'Klantwerk', value: 'klantwerk' }, { label: 'Eigen werk', value: 'eigen_werk' }, { label: 'Privé', value: 'prive' }]" value-key="value" class="w-40" />
            <USelect v-if="nieuwCategorie === 'klantwerk'" v-model="nieuwTrajectId" :items="trajectOpties" value-key="value" class="w-48" />
            <UInput v-model="nieuwDatum" type="date" class="w-40" />
            <UInput v-model="nieuwStart" type="time" class="w-28" />
            <UInput v-model="nieuwEind" type="time" class="w-28" />
          </div>
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" @click="isToevoegen = false">Annuleren</UButton>
            <UButton type="submit">Toevoegen</UButton>
          </div>
        </form>
      </div>

      <AgendaGrid v-if="weergave === 'week'" :dagen="weekDagen" />

      <template v-else-if="weergave === 'dag'">
        <div class="flex gap-1.5 flex-wrap">
          <button
            v-for="d in periode"
            :key="d"
            type="button"
            class="agenda__dagpil"
            :class="{ 'agenda__dagpil--actief': d === geselecteerdeDag }"
            @click="geselecteerdeDag = d"
          >
            {{ new Date(`${d}T00:00:00`).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric' }) }}
          </button>
        </div>
        <AgendaGrid :dagen="dagDagen" />
      </template>

      <template v-else>
        <div class="flex items-center justify-between">
          <UButton icon="i-lucide-chevron-left" size="sm" color="neutral" variant="ghost" @click="maandVorige" />
          <span class="font-semibold capitalize">{{ maandLabel }}</span>
          <UButton icon="i-lucide-chevron-right" size="sm" color="neutral" variant="ghost" @click="maandVolgende" />
        </div>
        <div class="agenda__maand">
          <div v-for="wd in WEEKDAG_LABELS.slice(1).concat(WEEKDAG_LABELS[0]!)" :key="wd" class="agenda__maand-wd">{{ wd }}</div>
          <button
            v-for="dag in maandDagen"
            :key="dag.datum"
            type="button"
            class="agenda__maand-dag"
            :class="{ 'agenda__maand-dag--buiten': !dag.inMaand, 'agenda__maand-dag--vandaag': dag.vandaag }"
            @click="kiesDag(dag.datum)"
          >
            <span>{{ dag.dagLabel }}</span>
            <span v-if="dag.items.length" class="agenda__maand-stip" />
          </button>
        </div>
      </template>

      <div class="flex flex-wrap gap-4">
        <span v-for="l in legenda" :key="l.label" class="flex items-center gap-1.5 text-xs text-stuurhut-muted">
          <span class="size-2 rounded-sm" :class="l.klasse" />{{ l.label }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.agenda__modus {
  font-family: var(--font-display);
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.02em;
  padding: 0.45rem 0.9rem;
  border-radius: 9999px;
  color: var(--color-stuurhut-muted);
}

.agenda__modus--actief {
  background-color: var(--color-stuurhut-ink);
  color: #fff;
}

.agenda__dagpil {
  font-size: 0.8125rem;
  font-weight: 600;
  padding: 0.4rem 0.85rem;
  border-radius: 9999px;
  background-color: #fff;
  color: var(--color-stuurhut-ink);
}

.agenda__dagpil--actief {
  background-color: var(--color-stuurhut-ink);
  color: #fff;
}

.agenda__maand {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.375rem;
  background-color: #fff;
  border-radius: 1.25rem;
  padding: 1rem;
  box-shadow: 0 10px 26px rgb(0 0 0 / 0.08);
}

.agenda__maand-wd {
  text-align: center;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-stuurhut-muted);
  padding-bottom: 0.5rem;
}

.agenda__maand-dag {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  color: var(--color-stuurhut-ink);
}

.agenda__maand-dag:hover {
  background-color: var(--color-stuurhut-mist);
}

.agenda__maand-dag--buiten {
  color: rgb(0 0 0 / 0.28);
}

.agenda__maand-dag--vandaag {
  font-weight: 700;
  box-shadow: inset 0 0 0 2px var(--color-stuurhut-ink);
}

.agenda__maand-stip {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: var(--color-stuurhut-ink);
}
</style>
