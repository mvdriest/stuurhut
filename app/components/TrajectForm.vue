<script setup lang="ts">
import type { TrajectKleur } from '~/utils/kleuren'

const props = defineProps<{
  naam?: string
  status?: 'actief' | 'wachtend' | 'on_hold'
  eerstvolgendeActie?: string | null
  kleur?: TrajectKleur
  doelId?: string | null
  submitLabel: string
}>()

const emit = defineEmits<{
  submit: [payload: { naam: string, status: 'actief' | 'wachtend' | 'on_hold', eerstvolgendeActie: string, kleur: TrajectKleur, doelId: string | null }]
  cancel: []
}>()

const naam = ref(props.naam ?? '')
const status = ref<'actief' | 'wachtend' | 'on_hold'>(props.status ?? 'actief')
const eerstvolgendeActie = ref(props.eerstvolgendeActie ?? '')
const kleur = ref<TrajectKleur>(props.kleur ?? 'grijs')
const doelId = ref<string | null>(props.doelId ?? null)

const { doelen, refresh: refreshDoelen } = useDoelen()
await useAsyncData('traject-form-doelen-init', () => doelen.value.length ? Promise.resolve(doelen.value) : refreshDoelen())

const doelOptions = computed(() => [
  { label: 'Geen doel', value: null },
  ...doelen.value.map(d => ({ label: d.titel, value: d.id }))
])

const statusOptions = [
  { label: 'Actief', value: 'actief' },
  { label: 'Wachtend', value: 'wachtend' },
  { label: 'On hold', value: 'on_hold' }
]

function onSubmit() {
  if (!naam.value.trim()) return
  emit('submit', {
    naam: naam.value.trim(),
    status: status.value,
    eerstvolgendeActie: eerstvolgendeActie.value.trim(),
    kleur: kleur.value,
    doelId: doelId.value
  })
}
</script>

<template>
  <form class="flex flex-col gap-3" @submit.prevent="onSubmit">
    <UFormField label="Naam">
      <UInput v-model="naam" placeholder="Bijv. Anéla" required autofocus class="w-full" />
    </UFormField>
    <UFormField label="Status">
      <USelect v-model="status" :items="statusOptions" value-key="value" class="w-full" />
    </UFormField>
    <UFormField label="Eerstvolgende actie">
      <UInput v-model="eerstvolgendeActie" placeholder="Wat is de volgende stap?" class="w-full" />
    </UFormField>
    <UFormField label="Kleur">
      <div class="flex gap-2 flex-wrap">
        <button
          v-for="k in TRAJECT_KLEUREN"
          :key="k"
          type="button"
          class="size-6 rounded-full border-2 transition"
          :class="kleur === k ? 'border-default scale-110' : 'border-transparent opacity-70 hover:opacity-100'"
          :style="{ backgroundColor: trajectKleurHex[k] }"
          :aria-label="k"
          @click="kleur = k"
        />
      </div>
    </UFormField>
    <UFormField label="Doel">
      <USelect v-model="doelId" :items="doelOptions" value-key="value" class="w-full" />
    </UFormField>
    <div class="flex gap-2 justify-end">
      <!-- erft de tekstkleur van de ondergrond: dit formulier staat ook op een gekleurde folder-balk -->
      <UButton color="neutral" variant="ghost" class="text-inherit" @click="emit('cancel')">Annuleren</UButton>
      <UButton type="submit">{{ submitLabel }}</UButton>
    </div>
  </form>
</template>
