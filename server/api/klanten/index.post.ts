import { z } from 'zod'

const bodySchema = z.object({
  naam: z.string().trim().min(1),
  domeinen: z.array(z.string().trim().toLowerCase().min(3)).default([]),
  website: z.string().trim().optional(),
  adres: z.string().trim().optional(),
  kvk: z.string().trim().optional(),
  btw: z.string().trim().optional(),
  notities: z.string().trim().optional()
})

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireSupabaseUser(event)
  const body = await readValidatedBody(event, bodySchema.parse)

  const { data, error } = await supabase
    .from('klanten')
    .insert({ ...body, user_id: user.id })
    .select(KLANTEN_SELECT)
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
