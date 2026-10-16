export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)

  const { data, error } = await supabase
    .from('afspraken')
    .select(AFSPRAKEN_SELECT)
    .order('datum', { ascending: true })
    .order('start_tijd', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
