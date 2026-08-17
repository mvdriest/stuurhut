<script setup lang="ts">
const user = useSupabaseUser()
</script>

<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <NuxtPage />
    <FocusTimer v-if="user" />
  </UApp>
</template>
