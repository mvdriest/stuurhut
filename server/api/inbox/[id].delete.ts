export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)
  const id = getRouterParam(event, 'id')

  const { data, error } = await supabase
    .from('inbox_items')
    .delete()
    .eq('id', id)
    .select('id')
    .single()

  if (error || !data) throw createError({ statusCode: 404, statusMessage: 'Item niet gevonden.' })
  return { success: true }
})
