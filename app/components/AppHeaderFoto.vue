<script setup lang="ts">
const props = defineProps<{
  titel: string
  subtitel?: string
  datum?: string
  afbeelding?: string
  /** Kortere variant voor subpagina's (traject-detail) dan de dashboard-hero. */
  compact?: boolean
}>()

const DAGDEEL_AFBEELDINGEN = {
  dageraad: '/images/hero-dawn.jpg',
  dag: '/images/hero-day.jpg',
  avond: '/images/hero-sunset.jpg',
  nacht: '/images/hero-night.jpg'
}

function dagdeelAfbeelding(uur: number) {
  if (uur < 6) return DAGDEEL_AFBEELDINGEN.nacht
  if (uur < 11) return DAGDEEL_AFBEELDINGEN.dageraad
  if (uur < 18) return DAGDEEL_AFBEELDINGEN.dag
  if (uur < 22) return DAGDEEL_AFBEELDINGEN.avond
  return DAGDEEL_AFBEELDINGEN.nacht
}

const achtergrondStijl = computed(() => {
  const afbeelding = props.afbeelding ?? dagdeelAfbeelding(new Date().getHours())
  return { backgroundImage: `url(${afbeelding})` }
})
</script>

<template>
  <header
    class="stuurhut-hero"
    :class="{ 'stuurhut-hero--compact': compact }"
    :style="achtergrondStijl"
  >
    <div class="stuurhut-hero__scrim" />

    <div class="stuurhut-kolom relative flex flex-wrap items-center justify-between gap-x-4 gap-y-3 pt-8 sm:pt-12">
      <NuxtLink to="/" class="stuurhut-hero__merk">Stuurhut</NuxtLink>
      <AppNav />
    </div>

    <div class="stuurhut-kolom stuurhut-hero__blok relative mt-auto">
      <p v-if="datum" class="stuurhut-hero__datum">{{ datum }}</p>
      <h1 class="stuurhut-hero__titel">{{ titel }}</h1>
      <p v-if="subtitel" class="stuurhut-hero__quote">{{ subtitel }}</p>
    </div>
  </header>
</template>

<style scoped>
.stuurhut-hero {
  position: relative;
  display: flex;
  flex-direction: column;
  /* 920px hoog op een 1920-frame, zoals in het concept. */
  min-height: clamp(30rem, 48vw, 60rem);
  color: #fff;
  background-size: cover;
  background-position: center;
}

.stuurhut-hero--compact {
  min-height: clamp(20rem, 26vw, 32rem);
}

/* Onderin genoeg lucht laten: daar schuiven de doelkaarten overheen. */
.stuurhut-hero__blok {
  padding-bottom: clamp(4rem, 12.5vw, 15rem);
}

.stuurhut-hero--compact .stuurhut-hero__blok {
  padding-bottom: clamp(2.5rem, 5vw, 5rem);
}

/* Alleen genoeg verduistering voor leesbare koptekst — de foto blijft leidend. */
.stuurhut-hero__scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgb(0 0 0 / 0.35) 0%, rgb(0 0 0 / 0.05) 38%, rgb(0 0 0 / 0.28) 100%);
}

.stuurhut-hero__merk {
  font-family: var(--font-display);
  text-transform: uppercase;
  font-size: clamp(1.5rem, 2.2vw, 2.5rem);
  line-height: 1;
  letter-spacing: 0.02em;
  text-shadow: 0 2px 16px rgb(0 0 0 / 0.45);
}

.stuurhut-hero__datum {
  font-family: var(--font-display);
  text-transform: uppercase;
  font-size: clamp(1rem, 1.6vw, 1.75rem);
  line-height: 1;
  margin-bottom: 0.5rem;
  text-shadow: 0 2px 14px rgb(0 0 0 / 0.5);
}

.stuurhut-hero__titel {
  font-family: var(--font-display);
  text-transform: uppercase;
  font-size: clamp(2.75rem, 7.5vw, 5.75rem);
  line-height: 0.92;
  letter-spacing: -0.01em;
  text-shadow: 0 4px 28px rgb(0 0 0 / 0.45);
}

/* De donkere quote-balk met witte streep uit het concept. */
.stuurhut-hero__quote {
  display: inline-block;
  margin-top: 1.75rem;
  padding: 0.9rem 1.4rem;
  border-left: 4px solid #fff;
  border-radius: 0 6px 6px 0;
  background-color: rgb(0 0 0 / 0.45);
  backdrop-filter: blur(2px);
  font-size: clamp(0.95rem, 1.15vw, 1.25rem);
  line-height: 1.35;
}
</style>
