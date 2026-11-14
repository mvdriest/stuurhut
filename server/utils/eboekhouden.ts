// e-Boekhouden REST API (alleen lezen). Sleutel: EBOEKHOUDEN_TOKEN (Beheer → API-token → "e-Boekhouden API").
const BASIS = 'https://api.e-boekhouden.nl'

export interface EbMutatieKort { id: number, type: number, date: string, invoiceNumber?: string, ledgerId?: number, amount: number, entryNumber?: string }
export interface EbMutatie { id: number, type: number, date: string, description?: string, termOfPayment?: number, relationId?: number, invoiceNumber?: string }
export interface EbOpenstaand { date: string, mutationId: number, invoiceNumber: string, relationId: number, relationCode?: string, company?: string, totalAmount: number, paidAmount: number, outstandingAmount: number }

export async function ebSessie() {
  const token = process.env.EBOEKHOUDEN_TOKEN?.trim()
  if (!token) throw createError({ statusCode: 500, statusMessage: 'EBOEKHOUDEN_TOKEN ontbreekt.' })
  const res = await fetch(`${BASIS}/v1/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken: token, source: 'Stuurhut' }),
  })
  if (!res.ok) throw createError({ statusCode: 502, statusMessage: `e-Boekhouden inloggen: ${res.status} ${(await res.text()).slice(0, 200)}` })
  const { token: sessie } = await res.json() as { token: string }

  async function get<T>(pad: string, query: Record<string, string | number> = {}): Promise<T> {
    const qs = new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)])).toString()
    const r = await fetch(`${BASIS}${pad}${qs ? `?${qs}` : ''}`, { headers: { Authorization: sessie, Accept: 'application/json' } })
    if (!r.ok) throw new Error(`${pad}: ${r.status} ${(await r.text()).slice(0, 200)}`)
    return r.json() as Promise<T>
  }
  /** Alle pagina's van een lijst */
  async function alles<T>(pad: string, query: Record<string, string | number> = {}) {
    const uit: T[] = []
    for (let offset = 0; offset < 20000; offset += 2000) {
      const p = await get<{ items: T[], count: number }>(pad, { ...query, limit: 2000, offset })
      uit.push(...p.items)
      if (p.items.length < 2000 || uit.length >= p.count) break
    }
    return uit
  }
  async function stop() {
    await fetch(`${BASIS}/v1/session`, { method: 'DELETE', headers: { Authorization: sessie } }).catch(() => {})
  }
  return { get, alles, stop }
}

/** Een paar tegelijk, zodat we e-Boekhouden niet overspoelen. */
export async function perStuk<T, U>(lijst: T[], n: number, fn: (x: T) => Promise<U>) {
  const uit: U[] = []
  for (let i = 0; i < lijst.length; i += n) uit.push(...await Promise.all(lijst.slice(i, i + n).map(fn)))
  return uit
}
