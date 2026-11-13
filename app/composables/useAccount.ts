// Inloggen, uitloggen en wisselen tussen je eigen data en de demo.
export function useAccount() {
  const { mode, reset } = useStore()
  const sync = useSync()
  const supabase = useSupabaseClient()
  const toast = useToast()

  function toggleDemo() {
    mode.value = mode.value === 'demo' ? 'echt' : 'demo'
    toast.push({ text: mode.value === 'demo' ? 'Je kijkt nu naar testdata. Niets hiervan wordt bewaard.' : 'Terug bij je eigen data.' })
    navigateTo('/')
  }

  function resetDemo() {
    if (window.confirm('Testdata terugzetten? Wat je in de demo hebt aangepast verdwijnt.')) {
      reset()
      toast.push({ text: 'Testdata staat weer klaar.' })
      navigateTo('/')
    }
  }

  async function logout() {
    await supabase.auth.signOut()
    sync.stop()
    await navigateTo('/login')
  }

  return { mode, toggleDemo, resetDemo, logout }
}
