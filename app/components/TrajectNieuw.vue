<script setup lang="ts">
import type { TrajectKleur } from '~/utils/kleuren'
import type { Dienst } from '~/utils/route'
import { DIENSTEN, DIENST_INFO } from '~/utils/route'

// Het korte "nieuw traject"-formulier: alleen wat nodig is om de reis te beginnen.
// Contact, financiën, volgende stap enz. vul je daarna aan in het dossier.

const emit = defineEmits<{
  submit: [payload: { naam: string, scope: 'zakelijk' | 'prive', diensten: Dienst[], kleur: TrajectKleur }]
  cancel: []
}>()

const naam = ref('')
const scope = ref<'zakelijk' | 'prive'>('zakelijk')
const diensten = ref<Dienst[]>([])

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

function onSubmit() {
  if (!naam.value.trim()) return
  emit('submit', {
    naam: naam.value.trim(),
    scope: scope.value,
    diensten: scope.value === 'zakelijk' ? diensten.value : [],
    kleur: kleur.value
  })
}
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
    <UInput v-model="naam" placeholder="Naam van de klant of het traject" required autofocus size="xl" class="w-full" />

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

    <div class="flex gap-2 justify-end mt-2">
      <UButton color="neutral" variant="ghost" @click="emit('cancel')">Annuleren</UButton>
      <UButton type="submit" :disabled="!naam.trim()">Reis beginnen</UButton>
    </div>
  </form>
</template>
