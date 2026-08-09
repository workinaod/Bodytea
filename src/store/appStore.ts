import { create } from 'zustand'
import {
  defaultWeekState,
  emptyAppData,
  type AppData,
  type ISODate,
  type WeekState,
} from '../types'
import { mondayOf, todayISO } from '../engine/calendar'
import { LocalStorageDriver, STATE_KEY } from './storage'
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

function hydrate(): AppData {
  const raw = driver.load()
  if (!raw) return emptyAppData(mondayOf(todayISO()), todayISO())
  try {
    return adoptLegacyGrocery(parseEnvelope(raw).data)
  } catch (e) {
    // Never destroy possibly-recoverable data — park it and start fresh.
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

let saveTimer: ReturnType<typeof setTimeout> | null = null
useAppStore.subscribe((state) => {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    driver.save(serializeState(state.data))
  }, 300)
})

/** Flush pending writes (used before export and on pagehide). */
export function flushPersist(): void {
  if (saveTimer) clearTimeout(saveTimer)
  driver.save(serializeState(useAppStore.getState().data))
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
