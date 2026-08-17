<script setup lang="ts">
import type { Doel } from '~/composables/useDoelen'

const { doelen, pending, refresh } = useDoelen()

await useAsyncData('doelen-init', () => refresh())

const isAdding = ref(false)
const nieuwTitel = ref('')
const nieuwDeadline = ref('')

async function toevoegen() {
  if (!nieuwTitel.value.trim()) return
  await $fetch('/api/doelen', {
    method: 'POST',
    body: { titel: nieuwTitel.value.trim(), deadline: nieuwDeadline.value || undefined }
  })
  nieuwTitel.value = ''
  nieuwDeadline.value = ''
  isAdding.value = false
  await refresh()
}

const expandedId = ref<string | null>(null)

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

const editingId = ref<string | null>(null)
const editTitel = ref('')
const editOmschrijving = ref('')
const editDeadline = ref('')

function startEdit(doel: Doel) {
  editingId.value = doel.id
  expandedId.value = doel.id
  editTitel.value = doel.titel
  editOmschrijving.value = doel.omschrijving ?? ''
  editDeadline.value = doel.deadline ?? ''
}

async function opslaanEdit(id: string) {
  if (!editTitel.value.trim()) return
  await $fetch(`/api/doelen/${id}`, {
    method: 'PATCH',
    body: {
      titel: editTitel.value.trim(),
      omschrijving: editOmschrijving.value.trim() || null,
      deadline: editDeadline.value || null
    }
  })
  editingId.value = null
  await refresh()
}

async function toggleAfgerond(doel: Doel) {
  await $fetch(`/api/doelen/${doel.id}`, {
    method: 'PATCH',
    body: { status: doel.status === 'afgerond' ? 'actief' : 'afgerond' }
  })
  await refresh()
}

async function verwijderen(id: string) {
  if (!confirm('Dit doel verwijderen?')) return
  await $fetch(`/api/doelen/${id}`, { method: 'DELETE' })
  await refresh()
}

const nieuweMijlpaalTitel = ref<Record<string, string>>({})
const nieuweMijlpaalBeloning = ref<Record<string, string>>({})

async function mijlpaalToevoegen(doelId: string) {
  const titel = nieuweMijlpaalTitel.value[doelId]?.trim()
  if (!titel) return
  await $fetch(`/api/doelen/${doelId}/mijlpalen`, {
    method: 'POST',
    body: { titel, beloning: nieuweMijlpaalBeloning.value[doelId]?.trim() || undefined }
  })
  nieuweMijlpaalTitel.value[doelId] = ''
  nieuweMijlpaalBeloning.value[doelId] = ''
  await refresh()
}

async function mijlpaalAfvinken(mijlpaal: { id: string, afgerond: boolean }) {
  await $fetch(`/api/doelen/mijlpalen/${mijlpaal.id}`, {
    method: 'PATCH',
    body: { afgerond: !mijlpaal.afgerond }
  })
  await refresh()
}

async function mijlpaalVerwijderen(id: string) {
  await $fetch(`/api/doelen/mijlpalen/${id}`, { method: 'DELETE' })
  await refresh()
}

function gehaald(doel: Doel) {
  return doel.mijlpalen.filter(m => m.afgerond).length
}

function voortgang(doel: Doel) {
  if (doel.mijlpalen.length === 0) return 0
  return Math.round((gehaald(doel) / doel.mijlpalen.length) * 100)
}
</script>

<template>
  <section class="stuurhut-kolom doelen">
    <article
      v-for="doel in doelen"
      :key="doel.id"
      class="doelkaart"
      :class="{ 'doelkaart--klaar': doel.status === 'afgerond' }"
    >
      <div class="flex items-start justify-between gap-3">
        <span class="doelkaart__pil">{{ doel.status === 'afgerond' ? 'Behaald' : 'Doel' }}</span>
        <div class="doelkaart__acties">
          <UButton :icon="doel.status === 'afgerond' ? 'i-lucide-rotate-ccw' : 'i-lucide-check'" size="xs" color="neutral" variant="ghost" @click="toggleAfgerond(doel)" />
          <UButton icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost" @click="startEdit(doel)" />
          <UButton icon="i-lucide-trash-2" size="xs" color="error" variant="ghost" @click="verwijderen(doel.id)" />
        </div>
      </div>

      <h3 class="doelkaart__titel">{{ doel.titel }}</h3>

      <div class="mt-auto">
        <div class="flex items-end justify-between gap-3">
          <span class="doelkaart__label">Voortgang</span>
          <span class="doelkaart__percentage">{{ voortgang(doel) }}%</span>
        </div>
        <div class="doelkaart__balk">
          <div class="doelkaart__balk-vulling stuurhut-voortgang" :style="{ width: `${voortgang(doel)}%` }" />
        </div>
        <p class="doelkaart__meta">
          {{ gehaald(doel) }} van de {{ doel.mijlpalen.length }} tussendoelen gehaald
        </p>
      </div>

      <button type="button" class="doelkaart__meer" @click="toggleExpand(doel.id)">
        {{ expandedId === doel.id ? 'Verberg' : 'Zie meer' }}
      </button>

      <div v-if="expandedId === doel.id" class="doelkaart__detail">
        <div v-if="editingId === doel.id" class="flex flex-col gap-2">
          <UInput v-model="editTitel" autofocus />
          <UTextarea v-model="editOmschrijving" placeholder="Omschrijving (optioneel)" :rows="2" />
          <UInput v-model="editDeadline" type="date" />
          <div class="flex gap-2 justify-end">
            <UButton color="neutral" variant="ghost" size="sm" @click="editingId = null">Annuleren</UButton>
            <UButton size="sm" @click="opslaanEdit(doel.id)">Opslaan</UButton>
          </div>
        </div>

        <template v-else>
          <p v-if="doel.omschrijving" class="text-sm text-stuurhut-muted whitespace-pre-line">{{ doel.omschrijving }}</p>
          <p v-if="doel.deadline" class="text-xs uppercase tracking-widest text-stuurhut-muted">Deadline {{ doel.deadline }}</p>

          <div v-for="mijlpaal in doel.mijlpalen" :key="mijlpaal.id" class="flex items-start gap-2">
            <UCheckbox :model-value="mijlpaal.afgerond" @update:model-value="mijlpaalAfvinken(mijlpaal)" />
            <div class="flex-1 min-w-0">
              <p class="text-sm" :class="{ 'line-through text-stuurhut-muted': mijlpaal.afgerond }">{{ mijlpaal.titel }}</p>
              <p v-if="mijlpaal.beloning" class="text-xs" :class="mijlpaal.afgerond ? 'text-primary' : 'text-stuurhut-muted'">
                {{ mijlpaal.afgerond ? 'Ontgrendeld: ' : 'Beloning: ' }}{{ mijlpaal.beloning }}
              </p>
            </div>
            <UButton icon="i-lucide-x" size="xs" color="neutral" variant="ghost" @click="mijlpaalVerwijderen(mijlpaal.id)" />
          </div>

          <form class="flex flex-col gap-1.5" @submit.prevent="mijlpaalToevoegen(doel.id)">
            <UInput v-model="nieuweMijlpaalTitel[doel.id]" placeholder="Nieuwe mijlpaal..." size="sm" />
            <div class="flex gap-1.5">
              <UInput v-model="nieuweMijlpaalBeloning[doel.id]" placeholder="Beloning (optioneel)" size="sm" class="flex-1" />
              <UButton type="submit" size="sm" icon="i-lucide-plus" />
            </div>
          </form>
        </template>
      </div>
    </article>

    <article class="doelkaart doelkaart--nieuw">
      <template v-if="isAdding">
        <form class="flex flex-col gap-2 h-full justify-center" @submit.prevent="toevoegen">
          <UInput v-model="nieuwTitel" placeholder="Waar wil je naartoe werken?" autofocus />
          <UInput v-model="nieuwDeadline" type="date" />
          <div class="flex gap-2 justify-end">
            <UButton color="neutral" variant="ghost" size="sm" @click="isAdding = false">Annuleren</UButton>
            <UButton type="submit" size="sm">Toevoegen</UButton>
          </div>
        </form>
      </template>
      <button v-else type="button" class="doelkaart__toevoegen" @click="isAdding = true">
        <span class="doelkaart__plus">+</span>
        <span>{{ pending || doelen.length ? 'Doel toevoegen' : 'Je eerste doel' }}</span>
      </button>
    </article>
  </section>
</template>

<style scoped>
.doelen {
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(1rem, 2.3vw, 2.75rem);
  /* De kaarten schuiven over de onderkant van de hero heen. */
  margin-top: calc(-1 * clamp(3rem, 11vw, 13rem));
  position: relative;
  z-index: 2;
}

.doelkaart {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: clamp(1.5rem, 2vw, 2.25rem);
  border-radius: 1.25rem;
  background-color: #fff;
  box-shadow: 0 18px 40px rgb(0 0 0 / 0.12);
}

.doelkaart--klaar {
  opacity: 0.65;
}

.doelkaart__pil {
  align-self: flex-start;
  border-radius: 9999px;
  background-color: #e4e4e4;
  color: var(--color-stuurhut-ink);
  font-family: var(--font-display);
  text-transform: uppercase;
  font-size: clamp(0.875rem, 1vw, 1.125rem);
  line-height: 1;
  padding: 0.75em 1.35em;
}

.doelkaart__acties {
  display: flex;
  gap: 0.125rem;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 150ms ease-out;
}

.doelkaart:hover .doelkaart__acties,
.doelkaart:focus-within .doelkaart__acties {
  opacity: 1;
}

.doelkaart__titel {
  font-family: var(--font-display);
  text-transform: uppercase;
  font-size: clamp(1.75rem, 2.4vw, 2.75rem);
  line-height: 0.95;
  letter-spacing: -0.01em;
  color: var(--color-stuurhut-ink);
}

.doelkaart__label {
  font-size: clamp(0.9rem, 1vw, 1.05rem);
  color: var(--color-stuurhut-ink);
}

.doelkaart__percentage {
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 2vw, 2.25rem);
  line-height: 0.9;
  color: var(--color-stuurhut-ink);
}

.doelkaart__balk {
  margin-top: 0.6rem;
  height: 0.5rem;
  border-radius: 9999px;
  background-color: #dcdcdc;
  overflow: hidden;
}

.doelkaart__balk-vulling {
  height: 100%;
  border-radius: 9999px;
  transition: width 300ms ease-out;
}

.doelkaart__meta {
  margin-top: 0.65rem;
  font-size: clamp(0.9rem, 1vw, 1.05rem);
  color: var(--color-stuurhut-muted);
}

.doelkaart__meer {
  align-self: flex-start;
  font-weight: 700;
  font-size: clamp(0.9rem, 1vw, 1.05rem);
  color: var(--color-stuurhut-ink);
}

.doelkaart__meer:hover {
  text-decoration: underline;
}

.doelkaart__detail {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid #e4e4e4;
}

.doelkaart--nieuw {
  background-color: transparent;
  box-shadow: none;
  border: 2px dashed rgb(0 0 0 / 0.18);
  justify-content: center;
}

.doelkaart__toevoegen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 100%;
  font-family: var(--font-display);
  text-transform: uppercase;
  font-size: clamp(1.1rem, 1.4vw, 1.5rem);
  color: rgb(0 0 0 / 0.45);
}

.doelkaart__toevoegen:hover {
  color: var(--color-stuurhut-ink);
}

.doelkaart__plus {
  font-size: 2.5em;
  line-height: 0.8;
}

@media (min-width: 640px) {
  .doelen {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  /* Gelijke kaarthoogte zoals in het concept; op mobiel hugt de kaart zijn inhoud. */
  .doelkaart {
    min-height: 21rem;
  }
}

/* Drie kolommen zoals in het concept. */
@media (min-width: 1024px) {
  .doelen {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
