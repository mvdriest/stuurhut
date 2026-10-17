import { z } from 'zod'

const bodySchema = z.object({
  kind: z.string().min(1),
  naam: z.string().min(1),
  // Alleen http(s): de url wordt als <a href> gerenderd, een javascript:-url zou daar uitgevoerd worden.
  url: z.string().url().refine(u => /^https?:\/\//i.test(u), 'Alleen http(s)-links.').optional()
})

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireSupabaseUser(event)
  const trajectId = requireRouterParam(event, 'id')
  const { kind, naam, url } = await readValidatedBody(event, bodySchema.parse)

  const { data, error } = await supabase
    .from('traject_bestanden')
    .insert({ user_id: user.id, traject_id: trajectId, kind, naam, url })
    .select(TRAJECT_BESTANDEN_SELECT)
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
