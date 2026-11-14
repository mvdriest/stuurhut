// Een proefmelding naar al je toestellen.
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '../../../app/types/database.types'

export default defineEventHandler(async (event) => {
  const { user } = await requireSupabaseUser(event)
  const admin = serverSupabaseServiceRole<Database>(event)
  return verstuur(admin, user.id, { title: 'Stuurhut', body: 'Meldingen staan aan. Zo ziet een seintje eruit.', url: '/', tag: 'test' })
})
