import { z } from 'zod'

const tijdRegex = /^([01]\d|2[0-3]):[0-5]\d$/

const bodySchema = z.object({
  blokken: z.array(z.object({
    weekdag: z.number().int().min(1).max(7),
    type: z.enum(['prive', 'zakelijk']),
    startTijd: z.string().regex(tijdRegex),
    eindTijd: z.string().regex(tijdRegex)
  }))
})

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireSupabaseUser(event)
  const { blokken } = await readValidatedBody(event, bodySchema.parse)

  const { error: deleteError } = await supabase.from('dag_blokken').delete().eq('user_id', user.id)
  if (deleteError) throw createError({ statusCode: 500, statusMessage: deleteError.message })

  if (blokken.length === 0) {
    return []
  }

  const volgordePerDag = new Map<number, number>()
  const values = blokken.map((blok) => {
    const volgorde = volgordePerDag.get(blok.weekdag) ?? 0
    volgordePerDag.set(blok.weekdag, volgorde + 1)
    return {
      user_id: user.id,
      weekdag: blok.weekdag,
      type: blok.type,
      start_tijd: blok.startTijd,
      eind_tijd: blok.eindTijd,
      volgorde
    }
  })

  const { data, error } = await supabase.from('dag_blokken').insert(values).select(DAGBLOKKEN_SELECT)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
