// Een taak opdelen: een user story, wanneer het klaar is, en subtaken die je los kunt inplannen.
import { z } from 'zod'

const Input = z.object({
  title: z.string().min(2).max(300),
  kind: z.enum(['taak', 'focus', 'admin', 'persoonlijk']),
  domain: z.enum(['zakelijk', 'prive']),
  durationMin: z.number().int().min(5).max(960),
  clientName: z.string().max(120).optional(),
})

const Output = z.object({
  worthSplitting: z.boolean().describe('false als de taak al klein en concreet genoeg is'),
  reason: z.string().describe('Eén korte zin waarom wel of niet opdelen'),
  story: z.object({
    asA: z.string().describe('De rol, zonder "Als"'),
    iWant: z.string().describe('Wat er moet kunnen, zonder "wil ik"'),
    soThat: z.string().describe('Het waarom, zonder "zodat"'),
  }).nullable(),
  criteria: z.array(z.string()).describe('2 tot 4 toetsbare punten: wanneer is het klaar'),
  subtasks: z.array(z.object({
    title: z.string().describe('Begint met een werkwoord, maximaal 8 woorden'),
    durationMin: z.number().int().describe('15, 30, 45, 60, 90 of 120'),
    kind: z.enum(['taak', 'focus', 'admin', 'persoonlijk']),
    deep: z.boolean().describe('Denkwerk dat het best past als de energie hoog is'),
  })),
})
export type BreakdownResult = z.infer<typeof Output>

const SYSTEM = `Je bent Stuurman, de planningshulp in Stuurhut, een app voor een zelfstandige die zijn werk en privé zelf regelt.
Je deelt een taak op in werkbare stappen. Schrijf in gewoon, kort Nederlands, zonder jargon.

Regels:
- Is de taak al klein en concreet (een telefoontje, één mail, iets van een kwartier), zet dan worthSplitting op false, story op null en geef lege lijsten.
- Anders: schrijf één user story. Bij zakelijk werk is de rol meestal de klant of de eindgebruiker, niet de zelfstandige zelf. Bij privé is de rol "ik".
- Geef 2 tot 4 criteria die je kunt afvinken.
- Geef 3 tot 6 subtaken, in de volgorde waarin je ze doet. De eerste subtaak is altijd een eerste stap van 15 minuten die zo klein is dat beginnen makkelijk wordt.
- Elke subtaak duurt 15, 30, 45, 60, 90 of 120 minuten. Samen komen ze ongeveer uit op de geschatte duur, maar wees eerlijk als het meer werk is.
- Verzin geen feiten over de klant. Blijf bij wat de titel zegt.`

export default defineEventHandler(async (event) => {
  await requireSupabaseUser(event)
  const body = Input.safeParse(await readBody(event))
  if (!body.success) throw createError({ statusCode: 400, statusMessage: 'Ongeldige taak.' })
  const t = body.data
  const prompt = [
    `Taak: ${t.title}`,
    `Soort: ${t.kind}, ${t.domain}`,
    `Geschatte duur: ${t.durationMin} minuten`,
    t.clientName ? `Klant: ${t.clientName}` : null,
  ].filter(Boolean).join('\n')
  return await askStructured({ system: SYSTEM, prompt, schema: Output, timeoutMs: 12000, modellen: STUURMAN_MODELLEN_SNEL })
})
