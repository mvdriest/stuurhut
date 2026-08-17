import { z } from 'zod'

const bodySchema = z.object({
  tekst: z.string().min(1).optional(),
  status: z.enum(['to_do', 'bezig', 'review', 'klaar']).optional(),
  geschatteDuur: z.number().int().positive().optional(),
  volgorde: z.number().int().optional()
})

export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)
  const id = getRouterParam(event, 'id')
  const updates = await readValidatedBody(event, bodySchema.parse)

  const { data, error } = await supabase
    .from('subtaken')
    .update({
      tekst: updates.tekst,
      status: updates.status,
      geschatte_duur: updates.geschatteDuur,
      volgorde: updates.volgorde
    })
    .eq('id', id)
    .select(SUBTAKEN_SELECT)
    .single()

  if (error || !data) throw createError({ statusCode: 404, statusMessage: 'Taak niet gevonden.' })
  return data
})
