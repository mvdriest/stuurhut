export function today(): string {
  return new Date().toLocaleDateString('en-CA')
}

// ISO-weekdag: 1 = maandag ... 7 = zondag
export function isoWeekday(datum: string): number {
  const jsDag = new Date(`${datum}T00:00:00`).getDay()
  return jsDag === 0 ? 7 : jsDag
}

export function addDays(datum: string, aantal: number): string {
  const d = new Date(`${datum}T00:00:00`)
  d.setDate(d.getDate() + aantal)
  return d.toLocaleDateString('en-CA')
}

// De 7 dagen vanaf vandaag (rollende week), als YYYY-MM-DD strings.
export function komendeWeek(): string[] {
  const start = today()
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}
