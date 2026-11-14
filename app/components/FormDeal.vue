<script setup lang="ts">
// Akkoord vastleggen: prijs, termijnen, meerwerktarief en je eigen offerte. Eén traject per opdracht.
import type { InvoiceTerm, TermTrigger } from '~/types'
import { TERM_PRESETS, TRIGGER_LABEL } from '~/composables/useTerms'

const props = defineProps<{ id?: string, prefill?: Record<string, unknown> }>()
const editor = useEditor()
const clients = useClients()
const terms = useTerms()
const toast = useToast()
const { state, mode } = useStore()
const supabase = useSupabaseClient()

const existing = computed(() => state.value.projects.find(p => p.id === props.id))
const clientId = ref<string>(existing.value?.clientId ?? (props.prefill?.clientId as string | undefined) ?? '')
const clientProjects = computed(() => clientId.value ? clients.projectsFor(clientId.value) : [])
// Bestaand traject kiezen, of een nieuw maken
const projectId = ref<string>(existing.value?.id ?? (props.prefill?.projectId as string | undefined) ?? clientProjects.value.find(p => p.status !== 'afgerond' && !p.terms?.length)?.id ?? '')
const target = computed(() => state.value.projects.find(p => p.id === projectId.value))

type Part = { label: string, pct: number, trigger: TermTrigger, date?: string }
const f = reactive({
  name: '',
  price: undefined as number | undefined,
  rate: MEERWERK_TARIEF,
  acceptedOn: todayISO(),
  quoteRef: '',
  parts: [] as Part[],
})
function fill() {
  const p = target.value
  f.name = p?.name ?? ''
  f.price = p?.budget || undefined
  f.rate = p?.hourlyRate ?? MEERWERK_TARIEF
  f.acceptedOn = p?.acceptedOn ?? todayISO()
  f.quoteRef = p?.quoteRef ?? ''
  f.parts = p?.terms?.length ? p.terms.map(t => ({ label: t.label, pct: t.pct, trigger: t.trigger, date: t.date })) : TERM_PRESETS[1]!.terms.map(t => ({ ...t }))
}
fill()
watch(projectId, fill)

const preset = computed(() => TERM_PRESETS.find(x => x.terms.length === f.parts.length && x.terms.every((t, i) => t.pct === f.parts[i]!.pct && t.trigger === f.parts[i]!.trigger))?.id)
function usePreset(id: string) {
  f.parts = TERM_PRESETS.find(x => x.id === id)!.terms.map(t => ({ ...t }))
}
const total = computed(() => f.parts.reduce((s, p) => s + (Number(p.pct) || 0), 0))
const amountOf = (p: Part) => ((f.price ?? 0) * (Number(p.pct) || 0)) / 100

const file = ref<File | null>(null)
function pick(e: Event) {
  const x = (e.target as HTMLInputElement).files?.[0]
  file.value = x && x.type === 'application/pdf' ? x : null
  if (x && !file.value) toast.push({ text: 'Alleen een PDF, graag.' })
}

const tried = ref(false)
const errors = computed(() => {
  const e: string[] = []
  if (!clientId.value) e.push('Kies een klant.')
  if (!projectId.value && !f.name.trim()) e.push('Geef de opdracht een naam.')
  if (!f.price || f.price <= 0) e.push('Vul de prijs in.')
  if (Math.round(total.value) !== 100) e.push(`De termijnen tellen op tot ${total.value}%, dat moet 100% zijn.`)
  if (f.parts.some(p => p.trigger === 'datum' && !p.date)) e.push('Kies een datum bij elke termijn "op datum".')
  return e
})
const saving = ref(false)

async function save() {
  tried.value = true
  if (errors.value.length || saving.value) return
  saving.value = true
  try {
    let p = target.value
    if (!p) {
      p = { id: uid('pr'), clientId: clientId.value, name: f.name.trim(), status: 'lopend', progress: 0, budget: 0, hourlyRate: f.rate, billedHours: 0 }
      state.value.projects.push(p)
      p = state.value.projects.at(-1)!
    }
    const old: InvoiceTerm[] = p.terms ?? []
    Object.assign(p, {
      name: f.name.trim() || p.name,
      budget: f.price!,
      hourlyRate: f.rate || MEERWERK_TARIEF,
      fixedPrice: true,
      acceptedOn: f.acceptedOn,
      quoteRef: f.quoteRef.trim() || undefined,
      status: p.status === 'lead' ? 'lopend' : p.status,
      terms: terms.build(f.price!, f.parts, old),
    })
    const c = clients.byId(p.clientId)
    if (c?.status === 'lead') c.status = 'lopend'
    if (!existing.value) c?.timeline.unshift({ id: uid('tl'), kind: 'notitie', date: f.acceptedOn, title: `Akkoord: ${p.name}`, body: `${euro(f.price!)} excl. btw, vaste prijs · ${f.parts.map(x => `${x.pct}% ${TRIGGER_LABEL[x.trigger]}`).join(', ')}` })

    if (file.value && mode.value === 'echt') {
      const { data: u } = await supabase.auth.getUser()
      if (u.user) {
        const path = `${u.user.id}/${p.id}/${Date.now()}-${file.value.name.replace(/[^\w.-]+/g, '_')}`
        const { error } = await supabase.storage.from('offertes').upload(path, file.value, { contentType: 'application/pdf' })
        if (error) toast.push({ text: `Offerte uploaden lukte niet: ${error.message}` })
        else p.quoteFile = { name: file.value.name, path }
      }
    }
    toast.push({ text: existing.value ? 'Afspraken bijgewerkt.' : `Vastgelegd. ${terms.toInvoice.value.some(r => r.project.id === p!.id) ? 'Je kunt de eerste termijn nu factureren.' : 'Ik meld me als er gefactureerd kan worden.'}` })
    editor.saved(p.id)
  }
  finally {
    saving.value = false
  }
}
defineExpose({ save })
</script>

<template>
  <form class="space-y-4" @submit.prevent="save">
    <label v-if="!existing && !prefill?.clientId" class="field">
      <span class="field-label">Klant *</span>
      <select v-model="clientId" class="field-input" data-autofocus>
        <option value="" disabled>Kies een klant</option>
        <option v-for="c in clients.clients.value" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </label>

    <label v-if="!existing && clientProjects.length" class="field">
      <span class="field-label">Bij welk traject?</span>
      <select v-model="projectId" class="field-input">
        <option v-for="p in clientProjects" :key="p.id" :value="p.id">{{ p.name }}{{ p.budget ? ` · ${euroRound(p.budget)}` : '' }}{{ p.terms?.length ? ' · heeft al termijnen' : '' }}</option>
        <option value="">Nieuw traject</option>
      </select>
    </label>
    <label v-if="!projectId || existing" class="field">
      <span class="field-label">Opdracht {{ existing ? '' : '*' }}</span>
      <input v-model="f.name" class="field-input" placeholder="Bijv. website en huisstijl" :data-autofocus="!!prefill?.clientId || undefined">
    </label>

    <div class="grid grid-cols-2 gap-3">
      <label class="field"><span class="field-label">Prijs excl. btw *</span><input v-model.number="f.price" type="number" min="0" step="50" inputmode="decimal" class="field-input num" placeholder="3000"></label>
      <label class="field"><span class="field-label">Meerwerk per uur</span><input v-model.number="f.rate" type="number" min="0" step="5" inputmode="decimal" class="field-input num"></label>
      <label class="field"><span class="field-label">Akkoord op</span><input v-model="f.acceptedOn" type="date" class="field-input"></label>
      <label class="field"><span class="field-label">Offertenummer</span><input v-model="f.quoteRef" class="field-input" placeholder="Je eigen nummer"></label>
    </div>

    <div class="rounded-[14px] bg-surface-2 p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-[14px]">Termijnen</p>
        <div class="seg" role="group" aria-label="Snelle keuze">
          <button v-for="x in TERM_PRESETS" :key="x.id" type="button" class="seg-btn !min-h-9 !text-[13px]" :aria-pressed="preset === x.id" @click="usePreset(x.id)">{{ x.label }}</button>
        </div>
      </div>
      <ul class="mt-3 space-y-2">
        <li v-for="(p, i) in f.parts" :key="i" class="rounded-[12px] bg-surface p-3">
          <div class="grid grid-cols-[1fr_76px] gap-2">
            <input v-model="p.label" class="field-input !min-h-10" :aria-label="`Naam termijn ${i + 1}`">
            <label class="relative"><span class="sr-only">Percentage</span><input v-model.number="p.pct" type="number" min="0" max="100" inputmode="numeric" class="field-input num !min-h-10 pr-7"><span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-muted">%</span></label>
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <select v-model="p.trigger" class="field-input !min-h-10 !w-auto" :aria-label="`Wanneer termijn ${i + 1}`">
              <option v-for="(l, k) in TRIGGER_LABEL" :key="k" :value="k">{{ l }}</option>
            </select>
            <input v-if="p.trigger === 'datum'" v-model="p.date" type="date" class="field-input !min-h-10 !w-auto" aria-label="Datum">
            <span class="num ml-auto text-[14px]">{{ euro(amountOf(p)) }}</span>
            <button v-if="f.parts.length > 1" type="button" class="icon-btn !size-9" aria-label="Termijn weghalen" @click="f.parts.splice(i, 1)"><Icon name="tabler:x" class="size-4" /></button>
          </div>
        </li>
      </ul>
      <div class="mt-2 flex items-center justify-between">
        <button type="button" class="inline-flex min-h-10 items-center gap-1.5 text-[14px] text-sea-ink" @click="f.parts.push({ label: `Termijn ${f.parts.length + 1}`, pct: Math.max(0, 100 - total), trigger: 'datum' })"><Icon name="tabler:plus" class="size-4" />Termijn toevoegen</button>
        <span class="num text-[13px]" :class="Math.round(total) === 100 ? 'text-muted' : 'text-copper-ink'">{{ total }}%</span>
      </div>
    </div>

    <div v-if="mode === 'echt'" class="field">
      <span class="field-label">Je offerte (PDF)</span>
      <p v-if="target?.quoteFile && !file" class="mb-1.5 text-[13.5px] text-muted">Nu: {{ target.quoteFile.name }}</p>
      <input type="file" accept="application/pdf" class="block w-full text-[14px] file:mr-3 file:min-h-10 file:rounded-full file:border-0 file:bg-surface-2 file:px-4 file:text-[14px] file:text-ink" @change="pick">
    </div>

    <ul v-if="tried && errors.length" class="space-y-1 text-[13px] text-copper-ink">
      <li v-for="e in errors" :key="e">{{ e }}</li>
    </ul>
  </form>
</template>
