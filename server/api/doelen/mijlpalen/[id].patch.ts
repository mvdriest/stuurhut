import { z } from 'zod'

const bodySchema = z.object({
  titel: z.string().min(1).optional(),
  beloning: z.string().nullable().optional(),
  afgerond: z.boolean().optional(),
  volgorde: z.number().optional()
})

export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)
  const id = getRouterParam(event, 'id')
  const updates = await readValidatedBody(event, bodySchema.parse)

  const { data, error } = await supabase
    .from('doel_mijlpalen')
    .update({
      titel: updates.titel,
      beloning: updates.beloning,
      afgerond: updates.afgerond,
      volgorde: updates.volgorde,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select(DOEL_MIJLPALEN_SELECT)
    .single()

  if (error || !data) throw createError({ statusCode: 404, statusMessage: 'Mijlpaal niet gevonden.' })
  return data
})
