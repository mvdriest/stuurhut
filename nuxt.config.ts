import tailwindcss from '@tailwindcss/vite'

// Stuurhut — de interface draait client-side (SPA). De data staat in Supabase;
// server/api/** praat met Supabase, Gemini en Telegram, zodat sleutels nooit in de browser komen.
export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  ssr: false,
  devtools: { enabled: false },
  telemetry: false,

  modules: ['@nuxt/icon', '@vueuse/nuxt', '@vite-pwa/nuxt', '@nuxtjs/supabase'],

  // De redirect-beslissing zit in app/middleware/auth.global.ts.
  supabase: { redirect: false },

  runtimeConfig: {
    geminiApiKey: '',
    telegramBotToken: '',
    telegramWebhookSecret: '',
    telegramAllowedUserId: '',
    cronSecret: '',
    ritmeToken: '',
    vapidPrivateKey: '',
    public: { vapidPublicKey: '' },
  },

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  app: {
    head: {
      htmlAttrs: { lang: 'nl' },
      title: 'Stuurhut',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#F1F1EE', media: '(prefers-color-scheme: light)' },
        { name: 'theme-color', content: '#0F1012', media: '(prefers-color-scheme: dark)' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: 'Stuurhut' },
        { name: 'color-scheme', content: 'light dark' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
    },
  },

  // Iconen lokaal bundelen: geen Iconify-API.
  icon: {
    mode: 'svg',
    provider: 'none',
    serverBundle: false,
    clientBundle: {
      scan: true,
      icons: ['tabler:alert-circle', 'tabler:arrow-right', 'tabler:arrow-up-right', 'tabler:bolt', 'tabler:briefcase', 'tabler:bulb', 'tabler:calendar-event', 'tabler:calendar-week', 'tabler:check', 'tabler:chevron-left', 'tabler:coin-euro', 'tabler:dots', 'tabler:grip-vertical', 'tabler:info-circle', 'tabler:receipt-tax', 'tabler:pig-money', 'tabler:send', 'tabler:file-invoice', 'tabler:clipboard-list', 'tabler:home-2', 'tabler:id', 'tabler:shield', 'tabler:car', 'tabler:book', 'tabler:player-play', 'tabler:player-pause', 'tabler:pencil', 'tabler:repeat', 'tabler:user-plus', 'tabler:arrow-up', 'tabler:message-circle', 'tabler:flag', 'tabler:sun', 'tabler:checkbox', 'tabler:receipt', 'tabler:heart', 'tabler:map-pin', 'tabler:clock', 'tabler:calendar', 'tabler:chevron-down', 'tabler:home', 'tabler:inbox', 'tabler:layout-sidebar-right', 'tabler:leaf', 'tabler:mail', 'tabler:messages', 'tabler:microphone', 'tabler:moon', 'tabler:note', 'tabler:plus', 'tabler:refresh', 'tabler:search', 'tabler:steering-wheel', 'tabler:trash', 'tabler:trending-down', 'tabler:trending-up', 'tabler:users', 'tabler:walk', 'tabler:wave-sine', 'tabler:x', 'tabler:layout-kanban', 'tabler:minus', 'tabler:moon-stars', 'tabler:device-laptop', 'tabler:sunrise', 'tabler:stethoscope', 'tabler:history', 'tabler:logout', 'tabler:lock', 'tabler:hourglass', 'tabler:route', 'tabler:bell', 'tabler:bell-off'],
      sizeLimitKb: 512,
    },
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Stuurhut',
      short_name: 'Stuurhut',
      description: 'Jij bepaalt de koers. Stuurman houdt overzicht.',
      lang: 'nl',
      display: 'standalone',
      start_url: '/',
      background_color: '#F1F1EE',
      theme_color: '#F1F1EE',
      icons: [
        { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: { navigateFallback: '/', navigateFallbackDenylist: [/^\/api\//], importScripts: ['/push-sw.js'] },
    devOptions: { enabled: false },
  },
})
