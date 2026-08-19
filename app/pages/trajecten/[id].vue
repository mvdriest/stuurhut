<script setup lang="ts">
import { TRAJECT_STATUS_STYLES } from '~/utils/trajectStatus'

definePageMeta({
  pageTransition: { name: 'stuurhut-nav', mode: 'out-in' }
})

const route = useRoute()
const trajectId = computed(() => String(route.params.id))

const { trajecten, refresh: refreshTrajecten } = useTrajecten()
const { taken, refresh: refreshTaken } = useTaken()
const { entries: journalEntries, refresh: refreshJournal } = useJournal()
const { bestanden, refresh: refreshBestanden } = useTrajectBestanden(trajectId.value)

await useAsyncData('traject-detail-init', () => Promise.all([
  refreshTrajecten(), refreshTaken(), refreshJournal(), refreshBestanden()
]))

const traject = computed(() => trajecten.value.find(t => t.id === trajectId.value))

const eur = (n: number) => `€ ${n.toLocaleString('nl-NL')}`

const financePct = computed(() => {
  const t = traject.value
  if (!t?.bedragAfgesproken) return 0
  return Math.min(100, Math.round(((t.bedragGefactureerd ?? 0) / t.bedragAfgesproken) * 100))
})

const takenVoorTraject = computed(() => taken.value.filter(t => t.trajectId === trajectId.value))

async function taakToggle(taakId: string, huidigeStatus: string) {
  await $fetch(`/api/taken/${taakId}`, { method: 'PATCH', body: { status: huidigeStatus === 'klaar' ? 'to_do' : 'klaar' } })
  await refreshTaken()
}

const journalVoorTraject = computed(() =>
  journalEntries.value
    .filter(e => e.trajectId === trajectId.value)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
)

function datumLabel(iso: string) {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })
}

const nieuwBestandKind = ref('')
const nieuwBestandNaam = ref('')
const nieuwBestandUrl = ref('')

async function bestandToevoegen() {
  if (!nieuwBestandNaam.value.trim()) return
  await $fetch(`/api/trajecten/${trajectId.value}/bestanden`, {
    method: 'POST',
    body: {
      kind: nieuwBestandKind.value.trim() || 'Link',
      naam: nieuwBestandNaam.value.trim(),
      url: nieuwBestandUrl.value.trim() || undefined
    }
  })
  nieuwBestandKind.value = ''
  nieuwBestandNaam.value = ''
  nieuwBestandUrl.value = ''
  await refreshBestanden()
}

async function bestandVerwijderen(id: string) {
  await $fetch(`/api/bestanden/${id}`, { method: 'DELETE' })
  await refreshBestanden()
}

const activeSection = ref('taken')

const secties = [
  { key: 'taken', label: 'Taken' },
  { key: 'meetings', label: 'Meetings' },
  { key: 'offertes', label: 'Offertes' },
  { key: 'overig', label: 'Overig' }
]
</script>

<template>
  <div class="bg-stuurhut-mist min-h-screen">
    <AppHeaderFoto
      compact
      :titel="traject?.naam ?? 'Traject'"
      :subtitel="traject ? TRAJECT_STATUS_STYLES[traject.status].label : undefined"
    />
    <div v-if="traject" class="h-2" :style="{ backgroundColor: trajectKleurHex[traject.kleur] }" />

    <div v-if="traject" class="stuurhut-kolom flex flex-col gap-8 py-[clamp(2rem,5vw,4rem)]">
      <div class="dossier-stap">
        <p class="dossier-stap__label">Volgende stap</p>
        <p class="dossier-stap__tekst">{{ traject.eerstvolgendeActie || 'Geen eerstvolgende actie ingesteld.' }}</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="feitkaart">
          <span class="feitkaart__label">Streefdatum</span>
          <span class="feitkaart__waarde">{{ traject.streefdatum || 'Geen streefdatum' }}</span>
        </div>
        <div class="feitkaart">
          <span class="feitkaart__label">Afgesproken</span>
          <span class="feitkaart__waarde">{{ traject.bedragAfgesproken ? eur(traject.bedragAfgesproken) : '—' }}</span>
        </div>
        <div class="feitkaart">
          <span class="feitkaart__label">Gefactureerd</span>
          <span class="feitkaart__waarde">{{ traject.bedragGefactureerd ? eur(traject.bedragGefactureerd) : '—' }}</span>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="dossierkaart">
          <h3 class="dossierkaart__titel">Contact</h3>
          <dl class="flex flex-col gap-2.5">
            <div><dt class="dossierkaart__dt">Naam</dt><dd class="dossierkaart__dd">{{ traject.contactpersoon || '—' }}</dd></div>
            <div><dt class="dossierkaart__dt">Telefoon</dt><dd class="dossierkaart__dd">{{ traject.contactTelefoon || '—' }}</dd></div>
            <div><dt class="dossierkaart__dt">E-mail</dt><dd class="dossierkaart__dd">{{ traject.contactEmail || '—' }}</dd></div>
            <div><dt class="dossierkaart__dt">Voorkeur</dt><dd class="dossierkaart__dd text-sm text-stuurhut-muted">{{ traject.contactVoorkeur || '—' }}</dd></div>
          </dl>
        </div>

        <div class="dossierkaart">
          <h3 class="dossierkaart__titel">Financiën</h3>
          <template v-if="traject.bedragAfgesproken">
            <div class="flex flex-col gap-2">
              <div class="flex justify-between text-sm"><span>Afgesproken</span><span class="font-bold">{{ eur(traject.bedragAfgesproken) }}</span></div>
              <div class="flex justify-between text-sm"><span>Gefactureerd</span><span class="font-bold">{{ eur(traject.bedragGefactureerd ?? 0) }}</span></div>
              <div class="h-1.5 rounded-full bg-black/10 overflow-hidden my-1">
                <div class="h-full rounded-full stuurhut-voortgang" :style="{ width: `${financePct}%` }" />
              </div>
              <p v-if="traject.financieelNotitie" class="text-xs text-stuurhut-muted">{{ traject.financieelNotitie }}</p>
            </div>
          </template>
          <p v-else class="text-sm text-stuurhut-muted">Geen facturatie — dit is een privéproject.</p>
        </div>
      </div>

      <div>
        <h3 class="dossier-koptitel">Volledige takenlijst</h3>
        <div class="dossierkaart !py-1.5">
          <div
            v-for="(taak, i) in takenVoorTraject"
            :key="taak.id"
            class="flex items-start gap-2.5 py-2.5"
            :class="{ 'border-b border-black/8': i < takenVoorTraject.length - 1 }"
          >
            <button type="button" class="dossier-check" :class="{ 'dossier-check--klaar': taak.status === 'klaar' }" @click="taakToggle(taak.id, taak.status)">
              <UIcon v-if="taak.status === 'klaar'" name="i-lucide-check" class="size-3" />
            </button>
            <span class="text-sm" :class="taak.status === 'klaar' ? 'line-through text-stuurhut-muted' : 'text-stuurhut-ink'">{{ taak.tekst }}</span>
          </div>
          <p v-if="takenVoorTraject.length === 0" class="py-3 text-sm text-stuurhut-muted">Nog geen taken bij dit traject.</p>
        </div>
      </div>

      <div>
        <h3 class="dossier-koptitel">Hoe het gelopen is</h3>
        <div v-if="journalVoorTraject.length" class="flex flex-col">
          <div v-for="entry in journalVoorTraject" :key="entry.id" class="flex gap-3 items-start pb-4">
            <div class="flex flex-col items-center self-stretch shrink-0 pt-1">
              <span class="size-2 rounded-full bg-stuurhut-ink" />
              <span class="flex-1 w-px bg-black/15 mt-1" />
            </div>
            <div class="min-w-0">
              <p class="text-xs font-bold uppercase tracking-wider text-stuurhut-muted">{{ datumLabel(entry.createdAt) }}</p>
              <p class="text-sm leading-relaxed">{{ entry.inhoud }}</p>
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-stuurhut-muted">Nog niets vastgelegd voor dit traject.</p>
      </div>

      <div>
        <h3 class="dossier-koptitel">Spullen erbij</h3>
        <div class="flex flex-col gap-2 mb-3">
          <div v-for="bestand in bestanden" :key="bestand.id" class="flex items-center gap-2.5 bg-white border border-black/8 rounded-xl px-3 py-2.5 group">
            <span class="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/8 text-stuurhut-muted">{{ bestand.kind }}</span>
            <a v-if="bestand.url" :href="bestand.url" target="_blank" class="text-sm flex-1 truncate">{{ bestand.naam }}</a>
            <span v-else class="text-sm flex-1 truncate">{{ bestand.naam }}</span>
            <UButton icon="i-lucide-x" size="xs" color="neutral" variant="ghost" class="opacity-0 group-hover:opacity-100" @click="bestandVerwijderen(bestand.id)" />
          </div>
        </div>
        <form class="flex flex-wrap gap-2" @submit.prevent="bestandToevoegen">
          <UInput v-model="nieuwBestandKind" placeholder="Soort (bijv. PDF)" class="w-32" />
          <UInput v-model="nieuwBestandNaam" placeholder="Naam" class="flex-1 min-w-40" />
          <UInput v-model="nieuwBestandUrl" placeholder="Link (optioneel)" class="flex-1 min-w-40" />
          <UButton type="submit" icon="i-lucide-plus" />
        </form>
      </div>

      <div>
        <div class="flex items-baseline gap-3 mb-3">
          <h3 class="dossier-koptitel !mb-0">Losse gedachten</h3>
          <NuxtLink :to="`/journal?traject=${trajectId}`" class="text-xs font-semibold">Bekijk in Journal →</NuxtLink>
        </div>
        <div v-if="journalVoorTraject.length" class="flex flex-wrap gap-3">
          <div v-for="entry in journalVoorTraject" :key="entry.id" class="notitiekaart">
            <span class="text-sm leading-relaxed">{{ entry.inhoud }}</span>
            <span v-if="entry.resultaatLabel" class="text-[11px] text-stuurhut-muted">{{ entry.resultaatLabel }}</span>
          </div>
        </div>
        <p v-else class="text-sm text-stuurhut-muted">Nog geen losse gedachten bij dit traject.</p>
      </div>

      <SectieTabs
        v-model="activeSection"
        :secties="secties"
        :color="trajectKleurHex[traject.kleur]"
        :text-color="trajectTekstKleur(traject.kleur)"
      />

      <Transition name="panel-fade" mode="out-in">
        <TakenBord v-if="activeSection === 'taken'" key="taken" :traject-id="trajectId" />

        <div v-else-if="activeSection === 'meetings'" key="meetings" class="rounded-2xl border border-dashed border-black/20 p-10 text-center">
          <p class="text-sm text-stuurhut-muted">Meetings — nog niet gebouwd.</p>
        </div>

        <div v-else-if="activeSection === 'offertes'" key="offertes" class="rounded-2xl border border-dashed border-black/20 p-10 text-center">
          <p class="text-sm text-stuurhut-muted">Offertes — nog niet gebouwd.</p>
        </div>

        <div v-else key="overig" class="rounded-2xl bg-white p-6 flex flex-col gap-4 text-stuurhut-ink">
          <div>
            <p class="text-xs uppercase tracking-widest text-stuurhut-muted mb-1">Status</p>
            <UBadge :color="TRAJECT_STATUS_STYLES[traject.status].color" variant="subtle">
              {{ TRAJECT_STATUS_STYLES[traject.status].label }}
            </UBadge>
          </div>
          <div>
            <p class="text-xs uppercase tracking-widest text-stuurhut-muted mb-1">Eerstvolgende actie</p>
            <p class="text-sm">{{ traject.eerstvolgendeActie || 'Geen eerstvolgende actie ingesteld.' }}</p>
          </div>
        </div>
      </Transition>
    </div>

    <div v-else class="stuurhut-kolom py-16 text-sm text-stuurhut-muted">
      Traject niet gevonden. <NuxtLink to="/trajecten" class="font-semibold">Terug naar Trajecten</NuxtLink>.
    </div>
  </div>
</template>

<style scoped>
.panel-fade-enter-active,
.panel-fade-leave-active {
  transition: opacity 180ms ease;
}
.panel-fade-enter-from,
.panel-fade-leave-to {
  opacity: 0;
}

.dossier-stap {
  border-radius: 1rem;
  padding: 1.125rem 1.25rem;
  background: linear-gradient(150deg, #e8c78a 0%, #cf9a5a 100%);
}

.dossier-stap__label {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #5a3f1a;
  margin-bottom: 0.4rem;
}

.dossier-stap__tekst {
  font-family: var(--font-display);
  text-transform: uppercase;
  font-size: clamp(1.35rem, 2.4vw, 1.75rem);
  line-height: 1;
  color: #2a1c08;
}

.feitkaart {
  background-color: #fff;
  border-radius: 0.875rem;
  padding: 0.875rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  box-shadow: 0 6px 16px rgb(0 0 0 / 0.06);
}

.feitkaart__label {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-stuurhut-muted);
}

.feitkaart__waarde {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--color-stuurhut-ink);
}

.dossierkaart {
  background-color: #fff;
  color: var(--color-stuurhut-ink);
  border-radius: 1rem;
  padding: 1.125rem 1.25rem;
  box-shadow: 0 8px 22px rgb(0 0 0 / 0.07);
}

.dossierkaart__titel {
  font-family: var(--font-display);
  text-transform: uppercase;
  font-size: 1.25rem;
  margin-bottom: 0.75rem;
  color: var(--color-stuurhut-ink);
}

.dossierkaart__dt {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-stuurhut-muted);
}

.dossierkaart__dd {
  font-size: 0.9rem;
}

.dossier-koptitel {
  font-family: var(--font-display);
  text-transform: uppercase;
  font-size: 1.5rem;
  margin-bottom: 0.75rem;
  color: var(--color-stuurhut-ink);
}

.dossier-check {
  width: 1.125rem;
  height: 1.125rem;
  margin-top: 0.125rem;
  border-radius: 0.35rem;
  border: 1.5px solid rgb(0 0 0 / 0.25);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.dossier-check--klaar {
  background-color: var(--color-stuurhut-ink);
  border-color: var(--color-stuurhut-ink);
}

.notitiekaart {
  flex: 1 1 250px;
  background-color: #f4ead0;
  border: 1px solid #e7d5a6;
  border-radius: 0.875rem;
  padding: 0.875rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
</style>
