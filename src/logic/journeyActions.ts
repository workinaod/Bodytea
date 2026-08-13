import type { ISODate } from '../types'
import { newlyReached } from '../engine/journey'
import { useAppStore } from '../store/appStore'

// ============================================================
// Stamping a rung the moment it is reached.
//
// The one write in the whole journey feature, and it exists for
// one reason: a rung must never un-reach.
//
// Everything the rail shows is derived and recomputed on every
// render, which is what makes it live. But "reached" cannot be
// derived, because the evidence for it is not permanent. A
// bodyweight rung crossed in March is crossed forever, and yet
// a bulk in June puts the scale back above it. A squat rung is
// earned at 225 and the deload week that follows logs 185. Left
// derived, both rungs would light up and then quietly go out —
// the rail walking backwards, which is worse than no rail.
//
// So the date is written down once and never rewritten. Nothing
// here removes a key.
// ============================================================

const store = () => useAppStore.getState()

/**
 * Stamp anything reached since the last check.
 *
 * Called from the session/measurement write paths rather than from a
 * render: buildJourney is a pure read that runs on every render, and
 * writing from inside one would loop.
 *
 * Idempotent. It only ever adds keys that are not already there, so
 * calling it twice on the same day is free and calling it after a
 * restore re-stamps whatever the history supports.
 */
export function stampReachedRungs(today: ISODate): void {
  // newlyReached already excludes anything stamped, which is where the
  // never-overwrite rule actually lives. A second `if (!hits[id])` here
  // looked like a safety net and was unreachable — a mutation test
  // flipped it and nothing went red, because nothing could. Dead
  // defensive code is worse than none: it reads as the guarantee while
  // the real guarantee sits somewhere else, untested.
  const fresh = newlyReached(store().data, today)
  if (fresh.length === 0) return
  store().update((d) => {
    if (!d.journey) d.journey = { hits: {} }
    for (const id of fresh) d.journey.hits[id] = today
  })
}
