// Plan mijn week: Stuurman kiest wat het meeste oplevert en zet het op een plek die past.
// De app stuurt alleen vrije tijd en kandidaten mee. Het voorstel komt terug als concept.
import { z } from 'zod'

const Window = z.object({ start: z.string(), end: z.string() })
const Input = z.object({
  today: z.string(),
  now: z.string(),
  wish: z.string().max(600).optional(),
  focus: z.array(z.string().max(200)).max(10),
  morningFocus: z.boolean(),
  days: z.array(z.object({
    date: z.string(),
    weekday: z.string(),
    load: z.enum(['rustig', 'normaal', 'vol']),
    energy: z.number().nullable(),
    work: z.array(Window),
    evening: z.array(Window),
  })).max(7),
  items: z.array(z.object({
    id: z.string(),
    title: z.string().max(300),
    durationMin: z.number(),
    kind: z.string(),
    domain: z.enum(['zakelijk', 'prive']),
    deep: z.boolean(),
    source: z.enum(['taak', 'opdracht']),
    due: z.string().optional(),
    priority: z.string().optional(),
    moved: z.number().optional(),
    important: z.boolean().optional(),
    client: z.string().optional(),
    partOf: z.string().optional(),
    step: z.number().optional(),
  })).max(80),
  goals: z.array(z.object({ name: z.string(), current: z.number(), target: z.number() })).max(10),
  lateInvoices: z.number(),
})

const Output = z.object({
  summary: z.string().describe('Twee zinnen: waar deze week om draait en waarom'),
  top3: z.array(z.string()).describe('Maximaal 3 item-ids: wat deze week het meeste oplevert'),
  blocks: z.array(z.object({
    itemId: z.string(),
    date: z.string().describe('YYYY-MM-DD, een van de gegeven dagen'),
    start: z.string().describe('HH:MM op een kwartier, binnen een vrij venster'),
    durationMin: z.number().int().describe('Meestal de duur van het item. Korter alleen voor een eerste stap.'),
    why: z.string().describe('Eén korte zin waarom hier en nu'),
  })),
  fallback: z.object({ itemId: z.string(), why: z.string() }).nullable().describe('Het ene blok dat blijft als de week tegenzit'),
  leftOut: z.array(z.object({ itemId: z.string(), why: z.string() })).describe('Wat je bewust niet inplant deze week'),
})
export type PlanResult = z.infer<typeof Output>

const SYSTEM = `Je bent Stuurman, de planningshulp in Stuurhut, een app voor een zelfstandige die zijn werk en privé zelf regelt.
Je maakt een voorstel voor de komende werkdagen. De gebruiker beslist, jij stelt voor. Schrijf kort en gewoon Nederlands.

Hoe je kiest wat het productiefst is, in deze volgorde:
1. Impact: wat geld oplevert of een doel dichterbij brengt (offertes, facturen, betaald klantwerk), en wat in de focus of de wens van de gebruiker staat.
2. Urgentie: deadlines die deze week of kort erna vallen.
3. Wat blijft liggen: een item dat vaak is doorgeschoven (moved 2 of meer) is waarschijnlijk te groot of te vaag. Plan dan alleen een eerste stap van 15 of 30 minuten, en zeg dat in het waarom.
4. Energie: denkwerk (deep) op de ochtenden en op dagen met hogere energie. Admin en kleine taken na de lunch of op drukke dagen.
5. Minder schakelen: admin bij elkaar in een blok, werk voor dezelfde klant liefst op dezelfde dag. Subtaken van dezelfde taak in hun volgorde (step).

Grenzen:
- Plan alleen binnen de gegeven vrije vensters. Zakelijk werk in "work", privé in "evening". Niets overlapt, ook niet met elkaar.
- Vul hoogstens zo'n 70% van de vrije werktijd per dag. Ruimte is geen verspilling.
- Volle dagen ("vol") krijgen weinig of niets extra.
- Gebruik alleen item-ids uit de lijst. Elk item hoogstens één keer.
- Niet alles hoeft erin. Wat je niet plant en wel belangrijk lijkt, zet je in leftOut met een reden.`

export default defineEventHandler(async (event) => {
  await requireSupabaseUser(event)
  const body = Input.safeParse(await readBody(event))
  if (!body.success) throw createError({ statusCode: 400, statusMessage: 'Ongeldige planningsvraag.' })
  const d = body.data
  if (!d.items.length) throw createError({ statusCode: 400, statusMessage: 'Er is niets om in te plannen.' })
  const prompt = `Vandaag is ${d.today}, het is nu ${d.now}. Denkwerk 's ochtends: ${d.morningFocus ? 'ja' : 'geen voorkeur'}.

Wens van de gebruiker voor deze week: ${d.wish?.trim() || '(geen)'}
Focus uit de weekreview: ${d.focus.length ? d.focus.join('; ') : '(geen)'}
Doelen: ${d.goals.map(g => `${g.name} ${g.current}/${g.target}`).join('; ') || '(geen)'}
Te late facturen: ${d.lateInvoices}

Dagen en vrije vensters (JSON):
${JSON.stringify(d.days)}

Kandidaten (JSON):
${JSON.stringify(d.items)}`
  return await askStructured({ system: SYSTEM, prompt, schema: Output, timeoutMs: 45000 })
})
