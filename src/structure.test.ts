import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// ============================================================
// Structural guards.
//
// These enforce the two rules that keep the codebase workable as it
// grows: files stay small, and layers only point downwards. Both ship
// with an allowlist of what is already over the line, so the gate is
// live today rather than after a big-bang refactor, and the allowlist
// can only ever shrink.
//
// Adding a name to an allowlist is a decision to make things worse.
// Deleting one is the goal.
// ============================================================

const SRC = join(import.meta.dirname, '.')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return walk(full)
    return /\.tsx?$/.test(name) ? [full] : []
  })
}

const FILES = walk(SRC).map((f) => ({
  path: relative(SRC, f).replaceAll('\\', '/'),
  text: readFileSync(f, 'utf8'),
}))

// ---------- File size ----------

/** Logic and UI. Past this a file is doing more than one job. */
const HARD_MAX = 600

/**
 * Already over the line when the rule landed. Each of these has a
 * planned split; none may grow, and nothing new may join them.
 */
const OVERSIZE_ALLOWED: Record<string, number> = {
  // Data catalogs: these are databases in TypeScript clothing. They still
  // get split by domain, but they are not "long functions".
  // The gym and no-gym libraries went into their own modules rather than
  // in here; these two grew only by the lines that WIRE them in (the two
  // spreads) and by the demo aliases pointing new movements at the
  // existing keyframe shape they share.
  'plan/exercises.ts': 1840,
  'plan/athleticExercises.ts': 1250,
  'plan/demos.ts': 963,
  // +3 for merging the coverage-gap drills' metadata in, so every
  // function in the file sees one library rather than two.
  'plan/athletic.ts': 738,
  // Activity shapes moved to activityTypes.ts, the logged-session shapes
  // to sessionTypes.ts, the engine's day output to resolvedTypes.ts; the
  // allowance follows each time.
  // +11 for the journey key and the re-export of journeyTypes.ts, then
  // +23 for the places somebody can train (track, trail, pool, bike)
  // and FoodLimits, which is what dairy-free and allergies are.
  // +6 for the prefs key and the re-export of prefsTypes.ts, the same
  // arrangement and the same cost as the journey key above: what the
  // athlete has told the app about themselves (movements they will not
  // do, lifts to leave alone, injuries that do not expire on their own)
  // is persisted state, and the shapes live in their own file.
  // +1: voiceSetVersion, kept on one line beside the voiceURI it dates.
  // FoodLimits moved to foodTypes.ts, beside journeyTypes and prefsTypes,
  // because a shape with a subsystem reading it (plan/foodLimits.ts) is no
  // longer a field. -11 even after PlanConfig gained foodLimits itself.
  'types.ts': 604,
  // screens/onboarding/Onboarding.tsx came off this list too, which
  // empties the "real splits owed" section entirely. The chip tables and
  // the one goal heuristic went to onboardingData.ts, the goal step, the
  // generated preview and the bring-your-own-routine screens to siblings.
  // What is left is the wizard: state, the step router, and the short
  // steps that are mostly one question each.
  // screens/meals/MealsScreen.tsx came off this list. It was the second
  // entry here and it is gone: the two alternate views and the five
  // sheets moved to siblings, leaving a 244-line shell that keeps only
  // its own Log view. No entry replaces it — the whole point of the list
  // is that it gets shorter.
  // +20 for proteinContextFor: the protein target now depends on whether
  // the athlete is cutting, building or running, which is a decision the
  // generator is the right place to make and a table it is not.
  // +1: the reunification merge, where the height-aware nutrition call
  // and the relocated coreMovers landed in one file.
  // -1: foodLimits threading paid for itself by putting the buildMealPlan
  // call on one line instead of six.
  // The deep-goal copy moved to plan/strategy.ts: 180 lines of prose
  // that decided nothing, sitting inside the allowance of the file
  // that decides everything. The allowance follows it down.
  'plan/generator.ts': 747,
  // Was 835, which it blew through and broke three deploys on. Meal
  // logging moved to logic/mealActions.ts, then the prescription (what
  // load and how many reps to ask for) to logic/prescription.ts, then
  // writing sport to the log to logic/cardioActions.ts. The allowance
  // follows it down each time: an oversized file that shrinks does not
  // keep the headroom.
  // +1: one name added to the mealActions re-export block.
  // +11: two stampReachedStages calls with the comments explaining why a
  // reached stage is written down rather than re-derived, plus the import.
  // The logic itself is in logic/journeyActions.ts.
  // Answering the reconcile gate went to logic/reconcileActions.ts, which
  // paid for the one-day-one-debrief prune in finishSession and then some.
  // The allowance follows the file down, as always.
  'logic/actions.ts': 609,
  // Was 836. The how-to reader and the rest screen both moved out, and
  // the allowance follows it down: an oversized file that shrinks does
  // not get to keep the headroom it earned.
  // +10: the reunification merge unioned the shortfall/RIR wiring with
  // the voice-shortlist work; both features are real. This file now OWES
  // a split (tracked in BODYT_STATE.md); the allowance must come back
  // down when it happens.
  'screens/today/FocusView.tsx': 642,
  // Session shapes moved to store/sessionSchema.ts, beside the types they
  // mirror, the shared zod primitives to store/primitives.ts, and the
  // GPS and cardio shapes to store/activitySchema.ts. The allowance
  // follows it down each time.
  // Migrations only ever accumulate: every schema bump adds a step that
  // can never be deleted while any device might still hold the old shape.
  // This one is the +21 for v19 → v20, the calorie-floor repair.
  // +6: the journey key, defaulted like `adapt` so an old envelope
  // parses with an empty ladder and needs no migration.
  // +1: the prefs key. Its shapes went to store/prefsSchema.ts, beside
  // the types they mirror, so what lands here is the field and its import.
  // +1: voiceSetVersion, optional, so an envelope written before the
  // coach shortlist changed parses unchanged and retires its own pick.
  // The meal-plan shapes went to store/mealPlanSchema.ts, and foodLimits
  // was added there rather than here: -15 net, and the allowance follows.
  // Then settings and profile to store/settingsSchema.ts, which is where
  // the age field landed rather than here. -24 more.
  // The v19 calorie repair moved to plan/kcalFloor.ts, beside the
  // floors that decide what the repair means, so the v20 supplement
  // migration could land without raising the allowance. Both are now
  // delegated to; this file is a list of what a data file holds.
  'store/schema.ts': 554,
  'engine/engine.test.ts': 705,
  // Test files, where length is coverage rather than a missing split.
  'store/store.test.ts': 667,
}

describe('file size', () => {
  it('keeps every file under the hard cap, or under its allowance', () => {
    const tooBig: string[] = []
    for (const f of FILES) {
      const lines = f.text.split('\n').length
      const allowance = OVERSIZE_ALLOWED[f.path]
      if (allowance === undefined) {
        if (lines > HARD_MAX) tooBig.push(`${f.path} is ${lines} lines (cap ${HARD_MAX})`)
      } else if (lines > allowance) {
        tooBig.push(`${f.path} grew to ${lines} lines, over its ${allowance} allowance`)
      }
    }
    expect(tooBig).toEqual([])
  })

  it('has no stale allowlist entries', () => {
    // A file that got split, renamed or deleted must leave the list.
    const stale = Object.keys(OVERSIZE_ALLOWED).filter((p) => !FILES.some((f) => f.path === p))
    expect(stale).toEqual([])
  })
})

// ---------- Layering ----------

// Data flows one way: plan (data) → engine (pure logic) → logic (effects)
// → screens/components (UI). A layer may import anything below it and
// nothing above it.
const RANK: Record<string, number> = {
  plan: 0,
  engine: 1,
  store: 1,
  cloud: 2,
  logic: 2,
  // Platform adapters are effects like logic/, and are what the UI calls
  // instead of touching a web API directly.
  platform: 2,
  components: 3,
  screens: 3,
}

const layerOf = (path: string): string | null => {
  const top = path.split('/')[0]
  return top in RANK ? top : null
}

describe('layering', () => {
  it('never imports upwards', () => {
    const violations: string[] = []
    for (const f of FILES) {
      // Tests may reach anywhere: setting up a scenario is not architecture.
      if (/\.test\.tsx?$/.test(f.path)) continue
      const from = layerOf(f.path)
      if (from === null) continue
      for (const m of f.text.matchAll(/from '\.\.\/(?:\.\.\/)?([a-z]+)\//g)) {
        const to = m[1]
        if (!(to in RANK)) continue
        if (RANK[to] > RANK[from]) {
          violations.push(`${f.path} imports upward from ${from}/ into ${to}/`)
        }
      }
    }
    expect(violations).toEqual([])
  })
})

// ---------- Platform isolation ----------

// Everything the web platform gives us that a native wrapper would have
// to provide differently. Confining these to src/platform/ is what makes
// the Capacitor build a set of adapter swaps instead of a rewrite.
const PLATFORM_APIS =
  /\b(navigator\.(?!userAgent)|window\.speechSynthesis|speechSynthesis\b|SpeechRecognition|localStorage\b|serviceWorker\b|Notification\b)/

/**
 * Modules that still reach the platform directly. Each is scheduled to
 * move behind an adapter in src/platform/ as its feature comes up:
 * speech with the voice work, reminders with push, storage and sync with
 * the native build.
 */
const PLATFORM_ALLOWED = new Set([
  // → platform/notifications.ts, with the push backend
  'logic/reminders.ts',
  // → platform/storage.ts, with the native build
  'store/storage.ts',
  'store/appStore.ts',
  'store/backup.ts',
  'cloud/logic.ts',
  'cloud/sync.ts',
  'cloud/board.ts',
  'App.tsx',
  'screens/today/TodayScreen.tsx',
  'sw.ts',
  // → platform/geo.ts, with the health layer
  'screens/today/RunTrackerSheet.tsx',
  // navigator.share / clipboard → platform/share.ts, with the share cards
  'engine/shareCard.ts',
  'screens/coach/AccountSheet.tsx',
])

describe('platform isolation', () => {
  it('keeps platform APIs out of new code', () => {
    const leaks = FILES.filter(
      (f) =>
        !/\.test\.tsx?$/.test(f.path) &&
        !f.path.startsWith('platform/') &&
        !PLATFORM_ALLOWED.has(f.path) &&
        PLATFORM_APIS.test(f.text),
    ).map((f) => f.path)
    expect(leaks).toEqual([])
  })

  it('has no stale platform allowlist entries', () => {
    const stale = [...PLATFORM_ALLOWED].filter(
      (p) => !FILES.some((f) => f.path === p && PLATFORM_APIS.test(f.text)),
    )
    expect(stale).toEqual([])
  })
})

// ---------- Dead exports ----------

// An exported function nobody calls is knowledge collected and not
// consumed, which the owner rule says gets wired in or redone, never
// kept for its own sake. Tests do not count as consumers: a function
// whose only caller is its own test is a museum piece with a guard on
// it. The sims in scripts/ DO count, because they drive the real code
// paths the app drives.
const SCRIPTS = join(SRC, '..', 'scripts')
const REFERENCE_FILES = [
  ...FILES,
  ...readdirSync(SCRIPTS)
    .filter((n) => /\.(ts|mjs)$/.test(n))
    .map((n) => ({ path: `scripts/${n}`, text: readFileSync(join(SCRIPTS, n), 'utf8') })),
].filter((f) => !/\.test\.tsx?$/.test(f.path))

/**
 * Exported but unreferenced when the rule landed. Each is either owed a
 * caller or owed a deletion; the list only ever shrinks, and nothing
 * new may join it.
 */
const DEAD_EXPORT_ALLOWED = new Set([
  'engine/achievements.ts:earnedAchievements',
  'engine/activityLog.ts:isRunMirror',
  'engine/adapt.ts:weekLoad',
  'engine/calendar.ts:toDate',
  'engine/calendar.ts:isToday',
  'engine/calibration.ts:intensityBias',
  'engine/calibration.ts:personalBand',
  'engine/calibration.ts:calibrationNote',
  'engine/calibration.ts:needsIntensityAnswer',
  'engine/calibration.ts:gradedCount',
  'engine/coach.ts:unprovenExcusesInWindow',
  'engine/coach.ts:gigSanctioned',
  'engine/coach.ts:anyGigFlag',
  'engine/elevation.ts:altOf',
  'engine/elevation.ts:hasElevation',
  'engine/elevation.ts:smoothAltitudes',
  'engine/intensity.ts:usableHeightIn',
  'engine/journey.ts:orderPath',
  'engine/phase.ts:phaseIndexFor',
  'engine/phase.ts:anchorVerdicts',
  'engine/phase.ts:phaseSlotOverrides',
  'engine/places.ts:mapsLinks',
  'engine/places.ts:hoursLabel',
  'engine/reactions.ts:greatRunPaceSec',
  'engine/reactions.ts:greatBikeMph',
  'engine/reps.ts:repTargetFor',
  'engine/resolveDay.ts:blockMathFor',
  'engine/resolveDay.ts:cardioRequiredForWeek',
  'engine/runs.ts:estKcalFromMet',
  'engine/runs.ts:mileSplits',
  'engine/runs.ts:compressTrack',
  'engine/sequence.ts:lowRep',
  'engine/transforms.ts:scaleExplosive',
  'engine/transforms.ts:isExplosiveKind',
  'engine/transforms.ts:entryLabel',
  'engine/volume.ts:kindWeight',
  'engine/volume.ts:focusRegions',
  // regionLoad and regionName came OFF this list: engine/workoutBrief.ts
  // reads them to tell an athlete which muscles their session actually
  // loads and by how much. Counted volume was being computed for the
  // trim and then never shown to the person doing the sets.
  'engine/volume.ts:ceilingFor',
  'logic/actions.ts:toggleBallToday',
  'logic/clock.ts:stopClock',
  'logic/fatigueActions.ts:applySetFeedback',
  'logic/fatigueActions.ts:undoSetFeedback',
  'logic/reminders.ts:markNotificationsRead',
  'logic/reminders.ts:armPageTimers',
  'logic/volumeActions.ts:sessionVerdict',
  'logic/volumeActions.ts:trimSessionVolume',

  // ---- plan/, first swept W11 ----
  // Widening the scan to plan/ returned 34 exports nothing calls. That
  // is not a tidy-up backlog, it is a map of research that was
  // synthesized and never wired, and it is the reason W11 existed at
  // all: the sport answer was four questions deep and read by nothing.
  //
  // Allowlisted with the job that owns each, NOT to excuse them. The
  // stale-entry test above makes this shrink-only: the moment one of
  // these finds a caller it must leave the list, so the list is a
  // countdown rather than a drawer.

  // W4m (meals): the corpus and its macros are built and unread.
  'plan/cooking.ts:batchableIds',
  'plan/cooking.ts:noCookIds',
  'plan/cooking.ts:withinActiveMinutes',
  'plan/foods.ts:getFood',
  'plan/mealAlts.ts:slotKindOf',
  'plan/sportsNutrition.ts:carbTargetG',
  'plan/sportsNutrition.ts:fatFloorG',
  'plan/sportsNutrition.ts:mlToOz',
  'plan/sportsNutrition.ts:proteinPerMealG',
  'plan/sportsNutrition.ts:waterTargetMl',

  // W-ONT / W9: the movement ontology, most of it still unconsumed.
  'plan/movement.ts:movementChain',
  'plan/movement.ts:movementFor',
  'plan/movement.ts:oppositePattern',
  'plan/movement.ts:patternImbalances',
  'plan/movement.ts:patternLoad',
  'plan/movement.ts:progressionFor',
  'plan/movement.ts:regressionFor',
  'plan/movement.ts:stressing',
  // transfersTo is the OTHER direction of the bridge W11 just built:
  // quality to lifts, for resolving drill slots. That is R11 step 4.
  'plan/movement.ts:transfersTo',

  // W6s: R6 s5 became a table and the planner does not read it yet.
  'plan/safetyRules.ts:constraintsFor',
  'plan/safetyRules.ts:planningLimits',

  // J7 wave 1, the facts layer. weightTrend has a caller already: the
  // calorie-bump rule reads its caveat so it stops trusting a scale that
  // creatine is moving. The other four are what J8 was blocked on, and
  // J8 is the next job rather than a someday: volume autoregulation
  // needs hardSetsPerWeek, schedule fit needs trainsOnWeekday, exercise
  // fit needs daysSinceRegion. Four rows and a named consumer.
  'engine/userModel.ts:workCapacity',
  'engine/userModel.ts:recoveryByRegion',

  // R-ONT wave 1. resolveExercise left this list the same day it joined
  // it: the picker calls it now when a literal search comes back empty.
  // The two below are the parts the notation parser needs and the picker
  // does not, so they stay until plan/notation.ts lands.
  'plan/aliases.ts:normalizeName',
  'plan/aliases.ts:nameScore',

  // Older, and each one a small unfinished wire of its own.
  'plan/bookletOps.ts:primaryGoalOf',
  'plan/bookletOps.ts:referencedIds',
  'plan/followups.ts:mergedAnswers',
  'plan/followups.ts:readStatement',
  'plan/foodLimits.ts:allergyTerms',
  'plan/generator.ts:ownedTags',
  'plan/milestones.ts:weeksPerLoadStep',
  'plan/reach.ts:bmiOf',
  'plan/reach.ts:dunkVertNeededIn',
  'plan/reach.ts:standingReachIn',
])

// KNOWN LIMIT of the scan below: it looks for the NAME in other files,
// so a mention in a comment counts as a caller. W16 tripped it by
// naming an unrelated export in a doc block. Tightening it to real call
// sites is worth doing and will unmask more dead exports than it fixes,
// so it is its own job rather than a side effect of this one.
/** Exported function names: declarations plus arrow-function consts. */
function exportedFunctions(text: string): string[] {
  const names: string[] = []
  for (const m of text.matchAll(/export (?:async )?function (\w+)/g)) names.push(m[1])
  for (const m of text.matchAll(/export const (\w+) = (?:async )?\(/g)) names.push(m[1])
  return names
}

describe('dead exports', () => {
  // plan/ was outside this net until W11, and that is exactly how
  // `sportOf`, `qualitiesForSport` and `SPORT_QUALITIES` sat dead
  // through a full audit: the sport answer was collected, four
  // questions deep, and consumed by nothing. A missing caller is not a
  // crash, so nothing else was ever going to notice.
  const targets = REFERENCE_FILES.filter(
    (f) => f.path.startsWith('engine/') || f.path.startsWith('logic/') || f.path.startsWith('plan/'),
  )
  const deadNow = targets.flatMap((f) =>
    exportedFunctions(f.text).flatMap((name) => {
      const re = new RegExp(`\\b${name}\\b`)
      const used = REFERENCE_FILES.some((o) => o !== f && re.test(o.text))
      return used ? [] : [`${f.path}:${name}`]
    }),
  )

  it('never ships a new engine or logic export that nothing calls', () => {
    expect(deadNow.filter((d) => !DEAD_EXPORT_ALLOWED.has(d))).toEqual([])
  })

  it('has no stale dead-export allowlist entries', () => {
    // An export that found a caller, or got deleted, must leave the list.
    const stale = [...DEAD_EXPORT_ALLOWED].filter((d) => !deadNow.includes(d))
    expect(stale).toEqual([])
  })
})

// ---------- Locked sheets ----------

/**
 * A locked sheet is the app's accountability gate: SkipFlow and the
 * reconcile screen have no close button, a dead backdrop, and a drag
 * that only rubber-bands. Getting past one is supposed to require
 * answering it.
 *
 * Sheet also refuses to honour Escape while locked, but a mutation test
 * showed that guard is currently UNOBSERVABLE: every locked call site
 * passes `onClose={() => {}}`, so an Escape that got through would call
 * a function that does nothing. Deleting the guard broke no test.
 *
 * The guard stays, because the day a locked sheet is given a real
 * onClose is the day it becomes the only thing standing there. But the
 * property that actually protects users today is this convention, so
 * this is what gets pinned.
 */
describe('locked sheets', () => {
  /**
   * Arrow functions are the trap here. A prop list is full of `=>`, and
   * `[^>]*?` stops dead at the `>` inside the first one, so the obvious
   * regex matches NOTHING and the test passes by finding no offenders.
   * The first version of this did exactly that. Neutralising the arrows
   * first is what makes the tag scannable.
   */
  const tagsOf = (text: string) => [...text.replaceAll('=>', '=\u00bb').matchAll(/<Sheet\s([^>]*?)>/gs)].map((m) => m[1])

  it('never pass a close handler that could actually close them', () => {
    const offenders: string[] = []
    for (const f of FILES) {
      if (/\.test\.tsx?$/.test(f.path)) continue
      for (const props of tagsOf(f.text)) {
        if (!/\blocked\b/.test(props)) continue
        if (!/onClose=\{\(\)\s*=\u00bb\s*\{\s*\}\}/.test(props)) {
          offenders.push(`${f.path}: a locked <Sheet> whose onClose is not a no-op`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('still finds the locked sheets it is meant to be guarding', () => {
    // A regex that silently matches nothing would pass the test above
    // forever. Both known gates must be found. This is the check that
    // caught the arrow-function bug in the first place.
    const found = FILES.filter(
      (f) => !/\.test\.tsx?$/.test(f.path) && tagsOf(f.text).some((p) => /\blocked\b/.test(p)),
    ).map((f) => f.path)
    expect(found).toContain('screens/today/SkipFlow.tsx')
    expect(found).toContain('screens/ReconcileSheet.tsx')
  })
})
