import { z } from 'zod'

const bodySchema = z.object({
  type: z.enum(['werk', 'pauze']),
  duurMinuten: z.number().int().positive(),
  voltooid: z.boolean(),
  trajectId: z.string().uuid().nullable().optional(),
  subtaakId: z.string().uuid().nullable().optional()
})

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireSupabaseUser(event)
  const { type, duurMinuten, voltooid, trajectId, subtaakId } = await readValidatedBody(event, bodySchema.parse)

  const { data, error } = await supabase
    .from('focus_sessies')
    .insert({
      user_id: user.id,
      type,
      duur_minuten: duurMinuten,
      voltooid,
      traject_id: trajectId ?? null,
      subtaak_id: subtaakId ?? null
    })
    .select(FOCUS_SESSIES_SELECT)
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
