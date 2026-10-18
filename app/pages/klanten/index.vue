<script setup lang="ts">
import type { Klant } from '~/composables/useKlanten'
import { trajectKleurHex } from '~/utils/kleuren'

// Alle klanten: wie je kent, welke reizen je met ze maakt en wat dat waard is.
// Een klant ontstaat meestal vanzelf bij een nieuw zakelijk traject; hier kun je er
// ook los een aanmaken (bijv. een lead nog vóór er een traject is).
definePageMeta({
  pageTransition: { name: 'stuurhut-nav', mode: 'out-in' }
})

const { klanten, losseContacten, refresh } = useKlanten()
const { trajecten, refresh: refreshTrajecten } = useTrajecten()

await useAsyncData('klanten-init', () => Promise.all([refresh(), refreshTrajecten()]))

const zoek = ref('')

function trajectenVan(k: Klant) {
  return trajecten.value.filter(t => t.klantId === k.id)
}

const gefilterd = computed(() => {
  const term = zoek.value.trim().toLowerCase()
  const lijst = term
    ? klanten.value.filter(k => [k.naam, ...k.domeinen, ...k.contacten.flatMap(c => [c.naam, c.email ?? ''])]
        .some(w => w.toLowerCase().includes(term)))
    : klanten.value
  // Klanten met een lopende reis eerst, daarna alfabetisch.
  const lopend = (k: Klant) => trajectenVan(k).some(t => t.status !== 'on_hold')
  return [...lijst].sort((a, b) => Number(lopend(b)) - Number(lopend(a)) || a.naam.localeCompare(b.naam, 'nl'))
})

const eur = (n: number) => `€ ${n.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`
const waarde = (k: Klant) => trajectenVan(k).reduce((som, t) => som + (t.bedragAfgesproken ?? 0), 0)

const nieuwOpen = ref(false)
const nieuwNaam = ref('')

async function maakKlant() {
  if (!nieuwNaam.value.trim()) return
  const klant = await $fetch<Klant>('/api/klanten', { method: 'POST', body: { naam: nieuwNaam.value.trim() } })
  nieuwNaam.value = ''
  nieuwOpen.value = false
  await refresh()
  await navigateTo(`/klanten/${klant.id}`)
}
</script>

<template>
  <div>
    <PaginaKop titel="Klanten" subtitel="Wie je kent, en welke reizen je met ze maakt.">
      <template #balk-links>
        <UInput v-model="zoek" icon="i-lucide-search" placeholder="Zoek op naam, contact of domein" class="w-56 sm:w-72" />
      </template>

      <form v-if="nieuwOpen" class="flex gap-2" @submit.prevent="maakKlant" @keydown.esc="nieuwOpen = false">
        <UInput v-model="nieuwNaam" placeholder="Naam van de klant" autofocus />
        <UButton type="submit" icon="i-lucide-check" :disabled="!nieuwNaam.trim()" aria-label="Klant aanmaken" />
      </form>
      <button v-else type="button" class="sh-cta !py-2 !pl-4 !pr-2" @click="nieuwOpen = true">
        <span class="font-semibold text-sm">Nieuwe klant</span>
        <span class="sh-cta__pijl !size-9"><UIcon name="i-lucide-plus" class="size-4" /></span>
      </button>
    </PaginaKop>

    <div class="stuurhut-kolom mt-8 flex flex-col gap-8">
      <p v-if="!gefilterd.length" class="sh-kaart text-sm max-w-md">
        {{ klanten.length ? 'Niemand gevonden.' : 'Nog geen klanten. Ze verschijnen vanzelf als je een zakelijk traject begint.' }}
      </p>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        <NuxtLink v-for="k in gefilterd" :key="k.id" :to="`/klanten/${k.id}`" class="klant sh-glas">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h3 class="klant__naam">{{ k.naam }}</h3>
              <p class="text-sm text-stuurhut-muted truncate">
                {{ k.contacten.map(c => c.naam).join(', ') || 'Nog geen contactpersoon' }}
              </p>
            </div>
            <span v-if="waarde(k)" class="text-sm font-semibold shrink-0">{{ eur(waarde(k)) }}</span>
          </div>
          <div class="flex flex-wrap gap-1.5 mt-3">
            <span v-for="t in trajectenVan(k)" :key="t.id" class="klant__traject" :class="{ 'opacity-60': t.status === 'on_hold' }">
              <span class="size-2 rounded-full shrink-0" :style="{ background: trajectKleurHex[t.kleur] }" />
              {{ t.naam }}
            </span>
            <span v-for="d in k.domeinen" :key="d" class="klant__traject text-stuurhut-muted">
              <UIcon name="i-lucide-at-sign" class="size-3" /> {{ d }}
            </span>
          </div>
        </NuxtLink>
      </div>

      <section v-if="losseContacten.length" class="sh-kaart max-w-3xl">
        <h2 class="sh-kop"><UIcon name="i-lucide-user-round" class="size-5" /> Contacten zonder klant</h2>
        <ul class="mt-3 flex flex-col">
          <li v-for="c in losseContacten" :key="c.id" class="sh-rij text-sm">
            <span class="font-medium">{{ c.naam }}</span>
            <span class="text-stuurhut-muted truncate">{{ c.email || c.telefoon }}</span>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.klant {
  display: block;
  padding: 1rem 1.1rem;
  border-radius: 1.25rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.klant:hover {
  transform: translateY(-2px);
}

.klant__naam {
  font-family: var(--font-display);
  font-size: 1.35rem;
  line-height: 1.1;
}

.klant__traject {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  background: var(--color-stuurhut-subtle);
  font-size: 0.75rem;
}
</style>
