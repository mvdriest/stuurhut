<script setup lang="ts">
// Kleine lijngrafiek met zachte vulling.
import { gsap } from 'gsap'

const props = withDefaults(defineProps<{ values: number[], tone?: 'copper' | 'sea' | 'green', min?: number, max?: number, height?: number, labels?: string[] }>(), { tone: 'sea', height: 72 })
const id = useId()
const W = 240
const pts = computed(() => {
  const lo = props.min ?? Math.min(...props.values)
  const hi = props.max ?? Math.max(...props.values)
  const span = hi - lo || 1
  const step = W / (props.values.length - 1)
  return props.values.map((v, i) => [i * step, 6 + (1 - (v - lo) / span) * (props.height - 12)] as const)
})
const line = computed(() => {
  const p = pts.value
  let d = `M ${p[0]![0]} ${p[0]![1]}`
  for (let i = 1; i < p.length; i++) {
    const [x0, y0] = p[i - 1]!
    const [x1, y1] = p[i]!
    const cx = (x0 + x1) / 2
    d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`
  }
  return d
})
const area = computed(() => `${line.value} L ${W} ${props.height} L 0 ${props.height} Z`)
const g = ref<SVGGElement | null>(null)
onMounted(() => {
  if (prefersReduced() || !g.value) return
  gsap.from(g.value, { opacity: 0, y: 6, duration: 0.5, ease: 'power2.out', delay: 0.1, clearProps: 'all' })
})
</script>

<template>
  <svg :viewBox="`0 0 ${W} ${height}`" preserveAspectRatio="none" class="block w-full overflow-visible" :style="{ height: `${height}px` }" aria-hidden="true">
    <defs>
      <linearGradient :id="`s-${id}`" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" :stop-color="`var(--${tone})`" stop-opacity="0.28" />
        <stop offset="1" :stop-color="`var(--${tone})`" stop-opacity="0" />
      </linearGradient>
    </defs>
    <g ref="g">
      <path :d="area" :fill="`url(#s-${id})`" />
      <path :d="line" fill="none" :stroke="`var(--${tone})`" stroke-width="2.25" stroke-linecap="round" vector-effect="non-scaling-stroke" />
    </g>
  </svg>
</template>
