export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)
  const trajectId = getRouterParam(event, 'id')

  const { data, error } = await supabase
    .from('traject_bestanden')
    .select(TRAJECT_BESTANDEN_SELECT)
    .eq('traject_id', trajectId)
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
