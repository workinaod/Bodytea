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
 * Evidence-based set rest by exercise type. Between sets of the SAME
 * exercise: explosive work gets full CNS recovery (2 min), heavy
 * low-rep strength ~2 min, hypertrophy compounds ~60s, isolation and
 * holds 30-45s. Between different exercises the transition adds a bit.
 * Library restSec is ignored for pacing (much of it was one-size).
 */
export function setRestSec(def: ReturnType<typeof getExercise>, repsNum?: number, sameExercise = true): number {
  const kind = def.kind
  let base: number
  if (kind === 'jump' || kind === 'sprint') base = 120
  else if (kind === 'lift' || kind === 'carry') {
    if (repsNum !== undefined && repsNum <= 6) base = 120
    else base = def.restSec <= 45 ? 45 : 60
  } else if (kind === 'core') base = 40
  else if (kind === 'warmup' || kind === 'mobility') base = 20
  else base = 45
  if (!sameExercise) base = Math.min(150, base + 30)
  return base
}

/**
 * Rest seconds owed after completing `item`, typed set rest, but only
 * when something follows (no break screen after the last set).
 */
export function restAfter(session: SessionLog, item: FocusItem): number {
  const next = nextFocusItem(session, item)
  if (!next) return 0
  const ex = session.exercises[item.exIdx]
  const def = getExercise(ex.exerciseId)
  if (def.restSec === 0) return 0
  const same = next.exIdx === item.exIdx
  return setRestSec(def, ex.sets[item.setIdx]?.reps, same)
}

export function focusProgress(session: SessionLog): { done: number; total: number } {
  const q = focusQueue(session)
  const done = q.filter((i) => session.exercises[i.exIdx].sets[i.setIdx].done).length
  return { done, total: q.length }
}
