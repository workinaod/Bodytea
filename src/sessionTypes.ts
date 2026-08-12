// Type-only cycle: this needs ISODate and SlotId from types.ts, and
// types.ts needs SessionLog for AppData. TypeScript erases both, so
// nothing circular survives into the bundle. Same arrangement as
// activityTypes.ts.
import type { ISODate, SlotId } from './types'

// ============================================================
// What a session leaves behind: the record of what was actually
// lifted, as opposed to what the plan asked for.
//
// Its own file because the session log is the most-read shape in
// the app (prefill, stats, achievements, the debrief, the board
// all walk it) and because types.ts had grown to its line
// allowance with no room to add a field.
// ============================================================

export interface SetLog {
  targetReps: string
  weightLb?: number
  reps?: number
  seconds?: number
  done: boolean
}

export interface ExerciseLog {
  exerciseId: string
  fromSlot?: SlotId
  sets: SetLog[]
  skipped?: boolean
  /** Mid-rest check-in: how the weight felt. Drives the ±5 lb nudge next session. */
  feel?: 'easy' | 'right' | 'hard'
}

export type SessionStatus =
  | 'completed'
  | 'partial'
  | 'skipped'
  | 'downgraded-completed'

export interface ReadinessCheck {
  /** [slept<6h, elevated RHR / run-down, legs sore, genuinely low energy] */
  flags: [boolean, boolean, boolean, boolean]
  downgraded: boolean
}

/** How much the athlete had at start, the plan flexes on the spot. */
export type SessionIntensity = 'full' | 'lighter' | 'minimum'

export interface SessionLog {
  date: ISODate
  templateId: string
  status: SessionStatus
  startedAt?: string
  endedAt?: string
  readiness?: ReadinessCheck
  /** Start-time intensity choice. 'lighter'/'minimum' finish as downgraded wins. */
  intensity?: SessionIntensity
  /** Rest-day make-up: the missed date whose workout this session ran. */
  makeupFor?: ISODate
  /** "Running long" cut point, exercises at index >= this were dropped (bottom-first rule). */
  trimmedFromIndex?: number
  exercises: ExerciseLog[]
  notes?: string
}
