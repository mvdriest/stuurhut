<script setup lang="ts">
import { groepeerTrajecten } from '~/utils/trajectGroepen'
import { staleness } from '~/utils/trajectStaleness'

const { periode, taken: geplandeTaken, refresh: refreshWeekplanning, bijwerken } = useWeekplanning()
const { taken, refresh: refreshTaken } = useTaken()
const { trajecten, refresh: refreshTrajecten } = useTrajecten()

await useAsyncData('vandaag-een-ding-init', () => Promise.all([refreshWeekplanning(), refreshTaken(), refreshTrajecten()]))

const vandaag = computed(() => periode.value[0] ?? new Date().toLocaleDateString('en-CA'))

type Bron = 'gepland' | 'subtaak'

const gekozen = computed(() => {
  const bevestigdVandaag = geplandeTaken.value
    .filter(t => t.datum === vandaag.value && t.status === 'bevestigd')
    .sort((a, b) => (a.startTijd ?? '99:99').localeCompare(b.startTijd ?? '99:99'))[0]

  if (bevestigdVandaag) {
    return {
      bron: 'gepland' as Bron,
      id: bevestigdVandaag.id,
      titel: bevestigdVandaag.omschrijving,
      reden: bevestigdVandaag.startTijd
        ? `Ingepland om ${bevestigdVandaag.startTijd} — al vastgezet in je week.`
        : 'Al vastgezet in je weekplanning.'
    }
  }

  const { jijAanZet } = groepeerTrajecten(trajecten.value)
  const meestStilleTraject = [...jijAanZet].sort((a, b) => staleness(b.updatedAt).dagen - staleness(a.updatedAt).dagen)[0]

  if (meestStilleTraject) {
    const openTaak = taken.value
      .filter(t => t.trajectId === meestStilleTraject.id && t.status === 'to_do')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0]
    if (openTaak) {
      const s = staleness(meestStilleTraject.updatedAt)
      return {
        bron: 'subtaak' as Bron,
        id: openTaak.id,
        titel: openTaak.tekst,
        reden: `${meestStilleTraject.naam} ligt al ${s.dagen} dagen stil — dit zet het weer in beweging.`
      }
    }
  }

  const oudsteOpen = [...taken.value]
    .filter(t => t.status === 'to_do')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0]

  if (oudsteOpen) {
    return { bron: 'subtaak' as Bron, id: oudsteOpen.id, titel: oudsteOpen.tekst, reden: 'Je langst openstaande taak.' }
  }

  return null
})

async function markeerKlaar() {
  if (!gekozen.value) return
  if (gekozen.value.bron === 'gepland') {
    await bijwerken(gekozen.value.id, { status: 'klaar' })
  } else {
    await $fetch(`/api/taken/${gekozen.value.id}`, { method: 'PATCH', body: { status: 'klaar' } })
    await refreshTaken()
  }
}
</script>

<template>
  <div class="vandaagkaart vandaagkaart--accent">
    <p class="eending__label">Als je één ding doet</p>
    <template v-if="gekozen">
      <p class="eending__titel">{{ gekozen.titel }}</p>
      <p class="eending__reden">{{ gekozen.reden }}</p>
      <UButton icon="i-lucide-check" size="sm" class="self-start" @click="markeerKlaar">Gelukt</UButton>
    </template>
    <p v-else class="text-sm text-stuurhut-muted">Niets openstaands gevonden — mooi rustig.</p>
  </div>
</template>

<style scoped>
.vandaagkaart--accent {
  background: linear-gradient(150deg, #e8c78a 0%, #cf9a5a 100%);
  border-radius: 1.125rem;
  padding: 1.25rem 1.375rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  align-items: flex-start;
}

.eending__label {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #5a3f1a;
}

.eending__titel {
  font-family: var(--font-display);
  text-transform: uppercase;
  font-size: clamp(1.5rem, 2.4vw, 2rem);
  line-height: 1;
  color: #2a1c08;
}

.eending__reden {
  font-size: 0.875rem;
  color: #4a3416;
}
</style>
