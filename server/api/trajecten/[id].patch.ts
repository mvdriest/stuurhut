import { z } from 'zod'
import { TRAJECT_KLEUREN } from '~/utils/kleuren'

const bodySchema = z.object({
  naam: z.string().min(1).optional(),
  status: z.enum(['actief', 'wachtend', 'on_hold']).optional(),
  eerstvolgendeActie: z.string().nullable().optional(),
  kleur: z.enum(TRAJECT_KLEUREN).optional(),
  doelId: z.string().uuid().nullable().optional()
})

export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)
  const id = getRouterParam(event, 'id')
  const updates = await readValidatedBody(event, bodySchema.parse)

  const { data, error } = await supabase
    .from('trajecten')
    .update({
      naam: updates.naam,
      status: updates.status,
      eerstvolgende_actie: updates.eerstvolgendeActie,
      kleur: updates.kleur,
      doel_id: updates.doelId,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select(TRAJECTEN_SELECT)
    .single()

  if (error || !data) throw createError({ statusCode: 404, statusMessage: 'Traject niet gevonden.' })
  return data
})
