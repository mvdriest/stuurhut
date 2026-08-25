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
  if (uur < 22) return 'Goedenavond, Martijn'
  return 'Nog laat, Martijn'
})

const subtitel = computed(() => {
  const uur = nu.getHours()
  return uur >= 22 || uur < 6
    ? 'Misschien is dit een goed moment om het rustig aan te doen.'
    : 'Rustig aan, één stap tegelijk — dat is genoeg.'
})

const datum = computed(() => `${nu.getDate()} ${MAAND_NAMEN[nu.getMonth()]} ${nu.getFullYear()}`)
</script>

<template>
  <div>
    <section class="stuurhut-kolom pt-[clamp(1.5rem,3vw,2rem)]">
      <AppHeaderFoto
        :titel="groet"
        :subtitel="subtitel"
        :datum="datum"
      />
    </section>

    <section class="stuurhut-kolom py-[clamp(2rem,5vw,4rem)] flex flex-col gap-4">
      <div class="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 items-stretch">
        <VandaagJeDag />
        <div class="flex flex-col gap-4">
          <VandaagEenDing />
          <VandaagNietVergeten />
        </div>
      </div>

      <VandaagOpTafel />

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <VandaagWatErLoopt />
        <VandaagHoeJeErVoorStaat id="financien" />
      </div>
    </section>

    <DoelenOverzicht id="doelen" />

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
