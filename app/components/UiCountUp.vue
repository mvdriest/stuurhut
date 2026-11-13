<script setup lang="ts">
import { gsap } from 'gsap'

const props = withDefaults(defineProps<{ value: number, format?: (n: number) => string, duration?: number }>(), { duration: 0.6 })
const fmt = (n: number) => (props.format ? props.format(n) : String(Math.round(n)))
const text = ref(fmt(prefersReduced() ? props.value : 0))
const obj = { v: 0 }
let tween: gsap.core.Tween | null = null

function run(to: number) {
  tween?.kill()
  if (prefersReduced()) { obj.v = to; text.value = fmt(to); return }
  tween = gsap.to(obj, { v: to, duration: props.duration, ease: 'power2.out', onUpdate: () => { text.value = fmt(obj.v) }, onComplete: () => { text.value = fmt(to) } })
}
onMounted(() => run(props.value))
watch(() => props.value, v => run(v))
onBeforeUnmount(() => tween?.kill())
</script>

<template>
  <span class="num">{{ text }}</span>
</template>
