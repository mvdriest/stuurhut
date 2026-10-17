import type { Dienst, HalteSjabloon } from '~/utils/route'
import { haltesVoorDiensten, routeSjabloon } from '~/utils/route'

type Supabase = Awaited<ReturnType<typeof requireSupabaseUser>>['supabase']

/**
 * Houdt de route van een traject in lijn met de afgenomen diensten.
 * - Nog geen haltes: de hele route uit het sjabloon.
 * - Dienst erbij: alleen de haltes van die dienst, vóór de afrondingsfase.
 * - Dienst eraf: de nog niet afgeronde haltes van die dienst verdwijnen; wat al
 *   gelopen is blijft staan, dat is geschiedenis.
 * Haltes die de gebruiker zelf heeft toegevoegd of hernoemd blijven ongemoeid.
 */
export async function synchroniseerRoute(supabase: Supabase, userId: string, trajectId: string, diensten: Dienst[], vorigeDiensten: Dienst[]) {
  const { data: bestaand, error } = await supabase
    .from('traject_haltes')
    .select('id, titel, fase, dienst, volgorde, afgerond_op')
    .eq('traject_id', trajectId)
    .order('volgorde')
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  if (!bestaand.length) {
    if (!diensten.length) return
    await voegIn(supabase, userId, trajectId, routeSjabloon(diensten), [], 0)
    return
  }

  const weg = vorigeDiensten.filter(d => !diensten.includes(d))
  if (weg.length) {
    const ids = bestaand.filter(h => weg.includes(h.dienst as Dienst) && !h.afgerond_op).map(h => h.id)
    if (ids.length) await supabase.from('traject_haltes').delete().in('id', ids)
  }

  const erbij = diensten.filter(d => !vorigeDiensten.includes(d))
  if (!erbij.length) return

  const over = bestaand.filter(h => !weg.includes(h.dienst as Dienst) || h.afgerond_op)
  const titels = new Set(over.map(h => h.titel.toLowerCase()))
  const nieuw = haltesVoorDiensten(diensten)
    .filter(h => erbij.includes(h.dienst as Dienst) && !titels.has(h.titel.toLowerCase()))
  if (!nieuw.length) return

  // Video en foto horen bij elkaar (zelfde shoot): een nieuwe beelddienst sluit aan
  // achter de bestaande beeldhaltes. Anders: vóór de afrondingsfase.
  const beeld = ['video', 'foto']
  const laatsteBeeld = nieuw.every(h => beeld.includes(h.dienst)) ? over.findLastIndex(h => beeld.includes(h.dienst)) : -1
  const eindIndex = over.findIndex(h => h.fase === 'afronden')
  const positie = laatsteBeeld !== -1 ? laatsteBeeld + 1 : eindIndex === -1 ? over.length : eindIndex
  await voegIn(supabase, userId, trajectId, nieuw, over, positie)
}

/** Voegt haltes in op `positie` tussen de bestaande, en nummert alles opnieuw. */
export async function voegIn(supabase: Supabase, userId: string, trajectId: string, nieuw: HalteSjabloon[], bestaand: { id: string }[], positie: number) {
  const { data: ingevoegd, error } = await supabase
    .from('traject_haltes')
    .insert(nieuw.map((h, i) => ({ user_id: userId, traject_id: trajectId, titel: h.titel, dienst: h.dienst, fase: h.fase, icoon: h.icoon, volgorde: positie + i })))
    .select('id')
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const volgorde = [...bestaand.slice(0, positie), ...ingevoegd, ...bestaand.slice(positie)]
  await hernummer(supabase, volgorde.map(h => h.id))
}

export async function hernummer(supabase: Supabase, ids: string[]) {
  await Promise.all(ids.map((id, volgorde) => supabase.from('traject_haltes').update({ volgorde }).eq('id', id)))
}
