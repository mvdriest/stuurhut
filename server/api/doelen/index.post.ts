import { z } from 'zod'

const bodySchema = z.object({
  titel: z.string().min(1),
  omschrijving: z.string().optional(),
  deadline: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireSupabaseUser(event)
  const { titel, omschrijving, deadline } = await readValidatedBody(event, bodySchema.parse)

  const { data, error } = await supabase
    .from('doelen')
    .insert({ user_id: user.id, titel, omschrijving, deadline })
    .select(DOELEN_SELECT)
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ...data, mijlpalen: [] }
})
