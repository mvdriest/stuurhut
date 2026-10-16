<script setup lang="ts">
import type { KaartPlek } from '~/utils/kaartPlekken'

defineProps<{
  plek: KaartPlek
  subtitel: string
  actief?: boolean
}>()

defineEmits<{ kies: [] }>()
</script>

<template>
  <div class="kaartpin" :class="{ 'kaartpin--actief': actief, 'kaartpin--links': plek.x > 70 }" :style="{ left: `${plek.x}%`, top: `${plek.y}%` }">
    <button
      type="button"
      class="kaartpin__knop"
      data-kaart-interactief
      :aria-label="`${plek.label} — ${subtitel}`"
      @click="$emit('kies')"
    >
      <span class="kaartpin__icoon" :style="{ background: `linear-gradient(135deg, ${plek.kleur[0]}, ${plek.kleur[1]})` }">
        <UIcon :name="plek.icoon" class="size-6" />
      </span>
      <span class="kaartpin__tekst">
        <span class="kaartpin__label">{{ plek.label }}</span>
        <span class="kaartpin__sub">{{ subtitel }}</span>
      </span>
    </button>
    <span class="kaartpin__steel" aria-hidden="true" />
    <span class="kaartpin__voet" aria-hidden="true" />
  </div>
</template>

<style scoped>
/* Het ankerpunt (left/top) is de voet van de pin, op de grond van de kaart. */
.kaartpin {
  position: absolute;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  transform: rotateX(var(--kaart-tegenkanteling, 0deg)) scale(var(--kaart-tegenschaal, 1));
  transform-origin: 0 0;
}

.kaartpin__knop {
  position: absolute;
  bottom: 4.25rem;
  left: -1.6rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1.25rem 0.5rem 0.5rem;
  border-radius: 1rem;
  background: rgb(253 250 244 / 0.94);
  backdrop-filter: blur(8px);
  box-shadow: 0 10px 30px rgb(30 40 50 / 0.22), 0 1px 0 rgb(255 255 255 / 0.8) inset;
  white-space: nowrap;
  pointer-events: auto;
  cursor: pointer;
  transition: transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 220ms;
}

/* Pins aan de rechterkant klappen naar links uit, anders valt het kaartje van het scherm. */
.kaartpin--links .kaartpin__knop {
  left: auto;
  right: -1.6rem;
  flex-direction: row-reverse;
  padding: 0.5rem 0.5rem 0.5rem 1.25rem;
}

.kaartpin--links .kaartpin__icoon {
  margin-left: 0;
  margin-right: -1.1rem;
}

.kaartpin--links .kaartpin__tekst {
  text-align: right;
}

.kaartpin__knop:hover,
.kaartpin__knop:focus-visible,
.kaartpin--actief .kaartpin__knop {
  transform: translateY(-4px);
  box-shadow: 0 16px 40px rgb(30 40 50 / 0.3), 0 1px 0 rgb(255 255 255 / 0.8) inset;
}

.kaartpin__knop:focus-visible {
  outline: 2px solid var(--color-stuurhut-ink);
  outline-offset: 3px;
}

.kaartpin__icoon {
  display: grid;
  place-items: center;
  width: 3.25rem;
  height: 3.25rem;
  margin-left: -1.1rem;
  border-radius: 9999px;
  color: #fff;
  box-shadow: 0 6px 16px rgb(0 0 0 / 0.2), 0 0 0 4px rgb(255 255 255 / 0.9);
}

.kaartpin__tekst {
  display: flex;
  flex-direction: column;
  text-align: left;
}

.kaartpin__label {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-stuurhut-ink);
}

.kaartpin__sub {
  font-size: 0.8rem;
  color: var(--color-stuurhut-muted);
}

.kaartpin__steel {
  position: absolute;
  left: -1px;
  bottom: 0.4rem;
  width: 2px;
  height: 3.9rem;
  background: linear-gradient(to bottom, rgb(255 255 255 / 0.95), rgb(255 255 255 / 0.6));
  box-shadow: 0 0 4px rgb(0 0 0 / 0.25);
}

.kaartpin__voet {
  position: absolute;
  left: -0.45rem;
  top: -0.45rem;
  width: 0.9rem;
  height: 0.9rem;
  border-radius: 9999px;
  border: 3px solid #fff;
  background: rgb(255 255 255 / 0.3);
  box-shadow: 0 1px 4px rgb(0 0 0 / 0.35);
}
</style>
