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
    <div class="eending__label">
      <span class="eending__dot" />
      <span>Als je één ding doet</span>
    </div>
    <template v-if="gekozen">
      <p class="eending__titel">{{ gekozen.titel }}</p>
      <p class="eending__reden">{{ gekozen.reden }}</p>
      <UButton icon="i-lucide-check" size="sm" class="self-start rounded-full" @click="markeerKlaar">Gelukt</UButton>
    </template>
    <p v-else class="text-sm" style="color: rgb(255 255 255 / 0.85)">Niets openstaands gevonden — mooi rustig.</p>
  </div>
</template>

<style scoped>
.vandaagkaart--accent {
  position: relative;
  overflow: hidden;
  background: linear-gradient(150deg, oklch(64% 0.18 44) 0%, oklch(74% 0.15 74) 100%);
  border-radius: 1.25rem;
  padding: 1.25rem 1.375rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  align-items: flex-start;
  box-shadow: 0 20px 46px rgb(150 80 25 / 0.35);
}

.eending__label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 0.8);
}

.eending__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: oklch(99% 0.04 92);
  box-shadow: 0 0 12px oklch(96% 0.09 88);
}

.eending__titel {
  font-family: var(--font-display);
  text-transform: uppercase;
  font-size: clamp(1.5rem, 2.4vw, 2rem);
  line-height: 1;
  color: #fff;
  text-shadow: 0 2px 14px rgb(20 10 4 / 0.2);
}

.eending__reden {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgb(255 255 255 / 0.9);
}
</style>
