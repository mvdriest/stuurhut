export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)

  const { data, error } = await supabase
    .from('focus_sessies')
    .select(FOCUS_SESSIES_SELECT)
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
