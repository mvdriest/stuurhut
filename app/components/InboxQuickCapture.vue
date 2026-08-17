<script setup lang="ts">
const { items, pending, refresh } = useInbox()
const { trajecten, refresh: refreshTrajecten } = useTrajecten()
const { refresh: refreshVandaag } = useVandaag()

await useAsyncData('inbox-init', () => refresh())

const nieuwTekst = ref('')
const movingId = ref<string | null>(null)
const error = ref<Record<string, string>>({})

const trajectOptions = computed(() =>
  trajecten.value.map(t => ({ label: t.naam, value: t.id }))
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
    movingId.value = null
    await Promise.all([refresh(), refreshTrajecten()])
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
            <UButton size="sm" variant="soft" color="neutral" @click="movingId = movingId === item.id ? null : item.id">
              Naar traject
            </UButton>
            <UButton icon="i-lucide-trash-2" size="sm" color="error" variant="ghost" @click="verwijderen(item.id)" />
          </div>
        </div>

        <div v-if="movingId === item.id" class="flex gap-2 items-center">
          <USelect
            :items="trajectOptions"
            value-key="value"
            placeholder="Kies een traject..."
            class="w-56"
            @update:model-value="(val: string) => naarTraject(item.id, val)"
          />
          <span v-if="trajectOptions.length === 0" class="text-sm text-muted">Nog geen trajecten aangemaakt.</span>
        </div>

        <p v-if="error[item.id]" class="text-sm text-error">{{ error[item.id] }}</p>
      </div>
    </div>
  </UCard>
</template>
