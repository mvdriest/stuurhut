<script setup lang="ts">
import type { Contact } from '~/composables/useKlanten'

// Eén klant: gegevens, alle contactpersonen en alle reizen die je met ze maakt.
// De domeinen zijn er voor de mailkoppeling: mail van @klant.nl hoort hier.
definePageMeta({
  pageTransition: { name: 'stuurhut-nav', mode: 'out-in' }
})

const route = useRoute()
const klantId = computed(() => String(route.params.id))

const { klantVan, refresh } = useKlanten()
const { trajecten, refresh: refreshTrajecten } = useTrajecten()
const { taken, refresh: refreshTaken } = useTaken()
const { refresh: refreshHaltes, routeVan } = useHaltes()

await useAsyncData(`klant-${klantId.value}`, () => Promise.all([refresh(), refreshTrajecten(), refreshTaken(), refreshHaltes()]))

const klant = computed(() => klantVan(klantId.value))
const reizen = computed(() => trajecten.value.filter(t => t.klantId === klantId.value))
const openTaken = (id: string) => taken.value.filter(t => t.trajectId === id && t.status !== 'klaar').length

const eur = (n: number) => `€ ${n.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`
const afgesproken = computed(() => reizen.value.reduce((s, t) => s + (t.bedragAfgesproken ?? 0), 0))
const gefactureerd = computed(() => reizen.value.reduce((s, t) => s + (t.bedragGefactureerd ?? 0), 0))

// Welke trajecten hebben dit contact als reisgenoot?
const reisgenootVan = (c: Contact) => reizen.value.filter(t => t.contactId === c.id).map(t => t.naam)

// --- Gegevens ---------------------------------------------------------------------------

const gegevensOpen = ref(false)
const gegevens = reactive({ naam: '', website: '', adres: '', kvk: '', btw: '', notities: '', domeinen: '' })

function bewerkGegevens() {
  const k = klant.value
  if (!k) return
  Object.assign(gegevens, {
    naam: k.naam,
    website: k.website ?? '',
    adres: k.adres ?? '',
    kvk: k.kvk ?? '',
    btw: k.btw ?? '',
    notities: k.notities ?? '',
    domeinen: k.domeinen.join(', ')
  })
  gegevensOpen.value = true
}

async function gegevensOpslaan() {
  if (!gegevens.naam.trim()) return
  await $fetch(`/api/klanten/${klantId.value}`, {
    method: 'PATCH',
    body: {
      ...gegevens,
      // "klant.nl, www.klant.nl, @klant.nl" → ['klant.nl'] ; alleen het domein telt.
      domeinen: [...new Set(gegevens.domeinen.split(/[\s,;]+/)
        .map(d => d.trim().toLowerCase().replace(/^@/, '').replace(/^www\./, ''))
        .filter(d => d.includes('.')))]
    }
  })
  gegevensOpen.value = false
  await refresh()
}

const websiteHref = computed(() => {
  const w = klant.value?.website
  return w ? (/^https?:\/\//.test(w) ? w : `https://${w}`) : null
})

// --- Contacten ---------------------------------------------------------------------------

const contactBewerkId = ref<string | null>(null) // 'nieuw' voor een nieuw contact
const contactConcept = reactive({ naam: '', rol: '', email: '', telefoon: '', voorkeur: '' })

function bewerkContact(c: Contact | null) {
  Object.assign(contactConcept, {
    naam: c?.naam ?? '',
    rol: c?.rol ?? '',
    email: c?.email ?? '',
    telefoon: c?.telefoon ?? '',
    voorkeur: c?.voorkeur ?? ''
  })
  contactBewerkId.value = c?.id ?? 'nieuw'
}

async function contactOpslaan() {
  if (!contactConcept.naam.trim()) return
  const body = Object.fromEntries(Object.entries(contactConcept).map(([k, v]) => [k, v.trim()]))
  if (contactBewerkId.value === 'nieuw') {
    await $fetch('/api/contacten', { method: 'POST', body: { ...body, klantId: klantId.value } })
  } else {
    await $fetch(`/api/contacten/${contactBewerkId.value}`, { method: 'PATCH', body })
  }
  contactBewerkId.value = null
  await refresh()
}

async function contactVerwijderen(c: Contact) {
  if (!confirm(`${c.naam} verwijderen?`)) return
  await $fetch(`/api/contacten/${c.id}`, { method: 'DELETE' })
  await Promise.all([refresh(), refreshTrajecten()])
}

// --- Klant verwijderen / nieuw traject ----------------------------------------------------

const toast = useToast()
const verwijderOpen = ref(false)

async function verwijderKlant() {
  await $fetch(`/api/klanten/${klantId.value}`, { method: 'DELETE' })
  verwijderOpen.value = false
  await navigateTo('/klanten')
  await Promise.all([refresh(), refreshTrajecten()])
  toast.add({ title: 'Klant verwijderd', icon: 'i-lucide-trash-2' })
}

const { openNieuwTraject } = useSnelMenu()

const meerOpties = computed(() => [[
  { label: 'Gegevens bewerken', icon: 'i-lucide-pencil', onSelect: bewerkGegevens }
], [
  { label: 'Klant verwijderen', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => { verwijderOpen.value = true } }
]])
</script>

<template>
  <div v-if="klant">
    <PaginaKop :titel="klant.naam" kicker="Klant">
      <template #balk-links>
        <NuxtLink to="/klanten" class="sh-chip text-sm">
          <UIcon name="i-lucide-building-2" class="size-4" /> Klanten
        </NuxtLink>
      </template>
      <template #balk-rechts>
        <UDropdownMenu :items="meerOpties" :content="{ align: 'end' }">
          <button type="button" class="sh-chip text-sm" aria-label="Meer opties">
            <UIcon name="i-lucide-ellipsis" class="size-4" />
          </button>
        </UDropdownMenu>
      </template>

      <!-- De naam vult de klant voor een nieuw traject alvast in. -->
      <button type="button" class="sh-cta !py-2 !pl-4 !pr-2" @click="openNieuwTraject(klant.naam)">
        <span class="font-semibold text-sm">Nieuw traject</span>
        <span class="sh-cta__pijl !size-9"><UIcon name="i-lucide-plus" class="size-4" /></span>
      </button>
    </PaginaKop>

    <div class="stuurhut-kolom mt-8 grid grid-cols-1 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] gap-6 items-start">
      <div class="flex flex-col gap-4">
        <!-- Gegevens -->
        <form v-if="gegevensOpen" class="sh-kaart flex flex-col gap-2" @submit.prevent="gegevensOpslaan" @keydown.esc="gegevensOpen = false">
          <h2 class="sh-kop mb-1"><UIcon name="i-lucide-building-2" class="size-5" /> Gegevens</h2>
          <UInput v-model="gegevens.naam" placeholder="Naam" required autofocus />
          <UInput v-model="gegevens.website" placeholder="Website" icon="i-lucide-globe" />
          <UFormField label="Maildomeinen" help="Mail van deze domeinen hoort bij deze klant. Komt er vanzelf bij als je een contact met een zakelijk adres toevoegt." size="sm">
            <UInput v-model="gegevens.domeinen" placeholder="klant.nl" icon="i-lucide-at-sign" class="w-full" />
          </UFormField>
          <UTextarea v-model="gegevens.adres" placeholder="Adres" :rows="2" />
          <div class="grid grid-cols-2 gap-2">
            <UInput v-model="gegevens.kvk" placeholder="KvK" />
            <UInput v-model="gegevens.btw" placeholder="Btw-nummer" />
          </div>
          <UTextarea v-model="gegevens.notities" placeholder="Notities" :rows="3" />
          <div class="flex justify-end gap-2 mt-1">
            <UButton color="neutral" variant="ghost" size="sm" @click="gegevensOpen = false">Annuleren</UButton>
            <UButton type="submit" size="sm">Opslaan</UButton>
          </div>
        </form>
        <section v-else class="sh-kaart">
          <div class="flex items-center justify-between">
            <h2 class="sh-kop"><UIcon name="i-lucide-building-2" class="size-5" /> Gegevens</h2>
            <UButton icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost" aria-label="Gegevens bewerken" @click="bewerkGegevens" />
          </div>
          <ul class="flex flex-col gap-1.5 mt-3 text-sm">
            <li v-if="websiteHref" class="flex items-center gap-2">
              <UIcon name="i-lucide-globe" class="size-4 shrink-0 text-stuurhut-muted" />
              <a :href="websiteHref" target="_blank" rel="noopener" class="truncate hover:underline">{{ klant.website }}</a>
            </li>
            <li v-for="d in klant.domeinen" :key="d" class="flex items-center gap-2">
              <UIcon name="i-lucide-at-sign" class="size-4 shrink-0 text-stuurhut-muted" /> {{ d }}
            </li>
            <li v-if="klant.adres" class="flex items-start gap-2 whitespace-pre-line">
              <UIcon name="i-lucide-map-pin" class="size-4 shrink-0 mt-0.5 text-stuurhut-muted" /> {{ klant.adres }}
            </li>
            <li v-if="klant.kvk || klant.btw" class="flex items-center gap-2 text-stuurhut-muted">
              <UIcon name="i-lucide-file-badge" class="size-4 shrink-0" />
              {{ [klant.kvk && `KvK ${klant.kvk}`, klant.btw && `btw ${klant.btw}`].filter(Boolean).join(' · ') }}
            </li>
          </ul>
          <p v-if="klant.notities" class="text-sm text-stuurhut-muted mt-3 whitespace-pre-line">{{ klant.notities }}</p>
          <button
            v-if="!klant.website && !klant.domeinen.length && !klant.adres && !klant.kvk && !klant.notities"
            type="button"
            class="text-sm text-stuurhut-muted hover:underline mt-2"
            @click="bewerkGegevens"
          >
            Website, domein, adres of KvK aanvullen
          </button>
        </section>

        <!-- Omzet -->
        <section v-if="afgesproken" class="sh-kaart">
          <h2 class="sh-kop"><UIcon name="i-lucide-wallet" class="size-5" /> Over alle reizen</h2>
          <div class="flex items-baseline justify-between gap-2 mt-3">
            <strong class="sh-titel text-[1.75rem]">{{ eur(gefactureerd) }}</strong>
            <span class="text-xs text-stuurhut-muted text-right">van {{ eur(afgesproken) }} gefactureerd</span>
          </div>
        </section>
      </div>

      <div class="flex flex-col gap-6">
        <!-- Contacten -->
        <section class="sh-kaart">
          <div class="flex items-center justify-between">
            <h2 class="sh-kop"><UIcon name="i-lucide-users-round" class="size-5" /> Contactpersonen</h2>
            <UButton v-if="contactBewerkId !== 'nieuw'" icon="i-lucide-plus" size="xs" color="neutral" variant="soft" @click="bewerkContact(null)">Contact</UButton>
          </div>

          <ul class="mt-3 flex flex-col">
            <template v-for="c in klant.contacten" :key="c.id">
              <li v-if="contactBewerkId === c.id" class="py-2">
                <form class="contactform" @submit.prevent="contactOpslaan" @keydown.esc="contactBewerkId = null">
                  <UInput v-model="contactConcept.naam" placeholder="Naam" required autofocus />
                  <UInput v-model="contactConcept.rol" placeholder="Rol, bijv. eigenaar" />
                  <UInput v-model="contactConcept.email" type="email" placeholder="E-mail" />
                  <UInput v-model="contactConcept.telefoon" type="tel" placeholder="Telefoon" />
                  <UInput v-model="contactConcept.voorkeur" placeholder="Voorkeur, bijv. belt liefst" class="sm:col-span-2" />
                  <div class="flex justify-end gap-2 sm:col-span-2">
                    <UButton color="neutral" variant="ghost" size="sm" @click="contactBewerkId = null">Annuleren</UButton>
                    <UButton type="submit" size="sm">Opslaan</UButton>
                  </div>
                </form>
              </li>
              <li v-else class="contact group">
                <div class="min-w-0 flex-1">
                  <p class="font-semibold text-sm">
                    {{ c.naam }}
                    <span v-if="c.rol" class="font-normal text-stuurhut-muted">· {{ c.rol }}</span>
                  </p>
                  <p class="text-xs text-stuurhut-muted flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    <a v-if="c.email" :href="`mailto:${c.email}`" class="hover:underline">{{ c.email }}</a>
                    <a v-if="c.telefoon" :href="`tel:${c.telefoon}`" class="hover:underline">{{ c.telefoon }}</a>
                    <span v-if="c.voorkeur">{{ c.voorkeur }}</span>
                  </p>
                  <p v-if="reisgenootVan(c).length" class="text-xs mt-1">
                    <UIcon name="i-lucide-route" class="size-3 align-[-1px]" /> Reisgenoot bij {{ reisgenootVan(c).join(', ') }}
                  </p>
                </div>
                <div class="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                  <UButton icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost" :aria-label="`${c.naam} bewerken`" @click="bewerkContact(c)" />
                  <UButton icon="i-lucide-trash-2" size="xs" color="error" variant="ghost" :aria-label="`${c.naam} verwijderen`" @click="contactVerwijderen(c)" />
                </div>
              </li>
            </template>
            <li v-if="contactBewerkId === 'nieuw'" class="py-2">
              <form class="contactform" @submit.prevent="contactOpslaan" @keydown.esc="contactBewerkId = null">
                <UInput v-model="contactConcept.naam" placeholder="Naam" required autofocus />
                <UInput v-model="contactConcept.rol" placeholder="Rol, bijv. eigenaar" />
                <UInput v-model="contactConcept.email" type="email" placeholder="E-mail" />
                <UInput v-model="contactConcept.telefoon" type="tel" placeholder="Telefoon" />
                <UInput v-model="contactConcept.voorkeur" placeholder="Voorkeur, bijv. belt liefst" class="sm:col-span-2" />
                <div class="flex justify-end gap-2 sm:col-span-2">
                  <UButton color="neutral" variant="ghost" size="sm" @click="contactBewerkId = null">Annuleren</UButton>
                  <UButton type="submit" size="sm">Toevoegen</UButton>
                </div>
              </form>
            </li>
            <li v-if="!klant.contacten.length && contactBewerkId !== 'nieuw'" class="text-sm text-stuurhut-muted">
              Nog niemand. Voeg je contactpersoon toe, dan herkent Stuurhut later ook hun mail en afspraken.
            </li>
          </ul>
        </section>

        <!-- Reizen -->
        <section>
          <h2 class="sh-kop mb-3 ml-1"><UIcon name="i-lucide-route" class="size-5" /> Reizen</h2>
          <div v-if="reizen.length" class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ReisKaart v-for="t in reizen" :key="t.id" :traject="t" :haltes="routeVan(t.id)" :open-taken="openTaken(t.id)" />
          </div>
          <p v-else class="sh-kaart text-sm">Nog geen traject met {{ klant.naam }}.</p>
        </section>
      </div>
    </div>

    <UModal v-model:open="verwijderOpen" :title="`${klant.naam} verwijderen?`" description="De contactpersonen gaan mee. Trajecten blijven bestaan, alleen zonder klant.">
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" @click="verwijderOpen = false">Annuleren</UButton>
          <UButton color="error" icon="i-lucide-trash-2" @click="verwijderKlant">Verwijderen</UButton>
        </div>
      </template>
    </UModal>
  </div>
  <div v-else class="stuurhut-kolom pt-24">
    <p class="sh-kaart text-sm max-w-md">Deze klant bestaat niet (meer). <NuxtLink to="/klanten" class="underline">Naar alle klanten</NuxtLink></p>
  </div>
</template>

<style scoped>
.contact {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.65rem 0;
  border-top: 1px solid rgb(28 28 28 / 0.08);
}

.contact:first-child {
  border-top: 0;
}

.contactform {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
}

@media (min-width: 640px) {
  .contactform {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
