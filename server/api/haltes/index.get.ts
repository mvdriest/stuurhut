export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)

  const { data, error } = await supabase
    .from('traject_haltes')
    .select(TRAJECT_HALTES_SELECT)
    .order('volgorde')

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
