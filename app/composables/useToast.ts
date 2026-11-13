export interface Toast {
  id: string
  text: string
  to?: string
  toLabel?: string
  undo?: () => void
}

const toasts = ref<Toast[]>([])

export function useToast() {
  function dismiss(id: string) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }
  function push(t: Omit<Toast, 'id'>) {
    const id = uid('toast')
    toasts.value = [...toasts.value.slice(-2), { ...t, id }]
    setTimeout(() => dismiss(id), t.undo ? 6500 : 4500)
  }
  return { toasts, push, dismiss }
}
