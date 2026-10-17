import { z } from 'zod'
import { DIENSTEN } from '~/utils/route'

// Leest een vrije beschrijving ("Nieuwe klant Bakkerij Jansen, website + foto, Piet 06…")
// en geeft een concept terug om het nieuw-traject-venster mee te vullen. Er wordt hier
// niets opgeslagen: de gebruiker bevestigt eerst, daarna gaat het via de gewone POST.

const bodySchema = z.object({
  zin: z.string().trim().min(3).max(1000)
})

// AI-output nooit blind vertrouwen: elk veld dat niet klopt wordt null in plaats van een fout.
const leeg = (s: unknown) => (typeof s === 'string' && s.trim() ? s.trim() : null)
const conceptSchema = z.object({
  naam: z.unknown().transform(leeg),
  scope: z.enum(['zakelijk', 'prive']).nullable().catch(null),
  diensten: z.array(z.unknown()).catch([]).transform(ds => [...new Set(ds)].filter((d): d is typeof DIENSTEN[number] => DIENSTEN.includes(d as never))),
  contactpersoon: z.unknown().transform(leeg),
  contactTelefoon: z.unknown().transform(leeg),
  contactEmail: z.string().trim().email().nullable().catch(null),
  bedragAfgesproken: z.number().nonnegative().finite().nullable().catch(null),
  eerstvolgendeActie: z.unknown().transform(leeg),
  streefdatum: z.string().regex(DATUM_REGEX).nullable().catch(null)
})

export default defineEventHandler(async (event) => {
  await requireSupabaseUser(event)
  const { zin } = await readValidatedBody(event, bodySchema.parse)
  const concept = await leesTrajectUitZin(zin)
  return conceptSchema.parse(concept)
})
