export function formatDuur(minuten: number) {
  const u = Math.floor(minuten / 60)
  const m = minuten % 60
  if (u === 0) return `${m}m`
  return m === 0 ? `${u}u` : `${u}u ${m}m`
}

export function meervoud(n: number, enkel: string, meer: string) {
  return `${n} ${n === 1 ? enkel : meer}`
}
