// Haalt je agenda's op en zet ze in `afspraken`. Alleen lezen: er gaat niets terug naar je agenda.
// Aanroepen: vanuit de app (ingelogd) of door de cron (met NUXT_CRON_SECRET).
import { timingSafeEqual } from 'node:crypto'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database, Json } from '../../../app/types/database.types'

const VERLEDEN_DAGEN = 14
const TOEKOMST_DAGEN = 60
/** Vanuit de app niet vaker dan dit (de cron draait elk kwartier) */
const MIN_TUSSENPOZE_MS = 5 * 60 * 1000

function geheimKlopt(header: string | undefined, geheim: string) {
  if (!header || !geheim) return false
  const a = Buffer.from(header)
  const b = Buffer.from(`Bearer ${geheim}`)
  return a.length === b.length && timingSafeEqual(a, b)
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const admin = serverSupabaseServiceRole<Database>(event)
  const viaCron = geheimKlopt(getHeader(event, 'authorization'), config.cronSecret)

  let userId: string
  if (viaCron) {
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 })
    if (error || !data.users[0]) throw createError({ statusCode: 500, statusMessage: 'Geen account gevonden.' })
    userId = data.users[0].id
  }
  else {
    userId = (await requireSupabaseUser(event)).user.id
  }

  const query = getQuery(event)
  const { data: vorige } = await admin.from('v2_items').select('data').eq('user_id', userId).eq('collection', '_sync').eq('item_id', 'agenda').maybeSingle()
  const vorigeKeer = (vorige?.data as { at?: string } | null)?.at
  if (!viaCron && !query.force && vorigeKeer && Date.now() - new Date(vorigeKeer).getTime() < MIN_TUSSENPOZE_MS) {
    return { overgeslagen: true, at: vorigeKeer, gewijzigd: 0 }
  }

  const van = new Date(Date.now() - VERLEDEN_DAGEN * 86400000)
  const tot = new Date(Date.now() + TOEKOMST_DAGEN * 86400000)
  const vanDatum = van.toISOString().slice(0, 10)
  const totDatum = tot.toISOString().slice(0, 10)

  const { bronnen, fouten } = await haalBronnen(van, tot)
  const alle = bronnen.flatMap(b => voorvallen(b, van, tot))
  // Afspraken die Stuurhut zelf in iCloud zette (UID stuurhut-<id>) staan er al: niet dubbel ophalen,
  // maar wel overnemen wat je in de Apple-app veranderde of verwijderde.
  const nieuw = alle.filter(v => !v.extern.startsWith('stuurhut-'))
  const vanStuurhut = new Map(alle.filter(v => v.bron === 'icloud' && v.extern.startsWith('stuurhut-')).map(v => [v.extern.slice(9), v]))
  // Alleen als Werk én Agenda goed binnenkwamen, anders zouden we per ongeluk verwijderen
  const icloudGelukt = ['werk', 'agenda'].every(n => bronnen.some(b => b.bron === 'icloud' && b.agenda.toLowerCase() === n))

  // Wat er al staat, om jouw eigen keuzes (privé/zakelijk, klant) te bewaren
  const [{ data: bestaand }, { data: klanten }] = await Promise.all([
    admin.from('afspraken').select('id, extra, datum, titel, start_tijd, eind_tijd').eq('user_id', userId).not('extra->>bron', 'is', null),
    admin.from('klanten').select('id, naam').eq('user_id', userId),
  ])
  const oud = new Map((bestaand ?? []).map(r => [r.id, r]))
  const klantIn = (titel: string) => {
    const t = titel.toLowerCase()
    return (klanten ?? []).find(k => k.naam.trim().length >= 3 && t.includes(k.naam.trim().toLowerCase()))
  }

  const rijen = nieuw.map((v) => {
    const vorig = (oud.get(v.id)?.extra ?? {}) as Record<string, unknown>
    const klant = klantIn(v.titel)
    const zelfGekozen = vorig.domainSet === true
    const domain = zelfGekozen ? (vorig.domain as string) : (klant ? 'zakelijk' : v.domain)
    const clientId = zelfGekozen ? (vorig.clientId as string | undefined) : klant?.id
    const extra = {
      ...vorig,
      bron: v.bron,
      agenda: v.agenda,
      extern: v.extern,
      location: v.locatie,
      domain,
      clientId,
    }
    return {
      id: v.id,
      user_id: userId,
      titel: v.titel,
      datum: v.datum,
      start_tijd: v.start,
      eind_tijd: v.eind,
      categorie: domain === 'prive' ? 'prive' : clientId ? 'klantwerk' : 'eigen_werk',
      extra: JSON.parse(JSON.stringify(extra)) as Json,
    }
  })

  // Alleen bijwerken wat anders is
  const gewijzigd = rijen.filter((r) => {
    const o = oud.get(r.id)
    return !o || JSON.stringify(o.extra) !== JSON.stringify(r.extra) || o.datum !== r.datum || o.titel !== r.titel
      || o.start_tijd.slice(0, 5) !== r.start_tijd || o.eind_tijd.slice(0, 5) !== r.eind_tijd
  })
  for (let i = 0; i < gewijzigd.length; i += 500) {
    const { error } = await admin.from('afspraken').upsert(gewijzigd.slice(i, i + 500))
    if (error) throw createError({ statusCode: 500, statusMessage: `Opslaan: ${error.message}` })
  }

  // Weg uit je agenda = weg uit Stuurhut. Alleen binnen het venster, en alleen voor bronnen die gelukt zijn.
  const gelukt = new Set(bronnen.map(b => `${b.bron}|${b.agenda}`))
  const nu = new Set(rijen.map(r => r.id))
  const weg = (bestaand ?? []).filter((r) => {
    const x = r.extra as Record<string, unknown>
    return !nu.has(r.id) && r.datum >= vanDatum && r.datum <= totDatum && gelukt.has(`${x.bron}|${x.agenda}`)
  }).map(r => r.id)
  if (weg.length) {
    const { error } = await admin.from('afspraken').delete().in('id', weg)
    if (error) throw createError({ statusCode: 500, statusMessage: `Opruimen: ${error.message}` })
  }

  // Eigen afspraken: wijzigingen en verwijderingen uit de Apple-app terug naar Stuurhut
  let teruggezet = 0
  if (icloudGelukt) {
    const { data: eigen } = await admin.from('afspraken').select('id, titel, datum, start_tijd, eind_tijd, extra').eq('user_id', userId).is('extra->>bron', null).not('extra->>icloud', 'is', null).gte('datum', vanDatum).lte('datum', totDatum)
    for (const r of eigen ?? []) {
      const x = (r.extra ?? {}) as Record<string, unknown>
      if (x.cancelled) continue
      const v = vanStuurhut.get(r.id)
      if (!v) {
        const { error } = await admin.from('afspraken').delete().eq('id', r.id).eq('user_id', userId)
        if (!error) teruggezet++
        continue
      }
      const locatie = v.locatie ?? undefined
      if (v.titel !== r.titel || v.datum !== r.datum || v.start !== r.start_tijd.slice(0, 5) || v.eind !== r.eind_tijd.slice(0, 5) || locatie !== (x.location ?? undefined)) {
        const { error } = await admin.from('afspraken').update({ titel: v.titel, datum: v.datum, start_tijd: v.start, eind_tijd: v.eind, extra: JSON.parse(JSON.stringify({ ...x, location: locatie })) as Json }).eq('id', r.id).eq('user_id', userId)
        if (!error) teruggezet++
      }
    }
  }

  const status = {
    at: new Date().toISOString(),
    agendas: bronnen.map(b => b.agenda),
    telling: Object.fromEntries(telling),
    afspraken: rijen.length,
    nieuw: rijen.filter(r => !oud.has(r.id)).length,
    weg: weg.length,
    fouten,
  }
  await admin.from('v2_items').upsert({ user_id: userId, collection: '_sync', item_id: 'agenda', data: status, updated_at: status.at })

  return { ...status, teruggezet, gewijzigd: gewijzigd.length + weg.length + teruggezet }
})
