<script setup lang="ts">
const supabase = useSupabaseClient()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/setup', {
      method: 'POST',
      body: { email: email.value, password: password.value }
    })
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })
    if (signInError) throw signInError
    await navigateTo('/')
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'Er ging iets mis.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center p-4">
    <UCard class="w-full max-w-sm">
      <template #header>
        <h1 class="text-lg font-semibold">Stuurhut instellen</h1>
        <p class="text-sm text-muted">Maak je enige account aan om te beginnen.</p>
      </template>

      <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
        <UFormField label="E-mail">
          <UInput v-model="email" type="email" required autofocus class="w-full" />
        </UFormField>
        <UFormField label="Wachtwoord" description="Minimaal 8 tekens">
          <UInput v-model="password" type="password" required minlength="8" class="w-full" />
        </UFormField>

        <UAlert v-if="error" color="error" variant="soft" :title="error" />

        <UButton type="submit" block :loading="loading">Account aanmaken</UButton>
      </form>
    </UCard>
  </div>
</template>
