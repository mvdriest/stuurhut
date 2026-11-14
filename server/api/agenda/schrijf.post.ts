// Afspraken die je in Stuurhut maakt, ook in je Apple-agenda zetten (iCloud).
// Zakelijk → agenda "Werk", privé → agenda "Agenda". Afspraken die uit je agenda komen, slaan we over.
// Body: { opslaan: id[], weg: id[] }
import { createDAVClient } from 'tsdav'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '../../../app/types/database.types'

const AGENDA = { zakelijk: 'werk', prive: 'agenda' } as const

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
const stempel = (datum: string, tijd: string) => `${datum.replace(/-/g, '')}T${tijd.slice(0, 5).replace(':', '')}00`

const VTIMEZONE = [
  'BEGIN:VTIMEZONE', 'TZID:Europe/Amsterdam',
  'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
  'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
  'END:VTIMEZONE',
]

function ics(r: { id: string, titel: string, datum: string, start_tijd: string, eind_tijd: string, locatie?: string }) {
  let eind = r.eind_tijd.slice(0, 5)
  if (eind <= r.start_tijd.slice(0, 5)) eind = '23:59'
  const nu = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Stuurhut//NL', 'CALSCALE:GREGORIAN',
    ...VTIMEZONE,
    'BEGIN:VEVENT',
    `UID:stuurhut-${r.id}`,
    `DTSTAMP:${nu}`,
    `LAST-MODIFIED:${nu}`,
    `DTSTART;TZID=Europe/Amsterdam:${stempel(r.datum, r.start_tijd)}`,
    `DTEND;TZID=Europe/Amsterdam:${stempel(r.datum, eind)}`,
    `SUMMARY:${esc(r.titel)}`,
    ...(r.locatie ? [`LOCATION:${esc(r.locatie)}`] : []),
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n')
}

export default defineEventHandler(async (event) => {
  const { user } = await requireSupabaseUser(event)
  const body = await readBody<{ opslaan?: string[], weg?: string[] }>(event)
  const isId = (x: unknown): x is string => typeof x === 'string' && /^[0-9a-f-]{36}$/i.test(x)
  const opslaan = (body?.opslaan ?? []).filter(isId).slice(0, 100)
  const weg = (body?.weg ?? []).filter(isId).slice(0, 100)
  if (!opslaan.length && !weg.length) return { ok: true, opgeslagen: 0, weg: 0 }

  const username = process.env.ICLOUD_USERNAME
  const password = process.env.ICLOUD_APP_PASSWORD
  if (!username || !password) throw createError({ statusCode: 500, statusMessage: 'iCloud is niet gekoppeld.' })
  const auth = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`

  const client = await createDAVClient({ serverUrl: 'https://caldav.icloud.com', credentials: { username, password }, authMethod: 'Basic', defaultAccountType: 'caldav' })
  const agendas = await client.fetchCalendars()
  const url = (naam: string) => agendas.find(c => typeof c.displayName === 'string' && c.displayName.toLowerCase() === naam)?.url
  const werk = url(AGENDA.zakelijk)
  const prive = url(AGENDA.prive)
  if (!werk || !prive) {
    throw createError({ statusCode: 500, statusMessage: `Agenda "Werk" of "Agenda" niet gevonden in iCloud (wel: ${agendas.map(c => c.displayName).join(', ')}).` })
  }
  const doelen = { zakelijk: werk, prive }
  const href = (cal: string, id: string) => new URL(`${id}.ics`, cal.endsWith('/') ? cal : `${cal}/`).href
  const verwijder = async (cal: string, id: string) => {
    const res = await fetch(href(cal, id), { method: 'DELETE', headers: { Authorization: auth } })
    if (!res.ok && res.status !== 404) throw new Error(`verwijderen: status ${res.status}`)
  }

  const admin = serverSupabaseServiceRole<Database>(event)
  const fouten: string[] = []
  let opgeslagen = 0

  if (opslaan.length) {
    const { data: rijen } = await admin.from('afspraken').select('id, titel, datum, start_tijd, eind_tijd, categorie, extra').eq('user_id', user.id).in('id', opslaan)
    for (const r of rijen ?? []) {
      const x = (r.extra ?? {}) as { bron?: string, location?: string, cancelled?: boolean, domain?: string }
      if (x.bron) continue
      const soort = (x.domain ?? (r.categorie === 'prive' ? 'prive' : 'zakelijk')) === 'prive' ? 'prive' : 'zakelijk'
      const ander = soort === 'prive' ? 'zakelijk' : 'prive'
      try {
        if (x.cancelled) {
          await verwijder(doelen[soort], r.id)
        }
        else {
          const res = await fetch(href(doelen[soort], r.id), {
            method: 'PUT',
            headers: { 'Authorization': auth, 'Content-Type': 'text/calendar; charset=utf-8' },
            body: ics({ ...r, locatie: x.location }),
          })
          if (!res.ok) throw new Error(`status ${res.status}: ${(await res.text()).slice(0, 200)}`)
          opgeslagen++
        }
        // Van privé naar zakelijk (of andersom): uit de andere agenda halen
        await verwijder(doelen[ander], r.id)
      }
      catch (e) {
        fouten.push(`${r.titel}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  for (const id of weg) {
    try {
      await verwijder(doelen.zakelijk, id)
      await verwijder(doelen.prive, id)
    }
    catch (e) {
      fouten.push(`verwijderen: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  if (fouten.length) console.error('agenda schrijven', fouten)
  return { ok: !fouten.length, opgeslagen, weg: weg.length, fouten }
})
