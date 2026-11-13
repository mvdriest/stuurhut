// Slaap en beweging uit Apple Gezondheid, elke ochtend gestuurd door een iOS-opdracht.
// Beveiligd met je persoonlijke sleutel (NUXT_RITME_TOKEN) in de header: Authorization: Bearer <sleutel>.
//
// Wat de opdracht stuurt (alles mag ontbreken):
//   sleep  totale slaap van afgelopen nacht (uren, minuten of seconden: wordt herkend)
//   bed    begin van de eerste slaap   (ISO-datum/tijd of "23:15")
//   woke   einde van de laatste slaap  (ISO-datum/tijd of "07:40")
//   move   beweegminuten van gisteren
//   date   de dag waarbij de slaap hoort (standaard: vandaag)
import { timingSafeEqual } from 'node:crypto'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database, Json } from '../../app/types/database.types'

const TZ = 'Europe/Amsterdam'
const vandaag = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
const dagErvoor = (iso: string) => new Date(new Date(`${iso}T12:00:00Z`).getTime() - 86400000).toISOString().slice(0, 10)

function getal(v: unknown) {
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}

/** Slaap naar uren: groot getal = seconden, middel = minuten, klein = uren. */
function uren(v: unknown) {
  const n = getal(v)
  if (n === undefined || n <= 0) return undefined
  const h = n > 24 * 60 ? n / 3600 : n > 24 ? n / 60 : n
  return Math.round(h * 100) / 100
}

/** "2026-11-14T07:40:12+01:00", "14 nov 2026 om 07:40" of "07:40" → "07:40" in Nederlandse tijd. */
function tijd(v: unknown) {
  const s = String(v ?? '').trim()
  if (!s) return undefined
  const kaal = s.match(/^(\d{1,2})[:.](\d{2})$/)
  if (kaal) return `${kaal[1]!.padStart(2, '0')}:${kaal[2]}`
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) {
    return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d)
  }
  const ergens = s.match(/(\d{1,2}):(\d{2})/)
  return ergens ? `${ergens[1]!.padStart(2, '0')}:${ergens[2]}` : undefined
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const header = getHeader(event, 'authorization') ?? ''
  const verwacht = `Bearer ${config.ritmeToken}`
  if (!config.ritmeToken || header.length !== verwacht.length || !timingSafeEqual(Buffer.from(header), Buffer.from(verwacht))) {
    throw createError({ statusCode: 401, statusMessage: 'Onbekende sleutel.' })
  }

  const body = (await readBody<Record<string, unknown>>(event).catch(() => null)) ?? {}
  const datum = /^\d{4}-\d{2}-\d{2}$/.test(String(body.date ?? '')) ? String(body.date) : vandaag()

  const admin = serverSupabaseServiceRole<Database>(event)
  const { data: users, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 })
  const userId = users?.users[0]?.id
  if (error || !userId) throw createError({ statusCode: 500, statusMessage: 'Geen account gevonden.' })

  const slaap = { sleepH: uren(body.sleep), bed: tijd(body.bed), woke: tijd(body.woke) }
  const beweeg = getal(body.move)

  async function bewaar(dag: string, velden: Record<string, unknown>) {
    const schoon = Object.fromEntries(Object.entries(velden).filter(([, v]) => v !== undefined))
    if (!Object.keys(schoon).length) return null
    const { data: oud } = await admin.from('v2_items').select('data').eq('user_id', userId!).eq('collection', 'health').eq('item_id', dag).maybeSingle()
    const data: Record<string, unknown> & { at: string } = { ...((oud?.data as Record<string, unknown> | null) ?? {}), ...schoon, date: dag, at: new Date().toISOString() }
    const { error: e } = await admin.from('v2_items').upsert({ user_id: userId!, collection: 'health', item_id: dag, data: data as Json, updated_at: data.at })
    if (e) throw createError({ statusCode: 500, statusMessage: e.message })
    return data
  }

  // Slaap hoort bij de ochtend waarop je wakker werd; beweging bij de dag ervoor (die is dan compleet)
  const nacht = await bewaar(datum, slaap)
  const gisteren = await bewaar(dagErvoor(datum), { moveMin: beweeg === undefined ? undefined : Math.round(beweeg) })

  return {
    ok: true,
    tekst: [
      nacht?.sleepH ? `Slaap ${String(nacht.sleepH).replace('.', ',')} uur${nacht.bed && nacht.woke ? ` (${nacht.bed}–${nacht.woke})` : ''}` : null,
      gisteren?.moveMin !== undefined && gisteren ? `${gisteren.moveMin} min bewogen gisteren` : null,
    ].filter(Boolean).join(' · ') || 'Niets ontvangen. Kijk of de opdracht de velden meestuurt.',
  }
})
