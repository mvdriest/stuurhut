<script setup lang="ts">
// Eén kaart voor inloggen en instellen.
const props = defineProps<{ mode: 'login' | 'setup' }>()
const supabase = useSupabaseClient()
const email = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  error.value = ''
  busy.value = true
  try {
    if (props.mode === 'setup') {
      await $fetch('/api/auth/setup', { method: 'POST', body: { email: email.value, password: password.value } })
    }
    const { error: e } = await supabase.auth.signInWithPassword({ email: email.value, password: password.value })
    if (e) throw e
    await navigateTo('/')
  }
  catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }, message?: string }
    error.value = err?.data?.statusMessage || (err?.message === 'Invalid login credentials' ? 'Dit e-mailadres en wachtwoord kloppen niet.' : err?.message) || 'Er ging iets mis.'
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="grid min-h-dvh place-items-center px-4 py-10">
    <form class="card w-full max-w-sm space-y-5 p-6" @submit.prevent="submit">
      <div class="flex items-center gap-3">
        <AppMark :size="40" />
        <span class="text-[19px]">{{ APP_NAME }}</span>
      </div>
      <div>
        <h1 class="text-[26px] leading-tight">{{ mode === 'setup' ? 'Instellen' : 'Welkom terug' }}</h1>
        <p v-if="mode === 'setup'" class="mt-1 text-[14px] text-muted">Maak je account aan. Er is er maar één: deze Stuurhut is van jou.</p>
      </div>
      <label class="field"><span class="field-label">E-mail</span><input v-model="email" class="field-input" type="email" autocomplete="email" required autofocus></label>
      <label class="field">
        <span class="field-label">Wachtwoord<template v-if="mode === 'setup'"> (minstens 8 tekens)</template></span>
        <input v-model="password" class="field-input" type="password" :autocomplete="mode === 'setup' ? 'new-password' : 'current-password'" :minlength="mode === 'setup' ? 8 : undefined" required>
      </label>
      <p v-if="error" class="rounded-[12px] bg-surface-2 px-3.5 py-2.5 text-[14px] text-copper" role="alert">{{ error }}</p>
      <button type="submit" class="btn-primary w-full" :disabled="busy">
        {{ busy ? 'Even wachten…' : mode === 'setup' ? 'Account aanmaken' : 'Inloggen' }}
      </button>
    </form>
  </div>
</template>
