<script setup lang="ts">
const user = useSupabaseUser()
</script>

<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <FocusTimer v-if="user" />
  </UApp>
</template>
