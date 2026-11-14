// Stuurman met echte AI (Gemini). De app stuurt je vraag, de laatste berichten en een samenvatting van je data.
import { Type } from '@google/genai'

const MODEL = 'gemini-flash-latest'

const SYSTEEM = `Je bent Stuurman, de rustige stuurman naast Martijn, een zzp'er (webbouwer/ontwerper, Batavia Digital) die zelf de koers bepaalt.
Je helpt hem overzicht houden over zijn dag, klanten, trajecten, geld en ritme (slaap, energie, routines).

Stijl:
- Nederlands, je-vorm, kort en concreet. Meestal 1–4 zinnen; een korte opsomming mag als dat helpt.
- Rustig en vriendelijk, nooit belerend of opgewonden. Geen emoji. Geen "Als AI…".
- Doe één helder voorstel in plaats van vijf opties. Noem tijden, namen en dagen uit de data.
- Gebruik alleen de data die je krijgt. Weet je iets niet, zeg dat kort en vraag het.
- Je kunt zelf niets aanpassen in de app. Wil hij iets toevoegen (taak, afspraak, klant, notitie), zeg dan dat hij het kan typen als "Nieuwe afspraak: …", "Nieuwe taak: …", "Nieuwe klant: …" of "Onthoud: …".
- Geef 0–3 korte vervolgvragen (chips) die hij waarschijnlijk wil stellen, in zijn woorden, max 6 woorden.`

const schema = {
  type: Type.OBJECT,
  properties: {
    tekst: { type: Type.STRING },
    chips: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['tekst'],
}

export default defineEventHandler(async (event) => {
  await requireSupabaseUser(event)
  const body = await readBody<{ vraag?: string, geschiedenis?: { rol: 'user' | 'stuurman', tekst: string }[], context?: unknown }>(event)
  const vraag = String(body?.vraag ?? '').trim().slice(0, 2000)
  if (!vraag) throw createError({ statusCode: 400, statusMessage: 'Geen vraag.' })
  const geschiedenis = (body.geschiedenis ?? []).slice(-12).map(m => ({
    role: m.rol === 'user' ? 'user' : 'model',
    parts: [{ text: String(m.tekst ?? '').slice(0, 1500) }],
  }))
  const context = JSON.stringify(body.context ?? {}).slice(0, 60000)

  const ai = getClient()
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: [
      ...geschiedenis,
      { role: 'user', parts: [{ text: `Mijn data nu (JSON):\n${context}\n\nMijn vraag: ${vraag}` }] },
    ],
    config: { systemInstruction: SYSTEEM, responseMimeType: 'application/json', responseSchema: schema, temperature: 0.5 },
  })
  const tekst = res.text
  if (!tekst) throw createError({ statusCode: 502, statusMessage: 'Stuurman gaf geen antwoord.' })
  const uit = JSON.parse(tekst) as { tekst: string, chips?: string[] }
  return { tekst: uit.tekst.trim(), chips: (uit.chips ?? []).filter(Boolean).slice(0, 3) }
})
