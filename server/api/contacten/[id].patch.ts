import { z } from 'zod'

const tekst = z.string().trim().nullable().transform(s => s || null).optional()
const bodySchema = z.object({
  klantId: z.string().uuid().nullable().optional(),
  naam: z.string().trim().min(1).optional(),
  email: z.string().trim().email().nullable().or(z.literal('').transform(() => null)).optional(),
  telefoon: tekst,
  rol: tekst,
  voorkeur: tekst,
  notities: tekst
})

export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)
  const id = requireRouterParam(event, 'id')
  const { klantId, ...rest } = await readValidatedBody(event, bodySchema.parse)

  const { data, error } = await supabase
    .from('contacten')
    .update({ ...rest, klant_id: klantId, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(CONTACTEN_SELECT)
    .single()

  if (error || !data) throw createError({ statusCode: 404, statusMessage: 'Contact niet gevonden.' })
  if (data.klantId) await leerDomein(supabase, data.klantId, data.email)
  return data
})
