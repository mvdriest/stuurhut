// Elke 5 minuten aangeroepen door de cron (NUXT_CRON_SECRET): verstuurt de seintjes die nu aan de beurt zijn.
// Elk seintje gaat hooguit één keer per dag; wat meer dan 20 minuten te laat is, slaan we over.
import { timingSafeEqual } from 'node:crypto'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database, Json } from '../../../app/types/database.types'
import type { AppState, Routine } from '../../../app/types'
import { laptopTarget } from '../../../app/utils/sleep'
import type { Melding } from '../../utils/push'

const TZ = 'Europe/Amsterdam'
const SPELING_MIN = 20
const DAGSTART_UITERLIJK = '10:00'
const STUURMAN_OM = '09:30'

const STANDAARD: Pick<AppState['prefs'], 'reminders' | 'workHours' | 'sleep'> = {
  reminders: {},
  workHours: { days: [1, 2, 3, 4, 5], start: '08:30', end: '17:30' },
  sleep: { startWake: '08:00', goalWake: '08:00', startedOn: '2026-01-05', stepMin: 15, needH: 8, windDownMin: 60, weeks: {} },
}

function nuInNederland() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' }).formatToParts(new Date()).map(x => [x.type, x.value]))
  const datum = `${p.year}-${p.month}-${p.day}`
  return { datum, min: Number(p.hour) * 60 + Number(p.minute), weekdag: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday!) }
}
const minuten = (t: string) => { const [h, m] = t.split(':').map(Number); return h! * 60 + m! }
const morgen = (iso: string) => new Date(new Date(`${iso}T12:00:00Z`).getTime() + 86400000).toISOString().slice(0, 10)

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const header = getHeader(event, 'authorization') ?? ''
  const verwacht = `Bearer ${config.cronSecret}`
  if (!config.cronSecret || header.length !== verwacht.length || !timingSafeEqual(Buffer.from(header), Buffer.from(verwacht))) {
    throw createError({ statusCode: 401, statusMessage: 'Onbekende sleutel.' })
  }

  const admin = serverSupabaseServiceRole<Database>(event)
  const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 })
  const userId = users?.users[0]?.id
  if (!userId) throw createError({ statusCode: 500, statusMessage: 'Geen account gevonden.' })

  const { data: rijen } = await admin.from('v2_items').select('collection, item_id, data').eq('user_id', userId).in('collection', ['push', '_state', 'routines', '_push'])
  if (!rijen?.some(r => r.collection === 'push')) return { verstuurd: [], reden: 'geen toestellen' }

  const staat = (id: string) => rijen.find(r => r.collection === '_state' && r.item_id === id)?.data as Record<string, unknown> | undefined
  const prefs = { ...STANDAARD, ...(staat('prefs') as Partial<AppState['prefs']> | undefined) }
  const rituals = (staat('rituals') ?? {}) as Partial<AppState['rituals']>
  const evenings = (staat('evenings') ?? {}) as AppState['evenings']
  const routines = rijen.filter(r => r.collection === 'routines').map(r => r.data as unknown as Routine)
  const log = ((rijen.find(r => r.collection === '_push' && r.item_id === 'verstuurd')?.data ?? {}) as Record<string, string>)

  const nu = nuInNederland()
  const werkdag = prefs.workHours.days.includes(nu.weekdag)
  const kandidaten: (Melding & { sleutel: string, om: string })[] = []

  // 1. Herinneringen die je bij een routine hebt ingesteld
  for (const [id, om] of Object.entries(prefs.reminders ?? {})) {
    const r = routines.find(x => x.id === id)
    if (!r || (r.days?.length && !r.days.includes(nu.weekdag)) || r.log?.[nu.datum]?.done) continue
    kandidaten.push({ sleutel: `routine:${id}`, om, title: r.name, body: r.cue ? `${r.cue}. Tijd voor ${r.name.toLowerCase()}.` : `Tijd voor ${r.name.toLowerCase()}.`, url: '/ritme', tag: `routine-${id}` })
  }

  if (werkdag) {
    // 2. Dagstart nog niet gedaan
    if (!rituals.dayStart?.[nu.datum]) {
      kandidaten.push({ sleutel: 'dagstart', om: DAGSTART_UITERLIJK, title: 'Dagstart', body: 'Nog geen koers voor vandaag. Twee minuten: hoe sliep je en wat telt er?', url: '/dagstart', tag: 'dagstart' })
    }
    // 3. Dag afsluiten aan het eind van je werktijd
    if (!rituals.dayEnd?.[nu.datum]) {
      kandidaten.push({ sleutel: 'afsluiten', om: prefs.workHours.end, title: 'Dag afsluiten', body: 'Je werktijd zit erop. Sluit af, dan ligt alles klaar voor morgen.', url: '/afsluiten', tag: 'afsluiten' })
    }
    // 5. Eén voorstel van Stuurman per dag: wie wacht er het langst?
    const { data: trajecten } = await admin.from('trajecten').select('id, naam, wacht_op, updated_at, extra, status').eq('user_id', userId).not('wacht_op', 'is', null)
    const wacht = (trajecten ?? [])
      .filter(t => t.status !== 'afgerond' && t.wacht_op?.trim())
      .map((t) => {
        const sinds = ((t.extra ?? {}) as { waitingSince?: string }).waitingSince ?? t.updated_at
        return { t, dagen: Math.floor((Date.now() - new Date(sinds).getTime()) / 86400000) }
      })
      .filter(x => x.dagen >= 5 && !Object.entries(log).some(([k, d]) => k === `wacht:${x.t.id}` && Date.now() - new Date(d).getTime() < 3 * 86400000))
      .sort((a, b) => b.dagen - a.dagen)[0]
    if (wacht) {
      kandidaten.push({ sleutel: 'stuurman', om: STUURMAN_OM, title: 'Stuurman', body: `${wacht.t.naam} wacht al ${wacht.dagen} dagen op ${wacht.t.wacht_op}. Even navragen?`, url: '/opdrachten', tag: 'stuurman', wacht: wacht.t.id } as Melding & { sleutel: string, om: string, wacht: string })
    }
  }

  // 4. Laptop dicht, zodat je op tijd slaapt
  if (!evenings[nu.datum]?.closedAt) {
    try {
      const om = laptopTarget({ ...STANDAARD.sleep, ...prefs.sleep }, morgen(nu.datum))
      kandidaten.push({ sleutel: 'laptop', om, title: 'Laptop dicht', body: 'Tijd om af te bouwen. Dan lig je op tijd in bed.', url: '/ritme', tag: 'laptop' })
    }
    catch { /* geen slaapplan */ }
  }

  const verstuurd: string[] = []
  for (const k of kandidaten) {
    const sleutel = `${nu.datum}|${k.sleutel}`
    const teLaat = nu.min - minuten(k.om)
    if (log[sleutel] || teLaat < 0 || teLaat > SPELING_MIN) continue
    const { gelukt } = await verstuur(admin, userId, { title: k.title, body: k.body, url: k.url, tag: k.tag })
    if (gelukt) {
      const at = new Date().toISOString()
      log[sleutel] = at
      const w = (k as { wacht?: string }).wacht
      if (w) log[`wacht:${w}`] = at
      verstuurd.push(k.sleutel)
    }
  }

  if (verstuurd.length) {
    // Alleen de laatste week bewaren
    const grens = Date.now() - 7 * 86400000
    const schoon = Object.fromEntries(Object.entries(log).filter(([, d]) => new Date(d).getTime() > grens))
    await admin.from('v2_items').upsert({ user_id: userId, collection: '_push', item_id: 'verstuurd', data: schoon as Json, updated_at: new Date().toISOString() })
  }
  return { nu: `${nu.datum} ${Math.floor(nu.min / 60)}:${String(nu.min % 60).padStart(2, '0')}`, kandidaten: kandidaten.map(k => `${k.sleutel}@${k.om}`), verstuurd }
})
