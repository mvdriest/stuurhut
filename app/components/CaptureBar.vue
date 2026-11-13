<script setup lang="ts">
const props = withDefaults(defineProps<{ placeholder?: string, large?: boolean, stayHere?: boolean }>(), { placeholder: 'Wat zit er in je hoofd?' })
const emit = defineEmits<{ added: [id: string] }>()
const text = ref('')
const inbox = useInbox()
const toast = useToast()
const box = ref<HTMLElement | null>(null)

function submit() {
  const item = inbox.add(text.value)
  if (!item) return
  if (!props.stayHere) flyTo(box.value, 'inbox')
  text.value = ''
  emit('added', item.id)
  if (!props.stayHere) toast.push({ text: 'Staat in Hoofd leeg. Ik denk mee over een plek.', to: '/hoofd-leeg', toLabel: 'Bekijk' })
}
function speak() {
  toast.push({ text: 'Inspreken komt later. Typen werkt al.' })
}
</script>

<template>
  <form ref="box" class="card flex items-center gap-2 p-2 pl-5" :class="large ? 'min-h-[76px]' : 'min-h-16'" @submit.prevent="submit">
    <Icon name="tabler:plus" class="size-5 shrink-0 text-muted" />
    <label class="sr-only" for="capture">Wat zit er in je hoofd?</label>
    <input id="capture" v-model="text" :placeholder="placeholder" autocomplete="off" enterkeyhint="done" class="min-w-0 flex-1 bg-transparent py-3 outline-none placeholder:text-muted" :class="large ? 'text-[19px]' : 'text-[16px]'">
    <button type="button" class="icon-btn shrink-0" aria-label="Inspreken" @click="speak">
      <Icon name="tabler:microphone" class="size-5" />
    </button>
    <button type="submit" class="btn-sea shrink-0 !px-4" :disabled="!text.trim()" :class="!text.trim() ? 'opacity-60' : ''">
      <span class="hidden sm:inline">Kwijt</span>
      <Icon name="tabler:arrow-right" class="size-4" />
    </button>
  </form>
</template>
