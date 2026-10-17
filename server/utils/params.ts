import type { H3Event } from 'h3'

// getRouterParam is typed `string | undefined`; for our `[id]` routes a missing param
// can only mean a malformed request, so fail with a 400 instead of querying `.eq('id', undefined)`.
export function requireRouterParam(event: H3Event, name: string): string {
  const value = getRouterParam(event, name)
  if (!value) throw createError({ statusCode: 400, statusMessage: `Parameter '${name}' ontbreekt.` })
  return value
}
