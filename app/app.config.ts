export default defineAppConfig({
  ui: {
    colors: {
      // Knoppen in inkt (zoals "Bel" in het dossier); limoen is voorbehouden aan de
      // ene belangrijkste actie per scherm (.sh-cta) en zit daarom niet in Nuxt UI.
      primary: 'neutral',
      neutral: 'neutral'
    },
    card: {
      slots: {
        root: 'rounded-[1.25rem] overflow-hidden backdrop-blur-md shadow-[0_10px_30px_rgb(30_40_50/0.14)]'
      },
      variants: {
        variant: {
          outline: { root: 'bg-[var(--color-stuurhut-glas)] ring-0 divide-y divide-black/5' },
          subtle: { root: 'bg-[var(--color-stuurhut-glas)] ring-0 divide-y divide-black/5' }
        }
      }
    },
    slideover: {
      slots: {
        content: 'bg-[var(--color-stuurhut-card)]'
      }
    }
  }
})
