<script setup lang="ts">
import type { AgendaDag, AgendaItem } from '~/utils/agenda'

const props = defineProps<{
  dagen: AgendaDag[]
}>()

const START_UUR = 7
const EIND_UUR = 21
const UUR_PX = 64

const gridHoogte = (EIND_UUR - START_UUR) * UUR_PX

const uurLabels = Array.from({ length: EIND_UUR - START_UUR + 1 }, (_, i) => ({
  label: String(START_UUR + i).padStart(2, '0') + ':00',
  top: i * UUR_PX
}))

function top(item: AgendaItem) {
  if (item.startMin === null) return 0
  return Math.max(0, (item.startMin / 60 - START_UUR) * UUR_PX)
}

function hoogte(item: AgendaItem) {
  return Math.max(20, (item.duurMin / 60) * UUR_PX - 3)
}

function geplandeItems(dag: AgendaDag) {
  return dag.items.filter(i => i.startMin !== null)
}

function ongeplandeItems(dag: AgendaDag) {
  return dag.items.filter(i => i.startMin === null)
}
</script>

<template>
  <div class="agendagrid">
    <div class="agendagrid__header" :style="{ gridTemplateColumns: `52px repeat(${props.dagen.length}, minmax(0, 1fr))` }">
      <div />
      <div v-for="dag in props.dagen" :key="dag.datum" class="agendagrid__dagkop" :class="{ 'agendagrid__dagkop--vandaag': dag.vandaag }">
        <div class="agendagrid__weekdag">{{ dag.weekdagLabel }}</div>
        <div class="agendagrid__datum">{{ dag.dagLabel }}</div>
      </div>
    </div>

    <div class="agendagrid__body" :style="{ gridTemplateColumns: `52px repeat(${props.dagen.length}, minmax(0, 1fr))` }">
      <div class="relative" :style="{ height: `${gridHoogte}px` }">
        <div v-for="u in uurLabels" :key="u.label" class="agendagrid__uurlabel" :style="{ top: `${u.top}px` }">{{ u.label }}</div>
      </div>

      <div v-for="dag in props.dagen" :key="dag.datum" class="agendagrid__kolom" :style="{ height: `${gridHoogte}px` }">
        <div v-for="u in uurLabels" :key="u.label" class="agendagrid__lijn" :style="{ top: `${u.top}px` }" />
        <div
          v-for="item in geplandeItems(dag)"
          :key="item.id"
          class="agendagrid__item"
          :class="`agendagrid__item--${item.categorie}`"
          :style="{ top: `${top(item)}px`, height: `${hoogte(item)}px` }"
        >
          <span class="agendagrid__item-titel">{{ item.titel }}</span>
          <span v-if="item.contextLabel" class="agendagrid__item-context">{{ item.contextLabel }}</span>
        </div>
      </div>
    </div>

    <div v-if="props.dagen.some(d => ongeplandeItems(d).length)" class="agendagrid__ongepland">
      <p class="agendagrid__ongepland-label">Zonder tijdstip</p>
      <div class="flex flex-wrap gap-2">
        <template v-for="dag in props.dagen" :key="`${dag.datum}-ongepland`">
          <span
            v-for="item in ongeplandeItems(dag)"
            :key="item.id"
            class="agendagrid__chip"
            :class="`agendagrid__item--${item.categorie}`"
          >
            {{ item.titel }}
          </span>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.agendagrid {
  background-color: #fff;
  border-radius: 1.25rem;
  padding: 1.125rem 1.125rem 1.375rem;
  box-shadow: 0 10px 26px rgb(0 0 0 / 0.08);
  overflow-x: auto;
}

.agendagrid__header,
.agendagrid__body {
  display: grid;
  min-width: 640px;
}

.agendagrid__dagkop {
  text-align: center;
  padding: 0.25rem 0.375rem 0.875rem;
  border-bottom: 2px solid transparent;
}

.agendagrid__dagkop--vandaag {
  border-bottom-color: var(--color-stuurhut-ink);
}

.agendagrid__weekdag {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-stuurhut-muted);
  margin-bottom: 0.125rem;
}

.agendagrid__datum {
  font-weight: 700;
  font-size: 1.0625rem;
  color: var(--color-stuurhut-ink);
}

.agendagrid__uurlabel {
  position: absolute;
  right: 0.5rem;
  font-size: 0.6875rem;
  color: var(--color-stuurhut-muted);
  transform: translateY(-50%);
}

.agendagrid__kolom {
  position: relative;
  border-left: 1px solid rgb(0 0 0 / 0.06);
}

.agendagrid__lijn {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 1px solid rgb(0 0 0 / 0.05);
}

.agendagrid__item {
  position: absolute;
  left: 3px;
  right: 3px;
  border-radius: 0.5rem;
  padding: 0.3rem 0.5rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  justify-content: center;
}

.agendagrid__item-titel {
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.agendagrid__item-context {
  font-size: 0.6875rem;
  opacity: 0.8;
}

.agendagrid__item--klantwerk {
  background-color: #f5e3d3;
  border-left: 3px solid #b3702f;
  color: #5c3416;
}

.agendagrid__item--eigen_werk {
  background-color: #ece7de;
  border-left: 3px solid #948a76;
  color: #3a352b;
}

.agendagrid__item--prive {
  background-color: #e3ece1;
  border-left: 3px solid #4f7a48;
  color: #274023;
}

.agendagrid__chip {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.3rem 0.65rem;
  border-radius: 0.5rem;
}

.agendagrid__ongepland {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px dashed rgb(0 0 0 / 0.1);
}

.agendagrid__ongepland-label {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-stuurhut-muted);
  margin-bottom: 0.5rem;
}
</style>
