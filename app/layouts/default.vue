<script setup lang="ts">
// Elke pagina staat in hetzelfde landschap als de kaart; de inhoud zweeft erboven
// in glazen kaarten. Het menu (AppMenu) zit globaal in app.vue.
const route = useRoute()
</script>

<template>
  <div class="stuurhut-layout">
    <Landschap :horizon="(route.meta.horizon as number | undefined) ?? 64" />
    <main class="stuurhut-layout__main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.stuurhut-layout {
  position: relative;
  min-height: 100vh;
  color: var(--color-stuurhut-ink);
}

.stuurhut-layout__main {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  padding-bottom: 7rem;
}
</style>
