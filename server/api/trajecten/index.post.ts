import { z } from 'zod'
import { TRAJECT_KLEUREN } from '~/utils/kleuren'

const bodySchema = z.object({
  naam: z.string().min(1),
  status: z.enum(['actief', 'wachtend', 'on_hold']).default('actief'),
  eerstvolgendeActie: z.string().optional(),
  kleur: z.enum(TRAJECT_KLEUREN).default('grijs'),
  doelId: z.string().uuid().nullable().optional()
})

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireSupabaseUser(event)
  const { naam, status, eerstvolgendeActie, kleur, doelId } = await readValidatedBody(event, bodySchema.parse)

  const { data, error } = await supabase
    .from('trajecten')
    .insert({
      user_id: user.id,
      naam,
      status,
      eerstvolgende_actie: eerstvolgendeActie,
      kleur,
      doel_id: doelId ?? null
    })
    .select(TRAJECTEN_SELECT)
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
