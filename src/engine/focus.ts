import type { SessionLog } from '../types'
import { getExercise } from '../plan/exercises'

// ============================================================
// Focus-mode queue math: the session flattened into an ordered
// list of sets, one shown at a time. Pure + unit-tested.
// ============================================================

export interface FocusItem {
  exIdx: number
  setIdx: number
}

/** Every loggable set in order, skipping skipped exercises and the trimmed tail. */
export function focusQueue(session: SessionLog): FocusItem[] {
  const out: FocusItem[] = []
  session.exercises.forEach((ex, exIdx) => {
    if (ex.skipped) return
    if (session.trimmedFromIndex !== undefined && exIdx >= session.trimmedFromIndex) return
    ex.sets.forEach((_, setIdx) => out.push({ exIdx, setIdx }))
  })
  return out
}

/** The first not-yet-done item, or null when the session is finished. */
export function currentFocusItem(session: SessionLog): FocusItem | null {
  for (const item of focusQueue(session)) {
    if (!session.exercises[item.exIdx].sets[item.setIdx].done) return item
  }
  return null
}

/** The item that follows `item` in the queue, or null at the end. */
export function nextFocusItem(session: SessionLog, item: FocusItem): FocusItem | null {
  const q = focusQueue(session)
  const i = q.findIndex((x) => x.exIdx === item.exIdx && x.setIdx === item.setIdx)
  return i >= 0 && i + 1 < q.length ? q[i + 1] : null
}

/**
 * Rest seconds owed after completing `item` — the exercise's prescribed
 * rest, but only when something follows (no break screen after the last
 * set) and only for exercises that rest at all.
 */
export function restAfter(session: SessionLog, item: FocusItem): number {
  const next = nextFocusItem(session, item)
  if (!next) return 0
  const def = getExercise(session.exercises[item.exIdx].exerciseId)
  return def.restSec
}

export function focusProgress(session: SessionLog): { done: number; total: number } {
  const q = focusQueue(session)
  const done = q.filter((i) => session.exercises[i.exIdx].sets[i.setIdx].done).length
  return { done, total: q.length }
}
