export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser()

  if (user.value) {
    if (to.path === '/login' || to.path === '/setup') {
      return navigateTo('/')
    }
    return
  }

  const { setupDone } = await $fetch('/api/auth/status')

  if (!setupDone) {
    if (to.path !== '/setup') return navigateTo('/setup')
    return
  }

  if (to.path !== '/login') return navigateTo('/login')
})
