export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)
  const id = getRouterParam(event, 'id')

  const { data, error } = await supabase
    .from('subtaken')
    .delete()
    .eq('id', id)
    .select('id')
    .single()

  if (error || !data) throw createError({ statusCode: 404, statusMessage: 'Taak niet gevonden.' })
  return { success: true }
})
