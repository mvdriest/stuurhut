<script setup lang="ts">
import type { KaartPlekId } from '~/utils/kaartPlekken'
import { trajectKleurHex, trajectTekstKleur } from '~/utils/kleuren'
import { gehaald, voortgang, eerstvolgendeMijlpaal } from '~/utils/doelenVoortgang'

// Inhoud van het zijpaneel dat opent als je op de kaart naar een plek "reist" die
// (nog) geen eigen pagina heeft. Bewust compact: voor alles wat meer ruimte vraagt
// linkt het door naar de volledige pagina.
const props = defineProps<{ plekId: KaartPlekId }>()

const { taken, refresh: refreshTaken } = useTaken()
const { trajecten, refresh: refreshTrajecten } = useTrajecten()
const { doelen, refresh: refreshDoelen } = useDoelen()

await useAsyncData(`kaart-paneel-${props.plekId}`, async () => {
  if (props.plekId === 'todos') await Promise.all([refreshTaken(), refreshTrajecten()])
  if (props.plekId === 'doelen') await refreshDoelen()
  return true
})

const openTaken = computed(() => taken.value
  .filter(t => t.status === 'to_do' || t.status === 'bezig')
  .sort((a, b) => (a.status === b.status ? a.volgorde - b.volgorde : a.status === 'bezig' ? -1 : 1)))

function traject(id: string | null) {
  return id === null ? undefined : trajecten.value.find(t => t.id === id)
}

async function afvinken(id: string) {
  await $fetch(`/api/taken/${id}`, { method: 'PATCH', body: { status: 'klaar' } })
  await refreshTaken()
}

const actieveDoelen = computed(() => doelen.value.filter(d => d.status === 'actief'))
</script>

<template>
  <div class="flex flex-col gap-4">
    <template v-if="plekId === 'todos'">
      <p v-if="openTaken.length === 0" class="text-sm text-stuurhut-muted">Niets open. Mooi.</p>
      <ul class="flex flex-col gap-2">
        <li v-for="taak in openTaken" :key="taak.id" class="stuurhut-kaart flex items-start gap-3 p-3">
          <button type="button" class="mt-0.5 size-5 shrink-0 rounded-full border-[1.5px] border-stuurhut-muted hover:border-lime-600 hover:bg-lime-100" :aria-label="`${taak.tekst} afvinken`" @click="afvinken(taak.id)" />
          <div class="flex-1 min-w-0">
            <p class="text-sm">{{ taak.tekst }}</p>
            <div class="mt-1.5 flex gap-2 text-xs">
              <span
                v-if="traject(taak.trajectId)"
                class="rounded-full px-2 py-0.5"
                :style="{ backgroundColor: trajectKleurHex[traject(taak.trajectId)!.kleur], color: trajectTekstKleur(traject(taak.trajectId)!.kleur) }"
              >{{ traject(taak.trajectId)!.naam }}</span>
              <span v-if="taak.status === 'bezig'" class="text-stuurhut-muted">bezig</span>
            </div>
          </div>
        </li>
      </ul>
      <UButton to="/vandaag" variant="soft" color="neutral" trailing-icon="i-lucide-arrow-right" class="self-start">Open het volledige bord</UButton>
    </template>

    <template v-else-if="plekId === 'doelen'">
      <p v-if="actieveDoelen.length === 0" class="text-sm text-stuurhut-muted">Nog geen actieve doelen.</p>
      <article v-for="doel in actieveDoelen" :key="doel.id" class="stuurhut-kaart p-4">
        <h3 class="font-medium">{{ doel.titel }}</h3>
        <div class="mt-3 flex items-center justify-between text-xs text-stuurhut-muted">
          <span>{{ gehaald(doel) }} van {{ doel.mijlpalen.length }} mijlpalen</span>
          <span>{{ voortgang(doel) }}%</span>
        </div>
        <div class="mt-1.5 h-1.5 rounded-full bg-stuurhut-subtle overflow-hidden">
          <div class="h-full stuurhut-voortgang rounded-full" :style="{ width: `${voortgang(doel)}%` }" />
        </div>
        <p v-if="eerstvolgendeMijlpaal(doel)" class="mt-3 text-sm">
          Volgende: {{ eerstvolgendeMijlpaal(doel)!.titel }}
          <span v-if="eerstvolgendeMijlpaal(doel)!.beloning" class="block text-xs text-stuurhut-muted">Beloning: {{ eerstvolgendeMijlpaal(doel)!.beloning }}</span>
        </p>
      </article>
      <UButton to="/vandaag#doelen" variant="soft" color="neutral" trailing-icon="i-lucide-arrow-right" class="self-start">Doelen beheren</UButton>
    </template>

    <template v-else-if="plekId === 'financien'">
      <VandaagHoeJeErVoorStaat />
    </template>

    <template v-else-if="plekId === 'aanrader'">
      <VandaagEenDing />
    </template>
  </div>
</template>
