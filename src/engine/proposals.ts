// ============================================================
// What every proposal is called in the ledger.
//
// One neutral home, and it exists because of a cycle. The outcome engine
// needs to know which rows belong to which rule, and each rule needs to
// ask the outcome engine whether its last attempt backfired, so importing
// the identifiers from the rule that uses them made engine/outcomes.ts
// and engine/calorieStep.ts import each other. That compiles, because
// both only read the values inside functions, and it would have stopped
// compiling the first time somebody used one at module level.
//
// These strings are written into stored rows, so they are frozen the
// moment they ship. Changing one orphans every row already written under
// it: the judge looks for its own type, finds nothing, and that
// intervention is never graded and never says why. Tests pin the
// literals for exactly that reason.
//
// A rule version is bumped when the RULE changes, so an old row stays
// readable as the decision the old rule actually made.
// ============================================================

export const STEP_TYPE = 'calorie-step'
export const STEP_TARGET = 'kcalTraining'
export const STEP_METRIC = 'trendLbPerWeek'
export const STEP_RULE_VERSION = 1

/**
 * How long an accepted calorie step is given before it is judged.
 *
 * R1's own cadence: re-evaluate after two to three weeks, never on single
 * weigh-ins. Registered when the offer is ACCEPTED rather than chosen
 * when the answer is wanted, because an outcome picked after the fact is
 * a story, not a result.
 */
export const STEP_WINDOW_DAYS = 21

// ---------------- Training adaptations ----------------
//
// The two proposals the coach already makes off the last fortnight's
// evidence, and which the athlete already accepts or waves away. Neither
// the choice nor whether it helped was recorded anywhere: acceptance went
// into a per-date list, and a dismissal wiped the card for that one day
// and was back tomorrow.

export const ADAPT_TYPE = 'adapt'
export const ADAPT_RULE_VERSION = 1

/** The metric both are judged on: did the session actually get done. */
export const ADAPT_METRIC = 'sessionGrade'

/**
 * How long each is given, in DAYS, standing in for R3's "comparable
 * exposures".
 *
 * R3 asks for one exposure for hold-load and two for reduce-volume. Days
 * are the honest approximation until section 4.2's comparable-exposure
 * definition ships: a fortnight covers one to two sessions for almost
 * every week this app builds, and judging on a calendar the athlete
 * cannot game is better than judging on a count that a skipped week
 * stretches indefinitely.
 */
export const ADAPT_WINDOW_DAYS = 14

/** A session at or above this grade is one that got done. */
export const ADAPT_GRADES_THAT_COUNT = ['full', 'overtime'] as const
