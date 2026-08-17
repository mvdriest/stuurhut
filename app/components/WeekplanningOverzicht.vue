<script setup lang="ts">
import type { GeplandeTaak } from '~/composables/useWeekplanning'
import type { DagBlok } from '~/composables/useDagindeling'

const { periode, taken, pending, genererend, herplannend, refresh, genereer, herplan, bijwerken } = useWeekplanning()
const { blokken: dagBlokken, refresh: refreshDagindeling } = useDagindeling()

await useAsyncData('weekplanning-init', () => Promise.all([refresh(), refreshDagindeling()]))

const error = ref('')
const redenTekst = ref('')
const instellingenOpen = ref(false)

const dagLabels = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']

function weekdagVan(datum: string): number {
  const jsDag = new Date(`${datum}T00:00:00`).getDay()
  return jsDag === 0 ? 7 : jsDag
}

function dagLabel(datum: string): string {
  const label = dagLabels[new Date(`${datum}T00:00:00`).getDay()]
  const [, maand, dag] = datum.split('-')
  return `${label!.charAt(0).toUpperCase()}${label!.slice(1)} ${dag}/${maand}`
}

function blokkenVoorDag(datum: string): DagBlok[] {
  const weekdag = weekdagVan(datum)
  return dagBlokken.value
    .filter(b => b.weekdag === weekdag)
    .sort((a, b) => a.volgorde - b.volgorde)
}

function takenVoor(datum: string, blokType: string): GeplandeTaak[] {
  return taken.value
    .filter(t => t.datum === datum && t.blokType === blokType)
    .sort((a, b) => a.volgorde - b.volgorde)
}

async function onGenereer() {
  error.value = ''
  try {
    await genereer()
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Er ging iets mis bij het genereren van de weekplanning.'
  }
}

async function onHerplan() {
  if (!redenTekst.value.trim()) return
  error.value = ''
  try {
    await herplan(redenTekst.value.trim())
    redenTekst.value = ''
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Er ging iets mis bij het herplannen.'
  }
}

async function vastzetten(taak: GeplandeTaak) {
  await bijwerken(taak.id, { status: taak.status === 'bevestigd' ? 'gepland' : 'bevestigd' })
}

async function afronden(taak: GeplandeTaak) {
  await bijwerken(taak.id, { status: taak.status === 'klaar' ? 'gepland' : 'klaar' })
}

const gesleeptId = ref<string | null>(null)

function onDragStart(taak: GeplandeTaak) {
  gesleeptId.value = taak.id
}

async function onDrop(datum: string, blokType: 'prive' | 'zakelijk') {
  if (gesleeptId.value === null) return
  const id = gesleeptId.value
  gesleeptId.value = null
  const taak = taken.value.find(t => t.id === id)
  if (!taak || taak.status === 'bevestigd') return
  if (taak.datum === datum && taak.blokType === blokType) return
  await bijwerken(id, { datum, blokType })
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between flex-wrap gap-2">
        <h2 class="font-semibold">Weekplanning</h2>
        <div class="flex items-center gap-2">
          <UButton size="sm" color="neutral" variant="ghost" icon="i-lucide-settings" @click="instellingenOpen = !instellingenOpen">
            Dagindeling
          </UButton>
          <UButton size="sm" icon="i-lucide-sparkles" :loading="genererend" @click="onGenereer">
            Plan mijn week
          </UButton>
        </div>
      </div>
    </template>

    <div v-if="instellingenOpen" class="mb-4 pb-4 border-b border-default">
      <DagindelingInstellingen />
    </div>

    <UAlert v-if="error" color="error" variant="soft" :title="error" class="mb-3" />

    <p v-if="!pending && taken.length === 0" class="text-muted text-sm mb-3">
      Nog geen weekplanning. Stel eerst je dagindeling in en klik daarna op "Plan mijn week".
    </p>

    <div class="overflow-x-auto">
      <div class="flex gap-3 min-w-max pb-2">
        <div v-for="datum in periode" :key="datum" class="w-56 shrink-0 border border-default rounded-lg p-2 flex flex-col gap-3">
          <div class="text-sm font-medium">{{ dagLabel(datum) }}</div>

          <div v-for="blok in blokkenVoorDag(datum)" :key="blok.id" class="flex flex-col gap-1">
            <div class="text-xs text-muted">
              {{ blok.type === 'zakelijk' ? 'Zakelijk' : 'Privé' }} · {{ blok.startTijd }}–{{ blok.eindTijd }}
            </div>
            <div
              class="flex flex-col gap-1 min-h-10 rounded bg-elevated/50 p-1"
              @dragover.prevent
              @drop="onDrop(datum, blok.type)"
            >
              <div
                v-for="taak in takenVoor(datum, blok.type)"
                :key="taak.id"
                :draggable="taak.status !== 'bevestigd'"
                class="text-xs bg-default border border-default rounded px-2 py-1 flex items-start justify-between gap-1"
                :class="taak.status !== 'bevestigd' ? 'cursor-grab' : 'cursor-default'"
                @dragstart="onDragStart(taak)"
              >
                <span :class="{ 'line-through text-muted': taak.status === 'klaar' }">
                  {{ taak.omschrijving }}
                  <span v-if="taak.trajectNaam" class="text-muted">· {{ taak.trajectNaam }}</span>
                  <span class="text-muted"> ({{ taak.geschatteDuur }}m)</span>
                </span>
                <div class="flex flex-col gap-0.5 shrink-0">
                  <UButton
                    :icon="taak.status === 'bevestigd' ? 'i-lucide-lock' : 'i-lucide-lock-open'"
                    size="xs" color="neutral" variant="ghost"
                    @click="vastzetten(taak)"
                  />
                  <UButton
                    icon="i-lucide-check" size="xs"
                    :color="taak.status === 'klaar' ? 'success' : 'neutral'"
                    variant="ghost"
                    @click="afronden(taak)"
                  />
                </div>
              </div>
            </div>
          </div>

          <p v-if="blokkenVoorDag(datum).length === 0" class="text-xs text-muted">Geen blokken ingesteld.</p>
        </div>
      </div>
    </div>

    <div class="mt-4 pt-3 border-t border-default flex gap-2">
      <UInput
        v-model="redenTekst"
        placeholder="Waarom past de planning niet? Bijv. 'donderdag lukt niet, ik moet naar een klant'"
        class="flex-1"
        @keyup.enter="onHerplan"
      />
      <UButton :loading="herplannend" @click="onHerplan">Herplan</UButton>
    </div>
  </UCard>
</template>
