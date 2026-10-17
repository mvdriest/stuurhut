<script setup lang="ts">
// Kop van elke pagina in de kaartstijl: een balk met chips (links naast de menuknop,
// die vast linksboven zweeft) en daaronder de paginatitel in Komu.
defineProps<{
  titel: string
  subtitel?: string
  /** Kleine regel boven de titel, bijv. de datum. */
  kicker?: string
}>()
</script>

<template>
  <header class="paginakop stuurhut-kolom">
    <div class="paginakop__balk">
      <div class="paginakop__links">
        <slot name="balk-links" />
      </div>
      <div class="paginakop__rechts">
        <slot name="balk-rechts" />
      </div>
    </div>

    <div class="paginakop__titelblok">
      <div class="min-w-0">
        <p v-if="kicker" class="sh-kicker mb-2">{{ kicker }}</p>
        <h1 class="sh-titel paginakop__titel">{{ titel }}</h1>
        <p v-if="subtitel" class="paginakop__sub">{{ subtitel }}</p>
        <slot name="onder-titel" />
      </div>
      <div class="paginakop__acties">
        <slot />
      </div>
    </div>
  </header>
</template>

<style scoped>
.paginakop {
  position: relative;
  z-index: 10;
  padding-top: 1.25rem;
}

.paginakop__balk {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  min-height: 3.25rem;
  /* Ruimte voor de vaste menuknop linksboven. */
  padding-left: 3.75rem;
}

.paginakop__links,
.paginakop__rechts {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.paginakop__titelblok {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
  margin-top: clamp(1.5rem, 4vw, 3rem);
  padding-inline: 0.25rem;
}

.paginakop__titel {
  font-size: clamp(2.25rem, 4.5vw, 3.75rem);
  text-shadow: 0 1px 16px rgb(255 255 255 / 0.7);
}

.paginakop__sub {
  margin-top: 0.6rem;
  max-width: 40rem;
  font-size: 0.95rem;
  color: var(--color-stuurhut-muted);
  text-shadow: 0 1px 12px rgb(255 255 255 / 0.8);
}

.paginakop__acties {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.paginakop__acties:empty {
  display: none;
}

</style>
