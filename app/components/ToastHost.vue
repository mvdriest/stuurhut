<script setup lang="ts">
const { toasts, dismiss } = useToast()
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 z-[70] flex flex-col items-center gap-2 px-4 bottom-[calc(96px+env(safe-area-inset-bottom))] md:bottom-6" aria-live="polite">
    <TransitionGroup enter-from-class="opacity-0 translate-y-2" leave-to-class="opacity-0" enter-active-class="transition duration-300 ease-out" leave-active-class="transition duration-200">
      <div v-for="t in toasts" :key="t.id" class="pointer-events-auto flex max-w-md items-center gap-3 rounded-full bg-primary py-1.5 pl-5 pr-1.5 text-[14.5px] text-on-primary shadow-float">
        <span class="py-2">{{ t.text }}</span>
        <button v-if="t.undo" type="button" class="min-h-10 rounded-full px-4 underline underline-offset-4 hover:opacity-80" @click="t.undo!(); dismiss(t.id)">Herstel</button>
        <NuxtLink v-else-if="t.to" :to="t.to" class="inline-flex min-h-10 items-center rounded-full px-4 underline underline-offset-4 hover:opacity-80" @click="dismiss(t.id)">{{ t.toLabel ?? 'Bekijk' }}</NuxtLink>
        <button type="button" class="grid size-10 place-items-center rounded-full opacity-70 hover:opacity-100" aria-label="Sluit melding" @click="dismiss(t.id)">
          <Icon name="tabler:x" class="size-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
