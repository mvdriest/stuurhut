import { z } from 'zod'
import { TRAJECT_KLEUREN } from '~/utils/kleuren'

const bodySchema = z.object({
  naam: z.string().min(1).optional(),
  status: z.enum(['actief', 'wachtend', 'on_hold']).optional(),
  eerstvolgendeActie: z.string().nullable().optional(),
  kleur: z.enum(TRAJECT_KLEUREN).optional(),
  doelId: z.string().uuid().nullable().optional(),
  scope: z.enum(['zakelijk', 'prive']).optional(),
  wachtOp: z.string().nullable().optional(),
  streefdatum: z.string().nullable().optional(),
  bedragAfgesproken: z.number().nullable().optional(),
  bedragGefactureerd: z.number().nullable().optional(),
  financieelNotitie: z.string().nullable().optional(),
  contactpersoon: z.string().nullable().optional(),
  contactTelefoon: z.string().nullable().optional(),
  contactEmail: z.string().nullable().optional(),
  contactVoorkeur: z.string().nullable().optional()
})

export default defineEventHandler(async (event) => {
  const { supabase } = await requireSupabaseUser(event)
  const id = getRouterParam(event, 'id')
  const updates = await readValidatedBody(event, bodySchema.parse)

  const { data, error } = await supabase
    .from('trajecten')
    .update({
      naam: updates.naam,
      status: updates.status,
      eerstvolgende_actie: updates.eerstvolgendeActie,
      kleur: updates.kleur,
      doel_id: updates.doelId,
      scope: updates.scope,
      wacht_op: updates.wachtOp,
      streefdatum: updates.streefdatum,
      bedrag_afgesproken: updates.bedragAfgesproken,
      bedrag_gefactureerd: updates.bedragGefactureerd,
      financieel_notitie: updates.financieelNotitie,
      contactpersoon: updates.contactpersoon,
      contact_telefoon: updates.contactTelefoon,
      contact_email: updates.contactEmail,
      contact_voorkeur: updates.contactVoorkeur,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select(TRAJECTEN_SELECT)
    .single()

  if (error || !data) throw createError({ statusCode: 404, statusMessage: 'Traject niet gevonden.' })
  return data
})
