// Componenten roepen $fetch aan zonder try/catch. Zo'n afgewezen promise komt via
// twee routes boven: Vue's 'vue:error' (gewone @click/@submit-handlers) of als
// 'unhandledrejection' (o.a. UButton's eigen onClick-wrapper slikt hem niet door
// naar Vue). Op beide maken we een zichtbare melding, in plaats van een knop die
// stil "niets doet".
export default defineNuxtPlugin((nuxtApp) => {
  const toast = useToast()

  function toon(error: unknown) {
    toast.add({
      title: 'Er ging iets mis',
      description: foutTekst(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  }

  nuxtApp.hook('vue:error', toon)

  window.addEventListener('unhandledrejection', (event) => {
    // Alleen API-fouten; andere afgewezen promises (bijv. van libraries) laten we met rust.
    if ((event.reason as { name?: string })?.name !== 'FetchError') return
    event.preventDefault()
    toon(event.reason)
  })
})

interface ApiFout {
  statusMessage?: string
  data?: { statusMessage?: string, message?: string }
}

function foutTekst(error: unknown) {
  const api = error as ApiFout
  const serverTekst = api?.data?.statusMessage ?? api?.data?.message ?? api?.statusMessage
  if (serverTekst) return serverTekst
  if (error instanceof Error) return error.message
  return 'Onbekende fout.'
}
