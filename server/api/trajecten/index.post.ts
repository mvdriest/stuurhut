import { z } from 'zod'
import { TRAJECT_KLEUREN } from '~/utils/kleuren'
import { DIENSTEN } from '~/utils/route'

const bodySchema = z.object({
  naam: z.string().min(1),
  status: z.enum(['actief', 'wachtend', 'on_hold']).default('actief'),
  eerstvolgendeActie: z.string().optional(),
  kleur: z.enum(TRAJECT_KLEUREN).default('grijs'),
  doelId: z.string().uuid().nullable().optional(),
  scope: z.enum(['zakelijk', 'prive']).default('zakelijk'),
  wachtOp: z.string().optional(),
  streefdatum: z.string().regex(DATUM_REGEX).or(z.literal('').transform(() => undefined)).optional(),
  bedragAfgesproken: z.number().nullable().optional(),
  bedragGefactureerd: z.number().nullable().optional(),
  financieelNotitie: z.string().optional(),
  diensten: z.array(z.enum(DIENSTEN)).default([])
}).merge(koppelingSchema)

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireSupabaseUser(event)
  const body = await readValidatedBody(event, bodySchema.parse)

  // Een zakelijk traject zonder gekozen klant krijgt de klant met dezelfde naam
  // (bestaand of nieuw): zo hangt een tweede traject voor dezelfde klant er vanzelf aan.
  const { klantId, contactId } = await koppelKlantEnContact(supabase, user.id, {
    ...body,
    klantNaam: body.klantNaam ?? (body.scope === 'zakelijk' && body.klantId === undefined ? body.naam : undefined)
  })

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
      klant_id: klantId ?? null,
      contact_id: contactId ?? null,
      diensten: body.diensten
    })
    .select(TRAJECTEN_SELECT)
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  await synchroniseerRoute(supabase, user.id, data.id, body.diensten, [])
  return data
})
