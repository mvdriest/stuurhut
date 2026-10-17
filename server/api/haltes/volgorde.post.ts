import { z } from 'zod'

const bodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1)
})

export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)
  const { ids } = await readValidatedBody(event, bodySchema.parse)
  await hernummer(supabase, ids)
  return { ok: true }
})
