import { z } from 'zod'

const bodySchema = z.object({
  titel: z.string().min(1),
  categorie: z.enum(['klantwerk', 'eigen_werk', 'prive']),
  trajectId: z.string().uuid().nullable().optional(),
  datum: z.string().regex(DATUM_REGEX),
  startTijd: z.string().regex(TIJD_REGEX),
  eindTijd: z.string().regex(TIJD_REGEX)
}).refine(a => a.eindTijd > a.startTijd, { message: 'Eindtijd moet na de starttijd liggen.' })

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireSupabaseUser(event)
  const body = await readValidatedBody(event, bodySchema.parse)

  const { data, error } = await supabase
    .from('afspraken')
    .insert({
      user_id: user.id,
      titel: body.titel,
      categorie: body.categorie,
      traject_id: body.trajectId ?? null,
      datum: body.datum,
      start_tijd: body.startTijd,
      eind_tijd: body.eindTijd
    })
    .select(AFSPRAKEN_SELECT)
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
