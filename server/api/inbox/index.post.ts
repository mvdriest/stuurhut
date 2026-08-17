import { z } from 'zod'

const bodySchema = z.object({
  tekst: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireSupabaseUser(event)
  const { tekst } = await readValidatedBody(event, bodySchema.parse)

  const { data, error } = await supabase
    .from('inbox_items')
    .insert({ user_id: user.id, tekst })
    .select(INBOX_SELECT)
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
