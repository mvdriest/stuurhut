<script setup lang="ts">
defineProps<{
  /** Tabbladen; `key` is de waarde die via v-model gezet wordt. */
  secties: { key: string, label: string }[]
  color: string
  textColor?: string
}>()

const model = defineModel<string>({ required: true })
</script>

<template>
  <div
    class="sectie-tabs"
    :style="{ '--tab-kleur': color, '--tab-tekst': textColor ?? '#ffffff' }"
  >
    <button
      v-for="sectie in secties"
      :key="sectie.key"
      type="button"
      class="sectie-tabs__tab"
      :class="{ 'sectie-tabs__tab--actief': model === sectie.key }"
      @click="model = sectie.key"
    >
      {{ sectie.label }}
    </button>
  </div>
</template>

<style scoped>
/* Zelfde tab-silhouet als FolderTab, maar horizontaal naast elkaar en zonder balk. */
.sectie-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.sectie-tabs__tab {
  padding: 0.9rem 1.75rem;
  border-radius: 1rem 1rem 0 0;
  background-color: var(--tab-kleur);
  color: var(--tab-tekst);
  font-family: var(--font-display);
  text-transform: uppercase;
  font-size: clamp(1rem, 1.4vw, 1.5rem);
  line-height: 1;
  letter-spacing: -0.01em;
  opacity: 0.5;
  transition: opacity 150ms ease-out, transform 150ms ease-out;
}

.sectie-tabs__tab:hover {
  opacity: 0.8;
}

.sectie-tabs__tab--actief {
  opacity: 1;
  transform: translateY(-2px);
}
</style>
