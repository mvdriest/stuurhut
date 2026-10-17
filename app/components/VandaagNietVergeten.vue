<script setup lang="ts">
const { taken, refresh } = useTaken()

await useAsyncData('vandaag-niet-vergeten-init', () => taken.value.length ? Promise.resolve(taken.value) : refresh())

const items = computed(() => taken.value.filter(t => t.trajectId === null && t.status !== 'klaar'))

async function afvinken(id: string) {
  await $fetch(`/api/taken/${id}`, { method: 'PATCH', body: { status: 'klaar' } })
  await refresh()
}
</script>

<template>
  <div class="vandaagkaart">
    <h3 class="vandaagkaart__titel">Niet vergeten</h3>
    <div v-if="items.length" class="flex flex-col gap-1 mt-2">
      <label v-for="item in items" :key="item.id" class="nietvergeten-item">
        <input type="checkbox" @change="afvinken(item.id)">
        <span>{{ item.tekst }}</span>
      </label>
    </div>
    <p v-else class="text-sm text-stuurhut-muted mt-2">Niets losstaands op dit moment.</p>
  </div>
</template>

<style scoped>
.vandaagkaart {
  background: var(--color-stuurhut-glas);
  backdrop-filter: blur(12px);
  color: var(--color-stuurhut-ink);
  border-radius: 1.25rem;
  padding: 1.125rem 1.25rem;
  box-shadow: 0 10px 30px rgb(30 40 50 / 0.14);
}

.vandaagkaart__titel {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-stuurhut-ink);
}

.nietvergeten-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.4rem 0;
  font-size: 0.875rem;
  cursor: pointer;
}
</style>
