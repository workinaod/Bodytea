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

// ---------------- The deload week ----------------
//
// The only intervention here that nobody agrees to. A deload is week four
// of every block, derived from the calendar rather than offered, so there
// is no accept event to hang a row on. Its row is manufactured after the
// fact by the same block math that scheduled it, which is what lets a
// golden test pin the trigger and the verdict together.
//
// It is also the most expensive thing this app does: a whole week of
// reduced training, taken on faith, and until now nothing could say
// whether it bought anything.

export const DELOAD_TYPE = 'deload'
export const DELOAD_RULE_VERSION = 1

/** Rebound is read off the best estimated one-rep max either side. */
export const DELOAD_METRIC = 'bestE1RM'

/**
 * R3 asks for two to three comparable exposures either side. Days again,
 * for the same reason the training adaptations use them.
 */
export const DELOAD_WINDOW_DAYS = 21

// ---------------- Load back on a stated limitation ----------------
//
// The one intervention with no way out. An athlete who told the app
// about a knee at signup had every movement loading it dropped to 85%
// and left there, permanently: `prefs.limitations` carries no expiry by
// design, so the plan kept routing around an injury that may have healed
// eighteen months ago and never once asked.
//
// R3 s9.2 gives it a route back: three clean, pain-free exposures buys
// ONE step of load, offered and never taken automatically. A pain note
// stops it for good, which is the safe direction for something somebody
// told us about rather than something the app inferred.

export const LIMIT_TYPE = 'limit-load-back'
export const LIMIT_RULE_VERSION = 1

/** Judged on whether the joint stayed quiet, which is the whole point. */
export const LIMIT_METRIC = 'painNotes'

/** R3 asks for three exposures either side, not a calendar window. */
export const LIMIT_WINDOW_DAYS = 21

// ---------------- The readiness flags themselves ----------------
//
// Two of four flags dials the day back. For most people that is right;
// for some it fires on a normal Tuesday. R3 s9.2 makes it pattern-level
// learning rather than a per-session judgement: a downgrade that is
// followed by a completed day AND a normal next session was a downgrade
// nobody needed, and enough of those says the flags are early for this
// athlete rather than that this athlete keeps having bad weeks.
//
// Proposed, never imposed. Dialling somebody's own readiness answers
// down to informational is not a call an app makes on its own.

export const READY_TYPE = 'readiness-threshold'
export const READY_RULE_VERSION = 1

/**
 * One athlete, one threshold, so every row shares a target.
 *
 * Deliberately NOT pre-registered for a verdict. R3 calls this
 * pattern-level learning, and "did easing the flags help" has no
 * counterfactual: the athlete is not running the other version of the
 * month alongside it. The row records that it was offered and answered,
 * same as the nutrition recheck.
 */
export const READY_TARGET = 'flags'

/** Flags out of four before the day is dialled back, before any easing. */
export const READY_FLAGS_TO_DOWNGRADE = 2
