<script setup lang="ts">
// Het landschap achter elke pagina: lucht, bergen aan de horizon, drie lagen heuvels.
// Zelfde wereld als de kaart van Utrecht, maar dan "buiten de stad". Op gewone
// pagina's ligt de horizon laag (de heuvels zijn decor onderaan); in het klantdossier
// ligt hij hoog, zodat de route over de heuvels naar de bergen kan lopen.
//
// Het SVG gebruikt viewBox 0..100 met preserveAspectRatio="none": alles wat in de
// slot in procenten wordt gepositioneerd (de haltes) valt precies op dezelfde plek.
const props = withDefaults(defineProps<{
  /** Hoogte van de verste heuvelrug, in procenten van boven. */
  horizon?: number
  /** Vast achter de pagina (scrollt niet mee) of als blok in de flow. */
  vast?: boolean
}>(), { horizon: 62, vast: true })

// De heuvels zijn ontworpen met de verste rug op y=26; schaal ze naar de gevraagde horizon.
const y = (v: number) => +(props.horizon + (v - 26) * (100 - props.horizon) / 74).toFixed(2)

const heuvels = computed(() => [
  `M0 ${y(34)} C 12 ${y(27)}, 26 ${y(31)}, 38 ${y(29)} S 62 ${y(24)}, 76 ${y(27)} S 94 ${y(25)}, 100 ${y(26)} L100 100 L0 100 Z`,
  `M0 ${y(50)} C 14 ${y(41)}, 28 ${y(46)}, 42 ${y(41)} S 66 ${y(35)}, 82 ${y(39)} S 96 ${y(36)}, 100 ${y(37)} L100 100 L0 100 Z`,
  `M0 ${y(70)} C 16 ${y(60)}, 30 ${y(66)}, 46 ${y(58)} S 74 ${y(52)}, 88 ${y(57)} S 98 ${y(55)}, 100 ${y(56)} L100 100 L0 100 Z`
])

const bergen = computed(() => `M44 ${y(31)} L54 ${y(19)} L59 ${y(24)} L63 ${y(14)} L72 ${y(27)} L79 ${y(21)} L90 ${y(31)} L90 ${y(40)} L44 ${y(40)} Z`)
const sneeuw = computed(() => `M61.4 ${y(16.8)} L63 ${y(14)} L64.8 ${y(16.8)} L63.6 ${y(16.3)} L63 ${y(17.1)} L62.2 ${y(16.2)} Z`)
</script>

<template>
  <div class="landschap" :class="{ 'landschap--vast': vast }">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="landschap__svg" aria-hidden="true">
      <defs>
        <linearGradient id="landschap-lucht" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#bcd8f2" />
          <stop :offset="Math.max(0.2, (horizon - 20) / 100)" stop-color="#e4eef3" />
          <stop :offset="Math.min(0.95, (horizon + 10) / 100)" stop-color="#f2ebdf" />
        </linearGradient>
        <linearGradient id="landschap-h1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9dcb0" /><stop offset="1" stop-color="#b4cf95" /></linearGradient>
        <linearGradient id="landschap-h2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9cb7c" /><stop offset="1" stop-color="#8fbb5e" /></linearGradient>
        <linearGradient id="landschap-h3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#86b552" /><stop offset="1" stop-color="#5f9a3a" /></linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#landschap-lucht)" />
      <path :d="bergen" fill="#d7e2e6" />
      <path :d="sneeuw" fill="#fff" />
      <path :d="heuvels[0]" fill="url(#landschap-h1)" />
      <path :d="heuvels[1]" fill="url(#landschap-h2)" />
      <path :d="heuvels[2]" fill="url(#landschap-h3)" />
    </svg>
    <div class="landschap__wolk" aria-hidden="true" style="left:30%;top:9%;width:14rem;height:3rem" />
    <div class="landschap__wolk" aria-hidden="true" style="left:58%;top:5%;width:10rem;height:2.4rem;opacity:.6" />
    <div class="landschap__wolk" aria-hidden="true" style="left:12%;top:22%;width:9rem;height:2rem;opacity:.45" />
    <slot />
  </div>
</template>

<style scoped>
.landschap {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.landschap--vast {
  position: fixed;
  z-index: 0;
}

.landschap__svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.landschap__wolk {
  position: absolute;
  border-radius: 50%;
  background: #fff;
  filter: blur(18px);
  opacity: 0.75;
  pointer-events: none;
}
</style>
