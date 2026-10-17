<script setup lang="ts">
const user = useSupabaseUser()
const route = useRoute()
</script>

<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <AppMenu v-if="user" />
    <template v-if="user">
      <SnelMenu />
      <TrajectNieuwModal />
    </template>
    <!-- Op de kaart zit de focus-timer in de "Focus Mode"-knop zelf. -->
    <FocusTimer v-if="user && route.meta.layout !== 'kaart'" />
  </UApp>
</template>
