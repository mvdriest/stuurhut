<script setup lang="ts">
const supabase = useSupabaseClient()

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/trajecten', label: 'Trajecten' },
  { to: '/agenda', label: 'Agenda' },
  { to: '/journal', label: 'Journal' },
  { to: '/ideeen', label: 'Ideeën' }
]

async function logout() {
  await supabase.auth.signOut()
  await navigateTo('/login')
}
</script>

<template>
  <nav class="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
    <NuxtLink
      v-for="link in links"
      :key="link.to"
      :to="link.to"
      class="stuurhut-navpil"
    >
      {{ link.label }}
    </NuxtLink>
    <button type="button" class="stuurhut-navpil" @click="logout">
      Uitloggen
    </button>
  </nav>
</template>

<style scoped>
.stuurhut-navpil {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background-color: #fff;
  color: var(--color-stuurhut-ink);
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.01em;
  font-size: clamp(0.8125rem, 1.15vw, 1.375rem);
  line-height: 1;
  padding: 0.85em 1.25em;
  white-space: nowrap;
  transition: transform 150ms ease-out, box-shadow 150ms ease-out;
}

.stuurhut-navpil:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgb(0 0 0 / 0.25);
}
</style>
