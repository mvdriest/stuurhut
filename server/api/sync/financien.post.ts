// Haalt je boekhouding uit e-Boekhouden (alleen lezen) en zet die in Financiën:
//  - transacties: betalingen en ontvangsten van de laatste 13 maanden
//  - facturen: wat klanten nog moeten betalen (openstaande posten debiteuren)
// Aanroepen: vanuit de app (ingelogd, hooguit elk half uur) of door de cron (NUXT_CRON_SECRET).
import { timingSafeEqual } from 'node:crypto'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database, Json } from '../../../app/types/database.types'
import type { Invoice, Subscription, Transaction } from '../../../app/types'

const MIN_TUSSENPOZE_MS = 30 * 60 * 1000
const MAANDEN_TERUG = 13

// Mutatiesoorten in e-Boekhouden
const BETALING_ONTVANGEN = 3
const BETALING_VERSTUURD = 4
const GELD_ONTVANGEN = 5
const GELD_UITGEGEVEN = 6
const GELDSTROMEN = [BETALING_ONTVANGEN, BETALING_VERSTUURD, GELD_ONTVANGEN, GELD_UITGEGEVEN]

// d = omschrijving, r = relatie, t = betaaltermijn, l = grootboekrekeningen van de regels
interface Cache { mutaties: Record<string, { d?: string, r?: number, t?: number, l?: number[] }>, relaties: Record<string, string> }

const DAG = 86400000
/** Vaste lasten (geen abonnement): bank, verzekering, huur en dergelijke */
const VASTE_LAST = /bank|verzeker|huur|kvk|kamer van koophandel|belasting|energie|gemeente|pensioen/i
/** Privé opgenomen of gestort: geen omzet en geen bedrijfskosten */
const PRIVE = /priv[eé]/i

function geheimKlopt(header: string | undefined, geheim: string) {
  if (!header || !geheim) return false
  const a = Buffer.from(header)
  const b = Buffer.from(`Bearer ${geheim}`)
  return a.length === b.length && timingSafeEqual(a, b)
}
/** JSON met gesorteerde sleutels: de database bewaart sleutels in een andere volgorde */
const gelijkJson = (x: unknown): string => JSON.stringify(x, (_, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v))
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

  const { data: rijen } = await admin.from('v2_items').select('collection, item_id, data').eq('user_id', userId).in('collection', ['_sync', '_eb', 'transactions', 'invoices', 'subscriptions'])
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

    const [mutaties, openstaand, grootboek, { data: klanten }] = await Promise.all([
      eb.alles<EbMutatieKort>('/v1/mutation', { 'date[gte]': vanafISO }),
      eb.alles<EbOpenstaand>('/v1/mutation/invoice/outstanding', { credDeb: 'D' }),
      eb.alles<{ id: number, code?: string, description?: string }>('/v1/ledger').catch(() => []),
      admin.from('klanten').select('id, naam').eq('user_id', userId),
    ])
    const priveRekening = new Set(grootboek.filter(g => PRIVE.test(g.description ?? '')).map(g => g.id))

    // Omschrijving, relatie en betaaltermijn staan alleen in de details: eenmalig ophalen en bewaren
    const nodig = [...new Set([
      ...mutaties.filter(m => GELDSTROMEN.includes(Number(m.type))).map(m => m.id),
      ...openstaand.map(o => o.mutationId),
    ])].filter(id => !cache.mutaties[id]?.l)
    await perStuk(nodig, 5, async (id) => {
      try {
        const m = await eb.get<EbMutatie>(`/v1/mutation/${id}`)
        cache.mutaties[id] = { d: m.description?.trim() || undefined, r: m.relationId || undefined, t: m.termOfPayment || undefined, l: [...new Set((m.rows ?? []).map(x => x.ledgerId).filter((x): x is number => !!x))] }
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

    // Transacties. Kosten bij dezelfde partij in 3+ verschillende maanden tellen als vaste lasten.
    const schoon = (t?: string) => t
      ?.replace(/\b[A-Z]{2}\d{2}[A-Z]{4}\d{6,}\b/g, '') // IBAN
      .replace(/\b[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?\b/g, '') // BIC
      .replace(/\s{2,}/g, ' ').trim()
    const geldstromen = mutaties.filter(m => GELDSTROMEN.includes(Number(m.type)))
    const maandenPerRelatie = new Map<number, Set<string>>()
    for (const m of geldstromen) {
      const r = cache.mutaties[m.id]?.r
      if (r && [BETALING_VERSTUURD, GELD_UITGEGEVEN].includes(Number(m.type))) {
        maandenPerRelatie.set(r, (maandenPerRelatie.get(r) ?? new Set()).add(m.date.slice(0, 7)))
      }
    }
    const transacties: Transaction[] = geldstromen.map((m) => {
      const c = cache.mutaties[m.id] ?? {}
      const relatie = c.r ? cache.relaties[c.r] : undefined
      const erin = [BETALING_ONTVANGEN, GELD_ONTVANGEN].includes(Number(m.type))
      const bedrag = Math.abs(Number(m.amount) || 0)
      const factuur = m.invoiceNumber?.trim()
      const label = relatie
        ? `${relatie}${factuur ? ` · factuur ${factuur}` : ''}`
        : schoon(c.d) || (factuur ? `Factuur ${factuur}` : erin ? 'Ontvangen' : 'Uitgegeven')
      const vast = !erin && c.r ? (maandenPerRelatie.get(c.r)?.size ?? 0) >= 3 : false
      const prive = !c.r && ((c.l ?? []).some(l => priveRekening.has(l)) || PRIVE.test(c.d ?? ''))
      return {
        id: `eb-${m.id}`,
        date: m.date.slice(0, 10),
        amount: erin ? bedrag : -bedrag,
        label,
        clientId: erin ? klantVan(relatie) : undefined,
        category: prive ? 'prive' : Number(m.type) === BETALING_ONTVANGEN ? 'omzet' : vast ? 'vaste lasten' : 'overig',
      }
    })

    // Vaste lasten en abonnementen: per partij omgerekend naar een maandbedrag.
    // Nog lopend = de laatste betaling is niet veel langer geleden dan de gewone tussenpoos.
    const perRelatie = new Map<number, { naam: string, data: number[], totaal: number }>()
    for (const t of transacties) {
      const r = t.category === 'vaste lasten' ? cache.mutaties[t.id.slice(3)]?.r : undefined
      if (!r) continue
      const x = perRelatie.get(r) ?? { naam: cache.relaties[r] || t.label, data: [], totaal: 0 }
      x.data.push(new Date(`${t.date}T12:00:00Z`).getTime())
      x.totaal += -t.amount
      perRelatie.set(r, x)
    }
    const abonnementen: Subscription[] = []
    for (const [r, x] of perRelatie) {
      x.data.sort((a, b) => a - b)
      const eerste = x.data[0]!
      const laatste = x.data.at(-1)!
      const poos = x.data.length > 1 ? (laatste - eerste) / (x.data.length - 1) : 30 * DAG
      if (Date.now() - laatste > poos * 1.5 + 10 * DAG) continue
      abonnementen.push({
        id: `eb-r${r}`,
        name: x.naam,
        // Elke maand: gewoon het gemiddelde bedrag. Minder vaak: omrekenen naar een maandbedrag.
        monthly: Math.round((poos <= 45 * DAG ? x.totaal / x.data.length : x.totaal / ((laatste - eerste + poos) / (30.44 * DAG))) * 100) / 100,
        kind: VASTE_LAST.test(x.naam) ? 'vaste last' : 'abonnement',
        ...(poos > 45 * DAG ? { note: `Eens per ${Math.round(poos / (30.44 * DAG))} maanden, omgerekend per maand` } : {}),
      })
    }

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
    const bestaand = new Map((rijen ?? []).filter(r => ['transactions', 'invoices', 'subscriptions'].includes(r.collection)).map(r => [`${r.collection}|${r.item_id}`, gelijkJson(r.data)]))
    const at = new Date().toISOString()
    const schrijf: Database['public']['Tables']['v2_items']['Insert'][] = []
    for (const [collection, lijst] of [['transactions', transacties], ['invoices', [...facturen.values()]], ['subscriptions', abonnementen]] as const) {
      for (const item of lijst) {
        const data = JSON.parse(JSON.stringify(item)) as Json
        if (bestaand.get(`${collection}|${item.id}`) !== gelijkJson(data)) schrijf.push({ user_id: userId, collection, item_id: item.id, data, updated_at: at })
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
    // Gestopte vaste lasten
    const abIds = new Set(abonnementen.map(a => a.id))
    const gestopt = (rijen ?? []).filter(r => r.collection === 'subscriptions' && r.item_id.startsWith('eb-') && !abIds.has(r.item_id)).map(r => r.item_id)
    if (gestopt.length) await admin.from('v2_items').delete().eq('user_id', userId).eq('collection', 'subscriptions').in('item_id', gestopt)

    await admin.from('v2_items').upsert([
      { user_id: userId, collection: '_eb', item_id: 'cache', data: cache as unknown as Json, updated_at: at },
      { user_id: userId, collection: '_sync', item_id: 'financien', data: { at, transacties: transacties.length, open: openstaand.length, nieuw: nodig.length }, updated_at: at },
    ])
    return { at, transacties: transacties.length, openFacturen: openstaand.length, openBedrag: openstaand.reduce((s, o) => s + Number(o.outstandingAmount), 0), gewijzigd: schrijf.length + weg.length + gestopt.length }
  }
  finally {
    await eb.stop()
  }
})
