<script setup lang="ts">
const { items, pending, refresh } = useInbox()
const { trajecten, refresh: refreshTrajecten } = useTrajecten()
const { refresh: refreshVandaag } = useVandaag()
const { refresh: refreshTaken } = useTaken()
const toast = useToast()

await useAsyncData('inbox-init', () => refresh())

const nieuwTekst = ref('')
const error = ref<Record<string, string>>({})

// Laatst aangeraakte trajecten bovenaan; geparkeerde helemaal onderaan.
const trajectOptions = computed(() => [...trajecten.value]
  .sort((a, b) => Number(a.status === 'on_hold') - Number(b.status === 'on_hold') || b.updatedAt.localeCompare(a.updatedAt))
  .map(t => ({ label: t.naam, value: t.id }))
)

async function vastleggen() {
  if (!nieuwTekst.value.trim()) return
  await $fetch('/api/inbox', { method: 'POST', body: { tekst: nieuwTekst.value.trim() } })
  nieuwTekst.value = ''
  await refresh()
}

async function verwijderen(id: string) {
  await $fetch(`/api/inbox/${id}`, { method: 'DELETE' })
  await refresh()
}

async function naarVandaag(id: string) {
  error.value = { ...error.value, [id]: '' }
  try {
    await $fetch(`/api/inbox/${id}/move`, { method: 'POST', body: { target: 'vandaag' } })
    await Promise.all([refresh(), refreshVandaag()])
  } catch (err: any) {
    error.value = { ...error.value, [id]: err?.data?.statusMessage || 'Er ging iets mis.' }
  }
}

async function naarTraject(id: string, trajectId: string) {
  error.value = { ...error.value, [id]: '' }
  try {
    await $fetch(`/api/inbox/${id}/move`, { method: 'POST', body: { target: 'traject', trajectId } })
    await Promise.all([refresh(), refreshTrajecten(), refreshTaken()])
    const naam = trajecten.value.find(t => t.id === trajectId)?.naam
    toast.add({ title: `Taak toegevoegd${naam ? ` aan ${naam}` : ''}`, icon: 'i-lucide-check', color: 'success' })
  } catch (err: any) {
    error.value = { ...error.value, [id]: err?.data?.statusMessage || 'Er ging iets mis.' }
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="font-semibold">Snel vastleggen</h2>
    </template>

    <div class="flex flex-col gap-3">
      <form class="flex gap-2" @submit.prevent="vastleggen">
        <UInput v-model="nieuwTekst" placeholder="Wat komt er op?" class="flex-1" autofocus />
        <UButton type="submit" icon="i-lucide-plus" />
      </form>

      <p v-if="!pending && items.length === 0" class="text-muted text-sm">
        Inbox is leeg.
      </p>

      <div v-for="item in items" :key="item.id" class="flex flex-col gap-1 border-b border-default pb-2 last:border-0">
        <div class="flex items-center justify-between gap-2">
          <span class="flex-1">{{ item.tekst }}</span>
          <div class="flex gap-1 shrink-0">
            <UButton size="sm" variant="soft" @click="naarVandaag(item.id)">Naar vandaag</UButton>
            <!-- Kies een traject en het item wordt daar een taak. Typ om te zoeken. -->
            <USelectMenu
              :items="trajectOptions"
              value-key="value"
              :model-value="undefined"
              placeholder="Naar traject"
              :search-input="{ placeholder: 'Zoek een traject…' }"
              size="sm"
              variant="soft"
              color="neutral"
              :ui="{ content: 'min-w-56' }"
              class="w-36"
              @update:model-value="(val: string) => naarTraject(item.id, val)"
            >
              <template #empty>Nog geen trajecten</template>
            </USelectMenu>
            <UButton icon="i-lucide-trash-2" size="sm" color="error" variant="ghost" @click="verwijderen(item.id)" />
          </div>
        </div>

        <p v-if="error[item.id]" class="text-sm text-error">{{ error[item.id] }}</p>
      </div>
    </div>
  </UCard>
</template>
