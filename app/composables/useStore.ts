// De enige bron van state. Nu localStorage met testdata; later de plek voor echte bronnen.
import type { Ref } from 'vue'
import { StorageSerializers, useLocalStorage } from '@vueuse/core'
import type { AppState } from '~/types'
import { createSeed, STATE_VERSION } from '~/data/seed'

let _state: Ref<AppState> | null = null

export function useStore() {
  if (!_state) {
    _state = useLocalStorage<AppState>('stuurhut:state', createSeed(), {
      serializer: StorageSerializers.object,
      deep: true,
      writeDefaults: true,
    })
    // Testdata is relatief aan vandaag: op een nieuwe dag beginnen we vers.
    if (!_state.value || _state.value.version !== STATE_VERSION || _state.value.seededOn !== todayISO()) {
      _state.value = createSeed()
    }
  }
  const state = _state
  function reset() {
    state.value = createSeed()
  }
  return { state, reset }
}
