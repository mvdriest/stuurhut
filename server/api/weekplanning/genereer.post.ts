export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireSupabaseUser(event)

  const periode = komendeWeek()
  const periodeStart = periode[0]!
  const periodeEind = periode[periode.length - 1]!

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

  if (inputDagBlokken.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Stel eerst je dagindeling in voordat je een weekplanning genereert.' })
  }

  const { data: openTrajecten, error: trajectenError } = await supabase
    .from('trajecten')
    .select('id, naam, status, eerstvolgendeActie:eerstvolgende_actie')
    .neq('status', 'on_hold')
  if (trajectenError) throw createError({ statusCode: 500, statusMessage: trajectenError.message })

  const { data: openstaandeSubtaken, error: subtakenError } = await supabase
    .from('subtaken')
    .select('id, trajectId:traject_id, tekst, geschatteDuur:geschatte_duur')
    .eq('status', 'to_do')
  if (subtakenError) throw createError({ statusCode: 500, statusMessage: subtakenError.message })

  const vasteTakenRuw = await haalGeplandeTaken(supabase, periodeStart, periodeEind)
  const vasteTaken = vasteTakenRuw
    .filter(taak => taak.status === 'bevestigd')
    .map(taak => ({
      datum: taak.datum,
      blokType: taak.blokType,
      startTijd: taak.startTijd,
      geschatteDuur: taak.geschatteDuur,
      omschrijving: taak.omschrijving
    }))

  const { data: correcties, error: correctiesError } = await supabase
    .from('tijdschatting_correcties')
    .select('omschrijving, geschatteDuur:geschatte_duur, aangepasteDuur:aangepaste_duur, context')
    .order('created_at', { ascending: false })
    .limit(20)
  if (correctiesError) throw createError({ statusCode: 500, statusMessage: correctiesError.message })

  const resultaat = await genereerWeekplanning({
    dagBlokken: inputDagBlokken,
    trajecten: openTrajecten,
    openstaandeSubtaken,
    vasteTaken,
    correcties
  })

  let nieuweSubtaakIds: string[] = []
  if (resultaat.nieuweSubtaken.length > 0) {
    const { data: ingevoegd, error: insertSubtakenError } = await supabase
      .from('subtaken')
      .insert(resultaat.nieuweSubtaken.map((s, i) => ({
        user_id: user.id,
        traject_id: s.trajectId,
        tekst: s.tekst,
        geschatte_duur: s.geschatteDuur,
        volgorde: i
      })))
      .select('id')
    if (insertSubtakenError) throw createError({ statusCode: 500, statusMessage: insertSubtakenError.message })
    nieuweSubtaakIds = ingevoegd.map(r => r.id)
  }

  const geldigeSubtaakIds = new Set([...openstaandeSubtaken.map(s => s.id), ...nieuweSubtaakIds])

  const { error: deleteError } = await supabase
    .from('geplande_taken')
    .delete()
    .eq('user_id', user.id)
    .gte('datum', periodeStart)
    .lte('datum', periodeEind)
    .eq('status', 'gepland')
  if (deleteError) throw createError({ statusCode: 500, statusMessage: deleteError.message })

  const volgordeTeller = new Map<string, number>()
  const nieuweRijen = resultaat.planning
    .map((item) => {
      const subtaakId = item.subtaakId !== null && item.subtaakId !== undefined
        ? item.subtaakId
        : (item.subtaakIndex !== null && item.subtaakIndex !== undefined ? nieuweSubtaakIds[item.subtaakIndex] ?? null : null)

      if (subtaakId !== null && !geldigeSubtaakIds.has(subtaakId)) return null

      const sleutel = `${item.datum}-${item.blokType}`
      const volgorde = volgordeTeller.get(sleutel) ?? 0
      volgordeTeller.set(sleutel, volgorde + 1)

      return {
        user_id: user.id,
        subtaak_id: subtaakId,
        vrije_tekst: subtaakId === null ? (item.vrijeTekst ?? '') : null,
        datum: item.datum,
        blok_type: item.blokType,
        start_tijd: item.startTijd,
        geschatte_duur: item.geschatteDuur,
        status: 'gepland' as const,
        volgorde
      }
    })
    .filter((rij): rij is NonNullable<typeof rij> => rij !== null)

  if (nieuweRijen.length > 0) {
    const { error: insertError } = await supabase.from('geplande_taken').insert(nieuweRijen)
    if (insertError) throw createError({ statusCode: 500, statusMessage: insertError.message })
  }

  const taken = await haalGeplandeTaken(supabase, periodeStart, periodeEind)
  return { periode, taken }
})
