<script setup lang="ts">
// De avond, teruggerekend vanaf je opstaantijd. Na laptoptijd wordt de app stil.
const S = useSleep()
const D = useDomain()
const toast = useToast()
const t = computed(() => S.tonight.value)
const toLaptop = computed(() => S.minutesTo(t.value.laptop))
const morning = computed(() => relDay(t.value.wakeDate))
// Morgen weekend: uitslapen mag, binnen een uur
const weekend = computed(() => isWeekend(t.value.wakeDate))
const latest = computed(() => S.latestWeekend(t.value.wakeDate))

const line = computed(() => {
  const e = S.evening.value
  switch (S.phase.value) {
    case 'avond': return `Nog ${minText(toLaptop.value)} tot je laptop dichtgaat.`
    case 'bijna': return `Nog ${minText(toLaptop.value)} tot je laptop dichtgaat. Rond af wat je nu doet, de rest wacht tot ${morning.value}.`
    case 'afbouwen':
      if (e.closedAt) return `Laptop dicht om ${e.closedAt}. Nu afbouwen: geen werk meer, minder licht. In bed om ${t.value.bed}.`
      if (e.kept) return `Oké. Ik vraag het vanavond niet nog een keer. In bed om ${t.value.bed} houdt ${morning.value} ${t.value.wake} haalbaar.`
      return `Je laptop gaat nu dicht. Wat nog openstaat, staat ${morning.value} gewoon klaar.`
    case 'laat': return `Het is na je bedtijd. Sta ${morning.value} toch om ${weekend.value ? `uiterlijk ${latest.value}` : t.value.wake} op, ook als de nacht korter is. Zo blijft je ritme staan.`
    default: return ''
  }
})
const ask = computed(() => (S.phase.value === 'bijna' || S.phase.value === 'afbouwen') && !S.evening.value.closedAt && !S.evening.value.kept)

function close() {
  S.closeLaptop()
  toast.push({ text: 'Laptop dicht. Fijne avond.' })
}
function keep() {
  S.keepWorking()
  toast.push({ text: 'Prima. Ik laat je met rust.' })
}
function stopPreview() {
  S.preview.value = false
  D.previewOff.value = false
}
</script>

<template>
  <div class="rounded-[14px] bg-sea-soft p-3.5" aria-labelledby="vanavond">
    <div class="flex items-center gap-2">
      <Icon name="tabler:moon-stars" class="size-5 text-sea-ink" />
      <h2 id="vanavond" class="text-[16px]">{{ S.quiet.value ? 'Afbouwen' : 'Vanavond' }}</h2>
      <button v-if="S.preview.value" type="button" class="ml-auto min-h-10 whitespace-nowrap px-2 text-[13px] underline underline-offset-4" @click="stopPreview">Voorbeeld uit</button>
    </div>
    <dl class="mt-3 grid grid-cols-3 gap-2">
      <div class="rounded-[12px] bg-surface/85 px-2 py-2.5 sm:px-2.5" :class="S.phase.value === 'bijna' ? 'ring-2 ring-sea' : ''">
        <dt class="text-[12.5px] text-muted">Laptop dicht</dt>
        <dd class="num mt-1 text-[18px] leading-none sm:text-[21px]">{{ t.laptop }}</dd>
      </div>
      <div class="rounded-[12px] bg-surface/85 px-2 py-2.5 sm:px-2.5" :class="S.phase.value === 'afbouwen' ? 'ring-2 ring-sea' : ''">
        <dt class="text-[12.5px] text-muted">In bed</dt>
        <dd class="num mt-1 text-[18px] leading-none sm:text-[21px]">{{ t.bed }}</dd>
      </div>
      <div class="rounded-[12px] bg-surface/85 px-2 py-2.5 sm:px-2.5">
        <dt class="text-[12.5px] text-muted">{{ weekend ? 'Uiterlijk op' : `Op ${morning}` }}</dt>
        <dd class="num mt-1 text-[18px] leading-none sm:text-[21px]">{{ weekend ? latest : t.wake }}</dd>
      </div>
    </dl>
    <p class="mt-3 text-[14.5px] leading-snug">{{ line }}</p>
    <p v-if="weekend && S.phase.value !== 'laat'" class="mt-1.5 text-[14px] text-muted">{{ cap(morning) }} is het weekend. Uitslapen mag, tot uiterlijk {{ latest }}. Dan blijft je ritme staan.</p>
    <div v-if="ask" class="mt-3 flex flex-wrap gap-2">
      <button type="button" class="btn-primary !min-h-11" @click="close"><Icon name="tabler:check" class="size-4" />Laptop is dicht</button>
      <button type="button" class="btn-outline !min-h-11" @click="keep">Ik werk nog even</button>
    </div>
  </div>
</template>
