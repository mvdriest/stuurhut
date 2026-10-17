<script setup lang="ts">
import type { Traject } from '~/composables/useTrajecten'
import type { Halte } from '~/composables/useHaltes'
import { DIENST_INFO } from '~/utils/route'
import { trajectKleurHex } from '~/utils/kleuren'
import { staleness } from '~/utils/trajectStaleness'

// Eén traject als reiskaartje: naam, een mini-route (stippen van eerste contact tot
// nazorg) met de huidige halte in limoen, en de volgende stap.
const props = defineProps<{
  traject: Traject
  haltes: Halte[]
  openTaken: number
  compact?: boolean
}>()

const huidig = computed(() => huidigeHalte(props.haltes))
const gelopen = computed(() => props.haltes.filter(h => h.afgerondOp).length)
const hartslag = computed(() => staleness(props.traject.updatedAt))

// Onder de naam: wie je spreekt, anders de klant (als die anders heet dan het traject).
const { klantVan, contactVan } = useKlanten()
const sub = computed(() => {
  const klant = klantVan(props.traject.klantId)
  return contactVan(props.traject.contactId)?.naam
    ?? (klant && klant.naam !== props.traject.naam ? klant.naam : null)
    ?? (props.traject.scope === 'prive' ? 'Privé' : 'Zakelijk')
})

const nuLabel = computed(() => {
  if (!props.haltes.length) return 'Nog geen route'
  if (!huidig.value) return 'Aangekomen'
  return huidig.value.titel
})
</script>

<template>
  <NuxtLink :to="`/trajecten/${traject.id}`" class="reiskaart sh-glas" :class="{ 'reiskaart--compact': compact }">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="reiskaart__naam">{{ traject.naam }}</h3>
        <p class="reiskaart__sub">{{ sub }}</p>
      </div>
      <div class="flex -space-x-1.5 shrink-0">
        <span
          v-for="d in traject.diensten"
          :key="d"
          class="reiskaart__dienst"
          :title="DIENST_INFO[d].label"
          :style="{ background: `linear-gradient(135deg, ${DIENST_INFO[d].kleur[0]}, ${DIENST_INFO[d].kleur[1]})` }"
        >
          <UIcon :name="DIENST_INFO[d].icoon" class="size-3.5" />
        </span>
        <span v-if="!traject.diensten.length" class="reiskaart__dienst" :style="{ background: trajectKleurHex[traject.kleur] }" />
      </div>
    </div>

    <!-- Mini-route -->
    <div v-if="haltes.length" class="reiskaart__route" :aria-label="`${gelopen} van ${haltes.length} haltes gelopen`">
      <span
        v-for="h in haltes"
        :key="h.id"
        class="reiskaart__stip"
        :class="{ 'reiskaart__stip--klaar': h.afgerondOp, 'reiskaart__stip--nu': h.id === huidig?.id }"
        :title="h.titel"
      />
    </div>

    <div class="reiskaart__nu">
      <span class="sh-kicker">{{ huidig ? 'Nu' : haltes.length ? 'Klaar' : 'Route' }}</span>
      <span class="font-semibold text-sm truncate">{{ nuLabel }}</span>
      <span v-if="openTaken" class="text-xs text-stuurhut-muted shrink-0">· {{ meervoud(openTaken, 'taak', 'taken') }}</span>
    </div>

    <p v-if="!compact" class="reiskaart__stap">{{ traject.eerstvolgendeActie || 'Geen volgende stap ingesteld.' }}</p>

    <div class="flex items-center justify-between gap-2 mt-auto">
      <span class="reiskaart__hartslag" :class="`reiskaart__hartslag--${hartslag.niveau}`">{{ hartslag.label }}</span>
      <span v-if="traject.wachtOp" class="reiskaart__wacht" :title="traject.wachtOp">
        <UIcon name="i-lucide-hourglass" class="size-3" /> wacht
      </span>
    </div>
  </NuxtLink>
</template>

<style scoped>
.reiskaart {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 1.15rem 1.2rem;
  color: var(--color-stuurhut-ink);
  transition: transform 180ms, box-shadow 180ms;
}

.reiskaart:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 40px rgb(30 40 50 / 0.2);
}

.reiskaart--compact {
  gap: 0.6rem;
  padding: 0.9rem 1rem;
}

.reiskaart__naam {
  font-family: var(--font-display);
  font-size: 1.5rem;
  line-height: 1;
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reiskaart--compact .reiskaart__naam {
  font-size: 1.2rem;
}

.reiskaart__sub {
  margin-top: 0.3rem;
  font-size: 0.8rem;
  color: var(--color-stuurhut-muted);
}

.reiskaart__dienst {
  display: grid;
  place-items: center;
  width: 1.65rem;
  height: 1.65rem;
  border-radius: 9999px;
  color: #fff;
  box-shadow: 0 0 0 2px var(--color-stuurhut-card);
}

.reiskaart__route {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.3rem 0;
}

.reiskaart__route::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  border-top: 2px dotted rgb(0 0 0 / 0.15);
}

.reiskaart__stip {
  position: relative;
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 9999px;
  background: #fff;
  box-shadow: 0 0 0 1.5px rgb(0 0 0 / 0.15);
}

.reiskaart__stip--klaar {
  background: #2544d8;
  box-shadow: none;
}

.reiskaart__stip--nu {
  width: 0.95rem;
  height: 0.95rem;
  background: var(--color-stuurhut-limoen);
  box-shadow: 0 0 0 2px var(--color-stuurhut-ink);
}

.reiskaart__nu {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  min-width: 0;
}

.reiskaart__stap {
  padding: 0.65rem 0.8rem;
  border-radius: 0.8rem;
  background: var(--color-stuurhut-subtle);
  font-size: 0.85rem;
  line-height: 1.35;
}

.reiskaart__hartslag {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.72rem;
}

.reiskaart__hartslag::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.reiskaart__hartslag--vers { color: #35722f; }
.reiskaart__hartslag--traag { color: #a3791a; }
.reiskaart__hartslag--stil { color: #b3402f; }

.reiskaart__wacht {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  background: #fdecc8;
  color: #8a5a1a;
  font-size: 0.7rem;
}
</style>
