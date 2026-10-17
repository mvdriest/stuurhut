export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)
  const id = requireRouterParam(event, 'id')

  const { error } = await supabase.from('traject_haltes').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true }
})
