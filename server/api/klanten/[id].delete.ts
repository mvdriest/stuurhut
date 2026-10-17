// Contacten van de klant gaan mee (cascade); trajecten blijven bestaan, zonder klant.
export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)
  const id = requireRouterParam(event, 'id')

  const { data, error } = await supabase.from('klanten').delete().eq('id', id).select('id').single()
  if (error || !data) throw createError({ statusCode: 404, statusMessage: 'Klant niet gevonden.' })
  return { success: true }
})
