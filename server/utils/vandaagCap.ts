import type { SupabaseClient } from '@supabase/supabase-js'

export const MAX_PER_DAG = 3

export async function telVandaagPrioriteiten(supabase: SupabaseClient, userId: string, datum: string) {
  const { data, error } = await supabase
    .from('vandaag_prioriteiten')
    .select('id')
    .eq('user_id', userId)
    .eq('datum', datum)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return data.length
}
