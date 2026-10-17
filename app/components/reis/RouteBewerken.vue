<script setup lang="ts">
import type { Halte } from '~/composables/useHaltes'
import type { Traject } from '~/composables/useTrajecten'
import type { Dienst, HalteDienst } from '~/utils/route'
import { DIENSTEN, DIENST_INFO, FASE_LABELS, HALTE_ICONEN } from '~/utils/route'

// De route van één traject aanpassen. Diensten aan/uit voegt de haltes van die dienst
// toe of haalt de nog niet gelopen haltes weg (server: synchroniseerRoute); daarnaast
// is elke halte los te hernoemen, verplaatsen, dateren of te verwijderen.
const props = defineProps<{
  traject: Traject
  haltes: Halte[]
}>()

const emit = defineEmits<{ gewijzigd: [] }>()

async function wisselDienst(d: Dienst) {
  const diensten = props.traject.diensten.includes(d)
    ? props.traject.diensten.filter(x => x !== d)
    : [...props.traject.diensten, d]
  await $fetch(`/api/trajecten/${props.traject.id}`, { method: 'PATCH', body: { diensten } })
  emit('gewijzigd')
}

async function patch(h: Halte, body: Record<string, unknown>) {
  await $fetch(`/api/haltes/${h.id}`, { method: 'PATCH', body })
  emit('gewijzigd')
}

function hernoem(h: Halte, e: Event) {
  const titel = (e.target as HTMLInputElement).value.trim()
  if (titel && titel !== h.titel) patch(h, { titel })
}

async function verplaats(i: number, richting: -1 | 1) {
  const ids = props.haltes.map(h => h.id)
  const j = i + richting
  if (j < 0 || j >= ids.length) return
  ;[ids[i], ids[j]] = [ids[j]!, ids[i]!]
  await $fetch('/api/haltes/volgorde', { method: 'POST', body: { ids } })
  emit('gewijzigd')
}

async function verwijder(h: Halte) {
  if (!confirm(`Halte "${h.titel}" van de route halen?`)) return
  await $fetch(`/api/haltes/${h.id}`, { method: 'DELETE' })
  emit('gewijzigd')
}

const dienstOpties = (Object.keys(DIENST_INFO) as HalteDienst[]).map(d => ({ label: DIENST_INFO[d].label, value: d }))
const faseOpties = Object.entries(FASE_LABELS).map(([value, label]) => ({ label, value }))
const icoonOpties = HALTE_ICONEN.map((i): { label: string, value: string, icon: string } => ({ label: i.replace('i-lucide-', ''), value: i, icon: i }))

const nieuwTitel = ref('')
const nieuwDienst = ref<HalteDienst>('algemeen')
async function voegToe() {
  if (!nieuwTitel.value.trim()) return
  await $fetch('/api/haltes', {
    method: 'POST',
    body: { trajectId: props.traject.id, titel: nieuwTitel.value.trim(), dienst: nieuwDienst.value, icoon: nieuwDienst.value === 'algemeen' ? 'i-lucide-flag' : DIENST_INFO[nieuwDienst.value].icoon }
  })
  nieuwTitel.value = ''
  emit('gewijzigd')
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <div>
      <p class="sh-kicker mb-2">Diensten in dit traject</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="d in DIENSTEN"
          :key="d"
          type="button"
          class="dienstchip"
          :aria-pressed="traject.diensten.includes(d)"
          @click="wisselDienst(d)"
        >
          <UIcon :name="DIENST_INFO[d].icoon" class="size-4" /> {{ DIENST_INFO[d].label }}
        </button>
      </div>
      <p class="mt-2 text-xs text-stuurhut-muted">
        Een dienst erbij zet zijn haltes vóór de oplevering. Eraf haalt alleen de haltes weg die nog niet gelopen zijn.
      </p>
    </div>

    <div>
      <p class="sh-kicker mb-2">Haltes</p>
      <ol class="flex flex-col gap-1.5">
        <li v-for="(h, i) in haltes" :key="h.id" class="routerij" :class="{ 'routerij--klaar': h.afgerondOp }">
          <USelectMenu
            :model-value="h.icoon"
            :items="icoonOpties"
            value-key="value"
            :search-input="false"
            class="w-14"
            :ui="{ content: 'min-w-48' }"
            @update:model-value="(v: string) => patch(h, { icoon: v })"
          >
            <UIcon :name="h.icoon" class="size-4" />
          </USelectMenu>
          <input :value="h.titel" class="routerij__titel" aria-label="Naam van de halte" @change="hernoem(h, $event)">
          <USelect :model-value="h.dienst" :items="dienstOpties" value-key="value" size="sm" class="w-28" @update:model-value="(v: HalteDienst) => patch(h, { dienst: v })" />
          <USelect :model-value="h.fase" :items="faseOpties" value-key="value" size="sm" class="w-28" @update:model-value="(v: string) => patch(h, { fase: v })" />
          <UInput :model-value="h.streefdatum ?? ''" type="date" size="sm" class="w-36" @change="patch(h, { streefdatum: ($event.target as HTMLInputElement).value })" />
          <div class="flex">
            <UButton icon="i-lucide-arrow-up" size="xs" color="neutral" variant="ghost" :disabled="i === 0" aria-label="Omhoog" @click="verplaats(i, -1)" />
            <UButton icon="i-lucide-arrow-down" size="xs" color="neutral" variant="ghost" :disabled="i === haltes.length - 1" aria-label="Omlaag" @click="verplaats(i, 1)" />
            <UButton icon="i-lucide-trash-2" size="xs" color="error" variant="ghost" aria-label="Verwijderen" @click="verwijder(h)" />
          </div>
        </li>
      </ol>

      <form class="flex flex-wrap gap-2 mt-3" @submit.prevent="voegToe">
        <UInput v-model="nieuwTitel" placeholder="Nieuwe halte, bijv. Tussenpresentatie" class="flex-1 min-w-48" />
        <USelect v-model="nieuwDienst" :items="dienstOpties" value-key="value" class="w-32" />
        <UButton type="submit" icon="i-lucide-plus">Halte</UButton>
      </form>
    </div>
  </div>
</template>

<style scoped>
.dienstchip {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.5rem 0.9rem;
  border-radius: 0.75rem;
  background: var(--color-stuurhut-subtle);
  font-size: 0.875rem;
  color: var(--color-stuurhut-muted);
  transition: background-color 150ms, color 150ms;
}

.dienstchip[aria-pressed="true"] {
  background: var(--color-stuurhut-ink);
  color: #fff;
}

.routerij {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0.4rem 0.5rem;
  border-radius: 0.8rem;
  background: rgb(255 255 255 / 0.6);
}

.routerij--klaar {
  opacity: 0.6;
}

.routerij__titel {
  flex: 1;
  min-width: 8rem;
  padding: 0.35rem 0.5rem;
  border-radius: 0.5rem;
  background: transparent;
  font-weight: 600;
  font-size: 0.9rem;
  outline: none;
}

.routerij__titel:focus {
  background: #fff;
}
</style>
