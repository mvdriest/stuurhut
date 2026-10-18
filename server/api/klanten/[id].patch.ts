import { z } from 'zod'

const tekst = z.string().trim().nullable().transform(s => s || null).optional()
const bodySchema = z.object({
  naam: z.string().trim().min(1).optional(),
  domeinen: z.array(z.string().trim().toLowerCase().min(3)).optional(),
  website: tekst,
  adres: tekst,
  kvk: tekst,
  btw: tekst,
  notities: tekst
})

export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)
  const id = requireRouterParam(event, 'id')
  const updates = await readValidatedBody(event, bodySchema.parse)

  const { data, error } = await supabase
    .from('klanten')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(KLANTEN_SELECT)
    .single()

  if (error || !data) throw createError({ statusCode: 404, statusMessage: 'Klant niet gevonden.' })
  return data
})
