<script setup lang="ts">
import type { TrajectKleur } from '~/utils/kleuren'
import { trajectKleurHex, trajectTekstKleur } from '~/utils/kleuren'
import { TRAJECT_STATUS_STYLES } from '~/utils/trajectStatus'

const { trajecten, pending, refresh } = useTrajecten()
const { doelen, refresh: refreshDoelen } = useDoelen()

await useAsyncData('trajecten-init', () => Promise.all([refresh(), refreshDoelen()]))

function doelTitel(doelId: string | null) {
  return doelId === null ? null : doelen.value.find(d => d.id === doelId)?.titel ?? null
}

const isAdding = ref(false)
const editingId = ref<string | null>(null)
const expandedId = ref<string | null>(null)

function toggleExpand(id: string) {
  if (expandedId.value === id) {
    expandedId.value = null
    editingId.value = null
  } else {
    expandedId.value = id
  }
}

function startEdit(id: string) {
  editingId.value = id
  expandedId.value = id
}

type TrajectPayload = {
  naam: string
  status: 'actief' | 'wachtend' | 'on_hold'
  eerstvolgendeActie: string
  kleur: TrajectKleur
  doelId: string | null
  scope: 'zakelijk' | 'prive'
  wachtOp: string
  streefdatum: string
  bedragAfgesproken: number | null
  bedragGefactureerd: number | null
  financieelNotitie: string
  contactpersoon: string
  contactTelefoon: string
  contactEmail: string
  contactVoorkeur: string
}

async function createTraject(payload: TrajectPayload) {
  await $fetch('/api/trajecten', { method: 'POST', body: payload })
  isAdding.value = false
  await refresh()
}

async function updateTraject(id: string, payload: TrajectPayload) {
  await $fetch(`/api/trajecten/${id}`, { method: 'PATCH', body: payload })
  editingId.value = null
  await refresh()
}

async function deleteTraject(id: string) {
  if (!confirm('Dit traject verwijderen?')) return
  await $fetch(`/api/trajecten/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <section class="trajecten">
    <div class="stuurhut-kolom flex flex-wrap items-end justify-between gap-4">
      <h2 class="stuurhut-titel">Trajecten</h2>
      <UButton v-if="!isAdding" icon="i-lucide-plus" color="neutral" variant="subtle" class="rounded-full mb-2" @click="isAdding = true">
        Nieuw traject
      </UButton>
    </div>

    <div v-if="isAdding" class="stuurhut-kolom mt-8">
      <div class="rounded-2xl bg-white/10 p-5 backdrop-blur">
        <TrajectForm submit-label="Toevoegen" @submit="createTraject" @cancel="isAdding = false" />
      </div>
    </div>

    <p v-if="!pending && trajecten.length === 0 && !isAdding" class="stuurhut-kolom mt-8 text-white/60">
      Nog geen trajecten. Voeg er een toe.
    </p>

    <div v-else class="stuurhut-kolom trajecten__stapel">
      <FolderTab
        v-for="(traject, i) in trajecten"
        :key="traject.id"
        :color="trajectKleurHex[traject.kleur]"
        :text-color="trajectTekstKleur(traject.kleur)"
        :index="i"
        :expanded="expandedId === traject.id"
        @toggle="toggleExpand(traject.id)"
      >
        <template #tab>
          <span class="trajecten__naam">{{ traject.naam }}</span>
        </template>

        <template #strip>
          <span class="trajecten__naam sm:hidden">{{ traject.naam }}</span>
          <div class="trajecten__acties">
            <span class="trajecten__status">{{ TRAJECT_STATUS_STYLES[traject.status].label }}</span>
            <UButton icon="i-lucide-kanban" size="sm" variant="ghost" :to="`/trajecten/${traject.id}`" />
            <UButton icon="i-lucide-pencil" size="sm" variant="ghost" @click="startEdit(traject.id)" />
            <UButton icon="i-lucide-trash-2" size="sm" variant="ghost" @click="deleteTraject(traject.id)" />
          </div>
        </template>

        <template #detail>
          <TrajectForm
            v-if="editingId === traject.id"
            :naam="traject.naam"
            :status="traject.status"
            :eerstvolgende-actie="traject.eerstvolgendeActie"
            :kleur="traject.kleur"
            :doel-id="traject.doelId"
            :scope="traject.scope"
            :wacht-op="traject.wachtOp"
            :streefdatum="traject.streefdatum"
            :bedrag-afgesproken="traject.bedragAfgesproken"
            :bedrag-gefactureerd="traject.bedragGefactureerd"
            :financieel-notitie="traject.financieelNotitie"
            :contactpersoon="traject.contactpersoon"
            :contact-telefoon="traject.contactTelefoon"
            :contact-email="traject.contactEmail"
            :contact-voorkeur="traject.contactVoorkeur"
            submit-label="Opslaan"
            @submit="payload => updateTraject(traject.id, payload)"
            @cancel="editingId = null"
          />
          <template v-else>
            <p class="trajecten__label">Volgende actie</p>
            <p class="trajecten__actie">
              {{ traject.eerstvolgendeActie || 'Geen eerstvolgende actie ingesteld.' }}
            </p>
            <p v-if="doelTitel(traject.doelId)" class="trajecten__doel">
              Doel: {{ doelTitel(traject.doelId) }}
            </p>
          </template>
        </template>
      </FolderTab>
    </div>
  </section>
</template>

<style scoped>
.trajecten {
  background-color: var(--color-stuurhut-ink);
  color: #fff;
  padding-block: clamp(3rem, 7vw, 7rem);
}

.trajecten .stuurhut-titel {
  color: #fff;
}

/* Bovenaan ruimte voor de tab van de eerste rij, die boven zijn balk uitsteekt. */
.trajecten__stapel {
  margin-top: clamp(2rem, 4vw, 4rem);
  padding-top: 5.5rem;
  display: flex;
  flex-direction: column;
}

.trajecten__naam {
  font-family: var(--font-display);
  text-transform: uppercase;
  font-size: clamp(1.35rem, 2.1vw, 2.4rem);
  line-height: 1;
  letter-spacing: -0.01em;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* De balk blijft leeg zoals in het concept; acties verschijnen pas bij hover. */
.trajecten__acties {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  opacity: 0;
  transition: opacity 150ms ease-out;
}

.folder-tab:hover .trajecten__acties,
.folder-tab:focus-within .trajecten__acties {
  opacity: 1;
}

/* Nuxt UI's eigen kleuren zijn onleesbaar op de gekleurde balk. */
.trajecten__acties :deep(button),
.trajecten__acties :deep(a) {
  color: inherit;
}

.trajecten__status {
  font-family: var(--font-display);
  text-transform: uppercase;
  font-size: 0.95rem;
  letter-spacing: 0.04em;
  opacity: 0.75;
}

/* Het bewerkformulier staat op een gekleurde balk: labels en ghost-knoppen
   moeten de balkkleur volgen in plaats van Nuxt UI's donkere tekstkleur. */
.folder-tab :deep(label),
.folder-tab :deep(legend) {
  color: inherit;
}

.trajecten__label {
  font-family: var(--font-display);
  text-transform: uppercase;
  font-size: 0.95rem;
  letter-spacing: 0.06em;
  opacity: 0.7;
  padding-top: 0.5rem;
}

.trajecten__actie {
  font-size: clamp(1rem, 1.3vw, 1.35rem);
  margin-top: 0.35rem;
  max-width: 48rem;
}

.trajecten__doel {
  margin-top: 0.75rem;
  font-size: 0.95rem;
  opacity: 0.7;
}

/* Mobiel: geen uitstekende tabs, dus rijen als losse afgeronde balken. */
@media (max-width: 639px) {
  .trajecten__stapel {
    padding-top: 0;
    gap: 0.75rem;
  }

  .trajecten__stapel :deep(.folder-tab) {
    border-radius: 0.875rem;
  }
}
</style>
