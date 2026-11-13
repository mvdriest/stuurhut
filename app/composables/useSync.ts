// Houdt de state gelijk met Supabase.
// Laden: alles in één keer (het is de data van één persoon). Opslaan: na elke wijziging,
// kort gebundeld, alleen wat anders is dan de vorige keer. RLS zorgt dat alleen jij erbij kunt.
import type { AppState } from '~/types'
import type { Database } from '~/types/database.types'
import { createEmpty } from '~/data/seed'
import { fromSupabase, ITEM_LISTS, itemId, MAPPED, snapshot, type Loaded, type Snapshot, type TableName } from '~/utils/sync'

const ready = ref(false)
const loading = ref(false)
const saving = ref(0)
const error = ref<string | null>(null)
let last: Snapshot | null = null
let started = false
let timer: ReturnType<typeof setTimeout> | undefined
let queue: Promise<void> = Promise.resolve()

export function useSync() {
  const supabase = useSupabaseClient<Database>()
  const { real } = useStore()
  const toast = useToast()

  async function load() {
    loading.value = true
    try {
      const q = <N extends keyof Loaded>(table: N) => supabase.from(table).select('*').then(({ data, error: e }) => {
        if (e) throw new Error(`${table}: ${e.message}`)
        return (data ?? []) as unknown as Loaded[N]
      })
      const [klanten, contacten, trajecten, subtaken, afspraken, inbox_items, doelen, doel_mijlpalen, traject_haltes, journal_entries, v2_items] = await Promise.all([
        q('klanten'), q('contacten'), q('trajecten'), q('subtaken'), q('afspraken'), q('inbox_items'), q('doelen'), q('doel_mijlpalen'), q('traject_haltes'), q('journal_entries'), q('v2_items'),
      ])
      const next = fromSupabase({ klanten, contacten, trajecten, subtaken, afspraken, inbox_items, doelen, doel_mijlpalen, traject_haltes, journal_entries, v2_items }, createEmpty())
      next.sync.lastPull = new Date().toISOString()
      // Eerst de momentopname, dan pas de state: zo telt het laden niet als wijziging.
      last = snapshot(next)
      real.value = next
      error.value = null
      ready.value = true
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    }
    finally {
      loading.value = false
    }
  }

  /** Wat is er veranderd sinds de vorige keer, en schrijf dat weg. */
  async function flush() {
    if (!last || !ready.value) return
    const now = snapshot(real.value)
    const prev = last
    const changed = (key: string) => {
      const a = prev.get(key) ?? new Map()
      const b = now.get(key) ?? new Map()
      const upsert = [...b].filter(([id, json]) => a.get(id) !== json).map(([id]) => id)
      const remove = [...a.keys()].filter(id => !b.has(id))
      return { upsert, remove }
    }
    const fail = (key: string, msg: string) => { throw new Error(`${key}: ${msg}`) }
    saving.value++
    try {
      // Gekoppelde tabellen: eerst toevoegen (klant vóór traject vóór taak) …
      const diffs = MAPPED.map(m => ({ m, d: changed(m.key) }))
      for (const { m, d } of diffs) {
        if (!d.upsert.length) continue
        const items = (real.value[m.key] as { id: string }[]).filter(i => d.upsert.includes(i.id))
        const toRow = m.toRow as (i: unknown) => Record<string, unknown>
        const { error: e } = await supabase.from(m.table as TableName).upsert(items.map(toRow) as never)
        if (e) fail(m.key, e.message)
      }
      // … dan verwijderen, in omgekeerde volgorde
      for (const { m, d } of [...diffs].reverse()) {
        if (!d.remove.length) continue
        const { error: e } = await supabase.from(m.table as TableName).delete().in('id', d.remove)
        if (e) fail(m.key, e.message)
      }

      // v2_items
      const rows: Database['public']['Tables']['v2_items']['Insert'][] = []
      const gone: { collection: string, item_id: string }[] = []
      for (const key of ITEM_LISTS) {
        const d = changed(key)
        const list = real.value[key] as unknown[]
        for (const item of list) {
          const id = itemId(key, item)
          if (d.upsert.includes(id)) rows.push({ collection: key, item_id: id, data: JSON.parse(JSON.stringify(item)), updated_at: new Date().toISOString() })
        }
        gone.push(...d.remove.map(item_id => ({ collection: key, item_id })))
      }
      const singles = changed('_state')
      for (const k of singles.upsert) {
        rows.push({ collection: '_state', item_id: k, data: JSON.parse(JSON.stringify(real.value[k as keyof AppState])), updated_at: new Date().toISOString() })
      }
      if (rows.length) {
        const { error: e } = await supabase.from('v2_items').upsert(rows)
        if (e) fail('v2_items', e.message)
      }
      for (const g of gone) {
        const { error: e } = await supabase.from('v2_items').delete().eq('collection', g.collection).eq('item_id', g.item_id)
        if (e) fail('v2_items', e.message)
      }
      last = now
      error.value = null
    }
    catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      // Eén melding per soort fout. De volgende wijziging probeert het opnieuw.
      if (msg !== error.value) toast.push({ text: `Opslaan lukte niet (${msg}). Ik probeer het bij je volgende wijziging opnieuw.` })
      error.value = msg
    }
    finally {
      saving.value--
    }
  }

  function schedule() {
    clearTimeout(timer)
    timer = setTimeout(() => { queue = queue.then(flush) }, 600)
  }

  /** Eén keer starten, zodra je bent ingelogd. */
  function start() {
    if (started) return
    started = true
    load()
    watch(real, () => { if (ready.value) schedule() }, { deep: true })
    // Terug naar de app: even ophalen wat er intussen veranderde (bijv. via Telegram)
    useEventListener(document, 'visibilitychange', () => {
      if (document.visibilityState === 'visible' && ready.value && !saving.value) queue = queue.then(flush).then(load)
    })
  }

  /** Bij uitloggen: alles vergeten. */
  function stop() {
    clearTimeout(timer)
    started = false
    ready.value = false
    last = null
    real.value = createEmpty()
  }

  return { ready, loading, saving, error, start, stop, reload: () => (queue = queue.then(flush).then(load)) }
}
