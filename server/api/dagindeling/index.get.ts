export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)

  const { data, error } = await supabase
    .from('dag_blokken')
    .select(DAGBLOKKEN_SELECT)
    .order('weekdag', { ascending: true })
    .order('volgorde', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
