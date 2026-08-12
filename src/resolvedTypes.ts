// Type-only cycle, the same arrangement as sessionTypes.ts and
// activityTypes.ts: this needs the catalog and plan vocabulary from
// types.ts, and types.ts re-exports these. TypeScript erases both.
import type { DayKind, ExerciseKind, ISODate, PrescriptionBase, SlotId, Tier, Weekday } from './types'
import type { RepRange } from './engine/reps'

// ============================================================
// What the engine hands the screens for one day.
//
// Not persisted, which is exactly why it lives apart from the
// logged shapes: nothing here has to survive a schema version,
// and a field can be added without a migration. It moved out of
// types.ts because that file had reached its line allowance.
// ============================================================

export interface ResolvedExercise extends PrescriptionBase {
  exerciseId: string
  name: string
  kind: ExerciseKind
  restSec: number
  perSide?: boolean
  fromSlot?: SlotId
  /** Readiness/gig downgrade: keep it light, leave 3 in the tank. */
  lightMode?: boolean
  /** Set when a per-date swap replaced this exercise (original id). */
  swappedFrom?: string
  /**
   * The range the single rep number in `repText` was collapsed from.
   *
   * Kept because the collapse is lossy and the load side needs what
   * was lost: reaching the top of the range is the moment double
   * progression puts the next step on the bar instead of the reps,
   * and by then `repText` says "12" with no way to know 12 was the
   * ceiling. Absent for fixed prescriptions, which never wrap.
   */
  repRange?: RepRange
}

export interface DayBanner {
  id: string
  text: string
  tone: 'info' | 'warn' | 'success'
}

export interface ResolvedDay {
  date: ISODate
  weekday: Weekday
  /** 1-based week number since phase start. */
  weekIndex: number
  weekInBlock: 1 | 2 | 3 | 4
  blockIndex: 1 | 2 | 3
  abWeek: 'A' | 'B'
  isDeload: boolean
  tier: Tier
  templateId: string | null
  title: string
  tagline: string
  kind: DayKind
  cns: boolean
  banners: DayBanner[]
  exercises: ResolvedExercise[]
  note?: string
  /** True from week 17 on (Phase 1 done, program loops). */
  phaseComplete: boolean
}
