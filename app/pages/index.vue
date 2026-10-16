<script setup lang="ts">
definePageMeta({
  pageTransition: { name: 'stuurhut-nav', mode: 'out-in' }
})

// Eén moment, op de server vastgelegd en bij hydratatie hergebruikt.
const moment = useState('dashboard-moment', () => Date.now())
const nu = computed(() => nederlandseTijd(moment.value))

const groet = computed(() => {
  const uur = nu.value.uur
  if (uur < 12) return 'Goedemorgen, Martijn'
  if (uur < 18) return 'Goedemiddag, Martijn'
  return 'Goedenavond, Martijn'
})

const datum = computed(() => formatDatumNl(nu.value))
</script>

<template>
  <div class="bg-stuurhut-mist">
    <AppHeaderFoto
      :titel="groet"
      subtitel="Rustig aan, één stap tegelijk — dat is genoeg."
      :datum="datum"
    />

    <DoelenOverzicht />

    <VandaagBord />

    <TrajectenLijst />

    <!-- Buiten het concept-ontwerp, maar wel gewoon in gebruik. -->
    <section class="stuurhut-kolom py-[clamp(3rem,7vw,7rem)]">
      <h2 class="stuurhut-titel text-stuurhut-ink">Plannen &amp; vastleggen</h2>
      <div class="mt-[clamp(2rem,4vw,4rem)] max-w-4xl flex flex-col gap-6">
        <WeekplanningOverzicht />
        <VandaagPrioriteiten />
        <InboxQuickCapture />
      </div>
    </section>
  </div>
</template>
