import { z } from 'zod'

const bodySchema = z.object({
  titel: z.string().min(1),
  beloning: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireSupabaseUser(event)
  const doelId = getRouterParam(event, 'id')
  const { titel, beloning } = await readValidatedBody(event, bodySchema.parse)

  const { data: doel } = await supabase.from('doelen').select('id').eq('id', doelId).single()
  if (!doel) {
    throw createError({ statusCode: 404, statusMessage: 'Doel niet gevonden.' })
  }

  const { data, error } = await supabase
    .from('doel_mijlpalen')
    .insert({ user_id: user.id, doel_id: doelId, titel, beloning })
    .select(DOEL_MIJLPALEN_SELECT)
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
