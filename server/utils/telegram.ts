function getBotToken() {
  const config = useRuntimeConfig()
  if (!config.telegramBotToken) {
    throw createError({ statusCode: 500, statusMessage: 'TELEGRAM_BOT_TOKEN ontbreekt in de server-configuratie.' })
  }
  return config.telegramBotToken
}

function apiUrl(method: string) {
  return `https://api.telegram.org/bot${getBotToken()}/${method}`
}

export async function sendTelegramMessage(chatId: number, text: string) {
  await $fetch(apiUrl('sendMessage'), {
    method: 'POST',
    body: { chat_id: chatId, text }
  })
}

interface TelegramFile {
  file_id: string
  file_path?: string
}

export async function getTelegramFilePath(fileId: string): Promise<string> {
  const response = await $fetch<{ ok: boolean, result: TelegramFile }>(apiUrl('getFile'), {
    method: 'POST',
    body: { file_id: fileId }
  })

  const filePath = response.result.file_path
  if (!filePath) {
    throw createError({ statusCode: 502, statusMessage: 'Telegram gaf geen file_path terug.' })
  }
  return filePath
}

export async function downloadTelegramFileAsBase64(filePath: string): Promise<string> {
  const url = `https://api.telegram.org/file/bot${getBotToken()}/${filePath}`
  const buffer = await $fetch<ArrayBuffer>(url, { responseType: 'arrayBuffer' })
  return Buffer.from(buffer).toString('base64')
}
