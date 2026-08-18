import type { AppData, ISODate, PlanConfig, SlotId } from '../types'
import { ANCHOR_SLOTS } from '../plan/blocks'
import { canDo } from '../plan/equip'
import { getExercise } from '../plan/exercises'
import { MOVEMENT } from '../plan/movement'
import { addDaysISO, mondayOf, weekIndexFor } from './calendar'
import { liftSeries, repMaxSeries } from './stats'

// ============================================================
// What happens after week sixteen.
//
// The answer used to be: nothing. blockIndex is
// (floor((week - 1) / 4) % 3) + 1, so week 17 handed back block 1
// exactly as it was written on day one, and a banner said "the
// program loops". Sixteen weeks of training changed nothing about
// what came next. For anyone still there at month five, that IS
// the complaint: the app stopped having an opinion, so they went
// and wrote their own program.
//
// A phase is sixteen weeks. At the end of one, the anchor lifts
// get re-examined against what actually happened, and a lift the
// athlete has genuinely got stronger at is replaced by the next
// movement up its own progression chain. plan/movement.ts has
// carried those chains all along: goblet squat to DB front squat
// to front squat, each with the skill and equipment it needs.
//
// Deliberately conservative. Progress is earned by evidence, not
// by the calendar: a lift that stalled, or that was barely
// trained, stays exactly where it is, because the answer to
// "this is not moving" is not "here is a harder version of it".
//
// Nothing here is stored. The promotion is a function of history
// and the booklet, so it is recomputed like every other derived
// value, and there is no phase state to migrate or to drift out
// of sync with the log. It is memoised on the AppData identity,
// the same arrangement engine/calibration.ts uses, because
// resolveDay runs per calendar day and this reads history.
// ============================================================

/** One phase. Four blocks of four weeks, the deload included. */
export const PHASE_WEEKS = 16

/** Sessions on a lift inside the phase before its trend means anything. */
export const MIN_SESSIONS_TO_JUDGE = 8

/** Estimated 1RM gain that counts as "this is working". */
export const GAIN_TO_PROMOTE = 0.05

/**
 * The rep-gain floor for unloaded work. GAIN_TO_PROMOTE applied to a
 * set of ten is half a rep, which no set can show, so a percentage
 * alone would promote on noise or never. Two whole reps on a max set
 * is the smallest gain that is unambiguously training and not a good
 * day.
 */
export const REP_GAIN_TO_PROMOTE = 2

/** 1-based. Weeks 1 to 16 are phase 1, 17 to 32 are phase 2. */
export function phaseIndexFor(weekIndex: number): number {
  return Math.floor((Math.max(1, weekIndex) - 1) / PHASE_WEEKS) + 1
}

export type AnchorOutcome = 'promoted' | 'stalled' | 'untested' | 'topped-out' | 'pinned'

export interface AnchorVerdict {
  slot: SlotId
  from: string
  /** What the next phase runs. Same as `from` unless it was promoted. */
  to: string
  outcome: AnchorOutcome
}

/**
 * How a lift went over one phase: did it get trained, and did it move?
 *
 * Reads the estimated-1RM series rather than the raw weight so that
 * progress made on reps counts too. Double progression spends most of a
 * block adding reps, and a rule that only watched the bar would call
 * that a stall.
 */
function verdictFor(
  data: AppData,
  exerciseId: string,
  fromWeekStart: string,
  toWeekStart: string,
): Exclude<AnchorOutcome, 'promoted' | 'topped-out'> | 'earned' {
  const series = liftSeries(data, exerciseId).filter((p) => p.date >= fromWeekStart && p.date < toWeekStart)
  if (series.length === 0) {
    // No loaded set all phase: bodyweight work. liftSeries needs a
    // weight to say anything, so a pull-up athlete who doubled their
    // reps in sixteen weeks was scored "untested" and never promoted.
    // The rep-max series is the same evidence in the units they
    // actually train in, judged on the same session minimum.
    const reps = repMaxSeries(data, exerciseId).filter((p) => p.date >= fromWeekStart && p.date < toWeekStart)
    if (reps.length < MIN_SESSIONS_TO_JUDGE) return 'untested'
    const first = reps[0].reps
    const last = Math.max(...reps.slice(-3).map((p) => p.reps))
    if (first <= 0) return 'untested'
    const needed = Math.max(REP_GAIN_TO_PROMOTE, Math.ceil(first * GAIN_TO_PROMOTE))
    return last - first >= needed ? 'earned' : 'stalled'
  }
  if (series.length < MIN_SESSIONS_TO_JUDGE) return 'untested'
  const first = series[0].e1rm
  const last = Math.max(...series.slice(-3).map((p) => p.e1rm))
  if (first <= 0) return 'untested'
  return (last - first) / first >= GAIN_TO_PROMOTE ? 'earned' : 'stalled'
}

/** The next movement up the chain that the athlete's gear and skill allow. */
function nextUp(exerciseId: string, plan: PlanConfig): string | null {
  const owned = new Set(plan.equipment)
  const here = MOVEMENT[exerciseId]
  if (!here) return null
  for (const id of here.progressions ?? []) {
    const up = MOVEMENT[id]
    if (!up || !canDo(id, owned)) continue
    // One step at a time. A jump of two skill levels is how somebody
    // meets a front squat before they have met a front rack.
    if (up.skill - here.skill > 1) continue
    return id
  }
  return null
}

const cache = new WeakMap<AppData, Map<string, AnchorVerdict[]>>()

/**
 * What the anchor lifts should be for `phaseIndex`, and why.
 *
 * Phase 1 is always the booklet as written. Every phase after it walks
 * the previous sixteen weeks once per anchor.
 */
export function anchorVerdicts(
  data: AppData,
  plan: PlanConfig,
  phaseIndex: number,
  weekStartISO: (weekIndex: number) => string,
): AnchorVerdict[] {
  const base = ANCHOR_SLOTS.map((slot) => ({
    slot: slot as SlotId,
    from: plan.slots[1][slot],
    to: plan.slots[1][slot],
    outcome: 'untested' as AnchorOutcome,
  })).filter((v) => !!v.from)
  if (phaseIndex <= 1) return base

  const key = `${phaseIndex}`
  const hit = cache.get(data)?.get(key)
  if (hit) return hit

  const out: AnchorVerdict[] = []
  for (const v of base) {
    // Walk every phase in turn, so a lift promoted in phase 2 is the one
    // phase 3 judges. Promotions compound, they do not restart.
    let current = v.from
    let outcome: AnchorOutcome = 'untested'
    for (let p = 1; p < phaseIndex; p++) {
      const from = weekStartISO((p - 1) * PHASE_WEEKS + 1)
      const to = weekStartISO(p * PHASE_WEEKS + 1)
      // Pinned means pinned. Somebody training for a competition lift, or
      // just attached to the one movement they trust, does not want the
      // app deciding they have earned a different one.
      if (data.prefs.pinned.includes(current)) {
        outcome = 'pinned'
        continue
      }
      const judged = verdictFor(data, current, from, to)
      if (judged !== 'earned') {
        outcome = judged
        continue
      }
      const up = nextUp(current, plan)
      if (!up) {
        outcome = 'topped-out'
        continue
      }
      current = up
      outcome = 'promoted'
    }
    out.push({ ...v, to: current, outcome })
  }

  let perData = cache.get(data)
  if (!perData) cache.set(data, (perData = new Map()))
  perData.set(key, out)
  return out
}

/** The slot overrides a phase applies, empty when nothing was earned. */
export function phaseSlotOverrides(verdicts: AnchorVerdict[]): Record<SlotId, string> {
  const out: Record<SlotId, string> = {}
  for (const v of verdicts) if (v.to !== v.from) out[v.slot] = v.to
  return out
}

/**
 * Everything the resolver needs for one date: which phase it is in, what
 * the anchors became, and the slot map to build with.
 *
 * Bundled here rather than assembled at the call site so the resolver
 * stays a pipeline and the phase rules stay in one file.
 */
export function phaseFor(
  data: AppData,
  dateISO: ISODate,
): { index: number; verdicts: AnchorVerdict[]; overrides: Record<SlotId, string> } {
  const start = mondayOf(data.settings.phaseStartDate)
  const index = phaseIndexFor(weekIndexFor(dateISO, data.settings.phaseStartDate))
  const verdicts = anchorVerdicts(data, data.plan, index, (w) => addDaysISO(start, (w - 1) * 7))
  return { index, verdicts, overrides: phaseSlotOverrides(verdicts) }
}

/** One line for the athlete about what the new phase changed, or held. */
export function phaseNote(index: number, verdicts: AnchorVerdict[]): string {
  const moved = verdicts.filter((v) => v.outcome === 'promoted')
  if (moved.length) {
    const names = moved.map((v) => getExercise(v.to).name).join(', ')
    return `Phase ${index}. You earned harder lifts: ${names}. Same job, more of you required.`
  }
  const stalled = verdicts.filter((v) => v.outcome === 'stalled')
  if (stalled.length) {
    const names = stalled.map((v) => getExercise(v.from).name).join(', ')
    return `Phase ${index}. Holding ${names} until they move again. A lift that stalled does not need a harder version, it needs another run at this one.`
  }
  return `Phase ${index}. Same lifts, and the reps pick up where you left them. Keep climbing.`
}
