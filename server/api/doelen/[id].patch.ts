import { z } from 'zod'

const bodySchema = z.object({
  titel: z.string().min(1).optional(),
  omschrijving: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  status: z.enum(['actief', 'afgerond']).optional(),
  volgorde: z.number().optional()
})

export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)
  const id = getRouterParam(event, 'id')
  const updates = await readValidatedBody(event, bodySchema.parse)

  const { data, error } = await supabase
    .from('doelen')
    .update({
      titel: updates.titel,
      omschrijving: updates.omschrijving,
      deadline: updates.deadline,
      status: updates.status,
      volgorde: updates.volgorde,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select(DOELEN_SELECT)
    .single()

  if (error || !data) throw createError({ statusCode: 404, statusMessage: 'Doel niet gevonden.' })
  return data
})
