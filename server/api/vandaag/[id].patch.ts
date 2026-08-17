import { z } from 'zod'

const bodySchema = z.object({
  tekst: z.string().min(1).optional(),
  klaar: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)
  const id = getRouterParam(event, 'id')
  const updates = await readValidatedBody(event, bodySchema.parse)

  const { data, error } = await supabase
    .from('vandaag_prioriteiten')
    .update({ tekst: updates.tekst, klaar: updates.klaar })
    .eq('id', id)
    .select(VANDAAG_SELECT)
    .single()

  if (error || !data) throw createError({ statusCode: 404, statusMessage: 'Prioriteit niet gevonden.' })
  return data
})
