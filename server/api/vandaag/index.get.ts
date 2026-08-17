export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)

  const { data, error } = await supabase
    .from('vandaag_prioriteiten')
    .select(VANDAAG_SELECT)
    .eq('datum', today())
    .order('volgorde', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
