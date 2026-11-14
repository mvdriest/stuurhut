// Haalt je boekhouding uit e-Boekhouden (alleen lezen) en zet die in Financiën:
//  - transacties: betalingen en ontvangsten van de laatste 13 maanden
//  - facturen: wat klanten nog moeten betalen (openstaande posten debiteuren)
// Aanroepen: vanuit de app (ingelogd, hooguit elk half uur) of door de cron (NUXT_CRON_SECRET).
import { timingSafeEqual } from 'node:crypto'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database, Json } from '../../../app/types/database.types'
import type { Invoice, Transaction } from '../../../app/types'

const MIN_TUSSENPOZE_MS = 30 * 60 * 1000
const MAANDEN_TERUG = 13

// Mutatiesoorten in e-Boekhouden
const BETALING_ONTVANGEN = 3
const BETALING_VERSTUURD = 4
const GELD_ONTVANGEN = 5
const GELD_UITGEGEVEN = 6
const GELDSTROMEN = [BETALING_ONTVANGEN, BETALING_VERSTUURD, GELD_ONTVANGEN, GELD_UITGEGEVEN]

interface Cache { mutaties: Record<string, { d?: string, r?: number, t?: number }>, relaties: Record<string, string> }

function geheimKlopt(header: string | undefined, geheim: string) {
  if (!header || !geheim) return false
  const a = Buffer.from(header)
  const b = Buffer.from(`Bearer ${geheim}`)
  return a.length === b.length && timingSafeEqual(a, b)
}
const plusDagen = (iso: string, n: number) => new Date(new Date(`${iso.slice(0, 10)}T12:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10)

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const admin = serverSupabaseServiceRole<Database>(event)
  const viaCron = geheimKlopt(getHeader(event, 'authorization'), config.cronSecret)
  let userId: string
  if (viaCron) {
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 })
    if (!data?.users[0]) throw createError({ statusCode: 500, statusMessage: 'Geen account gevonden.' })
    userId = data.users[0].id
  }
  else {
    userId = (await requireSupabaseUser(event)).user.id
  }
  if (!process.env.EBOEKHOUDEN_TOKEN) return { overgeslagen: true, reden: 'niet gekoppeld', gewijzigd: 0 }

  const { data: rijen } = await admin.from('v2_items').select('collection, item_id, data').eq('user_id', userId).in('collection', ['_sync', '_eb', 'transactions', 'invoices'])
  const status = rijen?.find(r => r.collection === '_sync' && r.item_id === 'financien')?.data as { at?: string } | undefined
  if (!viaCron && !getQuery(event).force && status?.at && Date.now() - new Date(status.at).getTime() < MIN_TUSSENPOZE_MS) {
    return { overgeslagen: true, at: status.at, gewijzigd: 0 }
  }
  const cache: Cache = { mutaties: {}, relaties: {}, ...(rijen?.find(r => r.collection === '_eb' && r.item_id === 'cache')?.data as Partial<Cache> | undefined) }

  const eb = await ebSessie()
  try {
    const vanaf = new Date()
    vanaf.setMonth(vanaf.getMonth() - MAANDEN_TERUG, 1)
    const vanafISO = vanaf.toISOString().slice(0, 10)

    const [mutaties, openstaand, { data: klanten }] = await Promise.all([
      eb.alles<EbMutatieKort>('/v1/mutation', { 'date[gte]': vanafISO }),
      eb.alles<EbOpenstaand>('/v1/mutation/invoice/outstanding', { credDeb: 'D' }),
      admin.from('klanten').select('id, naam').eq('user_id', userId),
    ])

    // Omschrijving, relatie en betaaltermijn staan alleen in de details: eenmalig ophalen en bewaren
    const nodig = [...new Set([
      ...mutaties.filter(m => GELDSTROMEN.includes(Number(m.type))).map(m => m.id),
      ...openstaand.map(o => o.mutationId),
    ])].filter(id => !cache.mutaties[id])
    await perStuk(nodig, 5, async (id) => {
      try {
        const m = await eb.get<EbMutatie>(`/v1/mutation/${id}`)
        cache.mutaties[id] = { d: m.description?.trim() || undefined, r: m.relationId || undefined, t: m.termOfPayment || undefined }
      }
      catch { /* volgende keer opnieuw */ }
    })
    const relIds = [...new Set(Object.values(cache.mutaties).map(m => m.r).filter((r): r is number => !!r))].filter(r => !cache.relaties[r])
    await perStuk(relIds, 5, async (id) => {
      try {
        const r = await eb.get<{ name?: string, contact?: string }>(`/v1/relation/${id}`)
        cache.relaties[id] = (r.name || r.contact || '').trim()
      }
      catch { /* volgende keer opnieuw */ }
    })

    const klantVan = (naam?: string) => {
      const n = naam?.toLowerCase().trim()
      if (!n) return undefined
      return (klanten ?? []).find((k) => {
        const kn = k.naam.toLowerCase().trim()
        return kn.length >= 3 && (n.includes(kn) || kn.includes(n))
      })?.id
    }

    // Transacties
    const transacties: Transaction[] = mutaties
      .filter(m => GELDSTROMEN.includes(Number(m.type)))
      .map((m) => {
        const c = cache.mutaties[m.id] ?? {}
        const relatie = c.r ? cache.relaties[c.r] : undefined
        const erin = [BETALING_ONTVANGEN, GELD_ONTVANGEN].includes(Number(m.type))
        const bedrag = Math.abs(Number(m.amount) || 0)
        const label = c.d || (m.invoiceNumber ? `${erin ? 'Betaling' : 'Betaald'} ${m.invoiceNumber}` : relatie) || (erin ? 'Ontvangen' : 'Uitgegeven')
        return {
          id: `eb-${m.id}`,
          date: m.date.slice(0, 10),
          amount: erin ? bedrag : -bedrag,
          label: relatie && !label.includes(relatie) ? `${label} · ${relatie}` : label,
          clientId: erin ? klantVan(relatie) : undefined,
          category: Number(m.type) === BETALING_ONTVANGEN ? 'omzet' : 'overig',
        }
      })

    // Facturen: open = in de openstaande posten; eerder binnengehaald en nu niet meer open = betaald
    const oudeFacturen = new Map((rijen ?? []).filter(r => r.collection === 'invoices' && r.item_id.startsWith('eb-')).map(r => [r.item_id, r.data as unknown as Invoice & { clientName?: string }]))
    const facturen = new Map<string, Invoice & { clientName?: string }>()
    for (const o of openstaand) {
      const id = `eb-${o.mutationId}`
      const c = cache.mutaties[o.mutationId] ?? {}
      const naam = o.company?.trim() || (c.r ? cache.relaties[c.r] : undefined) || o.relationCode
      const oud = oudeFacturen.get(id)
      facturen.set(id, {
        ...oud,
        id,
        number: o.invoiceNumber,
        clientId: klantVan(naam) ?? '',
        clientName: naam,
        amount: Math.round(Number(o.outstandingAmount) * 100) / 100,
        sentOn: o.date.slice(0, 10),
        due: plusDagen(o.date, c.t ?? 14),
        paid: false,
      })
    }
    for (const [id, oud] of oudeFacturen) if (!facturen.has(id)) facturen.set(id, { ...oud, paid: true })

    // Wegschrijven: alleen wat anders is
    const bestaand = new Map((rijen ?? []).filter(r => ['transactions', 'invoices'].includes(r.collection)).map(r => [`${r.collection}|${r.item_id}`, JSON.stringify(r.data)]))
    const at = new Date().toISOString()
    const schrijf: Database['public']['Tables']['v2_items']['Insert'][] = []
    for (const [collection, lijst] of [['transactions', transacties], ['invoices', [...facturen.values()]]] as const) {
      for (const item of lijst) {
        const data = JSON.parse(JSON.stringify(item)) as Json
        if (bestaand.get(`${collection}|${item.id}`) !== JSON.stringify(data)) schrijf.push({ user_id: userId, collection, item_id: item.id, data, updated_at: at })
      }
    }
    for (let i = 0; i < schrijf.length; i += 500) {
      const { error } = await admin.from('v2_items').upsert(schrijf.slice(i, i + 500))
      if (error) throw createError({ statusCode: 500, statusMessage: `Opslaan: ${error.message}` })
    }
    // Transacties die in e-Boekhouden verdwenen (binnen het venster)
    const nuIds = new Set(transacties.map(t => t.id))
    const weg = (rijen ?? []).filter(r => r.collection === 'transactions' && r.item_id.startsWith('eb-') && !nuIds.has(r.item_id) && String((r.data as { date?: string }).date ?? '') >= vanafISO).map(r => r.item_id)
    if (weg.length) await admin.from('v2_items').delete().eq('user_id', userId).eq('collection', 'transactions').in('item_id', weg)

    await admin.from('v2_items').upsert([
      { user_id: userId, collection: '_eb', item_id: 'cache', data: cache as unknown as Json, updated_at: at },
      { user_id: userId, collection: '_sync', item_id: 'financien', data: { at, transacties: transacties.length, open: openstaand.length, nieuw: nodig.length }, updated_at: at },
    ])
    return { at, transacties: transacties.length, openFacturen: openstaand.length, openBedrag: openstaand.reduce((s, o) => s + Number(o.outstandingAmount), 0), gewijzigd: schrijf.length + weg.length }
  }
  finally {
    await eb.stop()
  }
})
