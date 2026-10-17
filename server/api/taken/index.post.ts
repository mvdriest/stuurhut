import { z } from 'zod'

const bodySchema = z.object({
  trajectId: z.string().uuid().nullable().default(null),
  tekst: z.string().min(1),
  geschatteDuur: z.number().int().positive().default(30),
  halteId: z.string().uuid().nullable().default(null)
})

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireSupabaseUser(event)
  const { trajectId, tekst, geschatteDuur, halteId } = await readValidatedBody(event, bodySchema.parse)

  if (trajectId !== null) {
    const { data: traject } = await supabase.from('trajecten').select('id').eq('id', trajectId).single()
    if (!traject) {
      throw createError({ statusCode: 404, statusMessage: 'Traject niet gevonden.' })
    }
  }

  const { data, error } = await supabase
    .from('subtaken')
    .insert({ user_id: user.id, traject_id: trajectId, tekst, geschatte_duur: geschatteDuur, halte_id: halteId })
    .select(SUBTAKEN_SELECT)
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
