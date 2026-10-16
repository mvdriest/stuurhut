<script setup lang="ts">
const user = useSupabaseUser()
</script>

<template>
  <div class="stuurhut-layout" :class="{ 'stuurhut-layout--ingelogd': user }">
    <AppSidebar v-if="user" />
    <main class="stuurhut-layout__main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.stuurhut-layout {
  display: flex;
  align-items: flex-start;
  min-height: 100vh;
  background-color: var(--color-stuurhut-cream);
  color: var(--color-stuurhut-ink);
}

.stuurhut-layout__main {
  flex: 1;
  min-width: 0;
}

.stuurhut-layout--ingelogd .stuurhut-layout__main {
  min-height: 100vh;
}
</style>
