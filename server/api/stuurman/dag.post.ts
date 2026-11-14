// De dagzin bovenaan Vandaag, geschreven door de AI. De app bewaart hem per dag, zodat dit één keer per dag gebeurt.
const MODELLEN = ['gemini-flash-latest', 'gemini-3.6-flash', 'gemini-flash-lite-latest', 'gemini-3.5-flash-lite']

export default defineEventHandler(async (event) => {
  await requireSupabaseUser(event)
  const body = await readBody<{ context?: unknown }>(event)
  const context = JSON.stringify(body?.context ?? {}).slice(0, 60000)
  const res = await genereerMetTerugval(MODELLEN, {
    contents: [{ role: 'user', parts: [{ text: `Mijn data (JSON):\n${context}` }] }],
    config: {
      systemInstruction: `Je bent Stuurman, de rustige stuurman van Martijn (zzp'er). Schrijf de openingszin voor zijn dag: één of twee korte zinnen in het Nederlands, je-vorm, max 220 tekens.
Benoem wat vandaag telt (afspraken, het belangrijkste werk, iets dat al lang wacht) en eventueel één concreet advies. Rustig, geen emoji, geen begroeting (die staat er al), geen opsomming. Alleen de zin(nen), niets anders.`,
      temperature: 0.6,
    },
  })
  const zin = (res.text ?? '').trim().replace(/^["“]|["”]$/g, '')
  if (!zin) throw createError({ statusCode: 502, statusMessage: 'Geen dagzin.' })
  return { zin }
})
