<script setup lang="ts">
import type { TrajectKleur } from '~/utils/kleuren'
import type { Dienst } from '~/utils/route'
import { DIENSTEN, DIENST_INFO } from '~/utils/route'

// Het korte "nieuw traject"-formulier: alleen wat nodig is om de reis te beginnen.
// Bovenin kun je het traject in één zin beschrijven; de AI vult dan de velden in
// (en wat het verder herkent, zoals contact of bedrag, als losse "extra's").
// De rest vul je daarna aan in het dossier. Een zakelijk traject komt bij de klant met
// dezelfde naam (de server zoekt die op of maakt hem aan); herkende contactgegevens
// worden het contact van die klant.

interface Extras {
  contactpersoon: string | null
  contactTelefoon: string | null
  contactEmail: string | null
  bedragAfgesproken: number | null
  eerstvolgendeActie: string | null
  streefdatum: string | null
}

type Concept = Extras & { naam: string | null, scope: 'zakelijk' | 'prive' | null, diensten: Dienst[] }

const props = defineProps<{ startZin?: string }>()

const emit = defineEmits<{
  submit: [payload: Partial<Omit<Extras, 'contactpersoon' | 'contactTelefoon' | 'contactEmail'>> & {
    naam: string
    scope: 'zakelijk' | 'prive'
    diensten: Dienst[]
    kleur: TrajectKleur
    contact?: { naam?: string, telefoon?: string, email?: string }
  }]
  cancel: []
}>()

const naam = ref('')
const scope = ref<'zakelijk' | 'prive'>('zakelijk')
const diensten = ref<Dienst[]>([])
const extras = ref<Partial<Extras>>({})

function wisselDienst(d: Dienst) {
  diensten.value = diensten.value.includes(d) ? diensten.value.filter(x => x !== d) : [...diensten.value, d]
}

// Kies automatisch de minst gebruikte kleur, zodat trajecten uit elkaar te houden blijven.
// Grijs alleen als laatste redmiddel; aan te passen via Bewerken.
const { trajecten } = useTrajecten()
const kleur = computed<TrajectKleur>(() => {
  const telling = new Map<TrajectKleur, number>(TRAJECT_KLEUREN.map(k => [k, 0]))
  for (const t of trajecten.value) telling.set(t.kleur, (telling.get(t.kleur) ?? 0) + 1)
  return TRAJECT_KLEUREN
    .filter(k => k !== 'grijs')
    .reduce((beste, k) => telling.get(k)! < telling.get(beste)! ? k : beste, 'groen' as TrajectKleur)
})

// --- Beschrijven in één zin -----------------------------------------------------------

const zin = ref(props.startZin ?? '')
const leest = ref(false)

async function vulIn() {
  if (zin.value.trim().length < 3 || leest.value) return
  leest.value = true
  try {
    const c = await $fetch<Concept>('/api/trajecten/uit-zin', { method: 'POST', body: { zin: zin.value } })
    if (c.naam) naam.value = c.naam
    if (c.scope) scope.value = c.scope
    if (c.diensten.length) diensten.value = c.diensten
    const { naam: _n, scope: _s, diensten: _d, ...rest } = c
    extras.value = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== null))
  } finally {
    leest.value = false
  }
}

// Vanuit het snelmenu met een getypte zin: meteen laten invullen. Eén woord of twee is
// waarschijnlijk gewoon de naam; dan is de AI niet nodig.
onMounted(() => {
  const z = props.startZin?.trim() ?? ''
  if (!z) return
  if (z.split(/\s+/).length <= 2) {
    naam.value = z
    zin.value = ''
  } else {
    vulIn()
  }
})

// Enter vult in, Shift+Enter is een nieuwe regel.
function zinToets(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    vulIn()
  }
}

const eur = (n: number) => `€ ${n.toLocaleString('nl-NL', { maximumFractionDigits: 2 })}`
const datum = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })

const extraChips = computed(() => {
  const e = extras.value
  return [
    e.contactpersoon && { key: 'contactpersoon', icoon: 'i-lucide-user-round', label: e.contactpersoon },
    e.contactTelefoon && { key: 'contactTelefoon', icoon: 'i-lucide-phone', label: e.contactTelefoon },
    e.contactEmail && { key: 'contactEmail', icoon: 'i-lucide-mail', label: e.contactEmail },
    e.bedragAfgesproken != null && { key: 'bedragAfgesproken', icoon: 'i-lucide-wallet', label: eur(e.bedragAfgesproken) },
    e.eerstvolgendeActie && { key: 'eerstvolgendeActie', icoon: 'i-lucide-arrow-right', label: e.eerstvolgendeActie },
    e.streefdatum && { key: 'streefdatum', icoon: 'i-lucide-flag', label: `vóór ${datum(e.streefdatum)}` }
  ].filter(Boolean) as { key: keyof Extras, icoon: string, label: string }[]
})

function verwijderExtra(key: keyof Extras) {
  const { [key]: _weg, ...rest } = extras.value
  extras.value = rest
}

function onSubmit() {
  if (!naam.value.trim()) return
  const { contactpersoon, contactTelefoon, contactEmail, ...rest } = extras.value
  const heeftContact = contactpersoon || contactTelefoon || contactEmail
  emit('submit', {
    ...rest,
    contact: heeftContact
      ? { naam: contactpersoon ?? undefined, telefoon: contactTelefoon ?? undefined, email: contactEmail ?? undefined }
      : undefined,
    naam: naam.value.trim(),
    scope: scope.value,
    diensten: scope.value === 'zakelijk' ? diensten.value : [],
    kleur: kleur.value
  })
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <form class="nieuw__zin" @submit.prevent="vulIn">
      <UTextarea
        v-model="zin"
        :rows="2"
        autoresize
        :maxrows="5"
        variant="none"
        placeholder="Beschrijf het in een zin, bijv. ‘Bakkerij Jansen wil een website en fotoshoot, contact Piet 06 12345678, € 3.000’"
        class="w-full"
        autofocus
        @keydown="zinToets"
      />
      <div class="flex justify-end">
        <UButton type="submit" size="sm" icon="i-lucide-sparkles" :loading="leest" :disabled="zin.trim().length < 3" color="neutral" variant="soft">
          Vul in
        </UButton>
      </div>
    </form>

    <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
      <UInput v-model="naam" placeholder="Naam van de klant of het traject" required size="xl" class="w-full" />

      <div class="sh-segment self-start" role="group" aria-label="Zakelijk of privé">
        <button type="button" :aria-pressed="scope === 'zakelijk'" @click="scope = 'zakelijk'">
          <UIcon name="i-lucide-briefcase" class="size-4" /> Zakelijk
        </button>
        <button type="button" :aria-pressed="scope === 'prive'" @click="scope = 'prive'">
          <UIcon name="i-lucide-house" class="size-4" /> Privé
        </button>
      </div>

      <div v-if="scope === 'zakelijk'">
        <p class="text-sm font-medium">Wat neemt de klant af?</p>
        <p class="text-xs text-stuurhut-muted mb-2">Bepaalt de route. Optioneel, en later aan te passen.</p>
        <div class="flex gap-2 flex-wrap">
          <button
            v-for="d in DIENSTEN"
            :key="d"
            type="button"
            class="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm transition"
            :class="diensten.includes(d) ? 'bg-stuurhut-ink text-white' : 'bg-stuurhut-subtle text-stuurhut-muted'"
            :aria-pressed="diensten.includes(d)"
            @click="wisselDienst(d)"
          >
            <UIcon :name="DIENST_INFO[d].icoon" class="size-4" /> {{ DIENST_INFO[d].label }}
          </button>
        </div>
      </div>

      <div v-if="extraChips.length">
        <p class="text-sm font-medium">Ook herkend</p>
        <p class="text-xs text-stuurhut-muted mb-2">Gaat mee naar het dossier. Klik weg wat niet klopt.</p>
        <div class="flex gap-1.5 flex-wrap">
          <span v-for="chip in extraChips" :key="chip.key" class="nieuw__extra">
            <UIcon :name="chip.icoon" class="size-3.5 shrink-0" />
            <span class="truncate">{{ chip.label }}</span>
            <button type="button" class="nieuw__weg" :aria-label="`${chip.label} weghalen`" @click="verwijderExtra(chip.key)">
              <UIcon name="i-lucide-x" class="size-3.5" />
            </button>
          </span>
        </div>
      </div>

      <div class="flex gap-2 justify-end mt-2">
        <UButton color="neutral" variant="ghost" @click="emit('cancel')">Annuleren</UButton>
        <UButton type="submit" :disabled="!naam.trim()">Reis beginnen</UButton>
      </div>
    </form>
  </div>
</template>

<style scoped>
.nieuw__zin {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.6rem 0.6rem 0.5rem;
  border-radius: 1rem;
  border: 1.5px dashed rgb(28 28 28 / 0.2);
  background: rgb(253 250 244 / 0.6);
}

.nieuw__extra {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  max-width: 100%;
  padding: 0.3rem 0.35rem 0.3rem 0.65rem;
  border-radius: 9999px;
  background: var(--color-stuurhut-subtle);
  font-size: 0.8rem;
}

.nieuw__weg {
  display: grid;
  place-items: center;
  padding: 0.15rem;
  border-radius: 9999px;
  color: var(--color-stuurhut-muted);
}

.nieuw__weg:hover {
  background: rgb(28 28 28 / 0.08);
  color: var(--color-stuurhut-ink);
}
</style>
