<script setup lang="ts">
// Apart zetten: van elke betaling wat voor btw en belasting is, en wat echt van jou is.
const T = useTax()
const toast = useToast()
const qt = T.quarterTotals
const parts = computed(() => {
  const total = qt.value.received || 1
  return [
    { label: 'Btw', value: qt.value.vatIn, cls: 'bg-cat-admin-dot', soft: 'bg-cat-admin' },
    { label: 'Inkomstenbelasting', value: qt.value.reserve, cls: 'bg-cat-taak-dot', soft: 'bg-cat-taak' },
    { label: 'Voor jou', value: qt.value.yours, cls: 'bg-green-bar', soft: 'bg-cat-focus' },
  ].map(p => ({ ...p, share: p.value / total }))
})
const editing = ref(false)
const pct = ref(Math.round(T.tax.value.reserve * 100))
function savePct() {
  T.setReserve(Math.min(50, Math.max(10, pct.value)) / 100)
  editing.value = false
}
function setAside() {
  T.markSetAside(true)
  toast.push({ text: `Genoteerd: ${euroRound(T.month.value.toSetAside)} apart gezet voor deze maand.` })
}
</script>

<template>
  <section class="card p-5 md:p-6" aria-labelledby="apart">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 id="apart" class="text-[17px]">Apart zetten</h2>
        <p class="text-[13px] text-muted">{{ T.quarter }} tot nu toe · {{ euroRound(qt.received) }} binnengekomen</p>
      </div>
      <span class="chip !py-2" :class="T.daysToDeadline <= 21 ? 'bg-copper-soft text-copper-ink' : 'bg-surface-2 text-ink'"><Icon name="tabler:receipt-tax" class="size-4" />Btw-aangifte {{ T.quarter }}: uiterlijk {{ shortDate(T.deadline) }} · nog {{ T.daysToDeadline }} dagen</span>
    </div>

    <!-- Verdeling -->
    <div class="mt-4 flex h-4 overflow-hidden rounded-full" role="img" :aria-label="parts.map(p => `${p.label} ${euroRound(p.value)}`).join(', ')">
      <span v-for="p in parts" :key="p.label" :class="p.cls" :style="{ width: `${p.share * 100}%` }" />
    </div>
    <dl class="mt-3 grid grid-cols-3 gap-2">
      <div v-for="p in parts" :key="p.label" class="rounded-[12px] p-3 text-cat-ink" :class="p.soft">
        <dt class="text-[12.5px] text-cat-ink-muted">{{ p.label }}</dt>
        <dd class="num mt-1 text-[20px] leading-none md:text-[24px]">{{ euroRound(p.value) }}</dd>
      </div>
    </dl>
    <p class="mt-2 text-[12.5px] text-muted">
      Btw te betalen na aftrek van {{ euroRound(qt.vatDeductible) }} voorbelasting: <span class="num text-ink">{{ euroRound(qt.vatDue) }}</span>.
      Belasting: {{ Math.round(T.tax.value.reserve * 100) }}% van de omzet zonder btw.
      <button type="button" class="underline underline-offset-4" @click="editing = !editing">Aanpassen</button>
    </p>
    <form v-if="editing" class="mt-2 flex items-center gap-2" @submit.prevent="savePct">
      <label class="text-[14px]" for="pct">Apart voor inkomstenbelasting</label>
      <input id="pct" v-model.number="pct" type="number" min="10" max="50" class="field-input !min-h-10 w-20 text-center">
      <span class="text-[14px]">%</span>
      <button type="submit" class="btn-primary !min-h-10 !px-3.5">Opslaan</button>
    </form>

    <!-- Deze maand -->
    <div class="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
      <div class="rounded-[14px] border border-line p-4">
        <p class="text-[13px] text-muted">Deze maand apart zetten</p>
        <p class="num mt-1 text-[26px] leading-none">{{ euroRound(T.month.value.toSetAside) }}</p>
        <button v-if="!T.month.value.done" type="button" class="btn-primary mt-3 !min-h-10 !px-3.5 !text-[13.5px]" @click="setAside"><Icon name="tabler:pig-money" class="size-4" />Heb ik gedaan</button>
        <p v-else class="mt-3 flex items-center gap-1.5 text-[13.5px] text-green-ink"><Icon name="tabler:check" class="size-4" />Apart gezet</p>
      </div>
      <div class="rounded-[14px] border border-line p-4">
        <p class="text-[13px] text-muted">Jezelf uitbetalen, na vaste lasten</p>
        <p class="num mt-1 text-[26px] leading-none text-green-ink">{{ euroRound(T.month.value.payYourself) }}</p>
        <p class="mt-2 text-[12.5px] text-muted">Wat deze maand echt van jou is, min je vaste lasten.</p>
      </div>
    </div>

    <!-- Per betaling -->
    <p class="mb-2 mt-5 text-[13px] text-muted">Per betaling</p>
    <ul class="divide-y divide-line">
      <li v-for="p in T.payments.value.slice(0, 5)" :key="p.id" class="py-2.5">
        <div class="flex items-baseline justify-between gap-3">
          <span class="min-w-0 truncate text-[14.5px]">{{ p.client?.name ?? p.label }} <span class="text-[12.5px] text-muted">· {{ shortDate(p.date) }}</span></span>
          <span class="num text-[14.5px]">{{ euroRound(p.amount) }}</span>
        </div>
        <p class="num mt-0.5 text-[12.5px] text-muted">{{ euroRound(p.vat) }} btw · {{ euroRound(p.reserve) }} belasting · <span class="text-green-ink">{{ euroRound(p.yours) }} voor jou</span></p>
      </li>
    </ul>
    <p class="mt-3 text-[12px] text-muted">Een inschatting om rustig te kunnen plannen, geen belastingadvies. Je boekhouder heeft het laatste woord.</p>
  </section>
</template>
