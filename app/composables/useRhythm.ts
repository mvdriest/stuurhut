function isoWeek(iso: string) {
  const d = fromISO(iso)
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  return Math.ceil(((t.getTime() - y0.getTime()) / 86400000 + 1) / 7)
}

export function useRhythm() {
  const { state } = useStore()

  const days = computed(() => state.value.rhythm)

  /** Zes weken, gemiddeld per week. */
  const weeks = computed(() => {
    const out: { label: string, sleep: number, move: number, energy: number, work: number }[] = []
    for (let w = 0; w < 6; w++) {
      // De laatste zes weken (de testdata gaat verder terug, voor de terugblik)
      const base = Math.max(0, state.value.rhythm.length - 42)
      const slice = state.value.rhythm.slice(base + w * 7, base + w * 7 + 7)
      // Nog niet genoeg dagen: alleen de weken die er zijn
      if (!slice.length) continue
      const avg = (f: (d: typeof slice[number]) => number) => slice.reduce((s, d) => s + f(d), 0) / slice.length
      out.push({
        label: `wk ${isoWeek(slice[0]!.date)}`,
        sleep: avg(d => d.sleepH),
        move: avg(d => d.moveMin),
        energy: avg(d => d.energy),
        work: slice.reduce((s, d) => s + d.workH, 0),
      })
    }
    return out
  })

  const todayEnergy = computed(() => state.value.checkins[todayISO()] ?? null)
  function checkIn(energy: number) {
    state.value.checkins[todayISO()] = energy
  }

  return { days, weeks, todayEnergy, checkIn }
}
