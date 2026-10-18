<script setup lang="ts">
import type { CommandPaletteGroup, CommandPaletteItem } from '@nuxt/ui'

// Het ⌘K-snelmenu: vanaf elke pagina iets vastleggen of ergens heen springen.
// Wat je typt is meteen de inhoud: "Enter" op een actie legt die tekst vast, zonder
// eerst naar de juiste pagina te hoeven. Op een trajectdossier hangen nieuwe taken,
// ideeën en journal-notities automatisch aan dat traject.
const { open, openNieuwTraject } = useSnelMenu()
const route = useRoute()
const toast = useToast()
const { trajecten, refresh: refreshTrajecten } = useTrajecten()
const { refresh: refreshInbox } = useInbox()
const { refresh: refreshTaken } = useTaken()
const { refresh: refreshIdeeen } = useIdeeen()
const { refresh: refreshJournal } = useJournal()
const { klanten, contactVan, refresh: refreshKlanten } = useKlanten()

const zoekterm = ref('')

defineShortcuts({
  meta_k: {
    usingInput: true,
    handler: () => { open.value = !open.value }
  },
  n: () => openNieuwTraject()
})

watch(open, async (isOpen) => {
  if (!isOpen) {
    zoekterm.value = ''
    return
  }
  // De trajectenlijst kan leeg zijn als je op een pagina zit die hem niet laadt.
  if (!trajecten.value.length) await refreshTrajecten()
  if (!klanten.value.length) await refreshKlanten()
})

const huidigTraject = computed(() => {
  if (!route.path.startsWith('/trajecten/')) return null
  return trajecten.value.find(t => t.id === route.params.id) ?? null
})

async function leg(vast: () => Promise<unknown>, melding: string) {
  open.value = false
  await vast()
  toast.add({ title: melding, icon: 'i-lucide-check', color: 'success' })
}

const tekst = computed(() => zoekterm.value.trim())
const bij = computed(() => huidigTraject.value ? ` · ${huidigTraject.value.naam}` : '')

const acties = computed<CommandPaletteItem[]>(() => {
  const t = tekst.value
  const trajectId = huidigTraject.value?.id ?? null
  const label = (wat: string) => t ? `${wat}: “${t}”` : wat

  const lijst: CommandPaletteItem[] = [{
    label: label('Nieuw traject'),
    icon: 'i-lucide-route',
    kbds: t ? undefined : ['N'],
    onSelect: () => openNieuwTraject(t)
  }]

  // Zonder tekst valt er niets vast te leggen; alleen "Nieuw traject" opent een venster.
  if (!t) return lijst

  return [
    {
      label: label('Nieuwe taak'),
      suffix: bij.value,
      icon: 'i-lucide-square-check',
      onSelect: () => leg(async () => {
        await $fetch('/api/taken', { method: 'POST', body: { tekst: t, trajectId } })
        await refreshTaken()
      }, 'Taak toegevoegd')
    },
    {
      label: label('In de inbox'),
      icon: 'i-lucide-inbox',
      onSelect: () => leg(async () => {
        await $fetch('/api/inbox', { method: 'POST', body: { tekst: t } })
        await refreshInbox()
      }, 'In de inbox gezet')
    },
    {
      label: label('Nieuw idee'),
      suffix: bij.value,
      icon: 'i-lucide-lightbulb',
      onSelect: () => leg(async () => {
        await $fetch('/api/ideeen', { method: 'POST', body: { titel: t, trajectId } })
        await refreshIdeeen()
      }, 'Idee bewaard')
    },
    {
      label: label('In het journal'),
      suffix: bij.value,
      icon: 'i-lucide-notebook-pen',
      onSelect: () => leg(async () => {
        await $fetch('/api/journal', { method: 'POST', body: { inhoud: t, trajectId } })
        await refreshJournal()
      }, 'In het journal gezet')
    },
    ...lijst
  ]
})

const PAGINAS = [
  { label: 'Kaart', icon: 'i-lucide-map', to: '/' },
  { label: 'Vandaag', icon: 'i-lucide-sun', to: '/vandaag' },
  { label: 'Agenda', icon: 'i-lucide-calendar', to: '/agenda' },
  { label: 'Trajecten', icon: 'i-lucide-route', to: '/trajecten' },
  { label: 'Klanten', icon: 'i-lucide-building-2', to: '/klanten' },
  { label: 'Journal', icon: 'i-lucide-notebook-pen', to: '/journal' },
  { label: 'Ideeën', icon: 'i-lucide-lightbulb', to: '/ideeen' }
]

const groepen = computed<CommandPaletteGroup<CommandPaletteItem>[]>(() => {
  // Acties altijd tonen: ze gebruiken de zoekterm als inhoud, niet als filter.
  const vastleggen = { id: 'acties', label: 'Vastleggen', ignoreFilter: true, items: acties.value }
  const navigatie: CommandPaletteGroup<CommandPaletteItem>[] = [{
    id: 'trajecten',
    label: 'Trajecten',
    items: trajecten.value.map(t => ({
      label: t.naam,
      suffix: contactVan(t.contactId)?.naam,
      icon: 'i-lucide-map-pin',
      onSelect: () => { open.value = false; navigateTo(`/trajecten/${t.id}`) }
    }))
  },
  {
    id: 'klanten',
    label: 'Klanten',
    // Ook vindbaar op de naam van een contactpersoon.
    items: klanten.value.map(k => ({
      label: k.naam,
      suffix: k.contacten.map(c => c.naam).join(', ') || undefined,
      icon: 'i-lucide-building-2',
      onSelect: () => { open.value = false; navigateTo(`/klanten/${k.id}`) }
    }))
  },
  {
    id: 'paginas',
    label: "Pagina's",
    items: PAGINAS.map(p => ({ ...p, to: undefined, onSelect: () => { open.value = false; navigateTo(p.to) } }))
  }]

  // Typ je een naam die bestaat, dan wil je daar waarschijnlijk heen: dan staat de
  // treffer bovenaan en springt Enter ernaartoe in plaats van een taak "TP Zorg" te maken.
  const term = tekst.value.toLowerCase()
  const naamTreffer = term && [...trajecten.value.map(t => t.naam), ...klanten.value.map(k => k.naam), ...PAGINAS.map(p => p.label)]
    .some(naam => naam.toLowerCase().includes(term))
  return naamTreffer ? [...navigatie, vastleggen] : [vastleggen, ...navigatie]
})
</script>

<template>
  <UModal v-model:open="open" :ui="{ content: 'max-w-xl' }" title="Snelmenu" description="Vastleggen of ergens heen springen">
    <template #content>
      <UCommandPalette
        v-model:search-term="zoekterm"
        :groups="groepen"
        placeholder="Typ een taak, idee of naam…"
        close
        class="h-[min(28rem,70vh)]"
        @update:open="open = $event"
      />
    </template>
  </UModal>
</template>
