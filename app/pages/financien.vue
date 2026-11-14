<script setup lang="ts">
import { financeInsights } from '~/utils/stuurman.mock'

useHead({ title: 'Financiën · Stuurhut' })
const root = ref<HTMLElement | null>(null)
useMotion(root)

const f = useFinance()
const work = useWork()
const stuurman = useStuurman()
const terms = useTerms()
const editor = useEditor()
const toast = useToast()

const m = f.thisMonth
const delta = computed(() => m.value.income - f.lastMonth.value.income)
const insights = computed(() => {
  const top = f.revenueByClient.value[0]
  return financeInsights({
    months: f.months.value,
    late: f.openInvoices.value.filter(i => i.daysLate > 0).map(i => ({ name: i.client.name, days: i.daysLate })),
    topShare: top?.share ?? 0,
    topName: top?.client.name ?? '',
  })
})
const earnMore = computed(() => stuurman.forPage('financien').find(s => s.id === 'onderhoud-abonnement'))
const subs = computed(() => f.subscriptions.value.filter(s => s.kind === 'abonnement'))
const fixed = computed(() => f.subscriptions.value.filter(s => s.kind === 'vaste last'))
const { state } = useStore()
const hasMaintenance = computed(() => state.value.opportunities.some(o => o.title.startsWith('Onderhoudsabonnement')))

function remind(id: string) {
  const slot = f.planReminder(id)
  toast.push({ text: slot ? `Herinnering staat ${relDay(slot.date)} om ${slot.start}.` : 'Ik vond geen plek deze week.', to: '/week', toLabel: 'Bekijk' })
}
function paid(id: string) {
  f.markPaid(id)
  toast.push({ text: 'Gemarkeerd als betaald.' })
}
</script>

<template>
  <div ref="root">
    <PageHeader title="Financiën" sub="Inzicht in je geld. Geen advies, wel overzicht, zodat je zelf rustig kunt kiezen." />

    <div class="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-12">
      <!-- Deze maand -->
      <section class="card-mint p-6 md:p-7 lg:col-span-7" aria-labelledby="maand" data-enter>
        <div class="flex items-center justify-between">
          <h2 id="maand" class="text-[14px] text-muted">Deze maand · {{ m.name }}</h2>
          <span class="chip" :class="delta >= 0 ? 'bg-green-soft text-green-ink' : 'bg-copper-soft text-copper-ink'">
            <Icon :name="delta >= 0 ? 'tabler:trending-up' : 'tabler:trending-down'" class="size-3.5" />
            {{ delta >= 0 ? '+' : '−' }}{{ euroRound(Math.abs(delta)) }} t.o.v. {{ f.lastMonth.value.name }}
          </span>
        </div>
        <p class="mt-4 text-[13px] text-muted">Verschil deze maand</p>
        <p class="text-[52px] md:text-[64px] leading-none tracking-[-0.03em]">
          <UiCountUp :value="m.net" :format="euro" />
        </p>
        <div class="mt-6 grid grid-cols-2 gap-3">
          <div class="rounded-[14px] border border-line bg-surface/80 p-4">
            <p class="flex items-center gap-1.5 text-[13px] text-muted"><span class="size-2 rounded-full bg-green-bar" />In</p>
            <p class="mt-1 text-[22px] font-semibold"><UiCountUp :value="m.income" :format="euro" /></p>
          </div>
          <div class="rounded-[14px] border border-line bg-surface/80 p-4">
            <p class="flex items-center gap-1.5 text-[13px] text-muted"><span class="h-[3px] w-3 rounded-full bg-ink" />Uit</p>
            <p class="mt-1 text-[22px] font-semibold"><UiCountUp :value="m.out" :format="euro" /></p>
          </div>
        </div>
      </section>

      <!-- Goed / let op -->
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
        <section class="card p-5" aria-labelledby="goed" data-enter>
          <h2 id="goed" class="flex items-center gap-2 text-[15px] font-semibold text-green"><Icon name="tabler:leaf" class="size-4" />Dit gaat goed</h2>
          <ul class="mt-3 space-y-3">
            <li v-for="g in insights.good" :key="g.title">
              <p class="text-[15px] font-semibold">{{ g.title }}</p>
              <p class="line-clamp-2 text-[14px] leading-snug text-muted" :title="g.body">{{ g.body }}</p>
            </li>
            <li v-if="!insights.good.length" class="text-[14px] text-muted">Nog te weinig maanden om iets over te zeggen.</li>
          </ul>
        </section>
        <section class="card p-5" aria-labelledby="letop" data-enter>
          <h2 id="letop" class="flex items-center gap-2 text-[15px] font-semibold text-copper-ink"><Icon name="tabler:alert-circle" class="size-4" />Hier let ik op</h2>
          <ul class="mt-3 space-y-3">
            <li v-for="g in insights.watch" :key="g.title">
              <p class="text-[15px] font-semibold">{{ g.title }}</p>
              <p class="line-clamp-2 text-[14px] leading-snug text-muted" :title="g.body">{{ g.body }}</p>
            </li>
            <li v-if="!insights.watch.length" class="text-[14px] text-muted">Niets bijzonders.</li>
          </ul>
        </section>
      </div>

      <!-- Apart zetten -->
      <div class="lg:col-span-12" data-enter><TaxCard /></div>

      <!-- Per uur per klant -->
      <section class="card p-5 md:p-6 lg:col-span-12" aria-labelledby="peruur" data-enter>
        <div class="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="peruur" class="text-[17px]">Wat je per uur verdient</h2>
          <span class="text-[13px] text-muted">omzet zonder btw ÷ gewerkte uren</span>
        </div>
        <p class="mb-4 text-[13.5px] text-muted">Je werkt met vaste prijzen en rekent {{ euroRound(MEERWERK_TARIEF) }} per uur voor meerwerk. Zakt een klant daaronder, dan kostte het meer uren dan je rekende.</p>
        <ul class="space-y-3">
          <li v-if="!work.perHour.value.length" class="text-[14px] text-muted">Nog geen uren en omzet bij dezelfde klant. Schrijf je uren, dan zie je hier wat een vaste prijs je per uur opleverde.</li>
          <li v-for="r in work.perHour.value" :key="r.client.id">
            <NuxtLink :to="`/klanten?id=${r.client.id}`" class="-mx-2 block rounded-[12px] px-2 py-1 hover:bg-surface-2">
              <div class="flex items-center justify-between gap-3">
                <span class="flex min-w-0 items-center gap-2.5"><UiAvatar :name="r.client.name" :tint="r.client.tint" :size="30" /><span class="truncate text-[14.5px]">{{ r.client.name }}</span><span class="text-[12.5px] text-muted">· {{ Math.round(r.hours) }} u</span></span>
                <span class="num text-[15px]" :class="r.rate < MEERWERK_TARIEF ? 'text-copper-ink' : ''">{{ euroRound(r.rate) }} / u</span>
              </div>
              <div class="relative mt-2 h-2 rounded-full bg-surface-2">
                <div class="h-full rounded-full" :class="r.rate < MEERWERK_TARIEF ? 'bg-copper' : 'bg-green-bar'" :style="{ width: `${Math.min(100, (r.rate / 110) * 100)}%` }" />
                <span class="absolute -top-1 h-4 w-0.5 rounded-full bg-ink" :style="{ left: `${(MEERWERK_TARIEF / 110) * 100}%` }" title="Je meerwerktarief" />
              </div>
            </NuxtLink>
          </li>
        </ul>
      </section>

      <!-- Grafiek -->
      <section class="card p-5 md:p-6 lg:col-span-7" aria-labelledby="grafiek" data-enter>
        <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 id="grafiek" class="text-[17px] font-semibold">Per maand</h2>
          <div class="flex gap-3 text-[13px] text-muted">
            <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-full bg-green-bar" />in</span>
            <span class="flex items-center gap-1.5"><span class="h-[3px] w-3 rounded-full bg-ink" />uit</span>
          </div>
        </div>
        <UiBars :data="f.months.value" highlight-last />
        <p class="mt-4 text-[14px] text-muted">Gemiddeld <span class="num text-ink">{{ euroRound(f.avgIncome.value) }}</span> per maand binnen.</p>
      </section>

      <!-- Per klant -->
      <section class="card p-5 md:p-6 lg:col-span-5" aria-labelledby="perklant" data-enter>
        <h2 id="perklant" class="mb-4 text-[17px] font-semibold">Inkomsten per klant</h2>
        <ul class="space-y-3">
          <li v-for="r in f.revenueByClient.value" :key="r.client.id">
            <NuxtLink :to="`/klanten?id=${r.client.id}`" class="block rounded-[14px] hover:bg-surface-2 -mx-2 px-2 py-1">
              <div class="flex items-center justify-between gap-3">
                <span class="flex min-w-0 items-center gap-2.5"><UiAvatar :name="r.client.name" :tint="r.client.tint" :size="30" /><span class="truncate text-[14.5px] font-medium">{{ r.client.name }}</span></span>
                <span class="num text-[14.5px] font-semibold">{{ euroRound(r.amount) }}</span>
              </div>
              <div class="mt-2 h-2 overflow-hidden rounded-full bg-surface-2"><div class="h-full origin-left rounded-full bg-gradient-to-r from-green-bar/40 to-green-bar" :style="{ transform: `scaleX(${r.share / f.revenueByClient.value[0]!.share})` }" /></div>
            </NuxtLink>
          </li>
        </ul>
      </section>

      <!-- Nog te factureren -->
      <section class="card p-5 md:p-6 lg:col-span-12" aria-labelledby="tefactureren" data-enter>
        <div class="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="tefactureren" class="text-[17px] font-semibold">Nog te factureren</h2>
          <span class="num text-[15px] font-semibold">{{ euro(terms.unbilledTotal.value) }}</span>
        </div>
        <p class="mb-4 text-[13.5px] text-muted">Afgesproken met klanten, nog niet gefactureerd. Geld dat nog gaat komen.</p>
        <ul class="space-y-2">
          <li v-for="r in terms.unbilled.value" :key="r.term.id">
            <NuxtLink :to="`/klanten?id=${r.project.clientId}`" class="flex items-center gap-3 rounded-[14px] px-3.5 py-3 hover:bg-surface-3" :class="r.due ? 'bg-copper-soft/60' : 'bg-surface-2'">
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[15px] font-semibold">{{ terms.clientName(r.project) }} · {{ r.term.label }}</span>
                <span class="block truncate text-[13px]" :class="r.status === 'uitgesteld' ? 'text-copper-ink' : 'text-muted'">{{ r.project.name }} · {{ r.status === 'uitgesteld' ? `uitgesteld${r.term.reason ? `: ${r.term.reason}` : ''}` : r.due ? 'nu factureren' : r.when }}</span>
              </span>
              <span class="num text-[15px] font-semibold">{{ euro(r.term.amount) }}</span>
            </NuxtLink>
          </li>
          <li v-if="!terms.unbilled.value.length" class="rounded-[14px] bg-surface-2 p-5 text-[14.5px] text-muted">
            Niets afgesproken dat nog gefactureerd moet worden.
            <button type="button" class="mt-2 flex min-h-10 items-center gap-1.5 font-semibold text-sea-ink" @click="editor.open({ kind: 'akkoord' })"><Icon name="tabler:file-check" class="size-4" />Akkoord op een offerte vastleggen</button>
          </li>
        </ul>
      </section>

      <!-- Facturen -->
      <section class="card p-5 md:p-6 lg:col-span-7" aria-labelledby="facturen" data-enter>
        <div class="mb-4 flex items-center justify-between">
          <h2 id="facturen" class="text-[17px] font-semibold">Openstaande facturen</h2>
          <span class="num text-[15px] font-semibold">{{ euro(f.openTotal.value) }}</span>
        </div>
        <ul class="space-y-2">
          <li v-for="inv in f.openInvoices.value" :key="inv.id" class="rounded-[14px] bg-surface-2 p-4">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-[15px] font-semibold">{{ inv.client.name }}</p>
                <p class="text-[13px] text-muted">{{ inv.number }} · verstuurd {{ shortDate(inv.sentOn) }}</p>
              </div>
              <div class="text-right">
                <p class="num text-[17px] font-semibold">{{ euro(inv.amount) }}</p>
                <span class="chip mt-1" :class="inv.daysLate ? 'bg-copper-soft text-copper-ink' : 'bg-surface text-muted'">{{ inv.daysLate ? `${inv.daysLate} dagen te laat` : `vervalt over ${inv.daysLeft} dagen` }}</span>
              </div>
            </div>
            <div class="mt-3 flex flex-wrap gap-2">
              <button v-if="inv.daysLate && !inv.reminderPlanned" type="button" class="btn-accent !min-h-10 !text-[14px]" @click="remind(inv.id)">Plan herinnering</button>
              <span v-else-if="inv.reminderPlanned" class="chip bg-green-soft text-green !py-2.5 !px-3.5"><Icon name="tabler:check" class="size-3.5" />Herinnering ingepland</span>
              <button type="button" class="btn-ghost !min-h-10 !text-[14px]" @click="paid(inv.id)">Is betaald</button>
            </div>
          </li>
          <li v-if="!f.openInvoices.value.length" class="rounded-[14px] bg-surface-2 p-5 text-[15px] text-muted">Alles is betaald. Fijn.</li>
        </ul>
      </section>

      <!-- Vaste lasten -->
      <section class="card p-5 md:p-6 lg:col-span-5" aria-labelledby="vast" data-enter>
        <div class="mb-3 flex items-center justify-between">
          <h2 id="vast" class="text-[17px] font-semibold">Vaste lasten en abonnementen</h2>
        </div>
        <p class="num text-[28px] font-semibold tracking-[-0.02em]">{{ euro(f.monthlyFixed.value) }}<span class="text-[14px] font-medium text-muted"> per maand</span></p>
        <p class="label mt-4 mb-1">Vaste lasten</p>
        <ul class="divide-y divide-line">
          <li v-if="!fixed.length" class="py-2 text-[14px] text-muted">Geen.</li>
          <li v-for="s in fixed" :key="s.id" class="py-2 text-[14.5px]">
            <div class="flex justify-between gap-3"><span>{{ s.name }}</span><span class="num font-medium">{{ euro(s.monthly) }}</span></div>
            <p v-if="s.note" class="text-[12.5px] text-muted">{{ s.note }}</p>
          </li>
        </ul>
        <p class="label mt-4 mb-1">Abonnementen</p>
        <ul class="divide-y divide-line">
          <li v-if="!subs.length" class="py-2 text-[14px] text-muted">Geen.</li>
          <li v-for="s in subs" :key="s.id" class="py-2 text-[14.5px]">
            <div class="flex justify-between gap-3"><span>{{ s.name }}</span><span class="num font-medium">{{ euro(s.monthly) }}</span></div>
            <p v-if="s.note" class="text-[12.5px] text-copper-ink">{{ s.note }}</p>
          </li>
        </ul>
        <p v-if="f.privateYear.value" class="mt-4 text-[13px] text-muted">Privé opgenomen dit jaar: <span class="num text-ink">{{ euroRound(f.privateYear.value) }}</span>. Telt niet mee als kosten.</p>
      </section>

      <!-- Meer verdienen -->
      <div class="lg:col-span-12" data-enter>
        <StuurmanCard v-if="earnMore" :suggestion="earnMore" />
        <div v-else-if="hasMaintenance" class="card p-6">
          <p class="lead text-[21px]">Het onderhoudsabonnement staat bij Kansen.</p>
          <NuxtLink to="/kansen" class="btn-sea mt-3">Naar Kansen</NuxtLink>
        </div>
      </div>
    </div>
    <p class="mt-6 text-center text-[12.5px] text-muted">{{ AI_NAME }} geeft inzicht, geen financieel advies.</p>
  </div>
</template>
