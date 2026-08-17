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
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })
    if (signInError) throw signInError
    await navigateTo('/')
  } catch (err: any) {
    error.value = err?.message || 'Er ging iets mis.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center p-4">
    <UCard class="w-full max-w-sm">
      <template #header>
        <h1 class="text-lg font-semibold">Inloggen bij Stuurhut</h1>
      </template>

      <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
        <UFormField label="E-mail">
          <UInput v-model="email" type="email" required autofocus class="w-full" />
        </UFormField>
        <UFormField label="Wachtwoord">
          <UInput v-model="password" type="password" required class="w-full" />
        </UFormField>

        <UAlert v-if="error" color="error" variant="soft" :title="error" />

        <UButton type="submit" block :loading="loading">Inloggen</UButton>
      </form>
    </UCard>
  </div>
</template>
