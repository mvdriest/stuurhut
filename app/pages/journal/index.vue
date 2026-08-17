<script setup lang="ts">
import type { JournalEntry } from '~/composables/useJournal'

const { entries, pending, refresh } = useJournal()

await useAsyncData('journal-init', refresh)

const nieuweInhoud = ref('')
const opslaan = ref(false)

async function toevoegen() {
  if (!nieuweInhoud.value.trim()) return
  opslaan.value = true
  try {
    await $fetch('/api/journal', {
      method: 'POST',
      body: { inhoud: nieuweInhoud.value.trim() }
    })
    nieuweInhoud.value = ''
    await refresh()
  } finally {
    opslaan.value = false
  }
}

function formatDatum(entry: JournalEntry) {
  return new Date(entry.createdAt).toLocaleString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="bg-stuurhut-mist min-h-screen">
    <AppHeaderFoto compact titel="Journal" subtitel="Leg vast wat er speelt." />

    <div class="stuurhut-kolom flex flex-col gap-6 py-[clamp(2rem,5vw,4rem)]">
      <UCard>
        <form class="flex flex-col gap-2" @submit.prevent="toevoegen">
          <UTextarea v-model="nieuweInhoud" placeholder="Schrijf een entry..." :rows="4" autofocus />
          <div class="flex justify-end">
            <UButton type="submit" icon="i-lucide-plus" :loading="opslaan">Vastleggen</UButton>
          </div>
        </form>
      </UCard>

      <p v-if="!pending && entries.length === 0" class="text-muted text-sm">
        Nog geen entries vastgelegd.
      </p>

      <div class="flex flex-col gap-4">
        <UCard v-for="entry in entries" :key="entry.id" variant="subtle">
          <div class="flex flex-col gap-2">
            <p class="text-xs text-muted">{{ formatDatum(entry) }}</p>
            <p class="text-sm whitespace-pre-line">{{ entry.inhoud }}</p>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
