import type { ISODate } from './types'

// ============================================================
// Everything logged as an ACTIVITY rather than a lift: GPS
// sessions, and the daily cardio / sport entries. Split out of
// types.ts because that file is the app's whole vocabulary and
// was getting hard to find anything in.
// ============================================================

/**
 * [lat, lng, elapsedSec, altitudeM?], compact enough to live in the
 * envelope.
 *
 * Altitude is the optional fourth slot rather than a fifth field on
 * RunLog because it is per-fix data: the profile of a climb is the
 * shape of the whole track, not one number at the end. Optional
 * because it is absent twice over — every session recorded before
 * this existed has three-element points, and a live fix whose
 * vertical accuracy is junk is stored without one rather than with
 * a lie. Readers must handle the gap; see engine/elevation.ts.
 */
export type RunPoint = [number, number, number, number?]

/** The activities the live GPS tracker can record. */
export type GpsActivity = 'run' | 'bike' | 'walk' | 'hike'

export interface RunLog {
  id: string
  activity: GpsActivity
  date: ISODate
  startedAt: string
  durationSec: number
  distanceMi: number
  /**
   * Where distanceMi came from. A treadmill gives GPS nothing to work
   * with, so a session indoors is counted from steps or from the number
   * the machine shows, and the source is recorded rather than being
   * quietly passed off as a measured route.
   */
  distanceSource?: 'gps' | 'steps' | 'manual' | 'none'
  /** Steps counted by the device, when it can (used for indoor distance). */
  steps?: number
  /** Average pace in seconds per mile (running) / speed derives for rides. */
  avgPaceSec: number
  /** Per-mile split times in seconds. */
  splits: number[]
  points: RunPoint[]
  /** MET-estimated calories at save time (wearables replace this later). */
  kcalEst?: number
  /**
   * Climb and descent in feet, computed from the track at save time.
   *
   * Stored rather than derived on read so the number never changes
   * under the athlete: the smoothing constants in engine/elevation.ts
   * will be tuned, and a hike that reported 1,240 ft in March should
   * still say 1,240 ft in July. Absent on sessions with no altitude.
   */
  elevGainFt?: number
  elevLossFt?: number
  /** What the athlete said it was, asked once when the session ends. */
  feltIntensity?: 'low' | 'standard' | 'high'
}

// ---------- Daily cardio / sport log ----------

export type CardioWhen = 'pre' | 'post' | 'solo'

export interface CardioEntry {
  id: string
  at: string
  /** Catalog id from plan/cardio.ts ('custom' carries its own label). */
  activityId: string
  label: string
  when: CardioWhen
  where?: 'indoor' | 'outdoor'
  miles?: number
  minutes?: number
  /** Activity-specific mode, e.g. basketball 'games' vs 'shooting'. */
  mode?: string
  /** Floors off a stair machine's console, the indoor climb. */
  floors?: number
  /**
   * Set when this entry is the shadow of a GPS session. saveRun writes
   * the route as a RunLog AND logs a cardio entry, because the
   * conditioning machinery reads the cardio log. Anything that ADDS the
   * two logs together has to know they are one session, or every
   * tracked run counts twice. See engine/activityLog.ts.
   */
  runId?: string

  // ---- Only present when the phone recorded the session live ----
  // A logged-after-the-fact entry has none of these, and the app
  // falls back to the mode chip exactly as it always did.

  /** Footfalls counted across the session. */
  steps?: number
  /**
   * Where `miles` came from. Court sports get it from steps, because
   * a pickleball court is shorter than GPS error; open-air sports get
   * it from the satellites.
   */
  distanceSource?: 'gps' | 'steps' | 'manual' | 'none'
  /** What the measured work rate says this was. See engine/intensity.ts. */
  intensity?: 'low' | 'standard' | 'high'
  /** Calories at save time, from the measured tier rather than a claim. */
  kcalEst?: number

  /**
   * What the ATHLETE said it was, asked once when the session ends.
   *
   * Kept strictly apart from `intensity`, which is what the step rate
   * said. Conflating them would destroy the only thing that makes
   * either useful: the disagreement between them is what
   * engine/calibration.ts learns from.
   */
  feltIntensity?: 'low' | 'standard' | 'high'
}
