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
  <div class="fixed bottom-4 right-4 z-50">
    <UButton v-if="state.fase === 'idle'" icon="i-lucide-timer" color="neutral" variant="solid" @click="start()">
      Start focus (50/10)
    </UButton>

    <UCard v-else variant="solid" class="shadow-lg">
      <div class="flex items-center gap-3">
        <div class="flex flex-col">
          <span class="text-xs text-muted">{{ faseLabel }}<template v-if="trajectNaam"> · {{ trajectNaam }}</template></span>
          <span class="font-display text-2xl leading-none">{{ tijdWeergave }}</span>
        </div>
        <UButton icon="i-lucide-square" size="sm" color="error" variant="ghost" @click="stop()" />
      </div>
    </UCard>
  </div>
</template>
