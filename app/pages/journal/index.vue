<script setup lang="ts">
import type { JournalEntry } from '~/composables/useJournal'

const { entries, pending, refresh } = useJournal()
const { trajecten, refresh: refreshTrajecten } = useTrajecten()

await useAsyncData('journal-init', () => Promise.all([refresh(), refreshTrajecten()]))

const route = useRoute()
const trajectFilter = ref<string | null>(typeof route.query.traject === 'string' ? route.query.traject : null)
const query = ref('')

const nieuweInhoud = ref('')
const nieuwTrajectId = ref<string | null>(trajectFilter.value)
const opslaan = ref(false)

const trajectOpties = computed(() => [
  { label: 'Geen traject', value: null },
  ...trajecten.value.map(t => ({ label: t.naam, value: t.id }))
])

async function toevoegen() {
  if (!nieuweInhoud.value.trim()) return
  opslaan.value = true
  try {
    await $fetch('/api/journal', {
      method: 'POST',
      body: { inhoud: nieuweInhoud.value.trim(), trajectId: nieuwTrajectId.value }
    })
    nieuweInhoud.value = ''
    await refresh()
  } finally {
    opslaan.value = false
  }
}

function formatTijd(entry: JournalEntry) {
  return new Date(entry.createdAt).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

function formatDatum(entry: JournalEntry) {
  return new Date(entry.createdAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })
}

function traject(id: string | null) {
  return id === null ? undefined : trajecten.value.find(t => t.id === id)
}

const trajectFilterNaam = computed(() => traject(trajectFilter.value)?.naam ?? null)

function getMonday(iso: string) {
  const d = new Date(iso)
  const dag = d.getDay()
  const diff = (dag === 0 ? -6 : 1) - dag
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDagen(d: Date, n: number) {
  const nieuw = new Date(d)
  nieuw.setDate(nieuw.getDate() + n)
  return nieuw
}

const gefilterd = computed(() => {
  const q = query.value.trim().toLowerCase()
  return entries.value.filter((e) => {
    if (trajectFilter.value !== null && e.trajectId !== trajectFilter.value) return false
    if (!q) return true
    const t = traject(e.trajectId)
    const hooiberg = [e.inhoud, e.resultaatLabel ?? '', t?.naam ?? ''].join(' ').toLowerCase()
    return hooiberg.includes(q)
  })
})

const weekGroepen = computed(() => {
  const map = new Map<string, { maandag: Date, entries: JournalEntry[] }>()
  for (const e of gefilterd.value) {
    const maandag = getMonday(e.createdAt)
    const sleutel = maandag.toISOString().slice(0, 10)
    if (!map.has(sleutel)) map.set(sleutel, { maandag, entries: [] })
    map.get(sleutel)!.entries.push(e)
  }
  return Array.from(map.values())
    .sort((a, b) => b.maandag.getTime() - a.maandag.getTime())
    .map(g => ({
      label: `Week van ${g.maandag.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })} – ${addDagen(g.maandag, 6).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}`,
      entries: g.entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }))
})
</script>

<template>
  <div>
    <PaginaKop titel="Journal" subtitel="Alles wat je onderweg hebt vastgelegd, en precies waar het is geland.">
      <template #balk-rechts>
        <label class="sh-chip !h-11 w-[min(22rem,60vw)]">
          <UIcon name="i-lucide-search" class="size-4 shrink-0 text-stuurhut-muted" />
          <input v-model="query" type="search" placeholder="Zoek op tekst of traject…" class="flex-1 min-w-0 bg-transparent outline-none text-sm">
        </label>
      </template>
    </PaginaKop>

    <div class="stuurhut-kolom max-w-4xl flex flex-col gap-6 mt-8">
      <form class="sh-kaart flex flex-col gap-3" @submit.prevent="toevoegen">
        <h2 class="sh-kop"><UIcon name="i-lucide-pen-line" class="size-5" /> Iets vastleggen</h2>
        <UTextarea v-model="nieuweInhoud" placeholder="Wat gebeurde er, wat dacht je, wat wil je onthouden?" :rows="4" autofocus />
        <div class="flex flex-wrap items-center justify-between gap-2">
          <USelect v-model="nieuwTrajectId" :items="trajectOpties" value-key="value" class="w-56" />
          <UButton type="submit" icon="i-lucide-plus" :loading="opslaan">Vastleggen</UButton>
        </div>
      </form>

      <div v-if="trajectFilterNaam" class="flex items-center gap-2">
        <span class="text-xs text-stuurhut-muted">Gefilterd op:</span>
        <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-stuurhut-ink text-white">{{ trajectFilterNaam }}</span>
        <button type="button" class="text-xs font-bold text-stuurhut-muted" @click="trajectFilter = null">verwijderen</button>
      </div>

      <p v-if="!pending && entries.length === 0" class="sh-kaart text-sm">
        Nog geen entries vastgelegd.
      </p>
      <p v-else-if="!pending && gefilterd.length === 0" class="sh-kaart text-sm">
        Niets gevonden voor deze zoekopdracht.
      </p>

      <div v-for="week in weekGroepen" :key="week.label" class="flex flex-col gap-3">
        <p class="sh-kicker w-fit px-3 py-1.5 rounded-full bg-[var(--color-stuurhut-glas)]">{{ week.label }}</p>

        <div v-for="entry in week.entries" :key="entry.id" class="journalkaart">
          <div class="flex items-center gap-2.5 flex-wrap">
            <span class="text-sm font-bold">{{ formatDatum(entry) }}</span>
            <span class="text-sm text-stuurhut-muted">{{ formatTijd(entry) }}</span>
            <NuxtLink
              v-if="traject(entry.trajectId)"
              :to="`/trajecten/${entry.trajectId}`"
              class="ml-auto text-xs font-bold px-2.5 py-1 rounded-full"
              :style="{ backgroundColor: trajectKleurHex[traject(entry.trajectId)!.kleur], color: trajectTekstKleur(traject(entry.trajectId)!.kleur) }"
            >
              {{ traject(entry.trajectId)!.naam }}
            </NuxtLink>
          </div>
          <p class="text-sm leading-relaxed whitespace-pre-line">{{ entry.inhoud }}</p>
          <div v-if="entry.resultaatLabel" class="journalkaart__label">
            <span class="size-1.5 rounded-full bg-stuurhut-ink/60 shrink-0" />
            <span>{{ entry.resultaatLabel }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.journalkaart {
  background: var(--color-stuurhut-glas);
  backdrop-filter: blur(12px);
  color: var(--color-stuurhut-ink);
  border-radius: 1rem;
  padding: 1rem 1.125rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  box-shadow: 0 10px 30px rgb(30 40 50 / 0.14);
}

.journalkaart__label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--color-stuurhut-muted);
  padding-top: 0.5rem;
  border-top: 1px dashed rgb(0 0 0 / 0.1);
}
</style>
