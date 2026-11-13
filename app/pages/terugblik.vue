<script setup lang="ts">
// Terugblik: de afgelopen vier weken naast de vier daarvoor. Kleine winst zie je pas als je terugkijkt.
useHead({ title: 'Terugblik · Stuurhut' })
const root = ref<HTMLElement | null>(null)
useMotion(root)

const { state } = useStore()
const today = todayISO()
const P = computed(() => comparePeriods(state.value, today))
const now = computed(() => P.value.now)
const before = computed(() => P.value.before)

// ---------- Wat er af is ----------
const doneTiles = computed(() => [
  { label: 'Opdrachten klaar', value: `${now.value.done.length}`, icon: 'tabler:layout-kanban' },
  { label: 'Uren gewerkt', value: `${Math.round(now.value.hours)} u`, icon: 'tabler:briefcase' },
  { label: 'Gefactureerd', value: euroRound(now.value.invoiced), icon: 'tabler:receipt' },
  { label: 'Offertes verstuurd', value: `${now.value.quotes}`, icon: 'tabler:send' },
  { label: 'Keer een routine gedaan', value: `${now.value.routinesDone}`, icon: 'tabler:repeat' },
  { label: 'Dingen die goed gingen', value: `${now.value.wins}`, icon: 'tabler:heart' },
])

// ---------- Wat er beter gaat ----------
type Row = { id: string, label: string, before: string, now: string, state: 'beter' | 'gelijk' | 'minder', text: string }
const rows = computed<Row[]>(() => {
  const out: Row[] = []
  const b = before.value
  const n = now.value
  if (b.energy !== null && n.energy !== null) {
    const d = n.energy - b.energy
    out.push({ id: 'energie', label: 'Energie', before: dec1(b.energy), now: dec1(n.energy), state: d >= 0.15 ? 'beter' : d <= -0.15 ? 'minder' : 'gelijk', text: d >= 0.15 ? `Je geeft je energie gemiddeld ${dec1(d)} punt hoger.` : d <= -0.15 ? `Je energie is ${dec1(-d)} punt lager. Dat is een reden om rustiger aan te doen, niet om harder te duwen.` : 'Je energie is ongeveer gelijk.' })
  }
  if (b.wake && n.wake) {
    const d = clockMin(b.wake) - clockMin(n.wake)
    out.push({ id: 'op', label: 'Op, doordeweeks', before: b.wake, now: n.wake, state: d >= 5 ? 'beter' : d <= -5 ? 'minder' : 'gelijk', text: d >= 5 ? `Je staat doordeweeks ${minText(d)} eerder op.` : d <= -5 ? `Je staat ${minText(-d)} later op dan eerst.` : 'Je opstaantijd is gelijk gebleven.' })
  }
  if (b.freeEvenings && n.freeEvenings) {
    const pb = b.freeEvenings.free / b.freeEvenings.of
    const pn = n.freeEvenings.free / n.freeEvenings.of
    out.push({ id: 'avonden', label: 'Avonden zonder werk', before: `${Math.round(pb * 100)}%`, now: `${Math.round(pn * 100)}%`, state: pn - pb >= 0.05 ? 'beter' : pb - pn >= 0.05 ? 'minder' : 'gelijk', text: pn - pb >= 0.05 ? 'Je avonden blijven vaker vrij.' : pb - pn >= 0.05 ? `Je werkte vaker 's avonds: ${n.freeEvenings.of - n.freeEvenings.free} van de ${n.freeEvenings.of} avonden.` : 'Je avonden zijn even vaak vrij als eerst.' })
  }
  const d = n.routinesDone - b.routinesDone
  out.push({ id: 'routines', label: 'Routines gedaan', before: `${b.routinesDone}×`, now: `${n.routinesDone}×`, state: d >= 2 ? 'beter' : d <= -2 ? 'minder' : 'gelijk', text: d >= 2 ? `${d} keer vaker een routine gedaan.` : d <= -2 ? `${-d} keer minder een routine gedaan.` : 'Je routines liepen ongeveer even vaak.' })
  // Meer uren is niet vanzelf beter. Ik laat het zien, zonder oordeel.
  out.push({ id: 'uren', label: 'Uren gewerkt', before: `${Math.round(b.hours)} u`, now: `${Math.round(n.hours)} u`, state: 'gelijk', text: '' })
  return out
})
const better = computed(() => rows.value.filter(r => r.state === 'beter'))
const worse = computed(() => rows.value.filter(r => r.state === 'minder'))
const summary = computed(() => {
  const b = better.value.length
  if (!b) return 'Nog geen verschil met de vier weken ervoor. Dat is normaal: veranderingen worden vaak pas na een week of zes zichtbaar.'
  return `${b === 1 ? 'Eén ding gaat' : `${['', '', 'Twee', 'Drie', 'Vier'][b] ?? b} dingen gaan`} beter dan een maand geleden.`
})
const wins = computed(() => Object.entries(state.value.rituals.dayEnd)
  .filter(([d, e]) => d >= P.value.range.start && d <= today && e.win)
  .sort(([a], [b]) => b.localeCompare(a))
  .map(([d, e]) => ({ date: d, win: e.win! })))
const STATE_CLS = { beter: 'bg-green-soft', gelijk: 'bg-surface-2', minder: 'bg-surface-2' } as const
</script>

<template>
  <div ref="root">
    <PageHeader title="Terugblik" :sub="`${shortDate(P.range.start)} tot en met ${shortDate(P.range.end)}, naast de vier weken daarvoor.`" />

    <!-- Wat er af is -->
    <section class="card-mint p-5 md:p-6" aria-labelledby="af" data-enter>
      <h2 id="af" class="text-[19px]">Wat er af is</h2>
      <p class="mt-1 text-[14.5px] text-muted">De afgelopen vier weken. Je ziet meestal vooral wat er nog moet.</p>
      <dl class="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
        <div v-for="t in doneTiles" :key="t.label" class="rounded-[14px] bg-surface/85 p-3.5">
          <dt class="flex items-center gap-1.5 text-[13px] text-muted"><Icon :name="t.icon" class="size-4" />{{ t.label }}</dt>
          <dd class="num mt-1.5 text-[26px] leading-none">{{ t.value }}</dd>
        </div>
      </dl>
      <ul v-if="now.done.length" class="mt-3 flex flex-wrap gap-1.5" aria-label="Opdrachten klaar">
        <li v-for="a in now.done" :key="a.id" class="chip bg-surface/85"><Icon name="tabler:check" class="size-3.5 text-green-ink" />{{ a.title }}</li>
      </ul>
    </section>

    <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
      <!-- Wat er beter gaat -->
      <section class="card p-5 lg:col-span-7" aria-labelledby="beter" data-enter>
        <h2 id="beter" class="flex items-center gap-2 text-[17px]"><Icon name="tabler:steering-wheel" class="size-4" />{{ summary }}</h2>
        <ul class="mt-4 space-y-2">
          <li v-for="r in rows" :key="r.id" class="flex items-center gap-3 rounded-[14px] p-3" :class="STATE_CLS[r.state]">
            <div class="min-w-0 flex-1">
              <p class="text-[13px] text-muted">{{ r.label }}</p>
              <p v-if="r.text" class="mt-0.5 text-[14.5px] leading-snug">{{ r.text }}</p>
            </div>
            <div class="shrink-0 text-right">
              <p class="flex items-center justify-end gap-1.5"><span class="num text-[20px] leading-none">{{ r.now }}</span><Icon v-if="r.state === 'beter'" name="tabler:trending-up" class="size-4 text-green-ink" aria-label="beter" /></p>
              <p class="mt-1 text-[12.5px] text-muted">eerst <span class="num">{{ r.before }}</span></p>
            </div>
          </li>
        </ul>
        <p v-if="worse.length" class="mt-3 text-[13.5px] text-muted">Wat minder ging, staat er ook. Niet als oordeel, maar zodat je weet waar je volgende maand op kunt letten.</p>
      </section>

      <!-- Wat goed ging -->
      <section class="card p-5 lg:col-span-5" aria-labelledby="goed" data-enter>
        <h2 id="goed" class="text-[17px]">Wat goed ging</h2>
        <p class="mt-1 text-[14px] text-muted">Uit je dagafsluitingen.</p>
        <ul v-if="wins.length" class="mt-3 space-y-2">
          <li v-for="w in wins" :key="w.date" class="flex items-start gap-3 rounded-[14px] bg-surface-2 p-3">
            <span class="num w-12 shrink-0 text-[12.5px] text-muted">{{ weekdayShort(w.date) }} {{ dayNum(w.date) }}</span>
            <span class="text-[14.5px] leading-snug">{{ w.win }}</span>
          </li>
        </ul>
        <p v-else class="mt-3 text-[14.5px] text-muted">Nog niets genoteerd. Bij het afsluiten van je dag kun je één ding opschrijven dat goed ging.</p>
      </section>
    </div>
  </div>
</template>
