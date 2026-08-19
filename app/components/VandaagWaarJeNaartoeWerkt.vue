<script setup lang="ts">
import { voortgang, eerstvolgendeMijlpaal } from '~/utils/doelenVoortgang'

const { doelen, refresh } = useDoelen()

await useAsyncData('vandaag-waar-je-naartoe-werkt-init', () => doelen.value.length ? Promise.resolve(doelen.value) : refresh())

const actief = computed(() => doelen.value.filter(d => d.status === 'actief'))
</script>

<template>
  <div class="vandaagkaart">
    <h3 class="vandaagkaart__titel mb-3">Waar je naartoe werkt</h3>
    <div v-if="actief.length" class="flex flex-col gap-3">
      <div v-for="doel in actief" :key="doel.id" class="doel-item">
        <div class="flex items-center justify-between gap-2">
          <span class="doel-item__titel">{{ doel.titel }}</span>
          <span class="doel-item__pct">{{ voortgang(doel) }}%</span>
        </div>
        <div class="doel-item__balk">
          <div class="doel-item__balk-vulling stuurhut-voortgang" :style="{ width: `${voortgang(doel)}%` }" />
        </div>
        <span v-if="eerstvolgendeMijlpaal(doel)" class="doel-item__mijlpaal">Volgende: {{ eerstvolgendeMijlpaal(doel)!.titel }}</span>
      </div>
    </div>
    <p v-else class="text-sm text-stuurhut-muted">Nog geen actieve doelen.</p>
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

.doel-item__titel {
  font-size: 0.8125rem;
  font-weight: 600;
}

.doel-item__pct {
  font-family: var(--font-display);
  font-size: 0.9375rem;
  color: var(--color-stuurhut-ink);
}

.doel-item__balk {
  height: 0.3rem;
  border-radius: 9999px;
  background-color: #dcdcdc;
  overflow: hidden;
  margin-top: 0.3rem;
}

.doel-item__balk-vulling {
  height: 100%;
  border-radius: 9999px;
}

.doel-item__mijlpaal {
  display: block;
  font-size: 0.75rem;
  color: var(--color-stuurhut-muted);
  margin-top: 0.3rem;
}
</style>
