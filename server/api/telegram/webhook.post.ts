import { serverSupabaseServiceRole } from '#supabase/server'

interface TelegramUpdate {
  message?: {
    from?: { id: number }
    chat?: { id: number }
    text?: string
    voice?: { file_id: string, mime_type?: string }
  }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody<TelegramUpdate>(event)
  const message = body.message

  if (!message?.from || !message.chat) {
    return { ok: true }
  }

  console.log(`[telegram] bericht ontvangen van from.id=${message.from.id}`)

  if (!config.telegramAllowedUserId) {
    // Setup-modus: nog geen allowed user id ingesteld. Stuur het id terug zodat
    // het als NUXT_TELEGRAM_ALLOWED_USER_ID in de omgeving gezet kan worden.
    await sendTelegramMessage(message.chat.id, `Setup: jouw Telegram user-id is ${message.from.id}. Zet deze als NUXT_TELEGRAM_ALLOWED_USER_ID en redeploy om verder te gaan.`).catch(() => {})
    return { ok: true }
  }

  if (String(message.from.id) !== String(config.telegramAllowedUserId)) {
    return { ok: true }
  }

  const chatId = message.chat.id

  try {
    const supabase = serverSupabaseServiceRole(event)

    const { data: users, error: usersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })
    const appUserId = users?.users[0]?.id
    if (usersError || !appUserId) {
      throw new Error(usersError?.message ?? 'Geen account gevonden.')
    }

    let tekst: string | undefined
    let audio: { base64: string, mimeType: string } | undefined

    if (message.voice) {
      const filePath = await getTelegramFilePath(message.voice.file_id)
      const base64 = await downloadTelegramFileAsBase64(filePath)
      audio = { base64, mimeType: message.voice.mime_type ?? 'audio/ogg' }
    } else if (message.text) {
      tekst = message.text
    } else {
      await sendTelegramMessage(chatId, 'Ik kan dit berichttype nog niet verwerken — stuur tekst of een spraakbericht.')
      return { ok: true }
    }

    const [{ data: trajecten }, { data: doelen }] = await Promise.all([
      supabase.from('trajecten').select('id, naam').eq('user_id', appUserId),
      supabase.from('doelen').select('id, naam:titel').eq('user_id', appUserId).eq('status', 'actief')
    ])

    const classificatie = await classifyTelegramBericht({
      tekst,
      audio,
      trajecten: trajecten ?? [],
      doelen: doelen ?? []
    })

    const bevestiging = await verwerkClassificatie(supabase, appUserId, classificatie, trajecten ?? [])
    await sendTelegramMessage(chatId, bevestiging)

    return { ok: true }
  } catch (error) {
    console.error('[telegram] fout bij verwerken bericht', error)
    await sendTelegramMessage(chatId, 'Er ging iets mis bij het verwerken van je bericht. Probeer het later nog eens.').catch(() => {})
    return { ok: true }
  }
})

async function verwerkClassificatie(
  supabase: ReturnType<typeof serverSupabaseServiceRole>,
  appUserId: string,
  classificatie: Awaited<ReturnType<typeof classifyTelegramBericht>>,
  trajecten: { id: string, naam: string }[]
): Promise<string> {
  let bevestiging: string
  let journalTrajectId: string | null = null
  let resultaatLabel: string
  let journalInhoud = classificatie.transcript

  switch (classificatie.type) {
    case 'nieuwe_taak': {
      const taak = classificatie.nieuweTaak
      if (!taak) throw new Error('Classificatie "nieuwe_taak" zonder nieuweTaak-data.')

      const trajectId = taak.trajectId && trajecten.some(t => t.id === taak.trajectId) ? taak.trajectId : null
      const geschatteDuur = taak.geschatteDuur ?? 30

      const { data: subtaak, error: subtaakError } = await supabase
        .from('subtaken')
        .insert({
          user_id: appUserId,
          traject_id: trajectId,
          tekst: taak.tekst,
          geschatte_duur: geschatteDuur,
          status: 'to_do'
        })
        .select('id')
        .single()

      if (subtaakError || !subtaak) throw new Error(subtaakError?.message ?? 'Kon subtaak niet aanmaken.')

      if (taak.geplandOp) {
        const { error: planError } = await supabase.from('geplande_taken').insert({
          user_id: appUserId,
          subtaak_id: subtaak.id,
          datum: taak.geplandOp,
          blok_type: taak.categorie,
          start_tijd: taak.tijd,
          geschatte_duur: geschatteDuur,
          status: 'gepland'
        })
        if (planError) throw new Error(planError.message)
      }

      const trajectNaam = trajecten.find(t => t.id === trajectId)?.naam
      const locatie = trajectNaam ? ` (${trajectNaam})` : ''
      const planning = taak.geplandOp ? ` — ingepland op ${taak.geplandOp}${taak.tijd ? ` om ${taak.tijd}` : ''}` : ''
      bevestiging = `Taak toegevoegd${locatie}: "${taak.tekst}"${planning}`
      journalTrajectId = trajectId
      resultaatLabel = `Taak aangemaakt${locatie}: "${taak.tekst}"`
      break
    }

    case 'update_traject': {
      const update = classificatie.updateTraject
      if (!update) throw new Error('Classificatie "update_traject" zonder updateTraject-data.')
      if (!trajecten.some(t => t.id === update.trajectId)) {
        bevestiging = classificatie.verduidelijkendeVraag
          ?? `Ik kon dit niet aan een bestaand traject koppelen — bedoel je een van: ${trajecten.map(t => t.naam).join(', ')}?`
        resultaatLabel = 'Verduidelijking gevraagd — traject niet herkend'
        break
      }

      const { data: traject, error } = await supabase
        .from('trajecten')
        .update({ eerstvolgende_actie: update.nieuweActie })
        .eq('id', update.trajectId)
        .eq('user_id', appUserId)
        .select('naam')
        .single()

      if (error || !traject) throw new Error(error?.message ?? 'Traject niet gevonden.')

      bevestiging = `Bijgewerkt: ${traject.naam} — nieuwe volgende stap: "${update.nieuweActie}"`
      journalTrajectId = update.trajectId
      resultaatLabel = `Volgende stap bijgewerkt bij ${traject.naam}`
      break
    }

    case 'nieuw_traject': {
      const nieuw = classificatie.nieuwTraject
      if (!nieuw) throw new Error('Classificatie "nieuw_traject" zonder nieuwTraject-data.')

      const { data: aangemaakt, error } = await supabase
        .from('trajecten')
        .insert({ user_id: appUserId, naam: nieuw.naam, status: 'actief' })
        .select('id')
        .single()
      if (error) throw new Error(error.message)

      bevestiging = `Nieuw traject aangemaakt: ${nieuw.naam}`
      journalTrajectId = aangemaakt?.id ?? null
      resultaatLabel = `Nieuw traject aangemaakt: ${nieuw.naam}`
      break
    }

    case 'journal': {
      journalInhoud = classificatie.journalInhoud ?? classificatie.transcript
      const trajectId = classificatie.journalTrajectId && trajecten.some(t => t.id === classificatie.journalTrajectId)
        ? classificatie.journalTrajectId
        : null
      const trajectNaam = trajecten.find(t => t.id === trajectId)?.naam

      bevestiging = 'Toegevoegd aan je journal.'
      journalTrajectId = trajectId
      resultaatLabel = trajectNaam ? `Losse gedachten bij ${trajectNaam}` : 'Los opgeslagen in Journal — geen traject herkend'
      break
    }

    case 'onduidelijk':
    default:
      bevestiging = classificatie.verduidelijkendeVraag ?? 'Ik heb dit bericht niet goed kunnen classificeren — kun je het anders formuleren?'
      resultaatLabel = classificatie.verduidelijkendeVraag ? `Verduidelijking gevraagd: "${classificatie.verduidelijkendeVraag}"` : 'Verduidelijking gevraagd'
      break
  }

  const { error: journalError } = await supabase.from('journal_entries').insert({
    user_id: appUserId,
    inhoud: journalInhoud,
    bron: 'telegram',
    traject_id: journalTrajectId,
    resultaat_label: resultaatLabel
  })
  if (journalError) throw new Error(journalError.message)

  return bevestiging
}
