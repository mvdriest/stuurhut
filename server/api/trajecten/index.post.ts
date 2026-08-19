import { z } from 'zod'
import { TRAJECT_KLEUREN } from '~/utils/kleuren'

const bodySchema = z.object({
  naam: z.string().min(1),
  status: z.enum(['actief', 'wachtend', 'on_hold']).default('actief'),
  eerstvolgendeActie: z.string().optional(),
  kleur: z.enum(TRAJECT_KLEUREN).default('grijs'),
  doelId: z.string().uuid().nullable().optional(),
  scope: z.enum(['zakelijk', 'prive']).default('zakelijk'),
  wachtOp: z.string().optional(),
  streefdatum: z.string().optional(),
  bedragAfgesproken: z.number().nullable().optional(),
  bedragGefactureerd: z.number().nullable().optional(),
  financieelNotitie: z.string().optional(),
  contactpersoon: z.string().optional(),
  contactTelefoon: z.string().optional(),
  contactEmail: z.string().optional(),
  contactVoorkeur: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireSupabaseUser(event)
  const body = await readValidatedBody(event, bodySchema.parse)

  const { data, error } = await supabase
    .from('trajecten')
    .insert({
      user_id: user.id,
      naam: body.naam,
      status: body.status,
      eerstvolgende_actie: body.eerstvolgendeActie,
      kleur: body.kleur,
      doel_id: body.doelId ?? null,
      scope: body.scope,
      wacht_op: body.wachtOp,
      streefdatum: body.streefdatum,
      bedrag_afgesproken: body.bedragAfgesproken,
      bedrag_gefactureerd: body.bedragGefactureerd,
      financieel_notitie: body.financieelNotitie,
      contactpersoon: body.contactpersoon,
      contact_telefoon: body.contactTelefoon,
      contact_email: body.contactEmail,
      contact_voorkeur: body.contactVoorkeur
    })
    .select(TRAJECTEN_SELECT)
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
