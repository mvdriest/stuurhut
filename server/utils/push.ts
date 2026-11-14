// Pushmeldingen versturen naar alle toestellen waarop je ze hebt aangezet.
// Abonnementen staan in v2_items (collection 'push'); verlopen abonnementen ruimen we op.
import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/database.types'

export interface Melding { title: string, body: string, url?: string, tag?: string }

let klaar = false
function zetSleutels() {
  if (klaar) return
  const config = useRuntimeConfig()
  if (!config.vapidPrivateKey || !config.public.vapidPublicKey) {
    throw createError({ statusCode: 500, statusMessage: 'Pushsleutels ontbreken (NUXT_VAPID_PRIVATE_KEY).' })
  }
  webpush.setVapidDetails('https://stuurhut.vercel.app', config.public.vapidPublicKey, config.vapidPrivateKey)
  klaar = true
}

/** Stuur naar al je toestellen. Geeft terug hoeveel er aankwamen. */
export async function verstuur(admin: SupabaseClient<Database>, userId: string, m: Melding) {
  zetSleutels()
  const { data: rijen } = await admin.from('v2_items').select('item_id, data').eq('user_id', userId).eq('collection', 'push')
  let gelukt = 0
  for (const r of rijen ?? []) {
    const sub = (r.data as { sub?: webpush.PushSubscription }).sub
    if (!sub?.endpoint) continue
    try {
      await webpush.sendNotification(sub, JSON.stringify(m), { TTL: 60 * 60, urgency: 'normal' })
      gelukt++
    }
    catch (e) {
      const code = (e as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) {
        await admin.from('v2_items').delete().eq('user_id', userId).eq('collection', 'push').eq('item_id', r.item_id)
      }
      else {
        console.error('push mislukt', code, (e as Error).message)
      }
    }
  }
  return { gelukt, toestellen: rijen?.length ?? 0 }
}
