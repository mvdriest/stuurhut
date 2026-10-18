import { z } from 'zod'
import { TRAJECT_KLEUREN } from '~/utils/kleuren'
import type { Dienst } from '~/utils/route'
import { DIENSTEN } from '~/utils/route'

const bodySchema = z.object({
  naam: z.string().min(1).optional(),
  status: z.enum(['actief', 'wachtend', 'on_hold']).optional(),
  eerstvolgendeActie: z.string().nullable().optional(),
  kleur: z.enum(TRAJECT_KLEUREN).optional(),
  doelId: z.string().uuid().nullable().optional(),
  scope: z.enum(['zakelijk', 'prive']).optional(),
  wachtOp: z.string().nullable().optional(),
  streefdatum: z.string().regex(DATUM_REGEX).nullable().or(z.literal('').transform(() => null)).optional(),
  bedragAfgesproken: z.number().nullable().optional(),
  bedragGefactureerd: z.number().nullable().optional(),
  financieelNotitie: z.string().nullable().optional(),
  diensten: z.array(z.enum(DIENSTEN)).optional()
}).merge(koppelingSchema)

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireSupabaseUser(event)
  const id = requireRouterParam(event, 'id')
  const updates = await readValidatedBody(event, bodySchema.parse)
  // Een nieuw contact zonder klantkeuze hoort bij de klant die het traject al heeft.
  let koppeling = updates
  if (updates.contact && updates.klantId === undefined && !updates.klantNaam) {
    const { data: huidig } = await supabase.from('trajecten').select('klant_id').eq('id', id).single()
    koppeling = { ...updates, klantId: huidig?.klant_id ?? undefined }
  }
  const { klantId, contactId: gekoppeld } = await koppelKlantEnContact(supabase, user.id, koppeling)

  // Andere klant gekozen: een reisgenoot van de vorige klant past daar niet meer bij.
  let contactId = gekoppeld
  if (klantId && contactId === undefined) {
    const { data: huidig } = await supabase.from('trajecten').select('contact:contacten(klant_id)').eq('id', id).single()
    const contactKlant = (huidig?.contact as { klant_id: string | null } | null)?.klant_id
    if (contactKlant && contactKlant !== klantId) contactId = null
  }

  let vorigeDiensten: Dienst[] = []
  if (updates.diensten) {
    const { data: huidig } = await supabase.from('trajecten').select('diensten').eq('id', id).single()
    vorigeDiensten = (huidig?.diensten ?? []) as Dienst[]
  }

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
      klant_id: klantId,
      contact_id: contactId,
      diensten: updates.diensten,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select(TRAJECTEN_SELECT)
    .single()

  if (error || !data) throw createError({ statusCode: 404, statusMessage: 'Traject niet gevonden.' })
  if (updates.diensten) await synchroniseerRoute(supabase, user.id, id, updates.diensten, vorigeDiensten)
  return data
})
