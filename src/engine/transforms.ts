import type {
  DayTemplate,
  MinViableRecipe,
  PlanConfig,
  ResolvedExercise,
  SlotId,
  TemplateEntry,
} from '../types'
import { getExercise } from '../plan/exercises'
import { MOVEMENT } from '../plan/movement'
import { overloadedRegions } from './volume'

// ============================================================
// Pure transforms. Order in resolveDay:
//   slots → A/B → dedupe → deload → gig scaling → readiness
// Volume scaling stacks multiplicatively on purpose (a deload
// day with bad readiness is halved AND ×2/3), with floors of
// 1 set / 1 rep so a day never scales to zero.
// ============================================================

const EXPLOSIVE = new Set(['sprint', 'jump'])
const UNTOUCHED_BY_DELOAD = new Set(['mobility', 'cardio', 'warmup'])

/** Fixed entries substituted when a rotating slot claims their exercise first. */
const FIXED_COLLISION_SUBSTITUTES: Record<string, string> = {
  'hammer-curl': 'ez-bar-curl', // Friday fixed hammer vs Block 3 curl slot
}

function makeResolved(
  exerciseId: string,
  sets: number,
  repText: string,
  repsNum: number | undefined,
  fromSlot?: ResolvedExercise['fromSlot'],
): ResolvedExercise {
  const def = getExercise(exerciseId)
  return {
    exerciseId,
    name: def.name,
    kind: def.kind,
    restSec: def.restSec,
    perSide: def.perSide,
    sets,
    repText,
    repsNum,
    fromSlot,
  }
}

/**
 * Resolve a template's entries into concrete exercises for a block/AB week.
 * Handles slot lookup, A/B alternation, and per-day dedupe with the
 * documented substitution rules.
 */
export function buildFromTemplate(
  template: DayTemplate,
  blockIndex: 1 | 2 | 3,
  abWeek: 'A' | 'B',
  plan: PlanConfig,
  slotOverride?: Record<SlotId, string>,
): ResolvedExercise[] {
  // A later phase can replace an anchor lift with the next movement up
  // its chain. The block map is still the base; the override only ever
  // covers the anchors, and only once they have been earned.
  const slots = slotOverride ? { ...plan.slots[blockIndex], ...slotOverride } : plan.slots[blockIndex]
  const out: ResolvedExercise[] = []
  const seen = new Set<string>()

  const push = (r: ResolvedExercise) => {
    out.push(r)
    seen.add(r.exerciseId)
  }

  for (const entry of template.entries) {
    if (entry.entry === 'fixed') {
      if (seen.has(entry.exerciseId)) {
        const sub = FIXED_COLLISION_SUBSTITUTES[entry.exerciseId]
        if (sub && !seen.has(sub)) {
          push(makeResolved(sub, entry.sets, entry.repText, entry.repsNum))
        }
        continue
      }
      push(makeResolved(entry.exerciseId, entry.sets, entry.repText, entry.repsNum))
    } else if (entry.entry === 'slot') {
      const exerciseId = slots[entry.slot]
      if (!exerciseId || seen.has(exerciseId)) continue
      const override = plan.slotRepOverrides[exerciseId]
      // Block rep waves (periodized plans) outrank exercise-shape overrides,
      // which outrank the template's default scheme.
      const byBlock = plan.slotRepsByBlock?.[entry.slot]?.[blockIndex]
      const repText = byBlock?.repText ?? override?.repText ?? entry.repText
      const repsNum = byBlock ? byBlock.repsNum : override ? override.repsNum : entry.repsNum
      push(makeResolved(exerciseId, entry.sets, repText, repsNum, entry.slot))
    } else {
      // A/B alternation; if this week's pick collides with an already-placed
      // exercise (e.g. Block 2 row slot = one-arm row on a B week), take the
      // other option instead. If both are placed, drop the entry.
      const pick = abWeek === 'A' ? entry.a : entry.b
      const alt = abWeek === 'A' ? entry.b : entry.a
      const chosen = !seen.has(pick.exerciseId) ? pick : !seen.has(alt.exerciseId) ? alt : null
      if (!chosen) continue
      push(makeResolved(chosen.exerciseId, chosen.sets, chosen.repText, chosen.repsNum))
    }
  }
  return out
}

function scaleRepOnly(r: ResolvedExercise, f: (n: number) => number): ResolvedExercise {
  if (r.repsNum === undefined) return r
  const n = Math.max(1, f(r.repsNum))
  return { ...r, repsNum: n, repText: String(n) }
}

/**
 * Week 3 is the top of the block, and then you deload.
 *
 * Weeks 1, 2 and 3 were the same prescription three times over. The only
 * week in a block that differed was the fourth one. Load and reps did
 * move underneath, because double progression reads the log rather than
 * the calendar, but nothing about the PLAN accumulated: a block with no
 * build in it is three maintenance weeks and a rest, and the rest is not
 * earned by anything.
 *
 * One extra set, on the ONE lift the day is built around.
 *
 * Giving it to every primary was the first attempt and it was worse than
 * doing nothing: three extra sets pushed the day through its per-region
 * ceiling, the volume trim took the overshoot back out of whichever
 * movement happened to be last, and a push day came out with two more
 * sets of incline and one fewer of overhead press. A ramp that has to be
 * undone is not a ramp. The main lift accumulates and everything else
 * holds still, which is what the extra set is for anyway.
 */
export function applyWeekRamp(
  exercises: ResolvedExercise[],
  weekInBlock: 1 | 2 | 3 | 4,
): ResolvedExercise[] {
  if (weekInBlock !== 3) return exercises
  const lead = exercises.findIndex((e) => e.kind === 'lift' && MOVEMENT[e.exerciseId]?.role === 'primary')
  if (lead < 0) return exercises
  const ramped = exercises.map((e, i) => (i === lead ? { ...e, sets: e.sets + 1 } : e))
  // Only onto a day with room for it. The volume ceiling runs after this
  // and cannot take the set back, because it refuses to cut the opening
  // movements and the opening movement is exactly where the ramp lands.
  // A fifth set of pull-ups put the Friday biceps half a set over with
  // nothing downstream willing to pay for it.
  //
  // "Already over" is not headroom either: a day the trim is about to
  // cut is not a day to add to first.
  return overloadedRegions(ramped).length > 0 ? exercises : ramped
}

/**
 * Deload (week 4 of every block): lifting sets halved (keep the weight),
 * sprint/jump volume halved, mobility/walks untouched.
 */
export function applyDeload(exercises: ResolvedExercise[]): ResolvedExercise[] {
  return exercises.map((r) => {
    if (UNTOUCHED_BY_DELOAD.has(r.kind)) return r
    if (EXPLOSIVE.has(r.kind)) {
      if (r.sets > 1) return { ...r, sets: Math.max(1, Math.ceil(r.sets / 2)) }
      return scaleRepOnly(r, (n) => Math.ceil(n / 2))
    }
    // lifts, core, carries: half the sets, same weight
    return { ...r, sets: Math.max(1, Math.ceil(r.sets / 2)) }
  })
}

/** Scale explosive (sprint/jump) volume by a factor (readiness / gig rules). */
export function scaleExplosive(exercises: ResolvedExercise[], factor: number): ResolvedExercise[] {
  return exercises.map((r) => {
    if (!EXPLOSIVE.has(r.kind)) return r
    if (r.sets > 1) return { ...r, sets: Math.max(1, Math.round(r.sets * factor)) }
    return scaleRepOnly(r, (n) => Math.round(n * factor))
  })
}

/** Below this a lift stops being training and becomes a gesture. */
const MIN_WORKING_SETS = 2

/**
 * Readiness downgrade (2+ flags on a CNS day), and the same-day trim:
 * sprint/jump volume −1/3, a set off every lift that can spare one, and
 * the rest flagged light ("leave 3 in the tank").
 *
 * The set cut is the part that was missing for a long time. This used to
 * scale the jumping and then only SET A FLAG on the lifts, so a trimmed
 * day had the same lifts, the same set count and the same prefilled
 * weight, plus a note saying it was lighter. The app did the arithmetic
 * in prose and left the athlete to do it for real. A trimmed day now
 * costs fewer sets, and prescription.ts takes the load down to match.
 *
 * Two sets is the floor. Cutting a 2-set accessory to 1 saves three
 * minutes and removes the reason it was in the day.
 */
export function applyReadinessDowngrade(exercises: ResolvedExercise[]): ResolvedExercise[] {
  return scaleExplosive(exercises, 2 / 3).map((r) => {
    if (r.kind !== 'lift' && r.kind !== 'core' && r.kind !== 'carry') return r
    return { ...r, sets: Math.max(MIN_WORKING_SETS, r.sets - 1), lightMode: true }
  })
}

/** Two consecutive bad-sleep nights: cut the whole day's volume by a third. */
export function applyBadSleepCut(exercises: ResolvedExercise[]): ResolvedExercise[] {
  return exercises.map((r) => {
    if (UNTOUCHED_BY_DELOAD.has(r.kind)) return r
    if (r.sets > 1) return { ...r, sets: Math.max(1, Math.round((r.sets * 2) / 3)) }
    return scaleRepOnly(r, (n) => Math.round((n * 2) / 3))
  }).map((r) => (r.kind === 'lift' ? { ...r, lightMode: true } : r))
}

/** Long shift on your feet before Monday: drop a jump set or two (min 2). */
export function applyLongShiftMonday(exercises: ResolvedExercise[]): ResolvedExercise[] {
  return exercises.map((r) => {
    if (r.kind !== 'jump') return r
    if (r.sets > 2) return { ...r, sets: r.sets - 1 }
    return r
  })
}

/**
 * Minimum viable session, the counter-offer the SkipFlow always makes.
 * Uses the template's authored recipe; falls back to the first two
 * exercises at 2 sets (cut-from-the-bottom rule, inverted).
 */
export function minimumViableFor(
  template: DayTemplate,
  resolved: ResolvedExercise[],
): { label: string; exercises: ResolvedExercise[] } {
  const recipe: MinViableRecipe | undefined = template.minViable
  if (recipe) {
    return {
      label: recipe.label,
      exercises: recipe.items.map((i) => makeResolved(i.exerciseId, i.sets, i.repText, i.repsNum)),
    }
  }
  return {
    label: 'The bare minimum',
    exercises: resolved.slice(0, 2).map((r) => ({ ...r, sets: Math.min(r.sets, 2) })),
  }
}

/** Lighter combined pull appended to Saturday when Friday is pushed (DJ Friday rule). */
export function lighterCombinedPull(): ResolvedExercise[] {
  return [
    makeResolved('pull-up', 3, 'max', undefined),
    makeResolved('barbell-row', 3, '8', 8),
    makeResolved('rear-delt-raise', 3, '15', 15),
  ]
}

export function isExplosiveKind(kind: string): boolean {
  return EXPLOSIVE.has(kind)
}

export function entryLabel(entry: TemplateEntry): string {
  if (entry.entry === 'fixed') return entry.exerciseId
  if (entry.entry === 'slot') return `slot:${entry.slot}`
  return `ab:${entry.a.exerciseId}/${entry.b.exerciseId}`
}
