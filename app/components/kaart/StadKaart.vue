<script setup lang="ts">
import gsap from 'gsap'

// De kaart is één plat beeld in een echte CSS-3D-ruimte: het beeld kantelt licht mee
// met de muis, pins zweven er op translateZ boven en wolken nog hoger. Door dat
// hoogteverschil verschuiven de lagen ten opzichte van elkaar (parallax) en voelt
// het beeld als 3D, zonder 3D-model.
//
// Camera-model: (cx, cy) is het punt van de kaart (in % van het beeld) dat in het
// midden van het scherm staat; zoom is de schaal. Alles wordt in procenten van het
// beeld zelf uitgedrukt, zodat de server (SSR) en de browser dezelfde transform
// renderen, ongeacht de schermmaat.

const props = withDefaults(defineProps<{
  afbeelding: string
  /** Breedte/hoogte van het kaartbeeld. */
  verhouding?: number
  /** Punten (in %) waar de stippellijn-route langs loopt. */
  route?: { x: number, y: number }[]
}>(), {
  verhouding: 1610 / 977,
  route: () => []
})

const MIN_ZOOM = 1
const MAX_ZOOM = 2
const BASIS_KANTELING = 7 // graden rotateX in rust
const MUIS_KANTELING = 2.5 // extra graden bij muis aan de rand

const camera = reactive({ cx: 50, cy: 50, zoom: 1, kantelX: BASIS_KANTELING, kantelY: 0 })

const viewport = ref<HTMLElement>()
const wereld = ref<HTMLElement>()
const verminderdeBeweging = ref(false)

// Hoeveel % van het beeld is vanuit het midden zichtbaar? Bepaalt hoe ver je mag pannen
// zonder dat de rand van de kaart in beeld komt.
function grenzen(zoom: number) {
  const vp = viewport.value
  const w = wereld.value
  if (!vp || !w) return { x: [50, 50], y: [50, 50] } as const
  const halveBreedte = (vp.clientWidth / (2 * zoom * w.offsetWidth)) * 100
  const halveHoogte = (vp.clientHeight / (2 * zoom * w.offsetHeight)) * 100
  return {
    x: [Math.min(50, halveBreedte), Math.max(50, 100 - halveBreedte)],
    y: [Math.min(50, halveHoogte), Math.max(50, 100 - halveHoogte)]
  } as const
}

function begrens(cx: number, cy: number, zoom: number) {
  const g = grenzen(zoom)
  return {
    cx: Math.min(g.x[1], Math.max(g.x[0], cx)),
    cy: Math.min(g.y[1], Math.max(g.y[0], cy))
  }
}

function zet(cx: number, cy: number, zoom: number) {
  const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
  const b = begrens(cx, cy, z)
  camera.cx = b.cx
  camera.cy = b.cy
  camera.zoom = z
}

const wereldStijl = computed(() => ({
  transform: `rotateX(${camera.kantelX}deg) rotateY(${camera.kantelY}deg) scale(${camera.zoom}) translate(${50 - camera.cx}%, ${50 - camera.cy}%)`
}))

// Pins en labels houden een vaste schermgrootte en staan rechtop naar de kijker.
const tegenStijl = computed(() => ({
  '--kaart-tegenschaal': String(1 / camera.zoom),
  '--kaart-tegenkanteling': `${-camera.kantelX}deg`
}))

// --- Slepen, scrollen en knijpen -------------------------------------------------

const pointers = new Map<number, { x: number, y: number }>()
let knijpStart: { afstand: number, zoom: number } | null = null
let gesleept = false

function stopAnimaties() {
  gsap.killTweensOf(camera, 'cx,cy,zoom')
}

function onPointerDown(e: PointerEvent) {
  if ((e.target as HTMLElement).closest('[data-kaart-interactief]')) return
  stopAnimaties()
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  viewport.value?.setPointerCapture(e.pointerId)
  gesleept = false
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    knijpStart = { afstand: Math.hypot(a!.x - b!.x, a!.y - b!.y), zoom: camera.zoom }
  }
}

function onPointerMove(e: PointerEvent) {
  const vorige = pointers.get(e.pointerId)
  if (!vorige) {
    kantelNaarMuis(e)
    return
  }
  const w = wereld.value
  if (!w) return

  if (pointers.size === 2 && knijpStart) {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const [a, b] = [...pointers.values()]
    const afstand = Math.hypot(a!.x - b!.x, a!.y - b!.y)
    zet(camera.cx, camera.cy, knijpStart.zoom * (afstand / knijpStart.afstand))
    return
  }

  const dx = e.clientX - vorige.x
  const dy = e.clientY - vorige.y
  if (Math.abs(dx) + Math.abs(dy) > 2) gesleept = true
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  zet(
    camera.cx - (dx / (camera.zoom * w.offsetWidth)) * 100,
    camera.cy - (dy / (camera.zoom * w.offsetHeight)) * 100,
    camera.zoom
  )
}

function onPointerUp(e: PointerEvent) {
  pointers.delete(e.pointerId)
  if (pointers.size < 2) knijpStart = null
}

// Na slepen mag de losgelaten muisknop geen klik op een pin opleveren.
function onClickCapture(e: MouseEvent) {
  if (gesleept) {
    e.stopPropagation()
    e.preventDefault()
    gesleept = false
  }
}

// Zoomen richting de cursor: het kaartpunt onder de muis blijft onder de muis staan.
function zoomRond(nieuweZoom: number, schermX: number, schermY: number) {
  const vp = viewport.value
  const w = wereld.value
  if (!vp || !w) return
  const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nieuweZoom))
  const rect = vp.getBoundingClientRect()
  const mx = schermX - rect.left - rect.width / 2
  const my = schermY - rect.top - rect.height / 2
  const puntX = camera.cx + (mx / (camera.zoom * w.offsetWidth)) * 100
  const puntY = camera.cy + (my / (camera.zoom * w.offsetHeight)) * 100
  zet(puntX - (mx / (z * w.offsetWidth)) * 100, puntY - (my / (z * w.offsetHeight)) * 100, z)
}

function onWheel(e: WheelEvent) {
  stopAnimaties()
  zoomRond(camera.zoom * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY)
}

// --- Parallax: kantelen met de muis ---------------------------------------------

let kantelXNaar: ((v: number) => void) | undefined
let kantelYNaar: ((v: number) => void) | undefined

function kantelNaarMuis(e: PointerEvent) {
  if (e.pointerType !== 'mouse' || verminderdeBeweging.value || !viewport.value) return
  const rect = viewport.value.getBoundingClientRect()
  const nx = (e.clientX - rect.left) / rect.width - 0.5
  const ny = (e.clientY - rect.top) / rect.height - 0.5
  kantelXNaar?.(BASIS_KANTELING - ny * MUIS_KANTELING * 2)
  kantelYNaar?.(nx * MUIS_KANTELING * 2)
}

function onPointerLeave() {
  kantelXNaar?.(BASIS_KANTELING)
  kantelYNaar?.(0)
}

// --- Camera-vluchten (pin aanklikken, "Preview dag") ----------------------------

// Resolvet met true als de camera is aangekomen, false als de vlucht werd onderbroken
// (slepen, zoomen of een nieuwe vlucht) — dan hoort er niets meer te gebeuren.
function vliegNaar(x: number, y: number, zoom = 1.6, duur = 1.1): Promise<boolean> {
  const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
  const doel = begrens(x, y, z)
  stopAnimaties()
  if (verminderdeBeweging.value) {
    zet(doel.cx, doel.cy, z)
    return Promise.resolve(true)
  }
  return new Promise<boolean>((resolve) => {
    gsap.to(camera, {
      cx: doel.cx,
      cy: doel.cy,
      zoom: z,
      duration: duur,
      ease: 'power3.inOut',
      onComplete: () => resolve(true),
      onInterrupt: () => resolve(false)
    })
  })
}

function overzicht() {
  return vliegNaar(50, 50, 1, 1)
}

function zoomStap(factor: number) {
  const vp = viewport.value
  if (!vp) return
  const rect = vp.getBoundingClientRect()
  stopAnimaties()
  const startZoom = camera.zoom
  const doel = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, startZoom * factor))
  const t = { z: startZoom }
  gsap.to(t, {
    z: doel,
    duration: verminderdeBeweging.value ? 0 : 0.35,
    ease: 'power2.out',
    onUpdate: () => zoomRond(t.z, rect.left + rect.width / 2, rect.top + rect.height / 2)
  })
}

defineExpose({ vliegNaar, overzicht, zoomStap })

// --- Route: vloeiende stippellijn langs de plekken (Catmull-Rom → Bézier) --------

const routePad = computed(() => {
  const p = props.route.map(r => ({ x: r.x * 10, y: r.y * 10 }))
  if (p.length < 2) return ''
  let d = `M ${p[0]!.x} ${p[0]!.y}`
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i]!
    const p1 = p[i]!
    const p2 = p[i + 1]!
    const p3 = p[i + 2] ?? p2
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`
  }
  return d
})

onMounted(() => {
  verminderdeBeweging.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  kantelXNaar = gsap.quickTo(camera, 'kantelX', { duration: 0.8, ease: 'power3.out' })
  kantelYNaar = gsap.quickTo(camera, 'kantelY', { duration: 0.8, ease: 'power3.out' })
  // Bij resize opnieuw begrenzen, anders kan de kaartrand in beeld schuiven.
  window.addEventListener('resize', herbegrens)
})

function herbegrens() {
  zet(camera.cx, camera.cy, camera.zoom)
}

onBeforeUnmount(() => {
  window.removeEventListener('resize', herbegrens)
  gsap.killTweensOf(camera)
})
</script>

<template>
  <div
    ref="viewport"
    class="stadkaart"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @pointerleave="onPointerLeave"
    @wheel.prevent="onWheel"
    @click.capture="onClickCapture"
  >
    <div ref="wereld" class="stadkaart__wereld" :style="[wereldStijl, tegenStijl]">
      <img :src="afbeelding" alt="Kaart van Utrecht" class="stadkaart__beeld" draggable="false">

      <svg class="stadkaart__route" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
        <path :d="routePad" class="stadkaart__route-schaduw" />
        <path :d="routePad" class="stadkaart__route-lijn" />
      </svg>

      <div class="stadkaart__laag stadkaart__laag--pins">
        <slot />
      </div>

      <div class="stadkaart__laag stadkaart__laag--wolken" aria-hidden="true">
        <span class="stadkaart__wolk" style="--x: 12%; --y: 6%; --s: 1.1; --d: 70s" />
        <span class="stadkaart__wolk" style="--x: 58%; --y: 2%; --s: 0.8; --d: 90s" />
        <span class="stadkaart__wolk" style="--x: 82%; --y: 22%; --s: 1; --d: 80s" />
        <span class="stadkaart__wolk" style="--x: 30%; --y: 88%; --s: 1.3; --d: 110s" />
      </div>
    </div>

    <!-- Lichte waas aan de randen, zoals in een tilt-shift-foto. -->
    <div class="stadkaart__waas" aria-hidden="true" />
  </div>
</template>

<style scoped>
.stadkaart {
  position: absolute;
  inset: 0;
  overflow: hidden;
  perspective: 1800px;
  background: radial-gradient(ellipse at 50% 40%, #b9d3dc 0%, #8fb4c2 60%, #7aa3b3 100%);
  touch-action: none;
  cursor: grab;
  user-select: none;
}

.stadkaart:active {
  cursor: grabbing;
}

.stadkaart__wereld {
  position: absolute;
  left: 50%;
  top: 50%;
  /* Groot genoeg om het scherm altijd te vullen, met marge om in te pannen. */
  width: max(115vw, calc(115vh * 1610 / 977));
  aspect-ratio: 1610 / 977;
  margin-left: calc(max(115vw, calc(115vh * 1610 / 977)) / -2);
  margin-top: calc(max(115vw, calc(115vh * 1610 / 977)) * 977 / 1610 / -2);
  transform-style: preserve-3d;
  will-change: transform;
}

.stadkaart__beeld {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.stadkaart__route {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
  transform: translateZ(2px);
}

.stadkaart__route-schaduw,
.stadkaart__route-lijn {
  fill: none;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
}

.stadkaart__route-schaduw {
  stroke: rgb(0 0 0 / 0.18);
  stroke-width: 7;
}

.stadkaart__route-lijn {
  stroke: #fff;
  stroke-width: 3.5;
  stroke-dasharray: 14 12;
  animation: stadkaart-mier 2.4s linear infinite;
}

@keyframes stadkaart-mier {
  to { stroke-dashoffset: -26; }
}

.stadkaart__laag {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  pointer-events: none;
}

.stadkaart__laag--pins {
  transform: translateZ(40px);
}

.stadkaart__laag--wolken {
  transform: translateZ(180px);
}

.stadkaart__wolk {
  position: absolute;
  left: var(--x);
  top: var(--y);
  width: calc(16rem * var(--s));
  height: calc(6rem * var(--s));
  border-radius: 50%;
  background: radial-gradient(ellipse at 50% 60%, rgb(255 255 255 / 0.95) 0%, rgb(255 255 255 / 0.7) 40%, transparent 70%);
  filter: blur(6px);
  animation: stadkaart-drijf var(--d) ease-in-out infinite alternate;
}

@keyframes stadkaart-drijf {
  from { translate: -4% 0; }
  to { translate: 18% 2%; }
}

.stadkaart__waas {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(to bottom, rgb(220 232 236 / 0.55), transparent 18%, transparent 85%, rgb(220 232 236 / 0.4)),
    radial-gradient(ellipse at 50% 50%, transparent 55%, rgb(40 60 70 / 0.18) 100%);
}

@media (prefers-reduced-motion: reduce) {
  .stadkaart__route-lijn,
  .stadkaart__wolk {
    animation: none;
  }
}
</style>
