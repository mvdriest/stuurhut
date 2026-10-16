// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/supabase', '@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      link: [
        { rel: 'stylesheet', href: 'https://use.typekit.net/bwn5gwk.css' }
      ]
    }
  },
  // Het design (crème/inkt) is alleen licht uitgewerkt; zonder dit volgt Nuxt UI het
  // systeemthema en worden knoppen, invoervelden en panelen donker op een crème pagina.
  colorMode: {
    preference: 'light',
    fallback: 'light',
    storageKey: 'stuurhut-kleurmodus'
  },
  supabase: {
    redirect: false
  },
  runtimeConfig: {
    geminiApiKey: '',
    telegramBotToken: '',
    telegramWebhookSecret: '',
    telegramAllowedUserId: ''
  }
})
