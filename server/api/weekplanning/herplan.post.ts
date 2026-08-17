import { z } from 'zod'

const bodySchema = z.object({
  reden: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)
  const { reden } = await readValidatedBody(event, bodySchema.parse)

  const periode = komendeWeek()
  const periodeStart = periode[0]!
  const periodeEind = periode[periode.length - 1]!

  const alleTaken = await haalGeplandeTaken(supabase, periodeStart, periodeEind)
  const verplaatsbaar = alleTaken.filter(t => t.status === 'gepland')
  const vaste = alleTaken.filter(t => t.status === 'bevestigd')

  if (verplaatsbaar.length === 0) {
    return { periode, taken: alleTaken }
  }

  const { data: blokkenPerWeekdag, error: blokkenError } = await supabase
    .from('dag_blokken')
    .select(DAGBLOKKEN_SELECT)
    .order('weekdag', { ascending: true })
    .order('volgorde', { ascending: true })
  if (blokkenError) throw createError({ statusCode: 500, statusMessage: blokkenError.message })

  const inputDagBlokken = periode.flatMap((datum) => {
    const weekdag = isoWeekday(datum)
    return blokkenPerWeekdag
      .filter(blok => blok.weekdag === weekdag)
      .map(blok => ({ datum, weekdag, blokType: blok.type as 'prive' | 'zakelijk', startTijd: blok.startTijd, eindTijd: blok.eindTijd }))
  })

  const resultaat = await herplanTaken({
    taken: verplaatsbaar.map(t => ({
      id: t.id,
      omschrijving: t.omschrijving,
      geschatteDuur: t.geschatteDuur,
      huidigeDatum: t.datum,
      huidigeBlokType: t.blokType,
      huidigeStartTijd: t.startTijd
    })),
    vasteTaken: vaste.map(t => ({
      datum: t.datum,
      blokType: t.blokType,
      startTijd: t.startTijd,
      geschatteDuur: t.geschatteDuur,
      omschrijving: t.omschrijving
    })),
    dagBlokken: inputDagBlokken,
    reden
  })

  const geldigeIds = new Set(verplaatsbaar.map(t => t.id))

  for (const wijziging of resultaat.wijzigingen) {
    if (!geldigeIds.has(wijziging.id)) continue

    await supabase
      .from('geplande_taken')
      .update({
        datum: wijziging.datum,
        blok_type: wijziging.blokType,
        start_tijd: wijziging.startTijd,
        updated_at: new Date().toISOString()
      })
      .eq('id', wijziging.id)
  }

  const taken = await haalGeplandeTaken(supabase, periodeStart, periodeEind)
  return { periode, taken }
})
