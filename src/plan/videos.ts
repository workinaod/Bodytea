import type { ExerciseDef } from '../types'
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
