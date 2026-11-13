// Agenda's ophalen (alleen lezen) en omzetten naar rijen voor `afspraken`.
// iCloud via CalDAV met een app-specifiek wachtwoord, Google via het geheime iCal-adres.
import { createHash } from 'node:crypto'
import ICAL from 'ical.js'
import { createDAVClient } from 'tsdav'

const TZ = 'Europe/Amsterdam'

export interface Bron {
  bron: 'icloud' | 'google'
  agenda: string
  /** Standaard privé of zakelijk voor deze agenda */
  domain: 'zakelijk' | 'prive'
  ics: string[]
}

export interface Voorval {
  /** Vast id, zodat dezelfde afspraak bij elke sync dezelfde rij is */
  id: string
  bron: Bron['bron']
  agenda: string
  extern: string
  titel: string
  datum: string
  start: string
  eind: string
  locatie?: string
  domain: Bron['domain']
}

// Werk, RISE en autoatlas zijn zakelijk; de rest privé (iCloud is gemengd: per afspraak om te zetten)
const ZAKELIJK = new Set(['werk', 'rise'])

/** Een uuid die altijd hetzelfde is voor dezelfde invoer. */
function vastId(...delen: string[]) {
  const h = createHash('sha1').update(delen.join('|')).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((Number.parseInt(h[16]!, 16) & 3) | 8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`
}

const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
/** Moment → { datum, tijd } in Nederlandse tijd */
function lokaal(d: Date) {
  const p = Object.fromEntries(fmt.formatToParts(d).map(x => [x.type, x.value]))
  return { datum: `${p.year}-${p.month}-${p.day}`, tijd: `${p.hour}:${p.minute}` }
}

/** Haal alle bronnen op. Wat niet lukt, komt in `fouten`; de rest gaat door. */
export async function haalBronnen(van: Date, tot: Date) {
  const bronnen: Bron[] = []
  const fouten: string[] = []

  const user = process.env.ICLOUD_USERNAME
  const pass = process.env.ICLOUD_APP_PASSWORD
  if (user && pass) {
    try {
      const client = await createDAVClient({
        serverUrl: 'https://caldav.icloud.com',
        credentials: { username: user, password: pass },
        authMethod: 'Basic',
        defaultAccountType: 'caldav',
      })
      const agendas = await client.fetchCalendars()
      for (const cal of agendas) {
        if (cal.components && !cal.components.includes('VEVENT')) continue
        const naam = typeof cal.displayName === 'string' ? cal.displayName : 'iCloud'
        const objs = await client.fetchCalendarObjects({ calendar: cal, timeRange: { start: van.toISOString(), end: tot.toISOString() } })
        bronnen.push({ bron: 'icloud', agenda: naam, domain: ZAKELIJK.has(naam.toLowerCase()) ? 'zakelijk' : 'prive', ics: objs.map(o => o.data).filter(Boolean) })
      }
    }
    catch (e) {
      fouten.push(`iCloud: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const google: [string, string | undefined, Bron['domain']][] = [
    ['Google (gmail)', process.env.GOOGLE_ICAL_GMAIL, 'prive'],
    ['Google (autoatlas)', process.env.GOOGLE_ICAL_AUTOATLAS, 'zakelijk'],
  ]
  for (const [naam, url, domain] of google) {
    if (!url) continue
    try {
      const res = await fetch(url.trim().replace(/^webcal:/, 'https:'))
      if (!res.ok) throw new Error(`status ${res.status}`)
      bronnen.push({ bron: 'google', agenda: naam, domain, ics: [await res.text()] })
    }
    catch (e) {
      fouten.push(`${naam}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return { bronnen, fouten }
}

/** Alle afspraken met een tijd in het venster, herhalingen uitgeklapt. Hele-dag-items slaan we over. */
export const telling = new Map<string, { items: number, heleDag: number, buiten: number, bytes: number }>()

export function voorvallen(bron: Bron, van: Date, tot: Date): Voorval[] {
  const uit: Voorval[] = []
  const tel = { items: 0, heleDag: 0, buiten: 0, bytes: bron.ics.reduce((s, t) => s + t.length, 0) }
  telling.set(bron.agenda, tel)
  for (const tekst of bron.ics) {
    let comp: ICAL.Component
    try {
      comp = new ICAL.Component(ICAL.parse(tekst))
    }
    catch {
      continue
    }
    for (const tz of comp.getAllSubcomponents('vtimezone')) {
      const id = tz.getFirstPropertyValue('tzid')
      if (typeof id === 'string' && !ICAL.TimezoneService.has(id)) ICAL.TimezoneService.register(tz)
    }
    // Hoofd-afspraken en hun uitzonderingen (één keer verzet of aangepast)
    const alle = comp.getAllSubcomponents('vevent').map(v => new ICAL.Event(v))
    const hoofd = new Map<string, ICAL.Event>()
    for (const ev of alle) if (!ev.isRecurrenceException()) hoofd.set(ev.uid, ev)
    for (const ev of alle) if (ev.isRecurrenceException()) hoofd.get(ev.uid)?.relateException(ev)

    for (const ev of hoofd.values()) {
      tel.items++
      if (ev.startDate?.isDate) tel.heleDag++
      if (!ev.startDate || ev.startDate.isDate) continue
      if (String(ev.component.getFirstPropertyValue('status') ?? '').toUpperCase() === 'CANCELLED') continue
      const voeg = (start: ICAL.Time, eind: ICAL.Time, item: ICAL.Event, sleutel: string) => {
        const s = start.toJSDate()
        const e = eind.toJSDate()
        if (e <= van || s >= tot) return
        if (String(item.component.getFirstPropertyValue('status') ?? '').toUpperCase() === 'CANCELLED') return
        // Over middernacht heen: per dag een stuk
        let stuk = s
        while (stuk < e) {
          const l = lokaal(stuk)
          // Het eerste kwartier waarop de Nederlandse datum verandert
          let grens = e
          for (let t = stuk.getTime() + 15 * 60000; t < e.getTime(); t += 15 * 60000) {
            if (lokaal(new Date(t)).datum !== l.datum) { grens = new Date(t); break }
          }
          const eindL = lokaal(grens)
          uit.push({
            id: vastId(bron.bron, bron.agenda, item.uid, sleutel, l.datum),
            bron: bron.bron,
            agenda: bron.agenda,
            extern: item.uid,
            titel: (item.summary || '(zonder titel)').trim(),
            datum: l.datum,
            start: l.tijd,
            eind: eindL.datum === l.datum ? eindL.tijd : '23:59',
            locatie: item.location?.trim() || undefined,
            domain: bron.domain,
          })
          stuk = grens
        }
      }
      if (ev.isRecurring()) {
        const it = ev.iterator()
        let n = 0
        for (let t = it.next(); t && n < 2000; t = it.next(), n++) {
          if (t.toJSDate() >= tot) break
          const d = ev.getOccurrenceDetails(t)
          voeg(d.startDate, d.endDate, d.item, t.toString())
        }
      }
      else {
        voeg(ev.startDate, ev.endDate, ev, '')
      }
    }
  }
  tel.buiten = tel.items - tel.heleDag - new Set(uit.map(u => u.extern)).size
  return uit
}
