import type { ExerciseDef } from '../types'
import { VIDEO_MAP } from './videoMap'

/**
 * The instructional clip for an exercise: a hand-verified videoId on the
 * def wins; otherwise the resolver-built map (tools/resolveVideos.mjs)
 * covers the rest of the catalog. Undefined = no video, show nothing.
 */
export function videoFor(def: ExerciseDef): string | undefined {
  return def.videoId ?? VIDEO_MAP[def.id]
}
