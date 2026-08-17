import { z } from 'zod'

const tijdRegex = /^([01]\d|2[0-3]):[0-5]\d$/

const bodySchema = z.object({
  datum: z.string().optional(),
  blokType: z.enum(['prive', 'zakelijk']).optional(),
  startTijd: z.string().regex(tijdRegex).nullable().optional(),
  geschatteDuur: z.number().int().positive().optional(),
  status: z.enum(['gepland', 'bevestigd', 'klaar']).optional(),
  volgorde: z.number().int().optional()
})

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireSupabaseUser(event)
  const id = getRouterParam(event, 'id')
  const wijziging = await readValidatedBody(event, bodySchema.parse)

  const { data: bestaand } = await supabase
    .from('geplande_taken')
    .select('id, geschatteDuur:geschatte_duur, vrijeTekst:vrije_tekst, subtaakId:subtaak_id')
    .eq('id', id)
    .single()

  if (!bestaand) {
    throw createError({ statusCode: 404, statusMessage: 'Geplande taak niet gevonden.' })
  }

  if (wijziging.geschatteDuur !== undefined && wijziging.geschatteDuur !== bestaand.geschatteDuur) {
    let omschrijving = bestaand.vrijeTekst ?? ''
    if (bestaand.subtaakId !== null) {
      const { data: subtaak } = await supabase.from('subtaken').select('tekst').eq('id', bestaand.subtaakId).single()
      omschrijving = subtaak?.tekst ?? omschrijving
    }

    const { error: correctieError } = await supabase.from('tijdschatting_correcties').insert({
      user_id: user.id,
      omschrijving,
      geschatte_duur: bestaand.geschatteDuur,
      aangepaste_duur: wijziging.geschatteDuur
    })
    if (correctieError) throw createError({ statusCode: 500, statusMessage: correctieError.message })
  }

  const { data: bijgewerkt, error } = await supabase
    .from('geplande_taken')
    .update({
      datum: wijziging.datum,
      blok_type: wijziging.blokType,
      start_tijd: wijziging.startTijd,
      geschatte_duur: wijziging.geschatteDuur,
      status: wijziging.status,
      volgorde: wijziging.volgorde,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select(GEPLANDE_TAKEN_SELECT)
    .single()

  if (error || !bijgewerkt) throw createError({ statusCode: 404, statusMessage: 'Geplande taak niet gevonden.' })
  return bijgewerkt
})
