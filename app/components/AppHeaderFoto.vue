<script setup lang="ts">
const props = defineProps<{
  titel: string
  subtitel?: string
  datum?: string
  afbeelding?: string
  /** Vlakke titelbalk zonder foto, voor subpagina's. De fotobanner is voorbehouden aan Vandaag. */
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
  <header v-if="compact" class="stuurhut-paginakop">
    <p v-if="datum" class="stuurhut-paginakop__datum">{{ datum }}</p>
    <h1 class="stuurhut-paginakop__titel">{{ titel }}</h1>
    <p v-if="subtitel" class="stuurhut-paginakop__subtitel">{{ subtitel }}</p>
  </header>

  <header v-else class="stuurhut-banner" :style="achtergrondStijl">
    <div class="stuurhut-banner__scrim" />
    <div class="stuurhut-banner__blok">
      <p v-if="datum" class="stuurhut-banner__datum">{{ datum }}</p>
      <h1 class="stuurhut-banner__titel">{{ titel }}</h1>
      <p v-if="subtitel" class="stuurhut-banner__quote">{{ subtitel }}</p>
    </div>
  </header>
</template>

<style scoped>
.stuurhut-paginakop {
  padding-top: clamp(1.5rem, 3vw, 2.25rem);
}

.stuurhut-paginakop__datum {
  font-family: var(--font-display);
  text-transform: uppercase;
  font-size: 0.8125rem;
  letter-spacing: 0.08em;
  color: var(--color-stuurhut-muted);
  margin-bottom: 0.4rem;
}

.stuurhut-paginakop__titel {
  font-family: var(--font-display);
  text-transform: uppercase;
  font-size: clamp(2.25rem, 4vw, 2.75rem);
  line-height: 1;
  letter-spacing: 0.01em;
  color: var(--color-stuurhut-ink);
}

.stuurhut-paginakop__subtitel {
  margin-top: 0.4rem;
  font-size: 0.875rem;
  color: var(--color-stuurhut-muted);
  max-width: 40rem;
}

.stuurhut-banner {
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 28px;
  overflow: hidden;
  min-height: clamp(20rem, 32vw, 26rem);
  color: #fff;
  background-size: cover;
  background-position: center;
  box-shadow: 0 20px 46px rgb(60 38 16 / 0.25);
}

.stuurhut-banner__scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(178deg, rgb(24 14 6 / 0.45) 0%, rgb(24 14 6 / 0.05) 34%, rgb(22 12 5 / 0.2) 62%, rgb(18 10 4 / 0.8) 100%);
}

.stuurhut-banner__blok {
  position: relative;
  margin-top: auto;
  padding: clamp(1.5rem, 3vw, 2rem);
  max-width: 44rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stuurhut-banner__datum {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 0.85);
}

.stuurhut-banner__titel {
  font-family: var(--font-display);
  font-weight: 400;
  text-transform: uppercase;
  font-size: clamp(2.5rem, 5.5vw, 4.25rem);
  line-height: 0.9;
  letter-spacing: 0.008em;
  text-shadow: 0 2px 24px rgb(20 10 4 / 0.5);
}

.stuurhut-banner__quote {
  display: inline-flex;
  align-items: stretch;
  gap: 0.8125rem;
  background: rgb(20 14 9 / 0.5);
  backdrop-filter: blur(6px);
  border: 1px solid rgb(255 255 255 / 0.16);
  border-radius: 14px;
  padding: 0.9375rem 1.25rem;
  max-width: 38rem;
  width: fit-content;
  font-size: 0.96875rem;
  font-weight: 600;
  line-height: 1.5;
  border-left: 3px solid oklch(78% 0.14 70);
}
</style>
