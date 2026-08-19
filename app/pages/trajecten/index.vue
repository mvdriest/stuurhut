<script setup lang="ts">
import type { Traject } from '~/composables/useTrajecten'
import { trajectKleurHex, trajectTekstKleur } from '~/utils/kleuren'
import { TRAJECT_STATUS_STYLES } from '~/utils/trajectStatus'
import { groepeerTrajecten } from '~/utils/trajectGroepen'
import { staleness } from '~/utils/trajectStaleness'

definePageMeta({
  pageTransition: { name: 'stuurhut-nav', mode: 'out-in' }
})

const { trajecten, pending, refresh } = useTrajecten()
const { doelen, refresh: refreshDoelen } = useDoelen()

await useAsyncData('trajecten-overzicht-init', () => Promise.all([refresh(), refreshDoelen()]))

const scopeTab = ref<'alle' | 'zakelijk' | 'prive'>('alle')

const scoped = computed(() => trajecten.value.filter(t => scopeTab.value === 'alle' || t.scope === scopeTab.value))

const groepen = computed(() => {
  const g = groepeerTrajecten(scoped.value)
  return [
    { key: 'jijAanZet', naam: 'Jij bent aan zet', items: g.jijAanZet },
    { key: 'wachtOpAnderen', naam: 'Wacht op iemand anders', items: g.wachtOpAnderen }
  ].filter(gr => gr.items.length > 0)
})

function doelTitel(doelId: string | null) {
  return doelId === null ? null : doelen.value.find(d => d.id === doelId)?.titel ?? null
}

const isAdding = ref(false)

async function createTraject(payload: Record<string, unknown>) {
  await $fetch('/api/trajecten', { method: 'POST', body: payload })
  isAdding.value = false
  await refresh()
}
</script>

<template>
  <div class="bg-stuurhut-mist min-h-screen">
    <AppHeaderFoto compact titel="Trajecten" subtitel="Alles wat loopt of wacht — gegroepeerd op wat jij nu kunt doen." />

    <div class="stuurhut-kolom flex flex-col gap-8 py-[clamp(2rem,5vw,4rem)]">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-1 rounded-full bg-black/5 p-1 w-fit">
          <button
            v-for="tab in [{ key: 'alle', label: 'Alle' }, { key: 'zakelijk', label: 'Zakelijk' }, { key: 'prive', label: 'Privé' }]"
            :key="tab.key"
            type="button"
            class="trajecten-ov__tab"
            :class="{ 'trajecten-ov__tab--actief': scopeTab === tab.key }"
            @click="scopeTab = tab.key as typeof scopeTab"
          >
            {{ tab.label }}
          </button>
        </div>
        <span class="text-sm text-stuurhut-muted">{{ scoped.length }} van {{ trajecten.length }}</span>
        <UButton v-if="!isAdding" icon="i-lucide-plus" color="neutral" variant="subtle" class="rounded-full" @click="isAdding = true">
          Nieuw traject
        </UButton>
      </div>

      <div v-if="isAdding" class="rounded-2xl bg-white p-5 shadow-sm text-stuurhut-ink">
        <TrajectForm submit-label="Toevoegen" @submit="createTraject" @cancel="isAdding = false" />
      </div>

      <p v-if="!pending && trajecten.length === 0" class="text-stuurhut-muted text-sm">
        Nog geen trajecten. Voeg er een toe.
      </p>
      <p v-else-if="!pending && scoped.length === 0" class="text-stuurhut-muted text-sm">
        Niets gevonden met deze filter.
      </p>

      <div v-for="groep in groepen" :key="groep.key" class="flex flex-col gap-4">
        <div class="flex items-center gap-2">
          <span class="size-1.5 rounded-full bg-stuurhut-ink" />
          <h2 class="text-xs font-bold uppercase tracking-[0.1em] text-stuurhut-ink">{{ groep.naam }}</h2>
          <span class="text-xs text-stuurhut-muted">· {{ groep.items.length }}</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <NuxtLink
            v-for="traject in (groep.items as Traject[])"
            :key="traject.id"
            :to="`/trajecten/${traject.id}`"
            class="trajectkaart"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h3 class="trajectkaart__titel">{{ traject.naam }}</h3>
                <span class="trajectkaart__sub">{{ traject.contactpersoon || (traject.scope === 'prive' ? 'Privé' : 'Zakelijk') }}</span>
              </div>
              <UBadge :color="TRAJECT_STATUS_STYLES[traject.status].color" variant="subtle" class="shrink-0">
                {{ TRAJECT_STATUS_STYLES[traject.status].label }}
              </UBadge>
            </div>

            <div class="trajectkaart__stap">
              <p class="trajectkaart__stap-label">Volgende stap</p>
              <p class="trajectkaart__stap-tekst">{{ traject.eerstvolgendeActie || 'Geen eerstvolgende actie ingesteld.' }}</p>
            </div>

            <div class="flex items-center justify-between gap-2 flex-wrap">
              <span class="trajectkaart__stale" :class="`trajectkaart__stale--${staleness(traject.updatedAt).niveau}`">
                {{ staleness(traject.updatedAt).label }}
              </span>
              <div class="flex items-center gap-2 flex-wrap">
                <span v-if="traject.status === 'wachtend' && traject.wachtOp" class="trajectkaart__wacht">{{ traject.wachtOp }}</span>
                <span v-if="doelTitel(traject.doelId)" class="text-xs text-stuurhut-muted">Doel: {{ doelTitel(traject.doelId) }}</span>
                <span class="trajectkaart__kleur" :style="{ backgroundColor: trajectKleurHex[traject.kleur], color: trajectTekstKleur(traject.kleur) }">
                  {{ traject.naam.charAt(0) }}
                </span>
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.trajecten-ov__tab {
  font-family: var(--font-display);
  text-transform: uppercase;
  font-size: 0.8125rem;
  letter-spacing: 0.02em;
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  color: var(--color-stuurhut-muted);
  transition: background-color 150ms ease-out, color 150ms ease-out;
}

.trajecten-ov__tab--actief {
  background-color: var(--color-stuurhut-ink);
  color: #fff;
}

.trajectkaart {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  padding: 1.125rem 1.25rem;
  border-radius: 1.125rem;
  background-color: #fff;
  box-shadow: 0 8px 22px rgb(0 0 0 / 0.08);
  transition: transform 150ms ease-out, box-shadow 150ms ease-out;
  color: inherit;
}

.trajectkaart:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgb(0 0 0 / 0.12);
}

.trajectkaart__titel {
  font-weight: 700;
  font-size: 1.05rem;
  line-height: 1.25;
  color: var(--color-stuurhut-ink);
}

.trajectkaart__sub {
  font-size: 0.8rem;
  color: var(--color-stuurhut-muted);
}

.trajectkaart__stap {
  border-radius: 0.8rem;
  padding: 0.8rem 0.95rem;
  background-color: var(--color-stuurhut-mist);
}

.trajectkaart__stap-label {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-stuurhut-muted);
  margin-bottom: 0.25rem;
}

.trajectkaart__stap-tekst {
  font-weight: 600;
  font-size: 0.9375rem;
  line-height: 1.35;
  color: var(--color-stuurhut-ink);
}

.trajectkaart__stale {
  font-size: 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.trajectkaart__stale::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: currentColor;
}

.trajectkaart__stale--vers { color: #35722f; }
.trajectkaart__stale--traag { color: #a3791a; }
.trajectkaart__stale--stil { color: #b3402f; }

.trajectkaart__wacht {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 0.5rem;
  background-color: #f4ead0;
  color: #7a5a1a;
}

.trajectkaart__kleur {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: 0.75rem;
  text-transform: uppercase;
}
</style>
