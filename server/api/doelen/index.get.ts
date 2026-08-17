export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)

  const [doelenRes, mijlpalenRes] = await Promise.all([
    supabase.from('doelen').select(DOELEN_SELECT).order('volgorde', { ascending: true }).order('created_at', { ascending: true }),
    supabase.from('doel_mijlpalen').select(DOEL_MIJLPALEN_SELECT).order('volgorde', { ascending: true }).order('created_at', { ascending: true })
  ])

  if (doelenRes.error) throw createError({ statusCode: 500, statusMessage: doelenRes.error.message })
  if (mijlpalenRes.error) throw createError({ statusCode: 500, statusMessage: mijlpalenRes.error.message })

  return doelenRes.data.map(doel => ({
    ...doel,
    mijlpalen: mijlpalenRes.data.filter(mijlpaal => mijlpaal.doelId === doel.id)
  }))
})
