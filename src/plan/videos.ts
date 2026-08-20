import type { ExerciseDef } from '../types'
import { EXERCISES } from './exercises'
import { VIDEO_MAP } from './videoMap'

/**
 * The instructional clip for an exercise, or undefined when there is no
 * good one (the UI then shows no video at all, never a search link).
 *
 * The generated map wins: every entry in it was length-checked against
 * the policy (3 minutes hard ceiling, 2 minutes or less wherever
 * possible). A def's own `videoId` is only a fallback for exercises the
 * resolver could not match, since those ids predate the length rule.
 */
export function videoFor(def: ExerciseDef): string | undefined {
  return VIDEO_MAP[def.id] ?? def.videoId
}

/**
 * The same lookup from an id alone.
 *
 * The clip is now the movement demo rather than a link under it, so the
 * surfaces that only carry an id (the rest screen previews the next
 * exercise, not a def) need to reach it too.
 */
export function videoForId(id: string): string | undefined {
  const def = EXERCISES[id]
  return VIDEO_MAP[id] ?? def?.videoId
}

/** What to search for when there is no verified clip. */
export function videoQueryForId(id: string): string {
  return EXERCISES[id]?.videoQuery ?? id.replace(/-/g, ' ')
}
