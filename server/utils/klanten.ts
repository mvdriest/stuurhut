import { z } from 'zod'

type Supabase = Awaited<ReturnType<typeof requireSupabaseUser>>['supabase']

// Adressen bij deze providers zeggen niets over de organisatie: een mail van
// iemand@gmail.com mag later niet aan "de klant met gmail.com" gekoppeld worden.
const PARTICULIERE_DOMEINEN = new Set([
  'gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.nl', 'outlook.com', 'outlook.nl',
  'live.com', 'live.nl', 'msn.com', 'icloud.com', 'me.com', 'mac.com', 'yahoo.com', 'yahoo.nl',
  'ziggo.nl', 'kpnmail.nl', 'kpnplanet.nl', 'planet.nl', 'home.nl', 'hetnet.nl', 'xs4all.nl',
  'casema.nl', 'chello.nl', 'upcmail.nl', 'telfort.nl', 'quicknet.nl', 'tele2.nl', 'online.nl',
  'proton.me', 'protonmail.com', 'gmx.com', 'gmx.net', 'gmx.nl'
])

/** Het domein van een zakelijk e-mailadres, of null voor particuliere providers. */
export function zakelijkDomein(email: string | null | undefined): string | null {
  const domein = email?.trim().toLowerCase().split('@')[1]
  if (!domein || !domein.includes('.') || PARTICULIERE_DOMEINEN.has(domein)) return null
  return domein
}

/**
 * Wie hoort er bij een traject: een bestaande klant (klantId), een klant op naam
 * (gevonden of aangemaakt), en het hoofdcontact (bestaand via id, of nieuw — een
 * bekend e-mailadres wordt hergebruikt in plaats van dubbel aangemaakt).
 * `klantId: null` / `contact: null` ontkoppelt; weglaten laat het zoals het is.
 */
export const koppelingSchema = z.object({
  klantId: z.string().uuid().nullable().optional(),
  klantNaam: z.string().trim().min(1).optional(),
  contact: z.object({
    id: z.string().uuid().optional(),
    naam: z.string().trim().optional(),
    email: z.string().trim().email().or(z.literal('')).optional(),
    telefoon: z.string().trim().optional(),
    voorkeur: z.string().trim().optional(),
    rol: z.string().trim().optional()
  }).nullable().optional()
})

export type Koppeling = z.infer<typeof koppelingSchema>

const leeg = (s: string | undefined) => (s ? s : null)

async function zoekOfMaakKlant(supabase: Supabase, userId: string, naam: string) {
  // ilike zonder jokertekens = hoofdletterongevoelig exact; % en _ uit de naam escapen.
  const patroon = naam.replace(/[\\%_]/g, c => `\\${c}`)
  const { data: bestaand } = await supabase.from('klanten').select('id').ilike('naam', patroon).limit(1)
  if (bestaand?.[0]) return bestaand[0].id

  const { data, error } = await supabase.from('klanten').insert({ user_id: userId, naam }).select('id').single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data.id
}

/** Zet het domein van een zakelijk adres bij de klant, zodat mail later herkend wordt. */
export async function leerDomein(supabase: Supabase, klantId: string, email: string | null | undefined) {
  const domein = zakelijkDomein(email)
  if (!domein) return
  const { data: klant } = await supabase.from('klanten').select('domeinen').eq('id', klantId).single()
  if (!klant || klant.domeinen.includes(domein)) return
  await supabase.from('klanten').update({ domeinen: [...klant.domeinen, domein] }).eq('id', klantId)
}

/** Geeft de ids terug om op het traject te zetten; `undefined` = niet aanraken. */
export async function koppelKlantEnContact(supabase: Supabase, userId: string, k: Koppeling) {
  let klantId: string | null | undefined = k.klantId
  if (klantId === undefined && k.klantNaam) klantId = await zoekOfMaakKlant(supabase, userId, k.klantNaam)

  let contactId: string | null | undefined
  const c = k.contact
  if (c === null) {
    contactId = null
  } else if (c) {
    // Alleen meegestuurde velden aanpassen, zodat bijv. een rol niet wegvalt.
    const velden = {
      ...(c.naam !== undefined && { naam: c.naam || c.email || c.telefoon || 'Contact' }),
      ...(c.email !== undefined && { email: leeg(c.email) }),
      ...(c.telefoon !== undefined && { telefoon: leeg(c.telefoon) }),
      ...(c.voorkeur !== undefined && { voorkeur: leeg(c.voorkeur) }),
      ...(c.rol !== undefined && { rol: leeg(c.rol) }),
      updated_at: new Date().toISOString()
    }
    let id = c.id
    if (!id && c.email) {
      const { data } = await supabase.from('contacten').select('id').ilike('email', c.email.replace(/[\\%_]/g, x => `\\${x}`)).limit(1)
      id = data?.[0]?.id
    }
    if (id) {
      const { error } = await supabase.from('contacten')
        .update({ ...velden, ...(klantId ? { klant_id: klantId } : {}) })
        .eq('id', id)
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
      contactId = id
    } else if (c.naam || c.email || c.telefoon) {
      const { data, error } = await supabase.from('contacten')
        .insert({ ...velden, naam: c.naam || c.email || c.telefoon || 'Contact', user_id: userId, klant_id: klantId ?? null })
        .select('id')
        .single()
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
      contactId = data.id
    } else {
      contactId = null
    }
    if (klantId) await leerDomein(supabase, klantId, c.email)
  }

  return { klantId, contactId }
}
