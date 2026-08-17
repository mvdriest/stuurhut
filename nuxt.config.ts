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
  supabase: {
    redirect: false
  },
  runtimeConfig: {
    geminiApiKey: '',
    telegramBotToken: '',
    telegramAllowedUserId: ''
  }
})
