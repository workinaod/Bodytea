import { create } from 'zustand'
import {
  defaultWeekState,
  emptyAppData,
  type AppData,
  type ISODate,
  type WeekState,
} from '../types'
import { mondayOf, todayISO } from '../engine/calendar'
import { LocalStorageDriver, STATE_KEY, isQuotaError } from './storage'
import { parseEnvelope, serializeState } from './backup'

// ============================================================
// Single zustand store holding the whole AppData. Screens call
// update(fn) with a mutator over a fresh clone; persistence is
// a debounced subscription writing the versioned envelope.
// ============================================================

const driver = new LocalStorageDriver()

/** One-time adoption of the pre-v4 grocery key into AppData. */
function adoptLegacyGrocery(data: AppData): AppData {
  try {
    const raw = localStorage.getItem('naod.grocery')
    if (raw) {
      const checked = JSON.parse(raw) as Record<string, boolean>
      const items = Object.keys(checked).filter((k) => checked[k])
      data.grocery = [...new Set([...data.grocery, ...items])]
      localStorage.removeItem('naod.grocery')
    }
  } catch {
    /* ignore */
  }
  return data
}

/**
 * Read back a copy parked by an earlier failed load, but only if it parses
 * NOW and only to replace a state nobody has used yet.
 *
 * A validation bug can park a perfectly good state (a pescatarian plan did
 * exactly that: the plan schema listed three diet styles, the fourth threw
 * out of migrate, and the athlete was handed an empty app). Once the bug is
 * fixed the parked copy is readable again, but nothing was ever going to
 * look at it, so their history stayed invisible while a fresh empty state
 * saved over the top.
 *
 * The two conditions are what make this safe rather than clever: the parked
 * copy has to survive the same validation as any other load, and the state
 * it would replace has to be one the user has not onboarded into. A real
 * account is never overwritten by an old parked one.
 */
function reclaimParked(current: AppData): AppData {
  if (current.settings.onboarded) return current
  let parked: string | null = null
  try {
    parked = localStorage.getItem(`${STATE_KEY}.corrupt`)
  } catch {
    return current
  }
  if (!parked) return current
  try {
    const recovered = adoptLegacyGrocery(parseEnvelope(parked).data)
    if (!recovered.settings.onboarded) return current
    console.info('Recovered a parked state that now validates')
    try {
      localStorage.removeItem(`${STATE_KEY}.corrupt`)
    } catch {
      /* ignore */
    }
    return recovered
  } catch {
    return current
  }
}

function hydrate(): AppData {
  const raw = driver.load()
  if (!raw) return reclaimParked(emptyAppData(mondayOf(todayISO()), todayISO()))
  try {
    return reclaimParked(adoptLegacyGrocery(parseEnvelope(raw).data))
  } catch (e) {
    // Never destroy possibly-recoverable data, park it and start fresh.
    console.error('State failed to load; parking corrupt copy', e)
    try {
      localStorage.setItem(`${STATE_KEY}.corrupt`, raw)
    } catch {
      /* ignore */
    }
    return emptyAppData(mondayOf(todayISO()), todayISO())
  }
}

export interface AppStore {
  data: AppData
  /** Mutate a cloned draft; the result becomes the new state. */
  update: (fn: (draft: AppData) => void) => void
  /** Wholesale replacement (import flow). */
  replaceData: (data: AppData) => void
  /** Read-or-create the week state for the week containing `date`. */
  weekFor: (date: ISODate) => WeekState
  /** Mutate (creating if needed) the week containing `date`. */
  updateWeek: (date: ISODate, fn: (week: WeekState) => void) => void
}

export const useAppStore = create<AppStore>((set, get) => ({
  data: hydrate(),

  update: (fn) => {
    const draft = structuredClone(get().data)
    fn(draft)
    set({ data: draft })
  },

  replaceData: (data) => set({ data: structuredClone(data) }),

  weekFor: (date) => {
    const monday = mondayOf(date)
    return get().data.weeks[monday] ?? defaultWeekState(monday)
  },

  updateWeek: (date, fn) => {
    const monday = mondayOf(date)
    get().update((draft) => {
      if (!draft.weeks[monday]) draft.weeks[monday] = defaultWeekState(monday)
      fn(draft.weeks[monday])
    })
  },
}))

// ---------- Debounced persistence ----------

/**
 * Whether the last write to disk actually landed.
 *
 * Kept in its own store rather than in AppData because it is a fact
 * about the device, not about the athlete, and it must never be
 * serialized into the very envelope whose write just failed.
 */
export interface PersistHealth {
  /** True once a write has failed and no later write has succeeded. */
  failed: boolean
  /** Quota is the recoverable one, and gets its own instructions. */
  quota: boolean
}

export const usePersistHealth = create<PersistHealth>(() => ({ failed: false, quota: false }))

function writeNow(raw: string): void {
  let quota = false
  let ok: boolean
  try {
    ok = driver.save(raw)
  } catch (e) {
    ok = false
    quota = isQuotaError(e)
  }
  if (!ok && !quota) {
    // The driver logs and returns false rather than throwing, so probe
    // once to find out which sentence the banner should show.
    try {
      localStorage.setItem(`${STATE_KEY}.probe`, '1')
      localStorage.removeItem(`${STATE_KEY}.probe`)
    } catch (e) {
      quota = isQuotaError(e)
    }
  }
  const prev = usePersistHealth.getState()
  if (prev.failed !== !ok || prev.quota !== (!ok && quota)) {
    usePersistHealth.setState({ failed: !ok, quota: !ok && quota })
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
useAppStore.subscribe((state) => {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    writeNow(serializeState(state.data))
  }, 300)
})

/** Flush pending writes (used before export and on pagehide). */
export function flushPersist(): void {
  if (saveTimer) clearTimeout(saveTimer)
  writeNow(serializeState(useAppStore.getState().data))
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushPersist)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPersist()
  })
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
