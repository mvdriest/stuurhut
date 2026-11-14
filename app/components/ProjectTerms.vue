<script setup lang="ts">
// Termijnen van een traject: wat je wanneer factureert. Afvinken, uitstellen of weer oppakken.
import type { Project } from '~/types'

const props = defineProps<{ project: Project }>()
const terms = useTerms()
const editor = useEditor()
const toast = useToast()
const supabase = useSupabaseClient()
const rows = computed(() => terms.forProject(props.project.id))

// Eén termijn tegelijk open voor invoer
const open = ref<{ id: string, kind: 'factuur' | 'uitstel' } | null>(null)
const input = ref('')
const field = ref<HTMLInputElement[] | null>(null)
function start(id: string, kind: 'factuur' | 'uitstel') {
  open.value = open.value?.id === id && open.value.kind === kind ? null : { id, kind }
  input.value = ''
  nextTick(() => field.value?.[0]?.focus())
}
function confirm() {
  if (!open.value) return
  const r = rows.value.find(x => x.term.id === open.value!.id)
  if (open.value.kind === 'factuur') {
    terms.markInvoiced(props.project.id, open.value.id, input.value)
    toast.push({ text: `${r?.term.label ?? 'Termijn'} staat op gefactureerd.${input.value.trim() ? ' Zodra e-Boekhouden hem betaald ziet, zet ik hem op betaald.' : ''}` })
  }
  else {
    terms.postpone(props.project.id, open.value.id, input.value)
    toast.push({ text: 'Uitgesteld. Ik houd hem bij, maar zeur er niet over.' })
  }
  open.value = null
}
function reopen(id: string) {
  terms.reopen(props.project.id, id)
  toast.push({ text: 'Staat weer open.' })
}

const CHIP = { open: 'bg-surface text-muted', uitgesteld: 'bg-copper-soft text-copper-ink', gefactureerd: 'bg-sea-soft text-sea-ink', betaald: 'bg-green-soft text-green' } as const

async function openQuote() {
  const f = props.project.quoteFile
  if (!f) return
  const { data, error } = await supabase.storage.from('offertes').createSignedUrl(f.path, 120)
  if (error || !data) return toast.push({ text: 'Kon de offerte niet openen.' })
  window.open(data.signedUrl, '_blank', 'noopener')
}
</script>

<template>
  <div class="mt-3 rounded-[12px] bg-surface p-3">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
      <p class="text-[13px] font-semibold">Termijnen</p>
      <p class="text-[12.5px] text-muted">meerwerk {{ euroRound(project.hourlyRate) }}/u<template v-if="project.quoteRef"> · {{ project.quoteRef }}</template></p>
      <span class="ml-auto flex gap-1">
        <button v-if="project.quoteFile" type="button" class="icon-btn !size-9" title="Offerte openen" aria-label="Offerte openen" @click="openQuote"><Icon name="tabler:file-text" class="size-4" /></button>
        <button type="button" class="icon-btn !size-9" title="Afspraken bewerken" aria-label="Afspraken bewerken" @click="editor.open({ kind: 'akkoord', id: project.id })"><Icon name="tabler:pencil" class="size-4" /></button>
      </span>
    </div>
    <ul class="mt-2 space-y-2">
      <li v-for="r in rows" :key="r.term.id" class="rounded-[10px] px-2.5 py-2" :class="r.due ? 'bg-copper-soft/60' : 'bg-surface-2'">
        <div class="flex items-center gap-2">
          <span class="min-w-0 flex-1 text-[14px]">
            <span class="font-medium">{{ r.term.label }}</span>
            <span class="text-muted"> · {{ r.term.pct }}% · {{ r.when }}</span>
          </span>
          <span class="num text-[14px]">{{ euro(r.term.amount) }}</span>
          <span class="chip !py-0.5" :class="r.due ? 'bg-copper text-surface' : CHIP[r.status]">{{ r.due ? 'nu factureren' : r.status }}</span>
        </div>
        <p v-if="r.status === 'uitgesteld' && r.term.reason" class="mt-1 text-[12.5px] text-copper-ink">{{ r.term.reason }}</p>
        <p v-if="r.status === 'gefactureerd' || r.status === 'betaald'" class="mt-1 text-[12.5px] text-muted">Gefactureerd {{ r.term.invoicedOn ? shortDate(r.term.invoicedOn) : '' }}<template v-if="r.term.invoiceNumber"> · {{ r.term.invoiceNumber }}</template></p>
        <div class="mt-1.5 flex flex-wrap gap-x-3">
          <template v-if="r.status === 'open'">
            <button type="button" class="min-h-9 text-[13px] font-semibold text-sea-ink" @click="start(r.term.id, 'factuur')">Gefactureerd</button>
            <button type="button" class="min-h-9 text-[13px] text-muted" @click="start(r.term.id, 'uitstel')">Uitstellen</button>
          </template>
          <button v-else-if="r.status !== 'betaald'" type="button" class="min-h-9 text-[13px] text-muted" @click="reopen(r.term.id)">{{ r.status === 'uitgesteld' ? 'Weer oppakken' : 'Toch niet gefactureerd' }}</button>
        </div>
        <form v-if="open?.id === r.term.id" class="mt-1 flex gap-2" @submit.prevent="confirm">
          <input ref="field" v-model="input" class="field-input !min-h-10 flex-1" :placeholder="open.kind === 'factuur' ? 'Factuurnummer (mag leeg)' : 'Waarom? (mag leeg)'" :aria-label="open.kind === 'factuur' ? 'Factuurnummer' : 'Reden'">
          <button type="submit" class="btn-primary !min-h-10 !px-4 !text-[13.5px]">{{ open.kind === 'factuur' ? 'Klaar' : 'Uitstellen' }}</button>
        </form>
      </li>
    </ul>
  </div>
</template>
