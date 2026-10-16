// De server draait in productie in UTC (Vercel); "vandaag" moet de Nederlandse
// kalenderdag zijn, anders verspringt alles tussen 00:00 en 02:00 naar gisteren.
export const TIJDZONE = 'Europe/Amsterdam'

export const DATUM_REGEX = /^\d{4}-\d{2}-\d{2}$/
export const TIJD_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

export function today(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TIJDZONE })
}

// ISO-weekdag: 1 = maandag ... 7 = zondag
export function isoWeekday(datum: string): number {
  const jsDag = new Date(`${datum}T00:00:00Z`).getUTCDay()
  return jsDag === 0 ? 7 : jsDag
}

export function addDays(datum: string, aantal: number): string {
  const d = new Date(`${datum}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + aantal)
  return d.toISOString().slice(0, 10)
}

// De 7 dagen vanaf vandaag (rollende week), als YYYY-MM-DD strings.
export function komendeWeek(): string[] {
  const start = today()
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}
