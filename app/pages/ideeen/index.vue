<script setup lang="ts">
const { ideeen, pending, refresh } = useIdeeen()
const { trajecten, refresh: refreshTrajecten } = useTrajecten()

await useAsyncData('ideeen-init', () => Promise.all([refresh(), refreshTrajecten()]))

const nieuwTitel = ref('')
const nieuwInhoud = ref('')
const nieuwTrajectId = ref<string | null>(null)

const trajectOptions = computed(() => [
  { label: 'Geen traject', value: null },
  ...trajecten.value.map(t => ({ label: t.naam, value: t.id }))
])

function trajectNaam(id: string | null) {
  return id === null ? null : trajecten.value.find(t => t.id === id)?.naam ?? null
}

function trajectKleur(id: string | null) {
  return id === null ? null : trajecten.value.find(t => t.id === id)?.kleur ?? null
}

async function toevoegen() {
  if (!nieuwTitel.value.trim()) return
  await $fetch('/api/ideeen', {
    method: 'POST',
    body: {
      titel: nieuwTitel.value.trim(),
      inhoud: nieuwInhoud.value.trim() || undefined,
      trajectId: nieuwTrajectId.value
    }
  })
  nieuwTitel.value = ''
  nieuwInhoud.value = ''
  nieuwTrajectId.value = null
  await refresh()
}

const editingId = ref<string | null>(null)
const editTitel = ref('')
const editInhoud = ref('')
const editTrajectId = ref<string | null>(null)

function startEdit(idee: { id: string, titel: string, inhoud: string | null, trajectId: string | null }) {
  editingId.value = idee.id
  editTitel.value = idee.titel
  editInhoud.value = idee.inhoud ?? ''
  editTrajectId.value = idee.trajectId
}

async function opslaanEdit(id: string) {
  if (!editTitel.value.trim()) return
  await $fetch(`/api/ideeen/${id}`, {
    method: 'PATCH',
    body: { titel: editTitel.value.trim(), inhoud: editInhoud.value.trim() || null, trajectId: editTrajectId.value }
  })
  editingId.value = null
  await refresh()
}

async function verwijderen(id: string) {
  if (!confirm('Dit idee verwijderen?')) return
  await $fetch(`/api/ideeen/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div class="bg-stuurhut-mist min-h-screen">
    <AppHeaderFoto compact titel="Ideeën" subtitel="Een vrije plek om ideeën uit te werken." />

    <div class="stuurhut-kolom flex flex-col gap-6 py-[clamp(2rem,5vw,4rem)]">
      <UCard>
        <form class="flex flex-col gap-2" @submit.prevent="toevoegen">
          <UInput v-model="nieuwTitel" placeholder="Titel van je idee..." autofocus />
          <UTextarea v-model="nieuwInhoud" placeholder="Werk het uit... (optioneel)" :rows="3" />
          <div class="flex gap-2 items-center">
            <USelect v-model="nieuwTrajectId" :items="trajectOptions" value-key="value" placeholder="Koppel aan een traject (optioneel)" class="flex-1" />
            <UButton type="submit" icon="i-lucide-plus">Vastleggen</UButton>
          </div>
        </form>
      </UCard>

      <p v-if="!pending && ideeen.length === 0" class="text-muted text-sm">
        Nog geen ideeën vastgelegd.
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <UCard v-for="idee in ideeen" :key="idee.id" variant="subtle">
          <template v-if="editingId === idee.id">
            <div class="flex flex-col gap-2">
              <UInput v-model="editTitel" autofocus />
              <UTextarea v-model="editInhoud" :rows="4" />
              <USelect v-model="editTrajectId" :items="trajectOptions" value-key="value" />
              <div class="flex gap-2 justify-end">
                <UButton color="neutral" variant="ghost" @click="editingId = null">Annuleren</UButton>
                <UButton @click="opslaanEdit(idee.id)">Opslaan</UButton>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="flex flex-col gap-2">
              <div class="flex items-start justify-between gap-2">
                <h3 class="font-medium">{{ idee.titel }}</h3>
                <div class="flex gap-1 shrink-0">
                  <UButton icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost" @click="startEdit(idee)" />
                  <UButton icon="i-lucide-trash-2" size="xs" color="error" variant="ghost" @click="verwijderen(idee.id)" />
                </div>
              </div>
              <p v-if="idee.inhoud" class="text-sm text-muted line-clamp-4 whitespace-pre-line">{{ idee.inhoud }}</p>
              <div v-if="trajectNaam(idee.trajectId)" class="flex items-center gap-1.5 mt-1">
                <span class="size-2 rounded-full shrink-0" :style="{ backgroundColor: trajectKleurHex[trajectKleur(idee.trajectId)!] }" />
                <span class="text-xs text-muted">{{ trajectNaam(idee.trajectId) }}</span>
              </div>
            </div>
          </template>
        </UCard>
      </div>
    </div>
  </div>
</template>
