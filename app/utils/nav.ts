export interface NavItem { key: string, to: string, label: string, short: string, icon: string, group: 'Overzicht' | 'Werk' | 'Jij' }

export const NAV: NavItem[] = [
  { key: 'thuis', to: '/', label: 'Thuisbasis', short: 'Thuis', icon: 'tabler:home', group: 'Overzicht' },
  { key: 'inbox', to: '/hoofd-leeg', label: 'Hoofd leeg', short: 'Hoofd leeg', icon: 'tabler:inbox', group: 'Overzicht' },
  { key: 'week', to: '/week', label: 'Week', short: 'Week', icon: 'tabler:calendar-week', group: 'Overzicht' },
  { key: 'opdrachten', to: '/opdrachten', label: 'Opdrachten', short: 'Opdrachten', icon: 'tabler:layout-kanban', group: 'Werk' },
  { key: 'klanten', to: '/klanten', label: 'Klanten', short: 'Klanten', icon: 'tabler:users', group: 'Werk' },
  { key: 'kansen', to: '/kansen', label: 'Kansen', short: 'Kansen', icon: 'tabler:bulb', group: 'Werk' },
  { key: 'financien', to: '/financien', label: 'Financiën', short: 'Geld', icon: 'tabler:coin-euro', group: 'Werk' },
  { key: 'ritme', to: '/ritme', label: 'Ritme', short: 'Ritme', icon: 'tabler:wave-sine', group: 'Jij' },
  { key: 'terugblik', to: '/terugblik', label: 'Terugblik', short: 'Terugblik', icon: 'tabler:history', group: 'Jij' },
  { key: 'admin', to: '/admin', label: 'Levensadmin', short: 'Admin', icon: 'tabler:clipboard-list', group: 'Jij' },
]
export const NAV_GROUPS = ['Overzicht', 'Werk', 'Jij'] as const
