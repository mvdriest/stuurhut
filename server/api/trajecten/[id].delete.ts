export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)
  const id = getRouterParam(event, 'id')

  const { data, error } = await supabase
    .from('trajecten')
    .delete()
    .eq('id', id)
    .select('id')
    .single()

  if (error || !data) throw createError({ statusCode: 404, statusMessage: 'Traject niet gevonden.' })
  return { success: true }
})
