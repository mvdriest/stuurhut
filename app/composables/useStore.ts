// De enige bron van state, in twee standen:
// - echt: je eigen data. Begint leeg en wordt gevuld en bewaard door useSync() (Supabase).
// - demo: de testdata, alleen in deze browser. Begint elke dag opnieuw.
import type { Ref } from 'vue'
import { StorageSerializers, useLocalStorage } from '@vueuse/core'
import type { AppState } from '~/types'
import { createEmpty, createSeed, STATE_VERSION } from '~/data/seed'

export type StoreMode = 'echt' | 'demo'

let _demo: Ref<AppState> | null = null
let _real: Ref<AppState> | null = null
let _mode: Ref<StoreMode> | null = null

export function useStore() {
  if (!_mode) _mode = useLocalStorage<StoreMode>('stuurhut:mode', 'echt')
  if (!_real) _real = ref(createEmpty()) as Ref<AppState>
  const mode = _mode
  const real = _real

  function demoState() {
    if (!_demo) {
      _demo = useLocalStorage<AppState>('stuurhut:state', createSeed(), {
        serializer: StorageSerializers.object,
        deep: true,
        writeDefaults: true,
      })
      // Testdata is relatief aan vandaag: op een nieuwe dag beginnen we vers.
      if (!_demo.value || _demo.value.version !== STATE_VERSION || _demo.value.seededOn !== todayISO()) {
        _demo.value = createSeed()
      }
    }
    return _demo
  }

  const state = computed<AppState>({
    get: () => (mode.value === 'demo' ? demoState().value : real.value),
    set: (v) => {
      if (mode.value === 'demo') demoState().value = v
      else real.value = v
    },
  }) as unknown as Ref<AppState>

  /** Zet de testdata terug. Alleen in de demo: je echte data raak je hier nooit mee. */
  function reset() {
    if (mode.value === 'demo') demoState().value = createSeed()
  }

  return { state, real, mode, reset }
}
