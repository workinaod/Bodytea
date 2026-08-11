import type { ISODate } from './types'

// ============================================================
// Everything logged as an ACTIVITY rather than a lift: GPS
// sessions, and the daily cardio / sport entries. Split out of
// types.ts because that file is the app's whole vocabulary and
// was getting hard to find anything in.
// ============================================================

/** [lat, lng, elapsedSec], compact enough to live in the envelope. */
export type RunPoint = [number, number, number]

export interface RunLog {
  id: string
  activity: 'run' | 'bike' | 'walk'
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
}
