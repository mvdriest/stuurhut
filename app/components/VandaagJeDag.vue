<script setup lang="ts">
const { periode, taken: geplandeTaken, refresh: refreshWeekplanning } = useWeekplanning()
const { afspraken, refresh: refreshAfspraken } = useAfspraken()
const { blokken: dagBlokken, refresh: refreshDagindeling } = useDagindeling()

await useAsyncData('vandaag-je-dag-init', () => Promise.all([refreshWeekplanning(), refreshAfspraken(), refreshDagindeling()]))

const vandaag = computed(() => periode.value[0] ?? new Date().toLocaleDateString('en-CA'))

function tijdNaarMinuten(tijd: string | null): number | null {
  if (!tijd) return null
  const [u, m] = tijd.split(':').map(Number)
  return (u ?? 0) * 60 + (m ?? 0)
}

interface DagItem {
  id: string
  titel: string
  startTijd: string | null
  startMin: number | null
  duurMin: number
  contextLabel: string | null
}

const items = computed<DagItem[]>(() => {
  const uitGepland: DagItem[] = geplandeTaken.value
    .filter(t => t.datum === vandaag.value)
    .map(t => ({ id: `gepland-${t.id}`, titel: t.omschrijving, startTijd: t.startTijd, startMin: tijdNaarMinuten(t.startTijd), duurMin: t.geschatteDuur, contextLabel: t.trajectNaam }))

  const uitAfspraken: DagItem[] = afspraken.value
    .filter(a => a.datum === vandaag.value)
    .map((a) => {
      const start = tijdNaarMinuten(a.startTijd) ?? 0
      const eind = tijdNaarMinuten(a.eindTijd) ?? start
      return { id: `afspraak-${a.id}`, titel: a.titel, startTijd: a.startTijd, startMin: start, duurMin: Math.max(15, eind - start), contextLabel: null }
    })

  return [...uitGepland, ...uitAfspraken].sort((a, b) => (a.startMin ?? 9999) - (b.startMin ?? 9999))
})

const urenGepland = computed(() => items.value.reduce((som, i) => som + i.duurMin, 0) / 60)

const urenBeschikbaar = computed(() => {
  const isoWeekdag = new Date(`${vandaag.value}T00:00:00`).getDay() || 7
  return dagBlokken.value
    .filter(b => b.weekdag === isoWeekdag)
    .reduce((som, b) => som + (tijdNaarMinuten(b.eindTijd)! - tijdNaarMinuten(b.startTijd)!), 0) / 60
})

const urenVrij = computed(() => Math.max(0, urenBeschikbaar.value - urenGepland.value))
</script>

<template>
  <div class="vandaagkaart">
    <div class="flex items-baseline justify-between gap-3 mb-3">
      <h3 class="vandaagkaart__titel">Je dag</h3>
      <span class="text-xs text-stuurhut-muted">
        {{ items.length }} blok{{ items.length === 1 ? '' : 'ken' }} · {{ urenGepland.toFixed(1) }}u ingepland · {{ urenVrij.toFixed(1) }}u vrij
      </span>
    </div>

    <div v-if="items.length" class="flex flex-col gap-2">
      <div v-for="item in items" :key="item.id" class="jedag-item">
        <span class="jedag-item__tijd">{{ item.startTijd ?? '—' }}</span>
        <span class="jedag-item__titel">{{ item.titel }}</span>
        <span v-if="item.contextLabel" class="jedag-item__context">{{ item.contextLabel }}</span>
      </div>
    </div>
    <p v-else class="text-sm text-stuurhut-muted">Nog niets gepland voor vandaag.</p>
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

.jedag-item {
  display: flex;
  align-items: baseline;
  gap: 0.625rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgb(0 0 0 / 0.06);
}

.jedag-item:last-child {
  border-bottom: none;
}

.jedag-item__tijd {
  font-weight: 700;
  font-size: 0.8125rem;
  color: var(--color-stuurhut-ink);
  width: 3rem;
  flex-shrink: 0;
}

.jedag-item__titel {
  font-size: 0.875rem;
  flex: 1;
}

.jedag-item__context {
  font-size: 0.75rem;
  color: var(--color-stuurhut-muted);
}
</style>
