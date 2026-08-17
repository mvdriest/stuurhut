import { GoogleGenAI, Type } from '@google/genai'

const MODEL = 'gemini-flash-lite-latest'

let _ai: GoogleGenAI | undefined

function getClient() {
  if (_ai) return _ai

  const config = useRuntimeConfig()
  if (!config.geminiApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'GEMINI_API_KEY ontbreekt in de server-configuratie.' })
  }

  _ai = new GoogleGenAI({ apiKey: config.geminiApiKey })
  return _ai
}

export interface DagBlokInput {
  datum: string
  weekdag: number
  blokType: 'prive' | 'zakelijk'
  startTijd: string
  eindTijd: string
}

export interface TrajectInput {
  id: string
  naam: string
  status: string
  eerstvolgendeActie: string | null
}

export interface OpenSubtaakInput {
  id: string
  trajectId: string | null
  tekst: string
  geschatteDuur: number
}

export interface VasteTaakInput {
  datum: string
  blokType: 'prive' | 'zakelijk'
  startTijd: string | null
  geschatteDuur: number
  omschrijving: string
}

export interface CorrectieInput {
  omschrijving: string
  geschatteDuur: number
  aangepasteDuur: number
  context: string | null
}

export interface WeekplanningSubtaak {
  trajectId: string | null
  tekst: string
  geschatteDuur: number
}

export interface WeekplanningItem {
  datum: string
  blokType: 'prive' | 'zakelijk'
  startTijd: string | null
  geschatteDuur: number
  subtaakIndex: number | null
  vrijeTekst: string | null
}

export interface WeekplanningResult {
  nieuweSubtaken: WeekplanningSubtaak[]
  planning: WeekplanningItem[]
}

const weekplanningSchema = {
  type: Type.OBJECT,
  properties: {
    nieuweSubtaken: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          trajectId: { type: Type.STRING, nullable: true },
          tekst: { type: Type.STRING },
          geschatteDuur: { type: Type.INTEGER, description: 'Geschatte duur in minuten' }
        },
        required: ['tekst', 'geschatteDuur']
      }
    },
    planning: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          datum: { type: Type.STRING, description: 'YYYY-MM-DD' },
          blokType: { type: Type.STRING, enum: ['prive', 'zakelijk'] },
          startTijd: { type: Type.STRING, nullable: true, description: 'HH:MM, optioneel' },
          geschatteDuur: { type: Type.INTEGER },
          subtaakIndex: { type: Type.INTEGER, nullable: true, description: 'Index in nieuweSubtaken, of null als dit een bestaande openstaande subtaak is (zie subtaakId)' },
          subtaakId: { type: Type.STRING, nullable: true, description: 'Id van een bestaande openstaande subtaak, of null' },
          vrijeTekst: { type: Type.STRING, nullable: true, description: 'Alleen invullen als dit item geen subtaak is' }
        },
        required: ['datum', 'blokType', 'geschatteDuur']
      }
    }
  },
  required: ['nieuweSubtaken', 'planning']
}

export async function genereerWeekplanning(input: {
  dagBlokken: DagBlokInput[]
  trajecten: TrajectInput[]
  openstaandeSubtaken: OpenSubtaakInput[]
  vasteTaken: VasteTaakInput[]
  correcties: CorrectieInput[]
}): Promise<WeekplanningResult & { planning: (WeekplanningItem & { subtaakId: string | null })[] }> {
  const ai = getClient()

  const prompt = `Je bent een persoonlijke planningsassistent. Plan de week van deze zelfstandig ondernemer in op basis van onderstaande gegevens.

BESCHIKBARE BLOKKEN DEZE PERIODE (niet plannen buiten deze blokken):
${JSON.stringify(input.dagBlokken, null, 2)}

REEDS VASTGEZETTE TAKEN (hou hier rekening mee, plan er niet overheen):
${JSON.stringify(input.vasteTaken, null, 2)}

LOPENDE TRAJECTEN (splits "eerstvolgendeActie" op in concrete subtaken als dat nuttig is, met een realistische tijdsinschatting in minuten per subtaak):
${JSON.stringify(input.trajecten, null, 2)}

OPENSTAANDE SUBTAKEN VAN EERDERE PLANNINGEN (nog niet ingepland of nog niet klaar — neem deze mee):
${JSON.stringify(input.openstaandeSubtaken, null, 2)}

EERDERE CORRECTIES VAN DE GEBRUIKER OP TIJDSINSCHATTINGEN (leer hiervan: als vergelijkbaar werk vaker langer/korter duurde dan geschat, pas je inschatting daarop aan):
${JSON.stringify(input.correcties, null, 2)}

INSTRUCTIES:
- Plan alleen zakelijke taken/trajecten in "zakelijk" blokken en persoonlijke zaken in "prive" blokken.
- Splits grote trajecten in meerdere kleine, concrete subtaken in plaats van één groot blok.
- Vul per subtaak een realistische geschatteDuur in minuten in.
- Plan niet meer taken in een blok dan er tijd beschikbaar is (som van geschatteDuur per blok <= blokduur).
- Gebruik voor bestaande openstaande subtaken het veld "subtaakId" (niet subtaakIndex) in de planning; voor nieuw gesplitste subtaken gebruik je "subtaakIndex" (index in nieuweSubtaken) en laat subtaakId leeg.
- Los, niet aan een traject gekoppeld werk mag je als "vrijeTekst" plannen.
- Geef alleen geldige JSON terug volgens het schema.`

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: weekplanningSchema
    }
  })

  const text = response.text
  if (!text) {
    throw createError({ statusCode: 502, statusMessage: 'De AI gaf geen planning terug.' })
  }

  return JSON.parse(text)
}

export interface HerplanTaakInput {
  id: string
  omschrijving: string
  geschatteDuur: number
  huidigeDatum: string
  huidigeBlokType: 'prive' | 'zakelijk'
  huidigeStartTijd: string | null
}

export interface HerplanWijziging {
  id: string
  datum: string
  blokType: 'prive' | 'zakelijk'
  startTijd: string | null
}

const herplanSchema = {
  type: Type.OBJECT,
  properties: {
    wijzigingen: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          datum: { type: Type.STRING, description: 'YYYY-MM-DD' },
          blokType: { type: Type.STRING, enum: ['prive', 'zakelijk'] },
          startTijd: { type: Type.STRING, nullable: true }
        },
        required: ['id', 'datum', 'blokType']
      }
    }
  },
  required: ['wijzigingen']
}

export async function herplanTaken(input: {
  taken: HerplanTaakInput[]
  vasteTaken: VasteTaakInput[]
  dagBlokken: DagBlokInput[]
  reden: string
}): Promise<{ wijzigingen: HerplanWijziging[] }> {
  const ai = getClient()

  const prompt = `Je bent een persoonlijke planningsassistent. De gebruiker heeft aangegeven dat de huidige planning niet past en waarom. Herplan de onderstaande taken zodat ze wel passen, met behoud van zoveel mogelijk van de rest van de planning.

REDEN VAN DE GEBRUIKER:
"${input.reden}"

TE HERPLANNEN TAKEN (mag je verplaatsen naar een andere dag/blok/tijd):
${JSON.stringify(input.taken, null, 2)}

REEDS VASTGEZETTE TAKEN (mag je niet verplaatsen of overschrijven):
${JSON.stringify(input.vasteTaken, null, 2)}

BESCHIKBARE BLOKKEN (niet plannen buiten deze blokken, en niet meer tijd gebruiken dan een blok toelaat rekening houdend met de vastgezette taken erin):
${JSON.stringify(input.dagBlokken, null, 2)}

Geef voor elke taak uit "TE HERPLANNEN TAKEN" een wijziging terug met hetzelfde id en de nieuwe datum/blokType/startTijd. Alleen geldige JSON volgens het schema.`

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: herplanSchema
    }
  })

  const text = response.text
  if (!text) {
    throw createError({ statusCode: 502, statusMessage: 'De AI gaf geen herplanning terug.' })
  }

  return JSON.parse(text)
}
