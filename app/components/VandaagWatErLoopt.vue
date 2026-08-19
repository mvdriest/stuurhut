<script setup lang="ts">
import { groepeerTrajecten } from '~/utils/trajectGroepen'
import { staleness } from '~/utils/trajectStaleness'

const { trajecten, refresh } = useTrajecten()

await useAsyncData('vandaag-wat-er-loopt-init', () => trajecten.value.length ? Promise.resolve(trajecten.value) : refresh())

const groepen = computed(() => {
  const g = groepeerTrajecten(trajecten.value)
  return [
    { naam: 'Jij bent aan zet', items: g.jijAanZet.slice(0, 4) },
    { naam: 'Wacht op iemand anders', items: g.wachtOpAnderen.slice(0, 4) }
  ].filter(gr => gr.items.length > 0)
})
</script>

<template>
  <div class="vandaagkaart">
    <div class="flex items-baseline justify-between gap-3 mb-3">
      <h3 class="vandaagkaart__titel">Wat er loopt</h3>
      <NuxtLink to="/trajecten" class="text-xs font-semibold">Alle trajecten →</NuxtLink>
    </div>

    <div v-if="groepen.length" class="flex flex-col gap-3">
      <div v-for="groep in groepen" :key="groep.naam">
        <p class="watloopt__label">{{ groep.naam }}</p>
        <NuxtLink v-for="t in groep.items" :key="t.id" :to="`/trajecten/${t.id}`" class="watloopt-item">
          <span class="watloopt-item__naam">{{ t.naam }}</span>
          <span class="watloopt-item__stale">{{ staleness(t.updatedAt).label }}</span>
        </NuxtLink>
      </div>
    </div>
    <p v-else class="text-sm text-stuurhut-muted">Nog geen trajecten.</p>
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

.watloopt__label {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-stuurhut-muted);
  margin-bottom: 0.25rem;
}

.watloopt-item {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.35rem 0;
  font-size: 0.8125rem;
  color: inherit;
}

.watloopt-item__naam {
  font-weight: 600;
}

.watloopt-item__stale {
  color: var(--color-stuurhut-muted);
  flex-shrink: 0;
}
</style>
