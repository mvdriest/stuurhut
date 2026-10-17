<script setup lang="ts">
import type { Halte } from '~/composables/useHaltes'
import type { Taak } from '~/composables/useTaken'
import { DIENST_INFO } from '~/utils/route'

// De halte die in het dossier geselecteerd is (standaard: waar het traject nu is),
// met de taken die bij die halte horen. Vanaf hier rond je een halte af.
const props = defineProps<{
  halte: Halte
  index: number
  totaal: number
  isHuidig: boolean
  taken: Taak[]
  trajectId: string
}>()

const emit = defineEmits<{ terugNaarNu: [], gewijzigd: [] }>()

const { refresh: refreshTaken } = useTaken()

const kicker = computed(() => {
  const plek = `Halte ${props.index + 1} van ${props.totaal}`
  if (props.isHuidig) return `Je bent hier · ${plek}`
  if (props.halte.afgerondOp) return `${plek} · bereikt ${new Date(props.halte.afgerondOp).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}`
  return `${plek} · nog te gaan`
})

const streef = computed(() => {
  if (!props.halte.streefdatum) return null
  const doel = new Date(`${props.halte.streefdatum}T00:00:00`)
  const dagen = Math.round((doel.getTime() - new Date(`${nederlandseDatum()}T00:00:00`).getTime()) / 86_400_000)
  const label = doel.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
  if (props.halte.afgerondOp) return `Streefdatum was ${label}`
  if (dagen < 0) return `Streefdatum ${label} · ${meervoud(-dagen, 'dag', 'dagen')} over tijd`
  return `Streefdatum ${label} · nog ${meervoud(dagen, 'dag', 'dagen')}`
})

const gesorteerd = computed(() => [...props.taken].sort((a, b) => (a.status === 'klaar' ? 1 : 0) - (b.status === 'klaar' ? 1 : 0) || a.volgorde - b.volgorde))

async function wissel(taak: Taak) {
  await $fetch(`/api/taken/${taak.id}`, { method: 'PATCH', body: { status: taak.status === 'klaar' ? 'to_do' : 'klaar' } })
  await refreshTaken()
}

const nieuw = ref('')
async function voegToe() {
  if (!nieuw.value.trim()) return
  await $fetch('/api/taken', { method: 'POST', body: { trajectId: props.trajectId, halteId: props.halte.id, tekst: nieuw.value.trim() } })
  nieuw.value = ''
  await refreshTaken()
}

const bezig = ref(false)
async function zetAfgerond(afgerond: boolean) {
  bezig.value = true
  try {
    await $fetch(`/api/haltes/${props.halte.id}`, { method: 'PATCH', body: { afgerond } })
    emit('gewijzigd')
  } finally {
    bezig.value = false
  }
}

const openTaken = computed(() => props.taken.filter(t => t.status !== 'klaar').length)

const statusLabel: Record<Taak['status'], string> = { to_do: '', bezig: 'bezig', review: 'review', klaar: '' }
</script>

<template>
  <section class="sh-kaart haltekaart" :class="{ 'haltekaart--nu': isHuidig }">
    <div class="flex items-start justify-between gap-2">
      <p class="sh-kicker flex items-center gap-2">
        <span v-if="isHuidig" class="haltekaart__puls" />{{ kicker }}
      </p>
      <button v-if="!isHuidig" type="button" class="text-xs font-medium underline-offset-2 hover:underline shrink-0" @click="emit('terugNaarNu')">
        Naar nu
      </button>
    </div>

    <h2 class="sh-titel text-[1.75rem] mt-2">{{ halte.titel }}</h2>
    <div class="flex items-center gap-2 mt-1.5 flex-wrap">
      <span class="haltekaart__dienst" :style="{ background: `linear-gradient(135deg, ${DIENST_INFO[halte.dienst].kleur[0]}, ${DIENST_INFO[halte.dienst].kleur[1]})` }">
        {{ DIENST_INFO[halte.dienst].label }}
      </span>
      <span v-if="streef" class="text-xs text-stuurhut-muted">{{ streef }}</span>
    </div>

    <ul class="mt-3">
      <li v-for="taak in gesorteerd" :key="taak.id" class="haltekaart__taak" :class="{ 'haltekaart__taak--klaar': taak.status === 'klaar' }">
        <button type="button" class="sh-vink" :class="{ 'sh-vink--aan': taak.status === 'klaar' }" :aria-label="taak.status === 'klaar' ? 'Weer openzetten' : 'Afvinken'" @click="wissel(taak)">
          <UIcon v-if="taak.status === 'klaar'" name="i-lucide-check" class="size-3" />
        </button>
        <span class="flex-1">{{ taak.tekst }}</span>
        <span v-if="statusLabel[taak.status]" class="haltekaart__pil">{{ statusLabel[taak.status] }}</span>
      </li>
    </ul>
    <form class="haltekaart__nieuw" @submit.prevent="voegToe">
      <UIcon name="i-lucide-plus" class="size-4 shrink-0" />
      <input v-model="nieuw" type="text" placeholder="Taak voor deze halte…" class="flex-1 bg-transparent outline-none">
    </form>

    <button
      v-if="!halte.afgerondOp"
      type="button"
      class="sh-cta w-full mt-4"
      :disabled="bezig"
      @click="zetAfgerond(true)"
    >
      <span class="flex-1">
        <span class="sh-kicker !text-stuurhut-ink/60 block">{{ openTaken ? `${meervoud(openTaken, 'taak', 'taken')} nog open` : 'Alles gedaan' }}</span>
        <span class="font-semibold">Halte afronden</span>
      </span>
      <span class="sh-cta__pijl"><UIcon name="i-lucide-flag" class="size-5" /></span>
    </button>
    <button v-else type="button" class="haltekaart__heropen" :disabled="bezig" @click="zetAfgerond(false)">
      <UIcon name="i-lucide-rotate-ccw" class="size-4" /> Halte heropenen
    </button>
  </section>
</template>

<style scoped>
.haltekaart--nu {
  box-shadow: 0 0 0 2px var(--color-stuurhut-limoen), 0 10px 30px rgb(30 40 50 / 0.14);
}

.haltekaart__puls {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background: #7bb33a;
  box-shadow: 0 0 0 4px rgb(123 179 58 / 0.2);
}

.haltekaart__dienst {
  padding: 0.15rem 0.6rem;
  border-radius: 9999px;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 600;
}

.haltekaart__taak {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0;
  font-size: 0.875rem;
  border-bottom: 1px solid rgb(0 0 0 / 0.06);
}

.haltekaart__taak--klaar span.flex-1 {
  color: var(--color-stuurhut-muted);
  text-decoration: line-through;
}

.haltekaart__pil {
  font-size: 0.7rem;
  padding: 0.1rem 0.5rem;
  border-radius: 9999px;
  background: var(--color-stuurhut-subtle);
  color: var(--color-stuurhut-muted);
}

.haltekaart__nieuw {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.6rem;
  padding: 0.55rem 0.7rem;
  border-radius: 0.8rem;
  background: var(--color-stuurhut-subtle);
  font-size: 0.85rem;
  color: var(--color-stuurhut-muted);
}

.haltekaart__nieuw input::placeholder {
  color: var(--color-stuurhut-muted);
}

.haltekaart__heropen {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  font-size: 0.85rem;
  color: var(--color-stuurhut-muted);
}

.haltekaart__heropen:hover {
  color: var(--color-stuurhut-ink);
}
</style>
