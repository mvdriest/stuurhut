<script setup lang="ts">
// Levensadmin: wat terugkomt, op tijd gemeld.
import type { LifeItem } from '~/types'

useHead({ title: 'Levensadmin · Stuurhut' })
const root = ref<HTMLElement | null>(null)
useMotion(root)

const L = useLife()
const editor = useEditor()
const toast = useToast()

function when(l: LifeItem) {
  const d = L.days(l)
  if (d < 0) return `${-d} dagen geleden`
  if (d === 0) return 'vandaag'
  if (d === 1) return 'morgen'
  if (d < 60) return `over ${d} dagen`
  return `over ${Math.round(d / 30)} maanden`
}
function complete(l: LifeItem) {
  const undo = L.complete(l.id)
  toast.push({ text: l.repeatMonths ? `Geregeld. Volgende keer: ${shortDate(state.value.life.find(x => x.id === l.id)!.due)}.` : 'Geregeld.', undo })
}
function plan(l: LifeItem) {
  const slot = L.plan(l.id)
  toast.push({ text: slot ? `Een kwartier om het te regelen: ${relDay(slot.date)} om ${slot.start}.` : 'Geen vrije privé-tijd gevonden.', to: slot ? '/week' : undefined, toLabel: 'Bekijk' })
}
const { state } = useStore()
const repeatLabel = (m?: number) => (!m ? 'eenmalig' : m === 1 ? 'elke maand' : m === 12 ? 'elk jaar' : m % 12 === 0 ? `elke ${m / 12} jaar` : `elke ${m} maanden`)
</script>

<template>
  <div ref="root">
    <PageHeader title="Levensadmin" sub="Wat terugkomt: auto, verzekeringen, gezondheid, documenten. Eén keer erin, ik meld het op tijd.">
      <template #actions>
        <button type="button" class="btn-primary" @click="editor.open({ kind: 'admin' })"><Icon name="tabler:plus" class="size-4" />Toevoegen</button>
      </template>
    </PageHeader>

    <!-- Binnenkort -->
    <section class="mb-6" aria-labelledby="binnenkort">
      <h2 id="binnenkort" class="mb-3 flex items-center gap-2 text-[17px]" data-enter>Binnenkort <span class="num chip bg-copper-soft text-copper-ink">{{ L.soon.value.length }}</span></h2>
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <article v-for="l in L.soon.value" :key="l.id" class="card p-4" data-enter>
          <div class="flex items-start gap-3">
            <span class="grid size-11 shrink-0 place-items-center rounded-[12px] text-cat-ink" :class="LIFE_CATEGORIES[l.category].fill"><Icon :name="LIFE_CATEGORIES[l.category].icon" class="size-5" /></span>
            <div class="min-w-0 flex-1">
              <h3 class="text-[16px] leading-snug">{{ l.title }}</h3>
              <p class="text-[13px]" :class="L.days(l) <= 10 ? 'text-copper-ink' : 'text-muted'">{{ cap(when(l)) }} · {{ shortDate(l.due) }}</p>
            </div>
            <button type="button" class="icon-btn -mr-2 -mt-1 shrink-0 text-muted" :aria-label="`${l.title} bewerken`" @click="editor.open({ kind: 'admin', id: l.id })"><Icon name="tabler:pencil" class="size-[18px]" /></button>
          </div>
          <p v-if="l.note" class="mt-2 line-clamp-2 text-[13.5px] text-muted">{{ l.note }}</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <button type="button" class="btn-primary !min-h-10 !px-3.5 !text-[13.5px]" @click="complete(l)"><Icon name="tabler:check" class="size-4" />Geregeld</button>
            <button type="button" class="btn-outline !min-h-10 !px-3.5 !text-[13.5px]" @click="plan(l)"><Icon name="tabler:calendar-event" class="size-4" />Plan een kwartier</button>
          </div>
        </article>
        <p v-if="!L.soon.value.length" class="card p-5 text-muted" data-enter>Niets wat binnenkort moet. Rustig.</p>
      </div>
    </section>

    <!-- Later -->
    <section aria-labelledby="later">
      <h2 id="later" class="mb-3 text-[17px]" data-enter>Later</h2>
      <ul class="card divide-y divide-line overflow-hidden" data-enter>
        <li v-for="l in L.later.value" :key="l.id">
          <button type="button" class="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2" @click="editor.open({ kind: 'admin', id: l.id })">
            <span class="grid size-10 shrink-0 place-items-center rounded-[12px] text-cat-ink" :class="LIFE_CATEGORIES[l.category].fill"><Icon :name="LIFE_CATEGORIES[l.category].icon" class="size-5" /></span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-[15px]">{{ l.title }}</span>
              <span class="block text-[12.5px] text-muted">{{ LIFE_CATEGORIES[l.category].label }} · {{ repeatLabel(l.repeatMonths) }}</span>
            </span>
            <span class="shrink-0 text-right"><span class="block text-[14px]">{{ cap(when(l)) }}</span><span class="block text-[12.5px] text-muted">{{ shortDate(l.due) }}</span></span>
          </button>
        </li>
        <li v-if="!L.later.value.length" class="p-5 text-muted">Niets gepland op de lange termijn.</li>
      </ul>
    </section>

    <section v-if="L.doneList.value.length" class="mt-6" aria-label="Geregeld">
      <p class="mb-2 text-[13px] text-muted">Geregeld</p>
      <ul class="space-y-1.5">
        <li v-for="l in L.doneList.value" :key="l.id" class="flex items-center gap-3 rounded-[12px] bg-surface px-4 py-2.5 text-[14.5px] text-muted"><Icon name="tabler:check" class="size-4 text-green-ink" />{{ l.title }}</li>
      </ul>
    </section>
  </div>
</template>
