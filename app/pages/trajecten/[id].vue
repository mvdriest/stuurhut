<script setup lang="ts">
import type { Traject } from '~/composables/useTrajecten'
import type { Dienst } from '~/utils/route'
import { DIENSTEN, DIENST_INFO } from '~/utils/route'
import { trajectKleurHex } from '~/utils/kleuren'
import { TRAJECT_STATUS_STYLES } from '~/utils/trajectStatus'
import { staleness } from '~/utils/trajectStaleness'

// Het klantdossier: de reis van één traject. Bovenaan het landschap met de route
// (links de klant, rechts de halte waar je bent en het logboek), daaronder de
// werkplaats met het volledige takenbord en de bestanden.
definePageMeta({
  pageTransition: { name: 'stuurhut-nav', mode: 'out-in' }
})

const route = useRoute()
const trajectId = computed(() => String(route.params.id))

const { trajecten, refresh: refreshTrajecten } = useTrajecten()
const { taken, refresh: refreshTaken } = useTaken()
const { refresh: refreshJournal } = useJournal()
const { refresh: refreshAfspraken } = useAfspraken()
const { refresh: refreshHaltes, routeVan } = useHaltes()
const { bestanden, refresh: refreshBestanden } = useTrajectBestanden(trajectId.value)

await useAsyncData(`dossier-${trajectId.value}`, () => Promise.all([
  refreshTrajecten(), refreshTaken(), refreshJournal(), refreshAfspraken(), refreshHaltes(), refreshBestanden()
]))

const traject = computed(() => trajecten.value.find(t => t.id === trajectId.value))
const reis = computed(() => routeVan(trajectId.value))
const takenVanTraject = computed(() => taken.value.filter(t => t.trajectId === trajectId.value))

// --- Haltes ------------------------------------------------------------------------

const huidig = computed(() => huidigeHalte(reis.value))
const gekozenId = ref<string | null>(null)
const gekozen = computed(() => reis.value.find(h => h.id === gekozenId.value) ?? huidig.value ?? reis.value.at(-1) ?? null)
const gekozenIndex = computed(() => gekozen.value ? reis.value.findIndex(h => h.id === gekozen.value!.id) : -1)

const openPerHalte = computed(() => {
  const telling: Record<string, number> = {}
  for (const t of takenVanTraject.value) {
    if (t.halteId && t.status !== 'klaar') telling[t.halteId] = (telling[t.halteId] ?? 0) + 1
  }
  return telling
})

async function routeGewijzigd() {
  await Promise.all([refreshHaltes(), refreshTrajecten(), refreshTaken()])
}

async function halteGewijzigd() {
  // Na afronden springt de selectie mee naar de nieuwe huidige halte.
  gekozenId.value = null
  await routeGewijzigd()
}

// --- Klant ---------------------------------------------------------------------------

const eur = (n: number) => `€ ${n.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`

const dienstenLabel = computed(() => traject.value?.diensten.map(d => DIENST_INFO[d].label).join(' + ') ?? '')
const onderwegSinds = computed(() => traject.value
  ? new Date(traject.value.createdAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', timeZone: 'Europe/Amsterdam' })
  : '')
const hartslag = computed(() => traject.value ? staleness(traject.value.updatedAt) : null)

const initialen = computed(() => (traject.value?.contactpersoon ?? '')
  .split(/\s+/).filter(w => w && w[0] === w[0]?.toUpperCase()).map(w => w[0]).slice(0, 2).join('') || '?')

const voorkeur = computed<'bel' | 'mail' | null>(() => {
  const v = traject.value?.contactVoorkeur?.toLowerCase() ?? ''
  if (/bel|telefo/.test(v)) return 'bel'
  if (/mail/.test(v)) return 'mail'
  return null
})

const kasPct = computed(() => {
  const t = traject.value
  if (!t?.bedragAfgesproken) return 0
  return Math.min(100, Math.round(((t.bedragGefactureerd ?? 0) / t.bedragAfgesproken) * 100))
})

const andereTrajecten = computed(() => [[
  { label: 'Alle trajecten', icon: 'i-lucide-route', to: '/trajecten' }
], trajecten.value
  .filter(t => t.id !== trajectId.value && t.status !== 'on_hold')
  .map(t => ({ label: t.naam, to: `/trajecten/${t.id}` }))])

// --- Bewerken ------------------------------------------------------------------------

const bewerkenOpen = ref(false)
const routeOpen = ref(false)

async function opslaan(payload: Record<string, unknown>) {
  await $fetch(`/api/trajecten/${trajectId.value}`, { method: 'PATCH', body: payload })
  bewerkenOpen.value = false
  await routeGewijzigd()
}

// Inline bewerken van één blok tegelijk (contact, reiskas, volgende stap), zodat je
// het dossier gaandeweg aanvult in plaats van alles vooraf in één formulier.
type Blok = 'contact' | 'kas' | 'stap'
const bewerkBlok = ref<Blok | null>(null)
const concept = reactive({
  contactpersoon: '', contactTelefoon: '', contactEmail: '', contactVoorkeur: '',
  bedragAfgesproken: null as number | null, bedragGefactureerd: null as number | null, financieelNotitie: '',
  eerstvolgendeActie: ''
})

function startBewerken(blok: Blok) {
  const t = traject.value
  if (!t) return
  Object.assign(concept, {
    contactpersoon: t.contactpersoon ?? '',
    contactTelefoon: t.contactTelefoon ?? '',
    contactEmail: t.contactEmail ?? '',
    contactVoorkeur: t.contactVoorkeur ?? '',
    bedragAfgesproken: t.bedragAfgesproken,
    bedragGefactureerd: t.bedragGefactureerd,
    financieelNotitie: t.financieelNotitie ?? '',
    eerstvolgendeActie: t.eerstvolgendeActie ?? ''
  })
  bewerkBlok.value = blok
}

// Een leeg number-input geeft '' terug; de API verwacht dan null.
const bedrag = (n: number | string | null) => (n === '' || n === null ? null : Number(n))

async function blokOpslaan() {
  const velden: Record<Blok, Record<string, unknown>> = {
    contact: {
      contactpersoon: concept.contactpersoon.trim(),
      contactTelefoon: concept.contactTelefoon.trim(),
      contactEmail: concept.contactEmail.trim(),
      contactVoorkeur: concept.contactVoorkeur.trim()
    },
    kas: {
      bedragAfgesproken: bedrag(concept.bedragAfgesproken),
      bedragGefactureerd: bedrag(concept.bedragGefactureerd),
      financieelNotitie: concept.financieelNotitie.trim()
    },
    stap: { eerstvolgendeActie: concept.eerstvolgendeActie.trim() }
  }
  // Eerst sluiten: blur en submit kunnen allebei afgaan (klik op het vinkje), zo slaat er maar één op.
  const blok = bewerkBlok.value
  if (!blok) return
  bewerkBlok.value = null
  await $fetch(`/api/trajecten/${trajectId.value}`, { method: 'PATCH', body: velden[blok] })
  await refreshTrajecten()
}

const heeftContact = computed(() => !!(traject.value?.contactpersoon || traject.value?.contactEmail || traject.value?.contactTelefoon))

// Nog geen route: diensten kiezen en uitstippelen.
const startDiensten = ref<Dienst[]>([])
watch(traject, t => { if (t && !startDiensten.value.length) startDiensten.value = [...t.diensten] }, { immediate: true })

function wisselStartDienst(d: Dienst) {
  startDiensten.value = startDiensten.value.includes(d) ? startDiensten.value.filter(x => x !== d) : [...startDiensten.value, d]
}

async function stippelUit() {
  if (!startDiensten.value.length) return
  // Zonder haltes bouwt de server de hele route uit het sjabloon op.
  await $fetch(`/api/trajecten/${trajectId.value}`, { method: 'PATCH', body: { diensten: startDiensten.value } })
  await routeGewijzigd()
}

const eigenHalte = ref('')
async function voegEigenHalteToe() {
  if (!eigenHalte.value.trim()) return
  await $fetch('/api/haltes', { method: 'POST', body: { trajectId: trajectId.value, titel: eigenHalte.value.trim() } })
  eigenHalte.value = ''
  await routeGewijzigd()
}

// --- Bestanden -----------------------------------------------------------------------

const nieuwBestandNaam = ref('')
const nieuwBestandUrl = ref('')

async function bestandToevoegen() {
  if (!nieuwBestandNaam.value.trim()) return
  const url = nieuwBestandUrl.value.trim()
  await $fetch(`/api/trajecten/${trajectId.value}/bestanden`, {
    method: 'POST',
    body: { kind: url ? 'Link' : 'Notitie', naam: nieuwBestandNaam.value.trim(), url: url || undefined }
  })
  nieuwBestandNaam.value = ''
  nieuwBestandUrl.value = ''
  await refreshBestanden()
}

async function bestandVerwijderen(id: string) {
  await $fetch(`/api/bestanden/${id}`, { method: 'DELETE' })
  await refreshBestanden()
}

function formProps(t: Traject) {
  const { id: _id, userId: _u, createdAt: _c, updatedAt: _up, ...rest } = t
  return rest
}
</script>

<template>
  <div v-if="traject" class="dossier">
    <section class="dossier__scene">
      <Landschap :horizon="27" :vast="false" class="dossier__landschap">
        <ReisRoute
          v-if="reis.length"
          :haltes="reis"
          :geselecteerd-id="gekozen?.id ?? null"
          :open-taken="openPerHalte"
          @kies="gekozenId = $event"
        />
      </Landschap>

      <!-- Bovenbalk -->
      <header class="dossier__balk">
        <div class="flex gap-2 pl-[3.75rem] min-w-0">
          <UDropdownMenu :items="andereTrajecten" :content="{ align: 'start' }">
            <button type="button" class="sh-chip text-sm min-w-0">
              <UIcon name="i-lucide-route" class="size-4 shrink-0" />
              <span class="text-stuurhut-muted hidden sm:inline">Trajecten</span>
              <UIcon name="i-lucide-chevron-right" class="size-4 text-stuurhut-muted hidden sm:inline" />
              <span class="font-semibold truncate">{{ traject.naam }}</span>
              <UIcon name="i-lucide-chevron-down" class="size-4 shrink-0" />
            </button>
          </UDropdownMenu>
        </div>
        <div class="flex gap-2">
          <button type="button" class="sh-chip text-sm" @click="routeOpen = true">
            <UIcon name="i-lucide-map" class="size-4" /><span class="hidden sm:inline">Route</span>
          </button>
          <button type="button" class="sh-chip text-sm" @click="bewerkenOpen = true">
            <UIcon name="i-lucide-pencil" class="size-4" /><span class="hidden sm:inline">Bewerken</span>
          </button>
        </div>
      </header>

      <!-- Links: de klant -->
      <aside class="dossier__links">
        <div class="dossier__klant">
          <h1 class="sh-titel dossier__naam">{{ traject.naam }}</h1>
          <p class="dossier__meta">
            <template v-if="dienstenLabel">{{ dienstenLabel }} · </template>onderweg sinds {{ onderwegSinds }}
          </p>
          <div class="flex flex-wrap gap-1.5 mt-2.5">
            <span v-if="hartslag" class="dossier__hartslag" :class="`dossier__hartslag--${hartslag.niveau}`">
              <UIcon name="i-lucide-heart-pulse" class="size-3.5" /> {{ hartslag.label }}
            </span>
            <span v-if="traject.status !== 'actief'" class="dossier__hartslag">
              {{ TRAJECT_STATUS_STYLES[traject.status].label }}
            </span>
          </div>
        </div>

        <!-- Reisgenoot -->
        <form v-if="bewerkBlok === 'contact'" class="sh-kaart flex flex-col gap-2" @submit.prevent="blokOpslaan" @keydown.esc="bewerkBlok = null">
          <h2 class="sh-kop mb-1"><UIcon name="i-lucide-user-round" class="size-5" /> Reisgenoot</h2>
          <UInput v-model="concept.contactpersoon" placeholder="Naam" autofocus />
          <UInput v-model="concept.contactTelefoon" type="tel" placeholder="Telefoon" />
          <UInput v-model="concept.contactEmail" type="email" placeholder="E-mail" />
          <UInput v-model="concept.contactVoorkeur" placeholder="Voorkeur, bijv. belt liefst" />
          <div class="flex justify-end gap-2 mt-1">
            <UButton color="neutral" variant="ghost" size="sm" @click="bewerkBlok = null">Annuleren</UButton>
            <UButton type="submit" size="sm">Opslaan</UButton>
          </div>
        </form>
        <section v-else-if="heeftContact" class="sh-kaart">
          <div class="flex items-center justify-between">
            <h2 class="sh-kop"><UIcon name="i-lucide-user-round" class="size-5" /> Reisgenoot</h2>
            <UButton icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost" aria-label="Contact bewerken" @click="startBewerken('contact')" />
          </div>
          <div class="flex items-center gap-3 mt-3">
            <span class="dossier__avatar" :style="{ background: trajectKleurHex[traject.kleur] }">{{ initialen }}</span>
            <div class="min-w-0">
              <p class="font-semibold truncate">{{ traject.contactpersoon || 'Contact' }}</p>
              <p v-if="traject.contactVoorkeur" class="text-xs text-stuurhut-muted">{{ traject.contactVoorkeur }}</p>
            </div>
          </div>
          <div class="flex gap-1.5 mt-3">
            <a v-if="traject.contactTelefoon" :href="`tel:${traject.contactTelefoon}`" class="dossier__actie" :class="{ 'dossier__actie--voorkeur': voorkeur === 'bel' }">
              <UIcon name="i-lucide-phone" class="size-4" /> Bel
            </a>
            <a v-if="traject.contactEmail" :href="`mailto:${traject.contactEmail}`" class="dossier__actie" :class="{ 'dossier__actie--voorkeur': voorkeur === 'mail' }">
              <UIcon name="i-lucide-mail" class="size-4" /> Mail
            </a>
            <NuxtLink to="/agenda" class="dossier__actie">
              <UIcon name="i-lucide-calendar-plus" class="size-4" /> Plan
            </NuxtLink>
          </div>
        </section>

        <!-- Reiskas -->
        <form v-if="bewerkBlok === 'kas'" class="sh-kaart flex flex-col gap-2" @submit.prevent="blokOpslaan" @keydown.esc="bewerkBlok = null">
          <h2 class="sh-kop mb-1"><UIcon name="i-lucide-wallet" class="size-5" /> Reiskas</h2>
          <UFormField label="Afgesproken (€)" size="sm">
            <UInput v-model.number="concept.bedragAfgesproken" type="number" min="0" step="0.01" autofocus class="w-full" />
          </UFormField>
          <UFormField label="Gefactureerd (€)" size="sm">
            <UInput v-model.number="concept.bedragGefactureerd" type="number" min="0" step="0.01" class="w-full" />
          </UFormField>
          <UInput v-model="concept.financieelNotitie" placeholder="Notitie, bijv. termijnen" />
          <div class="flex justify-end gap-2 mt-1">
            <UButton color="neutral" variant="ghost" size="sm" @click="bewerkBlok = null">Annuleren</UButton>
            <UButton type="submit" size="sm">Opslaan</UButton>
          </div>
        </form>
        <section v-else-if="traject.bedragAfgesproken" class="sh-kaart">
          <div class="flex items-center justify-between">
            <h2 class="sh-kop"><UIcon name="i-lucide-wallet" class="size-5" /> Reiskas</h2>
            <UButton icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost" aria-label="Reiskas bewerken" @click="startBewerken('kas')" />
          </div>
          <div class="flex items-baseline justify-between gap-2 mt-3">
            <strong class="sh-titel text-[1.75rem]">{{ eur(traject.bedragGefactureerd ?? 0) }}</strong>
            <span class="text-xs text-stuurhut-muted text-right">van {{ eur(traject.bedragAfgesproken) }} gefactureerd</span>
          </div>
          <div class="dossier__kas"><span :style="{ width: `${kasPct}%` }" /></div>
          <p v-if="traject.financieelNotitie" class="text-xs text-stuurhut-muted mt-2">{{ traject.financieelNotitie }}</p>
        </section>

        <!-- Wat nog ontbreekt: één tik om aan te vullen -->
        <div v-if="!bewerkBlok && (!heeftContact || (traject.scope === 'zakelijk' && !traject.bedragAfgesproken))" class="flex flex-wrap gap-1.5">
          <button v-if="!heeftContact" type="button" class="dossier__aanvullen" @click="startBewerken('contact')">
            <UIcon name="i-lucide-plus" class="size-3.5" /> Contact
          </button>
          <button v-if="traject.scope === 'zakelijk' && !traject.bedragAfgesproken" type="button" class="dossier__aanvullen" @click="startBewerken('kas')">
            <UIcon name="i-lucide-plus" class="size-3.5" /> Bedrag
          </button>
        </div>

        <section v-if="traject.wachtOp" class="sh-kaart flex gap-3 items-start">
          <span class="dossier__wacht"><UIcon name="i-lucide-hourglass" class="size-4" /></span>
          <div>
            <p class="font-semibold text-sm">Wacht op</p>
            <p class="text-xs text-stuurhut-muted">{{ traject.wachtOp }}</p>
          </div>
        </section>

        <form v-if="bewerkBlok === 'stap'" class="sh-cta" @submit.prevent="blokOpslaan" @keydown.esc="bewerkBlok = null">
          <span class="flex-1 min-w-0">
            <span class="sh-kicker !text-stuurhut-ink/60 block">Volgende stap</span>
            <input v-model="concept.eerstvolgendeActie" class="dossier__stapinput" placeholder="Wat is de volgende stap?" autofocus @blur="blokOpslaan">
          </span>
          <button type="submit" class="sh-cta__pijl" aria-label="Opslaan"><UIcon name="i-lucide-check" class="size-5" /></button>
        </form>
        <button v-else type="button" class="sh-cta" @click="startBewerken('stap')">
          <span class="flex-1 min-w-0 text-left">
            <span class="sh-kicker !text-stuurhut-ink/60 block">Volgende stap</span>
            <span class="font-semibold">{{ traject.eerstvolgendeActie || 'Bepaal de volgende stap' }}</span>
          </span>
          <span class="sh-cta__pijl"><UIcon name="i-lucide-pencil" class="size-5" /></span>
        </button>
      </aside>

      <!-- Smal: de route als lijst -->
      <section v-if="reis.length" class="sh-kaart dossier__routelijst">
        <h2 class="sh-kop mb-1"><UIcon name="i-lucide-route" class="size-5" /> De route</h2>
        <ReisRoute :haltes="reis" :geselecteerd-id="gekozen?.id ?? null" :open-taken="openPerHalte" @kies="gekozenId = $event" />
      </section>

      <!-- Rechts: de halte en het logboek -->
      <aside class="dossier__rechts">
        <ReisHalteKaart
          v-if="gekozen"
          :key="gekozen.id"
          :halte="gekozen"
          :index="gekozenIndex"
          :totaal="reis.length"
          :is-huidig="gekozen.id === huidig?.id"
          :taken="takenVanTraject.filter(t => t.halteId === gekozen!.id)"
          :traject-id="traject.id"
          @terug-naar-nu="gekozenId = null"
          @gewijzigd="halteGewijzigd"
        />
        <section v-else-if="!reis.length" class="sh-kaart">
          <p class="sh-kicker">Nog geen route</p>
          <h2 class="sh-titel text-[1.75rem] mt-2">Stippel de reis uit</h2>
          <p class="text-sm text-stuurhut-muted mt-1.5">
            Wat neemt {{ traject.naam }} af? De route volgt uit de diensten, en is daarna per halte aan te passen.
          </p>
          <div class="flex flex-wrap gap-2 mt-3">
            <button
              v-for="d in DIENSTEN"
              :key="d"
              type="button"
              class="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm transition"
              :class="startDiensten.includes(d) ? 'bg-stuurhut-ink text-white' : 'bg-stuurhut-subtle text-stuurhut-muted'"
              :aria-pressed="startDiensten.includes(d)"
              @click="wisselStartDienst(d)"
            >
              <UIcon :name="DIENST_INFO[d].icoon" class="size-4" /> {{ DIENST_INFO[d].label }}
            </button>
          </div>
          <button type="button" class="sh-cta w-full mt-4" :disabled="!startDiensten.length" :class="{ 'opacity-50': !startDiensten.length }" @click="stippelUit">
            <span class="flex-1 font-semibold">Route uitstippelen</span>
            <span class="sh-cta__pijl"><UIcon name="i-lucide-route" class="size-5" /></span>
          </button>
          <form class="flex items-center gap-2 mt-4 text-sm" @submit.prevent="voegEigenHalteToe">
            <UInput v-model="eigenHalte" placeholder="Of begin met een eigen halte…" class="flex-1" size="sm" />
            <UButton type="submit" icon="i-lucide-plus" size="sm" color="neutral" variant="soft" aria-label="Halte toevoegen" />
          </form>
        </section>

        <ReisLogboek :traject-id="traject.id" :haltes="reis" :taken="takenVanTraject" />
      </aside>
    </section>

    <!-- Werkplaats -->
    <section id="werkplaats" class="stuurhut-kolom dossier__werkplaats">
      <div class="flex items-end justify-between gap-4 flex-wrap mb-5">
        <div>
          <p class="sh-kicker">Werkplaats</p>
          <h2 class="sh-titel text-[clamp(1.75rem,3vw,2.5rem)] mt-1">Alle taken</h2>
        </div>
      </div>
      <TakenBord :traject-id="traject.id" :haltes="reis" />

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-8">
        <section class="sh-kaart">
          <h2 class="sh-kop"><UIcon name="i-lucide-paperclip" class="size-5" /> Bagage</h2>
          <p class="text-xs text-stuurhut-muted mt-1">Links en documenten die bij deze reis horen.</p>
          <ul class="mt-3 flex flex-col">
            <li v-for="bestand in bestanden" :key="bestand.id" class="sh-rij items-center group">
              <span class="flex items-center gap-2.5 min-w-0">
                <UIcon :name="bestand.url ? 'i-lucide-link' : 'i-lucide-file-text'" class="size-4 shrink-0 text-stuurhut-muted" />
                <a v-if="bestand.url" :href="bestand.url" target="_blank" rel="noopener" class="truncate text-sm hover:underline">{{ bestand.naam }}</a>
                <span v-else class="truncate text-sm">{{ bestand.naam }}</span>
              </span>
              <UButton icon="i-lucide-x" size="xs" color="neutral" variant="ghost" class="opacity-0 group-hover:opacity-100 focus:opacity-100" aria-label="Verwijderen" @click="bestandVerwijderen(bestand.id)" />
            </li>
          </ul>
          <form class="flex flex-wrap gap-2 mt-3" @submit.prevent="bestandToevoegen">
            <UInput v-model="nieuwBestandNaam" placeholder="Naam" class="flex-1 min-w-36" />
            <UInput v-model="nieuwBestandUrl" placeholder="Link (optioneel)" class="flex-1 min-w-36" />
            <UButton type="submit" icon="i-lucide-plus" aria-label="Toevoegen" />
          </form>
        </section>

        <section class="sh-kaart">
          <h2 class="sh-kop"><UIcon name="i-lucide-map" class="size-5" /> De route in het kort</h2>
          <p v-if="!reis.length" class="text-sm text-stuurhut-muted mt-2">Nog geen route uitgestippeld.</p>
          <ol v-else class="mt-3 flex flex-wrap gap-1.5">
            <li
              v-for="h in reis"
              :key="h.id"
              class="dossier__stap"
              :class="{ 'dossier__stap--klaar': h.afgerondOp, 'dossier__stap--nu': h.id === huidig?.id }"
            >
              {{ h.titel }}
            </li>
          </ol>
          <UButton class="mt-4" icon="i-lucide-pencil" color="neutral" variant="soft" @click="routeOpen = true">Route aanpassen</UButton>
        </section>
      </div>
    </section>

    <USlideover v-model:open="bewerkenOpen" title="Traject bewerken" side="right">
      <template #body>
        <TrajectForm v-bind="formProps(traject)" submit-label="Opslaan" @submit="opslaan" @cancel="bewerkenOpen = false" />
      </template>
    </USlideover>

    <USlideover v-model:open="routeOpen" title="Route aanpassen" side="right" :ui="{ content: 'max-w-3xl' }">
      <template #body>
        <ReisRouteBewerken :traject="traject" :haltes="reis" @gewijzigd="routeGewijzigd" />
      </template>
    </USlideover>
  </div>

  <div v-else class="stuurhut-kolom pt-28">
    <div class="sh-kaart max-w-md">
      <p class="text-sm">Dit traject bestaat niet (meer).</p>
      <NuxtLink to="/trajecten" class="text-sm font-semibold mt-2 inline-block">Terug naar Trajecten →</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.dossier__scene {
  position: relative;
  height: 100vh;
  min-height: 46rem;
}

.dossier__balk {
  position: absolute;
  inset: 1.25rem 1.25rem auto 1.25rem;
  z-index: 20;
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}

.dossier__links,
.dossier__rechts {
  position: absolute;
  top: 6rem;
  bottom: 1.25rem;
  z-index: 10;
  width: min(20rem, calc(100vw - 2.5rem));
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
  scrollbar-width: none;
  padding: 0.25rem;
  margin: -0.25rem;
}

.dossier__links {
  left: 1.25rem;
}

.dossier__rechts {
  right: 1.25rem;
  /* Ruimte voor de focus-pil rechtsonder. */
  bottom: 5.5rem;
}

.dossier__klant {
  padding: 0.25rem 0.5rem 0.5rem;
  text-shadow: 0 1px 12px rgb(255 255 255 / 0.8);
}

.dossier__naam {
  font-size: clamp(2rem, 3vw, 2.75rem);
}

.dossier__meta {
  margin-top: 0.45rem;
  font-size: 0.88rem;
  color: var(--color-stuurhut-muted);
}

.dossier__hartslag {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.7rem 0.3rem 0.55rem;
  border-radius: 9999px;
  background: rgb(253 250 244 / 0.9);
  font-size: 0.75rem;
  box-shadow: 0 4px 12px rgb(30 40 50 / 0.08);
  text-shadow: none;
}

.dossier__hartslag--vers { color: #35722f; }
.dossier__hartslag--traag { color: #a3791a; }
.dossier__hartslag--stil { color: #b3402f; }

.dossier__avatar {
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  flex-shrink: 0;
  border-radius: 9999px;
  color: #fff;
  font-weight: 600;
  box-shadow: inset 0 0 0 2px rgb(255 255 255 / 0.25);
}

.dossier__actie {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.55rem;
  border-radius: 0.7rem;
  background: var(--color-stuurhut-subtle);
  font-size: 0.82rem;
}

.dossier__actie--voorkeur {
  background: var(--color-stuurhut-ink);
  color: #fff;
}

.dossier__kas {
  height: 0.55rem;
  margin-top: 0.6rem;
  border-radius: 9999px;
  background: var(--color-stuurhut-subtle);
  overflow: hidden;
}

.dossier__kas span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(to right, #7d93ff, #2544d8);
}

.dossier__wacht {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  flex-shrink: 0;
  border-radius: 0.75rem;
  background: #fdecc8;
  color: #b5651d;
}

.dossier__aanvullen {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.8rem;
  border-radius: 9999px;
  border: 1.5px dashed rgb(28 28 28 / 0.25);
  background: rgb(253 250 244 / 0.7);
  font-size: 0.8rem;
  color: var(--color-stuurhut-muted);
  transition: background 0.15s, color 0.15s;
}

.dossier__aanvullen:hover {
  background: rgb(253 250 244 / 0.95);
  color: var(--color-stuurhut-ink);
}

.dossier__stapinput {
  width: 100%;
  background: transparent;
  font-weight: 600;
  outline: none;
}

.dossier__stapinput::placeholder {
  color: rgb(28 28 28 / 0.45);
}

.dossier__routelijst {
  display: none;
}

.dossier__werkplaats {
  padding-top: clamp(3rem, 6vw, 5rem);
}

.dossier__stap {
  padding: 0.3rem 0.7rem;
  border-radius: 9999px;
  background: var(--color-stuurhut-subtle);
  font-size: 0.8rem;
  color: var(--color-stuurhut-muted);
}

.dossier__stap--klaar {
  background: rgb(37 68 216 / 0.12);
  color: #2544d8;
}

.dossier__stap--nu {
  background: var(--color-stuurhut-limoen);
  color: var(--color-stuurhut-ink);
  font-weight: 600;
}

/* Smal: alles onder elkaar, de route als lijst in een kaart. */
@media (max-width: 1023px) {
  .dossier__scene {
    height: auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1.25rem;
  }

  .dossier__landschap {
    display: none;
  }

  .dossier__balk,
  .dossier__links,
  .dossier__rechts {
    position: static;
    width: auto;
    overflow: visible;
    margin: 0;
    padding: 0;
  }

  .dossier__balk {
    margin-bottom: 1rem;
  }

  .dossier__routelijst {
    display: block;
  }
}
</style>
