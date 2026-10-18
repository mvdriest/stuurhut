import { z } from 'zod'

const bodySchema = z.object({
  klantId: z.string().uuid().nullable().optional(),
  naam: z.string().trim().min(1),
  email: z.string().trim().email().or(z.literal('')).optional(),
  telefoon: z.string().trim().optional(),
  rol: z.string().trim().optional(),
  voorkeur: z.string().trim().optional(),
  notities: z.string().trim().optional()
})

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireSupabaseUser(event)
  const body = await readValidatedBody(event, bodySchema.parse)

  const { data, error } = await supabase
    .from('contacten')
    .insert({
      user_id: user.id,
      klant_id: body.klantId ?? null,
      naam: body.naam,
      email: body.email || null,
      telefoon: body.telefoon || null,
      rol: body.rol || null,
      voorkeur: body.voorkeur || null,
      notities: body.notities || null
    })
    .select(CONTACTEN_SELECT)
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (body.klantId) await leerDomein(supabase, body.klantId, body.email)
  return data
})
