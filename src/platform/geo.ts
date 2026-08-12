import type { RunPoint } from '../activityTypes'
import { creditsDistance, haversineMi } from '../engine/runs'

// ============================================================
// Location, behind an adapter.
//
// The GPS tracker reaches navigator.geolocation directly and is
// on the allowlist for it, from before src/platform/ existed.
// Everything new goes through here instead, so the Capacitor
// build swaps one file rather than hunting watchPosition calls
// through the screens.
//
// This is the no-map version: a timed sport wants to know how
// far it went, not to draw where. It keeps only the running
// total and the last fix, so an hour of soccer costs two numbers
// instead of a thousand coordinates.
//
// The junk filtering is engine/runs.ts's creditsDistance, which
// is the run tracker's filter with the draw-the-route escape
// hatch taken off. Without that, a phone on the sideline of a
// game turns GPS wobble into a quarter mile an hour and the
// calorie estimate believes every yard of it.
// ============================================================

export interface DistanceWatch {
  /** Miles accumulated so far. */
  miles: () => number
  /** True once any fix at all has arrived. */
  hasFix: () => boolean
  stop: () => void
}

/**
 * Start accumulating GPS distance. Null when the platform has no
 * geolocation at all, which is the caller's cue to not promise a
 * distance it cannot deliver.
 */
export function watchDistance(): DistanceWatch | null {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return null

  let miles = 0
  let prev: RunPoint | null = null
  let fixed = false
  const startedAt = Date.now()

  const id = navigator.geolocation.watchPosition(
    (pos) => {
      fixed = true
      const t = (Date.now() - startedAt) / 1000
      const { latitude, longitude, accuracy } = pos.coords
      if ((accuracy ?? 99) > 50) return
      // The very first usable fix is the starting line, not a distance.
      if (!prev) {
        prev = [latitude, longitude, t]
        return
      }
      if (!creditsDistance(prev, latitude, longitude, t, accuracy ?? 99)) return
      miles += haversineMi(prev[0], prev[1], latitude, longitude)
      prev = [latitude, longitude, t]
    },
    () => {},
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 },
  )

  return {
    miles: () => Math.round(miles * 100) / 100,
    hasFix: () => fixed,
    stop: () => navigator.geolocation.clearWatch(id),
  }
}
