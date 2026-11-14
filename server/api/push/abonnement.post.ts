// Dit toestel aanmelden voor pushmeldingen (of afmelden met { uit: true }).
import { createHash } from 'node:crypto'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database, Json } from '../../../app/types/database.types'

export default defineEventHandler(async (event) => {
  const { user } = await requireSupabaseUser(event)
  const body = await readBody<{ sub?: { endpoint?: string, keys?: { p256dh?: string, auth?: string } }, uit?: boolean }>(event)
  const endpoint = body?.sub?.endpoint
  if (!endpoint || !/^https:\/\//.test(endpoint)) throw createError({ statusCode: 400, statusMessage: 'Geen geldig abonnement.' })
  const id = createHash('sha1').update(endpoint).digest('hex')
  const admin = serverSupabaseServiceRole<Database>(event)
  if (body.uit) {
    await admin.from('v2_items').delete().eq('user_id', user.id).eq('collection', 'push').eq('item_id', id)
    return { ok: true }
  }
  if (!body.sub?.keys?.p256dh || !body.sub.keys.auth) throw createError({ statusCode: 400, statusMessage: 'Sleutels van het abonnement ontbreken.' })
  const at = new Date().toISOString()
  const data = { sub: body.sub, toestel: (getHeader(event, 'user-agent') ?? '').slice(0, 200), at }
  const { error } = await admin.from('v2_items').upsert({ user_id: user.id, collection: 'push', item_id: id, data: data as Json, updated_at: at })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true }
})
