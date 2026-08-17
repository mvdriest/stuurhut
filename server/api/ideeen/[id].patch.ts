import { z } from 'zod'

const bodySchema = z.object({
  titel: z.string().min(1).optional(),
  inhoud: z.string().nullable().optional(),
  trajectId: z.string().uuid().nullable().optional()
})

export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)
  const id = getRouterParam(event, 'id')
  const updates = await readValidatedBody(event, bodySchema.parse)

  const { data, error } = await supabase
    .from('ideeen')
    .update({
      titel: updates.titel,
      inhoud: updates.inhoud,
      traject_id: updates.trajectId,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select(IDEEEN_SELECT)
    .single()

  if (error || !data) throw createError({ statusCode: 404, statusMessage: 'Idee niet gevonden.' })
  return data
})
