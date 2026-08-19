<script setup lang="ts">
import { trajectKleurHex, trajectTekstKleur } from '~/utils/kleuren'

const { taken, refresh: refreshTaken } = useTaken()
const { trajecten, refresh: refreshTrajecten } = useTrajecten()

await useAsyncData('vandaag-op-tafel-init', () => Promise.all([refreshTaken(), refreshTrajecten()]))

const scope = ref<'zakelijk' | 'prive'>('zakelijk')

function traject(id: string | null) {
  return id === null ? undefined : trajecten.value.find(t => t.id === id)
}

const KOLOMMEN: { status: 'to_do' | 'bezig' | 'review', label: string }[] = [
  { status: 'to_do', label: 'To-do' },
  { status: 'bezig', label: 'Bezig' },
  { status: 'review', label: 'Review' }
]

function takenVoorKolom(status: string) {
  return taken.value.filter((t) => {
    if (t.status !== status || t.trajectId === null) return false
    return traject(t.trajectId)?.scope === scope.value
  })
}
</script>

<template>
  <div class="vandaagkaart">
    <div class="flex items-baseline justify-between gap-3 mb-3">
      <h3 class="vandaagkaart__titel">Op tafel</h3>
      <div class="flex items-center gap-1 rounded-full bg-black/5 p-1">
        <button
          v-for="s in [{ key: 'zakelijk', label: 'Zakelijk' }, { key: 'prive', label: 'Privé' }]"
          :key="s.key"
          type="button"
          class="optafel__toggle"
          :class="{ 'optafel__toggle--actief': scope === s.key }"
          @click="scope = s.key as typeof scope"
        >
          {{ s.label }}
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div v-for="kolom in KOLOMMEN" :key="kolom.status" class="flex flex-col gap-2">
        <p class="optafel__kop">{{ kolom.label }} ({{ takenVoorKolom(kolom.status).length }})</p>
        <div v-for="taak in takenVoorKolom(kolom.status)" :key="taak.id" class="optafel-kaart">
          <span
            class="optafel-kaart__pil"
            :style="{ backgroundColor: trajectKleurHex[traject(taak.trajectId)!.kleur], color: trajectTekstKleur(traject(taak.trajectId)!.kleur) }"
          >
            {{ traject(taak.trajectId)!.naam }}
          </span>
          <span class="optafel-kaart__tekst">{{ taak.tekst }}</span>
        </div>
        <p v-if="takenVoorKolom(kolom.status).length === 0" class="text-xs text-stuurhut-muted">Leeg</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vandaagkaart {
  background-color: #fff;
  color: var(--color-stuurhut-ink);
  border-radius: 1.125rem;
  padding: 1.125rem 1.25rem;
  box-shadow: 0 8px 22px rgb(0 0 0 / 0.07);
}

.vandaagkaart__titel {
  font-family: var(--font-display);
  text-transform: uppercase;
  font-size: 1.375rem;
  color: var(--color-stuurhut-ink);
}

.optafel__toggle {
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 0.35rem 0.7rem;
  border-radius: 9999px;
  color: var(--color-stuurhut-muted);
}

.optafel__toggle--actief {
  background-color: var(--color-stuurhut-ink);
  color: #fff;
}

.optafel__kop {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-stuurhut-muted);
}

.optafel-kaart {
  background-color: var(--color-stuurhut-mist);
  border-radius: 0.7rem;
  padding: 0.55rem 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.optafel-kaart__pil {
  align-self: flex-start;
  font-size: 0.625rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 9999px;
}

.optafel-kaart__tekst {
  font-size: 0.8125rem;
  line-height: 1.3;
}
</style>
