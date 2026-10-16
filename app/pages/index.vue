<script setup lang="ts">
import type { KaartPlek, KaartPlekId } from '~/utils/kaartPlekken'
import { KAART_PLEKKEN } from '~/utils/kaartPlekken'

definePageMeta({ layout: 'kaart' })

const { overzicht, refresh: refreshOverzicht } = useKaartOverzicht()
await useAsyncData('kaart-overzicht-init', () => refreshOverzicht())

const { state: focusState, resterendeSeconden, start: startFocus, stop: stopFocus } = useFocusTimer()

// Eén moment, op de server vastgelegd en bij hydratatie hergebruikt.
const moment = useState('kaart-moment', () => Date.now())
const nu = computed(() => nederlandseTijd(moment.value))
const groet = computed(() => {
  const uur = nu.value.uur
  if (uur < 6) return 'Nog laat, Martijn'
  if (uur < 12) return 'Goedemorgen, Martijn'
  if (uur < 18) return 'Goedemiddag, Martijn'
  if (uur < 22) return 'Goedenavond, Martijn'
  return 'Nog laat, Martijn'
})
const datum = computed(() => {
  const dag = new Date(moment.value).toLocaleDateString('nl-NL', { timeZone: 'Europe/Amsterdam', weekday: 'long', day: 'numeric', month: 'long' })
  return dag.charAt(0).toUpperCase() + dag.slice(1)
})

function subtitel(id: KaartPlekId) {
  const o = overzicht.value
  if (!o) return ''
  switch (id) {
    case 'doelen': return `${meervoud(o.doelenActief, 'doel', 'doelen')} actief`
    case 'trajecten': return `${meervoud(o.trajectenLopend, 'traject', 'trajecten')} lopend`
    case 'agenda': return o.volgendeAfspraak
      ? `${meervoud(o.afsprakenVandaag, 'afspraak', 'afspraken')} · volgende ${o.volgendeAfspraak.startTijd}`
      : `${meervoud(o.afsprakenVandaag, 'afspraak', 'afspraken')} vandaag`
    case 'todos': return `${meervoud(o.openTaken, 'taak', 'taken')} open`
    case 'financien': return 'Nog in te richten'
    case 'aanrader': return 'Bekijk suggestie'
  }
}

// --- Reizen over de kaart ---------------------------------------------------------

const kaart = ref<{ vliegNaar: (x: number, y: number, zoom?: number, duur?: number) => Promise<boolean>, overzicht: () => Promise<boolean>, zoomStap: (f: number) => void }>()
const actiefId = ref<KaartPlekId | null>(null)
const paneelOpen = ref(false)
const actievePlek = computed(() => KAART_PLEKKEN.find(p => p.id === actiefId.value) ?? null)

async function reisNaar(plek: KaartPlek) {
  preview.value = false
  actiefId.value = plek.id
  const aangekomen = await kaart.value?.vliegNaar(plek.x, plek.y, 1.7)
  // Onderweg onderbroken (gesleept, andere pin gekozen): niet alsnog openen.
  if (!aangekomen || actiefId.value !== plek.id) return
  if (plek.bestemming.soort === 'pagina') {
    await navigateTo(plek.bestemming.to)
  } else {
    paneelOpen.value = true
  }
}

function aanrader() {
  const plek = KAART_PLEKKEN.find(p => p.id === 'aanrader')!
  reisNaar(plek)
}

watch(paneelOpen, (open) => {
  if (!open) {
    actiefId.value = null
    kaart.value?.overzicht()
  }
})

// "Preview dag": de camera rijdt de route af, langs elke plek.
const preview = ref(false)
async function previewDag() {
  if (preview.value) return
  preview.value = true
  try {
    for (const plek of KAART_PLEKKEN) {
      if (!preview.value) break
      actiefId.value = plek.id
      const aangekomen = await kaart.value?.vliegNaar(plek.x, plek.y, 1.5, 1.4)
      if (!aangekomen) {
        // Gebruiker nam het stuur over: tour stoppen, camera laten waar die is.
        if (preview.value) actiefId.value = null
        preview.value = false
        return
      }
      await new Promise(r => setTimeout(r, 700))
    }
  } finally {
    // Alleen terug naar het overzicht als de tour niet door een pin-keuze is overgenomen.
    if (preview.value) {
      preview.value = false
      actiefId.value = null
      kaart.value?.overzicht()
    }
  }
}

const focusLabel = computed(() => {
  if (focusState.value.fase === 'idle') return 'Focus Mode'
  const min = Math.floor(resterendeSeconden.value / 60).toString().padStart(2, '0')
  const sec = (resterendeSeconden.value % 60).toString().padStart(2, '0')
  return `${focusState.value.fase === 'werk' ? 'Focus' : 'Pauze'} · ${min}:${sec}`
})

function wisselFocus() {
  if (focusState.value.fase === 'idle') startFocus()
  else stopFocus()
}

// Na een afgeronde focusfase de teller op de kaart bijwerken.
watch(() => focusState.value.fase, () => setTimeout(refreshOverzicht, 800))

const menuItems = [
  [
    { label: 'Vandaag (dashboard)', icon: 'i-lucide-layout-dashboard', to: '/vandaag' },
    { label: 'Agenda', icon: 'i-lucide-calendar', to: '/agenda' },
    { label: 'Trajecten', icon: 'i-lucide-route', to: '/trajecten' },
    { label: 'Journal', icon: 'i-lucide-notebook-pen', to: '/journal' },
    { label: 'Ideeën', icon: 'i-lucide-lightbulb', to: '/ideeen' }
  ]
]
</script>

<template>
  <div class="kaartpagina">
    <KaartStadKaart
      ref="kaart"
      afbeelding="/images/kaart/utrecht.webp"
      :route="KAART_PLEKKEN"
    >
      <KaartPin
        v-for="plek in KAART_PLEKKEN"
        :key="plek.id"
        :plek="plek"
        :subtitel="subtitel(plek.id)"
        :actief="actiefId === plek.id"
        @kies="reisNaar(plek)"
      />
    </KaartStadKaart>

    <!-- Bovenbalk -->
    <header class="kaartui__balk">
      <div class="flex gap-2">
        <UDropdownMenu :items="menuItems" :content="{ align: 'start' }">
          <button type="button" class="kaartui__chip kaartui__chip--vierkant" aria-label="Menu">
            <UIcon name="i-lucide-asterisk" class="size-6" />
          </button>
        </UDropdownMenu>
        <div class="kaartui__chip">
          <UIcon name="i-lucide-grip" class="size-4 text-stuurhut-muted" />
          <span class="font-medium">Stuurhut</span>
          <UIcon name="i-lucide-sparkle" class="size-4 text-amber-400" />
        </div>
      </div>
      <div class="flex gap-2">
        <div class="kaartui__chip">
          <UIcon name="i-lucide-map-pin" class="size-4" />
          <span>Utrecht</span>
        </div>
        <div class="kaartui__chip kaartui__chip--groep">
          <button type="button" aria-label="Uitzoomen" @click="kaart?.zoomStap(1 / 1.3)"><UIcon name="i-lucide-minus" class="size-5" /></button>
          <span class="kaartui__scheiding" />
          <button type="button" aria-label="Inzoomen" @click="kaart?.zoomStap(1.3)"><UIcon name="i-lucide-plus" class="size-5" /></button>
        </div>
      </div>
    </header>

    <!-- Linkerkolom -->
    <aside class="kaartui__links">
      <div class="kaartui__groet">
        <h1 class="text-[clamp(1.5rem,2.2vw,2rem)] leading-tight">{{ groet }} <span aria-hidden="true">👋</span></h1>
        <p class="text-sm text-stuurhut-muted">{{ datum }}</p>
      </div>

      <div class="kaartui__kaarten">
        <KaartVandaag :focus-minuten="overzicht?.focusMinutenVandaag ?? 0" />

        <section class="kaartkaart kaartui__aanrader">
          <h2 class="kaartkaart__kop">
            <UIcon name="i-lucide-sparkles" class="size-5 text-violet-500" /> AI Aanrader
          </h2>
          <p class="mt-3 text-sm leading-relaxed">
            <template v-if="overzicht">
              Je hebt vandaag {{ meervoud(overzicht.afsprakenVandaag, 'afspraak', 'afspraken') }} en {{ meervoud(overzicht.openTaken, 'open taak', 'open taken') }}.
              Bekijk wat nu het meeste oplevert.
            </template>
          </p>
          <button type="button" class="kaartui__link mt-4" @click="aanrader">
            Bekijk suggesties <UIcon name="i-lucide-arrow-right" class="size-4" />
          </button>
        </section>

        <section class="kaartkaart">
          <h2 class="kaartkaart__kop">Focus Overzicht</h2>
          <dl class="mt-3 flex flex-col text-sm">
            <div class="kaartui__rij">
              <dt><UIcon name="i-lucide-calendar" class="size-4" /> Agenda</dt>
              <dd>{{ meervoud(overzicht?.afsprakenVandaag ?? 0, 'afspraak', 'afspraken') }} vandaag</dd>
            </div>
            <div class="kaartui__rij">
              <dt><UIcon name="i-lucide-list" class="size-4" /> Taken</dt>
              <dd>{{ meervoud(overzicht?.openTaken ?? 0, 'open taak', 'open taken') }}</dd>
            </div>
            <div class="kaartui__rij">
              <dt><UIcon name="i-lucide-clock" class="size-4" /> Focus tijd</dt>
              <dd>{{ formatDuur(overzicht?.focusMinutenVandaag ?? 0) }} vandaag</dd>
            </div>
          </dl>
        </section>

        <button type="button" class="kaartui__focus" :class="{ 'kaartui__focus--loopt': focusState.fase !== 'idle' }" @click="wisselFocus">
          <UIcon name="i-lucide-target" class="size-7" />
          <span class="flex-1 text-left font-medium">{{ focusLabel }}</span>
          <span class="kaartui__focus-pijl">
            <UIcon :name="focusState.fase === 'idle' ? 'i-lucide-arrow-right' : 'i-lucide-square'" class="size-5" />
          </span>
        </button>
      </div>
    </aside>

    <!-- Onderaan -->
    <button type="button" class="kaartui__preview" :disabled="preview" @click="previewDag">
      <span>{{ preview ? 'Onderweg…' : 'Preview Dag' }}</span>
      <span class="kaartui__preview-play"><UIcon name="i-lucide-play" class="size-4" /></span>
    </button>

    <NuxtLink to="/agenda" class="kaartui__plan">
      <div class="flex-1 flex flex-col justify-between p-6">
        <div class="flex items-center gap-3 text-xs tracking-[0.2em] font-mono">
          PLAN JE DAG
          <UIcon name="i-lucide-sun" class="size-4" />
          <UIcon name="i-lucide-calendar" class="size-4" />
          <UIcon name="i-lucide-target" class="size-4" />
        </div>
        <p class="text-[clamp(1.25rem,1.8vw,1.75rem)] leading-tight">Maak er een productieve dag van!</p>
      </div>
      <img src="/images/hero-day.jpg" alt="" class="kaartui__plan-foto">
    </NuxtLink>

    <USlideover v-model:open="paneelOpen" :title="actievePlek?.label" side="right">
      <template #body>
        <KaartPaneel v-if="actievePlek" :key="actievePlek.id" :plek-id="actievePlek.id" />
      </template>
    </USlideover>
  </div>
</template>

<style scoped>
.kaartpagina {
  position: absolute;
  inset: 0;
}

/* Alle overlay-UI laat klikken door naar de kaart, behalve de elementen zelf. */
.kaartui__balk,
.kaartui__links {
  pointer-events: none;
}

.kaartui__balk > *,
.kaartui__links > * {
  pointer-events: auto;
}

.kaartui__balk {
  position: absolute;
  inset: 1.25rem 1.25rem auto 1.25rem;
  display: flex;
  justify-content: space-between;
  z-index: 10;
}

.kaartui__chip {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  height: 3.25rem;
  padding: 0 1.25rem;
  border-radius: 1rem;
  background: rgb(253 250 244 / 0.9);
  backdrop-filter: blur(10px);
  box-shadow: 0 6px 20px rgb(30 40 50 / 0.12);
}

.kaartui__chip--vierkant {
  width: 3.25rem;
  padding: 0;
  justify-content: center;
}

.kaartui__chip--groep {
  padding: 0 0.75rem;
}

.kaartui__chip--groep button {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
}

.kaartui__chip--groep button:hover {
  background: var(--color-stuurhut-subtle);
}

.kaartui__scheiding {
  width: 1px;
  height: 1.5rem;
  background: rgb(0 0 0 / 0.12);
}

.kaartui__links {
  position: absolute;
  top: 6rem;
  left: 1.25rem;
  bottom: 1.25rem;
  width: min(19.5rem, calc(100vw - 2.5rem));
  display: flex;
  flex-direction: column;
  gap: 1rem;
  z-index: 10;
}

.kaartui__groet {
  padding: 0 0.5rem;
  text-shadow: 0 1px 12px rgb(255 255 255 / 0.8);
}

.kaartui__kaarten {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
  scrollbar-width: none;
  padding-bottom: 0.25rem;
}

.kaartui__kaarten :deep(.kaartkaart),
.kaartui__kaarten .kaartkaart {
  padding: 1.25rem;
  border-radius: 1.25rem;
  background: rgb(253 250 244 / 0.92);
  backdrop-filter: blur(12px);
  box-shadow: 0 10px 30px rgb(30 40 50 / 0.14);
}

.kaartui__kaarten :deep(.kaartkaart__kop),
.kaartui__kaarten .kaartkaart__kop {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 1.05rem;
  font-weight: 600;
}

.kaartui__link {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 0.55rem 0.9rem;
  border-radius: 0.6rem;
  border: 1px solid rgb(122 63 224 / 0.3);
  color: rgb(98 45 190);
  font-size: 0.85rem;
}

.kaartui__link:hover {
  background: rgb(122 63 224 / 0.07);
}

.kaartui__rij {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid rgb(0 0 0 / 0.07);
}

.kaartui__rij:last-child {
  border-bottom: 0;
}

.kaartui__rij dt {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.kaartui__rij dd {
  color: var(--color-stuurhut-muted);
}

.kaartui__focus {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.9rem 0.9rem 0.9rem 1.25rem;
  border-radius: 1.25rem;
  background: #e4f28a;
  box-shadow: 0 10px 30px rgb(30 40 50 / 0.14);
  transition: transform 180ms;
}

.kaartui__focus:hover {
  transform: translateY(-2px);
}

.kaartui__focus--loopt {
  background: #c9e65a;
}

.kaartui__focus-pijl {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  border-radius: 0.9rem;
  background: rgb(0 0 0 / 0.08);
}

.kaartui__preview {
  position: absolute;
  left: 50%;
  bottom: 1.5rem;
  translate: -50% 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 2.5rem;
  padding: 0.6rem 0.6rem 0.6rem 2rem;
  border-radius: 9999px;
  background: rgb(38 38 38 / 0.88);
  color: #fff;
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 30px rgb(0 0 0 / 0.25);
}

.kaartui__preview-play {
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 9999px;
  background: #e4f28a;
  color: #262626;
}

.kaartui__plan {
  position: absolute;
  right: 1.25rem;
  bottom: 1.25rem;
  z-index: 10;
  display: flex;
  width: min(32rem, 36vw);
  height: 13rem;
  padding: 0.75rem;
  border-radius: 1.5rem;
  background: #e4f28a;
  box-shadow: 0 10px 30px rgb(30 40 50 / 0.18);
  transition: transform 180ms;
}

.kaartui__plan:hover {
  transform: translateY(-2px);
}

.kaartui__plan-foto {
  width: 45%;
  border-radius: 1rem;
  object-fit: cover;
}

/* Lage schermen (laptop): compacter, en de Aanrader-kaart laten vallen — de pin op
   de kaart doet hetzelfde. */
@media (min-width: 1024px) and (max-height: 860px) {
  .kaartui__kaarten {
    gap: 0.5rem;
  }

  .kaartui__kaarten :deep(.kaartkaart),
  .kaartui__kaarten .kaartkaart {
    padding: 0.9rem 1.1rem;
  }

  .kaartui__aanrader {
    display: none;
  }
}

/* Telefoon/tablet: kaarten worden een horizontale strook onderaan, de rest verdwijnt. */
@media (max-width: 1023px) {
  .kaartui__links {
    top: auto;
    bottom: 5.5rem;
    left: 0;
    width: 100%;
  }

  .kaartui__groet {
    position: fixed;
    top: 5.25rem;
    left: 1.25rem;
  }

  .kaartui__kaarten {
    flex-direction: row;
    overflow-x: auto;
    overflow-y: visible;
    scroll-snap-type: x mandatory;
    padding: 0 1rem 0.25rem;
  }

  .kaartui__kaarten > * {
    flex: 0 0 min(19rem, 82vw);
    scroll-snap-align: start;
  }

  .kaartui__plan {
    display: none;
  }

  .kaartui__balk .kaartui__chip:not(.kaartui__chip--vierkant):not(.kaartui__chip--groep) {
    display: none;
  }
}
</style>
