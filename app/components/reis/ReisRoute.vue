<script setup lang="ts">
import type { Halte } from '~/composables/useHaltes'
import { DIENST_INFO } from '~/utils/route'

// De route van een klant over het landschap: van de voorgrond (eerste contact) naar
// de bergen aan de horizon (nazorg). Afgelegd = doorgetrokken pad, wat nog komt =
// gestippeld, en de huidige halte gloeit limoen. Haltes zijn in procenten van het
// landschap gepositioneerd, net als de pins op de kaart (kaartPlekken.ts).
//
// Op smalle schermen is een kronkelende route onleesbaar; daar wordt het een
// verticale lijst met hetzelfde beeldritme.
const props = defineProps<{
  haltes: Halte[]
  geselecteerdId: string | null
  /** Aantal open taken per halte-id, voor de subregel. */
  openTaken: Record<string, number>
}>()

const emit = defineEmits<{ kies: [id: string] }>()

const huidigIndex = computed(() => {
  const i = props.haltes.findIndex(h => !h.afgerondOp)
  return i === -1 ? props.haltes.length : i
})

// Twee rijbanen die om en om worden gebruikt: labels wijzen naar rechts, dus een halte
// op de linkerbaan botst nooit met de rechterbaan op dezelfde hoogte. Naar de horizon
// toe lopen de banen naar elkaar toe (perspectief) en wordt alles kleiner.
const ONDER = 93
const BOVEN = 22
const punten = computed(() => {
  const n = props.haltes.length
  return props.haltes.map((h, i) => {
    const t = n === 1 ? 0 : i / (n - 1)
    const y = ONDER - t * (ONDER - BOVEN)
    const breedte = 11 * (1 - t * 0.4)
    const x = 46 + (i % 2 === 0 ? -breedte : breedte) + t * 4
    return { x, y, schaal: +(1 - t * 0.28).toFixed(2) }
  })
})

function pad(p: { x: number, y: number }[]) {
  if (!p.length) return ''
  let d = `M${p[0]!.x} ${p[0]!.y}`
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i]!
    const p1 = p[i]!
    const p2 = p[i + 1]!
    const p3 = p[i + 2] ?? p2
    d += ` C${(p1.x + (p2.x - p0.x) / 6).toFixed(2)} ${(p1.y + (p2.y - p0.y) / 6).toFixed(2)}, ${(p2.x - (p3.x - p1.x) / 6).toFixed(2)} ${(p2.y - (p3.y - p1.y) / 6).toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
  }
  return d
}

const start = computed(() => {
  const eerste = punten.value[0]
  return eerste ? { x: eerste.x - 10, y: 106 } : { x: 0, y: 0 }
})
const padHeel = computed(() => pad([start.value, ...punten.value]))
const padGelopen = computed(() => pad([start.value, ...punten.value.slice(0, huidigIndex.value + 1)]))
const padKomend = computed(() => pad(punten.value.slice(Math.max(0, huidigIndex.value))))

// Bij veel haltes krijgen alleen de haltes rond "nu" een label; de rest is een
// rondje met het label bij hover/focus. Zo blijft een volledig pakket leesbaar.
function compact(i: number) {
  return props.haltes.length > 9 && Math.abs(i - huidigIndex.value) > 2
}

function stand(i: number): 'gelopen' | 'nu' | 'komend' {
  return i < huidigIndex.value ? 'gelopen' : i === huidigIndex.value ? 'nu' : 'komend'
}

function subregel(h: Halte, i: number) {
  if (h.afgerondOp) return new Date(h.afgerondOp).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
  const open = props.openTaken[h.id] ?? 0
  if (i === huidigIndex.value) return open ? `${meervoud(open, 'taak', 'taken')} open` : 'Je bent hier'
  if (h.streefdatum) return new Date(`${h.streefdatum}T00:00:00`).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
  return DIENST_INFO[h.dienst].label
}

function icoonKleur(h: Halte, i: number) {
  if (stand(i) !== 'gelopen') return undefined
  const [van, tot] = DIENST_INFO[h.dienst].kleur
  return { background: `linear-gradient(135deg, ${van}, ${tot})` }
}

// "Speel de reis af": het afgelegde pad tekent zich opnieuw, haltes ploppen op volgorde.
const afspelen = ref(0)
function speelAf() {
  afspelen.value++
}
onMounted(() => requestAnimationFrame(speelAf))
defineExpose({ speelAf })
</script>

<template>
  <div class="reisroute">
    <!-- Breed: het landschap -->
    <div class="reisroute__landschap">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="reisroute__svg" aria-hidden="true">
        <path :d="padHeel" class="reisroute__schaduw" vector-effect="non-scaling-stroke" />
        <path :key="`g${afspelen}`" :d="padGelopen" class="reisroute__gelopen" vector-effect="non-scaling-stroke" />
        <path :d="padKomend" class="reisroute__komend" vector-effect="non-scaling-stroke" />
      </svg>

      <div
        v-for="(h, i) in haltes"
        :key="`${h.id}-${afspelen}`"
        class="halte"
        :class="[`halte--${stand(i)}`, { 'halte--compact': compact(i), 'halte--gekozen': geselecteerdId === h.id }]"
        :style="{ left: `${punten[i]!.x}%`, top: `${punten[i]!.y}%`, '--s': punten[i]!.schaal, '--vertraging': `${Math.min(i, huidigIndex) * 90}ms`, zIndex: 100 - i }"
      >
        <span v-if="stand(i) === 'nu' && haltes.length <= 9" class="halte__bubbel">Je bent hier</span>
        <button type="button" class="halte__knop" :aria-label="`${h.titel} — ${subregel(h, i)}`" :aria-pressed="geselecteerdId === h.id" @click="emit('kies', h.id)">
          <span class="halte__icoon" :style="icoonKleur(h, i)">
            <UIcon :name="stand(i) === 'gelopen' ? 'i-lucide-check' : h.icoon" class="size-5" />
          </span>
          <span class="halte__tekst">
            <span class="halte__label">{{ h.titel }}</span>
            <span class="halte__sub">{{ subregel(h, i) }}</span>
          </span>
        </button>
        <span class="halte__steel" aria-hidden="true" />
        <span class="halte__voet" aria-hidden="true" />
      </div>
    </div>

    <!-- Smal: een lijst -->
    <ol class="reisroute__lijst">
      <li v-for="(h, i) in haltes" :key="h.id" :class="`lijsthalte lijsthalte--${stand(i)}`">
        <button type="button" class="lijsthalte__knop" :aria-pressed="geselecteerdId === h.id" @click="emit('kies', h.id)">
          <span class="halte__icoon" :style="icoonKleur(h, i)">
            <UIcon :name="stand(i) === 'gelopen' ? 'i-lucide-check' : h.icoon" class="size-4" />
          </span>
          <span class="flex flex-col text-left">
            <span class="font-semibold">{{ h.titel }}</span>
            <span class="text-xs text-stuurhut-muted">{{ subregel(h, i) }}</span>
          </span>
          <span v-if="stand(i) === 'nu'" class="lijsthalte__nu">Nu</span>
        </button>
      </li>
    </ol>

    <button v-if="haltes.length" type="button" class="sh-pil reisroute__afspelen" @click="speelAf">
      <span class="text-sm">Speel de reis af</span>
      <span class="sh-pil__rond"><UIcon name="i-lucide-play" class="size-4" /></span>
    </button>
  </div>
</template>

<style scoped>
.reisroute__landschap {
  position: absolute;
  inset: 0;
}

.reisroute__svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  fill: none;
  stroke-linecap: round;
}

.reisroute__schaduw {
  stroke: rgb(40 60 20 / 0.18);
  stroke-width: 14;
}

.reisroute__gelopen {
  stroke: #fdfaf4;
  stroke-width: 7;
  /* Tekent zich van de voorgrond naar boven. Geen dasharray-truc: met
     non-scaling-stroke kloppen pathLength en dash-lengtes niet met elkaar. */
  animation: reisroute-teken 1.6s cubic-bezier(0.5, 0.5, 0, 1) both;
}

.reisroute__komend {
  stroke: rgb(253 250 244 / 0.8);
  stroke-width: 3.5;
  stroke-dasharray: 2 10;
}

@keyframes reisroute-teken {
  from { clip-path: inset(100% 0 0 0); }
  to { clip-path: inset(0 0 0 0); }
}

/* ---- Halte (zelfde anatomie als KaartPin: kaartje, steel, voet) ---- */
.halte {
  position: absolute;
  width: 0;
  height: 0;
  animation: halte-in 420ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
  animation-delay: var(--vertraging);
}

@keyframes halte-in {
  from { opacity: 0; translate: 0 12px; }
}

.halte__knop {
  position: absolute;
  bottom: 3.6rem;
  left: -1.4rem;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.45rem 1.1rem 0.45rem 0.45rem;
  border-radius: 1rem;
  background: rgb(253 250 244 / 0.94);
  backdrop-filter: blur(8px);
  box-shadow: 0 10px 30px rgb(30 40 50 / 0.2), 0 1px 0 rgb(255 255 255 / 0.8) inset;
  white-space: nowrap;
  transform-origin: 1.4rem 100%;
  transform: scale(var(--s));
  transition: transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 220ms;
}

.halte__knop:hover,
.halte__knop:focus-visible,
.halte--gekozen .halte__knop {
  transform: translateY(-4px) scale(var(--s));
  box-shadow: 0 16px 40px rgb(30 40 50 / 0.3), 0 1px 0 rgb(255 255 255 / 0.8) inset;
}

.halte--gekozen .halte__knop {
  outline: 2px solid var(--color-stuurhut-ink);
  outline-offset: 2px;
}

.halte__icoon {
  display: grid;
  place-items: center;
  width: 2.9rem;
  height: 2.9rem;
  flex-shrink: 0;
  margin-left: -1rem;
  border-radius: 9999px;
  background: #fff;
  color: var(--color-stuurhut-muted);
  box-shadow: 0 6px 16px rgb(0 0 0 / 0.2), 0 0 0 4px rgb(255 255 255 / 0.9);
}

.halte--gelopen .halte__icoon {
  color: #fff;
}

.halte--nu .halte__icoon {
  background: var(--color-stuurhut-limoen);
  color: var(--color-stuurhut-ink);
  box-shadow: 0 0 0 4px #fff, 0 0 0 10px rgb(228 242 138 / 0.55), 0 6px 16px rgb(0 0 0 / 0.2);
}

.halte--komend .halte__knop {
  background: rgb(253 250 244 / 0.66);
}

.halte--komend .halte__label {
  color: var(--color-stuurhut-muted);
}

.halte__tekst {
  display: flex;
  flex-direction: column;
  text-align: left;
}

.halte__label {
  font-size: 1rem;
  font-weight: 600;
}

.halte__sub {
  font-size: 0.78rem;
  color: var(--color-stuurhut-muted);
}

/* Compact: alleen het rondje; label verschijnt bij hover/focus. */
.halte--compact .halte__knop {
  padding: 0.3rem;
  left: -1.75rem;
  border-radius: 9999px;
}

.halte--compact .halte__icoon {
  margin-left: 0;
  width: 2.4rem;
  height: 2.4rem;
}

.halte--compact .halte__tekst {
  display: none;
}

.halte--compact .halte__knop:hover,
.halte--compact .halte__knop:focus-visible {
  padding: 0.3rem 1rem 0.3rem 0.3rem;
  border-radius: 1rem;
}

.halte--compact .halte__knop:hover .halte__tekst,
.halte--compact .halte__knop:focus-visible .halte__tekst {
  display: flex;
}

.halte__steel {
  position: absolute;
  left: -1px;
  bottom: 0.4rem;
  width: 2px;
  height: 3.25rem;
  background: linear-gradient(#fff, rgb(255 255 255 / 0.6));
  box-shadow: 0 0 4px rgb(0 0 0 / 0.25);
  transform-origin: bottom;
  transform: scaleY(var(--s));
}

.halte__voet {
  position: absolute;
  left: -0.45rem;
  top: -0.45rem;
  width: 0.9rem;
  height: 0.9rem;
  border-radius: 9999px;
  border: 3px solid #fff;
  background: rgb(255 255 255 / 0.3);
  box-shadow: 0 1px 4px rgb(0 0 0 / 0.35);
}

.halte--nu .halte__voet {
  background: var(--color-stuurhut-limoen);
}

.halte__bubbel {
  position: absolute;
  bottom: calc(3.6rem + 3.9rem * var(--s));
  left: -2.2rem;
  padding: 0.3rem 0.7rem;
  border-radius: 9999px;
  background: var(--color-stuurhut-ink);
  color: #fff;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
}

.halte__bubbel::after {
  content: "";
  position: absolute;
  left: 1.9rem;
  bottom: -0.3rem;
  width: 0.6rem;
  height: 0.6rem;
  background: var(--color-stuurhut-ink);
  rotate: 45deg;
}

.reisroute__afspelen {
  position: absolute;
  left: 50%;
  bottom: 1.5rem;
  translate: -50% 0;
  z-index: 120;
}

/* ---- Lijst (smal) ---- */
.reisroute__lijst {
  display: none;
}

@media (max-width: 1023px) {
  .reisroute__landschap,
  .reisroute__afspelen {
    display: none;
  }

  .reisroute__lijst {
    display: flex;
    flex-direction: column;
    position: relative;
    padding: 0.5rem 0;
  }

  .reisroute__lijst::before {
    content: "";
    position: absolute;
    left: 1.85rem;
    top: 1.5rem;
    bottom: 1.5rem;
    border-left: 3px dotted rgb(0 0 0 / 0.15);
  }

  .lijsthalte__knop {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.9rem;
    width: 100%;
    padding: 0.5rem 0.75rem;
    border-radius: 1rem;
  }

  .lijsthalte__knop[aria-pressed="true"] {
    background: rgb(0 0 0 / 0.05);
  }

  .lijsthalte .halte__icoon {
    margin-left: 0;
    width: 2.25rem;
    height: 2.25rem;
  }

  .lijsthalte--gelopen .halte__icoon {
    color: #fff;
  }

  .lijsthalte--nu .halte__icoon {
    background: var(--color-stuurhut-limoen);
    color: var(--color-stuurhut-ink);
  }

  .lijsthalte--komend {
    opacity: 0.7;
  }

  .lijsthalte__nu {
    margin-left: auto;
    padding: 0.2rem 0.6rem;
    border-radius: 9999px;
    background: var(--color-stuurhut-ink);
    color: #fff;
    font-size: 0.7rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .halte,
  .reisroute__gelopen {
    animation: none;
  }
}
</style>
