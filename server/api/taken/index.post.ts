import { z } from 'zod'

const bodySchema = z.object({
  trajectId: z.string().uuid(),
  tekst: z.string().min(1),
  geschatteDuur: z.number().int().positive().default(30)
})

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireSupabaseUser(event)
  const { trajectId, tekst, geschatteDuur } = await readValidatedBody(event, bodySchema.parse)

  const { data: traject } = await supabase.from('trajecten').select('id').eq('id', trajectId).single()
  if (!traject) {
    throw createError({ statusCode: 404, statusMessage: 'Traject niet gevonden.' })
  }

  const { data, error } = await supabase
    .from('subtaken')
    .insert({ user_id: user.id, traject_id: trajectId, tekst, geschatte_duur: geschatteDuur })
    .select(SUBTAKEN_SELECT)
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
