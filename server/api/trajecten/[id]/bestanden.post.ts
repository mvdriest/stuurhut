import { z } from 'zod'

const bodySchema = z.object({
  kind: z.string().min(1),
  naam: z.string().min(1),
  url: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireSupabaseUser(event)
  const trajectId = getRouterParam(event, 'id')
  const { kind, naam, url } = await readValidatedBody(event, bodySchema.parse)

  const { data, error } = await supabase
    .from('traject_bestanden')
    .insert({ user_id: user.id, traject_id: trajectId, kind, naam, url })
    .select(TRAJECT_BESTANDEN_SELECT)
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
