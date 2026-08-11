import type {
  DayTemplate,
  MinViableRecipe,
  PlanConfig,
  ResolvedExercise,
  TemplateEntry,
} from '../types'
import { getExercise } from '../plan/exercises'

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
): ResolvedExercise[] {
  const slots = plan.slots[blockIndex]
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

/**
 * Readiness downgrade (2+ flags on a CNS day): sprint/jump volume −1/3,
 * every lift flagged light ("leave 3 in the tank").
 */
export function applyReadinessDowngrade(exercises: ResolvedExercise[]): ResolvedExercise[] {
  return scaleExplosive(exercises, 2 / 3).map((r) =>
    r.kind === 'lift' || r.kind === 'core' || r.kind === 'carry' ? { ...r, lightMode: true } : r,
  )
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
