<script setup lang="ts">
import type { DagBlokInvoer } from '~/composables/useDagindeling'

const { blokken, pending, refresh, opslaan } = useDagindeling()
await useAsyncData('dagindeling-init', () => refresh())

const weekdagen = [
  { nummer: 1, label: 'Maandag' },
  { nummer: 2, label: 'Dinsdag' },
  { nummer: 3, label: 'Woensdag' },
  { nummer: 4, label: 'Donderdag' },
  { nummer: 5, label: 'Vrijdag' },
  { nummer: 6, label: 'Zaterdag' },
  { nummer: 7, label: 'Zondag' }
]

const typeOpties = [
  { label: 'Zakelijk', value: 'zakelijk' },
  { label: 'Privé', value: 'prive' }
]

const lokaal = ref<DagBlokInvoer[]>([])

watch(blokken, (nieuw) => {
  lokaal.value = nieuw.map(b => ({ weekdag: b.weekdag, type: b.type, startTijd: b.startTijd, eindTijd: b.eindTijd }))
}, { immediate: true })

const nieuweBlokPerDag = reactive<Record<number, { type: 'prive' | 'zakelijk', startTijd: string, eindTijd: string }>>(
  Object.fromEntries(weekdagen.map(d => [d.nummer, { type: 'zakelijk', startTijd: '09:00', eindTijd: '12:00' }]))
)

const opslaanBezig = ref(false)
const error = ref('')
const opgeslagen = ref(false)

function blokkenVoorDag(weekdag: number) {
  return lokaal.value.filter(b => b.weekdag === weekdag)
}

function toevoegen(weekdag: number) {
  const nieuw = nieuweBlokPerDag[weekdag]!
  if (nieuw.startTijd >= nieuw.eindTijd) {
    error.value = 'Eindtijd moet na starttijd liggen.'
    return
  }
  error.value = ''
  lokaal.value.push({ weekdag, type: nieuw.type, startTijd: nieuw.startTijd, eindTijd: nieuw.eindTijd })
}

function verwijderen(blok: DagBlokInvoer) {
  lokaal.value = lokaal.value.filter(b => b !== blok)
}

async function opslaanClick() {
  error.value = ''
  opgeslagen.value = false
  opslaanBezig.value = true
  try {
    await opslaan(lokaal.value)
    opgeslagen.value = true
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Er ging iets mis.'
  } finally {
    opslaanBezig.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <p class="text-sm text-muted">
      Stel per dag in welke blokken beschikbaar zijn voor de AI-weekplanning (bijv. donderdag alleen zakelijk
      overdag, omdat je dan op kantoor werkt).
    </p>

    <div v-for="dag in weekdagen" :key="dag.nummer" class="flex flex-col gap-1.5">
      <div class="text-sm font-medium">{{ dag.label }}</div>
      <div class="flex flex-wrap gap-2">
        <UBadge
          v-for="(blok, i) in blokkenVoorDag(dag.nummer)"
          :key="i"
          variant="subtle"
          :color="blok.type === 'zakelijk' ? 'primary' : 'neutral'"
          class="flex items-center gap-1"
        >
          {{ blok.type === 'zakelijk' ? 'Zakelijk' : 'Privé' }} {{ blok.startTijd }}–{{ blok.eindTijd }}
          <button type="button" class="ml-1 opacity-70 hover:opacity-100" @click="verwijderen(blok)">✕</button>
        </UBadge>
        <span v-if="blokkenVoorDag(dag.nummer).length === 0" class="text-xs text-muted">Geen blokken</span>
      </div>
      <div class="flex items-center gap-2 mt-1">
        <USelect v-model="nieuweBlokPerDag[dag.nummer]!.type" :items="typeOpties" value-key="value" class="w-32" />
        <UInput v-model="nieuweBlokPerDag[dag.nummer]!.startTijd" type="time" class="w-28" />
        <UInput v-model="nieuweBlokPerDag[dag.nummer]!.eindTijd" type="time" class="w-28" />
        <UButton size="sm" icon="i-lucide-plus" variant="ghost" @click="toevoegen(dag.nummer)" />
      </div>
    </div>

    <div class="flex items-center gap-3">
      <UButton :loading="opslaanBezig || pending" @click="opslaanClick">Dagindeling opslaan</UButton>
      <span v-if="opgeslagen" class="text-sm text-success">Opgeslagen.</span>
    </div>
    <UAlert v-if="error" color="error" variant="soft" :title="error" />
  </div>
</template>
