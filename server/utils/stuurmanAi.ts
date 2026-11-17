// De echte Stuurman: één plek die met Gemini praat. De sleutel blijft op de server.
// Los van ai.ts: gestructureerde antwoorden (JSON-schema uit Zod) met terugval over modellen.
import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'

/** Op volgorde: is er één overbelast of te traag, dan het volgende. Snel eerst, de grotere als terugval. */
export const STUURMAN_MODELLEN = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-flash-latest']
/** Snel eerst: voor dingen die tijdens het typen gebeuren */
export const STUURMAN_MODELLEN_SNEL = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite']

let _ai: GoogleGenAI | undefined
function getClient() {
  if (_ai) return _ai
  const key = useRuntimeConfig().geminiApiKey
  if (!key) {
    throw createError({ statusCode: 503, statusMessage: 'Geen API-sleutel. Zet NUXT_GEMINI_API_KEY in .env en start de server opnieuw.' })
  }
  // v1beta: daar staan de -latest-modellen en JSON-schema's (de standaard v1 kent ze niet)
  _ai = new GoogleGenAI({ apiKey: key, httpOptions: { apiVersion: 'v1beta' } })
  return _ai
}

/** Zod-schema naar JSON Schema voor Gemini (zonder de $schema-regel). */
function jsonSchema(schema: z.ZodType) {
  const { $schema, ...rest } = z.toJSONSchema(schema) as Record<string, unknown>
  return rest
}

/** Vraag Gemini om een antwoord dat precies in het schema past. Gecontroleerd met Zod. */
export async function askStructured<S extends z.ZodType>(opts: {
  system: string
  prompt: string
  schema: S
  timeoutMs?: number
  modellen?: string[]
}): Promise<z.infer<S>> {
  const ai = getClient()
  let laatste: unknown
  const lijst = opts.modellen ?? STUURMAN_MODELLEN
  // Twee rondes: bij drukte (503) is een model een paar seconden later vaak weer vrij
  const pogingen = [...lijst, ...lijst.map(m => `${m}#2`)]
  const traag = new Set<string>()
  for (const poging of pogingen) {
    const model = poging.replace('#2', '')
    // Wie al een time-out gaf, krijgt geen tweede kans: dan wacht je dubbel
    if (poging.endsWith('#2') && traag.has(model)) continue
    if (poging.endsWith('#2') && poging === `${lijst[0]}#2`) await new Promise(r => setTimeout(r, 1500))
    try {
      const res = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: opts.prompt }] }],
        config: {
          systemInstruction: opts.system,
          responseMimeType: 'application/json',
          responseJsonSchema: jsonSchema(opts.schema),
          temperature: 0.4,
          httpOptions: { timeout: opts.timeoutMs ?? 30000 },
        },
      })
      const text = res.text
      if (!text) throw createError({ statusCode: 502, statusMessage: `Stuurman gaf geen antwoord (${res.candidates?.[0]?.finishReason ?? 'leeg'}).` })
      const parsed = opts.schema.safeParse(JSON.parse(text))
      if (!parsed.success) throw createError({ statusCode: 502, statusMessage: 'Het antwoord van Stuurman klopte niet. Probeer het nog eens.' })
      return parsed.data
    }
    catch (e) {
      laatste = e
      const status = (e as { status?: number }).status
      console.warn(`[stuurman] ${model} mislukt:`, (e as Error).name, status ?? '', String((e as Error).message).slice(0, 200))
      // Overbelast, te veel vragen of een time-out: probeer het volgende model
      // 404: dit model bestaat (niet meer) voor deze sleutel, dus door naar het volgende
      const tijdelijk = !status || [404, 429, 500, 503, 504].includes(status)
      if (!status || status === 504 || status === 404) traag.add(model)
      if ((e as { statusCode?: number }).statusCode || !tijdelijk) break
    }
  }
  const status = (laatste as { status?: number, statusCode?: number })
  if (status.statusCode) throw laatste
  if (status.status === 400) throw createError({ statusCode: 502, statusMessage: 'Gemini weigerde de vraag (400).' })
  if (status.status === 401 || status.status === 403) throw createError({ statusCode: 503, statusMessage: 'De Gemini-sleutel klopt niet of mag dit model niet gebruiken.' })
  if (status.status === 429) throw createError({ statusCode: 429, statusMessage: 'Even te veel vragen. Probeer het zo nog eens.' })
  throw createError({ statusCode: 503, statusMessage: 'Stuurman is nu niet bereikbaar. Probeer het zo nog eens.' })
}
