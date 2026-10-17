<script setup lang="ts">
import type { Traject } from '~/composables/useTrajecten'
import type { HalteFase } from '~/utils/route'
import { FASE_LABELS } from '~/utils/route'
import { groepeerTrajecten } from '~/utils/trajectGroepen'

// Alle reizen. Twee weergaven: "Reizen" (gegroepeerd op wie er aan zet is) en
// "Pijplijn" (gegroepeerd op de fase van de halte waar elk traject nu is).
definePageMeta({
  pageTransition: { name: 'stuurhut-nav', mode: 'out-in' }
})

const { trajecten, pending, refresh } = useTrajecten()
const { taken, refresh: refreshTaken } = useTaken()
const { refresh: refreshHaltes, routeVan } = useHaltes()

await useAsyncData('trajecten-overzicht-init', () => Promise.all([refresh(), refreshTaken(), refreshHaltes()]))

const scope = ref<'alle' | 'zakelijk' | 'prive'>('alle')
const weergave = ref<'reizen' | 'pijplijn'>('reizen')

const scoped = computed(() => trajecten.value.filter(t => scope.value === 'alle' || t.scope === scope.value))

const openTaken = computed(() => {
  const telling: Record<string, number> = {}
  for (const t of taken.value) {
    if (t.trajectId && t.status !== 'klaar') telling[t.trajectId] = (telling[t.trajectId] ?? 0) + 1
  }
  return telling
})

const groepen = computed(() => {
  const actief = scoped.value.filter(t => t.status !== 'on_hold')
  const g = groepeerTrajecten(actief)
  return [
    { key: 'jijAanZet', naam: 'Jij bent aan zet', items: g.jijAanZet },
    { key: 'wachtOpAnderen', naam: 'Wacht op iemand anders', items: g.wachtOpAnderen },
    { key: 'onHold', naam: 'Even geparkeerd', items: scoped.value.filter(t => t.status === 'on_hold') }
  ].filter(gr => gr.items.length > 0)
})

type Kolom = HalteFase | 'geen'
const KOLOMMEN: { key: Kolom, label: string }[] = [
  { key: 'geen', label: 'Nog geen route' },
  { key: 'verkennen', label: FASE_LABELS.verkennen },
  { key: 'uitvoeren', label: FASE_LABELS.uitvoeren },
  { key: 'afronden', label: FASE_LABELS.afronden }
]

function kolomVan(t: Traject): Kolom {
  const route = routeVan(t.id)
  if (!route.length) return 'geen'
  return huidigeHalte(route)?.fase ?? 'afronden'
}

const pijplijn = computed(() => KOLOMMEN.map((k) => {
  const items = scoped.value.filter(t => t.status !== 'on_hold' && kolomVan(t) === k.key)
  const waarde = items.reduce((som, t) => som + (t.bedragAfgesproken ?? 0), 0)
  return { ...k, items, waarde }
}))

const { openNieuwTraject } = useSnelMenu()
</script>

<template>
  <div>
    <PaginaKop titel="Trajecten" subtitel="Elk traject is een reis. Hier zie je waar iedereen onderweg is.">
      <template #balk-links>
        <div class="sh-segment" role="group" aria-label="Filter">
          <button
            v-for="s in [{ key: 'alle', label: 'Alle' }, { key: 'zakelijk', label: 'Zakelijk' }, { key: 'prive', label: 'Privé' }]"
            :key="s.key"
            type="button"
            :aria-pressed="scope === s.key"
            @click="scope = s.key as typeof scope"
          >
            {{ s.label }}
          </button>
        </div>
      </template>
      <template #balk-rechts>
        <div class="sh-segment" role="group" aria-label="Weergave">
          <button type="button" :aria-pressed="weergave === 'reizen'" @click="weergave = 'reizen'">
            <UIcon name="i-lucide-route" class="size-4" /> <span class="hidden sm:inline">Reizen</span>
          </button>
          <button type="button" :aria-pressed="weergave === 'pijplijn'" @click="weergave = 'pijplijn'">
            <UIcon name="i-lucide-columns-3" class="size-4" /> <span class="hidden sm:inline">Pijplijn</span>
          </button>
        </div>
      </template>

      <button type="button" class="sh-cta !py-2 !pl-4 !pr-2" @click="openNieuwTraject()">
        <span class="font-semibold text-sm">Nieuw traject</span>
        <span class="sh-cta__pijl !size-9"><UIcon name="i-lucide-plus" class="size-4" /></span>
      </button>
    </PaginaKop>

    <div class="stuurhut-kolom mt-8">
      <div v-if="!pending && scoped.length === 0" class="sh-kaart max-w-md">
        <p class="text-sm">{{ trajecten.length ? 'Niets gevonden met deze filter.' : 'Nog geen trajecten. Begin een nieuwe reis.' }}</p>
      </div>

      <!-- Reizen -->
      <div v-else-if="weergave === 'reizen'" class="flex flex-col gap-8">
        <section v-for="groep in groepen" :key="groep.key">
          <h2 class="trajecten__groep">
            <span class="trajecten__groep-label">{{ groep.naam }}</span>
            <span class="text-stuurhut-muted">{{ groep.items.length }}</span>
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            <ReisKaart
              v-for="t in groep.items"
              :key="t.id"
              :traject="t"
              :haltes="routeVan(t.id)"
              :open-taken="openTaken[t.id] ?? 0"
            />
          </div>
        </section>
      </div>

      <!-- Pijplijn -->
      <div v-else class="pijplijn">
        <section v-for="kolom in pijplijn" :key="kolom.key" class="pijplijn__kolom">
          <header class="pijplijn__kop">
            <span class="font-semibold">{{ kolom.label }}</span>
            <span class="text-stuurhut-muted text-sm">{{ kolom.items.length }}</span>
            <span v-if="kolom.waarde" class="ml-auto text-xs text-stuurhut-muted">€ {{ kolom.waarde.toLocaleString('nl-NL', { maximumFractionDigits: 0 }) }}</span>
          </header>
          <ReisKaart
            v-for="t in kolom.items"
            :key="t.id"
            :traject="t"
            :haltes="routeVan(t.id)"
            :open-taken="openTaken[t.id] ?? 0"
            compact
          />
          <p v-if="!kolom.items.length" class="px-1 text-sm text-stuurhut-muted">Leeg</p>
        </section>
      </div>
    </div>

  </div>
</template>

<style scoped>
.trajecten__groep {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0 0 0.75rem 0.25rem;
  font-size: 0.9rem;
}

.trajecten__groep-label {
  padding: 0.3rem 0.8rem;
  border-radius: 9999px;
  background: var(--color-stuurhut-glas);
  font-weight: 600;
  box-shadow: 0 4px 12px rgb(30 40 50 / 0.08);
}

.pijplijn {
  display: grid;
  grid-template-columns: repeat(4, minmax(16rem, 1fr));
  gap: 0.75rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
  align-items: start;
}

.pijplijn__kolom {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 10rem;
  padding: 0.75rem;
  border-radius: 1.25rem;
  background: rgb(253 250 244 / 0.5);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.pijplijn__kop {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.25rem 0.4rem 0.4rem;
}
</style>
