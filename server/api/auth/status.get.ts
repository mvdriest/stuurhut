import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = serverSupabaseServiceRole(event)
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { setupDone: data.users.length > 0 }
})
