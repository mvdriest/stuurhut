// Eén samenvatting voor de kaart-pins (Doelen, Trajecten, Agenda, To-do's, Focus),
// zodat het startscherm niet zes losse lijsten hoeft op te halen alleen om te tellen.
export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)
  const vandaag = today()
  // Ruim genoeg om "vandaag in Nederland" te dekken, ongeacht de UTC-offset.
  const sindsGisteren = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString()

  const [doelen, trajecten, afspraken, taken, focus] = await Promise.all([
    supabase.from('doelen').select('id', { count: 'exact', head: true }).eq('status', 'actief'),
    supabase.from('trajecten').select('id', { count: 'exact', head: true }).neq('status', 'on_hold'),
    supabase.from('afspraken').select('titel, startTijd:start_tijd').eq('datum', vandaag).order('start_tijd', { ascending: true }),
    supabase.from('subtaken').select('id', { count: 'exact', head: true }).neq('status', 'klaar'),
    supabase.from('focus_sessies').select('duurMinuten:duur_minuten, createdAt:created_at').eq('type', 'werk').gte('created_at', sindsGisteren)
  ])

  for (const resultaat of [doelen, trajecten, afspraken, taken, focus]) {
    if (resultaat.error) throw createError({ statusCode: 500, statusMessage: resultaat.error.message })
  }

  const focusMinutenVandaag = (focus.data ?? [])
    .filter(s => new Date(s.createdAt).toLocaleDateString('en-CA', { timeZone: TIJDZONE }) === vandaag)
    .reduce((som, s) => som + s.duurMinuten, 0)

  const nu = new Date().toLocaleTimeString('en-GB', { timeZone: TIJDZONE, hour: '2-digit', minute: '2-digit' })
  const volgendeAfspraak = (afspraken.data ?? []).find(a => a.startTijd.slice(0, 5) >= nu) ?? null

  return {
    doelenActief: doelen.count ?? 0,
    trajectenLopend: trajecten.count ?? 0,
    afsprakenVandaag: afspraken.data?.length ?? 0,
    volgendeAfspraak: volgendeAfspraak ? { titel: volgendeAfspraak.titel, startTijd: volgendeAfspraak.startTijd.slice(0, 5) } : null,
    openTaken: taken.count ?? 0,
    focusMinutenVandaag
  }
})
