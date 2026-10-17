<script setup lang="ts">
import type { Halte } from '~/composables/useHaltes'
import type { Taak } from '~/composables/useTaken'

// Alles wat er onderweg met een klant gebeurde, op één tijdlijn: notities uit de
// journal, afspraken, afgeronde taken en bereikte haltes. Niets hiervan wordt apart
// opgeslagen — het logboek wordt afgeleid uit wat er al is.
const props = defineProps<{
  trajectId: string
  haltes: Halte[]
  taken: Taak[]
}>()

const { entries, refresh: refreshJournal } = useJournal()
const { afspraken } = useAfspraken()

interface LogItem {
  id: string
  moment: string
  soort: 'notitie' | 'telegram' | 'taak' | 'halte' | 'afspraak'
  titel: string
  tekst?: string
}

const SOORT: Record<LogItem['soort'], { icoon: string, kleur: string, tekst?: string }> = {
  notitie: { icoon: 'i-lucide-pen-line', kleur: '#ea7b2b' },
  telegram: { icoon: 'i-lucide-send', kleur: '#2aa1da' },
  taak: { icoon: 'i-lucide-check', kleur: '#2544d8' },
  halte: { icoon: 'i-lucide-flag', kleur: '#e4f28a', tekst: '#262626' },
  afspraak: { icoon: 'i-lucide-calendar', kleur: '#d9427f' }
}

const items = computed<LogItem[]>(() => {
  const nu = Date.now()
  const lijst: LogItem[] = [
    ...entries.value.filter(e => e.trajectId === props.trajectId).map(e => ({
      id: `j-${e.id}`,
      moment: e.createdAt,
      soort: e.bron === 'telegram' ? 'telegram' as const : 'notitie' as const,
      titel: e.bron === 'telegram' ? 'Via Telegram' : 'Notitie',
      tekst: e.inhoud
    })),
    ...props.taken.filter(t => t.status === 'klaar' && t.klaarOp).map(t => ({
      id: `t-${t.id}`, moment: t.klaarOp!, soort: 'taak' as const, titel: t.tekst
    })),
    ...props.haltes.filter(h => h.afgerondOp).map(h => ({
      id: `h-${h.id}`, moment: h.afgerondOp!, soort: 'halte' as const, titel: h.titel, tekst: 'Halte bereikt'
    })),
    ...afspraken.value
      .filter(a => a.trajectId === props.trajectId && new Date(`${a.datum}T${a.startTijd}`).getTime() <= nu)
      .map(a => ({ id: `a-${a.id}`, moment: `${a.datum}T${a.startTijd}`, soort: 'afspraak' as const, titel: a.titel }))
  ]
  return lijst.sort((a, b) => new Date(b.moment).getTime() - new Date(a.moment).getTime())
})

const alles = ref(false)
const zichtbaar = computed(() => alles.value ? items.value : items.value.slice(0, 6))

function wanneer(iso: string) {
  // Afspraken hebben een "kale" lokale datum+tijd; niet door Date halen, anders
  // verschuift die op de (UTC-)server en klopt de hydratatie niet.
  const kaal = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(iso)
  if (kaal && !/Z|[+-]\d{2}:?\d{2}$/.test(iso)) {
    const dag = new Date(`${kaal[1]}T12:00:00Z`).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
    return `${dag} · ${kaal[2]}`
  }
  const d = new Date(iso)
  const dag = d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Amsterdam' })
  const heeftTijd = iso.length > 10
  return heeftTijd ? `${dag} · ${d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' })}` : dag
}

const nieuw = ref('')
const opslaan = ref(false)
async function schrijf() {
  if (!nieuw.value.trim()) return
  opslaan.value = true
  try {
    await $fetch('/api/journal', { method: 'POST', body: { inhoud: nieuw.value.trim(), trajectId: props.trajectId } })
    nieuw.value = ''
    await refreshJournal()
  } finally {
    opslaan.value = false
  }
}
</script>

<template>
  <section class="sh-kaart logboek">
    <div class="flex items-center justify-between gap-2">
      <h2 class="sh-kop"><UIcon name="i-lucide-notebook-pen" class="size-5" /> Reislogboek</h2>
      <NuxtLink :to="`/journal?traject=${trajectId}`" class="text-xs text-stuurhut-muted hover:text-stuurhut-ink">Journal →</NuxtLink>
    </div>

    <form class="logboek__invoer" @submit.prevent="schrijf">
      <UIcon name="i-lucide-plus" class="size-4 shrink-0" />
      <input v-model="nieuw" type="text" placeholder="Schrijf iets in het logboek…" class="flex-1 bg-transparent outline-none" :disabled="opslaan">
    </form>

    <ol v-if="zichtbaar.length" class="logboek__lijst">
      <li v-for="item in zichtbaar" :key="item.id" class="logboek__item" :class="{ 'logboek__item--halte': item.soort === 'halte' }">
        <span class="logboek__stip" :style="{ background: SOORT[item.soort].kleur, color: SOORT[item.soort].tekst ?? '#fff' }">
          <UIcon :name="SOORT[item.soort].icoon" class="size-3" />
        </span>
        <p class="logboek__wanneer">{{ wanneer(item.moment) }}</p>
        <p class="logboek__titel">{{ item.titel }}</p>
        <p v-if="item.tekst" class="logboek__tekst">{{ item.tekst }}</p>
      </li>
    </ol>
    <p v-else class="mt-4 text-sm text-stuurhut-muted">Nog niets vastgelegd. Wat er gebeurt, landt hier vanzelf.</p>

    <button v-if="items.length > 6" type="button" class="mt-1 text-xs font-medium text-stuurhut-muted hover:text-stuurhut-ink" @click="alles = !alles">
      {{ alles ? 'Minder tonen' : `Alle ${items.length} tonen` }}
    </button>
  </section>
</template>

<style scoped>
.logboek__invoer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.8rem;
  padding: 0.6rem 0.7rem;
  border-radius: 0.8rem;
  background: var(--color-stuurhut-subtle);
  font-size: 0.85rem;
}

.logboek__invoer input::placeholder {
  color: var(--color-stuurhut-muted);
}

.logboek__lijst {
  position: relative;
  margin-top: 1.1rem;
  padding-left: 1.6rem;
}

.logboek__lijst::before {
  content: "";
  position: absolute;
  left: 0.55rem;
  top: 0.4rem;
  bottom: 0.4rem;
  border-left: 2px dashed rgb(0 0 0 / 0.12);
}

.logboek__item {
  position: relative;
  padding-bottom: 1rem;
}

.logboek__stip {
  position: absolute;
  left: -1.6rem;
  top: 0;
  width: 1.25rem;
  height: 1.25rem;
  display: grid;
  place-items: center;
  border-radius: 9999px;
  box-shadow: 0 0 0 3px var(--color-stuurhut-card);
}

.logboek__wanneer {
  font-size: 0.72rem;
  color: var(--color-stuurhut-muted);
}

.logboek__titel {
  margin-top: 0.1rem;
  font-size: 0.9rem;
  font-weight: 600;
}

.logboek__item--halte .logboek__titel {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: 1.15rem;
}

.logboek__tekst {
  margin-top: 0.15rem;
  font-size: 0.84rem;
  line-height: 1.4;
  color: var(--color-stuurhut-muted);
  white-space: pre-line;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
