import { z } from 'zod'

const bodySchema = z.object({
  titel: z.string().min(1).optional(),
  dienst: z.enum(['algemeen', 'branding', 'website', 'video', 'foto']).optional(),
  fase: z.enum(['verkennen', 'uitvoeren', 'afronden']).optional(),
  icoon: z.string().regex(/^i-lucide-[a-z0-9-]+$/).optional(),
  streefdatum: z.string().regex(DATUM_REGEX).nullable().or(z.literal('').transform(() => null)).optional(),
  afgerond: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)
  const id = requireRouterParam(event, 'id')
  const body = await readValidatedBody(event, bodySchema.parse)

  const { data, error } = await supabase
    .from('traject_haltes')
    .update({
      titel: body.titel,
      dienst: body.dienst,
      fase: body.fase,
      icoon: body.icoon,
      streefdatum: body.streefdatum,
      afgerond_op: body.afgerond === undefined ? undefined : (body.afgerond ? new Date().toISOString() : null)
    })
    .eq('id', id)
    .select(TRAJECT_HALTES_SELECT)
    .single()

  if (error || !data) throw createError({ statusCode: 404, statusMessage: 'Halte niet gevonden.' })

  // Een halte bereiken is beweging in het traject: telt mee voor "laatst bijgewerkt".
  if (body.afgerond !== undefined) {
    await supabase.from('trajecten').update({ updated_at: new Date().toISOString() }).eq('id', data.trajectId)
  }
  return data
})
