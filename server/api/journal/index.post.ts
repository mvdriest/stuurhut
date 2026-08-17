import { z } from 'zod'

const bodySchema = z.object({
  inhoud: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireSupabaseUser(event)
  const { inhoud } = await readValidatedBody(event, bodySchema.parse)

  const { data, error } = await supabase
    .from('journal_entries')
    .insert({ user_id: user.id, inhoud })
    .select(JOURNAL_SELECT)
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
