import { z } from 'zod'

const bodySchema = z.object({
  tekst: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireSupabaseUser(event)
  const { tekst } = await readValidatedBody(event, bodySchema.parse)

  const datum = today()
  const aantal = await telVandaagPrioriteiten(supabase, user.id, datum)

  if (aantal >= MAX_PER_DAG) {
    throw createError({ statusCode: 400, statusMessage: `Je hebt al ${MAX_PER_DAG} prioriteiten voor vandaag.` })
  }

  const { data, error } = await supabase
    .from('vandaag_prioriteiten')
    .insert({ user_id: user.id, tekst, datum, volgorde: aantal })
    .select(VANDAAG_SELECT)
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
