import { z } from 'zod'

const bodySchema = z.union([
  z.object({ target: z.literal('vandaag') }),
  z.object({ target: z.literal('traject'), trajectId: z.string().uuid() })
])

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireSupabaseUser(event)
  const id = getRouterParam(event, 'id')
  const body = await readValidatedBody(event, bodySchema.parse)

  const { data: item } = await supabase.from('inbox_items').select('id, tekst').eq('id', id).single()
  if (!item) {
    throw createError({ statusCode: 404, statusMessage: 'Item niet gevonden.' })
  }

  if (body.target === 'vandaag') {
    const datum = today()
    const aantal = await telVandaagPrioriteiten(supabase, user.id, datum)

    if (aantal >= MAX_PER_DAG) {
      throw createError({ statusCode: 400, statusMessage: `Je hebt al ${MAX_PER_DAG} prioriteiten voor vandaag.` })
    }

    await supabase.from('vandaag_prioriteiten').insert({
      user_id: user.id,
      tekst: item.tekst,
      datum,
      volgorde: aantal
    })
  } else {
    const { data: traject } = await supabase
      .from('trajecten')
      .update({ eerstvolgende_actie: item.tekst, updated_at: new Date().toISOString() })
      .eq('id', body.trajectId)
      .select('id')
      .single()

    if (!traject) {
      throw createError({ statusCode: 404, statusMessage: 'Traject niet gevonden.' })
    }
  }

  await supabase.from('inbox_items').delete().eq('id', id)

  return { success: true }
})
