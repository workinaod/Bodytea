import type { ResolvedExercise } from '../types'
import type { MuscleRegion } from '../plan/muscleRegions'
import { EXERCISE_MUSCLES } from '../plan/muscles'

// ============================================================
// Session volume, counted per MUSCLE instead of per exercise.
//
// The failure this exists to catch: the Tuesday push day reads
// as seven sensible exercises, 23 sets. Totalled per muscle it
// is 11.5 sets on the triceps and 10.5 on the front delts,
// because every press pays those two whether or not they are
// the target, and the day then adds direct arm work on top of a
// debt the compounds already ran up. Nothing in the list is
// wrong on its own. The total was invisible because nothing was
// adding it up.
//
// ACCOUNTING. A set counts 1.0 for a prime mover and 0.5 for an
// assisting one. That fractional convention is the one the
// hypertrophy dose-response work uses, and it is the only way
// indirect volume shows up at all. Counting whole sets per
// exercise is what produced the bug.
//
// CEILINGS are per SESSION, not per week. Weekly totals of
// roughly 10-20 hard sets per muscle are well supported and are
// not what this file is about. What matters inside one day is
// that the stimulus saturates near 10 sets, and sooner for the
// small muscles that assist on every compound in the session.
// Past the ceiling the extra sets buy fatigue and recovery cost
// instead of growth, which is exactly the "cooked by set 3 with
// twelve sets still to go" failure.
//
// This never runs inside resolveDay. The plan is golden-locked;
// this is a transform applied to a resolved day, in the same
// family as applyReadinessDowngrade and minimumViableFor.
// ============================================================

/** A set is worth this much to the muscle actually doing the work. */
export const PRIMARY_WEIGHT = 1
/** And this much to the ones helping. Indirect volume is real, but not equal. */
export const SECONDARY_WEIGHT = 0.5

/** Cardio washes, not lifting volume. Counting them says nothing useful. */
const NOT_COUNTED = new Set<MuscleRegion>(['full-body', 'heart'])

/**
 * The small muscles that assist on nearly every compound in a
 * session. They arrive at a working set already taxed, so they
 * saturate before the big movers do and they are what actually
 * fails mid-session.
 */
const SMALL_ASSISTING = new Set<MuscleRegion>([
  'delts-front',
  'delts-side',
  'delts-rear',
  'traps',
  'biceps',
  'triceps',
  'forearms',
  'calves',
  'tibialis',
  'achilles-feet',
  'abs',
  'obliques',
  'hip-flexors',
  'adductors',
  'lower-back',
])

const SMALL_CEILING = 8
const LARGE_CEILING = 10

export function ceilingFor(region: MuscleRegion): number {
  return SMALL_ASSISTING.has(region) ? SMALL_CEILING : LARGE_CEILING
}

/** Plain names, for copy that a person reads mid-decision. */
export const REGION_LABEL: Partial<Record<MuscleRegion, string>> = {
  'delts-front': 'front delts',
  'delts-side': 'side delts',
  'delts-rear': 'rear delts',
  'chest-upper': 'upper chest',
  'mid-back': 'upper back',
  'lower-back': 'lower back',
  'hip-flexors': 'hip flexors',
  triceps: 'triceps',
  biceps: 'biceps',
  traps: 'traps',
  chest: 'chest',
  lats: 'lats',
  quads: 'quads',
  glutes: 'glutes',
  hamstrings: 'hamstrings',
  calves: 'calves',
  abs: 'abs',
  obliques: 'obliques',
  forearms: 'forearms',
  adductors: 'adductors',
  tibialis: 'shins',
  'achilles-feet': 'feet',
}

export function regionName(region: MuscleRegion): string {
  return REGION_LABEL[region] ?? region.replace(/-/g, ' ')
}

/** Fractional sets landing on each muscle across a whole session. */
export function regionLoad(exercises: ResolvedExercise[]): Partial<Record<MuscleRegion, number>> {
  const load: Partial<Record<MuscleRegion, number>> = {}
  const add = (r: MuscleRegion, n: number) => {
    if (NOT_COUNTED.has(r)) return
    load[r] = (load[r] ?? 0) + n
  }
  for (const ex of exercises) {
    const m = EXERCISE_MUSCLES[ex.exerciseId]
    if (!m) continue
    const sets = Math.max(0, ex.sets)
    if (sets === 0) continue
    for (const r of m.primary) add(r, sets * PRIMARY_WEIGHT)
    for (const r of m.secondary) add(r, sets * SECONDARY_WEIGHT)
  }
  return load
}

export function totalSets(exercises: ResolvedExercise[]): number {
  return exercises.reduce((n, e) => n + Math.max(0, e.sets), 0)
}

export interface Overload {
  region: MuscleRegion
  /** Fractional sets landing here. */
  load: number
  ceiling: number
  /** How far past the ceiling, in fractional sets. */
  over: number
}

/** Every muscle the session asks too much of, worst first. */
export function overloadedRegions(exercises: ResolvedExercise[]): Overload[] {
  const load = regionLoad(exercises)
  const out: Overload[] = []
  for (const key of Object.keys(load)) {
    const region = key as MuscleRegion
    const v = load[region] ?? 0
    const ceiling = ceilingFor(region)
    if (v > ceiling) out.push({ region, load: v, ceiling, over: v - ceiling })
  }
  return out.sort((a, b) => b.over - a.over || a.region.localeCompare(b.region))
}

export interface PreFatigue {
  exerciseId: string
  name: string
  index: number
  region: MuscleRegion
  /** Fractional sets that muscle already absorbed before this movement starts. */
  priorLoad: number
}

/**
 * A movement whose own prime mover has already taken a beating
 * from everything above it. The heaviest overhead press of the
 * day landing on delts that already did seven sets of pressing
 * is not a hard session, it is a badly ordered one, and the
 * weight drop on the last set is the receipt.
 */
export function preFatigued(exercises: ResolvedExercise[], threshold = 3): PreFatigue[] {
  const out: PreFatigue[] = []
  for (let i = 0; i < exercises.length; i++) {
    const m = EXERCISE_MUSCLES[exercises[i].exerciseId]
    if (!m) continue
    const before = regionLoad(exercises.slice(0, i))
    for (const region of m.primary) {
      if (NOT_COUNTED.has(region)) continue
      const priorLoad = before[region] ?? 0
      if (priorLoad >= threshold) {
        out.push({ exerciseId: exercises[i].exerciseId, name: exercises[i].name, index: i, region, priorLoad })
      }
    }
  }
  return out.sort((a, b) => b.priorLoad - a.priorLoad)
}

export interface VolumeCut {
  exerciseId: string
  name: string
  from: number
  /** Zero means the movement was dropped, not shortened. */
  to: number
}

export interface TrimResult {
  exercises: ResolvedExercise[]
  cuts: VolumeCut[]
  /** Anything still over after every legal cut was taken. Reported, not hidden. */
  stillOver: Overload[]
}

/**
 * The opening movements are the day's whole reason for existing,
 * so the cut comes from the bottom. That is the same rule the
 * session list already offers by hand ("running long? cut from
 * here down"), applied on the way in instead of halfway through.
 */
export const PROTECTED_LEAD = 2
/** Below this a movement is not training anything, so drop it instead. */
const MIN_SETS = 2
/** Never trim a day down to a warm-up. */
const MIN_MOVEMENTS = 4

/**
 * Bring every muscle back under its per-session ceiling, with two
 * moves in strict order.
 *
 * First, DROP a late isolation movement whose target muscle the day
 * has already saturated without it. Three sets of overhead extension
 * after eleven and a half sets of triceps work is not arm training,
 * it is interest on a debt. Leaving a token set behind would be a
 * worse answer than removing it.
 *
 * Only when nothing is redundant does it SHAVE single sets, taking
 * them off the last movement that feeds the worst-hit muscle. The
 * opening lifts are never touched: they are the day's whole reason
 * for existing, and cutting from the bottom is the same rule the
 * session list already offers by hand.
 */
export function trimForVolume(exercises: ResolvedExercise[]): TrimResult {
  interface Slot {
    ex: ResolvedExercise
    origin: number
  }
  const slots: Slot[] = exercises.map((e, i) => ({ ex: { ...e }, origin: i }))
  // Bounded by construction: every pass drops a movement or a set.
  const budget = totalSets(exercises) + exercises.length

  for (let guard = 0; guard < budget; guard++) {
    const current = slots.map((s) => s.ex)
    const over = overloadedRegions(current)
    if (over.length === 0) break
    const { region } = over[0]

    // 1. Drop something the day no longer needs.
    let dropAt = -1
    if (slots.length > MIN_MOVEMENTS) {
      const backHalf = Math.max(PROTECTED_LEAD, Math.ceil(slots.length / 2))
      for (let i = slots.length - 1; i >= backHalf; i--) {
        const m = EXERCISE_MUSCLES[slots[i].ex.exerciseId]
        if (!m || !m.primary.includes(region)) continue
        const without = regionLoad(slots.filter((_, j) => j !== i).map((s) => s.ex))
        // Redundant only if EVERY muscle it targets stays saturated
        // without it. That keeps the sole prime mover for a region.
        if (m.primary.every((r) => (without[r] ?? 0) >= ceilingFor(r))) {
          dropAt = i
          break
        }
      }
    }
    if (dropAt >= 0) {
      slots.splice(dropAt, 1)
      continue
    }

    // 2. Otherwise shave one set off the last contributor.
    let idx = -1
    for (let i = slots.length - 1; i >= PROTECTED_LEAD; i--) {
      const m = EXERCISE_MUSCLES[slots[i].ex.exerciseId]
      if (!m) continue
      const touches = m.primary.includes(region) || m.secondary.includes(region)
      if (touches && slots[i].ex.sets > MIN_SETS) {
        idx = i
        break
      }
    }
    if (idx < 0) break // nothing legal left, say so rather than mangle the day
    slots[idx].ex.sets -= 1
  }

  const kept = new Map(slots.map((s) => [s.origin, s.ex]))
  const cuts: VolumeCut[] = []
  exercises.forEach((e, i) => {
    const to = kept.get(i)?.sets ?? 0
    if (to < e.sets) cuts.push({ exerciseId: e.exerciseId, name: e.name, from: e.sets, to })
  })
  const trimmed = slots.map((s) => s.ex)
  return { exercises: trimmed, cuts, stillOver: overloadedRegions(trimmed) }
}

export interface VolumeVerdict {
  /** True when at least one muscle is past its per-session ceiling. */
  heavy: boolean
  total: number
  over: Overload[]
  stacked: PreFatigue[]
  /** What trimming would leave. Null when nothing needs trimming. */
  trim: TrimResult | null
}

/** One call for the UI: is this day too much, and what would fix it? */
export function volumeVerdict(exercises: ResolvedExercise[]): VolumeVerdict {
  const over = overloadedRegions(exercises)
  const trim = over.length > 0 ? trimForVolume(exercises) : null
  return {
    heavy: over.length > 0,
    total: totalSets(exercises),
    over,
    stacked: preFatigued(exercises),
    // A trim that changes nothing is not worth offering.
    trim: trim && trim.cuts.length > 0 ? trim : null,
  }
}
