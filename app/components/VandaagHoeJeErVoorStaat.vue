<script setup lang="ts">
// Bewust géén live optelling van de nieuwe bedrag_*-velden per traject: de spec vraagt
// om een wekelijks bijgewerkt overzicht (geen live rollup), en dat is een aparte,
// nog te bouwen Financiën-module — geen verzonnen cijfers hier.
</script>

<template>
  <div class="vandaagkaart vandaagkaart--uit">
    <h3 class="vandaagkaart__titel">Hoe je ervoor staat</h3>
    <p class="text-sm text-stuurhut-muted mt-2">
      Financiën volgt nog — dit onderdeel wordt actief zodra er facturatie-gegevens zijn.
    </p>
  </div>
</template>

<style scoped>
.vandaagkaart--uit {
  background-color: transparent;
  border: 2px dashed rgb(0 0 0 / 0.15);
  border-radius: 1.125rem;
  padding: 1.125rem 1.25rem;
}

.vandaagkaart__titel {
  font-family: var(--font-display);
  text-transform: uppercase;
  font-size: 1.375rem;
  color: var(--color-stuurhut-ink);
  opacity: 0.6;
}
</style>
