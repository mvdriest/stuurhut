<script setup lang="ts">
// De "Vandaag"-kaart linksboven op de kaart: focustijd tegen een dagdoel, en de
// top-3 prioriteiten van vandaag (dezelfde vandaag_prioriteiten met max. 3 per dag).
const FOCUS_DOEL_MINUTEN = 4 * 60

const props = defineProps<{ focusMinuten: number }>()

const { items, refresh } = useVandaag()
await useAsyncData('kaart-vandaag-init', () => refresh())

const nieuw = ref('')
const kanToevoegen = computed(() => items.value.length < 3)

async function toevoegen() {
  if (!nieuw.value.trim()) return
  await $fetch('/api/vandaag', { method: 'POST', body: { tekst: nieuw.value.trim() } })
  nieuw.value = ''
  await refresh()
}

async function wissel(id: string, klaar: boolean) {
  await $fetch(`/api/vandaag/${id}`, { method: 'PATCH', body: { klaar } })
  await refresh()
}

const voortgang = computed(() => Math.min(100, Math.round((props.focusMinuten / FOCUS_DOEL_MINUTEN) * 100)))
</script>

<template>
  <section class="kaartkaart">
    <h2 class="kaartkaart__kop">
      <UIcon name="i-lucide-sun" class="size-5 text-amber-500" /> Vandaag
    </h2>

    <div class="mt-4 flex items-baseline justify-between text-sm">
      <span class="font-medium">Focus tijd</span>
      <span class="text-stuurhut-muted">{{ formatDuur(focusMinuten) }} / {{ formatDuur(FOCUS_DOEL_MINUTEN) }}</span>
    </div>
    <div class="mt-2 h-1.5 rounded-full bg-stuurhut-subtle overflow-hidden" role="progressbar" :aria-valuenow="voortgang" aria-valuemin="0" aria-valuemax="100">
      <div class="h-full rounded-full bg-lime-500 transition-[width] duration-700" :style="{ width: `${voortgang}%` }" />
    </div>

    <ul class="mt-4 flex flex-col gap-2.5">
      <li v-for="item in items" :key="item.id">
        <label class="flex items-center gap-3 text-sm cursor-pointer">
          <input
            type="checkbox"
            class="kaartkaart__vink"
            :checked="item.klaar"
            @change="wissel(item.id, ($event.target as HTMLInputElement).checked)"
          >
          <span :class="{ 'line-through text-stuurhut-muted': item.klaar }">{{ item.tekst }}</span>
        </label>
      </li>
    </ul>

    <form v-if="kanToevoegen" class="mt-3 flex items-center gap-3 text-sm" @submit.prevent="toevoegen">
      <UIcon name="i-lucide-plus" class="size-4 text-stuurhut-muted shrink-0" />
      <input v-model="nieuw" class="flex-1 bg-transparent outline-none placeholder:text-stuurhut-muted" placeholder="Voeg taak toe">
    </form>
    <p v-else class="mt-3 text-xs text-stuurhut-muted">Drie is genoeg voor vandaag.</p>
  </section>
</template>

<style scoped>
.kaartkaart__vink {
  appearance: none;
  flex-shrink: 0;
  width: 1.15rem;
  height: 1.15rem;
  border-radius: 9999px;
  border: 1.5px solid var(--color-stuurhut-muted);
  display: grid;
  place-items: center;
  cursor: pointer;
}

.kaartkaart__vink:checked {
  border-color: #65a30d;
  background: #84cc16 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3.5 8.5l3 3 6-7'/%3E%3C/svg%3E") center / 70% no-repeat;
}
</style>
