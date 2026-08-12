import type { ISODate, ResolvedExercise } from '../types'
import { getExercise } from '../plan/exercises'
import { useAppStore } from '../store/appStore'
import { trimForVolume, volumeVerdict, type VolumeCut, type VolumeVerdict } from '../engine/volume'

// ============================================================
// Applying the per-muscle volume verdict to a real session.
//
// Deliberately its own file rather than more weight on
// logic/actions.ts, and deliberately a separate call from
// startSession: the trim is something the athlete taps, not
// something the app does to them on the way in.
// ============================================================

const store = () => useAppStore.getState()

/**
 * The engine only needs an id, a name and a set count. Session logs
 * carry sets as an array, so this is the adapter between the two.
 */
function asResolved(exercises: { exerciseId: string; sets: unknown[] }[]): ResolvedExercise[] {
  return exercises.map(
    (e) =>
      ({
        exerciseId: e.exerciseId,
        name: getExercise(e.exerciseId).name,
        sets: e.sets.length,
      }) as ResolvedExercise,
  )
}

/** What the volume engine makes of a session already in progress. */
export function sessionVerdict(date: ISODate): VolumeVerdict | null {
  const session = store().data.sessions[date]
  if (!session) return null
  return volumeVerdict(asResolved(session.exercises))
}

/**
 * Apply the trim to a live session: shorten the movements the engine
 * shaved, drop the ones it found redundant. Returns what it changed
 * so the caller can say it out loud.
 *
 * Completed sets are never removed. That makes this safe to run at
 * any point, and means a trim taken halfway through cuts only what is
 * still ahead of you.
 */
export function trimSessionVolume(date: ISODate): VolumeCut[] {
  const session = store().data.sessions[date]
  if (!session) return []
  const { cuts } = trimForVolume(asResolved(session.exercises))
  if (cuts.length === 0) return []

  const target = new Map(cuts.map((c) => [c.exerciseId, c.to]))
  const applied: VolumeCut[] = []
  store().update((d) => {
    const live = d.sessions[date]
    if (!live) return
    live.exercises = live.exercises
      .map((e) => {
        const want = target.get(e.exerciseId)
        if (want === undefined) return e
        const done = e.sets.filter((s) => s.done).length
        const keep = Math.max(want, done)
        if (keep >= e.sets.length) return e
        applied.push({
          exerciseId: e.exerciseId,
          name: getExercise(e.exerciseId).name,
          from: e.sets.length,
          to: keep,
        })
        return { ...e, sets: e.sets.slice(0, keep) }
      })
      .filter((e) => e.sets.length > 0)
  })
  return applied
}
