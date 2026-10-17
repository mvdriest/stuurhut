<script setup lang="ts">
// Het hoofdmenu op elke pagina: de "Scaling Hamburger Navigation" van Osmo Supply,
// linksboven verankerd (waar op de kaart de menuknop zit) en in de kaartstijl gezet.
// Markup, data-attributen en animatie-aanpak (CSS-transities op data-navigation-status)
// zijn die van het origineel; alleen de toggle-logica is naar Vue verhuisd.
const route = useRoute()
const supabase = useSupabaseClient()
const { open: snelMenuOpen } = useSnelMenu()

const status = ref<'active' | 'not-active'>('not-active')

const items = [
  { label: 'Kaart', to: '/' },
  { label: 'Vandaag', to: '/vandaag' },
  { label: 'Agenda', to: '/agenda' },
  { label: 'Trajecten', to: '/trajecten' },
  { label: 'Klanten', to: '/klanten' },
  { label: 'Journal', to: '/journal' },
  { label: 'Ideeën', to: '/ideeen' }
]

function isHuidig(to: string) {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}

function toggle() {
  status.value = status.value === 'active' ? 'not-active' : 'active'
}

function sluit() {
  status.value = 'not-active'
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') sluit()
}

onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
watch(() => route.path, sluit)

async function uitloggen() {
  sluit()
  await supabase.auth.signOut()
  await navigateTo('/login')
}
</script>

<template>
  <nav :data-navigation-status="status" class="navigation" aria-label="Hoofdmenu">
    <div data-navigation-toggle="close" class="navigation__dark-bg" @click="sluit" />
    <div class="hamburger-nav">
      <div class="hamburger-nav__bg" />
      <div class="hamburger-nav__group" :inert="status !== 'active'">
        <p class="hamburger-nav__menu-p">Stuurhut</p>
        <ul class="hamburger-nav__ul">
          <li v-for="item in items" :key="item.to" class="hamburger-nav__li">
            <NuxtLink :to="item.to" :aria-current="isHuidig(item.to) ? 'page' : undefined" class="hamburger-nav__a">
              <p class="hamburger-nav__p">{{ item.label }}</p>
              <div class="hamburger-nav__dot" />
            </NuxtLink>
          </li>
        </ul>
        <button type="button" class="hamburger-nav__uit" @click="sluit(); snelMenuOpen = true">
          <UIcon name="i-lucide-search" class="size-4" /> Snelmenu <UKbd value="meta" size="sm" /><UKbd value="K" size="sm" />
        </button>
        <button type="button" class="hamburger-nav__uit" @click="uitloggen">
          <UIcon name="i-lucide-log-out" class="size-4" /> Uitloggen
        </button>
      </div>
      <button
        type="button"
        data-navigation-toggle="toggle"
        class="hamburger-nav__toggle"
        :aria-expanded="status === 'active'"
        :aria-label="status === 'active' ? 'Menu sluiten' : 'Menu openen'"
        @click="toggle"
      >
        <div class="hamburger-nav__toggle-bar" />
        <div class="hamburger-nav__toggle-bar" />
      </button>
    </div>
  </nav>
</template>

<style scoped>
.navigation {
  --ease: cubic-bezier(0.5, 0.5, 0, 1);
  z-index: 500;
  pointer-events: none;
  position: fixed;
  inset: 0;
}

.navigation__dark-bg {
  transition: all 0.7s var(--ease);
  opacity: 0;
  pointer-events: auto;
  visibility: hidden;
  background-color: #1d2a1a;
  position: absolute;
  inset: 0;
}

[data-navigation-status="active"] .navigation__dark-bg {
  opacity: 0.25;
  visibility: visible;
}

.hamburger-nav {
  border-radius: 1.5em;
  position: absolute;
  top: 1.25rem;
  left: 1.25rem;
  font-size: 16px;
}

.hamburger-nav__bg {
  transition: all 0.7s var(--ease);
  background-color: rgb(253 250 244 / 0.96);
  backdrop-filter: blur(12px);
  box-shadow: 0 6px 20px rgb(30 40 50 / 0.12);
  border-radius: 1rem;
  width: 3.25rem;
  height: 3.25rem;
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: auto;
}

[data-navigation-status="active"] .hamburger-nav__bg {
  width: 100%;
  height: 100%;
  border-radius: 1.5rem;
}

.hamburger-nav__group {
  transition: all 0.5s var(--ease), transform 0.7s var(--ease);
  gap: 1em;
  pointer-events: auto;
  transform-origin: 0 0;
  flex-flow: column;
  padding: 4.75em 2.5em 1.75em 2em;
  display: flex;
  position: relative;
  transform: scale(0.15) rotate(0.001deg);
  opacity: 0;
  visibility: hidden;
}

[data-navigation-status="active"] .hamburger-nav__group {
  transform: scale(1) rotate(0.001deg);
  opacity: 1;
  visibility: visible;
}

.hamburger-nav__menu-p {
  opacity: 0.5;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.75em;
}

.hamburger-nav__ul {
  gap: 0.375em;
  flex-flow: column;
  padding: 0;
  margin: 0;
  display: flex;
}

.hamburger-nav__li {
  list-style: none;
}

.hamburger-nav__a {
  color: var(--color-stuurhut-ink);
  justify-content: space-between;
  align-items: center;
  text-decoration: none;
  display: flex;
}

.hamburger-nav__a[aria-current] .hamburger-nav__p {
  opacity: 0.33;
}

.hamburger-nav__p {
  white-space: nowrap;
  padding-right: 1.25em;
  font-size: 2.25em;
  font-family: var(--font-display);
  line-height: 1.1;
}

.hamburger-nav__dot {
  transition: all 0.7s var(--ease);
  background-color: currentColor;
  border-radius: 50%;
  flex-shrink: 0;
  width: 0.5em;
  height: 0.5em;
  transform: scale(0) rotate(0.001deg);
  opacity: 0.5;
}

.hamburger-nav__a[aria-current] .hamburger-nav__dot {
  transform: scale(1) rotate(0.001deg);
  opacity: 1;
  background-color: #7bb33a;
}

.hamburger-nav:has(.hamburger-nav__a:hover) .hamburger-nav__dot {
  transform: scale(0) rotate(0.001deg);
}

.hamburger-nav .hamburger-nav__a:hover .hamburger-nav__dot {
  transform: scale(1) rotate(0.001deg);
  opacity: 0.25;
}

.hamburger-nav__uit {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5em;
  font-size: 0.85rem;
  color: var(--color-stuurhut-muted);
}

.hamburger-nav__uit:hover {
  color: var(--color-stuurhut-ink);
}

.hamburger-nav__toggle {
  transition: transform 0.7s var(--ease);
  pointer-events: auto;
  cursor: pointer;
  border-radius: 50%;
  justify-content: center;
  align-items: center;
  width: 3.25rem;
  height: 3.25rem;
  display: flex;
  position: absolute;
  top: 0;
  left: 0;
  transform: translate(0em, 0em) rotate(0.001deg);
}

[data-navigation-status="active"] .hamburger-nav__toggle {
  transform: translate(1em, 1em) rotate(0.001deg);
}

.hamburger-nav__toggle-bar {
  transition: transform 0.7s var(--ease);
  background-color: var(--color-stuurhut-ink);
  width: 40%;
  height: 0.125em;
  position: absolute;
  transform: translateY(-0.15em) rotate(0.001deg);
}

.hamburger-nav__toggle:hover .hamburger-nav__toggle-bar {
  transform: translateY(0.15em) rotate(0.001deg);
}

[data-navigation-status="active"] .hamburger-nav__toggle .hamburger-nav__toggle-bar {
  transform: translateY(0em) rotate(45deg);
}

.hamburger-nav__toggle .hamburger-nav__toggle-bar:nth-child(2) {
  transition: transform 0.7s var(--ease);
  transform: translateY(0.15em) rotate(0.001deg);
}

.hamburger-nav__toggle:hover .hamburger-nav__toggle-bar:nth-child(2) {
  transform: translateY(-0.15em) rotate(0.001deg);
}

[data-navigation-status="active"] .hamburger-nav__toggle .hamburger-nav__toggle-bar:nth-child(2) {
  transform: translateY(0em) rotate(-45deg);
}
</style>
