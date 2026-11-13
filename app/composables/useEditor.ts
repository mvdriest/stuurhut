// Eén formulierpaneel voor de hele app: nieuw of bewerken, voor klant, routine, taak of afspraak.
import type { EditorRequest } from '~/types'

const req = ref<EditorRequest | null>(null)
let onSaved: ((id: string) => void) | null = null

export function useEditor() {
  function open(r: EditorRequest, cb?: (id: string) => void) {
    req.value = r
    onSaved = cb ?? null
  }
  function close() {
    req.value = null
    onSaved = null
  }
  function saved(id: string) {
    onSaved?.(id)
    close()
  }
  return { req, open, close, saved }
}
