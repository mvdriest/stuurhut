const eur = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })
const eur0 = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const num1 = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1, minimumFractionDigits: 1 })

/** € 4.250,00 */
export const euro = (n: number) => eur.format(n).replace(/ /g, ' ')
/** € 4.250 */
export const euroRound = (n: number) => eur0.format(Math.round(n)).replace(/ /g, ' ')
export const dec1 = (n: number) => num1.format(n)
export const duration = (min: number) =>
  min < 60 ? `${min} min` : min % 60 === 0 ? `${min / 60} uur` : `${Math.floor(min / 60)} u ${min % 60} min`

export const uid = (prefix = 'id') => `${prefix}-${Math.random().toString(36).slice(2, 9)}`

export function initials(name: string) {
  const skip = new Set(['de', 'het', 'van', 'aan', 'en'])
  const parts = name.split(/\s+/).filter(p => !skip.has(p.toLowerCase()))
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
