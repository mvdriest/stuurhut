<script setup lang="ts">
import type { ClientStatus } from '~/types'

const props = defineProps<{ id?: string, prefill?: Record<string, unknown> }>()
const editor = useEditor()
const clients = useClients()
const toast = useToast()
const existing = computed(() => clients.byId(props.id))
const project = computed(() => (props.id ? clients.projectsFor(props.id)[0] : undefined))

const f = reactive({
  name: (existing.value?.name ?? props.prefill?.name ?? '') as string,
  contact: (existing.value?.contact ?? props.prefill?.contact ?? '') as string,
  sector: (existing.value?.sector ?? props.prefill?.sector ?? '') as string,
  status: (existing.value?.status ?? props.prefill?.status ?? 'lead') as ClientStatus,
  nextStep: (existing.value?.nextStep ?? '') as string,
  projectName: (project.value?.name ?? '') as string,
  projectBudget: (project.value?.budget ?? undefined) as number | undefined,
})
const tried = ref(false)
const valid = computed(() => f.name.trim().length > 1)

function save() {
  tried.value = true
  if (!valid.value) return
  if (existing.value) {
    clients.updateClient(existing.value.id, f)
    toast.push({ text: 'Klant bijgewerkt.' })
    editor.saved(existing.value.id)
  }
  else {
    const c = clients.addClient(f)
    toast.push({ text: `${c.name} staat bij Klanten.`, to: `/klanten?id=${c.id}`, toLabel: 'Bekijk' })
    editor.saved(c.id)
  }
}
function remove() {
  if (!existing.value) return
  const name = existing.value.name
  const undo = clients.removeClient(existing.value.id)
  editor.close()
  navigateTo('/klanten')
  toast.push({ text: `${name} verwijderd.`, undo })
}
defineExpose({ save })
</script>

<template>
  <form class="space-y-4" @submit.prevent="save">
    <label class="field">
      <span class="field-label">Naam *</span>
      <input v-model="f.name" class="field-input" placeholder="Bijv. Bakkerij Zoet" autocomplete="off" data-autofocus>
      <span v-if="tried && !valid" class="mt-1 block text-[13px] text-copper-ink">Vul een naam in.</span>
    </label>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <label class="field"><span class="field-label">Contactpersoon</span><input v-model="f.contact" class="field-input" placeholder="Voornaam Achternaam"></label>
      <label class="field"><span class="field-label">Branche</span><input v-model="f.sector" class="field-input" placeholder="Bijv. bakkerij"></label>
    </div>
    <div>
      <span class="field-label">Status</span>
      <div class="seg" role="group" aria-label="Status">
        <button v-for="s in (['lead', 'lopend', 'afgerond'] as const)" :key="s" type="button" class="seg-btn capitalize" :aria-pressed="f.status === s" @click="f.status = s">{{ s }}</button>
      </div>
    </div>
    <label class="field"><span class="field-label">Volgende stap</span><input v-model="f.nextStep" class="field-input" placeholder="Kennismaken en wensen ophalen"></label>
    <div class="rounded-[14px] bg-surface-2 p-4">
      <p class="mb-3 text-[14px]">Project <span class="text-muted">(mag ook later)</span></p>
      <div class="grid grid-cols-[1fr_120px] gap-3">
        <label class="field"><span class="field-label">Naam</span><input v-model="f.projectName" class="field-input" placeholder="Bijv. nieuwe website"></label>
        <label class="field"><span class="field-label">Budget (€)</span><input v-model.number="f.projectBudget" type="number" min="0" step="100" inputmode="numeric" class="field-input" placeholder="0"></label>
      </div>
    </div>
    <button v-if="existing" type="button" class="flex min-h-11 items-center gap-2 text-[14.5px] text-copper-ink" @click="remove"><Icon name="tabler:trash" class="size-4" />Klant verwijderen</button>
  </form>
</template>
