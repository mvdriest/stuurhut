// Vaste waarden voor acquisitie: de stappen van de pipeline en het wekelijkse blok.
import type { LeadStage, LostReason } from '~/types'

/** De stappen van de pipeline, in volgorde. "niet nu" staat er los van. */
export const LEAD_STAGES: Exclude<LeadStage, 'niet nu'>[] = ['gespot', 'benaderd', 'gesprek', 'offerte']

export const STAGE_LABEL: Record<LeadStage, string> = {
  'gespot': 'Gespot',
  'benaderd': 'Benaderd',
  'gesprek': 'Gesprek',
  'offerte': 'Offerte',
  'niet nu': 'Niet nu',
}

/** Na zoveel dagen even opvolgen, per stap. */
export const FOLLOW_UP_DAYS: Record<LeadStage, number | null> = {
  'gespot': 3,
  'benaderd': 5,
  'gesprek': 3,
  'offerte': 7,
  'niet nu': 90,
}

/** Waarom je een lead of klant kwijtraakte. Kort, zodat je het echt invult. */
export const LOST_REASONS: LostReason[] = ['te duur', 'andere partij', 'geen budget', 'geen reactie', 'niet het moment', 'niet tevreden', 'anders']

export const ACQUISITION_TITLE = 'Acquisitie: leads benaderen en opvolgen'
export const ACQUISITION_MIN = 45
