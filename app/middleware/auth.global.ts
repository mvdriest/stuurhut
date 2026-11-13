// Wie niet is ingelogd, gaat naar /login (of /setup als er nog geen account is).
// De demo met testdata werkt alleen als je bent ingelogd: zo staat er nooit iets open.
export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser()
  const open = to.path === '/login' || to.path === '/setup'

  if (user.value) {
    if (open) return navigateTo('/')
    return
  }

  const { setupDone } = await $fetch<{ setupDone: boolean }>('/api/auth/status')
  if (!setupDone) return to.path === '/setup' ? undefined : navigateTo('/setup')
  if (to.path !== '/login') return navigateTo('/login')
})
