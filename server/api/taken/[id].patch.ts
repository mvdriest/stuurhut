import { z } from 'zod'

const bodySchema = z.object({
  tekst: z.string().min(1).optional(),
  status: z.enum(['to_do', 'bezig', 'review', 'klaar']).optional(),
  geschatteDuur: z.number().int().positive().optional(),
  volgorde: z.number().int().optional(),
  halteId: z.string().uuid().nullable().optional()
})

export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)
  const id = requireRouterParam(event, 'id')
  const updates = await readValidatedBody(event, bodySchema.parse)

  const { data, error } = await supabase
    .from('subtaken')
    .update({
      tekst: updates.tekst,
      status: updates.status,
      geschatte_duur: updates.geschatteDuur,
      volgorde: updates.volgorde,
      halte_id: updates.halteId,
      // Bijhouden wanneer een taak klaar is, zodat het Vandaag-bord alleen
      // vandaag afgeronde taken in "Ready" toont.
      klaar_op: updates.status === undefined ? undefined : (updates.status === 'klaar' ? new Date().toISOString() : null)
    })
    .eq('id', id)
    .select(SUBTAKEN_SELECT)
    .single()

  if (error || !data) throw createError({ statusCode: 404, statusMessage: 'Taak niet gevonden.' })
  return data
})
