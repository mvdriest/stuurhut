<script setup lang="ts">
const supabase = useSupabaseClient()
const route = useRoute()

const open = useCookie<boolean>('stuurhut_sidebar_open', { default: () => true })

function toggle() {
  open.value = !open.value
}

interface NavItem {
  label: string
  to: string
}

interface NavGroup {
  naam: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    naam: 'Dagelijks',
    items: [
      { label: 'Vandaag', to: '/' },
      { label: 'Agenda', to: '/agenda' },
      { label: 'Journal', to: '/journal' }
    ]
  },
  {
    naam: 'Overzicht',
    items: [
      { label: 'Trajecten', to: '/trajecten' },
      { label: 'Ideeën', to: '/ideeen' },
      { label: 'Doelen', to: '/#doelen' },
      { label: 'Financiën', to: '/#financien' }
    ]
  }
]

function isActive(to: string) {
  if (to.startsWith('/#')) return false
  return route.path === to
}

async function logout() {
  await supabase.auth.signOut()
  await navigateTo('/login')
}
</script>

<template>
  <aside class="app-sidebar" :class="{ 'app-sidebar--collapsed': !open }">
    <div class="app-sidebar__top">
      <div class="app-sidebar__merk">
        <span class="app-sidebar__dot" />
        <span v-if="open" class="app-sidebar__wordmark">Stuurhut</span>
      </div>
      <button type="button" class="app-sidebar__toggle" :title="open ? 'Inklappen' : 'Uitklappen'" @click="toggle">
        <span /><span />
      </button>
    </div>

    <nav class="app-sidebar__nav">
      <div v-for="group in navGroups" :key="group.naam" class="app-sidebar__groep">
        <span v-if="open" class="app-sidebar__groepnaam">{{ group.naam }}</span>
        <NuxtLink
          v-for="item in group.items"
          :key="item.label"
          :to="item.to"
          :title="item.label"
          class="app-sidebar__item"
          :class="{ 'app-sidebar__item--actief': isActive(item.to), 'app-sidebar__item--collapsed': !open }"
        >
          <template v-if="open">
            <span class="app-sidebar__item-dot" />
            <span>{{ item.label }}</span>
          </template>
          <span v-else class="app-sidebar__monogram">{{ item.label.charAt(0) }}</span>
        </NuxtLink>
      </div>
    </nav>

    <button type="button" class="app-sidebar__item app-sidebar__uitloggen" :class="{ 'app-sidebar__item--collapsed': !open }" title="Uitloggen" @click="logout">
      <template v-if="open">
        <span class="app-sidebar__item-dot" />
        <span>Uitloggen</span>
      </template>
      <span v-else class="app-sidebar__monogram">↦</span>
    </button>

    <div v-if="open" class="app-sidebar__telegram">
      <div class="app-sidebar__telegram-kop">
        <span class="app-sidebar__telegram-dot" />
        <span>Telegram</span>
      </div>
      <span class="app-sidebar__telegram-tekst">Spreek onderweg iets in — het landt vanzelf op de juiste plek.</span>
    </div>
  </aside>
</template>

<style scoped>
.app-sidebar {
  position: sticky;
  top: 0;
  align-self: flex-start;
  height: 100vh;
  width: 232px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 1.375rem;
  padding: 1.625rem 1rem;
  background-color: var(--color-stuurhut-sidebar);
  border-right: 1px solid rgb(255 255 255 / 0.08);
  transition: width 0.2s ease, padding 0.2s ease;
}

.app-sidebar--collapsed {
  width: 72px;
  padding: 1.625rem 0.625rem;
}

.app-sidebar__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0 0.375rem;
}

.app-sidebar__merk {
  display: flex;
  align-items: center;
  gap: 0.5625rem;
  min-width: 0;
  overflow: hidden;
}

.app-sidebar__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: oklch(78% 0.14 70);
  box-shadow: 0 0 14px oklch(78% 0.14 70);
}

.app-sidebar__wordmark {
  font-family: var(--font-display);
  text-transform: uppercase;
  font-size: 1.4375rem;
  letter-spacing: 0.05em;
  color: oklch(97% 0.02 82);
  white-space: nowrap;
}

.app-sidebar__toggle {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: rgb(255 255 255 / 0.06);
  transition: background 150ms ease;
}

.app-sidebar__toggle:hover {
  background: rgb(255 255 255 / 0.12);
}

.app-sidebar__toggle span {
  width: 12px;
  height: 1.5px;
  background: oklch(78% 0.03 70);
}

.app-sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
  overflow-y: auto;
}

.app-sidebar__groep {
  display: flex;
  flex-direction: column;
  gap: 0.1875rem;
}

.app-sidebar__groepnaam {
  font-size: 0.59375rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: oklch(58% 0.03 66);
  padding: 0 0.75rem 0.375rem;
  white-space: nowrap;
}

.app-sidebar__item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 0.84375rem;
  font-weight: 600;
  padding: 0.625rem 0.75rem;
  border-radius: 11px;
  color: oklch(82% 0.02 74);
  transition: background 180ms ease;
  overflow: hidden;
  white-space: nowrap;
}

.app-sidebar__item:hover {
  background: rgb(255 255 255 / 0.08);
}

.app-sidebar__item--collapsed {
  justify-content: center;
  padding: 0.625rem 0;
}

.app-sidebar__item--actief {
  background: oklch(30% 0.06 52);
  color: oklch(98% 0.02 82);
}

.app-sidebar__item-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
  background: rgb(255 255 255 / 0.22);
}

.app-sidebar__item--actief .app-sidebar__item-dot {
  background: oklch(78% 0.14 70);
}

.app-sidebar__monogram {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6875rem;
  font-weight: 700;
  background: rgb(255 255 255 / 0.07);
  color: oklch(82% 0.02 74);
}

.app-sidebar__item--actief .app-sidebar__monogram {
  background: oklch(30% 0.06 52);
  color: oklch(98% 0.02 82);
}

.app-sidebar__uitloggen {
  margin-top: auto;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  font-family: inherit;
  cursor: pointer;
}

.app-sidebar__telegram {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.875rem 0.8125rem;
  border-radius: 14px;
  background: rgb(255 255 255 / 0.06);
  border: 1px solid rgb(255 255 255 / 0.09);
}

.app-sidebar__telegram-kop {
  display: flex;
  align-items: center;
  gap: 0.4375rem;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: oklch(78% 0.04 72);
}

.app-sidebar__telegram-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: oklch(72% 0.14 148);
}

.app-sidebar__telegram-tekst {
  font-size: 0.75rem;
  line-height: 1.5;
  color: oklch(76% 0.025 74);
}
</style>
