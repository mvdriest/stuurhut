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

export interface TelegramTrajectInput {
  id: string
  naam: string
}

export interface TelegramDoelInput {
  id: string
  naam: string
}

export interface TelegramClassificatie {
  transcript: string
  type: 'nieuwe_taak' | 'update_traject' | 'nieuw_traject' | 'journal' | 'onduidelijk'
  nieuweTaak: {
    tekst: string
    trajectId: string | null
    categorie: 'zakelijk' | 'prive'
    geschatteDuur: number | null
    geplandOp: string | null
    tijd: string | null
  } | null
  updateTraject: {
    trajectId: string
    nieuweActie: string
  } | null
  nieuwTraject: {
    naam: string
  } | null
  journalInhoud: string | null
  verduidelijkendeVraag: string | null
}

const telegramClassificatieSchema = {
  type: Type.OBJECT,
  properties: {
    transcript: { type: Type.STRING, description: 'Letterlijke (getranscribeerde) tekst van het bericht' },
    type: { type: Type.STRING, enum: ['nieuwe_taak', 'update_traject', 'nieuw_traject', 'journal', 'onduidelijk'] },
    nieuweTaak: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        tekst: { type: Type.STRING },
        trajectId: { type: Type.STRING, nullable: true },
        categorie: { type: Type.STRING, enum: ['zakelijk', 'prive'] },
        geschatteDuur: { type: Type.INTEGER, nullable: true, description: 'Minuten, alleen als goed in te schatten' },
        geplandOp: { type: Type.STRING, nullable: true, description: 'YYYY-MM-DD, alleen als een moment genoemd wordt' },
        tijd: { type: Type.STRING, nullable: true, description: 'HH:MM, alleen als een tijdstip genoemd wordt' }
      },
      required: ['tekst', 'categorie']
    },
    updateTraject: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        trajectId: { type: Type.STRING },
        nieuweActie: { type: Type.STRING }
      },
      required: ['trajectId', 'nieuweActie']
    },
    nieuwTraject: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        naam: { type: Type.STRING }
      },
      required: ['naam']
    },
    journalInhoud: { type: Type.STRING, nullable: true },
    verduidelijkendeVraag: { type: Type.STRING, nullable: true }
  },
  required: ['transcript', 'type']
}

export async function classifyTelegramBericht(input: {
  tekst?: string
  audio?: { base64: string, mimeType: string }
  trajecten: TelegramTrajectInput[]
  doelen: TelegramDoelInput[]
}): Promise<TelegramClassificatie> {
  const ai = getClient()

  const prompt = `Je bent een assistent die inkomende Telegram-berichten van de gebruiker classificeert voor de persoonlijke planning-app Stuurhut.

${input.tekst ? `BERICHT (tekst):\n"${input.tekst}"` : 'BERICHT: zie het bijgevoegde spraakbericht (audio). Transcribeer dit eerst naar tekst.'}

VANDAAG IS: ${today()} (YYYY-MM-DD)

BESTAANDE OPEN TRAJECTEN VAN DE GEBRUIKER (koppel het bericht hieraan als het hierover gaat, in plaats van iets nieuws aan te maken):
${JSON.stringify(input.trajecten, null, 2)}

ACTIEVE DOELEN VAN DE GEBRUIKER (alleen ter context, niet om zelf iets in weg te schrijven):
${JSON.stringify(input.doelen, null, 2)}

Classificeer het bericht als precies één "type":
- "nieuwe_taak": een nieuwe, concrete actie die de gebruiker wil doen. Vul "nieuweTaak" in: een korte "tekst", optioneel een "trajectId" uit de lijst hierboven (anders null), een "categorie" ("zakelijk" of "prive"), een "geschatteDuur" in minuten als dat goed te schatten is (anders null), en als de gebruiker een moment noemt ook "geplandOp" (YYYY-MM-DD, relatief aan vandaag) en "tijd" (HH:MM) — anders beide null.
- "update_traject": een update op een BESTAAND traject uit de lijst hierboven (bijv. een nieuwe eerstvolgende actie). Vul "updateTraject" in met het exacte "trajectId" uit de lijst en de nieuwe omschrijving als "nieuweActie". Gebruik dit type alleen als het traject duidelijk in de lijst voorkomt.
- "nieuw_traject": de gebruiker start een volledig nieuw traject dat niet in de lijst voorkomt. Vul "nieuwTraject" in met de "naam".
- "journal": een observatie, gedachte of dagboek-notitie zonder concrete actie of trajectkoppeling. Vul "journalInhoud" in met de tekst voor het journal.
- "onduidelijk": gebruik dit als geen van bovenstaande met voldoende zekerheid past, of als het onduidelijk is welk traject bedoeld wordt. Vul "verduidelijkendeVraag" in met een korte, concrete vraag die je terugstuurt naar de gebruiker.

Vul altijd "transcript" in. Vul alleen het object in dat bij het gekozen "type" hoort, laat de overige velden op null. Geef alleen geldige JSON terug volgens het schema.`

  const parts: object[] = [{ text: prompt }]
  if (input.audio) {
    parts.push({ inlineData: { mimeType: input.audio.mimeType, data: input.audio.base64 } })
  }

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: telegramClassificatieSchema
    }
  })

  const text = response.text
  if (!text) {
    throw createError({ statusCode: 502, statusMessage: 'De AI gaf geen classificatie terug.' })
  }

  return JSON.parse(text)
}
