import { z } from 'zod'
import { serverSupabaseServiceRole } from '#supabase/server'

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})

export default defineEventHandler(async (event) => {
  const supabase = serverSupabaseServiceRole(event)

  const { data: existing, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })
  if (listError) {
    throw createError({ statusCode: 500, statusMessage: listError.message })
  }
  if (existing.users.length > 0) {
    throw createError({ statusCode: 403, statusMessage: 'Er bestaat al een account.' })
  }

  const { email, password } = await readValidatedBody(event, bodySchema.parse)

  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message })
  }

  return { id: data.user.id, email: data.user.email }
})
