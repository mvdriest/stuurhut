<script setup lang="ts">
const { state, resterendeSeconden, start, stop } = useFocusTimer()
const { trajecten } = useTrajecten()

const trajectNaam = computed(() => {
  if (state.value.trajectId === null) return null
  return trajecten.value.find(t => t.id === state.value.trajectId)?.naam ?? null
})

const faseLabel = computed(() => state.value.fase === 'werk' ? 'Focus' : state.value.fase === 'pauze' ? 'Pauze' : '')

const tijdWeergave = computed(() => {
  const min = Math.floor(resterendeSeconden.value / 60).toString().padStart(2, '0')
  const sec = (resterendeSeconden.value % 60).toString().padStart(2, '0')
  return `${min}:${sec}`
})
</script>

<template>
  <!-- Zelfde donkere pil als "Preview Dag" op de kaart, rechtsonder op elke pagina. -->
  <div class="focustimer">
    <button v-if="state.fase === 'idle'" type="button" class="sh-pil" @click="start()">
      <span class="text-sm">Focus 50/10</span>
      <span class="sh-pil__rond"><UIcon name="i-lucide-target" class="size-4" /></span>
    </button>

    <div v-else class="sh-pil">
      <span class="flex flex-col leading-tight">
        <span class="text-[0.7rem] text-white/60">{{ faseLabel }}<template v-if="trajectNaam"> · {{ trajectNaam }}</template></span>
        <span class="font-display text-xl tabular-nums">{{ tijdWeergave }}</span>
      </span>
      <button type="button" class="sh-pil__rond" aria-label="Focus stoppen" @click="stop()">
        <UIcon name="i-lucide-square" class="size-4" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.focustimer {
  position: fixed;
  right: 1.25rem;
  bottom: 1.25rem;
  z-index: 50;
}
</style>
