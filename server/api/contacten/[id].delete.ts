// Trajecten met dit contact als reisgenoot houden hun klant, alleen zonder contact.
export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)
  const id = requireRouterParam(event, 'id')

  const { data, error } = await supabase.from('contacten').delete().eq('id', id).select('id').single()
  if (error || !data) throw createError({ statusCode: 404, statusMessage: 'Contact niet gevonden.' })
  return { success: true }
})
