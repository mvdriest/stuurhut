<script setup lang="ts">
// iPad: smalle iconenrail. Mac (≥1280): zijbalk met labels, groepen en tellers.
const route = useRoute()
const account = useAccount()
const { count } = useInbox()
const { opportunities } = useOpportunities()
const { unscheduled } = useTasks()
const { open: openAssignments } = useAssignments()
const toast = useToast()
const D = useDomain()
const Sl = useSleep()
const editor = useEditor()
const isActive = (to: string) => (to === '/' ? route.path === '/' : route.path.startsWith(to))
const counts = computed<Record<string, number>>(() => ({
  inbox: count.value,
  opdrachten: openAssignments.value.length,
  week: unscheduled.value.length,
  kansen: opportunities.value.filter(o => o.status === 'nieuw').length,
}))

</script>

<template>
  <nav aria-label="Hoofdnavigatie" class="hidden md:flex fixed inset-y-0 left-0 z-30 w-[76px] xl:w-[240px] flex-col border-r border-line bg-surface">
    <div class="flex items-center gap-3 px-4 pt-5 pb-4 xl:px-5">
      <NuxtLink to="/" aria-label="Stuurhut, naar Thuisbasis"><AppMark :size="40" /></NuxtLink>
      <span class="hidden text-[19px] xl:inline">{{ APP_NAME }}</span>
    </div>

    <div class="px-3 pb-3 xl:px-4">
      <NewMenu />
    </div>

    <div class="hidden px-4 pb-1 xl:block">
      <DomainSwitch compact />
      <p v-if="Sl.quiet.value" class="mt-2 flex items-center gap-1.5 px-1 text-[12.5px] text-muted"><Icon name="tabler:moon-stars" class="size-3.5" />Afbouwen · laptop dicht</p>
      <p v-else-if="D.evening.value" class="mt-2 flex items-center gap-1.5 px-1 text-[12.5px] text-muted"><Icon name="tabler:moon" class="size-3.5" />Avondmodus · privé eerst</p>
      <p v-if="D.previewOff.value" class="mt-1.5 flex items-center gap-1.5 px-1 text-[12.5px] text-copper-ink">
        Avondmodus-voorbeeld staat aan
        <button type="button" class="ml-auto underline underline-offset-2" @click="D.previewOff.value = false">Uit</button>
      </p>
    </div>

    <div class="flex-1 overflow-y-auto px-3 xl:px-4 no-scrollbar">
      <template v-for="g in NAV_GROUPS" :key="g">
        <p class="hidden px-3 pt-4 pb-1.5 text-[12.5px] text-muted xl:block">{{ g }}</p>
        <div class="mx-auto my-2 h-px w-8 bg-line xl:hidden" />
        <ul class="space-y-0.5">
          <li v-for="item in NAV.filter(n => n.group === g)" :key="item.key">
            <NuxtLink
              :to="item.to"
              :data-nav="item.key"
              :title="item.label"
              class="relative flex min-h-11 items-center justify-center gap-3 rounded-[12px] text-[15px] transition-colors xl:justify-start xl:px-3"
              :class="isActive(item.to) ? 'bg-surface-2 text-ink' : 'text-muted hover:text-ink hover:bg-surface-2/70'"
              :aria-current="isActive(item.to) ? 'page' : undefined"
            >
              <Icon :name="item.icon" class="size-[21px] shrink-0" />
              <span class="hidden flex-1 xl:inline">{{ item.label }}</span>
              <span v-if="counts[item.key]" class="num hidden text-[14px] text-muted xl:inline">{{ counts[item.key] }}</span>
              <span v-if="item.key === 'inbox' && count" class="absolute right-2.5 top-2 size-2 rounded-full bg-copper xl:hidden" />
            </NuxtLink>
          </li>
        </ul>
      </template>
    </div>

    <div class="space-y-1 border-t border-line p-3 xl:p-4">
      <button type="button" class="flex min-h-11 w-full items-center justify-center gap-3 rounded-[12px] text-[14.5px] text-muted hover:bg-surface-2 hover:text-ink xl:justify-start xl:px-3" title="Werktijden" @click="editor.open({ kind: 'werktijden' })">
        <Icon name="tabler:clock" class="size-5" />
        <span class="hidden flex-1 text-left xl:inline">Werktijden</span><span class="num hidden whitespace-nowrap text-[13px] xl:inline">{{ D.work.value.start }}–{{ D.work.value.end }}</span>
      </button>
      <button v-if="account.mode.value === 'demo'" type="button" class="flex min-h-11 w-full items-center justify-center gap-3 rounded-[12px] text-[14.5px] text-muted hover:bg-surface-2 hover:text-ink xl:justify-start xl:px-3" title="Zet testdata terug" @click="account.resetDemo">
        <Icon name="tabler:refresh" class="size-5" />
        <span class="hidden xl:inline">Zet testdata terug</span>
      </button>
      <button type="button" class="flex min-h-11 w-full items-center justify-center gap-3 rounded-[12px] text-[14.5px] hover:bg-surface-2 hover:text-ink xl:justify-start xl:px-3" :class="account.mode.value === 'demo' ? 'text-copper' : 'text-muted'" :title="account.mode.value === 'demo' ? 'Terug naar mijn data' : 'Bekijk de demo met testdata'" @click="account.toggleDemo">
        <Icon :name="account.mode.value === 'demo' ? 'tabler:arrow-left' : 'tabler:player-play'" class="size-5" />
        <span class="hidden xl:inline">{{ account.mode.value === 'demo' ? 'Terug naar mijn data' : 'Bekijk de demo' }}</span>
      </button>
      <div class="flex items-center justify-center gap-3 rounded-[12px] py-1.5 xl:justify-start xl:px-2">
        <UiAvatar :name="USER_NAME" tint="sand" :size="34" />
        <span class="hidden min-w-0 xl:block">
          <span class="block text-[14.5px] leading-tight">{{ USER_NAME }}</span>
          <span class="block text-[12.5px] text-muted">Kapitein</span>
        </span>
        <button type="button" class="ml-auto hidden size-9 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink xl:grid" title="Uitloggen" aria-label="Uitloggen" @click="account.logout">
          <Icon name="tabler:logout" class="size-[18px]" />
        </button>
      </div>
    </div>
  </nav>
</template>
