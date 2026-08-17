export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)

  const periode = komendeWeek()
  const taken = await haalGeplandeTaken(supabase, periode[0]!, periode[periode.length - 1]!)

  return { periode, taken }
})
