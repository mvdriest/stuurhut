// Pushmeldingen op dit toestel aan- of uitzetten.
// Op iPhone werkt dit alleen als Stuurhut via "Zet op beginscherm" is geïnstalleerd (iOS 16.4+).
type Status = 'laden' | 'aan' | 'uit' | 'geblokkeerd' | 'beginscherm' | 'niet'

const status = ref<Status>('laden')

function sleutel(b64: string) {
  const s = (b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(s), c => c.charCodeAt(0))
}

export function usePush() {
  const config = useRuntimeConfig()
  const toast = useToast()

  const kan = () => import.meta.client && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  const losseApp = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
  const iPhone = () => /iPhone|iPad|iPod/.test(navigator.userAgent)

  async function abonnement() {
    const reg = await navigator.serviceWorker.getRegistration()
    return reg ? reg.pushManager.getSubscription() : null
  }

  /** Huidige stand bepalen; een bestaand abonnement opnieuw doorgeven (voor als het op de server verdween). */
  async function vernieuw() {
    if (!import.meta.client) return
    if (!kan()) { status.value = iPhone() && !losseApp() ? 'beginscherm' : 'niet'; return }
    if (Notification.permission === 'denied') { status.value = 'geblokkeerd'; return }
    const sub = Notification.permission === 'granted' ? await abonnement() : null
    status.value = sub ? 'aan' : 'uit'
    if (sub) $fetch('/api/push/abonnement', { method: 'POST', body: { sub: sub.toJSON() } }).catch(() => {})
  }

  async function aanzetten() {
    if (status.value === 'beginscherm') {
      toast.push({ text: 'Zet Stuurhut eerst op je beginscherm: deel-knop → Zet op beginscherm. Open het daar en zet meldingen aan.' })
      return
    }
    if (!kan()) { toast.push({ text: 'Deze browser ondersteunt geen pushmeldingen.' }); return }
    const toestemming = await Notification.requestPermission()
    if (toestemming !== 'granted') {
      status.value = toestemming === 'denied' ? 'geblokkeerd' : 'uit'
      toast.push({ text: 'Zonder toestemming kan Stuurhut geen seintjes geven. Je kunt het later aanzetten in Instellingen → Meldingen.' })
      return
    }
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = (await reg.pushManager.getSubscription())
        ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: sleutel(config.public.vapidPublicKey as string) })
      await $fetch('/api/push/abonnement', { method: 'POST', body: { sub: sub.toJSON() } })
      status.value = 'aan'
      await $fetch('/api/push/test', { method: 'POST' })
      toast.push({ text: 'Meldingen staan aan. Je krijgt zo een proefmelding.' })
    }
    catch (e) {
      toast.push({ text: `Meldingen aanzetten lukte niet: ${e instanceof Error ? e.message : String(e)}` })
    }
  }

  async function uitzetten() {
    const sub = await abonnement()
    if (sub) {
      await $fetch('/api/push/abonnement', { method: 'POST', body: { sub: sub.toJSON(), uit: true } }).catch(() => {})
      await sub.unsubscribe()
    }
    status.value = 'uit'
    toast.push({ text: 'Meldingen staan uit op dit toestel.' })
  }

  const wissel = () => (status.value === 'aan' ? uitzetten() : aanzetten())
  const label = computed(() => ({ laden: 'Meldingen', aan: 'Meldingen staan aan', uit: 'Meldingen aanzetten', geblokkeerd: 'Meldingen geblokkeerd', beginscherm: 'Meldingen aanzetten', niet: 'Meldingen niet beschikbaar' })[status.value])

  return { status, label, vernieuw, wissel }
}
