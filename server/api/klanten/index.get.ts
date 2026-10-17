export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)

  // Plat ophalen en in JS samenvoegen, net als bij doelen en mijlpalen.
  const [klanten, contacten] = await Promise.all([
    supabase.from('klanten').select(KLANTEN_SELECT).order('naam'),
    supabase.from('contacten').select(CONTACTEN_SELECT).order('naam')
  ])
  if (klanten.error) throw createError({ statusCode: 500, statusMessage: klanten.error.message })
  if (contacten.error) throw createError({ statusCode: 500, statusMessage: contacten.error.message })

  return {
    klanten: klanten.data.map(k => ({ ...k, contacten: contacten.data.filter(c => c.klantId === k.id) })),
    losseContacten: contacten.data.filter(c => !c.klantId)
  }
})
