import type { H3Event } from 'h3'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export async function requireSupabaseUser(event: H3Event) {
  const supabase = await serverSupabaseClient(event)
  const claims = await serverSupabaseUser(event)

  if (!claims) {
    throw createError({ statusCode: 401, statusMessage: 'Niet ingelogd.' })
  }

  return { user: { id: claims.sub, email: claims.email }, supabase }
}
