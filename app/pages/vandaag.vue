<script setup lang="ts">
// Het dagdashboard. Van boven naar beneden: wat er vandaag ligt (je dag, het ene
// ding, wat je niet moet vergeten), het takenbord over alle trajecten, waar je
// klanten onderweg zijn, je doelen, en tot slot plannen & vastleggen.
definePageMeta({
  pageTransition: { name: 'stuurhut-nav', mode: 'out-in' }
})

// Eén moment, op de server vastgelegd en bij hydratatie hergebruikt.
const moment = useState('dashboard-moment', () => Date.now())
const nu = computed(() => nederlandseTijd(moment.value))

const groet = computed(() => {
  const uur = nu.value.uur
  if (uur < 6) return 'Nog laat, Martijn'
  if (uur < 12) return 'Goedemorgen, Martijn'
  if (uur < 18) return 'Goedemiddag, Martijn'
  if (uur < 22) return 'Goedenavond, Martijn'
  return 'Nog laat, Martijn'
})

const subtitel = computed(() => {
  const uur = nu.value.uur
  return uur >= 22 || uur < 6
    ? 'Misschien is dit een goed moment om het rustig aan te doen.'
    : 'Rustig aan, één stap tegelijk — dat is genoeg.'
})

const datum = computed(() => formatDatumNl(nu.value))

const { trajecten, refresh: refreshTrajecten } = useTrajecten()
const { taken, refresh: refreshTaken } = useTaken()
const { refresh: refreshHaltes, routeVan } = useHaltes()

await useAsyncData('vandaag-onderweg-init', () => Promise.all([refreshTrajecten(), refreshTaken(), refreshHaltes()]))

// Lopende reizen, de meest recent aangeraakte eerst (de API sorteert al op updated_at).
const onderweg = computed(() => trajecten.value
  .filter(t => t.scope === 'zakelijk' && t.status !== 'on_hold')
  .slice(0, 6))

function openTaken(trajectId: string) {
  return taken.value.filter(t => t.trajectId === trajectId && t.status !== 'klaar').length
}
</script>

<template>
  <div>
    <PaginaKop :kicker="datum" :titel="groet" :subtitel="subtitel" />

    <div class="stuurhut-kolom mt-8 flex flex-col gap-4">
      <div class="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 items-stretch">
        <VandaagJeDag />
        <div class="flex flex-col gap-4">
          <VandaagEenDing />
          <VandaagNietVergeten />
        </div>
      </div>
    </div>

    <VandaagBord class="mt-14" />

    <section class="stuurhut-kolom mt-14">
      <div class="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p class="sh-kicker">Klanten</p>
          <h2 class="sh-titel text-[clamp(1.75rem,3vw,2.5rem)] mt-1">Onderweg</h2>
        </div>
        <NuxtLink to="/trajecten" class="sh-chip !h-10 text-sm">Alle trajecten <UIcon name="i-lucide-arrow-right" class="size-4" /></NuxtLink>
      </div>
      <div v-if="onderweg.length" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-5">
        <ReisKaart v-for="t in onderweg" :key="t.id" :traject="t" :haltes="routeVan(t.id)" :open-taken="openTaken(t.id)" compact />
      </div>
      <p v-else class="sh-kaart mt-5 text-sm max-w-md">Geen lopende klanttrajecten.</p>
    </section>

    <DoelenOverzicht id="doelen" class="mt-6" />

    <section class="stuurhut-kolom mt-6">
      <p class="sh-kicker">Plannen &amp; vastleggen</p>
      <h2 class="sh-titel text-[clamp(1.75rem,3vw,2.5rem)] mt-1">De week</h2>
      <div class="mt-5 grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-4 items-start">
        <WeekplanningOverzicht />
        <div class="flex flex-col gap-4">
          <VandaagPrioriteiten />
          <InboxQuickCapture />
        </div>
      </div>
    </section>
  </div>
</template>
