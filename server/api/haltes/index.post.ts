import { z } from 'zod'

const bodySchema = z.object({
  trajectId: z.string().uuid(),
  titel: z.string().min(1),
  dienst: z.enum(['algemeen', 'branding', 'website', 'video', 'foto']).default('algemeen'),
  fase: z.enum(['verkennen', 'uitvoeren', 'afronden']).default('uitvoeren'),
  icoon: z.string().regex(/^i-lucide-[a-z0-9-]+$/).default('i-lucide-flag'),
  /** Invoegen direct na deze halte; zonder: vóór de afrondingsfase. */
  naHalteId: z.string().uuid().nullable().optional()
})

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireSupabaseUser(event)
  const body = await readValidatedBody(event, bodySchema.parse)

  const { data: bestaand, error } = await supabase
    .from('traject_haltes')
    .select('id, fase')
    .eq('traject_id', body.trajectId)
    .order('volgorde')
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  let positie: number
  if (body.naHalteId) {
    const i = bestaand.findIndex(h => h.id === body.naHalteId)
    positie = i === -1 ? bestaand.length : i + 1
  } else {
    const eind = bestaand.findIndex(h => h.fase === 'afronden')
    positie = eind === -1 ? bestaand.length : eind
  }

  await voegIn(supabase, user.id, body.trajectId, [{ titel: body.titel, dienst: body.dienst, fase: body.fase, icoon: body.icoon }], bestaand, positie)
  return { ok: true }
})
