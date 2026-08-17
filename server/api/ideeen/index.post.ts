import { z } from 'zod'

const bodySchema = z.object({
  titel: z.string().min(1),
  inhoud: z.string().optional(),
  trajectId: z.string().uuid().nullable().optional()
})

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireSupabaseUser(event)
  const { titel, inhoud, trajectId } = await readValidatedBody(event, bodySchema.parse)

  if (trajectId != null) {
    const { data: traject } = await supabase.from('trajecten').select('id').eq('id', trajectId).single()
    if (!traject) {
      throw createError({ statusCode: 404, statusMessage: 'Traject niet gevonden.' })
    }
  }

  const { data, error } = await supabase
    .from('ideeen')
    .insert({ user_id: user.id, titel, inhoud, traject_id: trajectId ?? null })
    .select(IDEEEN_SELECT)
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
