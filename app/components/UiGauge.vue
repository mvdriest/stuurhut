<script setup lang="ts">
// Halve-cirkel-gauge. De vulling draait open via een geroteerde clip (alleen transform).
import { gsap } from 'gsap'

const props = withDefaults(defineProps<{ value: number, tone?: 'copper' | 'sea' | 'green', label?: string, track?: string }>(), { tone: 'copper' })
const id = useId()
const v = computed(() => Math.max(0, Math.min(1, props.value)))
const color = computed(() => `var(--${props.tone})`)
// Rotatie als SVG-transform; GSAP tweent alleen het getal.
const deg = ref(prefersReduced() ? v.value * 180 : 0)
const obj = { d: deg.value }
let tw: gsap.core.Tween | null = null
function draw() {
  const to = v.value * 180
  tw?.kill()
  if (prefersReduced()) { deg.value = to; return }
  tw = gsap.to(obj, { d: to, duration: 0.6, ease: 'power2.out', onUpdate: () => { deg.value = obj.d } })
}
onMounted(draw)
watch(v, draw)
onBeforeUnmount(() => tw?.kill())
const rot = computed(() => `rotate(${deg.value} 100 100)`)
</script>

<template>
  <div class="relative w-full">
    <svg viewBox="0 0 200 112" class="w-full overflow-visible" role="img" :aria-label="label ?? `${Math.round(v * 100)} procent`">
      <defs>
        <clipPath :id="`g-${id}`">
          <rect x="-20" y="100" width="240" height="140" :transform="rot" />
        </clipPath>
      </defs>
      <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" :stroke="track ?? 'var(--surface-3)'" stroke-width="18" stroke-linecap="round" />
      <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" :stroke="color" stroke-width="18" :clip-path="`url(#g-${id})`" />
      <circle cx="20" cy="100" r="9" :fill="color" :opacity="v > 0.01 ? 1 : 0" />
      <g :transform="rot">
        <circle cx="20" cy="100" r="13" fill="var(--surface)" :stroke="color" stroke-width="4" />
      </g>
    </svg>
    <div class="absolute inset-x-0 bottom-0 flex flex-col items-center text-center">
      <slot />
    </div>
  </div>
</template>
