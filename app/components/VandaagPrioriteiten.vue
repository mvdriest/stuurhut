<script setup lang="ts">
const { items, pending, refresh } = useVandaag()

await useAsyncData('vandaag-init', () => refresh())

const nieuwTekst = ref('')
const editingId = ref<string | null>(null)
const editTekst = ref('')
const error = ref('')

const MAX_PER_DAG = 3

async function toevoegen() {
  error.value = ''
  if (!nieuwTekst.value.trim()) return
  try {
    await $fetch('/api/vandaag', { method: 'POST', body: { tekst: nieuwTekst.value.trim() } })
    nieuwTekst.value = ''
    await refresh()
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Er ging iets mis.'
  }
}

async function toggleKlaar(item: { id: string, klaar: boolean }) {
  await $fetch(`/api/vandaag/${item.id}`, { method: 'PATCH', body: { klaar: !item.klaar } })
  await refresh()
}

function startEdit(item: { id: string, tekst: string }) {
  editingId.value = item.id
  editTekst.value = item.tekst
}

async function opslaanEdit(id: string) {
  if (!editTekst.value.trim()) return
  await $fetch(`/api/vandaag/${id}`, { method: 'PATCH', body: { tekst: editTekst.value.trim() } })
  editingId.value = null
  await refresh()
}

async function verwijderen(id: string) {
  await $fetch(`/api/vandaag/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="font-semibold">Vandaag — 3 prioriteiten</h2>
    </template>

    <div class="flex flex-col gap-2">
      <div v-for="item in items" :key="item.id" class="flex items-center gap-2 group">
        <UCheckbox :model-value="item.klaar" @update:model-value="toggleKlaar(item)" />
        <template v-if="editingId === item.id">
          <UInput v-model="editTekst" class="flex-1" autofocus @keyup.enter="opslaanEdit(item.id)" @keyup.esc="editingId = null" />
          <UButton size="sm" icon="i-lucide-check" @click="opslaanEdit(item.id)" />
        </template>
        <template v-else>
          <span class="flex-1" :class="{ 'line-through text-muted': item.klaar }" @click="startEdit(item)">
            {{ item.tekst }}
          </span>
          <UButton icon="i-lucide-trash-2" size="sm" color="error" variant="ghost" class="opacity-0 group-hover:opacity-100" @click="verwijderen(item.id)" />
        </template>
      </div>

      <p v-if="!pending && items.length === 0" class="text-muted text-sm">
        Nog geen prioriteiten voor vandaag.
      </p>

      <form v-if="items.length < MAX_PER_DAG" class="flex gap-2 mt-2" @submit.prevent="toevoegen">
        <UInput v-model="nieuwTekst" placeholder="Nieuwe prioriteit..." class="flex-1" />
        <UButton type="submit" icon="i-lucide-plus" />
      </form>
      <p v-else class="text-muted text-sm mt-2">
        Je hebt je 3 prioriteiten voor vandaag al gezet.
      </p>

      <UAlert v-if="error" color="error" variant="soft" :title="error" />
    </div>
  </UCard>
</template>
