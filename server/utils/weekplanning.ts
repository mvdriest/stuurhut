import type { SupabaseClient } from '@supabase/supabase-js'

export interface GeplandeTaakOutput {
  id: string
  subtaakId: string | null
  vrijeTekst: string | null
  omschrijving: string
  trajectId: string | null
  trajectNaam: string | null
  datum: string
  blokType: 'prive' | 'zakelijk'
  startTijd: string | null
  geschatteDuur: number
  status: 'gepland' | 'bevestigd' | 'klaar'
  volgorde: number
}

export async function haalGeplandeTaken(supabase: SupabaseClient, periodeStart: string, periodeEind: string): Promise<GeplandeTaakOutput[]> {
  const { data: taken, error } = await supabase
    .from('geplande_taken')
    .select(GEPLANDE_TAKEN_SELECT)
    .gte('datum', periodeStart)
    .lte('datum', periodeEind)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const subtaakIds = [...new Set(taken.map(t => t.subtaakId).filter((id): id is string => id !== null))]
  const subtakenBijId = new Map<string, { tekst: string, trajectId: string | null }>()
  if (subtaakIds.length > 0) {
    const { data: rijen, error: subtakenError } = await supabase
      .from('subtaken')
      .select('id, tekst, trajectId:traject_id')
      .in('id', subtaakIds)
    if (subtakenError) throw createError({ statusCode: 500, statusMessage: subtakenError.message })
    for (const rij of rijen) subtakenBijId.set(rij.id, { tekst: rij.tekst, trajectId: rij.trajectId })
  }

  const trajectIds = [...new Set([...subtakenBijId.values()].map(s => s.trajectId).filter((id): id is string => id !== null))]
  const trajectenBijId = new Map<string, string>()
  if (trajectIds.length > 0) {
    const { data: rijen, error: trajectenError } = await supabase
      .from('trajecten')
      .select('id, naam')
      .in('id', trajectIds)
    if (trajectenError) throw createError({ statusCode: 500, statusMessage: trajectenError.message })
    for (const rij of rijen) trajectenBijId.set(rij.id, rij.naam)
  }

  return taken.map((taak) => {
    const subtaak = taak.subtaakId !== null ? subtakenBijId.get(taak.subtaakId) : undefined
    const trajectId = subtaak?.trajectId ?? null
    return {
      id: taak.id,
      subtaakId: taak.subtaakId,
      vrijeTekst: taak.vrijeTekst,
      omschrijving: subtaak?.tekst ?? taak.vrijeTekst ?? '',
      trajectId,
      trajectNaam: trajectId !== null ? (trajectenBijId.get(trajectId) ?? null) : null,
      datum: taak.datum,
      blokType: taak.blokType,
      startTijd: taak.startTijd,
      geschatteDuur: taak.geschatteDuur,
      status: taak.status,
      volgorde: taak.volgorde
    }
  })
}
