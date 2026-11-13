<script setup lang="ts">
const route = useRoute()
const account = useAccount()
const editor = useEditor()
const { count } = useInbox()
const toast = useToast()
const more = ref(false)
const main = NAV.slice(0, 4)
const extra = NAV.slice(4)
const isActive = (to: string) => (to === '/' ? route.path === '/' : route.path.startsWith(to))
const moreActive = computed(() => extra.some(i => isActive(i.to)))
watch(() => route.fullPath, () => { more.value = false })

</script>

<template>
  <div class="md:hidden">
    <Transition enter-from-class="opacity-0" leave-to-class="opacity-0" enter-active-class="transition-opacity duration-200" leave-active-class="transition-opacity duration-200">
      <div v-if="more" class="fixed inset-0 z-40 bg-black/25" @click="more = false" />
    </Transition>
    <Transition enter-from-class="translate-y-4 opacity-0" leave-to-class="translate-y-4 opacity-0" enter-active-class="transition duration-250 ease-out" leave-active-class="transition duration-200">
      <div v-if="more" class="fixed inset-x-3 z-50 card p-3 bottom-[calc(84px+env(safe-area-inset-bottom))]" role="dialog" aria-label="Meer pagina's">
        <div class="px-1 pb-3"><DomainSwitch /></div>
        <p class="px-3 pt-1 pb-2 text-[13px] text-muted">Nieuw</p>
        <div class="mb-2 grid grid-cols-3 gap-1.5 px-1">
          <button v-for="c in CREATE_ITEMS" :key="c.kind" type="button" class="flex min-h-[68px] flex-col items-center justify-center gap-1.5 rounded-[14px] text-[13px] text-cat-ink" :class="c.fill" @click="more = false; editor.open({ kind: c.kind })">
            <Icon :name="c.icon" class="size-5" />{{ c.label }}
          </button>
        </div>
        <div class="my-2 h-px bg-line" />
        <NuxtLink v-for="item in extra" :key="item.key" :to="item.to" :data-nav="item.key" class="flex min-h-12 items-center gap-3 rounded-[14px] px-3 text-[16px] " :class="isActive(item.to) ? 'bg-surface-2' : ''">
          <Icon :name="item.icon" class="size-5 text-sea" />
          {{ item.label }}
        </NuxtLink>
        <div class="my-2 h-px bg-line" />
        <button type="button" class="flex min-h-12 w-full items-center gap-3 rounded-[14px] px-3 text-[15px] text-muted" @click="more = false; editor.open({ kind: 'werktijden' })">
          <Icon name="tabler:clock" class="size-5" />
          Werktijden
        </button>
        <button v-if="account.mode.value === 'demo'" type="button" class="flex min-h-12 w-full items-center gap-3 rounded-[14px] px-3 text-[15px] font-medium text-muted" @click="more = false; account.resetDemo()">
          <Icon name="tabler:refresh" class="size-5" />
          Zet testdata terug
        </button>
        <button type="button" class="flex min-h-12 w-full items-center gap-3 rounded-[14px] px-3 text-[15px] font-medium" :class="account.mode.value === 'demo' ? 'text-copper' : 'text-muted'" @click="more = false; account.toggleDemo()">
          <Icon :name="account.mode.value === 'demo' ? 'tabler:arrow-left' : 'tabler:player-play'" class="size-5" />
          {{ account.mode.value === 'demo' ? 'Terug naar mijn data' : 'Bekijk de demo' }}
        </button>
        <button v-if="account.mode.value === 'echt'" type="button" class="flex min-h-12 w-full items-center gap-3 rounded-[14px] px-3 text-[15px] font-medium text-muted" @click="more = false; account.logout()">
          <Icon name="tabler:logout" class="size-5" />
          Uitloggen
        </button>
      </div>
    </Transition>

    <nav aria-label="Hoofdnavigatie" class="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-md pb-safe">
      <ul class="grid grid-cols-5 px-1">
        <li v-for="item in main" :key="item.key">
          <NuxtLink :to="item.to" :data-nav="item.key" class="relative flex min-h-[60px] flex-col items-center justify-center gap-1 text-[11px] " :class="isActive(item.to) ? 'text-ink' : 'text-muted'" :aria-current="isActive(item.to) ? 'page' : undefined">
            <span class="grid h-8 w-12 place-items-center rounded-full transition-colors" :class="isActive(item.to) ? 'bg-surface-3' : ''">
              <Icon :name="item.icon" class="size-[21px]" />
            </span>
            {{ item.short }}
            <span v-if="item.key === 'inbox' && count" class="num absolute right-[calc(50%-24px)] top-1.5 min-w-[17px] rounded-full bg-copper px-1 text-center text-[10px] leading-[17px] text-on-copper">{{ count }}</span>
          </NuxtLink>
        </li>
        <li>
          <button type="button" class="flex min-h-[60px] w-full flex-col items-center justify-center gap-1 text-[11px] " :class="moreActive || more ? 'text-ink' : 'text-muted'" :aria-expanded="more" @click="more = !more">
            <span class="grid h-8 w-12 place-items-center rounded-full" :class="moreActive ? 'bg-surface-3' : ''">
              <Icon name="tabler:dots" class="size-[21px]" />
            </span>
            Meer
          </button>
        </li>
      </ul>
    </nav>
  </div>
</template>
