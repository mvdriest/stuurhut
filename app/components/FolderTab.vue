<script setup lang="ts">
import { gsap } from 'gsap'
import { MOTION } from '~/utils/motion'

const props = defineProps<{
  color: string
  /** Tekstkleur op de balk — lichte trajectkleuren (geel) krijgen inkt in plaats van wit. */
  textColor?: string
  index: number
  expanded: boolean
}>()

const emit = defineEmits<{
  toggle: []
}>()

const slots = useSlots()
const hasDetail = computed(() => !!slots.detail)

const rootEl = ref<HTMLElement | null>(null)
const detailEl = ref<HTMLElement | null>(null)

onMounted(() => {
  if (!rootEl.value) return
  gsap.to(rootEl.value, {
    opacity: 1,
    y: 0,
    duration: MOTION.duration.enter,
    ease: MOTION.ease.enter,
    delay: props.index * MOTION.duration.stagger
  })
})

watch(() => props.expanded, (expanded) => {
  if (!hasDetail.value || !detailEl.value) return
  gsap.to(detailEl.value, {
    height: expanded ? 'auto' : 0,
    opacity: expanded ? 1 : 0,
    duration: MOTION.duration.expand,
    ease: MOTION.ease.expand
  })
})

function onTabClick(event: MouseEvent) {
  if ((event.target as HTMLElement).closest('button, a, input, textarea, select')) return
  emit('toggle')
}
</script>

<template>
  <article
    ref="rootEl"
    class="folder-tab"
    :style="{
      '--tab-kleur': color,
      '--tab-tekst': textColor ?? '#ffffff',
      zIndex: index + 1
    }"
  >
    <div class="folder-tab__tab" @click="onTabClick">
      <slot name="tab" />
    </div>

    <div class="folder-tab__strip" @click="onTabClick">
      <slot name="strip" />
    </div>

    <div v-if="hasDetail" ref="detailEl" class="folder-tab__detail" @click.stop>
      <div class="folder-tab__detail-inner">
        <slot name="detail" />
      </div>
    </div>
  </article>
</template>

<style scoped>
.folder-tab {
  --tab-h: 5.5rem;
  --tab-inset: 2.5rem;
  --tab-radius: 1.5rem;
  --tab-fillet: 2.5rem;

  position: relative;
  background-color: var(--tab-kleur);
  color: var(--tab-tekst);
  transition: filter 150ms ease-out;
  opacity: 0;
  transform: translateY(28px);
}

.folder-tab:hover {
  filter: brightness(1.06);
}

.folder-tab__tab {
  display: none;
}

/* De gekleurde balk zelf; de traject-naam zit in de tab erboven, dus de strip
   houdt zijn inhoud rechts — daar wordt hij niet door de volgende tab bedekt. */
.folder-tab__strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: var(--tab-h);
  padding: 0.75rem 1.5rem;
  cursor: pointer;
}

.folder-tab__detail {
  height: 0;
  opacity: 0;
  overflow: hidden;
  cursor: default;
}

.folder-tab__detail-inner {
  /* Onderaan ruimte vrijhouden: daar schuift de tab van de volgende rij overheen. */
  padding: 0 1.5rem var(--tab-h);
}

@media (min-width: 640px) {
  .folder-tab__tab {
    position: absolute;
    bottom: 100%;
    left: var(--tab-inset);
    width: min(26rem, 52%);
    height: var(--tab-h);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 1.25rem;
    background-color: var(--tab-kleur);
    border-radius: var(--tab-radius) var(--tab-radius) 0 0;
    cursor: pointer;
  }

  /* Holle overgangen van de tab naar de balk, links en rechts. */
  .folder-tab__tab::before,
  .folder-tab__tab::after {
    content: "";
    position: absolute;
    bottom: 0;
    width: var(--tab-fillet);
    height: var(--tab-fillet);
    background-color: var(--tab-kleur);
  }

  .folder-tab__tab::before {
    left: calc(-1 * var(--tab-fillet));
    -webkit-mask-image: radial-gradient(circle at 0 0, transparent var(--tab-fillet), #000 calc(var(--tab-fillet) + 0.5px));
    mask-image: radial-gradient(circle at 0 0, transparent var(--tab-fillet), #000 calc(var(--tab-fillet) + 0.5px));
  }

  .folder-tab__tab::after {
    right: calc(-1 * var(--tab-fillet));
    -webkit-mask-image: radial-gradient(circle at 100% 0, transparent var(--tab-fillet), #000 calc(var(--tab-fillet) + 0.5px));
    mask-image: radial-gradient(circle at 100% 0, transparent var(--tab-fillet), #000 calc(var(--tab-fillet) + 0.5px));
  }

  .folder-tab__strip {
    /* Links blijft leeg: daar ligt de tab van de volgende rij overheen. */
    padding-left: calc(var(--tab-inset) + min(26rem, 52%) + var(--tab-fillet));
    justify-content: flex-end;
  }

  .folder-tab__detail-inner {
    padding-left: var(--tab-inset);
    padding-right: 2.5rem;
  }
}
</style>
