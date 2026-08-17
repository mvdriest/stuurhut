<script setup lang="ts">
definePageMeta({
  pageTransition: { name: 'stuurhut-nav', mode: 'out-in' }
})

const MAAND_NAMEN = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december'
]

const nu = new Date()

const groet = computed(() => {
  const uur = nu.getHours()
  if (uur < 12) return 'Goedemorgen, Martijn'
  if (uur < 18) return 'Goedemiddag, Martijn'
  return 'Goedenavond, Martijn'
})

const datum = computed(() => `${nu.getDate()} ${MAAND_NAMEN[nu.getMonth()]} ${nu.getFullYear()}`)
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
