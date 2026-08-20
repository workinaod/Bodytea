#!/usr/bin/env node
// Mutation harness: poison each fix, confirm the tests catch it, revert.
//
// A green suite proves nothing on its own. It proves the tests RUN. This
// reintroduces each bug one at a time and asserts the relevant test goes
// red — a mutation that survives is a test that was decorative.
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// NEVER import this file to check it parses. It is a script, not a module:
// `node -e "import('./scripts/poison.mjs')"` RUNS the whole harness, and if
// the tree happens to be clean at that moment it starts mutating source
// behind whatever else is going on. Use `node --check` or read it.
//
// The checkout this script is sitting in, not the one it was written in. A
// hardcoded path meant the harness mutated whatever happened to be at that
// address: in a worktree it read files that were not there, and on a branch
// without src/ it crashed after restoring nothing, because there was
// nothing of ours to restore.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const arg = process.argv[2]

/** file, find, replace, the spec that must go red, and what bug it is. */
const MUTATIONS = [
  {
    id: 'fat-loss-ceiling-lifted',
    bug: 'the app promises 2 %/wk fat loss, which is muscle coming off',
    file: 'src/plan/milestones.ts',
    find: "  if (bodyFatPct >= 30) return WEEKLY_CHANGE_PCT.fatLossMax // 1.0 %",
    to: "  if (bodyFatPct >= 30) return 0.02",
    spec: 'src/plan/milestones.test.ts',
  },
  {
    id: 'fat-loss-ignores-leanness',
    bug: 'the last ten pounds are projected as fast as the first thirty',
    file: 'src/plan/milestones.ts',
    find: "  if (bodyFatPct >= 20) return 0.0075",
    to: "  if (bodyFatPct >= 20) return WEEKLY_CHANGE_PCT.fatLossMax",
    spec: 'src/plan/milestones.test.ts',
  },
  {
    id: 'deload-tax-dropped',
    bug: 'every strength projection runs 33 % fast, because week four is counted as progress',
    file: 'src/plan/milestones.ts',
    find: 'const DELOAD_TAX = 4 / 3',
    to: 'const DELOAD_TAX = 1',
    spec: 'src/plan/milestones.test.ts',
  },
  {
    id: 'strength-ceiling-removed',
    bug: 'a trained lifter is promised a beginner\'s year on the squat',
    file: 'src/plan/milestones.ts',
    find: '  return Math.min(mechanical, LB_PER_WEEK_CEILING[args.age])',
    to: '  return mechanical',
    spec: 'src/plan/milestones.test.ts',
  },
  {
    id: 'strength-ignores-frequency',
    bug: 'squatting once a week projects the same rate as squatting three times',
    file: 'src/plan/milestones.ts',
    find: '  const perWeek = Math.max(0.5, args.sessionsPerWeek)',
    to: '  const perWeek = 2',
    spec: 'src/plan/milestones.test.ts',
  },
  {
    id: 'vert-sold-like-a-sales-page',
    bug: 'plus ten inches on the vertical in twelve weeks',
    file: 'src/plan/milestones.ts',
    // Anchor updated at the reunification merge: the onboarding rebuild
    // added the casual tier to TrainingAge, and the old three-tier quote
    // stopped matching, which left this tripwire dead until re-aimed.
    find: "const VERT_IN_PER_WEEK: Record<TrainingAge, number> = { new: 0.2, returning: 0.12, casual: 0.09, trained: 0.05 }",
    to: "const VERT_IN_PER_WEEK: Record<TrainingAge, number> = { new: 0.9, returning: 0.6, casual: 0.5, trained: 0.4 }",
    spec: 'src/plan/milestones.test.ts',
  },
  {
    id: 'run-build-too-fast',
    bug: 'the long run climbs at a rate that produces tibial stress reactions',
    file: 'src/plan/milestones.ts',
    find: '  return Math.ceil((Math.log(toMi / from) / Math.log(1.08)) * DELOAD_TAX)',
    to: '  return Math.ceil(Math.log(toMi / from) / Math.log(1.25))',
    spec: 'src/plan/milestones.test.ts',
  },
  {
    id: 'stage-ids-move-under-the-climber',
    bug: 'a stage id shifts with the anchor, so a reached stage orphans and un-achieves',
    file: 'src/plan/milestones.ts',
    find: "  `${s.track}:${s.metric}:${s.exerciseId ?? '-'}:${Math.round(s.target * 10)}`",
    to: "  `${s.track}:${s.metric}:${s.exerciseId ?? '-'}:${Math.round(s.target * 10)}:${s.detail}`",
    spec: 'src/plan/milestones.test.ts',
  },
  {
    id: 'a-goal-left-on-one-track',
    bug: 'one stalled number greys out the entire board for a whole goal',
    file: 'src/plan/milestones.ts',
    find: "  endurance: ['engine', 'body', 'consistency'],",
    to: "  endurance: ['engine'],",
    spec: 'src/plan/milestones.test.ts',
  },
  {
    id: 'day-one-has-nothing-to-climb',
    bug: 'a brand-new account opens the screen to a wall of grey locked rows',
    file: 'src/plan/milestones.ts',
    find: "  general: ['consistency', 'strength', 'body'],",
    to: "  general: ['strength', 'body'],",
    spec: 'src/plan/milestones.test.ts',
  },
  {
    id: 'eta-never-refuses-a-stall',
    bug: 'a lift that has not moved in months still prints a confident date',
    file: 'src/engine/journeyMetrics.ts',
    find: '  } else if (a.observedPerWeek !== null && a.observedPerWeek <= 0) {',
    to: '  } else if (false) {',
    spec: 'src/engine/journey.test.ts',
  },
  {
    id: 'eta-has-no-horizon',
    bug: 'the app cheerfully estimates a date in 2031',
    file: 'src/engine/journeyMetrics.ts',
    find: '  if (weeks > MAX_ETA_WEEKS) {',
    to: '  if (false) {',
    spec: 'src/engine/journey.test.ts',
  },
  {
    id: 'eta-ignores-measurement-noise',
    bug: 'a date computed off a rate smaller than the ruler it is measured with',
    file: 'src/engine/journeyMetrics.ts',
    find: '  if (floor !== undefined && modelled < floor) {',
    to: '  if (false) {',
    spec: 'src/engine/journey.test.ts',
  },
  {
    id: 'hot-month-promises-a-hot-year',
    bug: 'a first big week of water loss projects across the whole cut',
    file: 'src/engine/journeyMetrics.ts',
    find: '    rate = Math.min(a.observedPerWeek, modelled * OBSERVED_CAP_MULTIPLE)',
    to: '    rate = a.observedPerWeek',
    spec: 'src/engine/journey.test.ts',
  },
  {
    id: 'later-stages-drawn-on-a-straight-line',
    bug: 'a novice hot block is projected straight through the plateau it precedes',
    file: 'src/engine/journeyMetrics.ts',
    find: '  const decay = STAGE_DECAY ** a.index',
    to: '  const decay = 1',
    spec: 'src/engine/journey.test.ts',
  },
  {
    id: 'estimates-off-two-weigh-ins',
    bug: 'a slope drawn through two points becomes a date somebody plans around',
    file: 'src/engine/journeyMetrics.ts',
    find: '  if (pts.length < MIN_OBSERVED_POINTS) return null',
    to: '  if (pts.length < 2) return null',
    spec: 'src/engine/journey.test.ts',
  },
  {
    id: 'scale-stage-lights-on-one-dry-morning',
    bug: 'a bodyweight stage is reached by a single lucky reading, and stays lit',
    file: 'src/engine/journeyMetrics.ts',
    find: '  const mean = window.length >= 2 ? window.reduce((a, b) => a + b.value, 0) / window.length : null',
    to: '  const mean = window.reduce((a, b) => a + b.value, 0) / window.length',
    spec: 'src/engine/journey.test.ts',
  },
  {
    id: 'lift-stage-scored-on-an-estimated-max',
    bug: 'a lucky set of twelve at 135 lights the 185 stage',
    file: 'src/engine/journeyMetrics.ts',
    find: '      return s.length ? Math.max(...s.map((p) => p.weightLb)) : null',
    to: '      return s.length ? Math.max(...s.map((p) => p.e1rm)) : null',
    spec: 'src/engine/journey.test.ts',
  },
  {
    id: 'reached-stage-un-reaches',
    bug: 'a 30-day streak goes dark the day the streak breaks',
    file: 'src/engine/journey.ts',
    find: '    const reached = Boolean(hitOn) || reachedNow(data, b.spec, current, b.descending)',
    to: '    const reached = reachedNow(data, b.spec, current, b.descending)',
    spec: 'src/engine/journey.test.ts',
  },
  {
    id: 'ladder-starts-at-today',
    bug: 'a stage is never on the path when it is cleared, so nothing is ever ticked',
    file: 'src/engine/journey.ts',
    find: '      for (const spec of strengthStages(lift.exerciseId, lift.label, from, cur + 150).slice(0, 7)) {',
    to: '      for (const spec of strengthStages(lift.exerciseId, lift.label, cur, cur + 150).slice(0, 7)) {',
    spec: 'src/engine/journey.test.ts',
  },
  {
    id: 'path-points-at-the-furthest-stage',
    bug: 'on a cut the stage four months out is labelled next, and the near one is buried',
    file: 'src/engine/journey.ts',
    find: '    if (a.target !== b.target) return a.descending ? b.target - a.target : a.target - b.target',
    to: '    if (a.target !== b.target) return a.target - b.target',
    spec: 'src/engine/journey.test.ts',
  },
  {
    id: 'stamp-overwrites-the-first-time',
    bug: 'the day a stage was reached is rewritten to today, every time',
    file: 'src/engine/journey.ts',
    find: "    .path.filter((r) => r.state === 'done' && !hits[r.id])",
    to: "    .path.filter((r) => r.state === 'done')",
    spec: 'src/logic/journeyActions.test.ts',
  },
  {
    id: 'kcal-floor-removed',
    bug: 'the 650 kcal/day target comes back',
    file: 'src/plan/kcalFloor.ts',
    find: '  const floor = Math.max(MIN_KCAL_TRAINING, Math.round(maintenance * (1 - MAX_DEFICIT)))',
    to: '  const floor = 0',
    spec: 'src/plan/kcalFloor.test.ts',
  },
  {
    id: 'rest-drop-widened',
    bug: 'a wider rest-day drop pushes the rest target under its floor',
    file: 'src/plan/kcalFloor.ts',
    find: 'export const REST_DAY_DROP = 300',
    to: 'export const REST_DAY_DROP = 400',
    spec: 'src/plan/kcalFloor.test.ts',
  },
  {
    id: 'byor-ignores-sex',
    bug: 'women get a man\'s maintenance again',
    // The line moved: both nutrition paths now share one fallback in
    // plan/bmr.ts, which is the point of extracting it. Same bug, one
    // place to reintroduce it instead of two.
    file: 'src/plan/bmr.ts',
    find: "  return Math.round((bodyweightLb * KCAL_PER_LB[sex ?? 'male']) / 50) * 50 + heightAdjustmentKcal(heightIn, sex)",
    to: "  return Math.round((bodyweightLb * KCAL_PER_LB.male) / 50) * 50 + heightAdjustmentKcal(heightIn, sex)",
    spec: 'src/plan/kcalFloor.test.ts',
  },
  {
    id: 'e1rm-rep-cap-removed',
    bug: 'a light 20-rep set outranks a heavy 5-rep set again',
    file: 'src/engine/stats.ts',
    find: '  return Math.round(weightLb * (1 + Math.min(reps, E1RM_MAX_REPS) / 30))',
    to: '  return Math.round(weightLb * (1 + reps / 30))',
    spec: 'src/engine/stats.test.ts',
  },
  {
    id: 'e1rm-single-inflated',
    bug: 'a 200 lb single logs as a 207 lb max',
    file: 'src/engine/stats.ts',
    find: '  if (reps <= 1) return Math.round(weightLb)',
    to: '  if (reps < 0) return Math.round(weightLb)',
    spec: 'src/engine/stats.test.ts',
  },
  {
    id: 'chicken-protein-wrong',
    bug: 'chicken breast understates protein by a fifth',
    file: 'src/plan/foods.ts',
    find: "serving: '8 oz cooked', proteinG: 70, kcal: 375",
    to: "serving: '8 oz cooked', proteinG: 55, kcal: 375",
    spec: 'src/plan/foods.test.ts',
  },
  {
    id: 'meal-template-drift',
    bug: 'a meal template silently stops adding up to its day',
    file: 'src/plan/foods.ts',
    find: "name: 'Chicken + rice + veg', detail: '8 oz chicken breast + 2 cups rice + veg + olive oil', proteinG: 60, kcal: 750",
    to: "name: 'Chicken + rice + veg', detail: '8 oz chicken breast + 2 cups rice + veg + olive oil', proteinG: 60, kcal: 700",
    spec: 'src/plan/foods.test.ts',
  },
  {
    id: 'vegan-meal-has-chicken',
    bug: 'a vegan asking for a swap is handed chicken',
    file: 'src/plan/mealAlts.ts',
    find: "{ id: 'tofu-stirfry', name: 'Tofu stir-fry over rice', ingredients: ['1 block firm tofu'",
    to: "{ id: 'tofu-stirfry', name: 'Tofu stir-fry over rice', ingredients: ['6 oz chicken'",
    spec: 'src/plan/mealAlts.test.ts',
  },
  {
    id: 'stored-target-not-repaired',
    bug: 'existing users keep their unsafe stored calorie target',
    file: 'src/plan/kcalFloor.ts',
    find: "    if (typeof n.kcalTraining === 'number') n.kcalTraining = Math.max(MIN_KCAL_TRAINING, n.kcalTraining)",
    to: "    if (typeof n.kcalTraining === 'number') n.kcalTraining = n.kcalTraining",
    spec: 'src/store/store.test.ts',
  },
  {
    id: 'save-failure-swallowed',
    bug: 'a full disk silently discards everything logged after it',
    file: 'src/store/storage.ts',
    find: "      console.error('Failed to persist state', e)\n      return false",
    to: "      console.error('Failed to persist state', e)\n      return true",
    spec: 'src/store/storage.test.ts',
  },
  {
    id: 'quota-detection-name-only',
    bug: 'Firefox and old Safari quota errors go unrecognised',
    file: 'src/store/storage.ts',
    find: '    dom.code === 22 ||\n    dom.code === 1014',
    to: '    false ||\n    false',
    spec: 'src/store/storage.test.ts',
  },
  {
    id: 'voice-shortlist-removed',
    bug: 'Albert, Bad News, Bahh and Bells are back at the top of the picker',
    file: 'src/platform/voices.ts',
    find: '  const short = all.filter((v) => COACH_VOICES.test(v.name ?? \'\'))\n  if (short.length) return short',
    to: '  const short: SpeechSynthesisVoice[] = []\n  if (short.length) return short',
    spec: 'src/platform/speakable.test.ts',
  },
  {
    id: 'auto-pick-ignores-shortlist',
    bug: '"Reset to automatic" hands back a voice the picker refuses to show',
    file: 'src/platform/voices.ts',
    find: '  const pool = coachVoices(en.length ? en : all)',
    to: '  const pool = en.length ? en : all',
    spec: 'src/platform/speakable.test.ts',
  },
  {
    id: 'protein-flat-again',
    bug: 'a cut and a bulk get the same protein target',
    file: 'src/plan/sportsNutrition.ts',
    find: '  deficit: 2.4,',
    to: '  deficit: 2.2,',
    spec: 'src/plan/sportsNutrition.test.ts',
  },
  {
    id: 'fat-floor-removed',
    bug: 'an aggressive cut drops fat below the hormonal floor',
    file: 'src/plan/sportsNutrition.ts',
    find: '  const fatG = Math.round(Math.max(fatMin, (afterProtein * 0.3) / 9) / 5) * 5',
    to: '  const fatG = Math.round(((afterProtein * 0.3) / 9) / 5) * 5',
    spec: 'src/plan/sportsNutrition.test.ts',
  },
  {
    id: 'bodyweight-biceps-gone',
    bug: 'a no-equipment user has no way to train biceps or reach a chain end',
    file: 'src/plan/equip.ts',
    find: "  'underhand-inverted-row': ['none'],",
    to: "  'underhand-inverted-row': ['pullup-bar'],",
    spec: 'src/plan/equipCoverage.test.ts',
  },
  {
    id: 'locked-sheet-given-a-real-onclose',
    bug: 'the accountability gate gains a working close handler',
    file: 'src/screens/today/SkipFlow.tsx',
    find: '<Sheet open onClose={() => {}} locked',
    to: '<Sheet open onClose={() => setOpen(false)} locked',
    spec: 'src/structure.test.ts',
  },
  {
    id: 'locked-sheet-scan-goes-blind',
    bug: 'the locked-sheet scanner silently matches nothing and passes forever',
    file: 'src/structure.test.ts',
    find: "text.replaceAll('=>', '=\\u00bb')",
    to: "text.replaceAll('=>', '=>')",
    spec: 'src/structure.test.ts',
  },
  {
    id: 'regression-goes-uphill',
    bug: 'the easier option is more technical than what it replaces',
    file: 'src/plan/movement.ts',
    find: "regressions: ['db-front-squat', 'goblet-squat'], transfer: ['athletic-strength', 'vertical-power', 'explosive-strength']",
    to: "regressions: ['db-front-squat', 'goblet-squat', 'shrimp-squat'], transfer: ['athletic-strength', 'vertical-power', 'explosive-strength']",
    spec: 'src/plan/movement.test.ts',
  },
  {
    id: 'substitution-crosses-pattern',
    bug: 'a bench press can be swapped for a lateral raise',
    file: 'src/plan/movement.ts',
    find: '    if (m.pattern !== meta.pattern) continue',
    to: '    if (false) continue',
    spec: 'src/plan/movement.test.ts',
  },
  {
    id: 'sore-joint-ignored',
    bug: 'a substitution still loads the joint that hurts',
    file: 'src/plan/movement.ts',
    find: '    if (m.stress.some((j) => avoid.has(j))) continue',
    to: '    if (false) continue',
    spec: 'src/plan/movement.test.ts',
  },
  {
    id: 'imbalance-blind',
    bug: 'a four-press one-row day reads as balanced',
    file: 'src/plan/movement.ts',
    find: '    if (sets >= (oppositeSets || 0.5) * IMBALANCE_RATIO) {',
    to: '    if (false) {',
    spec: 'src/plan/movement.test.ts',
  },
  {
    id: 'pain-reroute-needs-a-tap',
    bug: 'a hurting joint stops rerouting automatically',
    file: 'src/engine/adapt.ts',
    find: "          automatic: true,\n          exerciseId: ex.exerciseId,\n          toExerciseId: sub,\n          // Told, or inferred.",
    to: "          automatic: false,\n          exerciseId: ex.exerciseId,\n          toExerciseId: sub,\n          // Told, or inferred.",
    spec: 'src/engine/adapt.test.ts',
  },
  {
    id: 'unroutable-joint-goes-quiet',
    bug: 'a shoulder flagged three times keeps getting an overhead press and no comment',
    file: 'src/engine/adapt.ts',
    find: '        unroutable.set(joint, [...(unroutable.get(joint) ?? []), ex.exerciseId])',
    to: '        void joint',
    spec: 'src/engine/adapt.test.ts',
  },
  {
    id: 'pain-advice-says-stop',
    bug: 'a sore joint is told to rest instead of to train lighter',
    file: 'src/engine/adapt.ts',
    find: 'Keep ${ids.length > 1 ? \'them\' : \'it\'} in, a third lighter,',
    to: 'Stop training ${ids.length > 1 ? \'them\' : \'it\'} until it settles,',
    spec: 'src/engine/adapt.test.ts',
  },
  {
    id: 'pain-advice-has-no-clock',
    bug: 'somebody manages a painful joint indefinitely with no prompt to get it looked at',
    file: 'src/engine/adapt.ts',
    find: 'Still sore in two weeks, see a physio.',
    to: 'Take it as it comes.',
    spec: 'src/engine/adapt.test.ts',
  },
  {
    id: 'pain-advice-repeats-per-movement',
    bug: 'three presses produce three identical warnings, so the real one gets scrolled past',
    file: 'src/engine/adapt.ts',
    find: '  for (const [joint, ids] of unroutable) {',
    to: '  for (const [joint, ids] of [...unroutable].flatMap(([j, i]) => i.map((x) => [j, [x]]))) {',
    spec: 'src/engine/adapt.test.ts',
  },
  {
    id: 'pain-advice-claims-to-have-acted',
    bug: 'advice the engine cannot carry out is marked as already applied',
    file: 'src/engine/adapt.ts',
    find: "      automatic: false,\n      exerciseId: ids[0],\n      because: `Your ${j} keeps getting flagged",
    to: "      automatic: true,\n      exerciseId: ids[0],\n      because: `Your ${j} keeps getting flagged",
    spec: 'src/engine/adapt.test.ts',
  },
  {
    id: 'advice-shadows-a-real-swap',
    bug: 'a movement that HAS a joint-sparing swap gets told to go lighter instead',
    file: 'src/engine/adapt.ts',
    find: '      } else {\n        unroutable.set(joint,',
    to: '      }\n      {\n        unroutable.set(joint,',
    spec: 'src/engine/adapt.test.ts',
  },
  {
    id: 'one-complaint-reroutes',
    bug: 'a single bad set reroutes the whole plan around a joint',
    // Moved with the reading half when adapt.ts was split.
    file: 'src/engine/signals.ts',
    find: 'export const PAIN_PATTERN_COUNT = 2',
    to: 'export const PAIN_PATTERN_COUNT = 1',
    spec: 'src/engine/adapt.test.ts',
  },
  {
    id: 'equipment-gap-ignored',
    bug: 'a session keeps prescribing a barbell that is not in the room',
    file: 'src/engine/adapt.ts',
    find: '    if (!canDo(ex.exerciseId, ctx.owned)) {',
    to: '    if (false) {',
    spec: 'src/engine/adapt.test.ts',
  },
  {
    id: 'swap-loses-the-prescription',
    bug: 'a substitution resets sets and reps, so progression reads off nothing',
    file: 'src/engine/adapt.ts',
    find: "    return { ...e, exerciseId: to, name: def.name, kind: def.kind, restSec: def.restSec, swappedFrom: e.exerciseId }",
    to: "    return { ...e, exerciseId: to, name: def.name, kind: def.kind, restSec: def.restSec, sets: 3, repText: '10', swappedFrom: e.exerciseId }",
    spec: 'src/engine/adapt.test.ts',
  },
  {
    id: 'tired-cuts-volume-silently',
    bug: 'one rough night shrinks the session without asking',
    file: 'src/engine/adapt.ts',
    find: "      kind: 'reduce-volume',\n      automatic: false,\n      sets: 1,",
    to: "      kind: 'reduce-volume',\n      automatic: true,\n      sets: 1,",
    spec: 'src/engine/adapt.test.ts',
  },
  {
    id: 'sleep-holds-the-bar',
    bug: 'the original complaint: one bad night and the app backs off the weight',
    file: 'src/engine/adapt.ts',
    find: '    wornDown || (shortSleep && extra)',
    to: '    wornDown || shortSleep',
    spec: 'src/engine/adapt.test.ts',
  },
  {
    id: 'sleep-takes-the-day',
    bug: 'short sleep proposes a day off instead of a shorter session',
    file: 'src/engine/adapt.ts',
    find: "      kind: 'reduce-volume',\n      automatic: false,\n      sets: 1,",
    to: "      kind: 'add-recovery',\n      automatic: false,\n      sets: 99,",
    spec: 'src/engine/adapt.test.ts',
  },
  {
    id: 'double-cut-for-sleep',
    bug: 'the resolver trims for two bad nights and the proposal trims the trimmed session again',
    file: 'src/engine/adapt.ts',
    find: '  if (cutReasons.length > 0 && !ctx.alreadyCutForSleep) {',
    to: '  if (cutReasons.length > 0) {',
    spec: 'src/engine/adapt.test.ts',
  },
  {
    id: 'comeback-cuts-volume',
    bug: 'coming back from a gap loses sets, which is backwards — they are undertrained',
    file: 'src/engine/adapt.ts',
    find: '  const cutReasons = [shortSleep, wornDown, extra].filter(Boolean)',
    to: '  const cutReasons = [shortSleep, wornDown, extra, missed].filter(Boolean)',
    spec: 'src/engine/adapt.test.ts',
  },
  {
    id: 'cut-runs-a-lift-to-nothing',
    bug: 'the set cut takes a two-set movement down to one, then to none',
    file: 'src/engine/adapt.ts',
    find: '      KIND_COUNTS_AS_LIFTING.has(e.kind) && e.sets > MIN_SETS_AFTER_CUT ? { ...e, sets: e.sets - 1 } : e,',
    to: '      KIND_COUNTS_AS_LIFTING.has(e.kind) && e.sets > 0 ? { ...e, sets: e.sets - 1 } : e,',
    spec: 'src/engine/adapt.test.ts',
  },
  {
    id: 'meal-filed-under-the-wrong-day',
    bug: 'a rest day with no meals of its own shows an empty plan instead of the training day',
    file: 'src/logic/mealActions.ts',
    find: '  if (mine.length) return { list: mine, borrowed: false }',
    to: '  return { list: mine, borrowed: false }\n  // eslint-disable-next-line no-unreachable',
    spec: 'src/logic/mealActions.test.ts',
  },
  {
    id: 'borrowed-day-not-flagged',
    bug: 'a training day\'s 700 kcal plates get labelled as today\'s rest-day plan',
    file: 'src/logic/mealActions.ts',
    find: '  return { list: other, borrowed: other.length > 0 }',
    to: '  return { list: other, borrowed: false }',
    spec: 'src/logic/mealActions.test.ts',
  },
  {
    id: 'other-day-pads-a-real-day',
    bug: 'a rest day with one meal gets topped up with the training day\'s food',
    file: 'src/logic/mealActions.ts',
    find: '  const mine = templates.filter((m) => m.dayType === dayType)',
    to: '  const mine = templates.filter(() => false)',
    spec: 'src/logic/mealActions.test.ts',
  },
  {
    id: 'unplanned-sport-invisible',
    bug: 'two hours of basketball does not register as training load',
    file: 'src/engine/signals.ts',
    find: 'export const EXTRA_LOAD_MINUTES = 60',
    to: 'export const EXTRA_LOAD_MINUTES = 600',
    spec: 'src/engine/adapt.test.ts',
  },
  {
    id: 'macro-coverage-lies',
    bug: 'a half-logged day claims full carb and fat coverage',
    file: 'src/engine/stats.ts',
    find: '  out.coverage = out.kcal > 0 ? out.coveredKcal / out.kcal : 0',
    to: '  out.coverage = out.kcal > 0 ? 1 : 0',
    spec: 'src/store/store.test.ts',
  },
  {
    id: 'macro-backfill-lost',
    bug: 'meals logged before carbs were stored read as zero carbs',
    file: 'src/engine/stats.ts',
    find: '    const food = e.foodId ? FOODS.find((f) => f.id === e.foodId) : undefined\n    const carbs = e.carbsG ?? food?.carbsG',
    to: '    const food = undefined as { carbsG: number; fatG: number } | undefined\n    const carbs = e.carbsG ?? food?.carbsG',
    spec: 'src/store/store.test.ts',
  },
  {
    id: 'proposal-applied-without-consent',
    bug: 'an inference resizes the session without anybody agreeing to it',
    file: 'src/engine/adapt.ts',
    find: "  if ((data.adapt[dateISO] ?? []).includes('reduce-volume')) {",
    to: '  if (true) {',
    spec: 'src/engine/adapt.test.ts',
  },
  {
    id: 'reduce-volume-hits-stretching',
    bug: 'the set cut lands on mobility work, where it means nothing',
    file: 'src/engine/adapt.ts',
    find: '      KIND_COUNTS_AS_LIFTING.has(e.kind) && e.sets > MIN_SETS_AFTER_CUT ? { ...e, sets: e.sets - 1 } : e,',
    to: '      e.sets > MIN_SETS_AFTER_CUT ? { ...e, sets: e.sets - 1 } : e,',
    spec: 'src/engine/adapt.test.ts',
  },
  {
    id: 'hold-load-also-cuts-sets',
    bug: 'two separate decisions collapse into one blunt switch',
    file: 'src/engine/adapt.ts',
    find: "  if ((data.adapt[dateISO] ?? []).includes('reduce-volume')) {",
    to: "  if ((data.adapt[dateISO] ?? []).length > 0) {",
    spec: 'src/engine/adapt.test.ts',
  },
  {
    id: 'hold-load-does-nothing',
    bug: 'the athlete accepts "hold the weights" and the load climbs anyway',
    file: 'src/logic/prescription.ts',
    find: '  const wrapStep = step?.wrapped && !holding ? loadStepLb(exerciseId) : 0',
    to: '  const wrapStep = step?.wrapped ? loadStepLb(exerciseId) : 0',
    spec: 'src/logic/prescription.test.ts',
  },
  {
    id: 'missed-sessions-say-nothing',
    bug: 'coming back from a gap gets no guidance at all',
    file: 'src/engine/adapt.ts',
    find: "      : missed\n        ? `${missed.detail} Coming back",
    to: "      : missed && false\n        ? `${missed.detail} Coming back",
    spec: 'src/engine/adapt.test.ts',
  },
  {
    id: 'adaptation-runs-on-a-good-week',
    bug: 'the plan gets rewritten when nothing has happened',
    file: 'src/engine/adapt.ts',
    // Re-aimed after the adaptContext extraction reshaped the call.
    find: `planAdjustments(exercises, adaptContext(data, dateISO, equipment)).filter(
    (a) => a.automatic,
  )`,
    to: 'planAdjustments(exercises, adaptContext(data, dateISO, equipment))',
    spec: 'src/engine/adapt.test.ts',
  },
  {
    id: 'unfinished-sets-count-as-done',
    bug: 'a set started and abandoned is recorded as work performed',
    file: 'src/engine/sessionRecap.ts',
    find: '    const done = log.sets.filter((s) => s.done)',
    to: '    const done = log.sets',
    spec: 'src/engine/sessionRecap.test.ts',
  },
  {
    id: 'skipped-day-claims-work',
    bug: 'a skipped day reports the sets sitting on its log',
    file: 'src/engine/sessionRecap.ts',
    find: "  const logged = session && session.status !== 'skipped' ? session.exercises : []",
    to: '  const logged = session ? session.exercises : []',
    spec: 'src/engine/sessionRecap.test.ts',
  },
  {
    id: 'uneven-sets-collapsed',
    bug: 'a set that died reads as a clean 3 x 8',
    file: 'src/engine/sessionRecap.ts',
    find: '      : unique.length === 1',
    to: '      : unique.length >= 1',
    spec: 'src/engine/sessionRecap.test.ts',
  },
  {
    id: 'unplanned-work-dropped',
    bug: 'a substitution or self-added movement vanishes from the record',
    file: 'src/engine/sessionRecap.ts',
    find: '  for (const log of byId.values()) {',
    to: '  for (const log of new Map().values()) {',
    spec: 'src/engine/sessionRecap.test.ts',
  },
  {
    id: 'cooking-time-nonsense',
    bug: 'a meal claims more hands-on time than it takes in total',
    file: 'src/plan/cooking.ts',
    find: "  chili: C('stovetop', 15, 40, [",
    to: "  chili: C('stovetop', 45, 40, [",
    spec: 'src/plan/cooking.test.ts',
  },
  {
    id: 'method-mislabelled',
    bug: 'a meal that cooks something is labelled as no-cook',
    file: 'src/plan/cooking.ts',
    find: "  'rotisserie-plate': C('microwave', 6, 12, [",
    to: "  'rotisserie-plate': C('assembly', 6, 12, [",
    spec: 'src/plan/cooking.test.ts',
  },
  {
    id: 'quick-filter-uses-wall-clock',
    bug: 'a 40-minute chilli with 15 hands-on is hidden from somebody with 15 minutes',
    file: 'src/plan/cooking.ts',
    find: '  return ids.filter((id) => (COOKING[id]?.activeMin ?? Infinity) <= maxActiveMin)',
    to: '  return ids.filter((id) => (COOKING[id]?.totalMin ?? Infinity) <= maxActiveMin)',
    spec: 'src/plan/cooking.test.ts',
  },
  {
    id: 'no-cook-filter-lets-a-pan-through',
    bug: 'somebody with no hob is offered something that needs one',
    file: 'src/plan/cooking.ts',
    find: "    return c && (c.method === 'no-cook' || c.method === 'assembly')",
    to: "    return !!c",
    spec: 'src/plan/cooking.test.ts',
  },
  {
    id: 'substitution-dead-end',
    bug: 'a gym movement strands a bodyweight user with no fallback',
    file: 'src/plan/equip.ts',
    find: "  'hack-squat': ['leg-press', 'front-squat', 'goblet-squat', 'split-squat'],",
    to: "  'hack-squat': ['leg-press'],",
    spec: 'src/plan/equipCoverage.test.ts',
  },
  {
    id: 'allergy-filter-dropped',
    bug: 'a declared allergy reaches the onboarding screen and stops there, and the swap list offers it back',
    file: 'src/plan/mealAlts.ts',
    find: '  pool = allowedByLimits(pool, target.limits)',
    to: '  pool = allowedByLimits(pool, undefined)',
    spec: 'src/plan/foodLimits.test.ts',
  },
  {
    id: 'allergy-filter-runs-before-widening',
    bug: 'the thin-slot widening reaches back past the allergy filter and puts the allergen back',
    file: 'src/plan/mealAlts.ts',
    find: `  if (pool.length < count) pool = COMMON_MEALS.filter((m) => notSelf(m) && dietOk(m))
  pool = allowedByLimits(pool, target.limits)`,
    to: `  pool = allowedByLimits(pool, target.limits)
  if (pool.length < count) pool = COMMON_MEALS.filter((m) => notSelf(m) && dietOk(m))`,
    spec: 'src/plan/foodLimits.test.ts',
  },
  {
    id: 'allergy-never-reaches-the-plan',
    bug: 'the generator drops food limits on the floor, which is exactly how this shipped for months',
    file: 'src/plan/generator.ts',
    find: '    foodLimits: a.foodLimits,',
    to: '    foodLimits: undefined,',
    spec: 'src/plan/foodLimits.test.ts',
  },
  {
    id: 'unknown-allergy-word-ignored',
    bug: 'an allergy we have no family for is silently dropped instead of excluded on its own',
    file: 'src/plan/foodLimits.ts',
    find: '    out.add(term)',
    to: '    if (FAMILIES[term.replace(/\\s|-/g, \'\')]) out.add(term)',
    spec: 'src/plan/foodLimits.test.ts',
  },
  {
    id: 'em-dash-reaches-shipped-copy',
    bug: 'the tell that a machine wrote it goes back into the microphone note',
    file: 'src/screens/today/EarStatusNote.tsx',
    find: "\"Can't hear you. Something else is using the mic",
    to: "\"Can't hear you \u2014 something else is using the mic",
    spec: 'src/copy.test.ts',
  },
  {
    id: 'dash-guard-blinded-by-comments',
    bug: 'the comment stripper eats every line, so the dash guard passes by seeing nothing',
    file: 'src/copy.test.ts',
    find: "    if (opened || s.startsWith('*') || s.startsWith('/*') || s.startsWith('//') || s.startsWith('{/*')) return",
    to: '    if (true) return',
    spec: 'src/copy.test.ts',
  },
  {
    id: 'plate-too-big-handed-over-anyway',
    bug: 'a 20 lb lateral raise is handed a 25 percent jump because the range topped out',
    file: 'src/engine/reps.ts',
    find: '    return plateIsTooBig(log, exerciseId) && !toppedOutBefore(history, session, exerciseId, range)',
    to: '    return false && !toppedOutBefore(history, session, exerciseId, range)',
    spec: 'src/engine/increment.test.ts',
  },
  {
    id: 'light-lift-stalls-forever',
    bug: 'the hold never converts, so a light lift sits at the top of its range for good',
    file: 'src/engine/reps.ts',
    find: '    return plateIsTooBig(log, exerciseId) && !toppedOutBefore(history, session, exerciseId, range)',
    to: '    return plateIsTooBig(log, exerciseId)',
    spec: 'src/engine/increment.test.ts',
  },
  {
    id: 'increment-band-stalls-compounds',
    bug: 'novices on dumbbell presses stall, because a rack that climbs in fives is treated as a defect',
    file: 'src/engine/reps.ts',
    find: '  if (primary.length === 0 || !primary.every((r) => SMALL_MUSCLE.has(r))) return false',
    to: '  if (primary.length === 0) return false',
    spec: 'src/engine/increment.test.ts',
  },
  {
    id: 'hold-becomes-a-cut',
    bug: 'the held exposure resets to the bottom of the range at the same weight, which is less work for a cleared week',
    file: 'src/engine/reps.ts',
    find: '      ? { reps: range.high, wrapped: false, backOff: false, staleSteps: 0 }',
    to: '      ? { reps: range.low, wrapped: false, backOff: false, staleSteps: 0 }',
    spec: 'src/engine/increment.test.ts',
  },
  {
    id: 'sleep-cut-lands-twice',
    bug: 'the proposals screen offers a set off every lift on top of the third the resolver already took for two bad nights',
    file: 'src/engine/adapt.ts',
    find: '    alreadyCutForSleep: twoConsecutiveBadNightsBefore(data, dateISO),',
    to: '    alreadyCutForSleep: false,',
    spec: 'src/engine/adaptContext.test.ts',
  },
  {
    id: 'offers-ignore-what-the-athlete-said',
    bug: 'the offers route into movements the athlete has blocked and joints they have told us about',
    file: 'src/engine/adapt.ts',
    find: '    blocked: blockedIds(data.prefs),',
    to: '    blocked: undefined,',
    spec: 'src/engine/adaptContext.test.ts',
  },
  {
    id: 'allergy-fix-skips-the-stack',
    bug: 'a declared fish allergy is honoured for every meal and ignored for fish oil',
    file: 'src/plan/supplements.ts',
    find: "    return blockedBy({ name: r.name, ingredients: r.allergenTerms }, ctx.limits) === null",
    to: "    return true",
    spec: 'src/plan/supplements.test.ts',
  },
  {
    id: 'vegetarians-served-fish-oil',
    bug: 'the diet filter names vegans and means everybody, so vegetarians are handed fish oil and collagen',
    file: 'src/plan/supplements.ts',
    find: "    excludesDiet: ['vegetarian', 'vegan'],\n    allergenTerms: ['fish'],",
    to: "    excludesDiet: ['vegan'],\n    allergenTerms: ['fish'],",
    spec: 'src/plan/supplements.test.ts',
  },
  {
    id: 'magnesium-over-its-upper-limit',
    bug: 'the shipped dose asks for more supplemental magnesium than the published upper limit allows',
    file: 'src/plan/supplements.ts',
    find: "    dose: { low: 200, high: 350, unit: 'mg', upperLimit: 350, display: '200 to 350 mg' },",
    to: "    dose: { low: 200, high: 400, unit: 'mg', upperLimit: 350, display: '200 to 400 mg' },",
    spec: 'src/plan/supplements.test.ts',
  },
  {
    id: 'declared-injury-still-goes-nowhere',
    bug: 'the joint somebody typed in onboarding never reaches the engine, exactly as it shipped',
    file: 'src/plan/limitations.ts',
    find: '  return [{ label: picked, joints, since }]',
    to: '  return []',
    spec: 'src/plan/limitations.test.ts',
  },
  {
    id: 'their-own-words-thrown-away',
    bug: 'a free-text injury we cannot map to a joint is dropped instead of kept for the coach to say back',
    file: 'src/plan/limitations.ts',
    find: '    return [{ label, joints: jointsInText(label), since }]',
    to: '    return jointsInText(label).length ? [{ label, joints: jointsInText(label), since }] : []',
    spec: 'src/plan/limitations.test.ts',
  },
  {
    id: 'minimum-age-becomes-a-gate',
    bug: 'the age minimum stops being a sentence and starts being a wall, which is not what was asked for',
    file: 'src/screens/onboarding/MeStep.tsx',
    find: '  const ready = named && sex !== null && age !== null && heightIn !== null && weight !== null',
    to: '  const ready = named && sex !== null && age !== null && !tooYoung && heightIn !== null && weight !== null',
    spec: 'src/screens/onboarding/minAge.test.ts',
  },
  {
    id: 'minimum-age-told-to-everybody',
    bug: 'the age line renders for every athlete instead of only the one it is about',
    file: 'src/screens/onboarding/MeStep.tsx',
    find: '        {tooYoung && (',
    to: '        {age !== null && (',
    spec: 'src/screens/onboarding/minAge.test.ts',
  },
  {
    id: 'stack-written-in-again',
    bug: 'the plan decides three supplements for somebody instead of offering them, which is the one auto-apply in the app',
    file: 'src/plan/foods.ts',
    find: '    supplements: [],',
    to: '    supplements: offeredSupplements(dietStyle, limits).slice(0, 3),',
    spec: 'src/plan/supplements.test.ts',
  },
  {
    id: 'zinc-back-in-the-catalog',
    bug: 'an entry with no supportable claim and a copper-deficiency risk is offered again',
    file: 'src/plan/supplements.ts',
    find: "    id: 'zinc',\n    name: 'Zinc',\n    aisGroup: 'A',\n    evidenceTier: 'A',\n    appClass: 'never',",
    to: "    id: 'zinc',\n    name: 'Zinc',\n    aisGroup: 'A',\n    evidenceTier: 'A',\n    appClass: 'offer',",
    spec: 'src/plan/supplements.test.ts',
  },
  {
    id: 'invented-number-passes-as-evidence',
    bug: 'a record claims a better evidence tier than any source it cites',
    file: 'src/plan/nutrition.refs.ts',
    find: "    source_refs: [{ id: 'S10' }, { id: 'S16' }],\n    evidence_tier: 'B',",
    to: "    source_refs: [{ id: 'S10' }],\n    evidence_tier: 'A',",
    spec: 'src/plan/knowledge.test.ts',
  },
  {
    id: 'confidence-typed-by-hand',
    bug: 'confidence stops being derived, so a number can be given whatever certainty suits it',
    file: 'src/plan/nutrition.refs.ts',
    find: '  return { ...r, confidence: confidenceOf(r) }',
    to: '  return { ...r, confidence: 0.95 }',
    spec: 'src/plan/knowledge.test.ts',
  },
  {
    id: 'knowledge-module-unregistered',
    bug: 'a refs module exists on disk and no check can see it, which reads as coverage',
    file: 'src/plan/knowledgeRegistry.ts',
    find: 'export const KNOWLEDGE: ModuleRefs[] = [NUTRITION_REFS, BMR_REFS]',
    to: 'export const KNOWLEDGE: ModuleRefs[] = [{ ...NUTRITION_REFS, records: [] }]',
    spec: 'src/plan/knowledge.test.ts',
  },
  {
    id: 'capability-filter-never-applied',
    bug: 'a substitution hands somebody who cannot kneel a movement that requires kneeling',
    file: 'src/plan/movement.ts',
    find: '    if (blockedByCapability(otherId, m.pattern, q.cannot ?? [])) continue',
    to: '    if (false) continue',
    spec: 'src/plan/capability.test.ts',
  },
  {
    id: 'capability-narrows-by-default',
    bug: 'declaring nothing starts removing movements, so every athlete quietly loses options',
    file: 'src/plan/capability.ts',
    find: '  if (cannot.length === 0) return false',
    to: '  if (cannot.length === 0) return demandsOf(exerciseId, pattern).prone',
    spec: 'src/plan/capability.test.ts',
  },
  {
    id: 'kneeling-movement-forgets-it-kneels',
    bug: 'bird-dog stops declaring the knees it puts you on',
    file: 'src/plan/capability.ts',
    find: "  'bird-dog': { floorTransfer: true, kneeling: true },",
    to: "  'bird-dog': { floorTransfer: true },",
    spec: 'src/plan/capability.test.ts',
  },
  {
    id: 'cannot-kneel-means-nothing-again',
    bug: 'a declared limitation resolves to no constraint, which is the state R6 sat unusable in',
    file: 'src/plan/safetyRules.ts',
    find: "    id: 'cannot-kneel', blocks: ['kneeling'], avoid: [],",
    to: "    id: 'cannot-kneel', blocks: [], avoid: [],",
    spec: 'src/plan/safetyRules.test.ts',
  },
  {
    id: 'impact-caps-take-the-highest',
    bug: 'two limitations combine into the more permissive cap instead of the stricter one',
    file: 'src/plan/safetyRules.ts',
    find: 'impactCap: caps.length ? (Math.min(...caps) as 0 | 1 | 2 | 3) : undefined,',
    to: 'impactCap: caps.length ? (Math.max(...caps) as 0 | 1 | 2 | 3) : undefined,',
    spec: 'src/plan/safetyRules.test.ts',
  },
  {
    id: 'knee-keeps-the-joint-loses-the-depth',
    bug: 'a bad knee routes load away and the plan still asks for a full-depth squat',
    file: 'src/plan/safetyRules.ts',
    find: "    id: 'knee', blocks: ['deepKneeFlexion'], avoid: ['knee'], impactCap: 1,",
    to: "    id: 'knee', blocks: [], avoid: ['knee'], impactCap: 1,",
    spec: 'src/plan/safetyRules.test.ts',
  },
  {
    id: 'declared-joint-empties-the-pattern',
    bug: 'a declared bad knee removes every squat instead of narrowing to the gentle ones, which is how it shipped',
    file: 'src/plan/movement.ts',
    find: '    if (m.stress.some((j) => limited.has(j))) score -= 1000',
    to: '    if (false) score -= 1000',
    spec: 'src/plan/safetyRules.test.ts',
  },
  {
    id: 'limited-joint-outranked-by-a-role-match',
    bug: 'a movement loading the joint they told us about climbs back above one that does not',
    file: 'src/plan/movement.ts',
    find: '    if (m.stress.some((j) => limited.has(j))) score -= 1000',
    to: '    if (m.stress.some((j) => limited.has(j))) score -= 3',
    spec: 'src/plan/safetyRules.test.ts',
  },
  {
    id: "w9-dead-hang-goes-nowhere",
    bug: "an unloaded movement earned past its rung and the engine has nowhere to send it, which is how 40 of 47 shipped",
    file: "src/plan/movement.ts",
    find: "stress: ['shoulder'], progressions: ['towel-hang'] }",
    to: "stress: ['shoulder'] }",
    spec: "src/plan/ladders.test.ts",
  },
  {
    id: "w9-push-up-ladder-cut",
    bug: "a second chain removed, to prove the dead-end count is measured and not a spot check on one row",
    file: "src/plan/movement.ts",
    find: "regressions: ['push-up'], progressions: ['decline-push-up'] }",
    to: "regressions: ['push-up'] }",
    spec: "src/plan/ladders.test.ts",
  },
  {
    id: "w18-yoga-still-counts-as-the-weeks-cardio",
    bug: "the shipped bug: an unnamed activity carries conditioning, so a yoga class switches off the app's one mandatory health rule",
    file: "src/plan/cardio.ts",
    find: "{ id: 'custom', label: 'Custom', emoji: '✨', met: 4.0, asks: { minutes: true } }",
    to: "{ id: 'custom', label: 'Custom', emoji: '✨', conditioning: true, met: 6.0, asks: { minutes: true } }",
    spec: "src/plan/classes.test.ts",
  },
  {
    id: "w18-mat-class-flagged-to-silence-the-banner",
    bug: "the tempting fix: flag yoga as conditioning so the banner stops nagging, trading an awkward sentence for a broken rule",
    file: "src/plan/cardio.ts",
    find: "{ id: 'yoga', label: 'Yoga, slower', emoji: '🧘', met: 2.5, asks: { minutes: true } }",
    to: "{ id: 'yoga', label: 'Yoga, slower', emoji: '🧘', conditioning: true, met: 2.5, asks: { minutes: true } }",
    spec: "src/plan/classes.test.ts",
  },
  {
    id: "w18-mat-class-credited-with-distance",
    bug: "a Pilates class is credited with steps and distance across a room nobody left",
    file: "src/plan/cardio.ts",
    find: "pilates: { steps: false, distance: 'none' },",
    to: "pilates: { steps: true, distance: 'gps', stride: 0.415 },",
    spec: "src/plan/classes.test.ts",
  },
  {
    id: "w18-unnamed-activity-back-to-vigorous",
    bug: "the calorie estimate for an unnamed activity runs roughly double again, on no evidence at all",
    file: "src/plan/cardio.ts",
    find: "met: { low: 2.5, standard: 4.0, high: 7.0 },",
    to: "met: { low: 4.0, standard: 6.0, high: 8.0 },",
    spec: "src/plan/classes.test.ts",
  },
  {
    id: "w11-sport-answer-goes-dead-again",
    bug: "the sport is collected and the plan ignores it, which is how it shipped for the whole life of the app",
    file: "src/plan/sportPlan.ts",
    find: "  const best = pool.reduce((top, id) => (sportScore(id, sport) > sportScore(top, sport) ? id : top), pool[0])",
    to: "  const best = pool[0]",
    spec: "src/plan/sportWiring.test.ts",
  },
  {
    id: "w11-no-sport-gets-a-sport-anyway",
    bug: "an athlete who named no sport is handed the general athletic weights, so an answer nobody gave changes their plan",
    file: "src/plan/sportProfiles.ts",
    find: "  if (!sport) return NO_SPORT_PROFILE",
    to: "  if (!sport) return DEFAULT_SPORT_PROFILE",
    spec: "src/engine/goldenLife.test.ts",
  },
  {
    id: "w11-a-position-is-just-a-label",
    bug: "the position is asked, merged into nothing, and a keeper trains like a striker",
    file: "src/plan/sportProfiles.ts",
    find: "    weights: { ...base.weights, ...over.weights },",
    to: "    weights: { ...base.weights },",
    spec: "src/plan/sportWiring.test.ts",
  },
  {
    id: "w11-basketball-goes-back-to-generic",
    bug: "resolveDay's practice machinery stays switched off, as it was for everybody but the owner's own preset",
    file: "src/plan/generator.ts",
    find: "    sportMode: sportProfile.sportMode,",
    to: "    sportMode: 'generic',",
    spec: "src/plan/sportWiring.test.ts",
  },
  {
    id: "w11-unknown-sport-bluffs",
    bug: "the app stops admitting it has never heard of the sport and hands over a general plan with a confident face on it",
    file: "src/plan/sportPlan.ts",
    find: "      `I do not know ${sport}, so this is a general athletic base:",
    to: "      `Here is your ${sport} plan:",
    spec: "src/plan/sportWiring.test.ts",
  },
  {
    id: "w11-simulation-answers-a-ghost-question",
    bug: "a persona answers something no question offers, so the branch behind it is never simulated and the suite is green anyway",
    file: "scripts/personas.mjs",
    find: "'sprint-feel': 'It has been years'",
    to: "'sprint-feel': 'Smooth'",
    spec: "src/plan/personaSeeds.test.ts",
  },
  {
    id: "w10-a-movement-goes-quiet-again",
    bug: "a movement ships with nothing to say in the one line an athlete reads mid-set, which is how 65 of 194 shipped",
    file: "src/plan/cues.ts",
    find: "  'push-up': 'Push the floor away. One straight line from head to heels.',",
    to: "",
    spec: "src/plan/cues.test.ts",
  },
  {
    id: "w10-cue-outgrows-its-box",
    bug: "a cue runs past the two lines it renders in and gets cut off mid-sentence on a 390px screen",
    file: "src/plan/cues.ts",
    find: "  'push-up': 'Push the floor away. One straight line from head to heels.',",
    to: "  'push-up': 'Push the floor away and keep one perfectly straight line running from the head down to the heels on every single rep.',",
    spec: "src/plan/cues.test.ts",
  },
  {
    id: "w10-cue-tells-somebody-what-it-cannot-see",
    bug: "a cue diagnoses form the app has no camera to observe, which is the one thing R10 says it must never do",
    file: "src/plan/cues.ts",
    find: "  'push-up': 'Push the floor away. One straight line from head to heels.',",
    to: "  'push-up': 'Your hips are sagging. Push the floor away.',",
    spec: "src/plan/cues.test.ts",
  },
  {
    id: "w10-cue-the-voice-cannot-say",
    bug: "a cue keeps shorthand speakable does not expand, so the coach reads out erpee seven and thirty ess",
    file: "src/plan/cues.ts",
    find: "  'push-up': 'Push the floor away. One straight line from head to heels.',",
    to: "  'push-up': 'Push the floor away. Hold 30s at RPE7.',",
    spec: "src/plan/cues.test.ts",
  },
  {
    id: "w4m-a-macro-stops-adding-up",
    bug: "a meal carries a fat number that contradicts its own calorie number, and nothing notices because both are estimates",
    file: "src/plan/mealAlts.ts",
    find: "carbsG: 38, fatG: 30,",
    to: "carbsG: 38, fatG: 45,",
    spec: "src/plan/mealCoverage.test.ts",
  },
  {
    id: "w4m-two-meal-day-loses-its-slots",
    bug: "the two-meals-a-day split's own slot names fall through to null, so a late-night snack is offered as half the day's food",
    file: "src/plan/mealAlts.ts",
    find: "  if (s === 'meal 2') return 'dinner'",
    to: "",
    spec: "src/plan/mealCoverage.test.ts",
  },
  {
    id: "w4m-vegan-cliff-goes-unmeasured",
    bug: "the thin-pool count drifts and the corpus gap stops being a number anybody can see",
    file: "src/plan/mealAlts.ts",
    // Anchored on the tofu scramble's calories, because there are two
    // vegan breakfasts and this used to match both.
    find: "kcal: 400, slots: ['breakfast'], diet: 'vegan' }",
    to: "kcal: 400, slots: ['breakfast', 'lunch'], diet: 'vegan' }",
    spec: "src/plan/mealCoverage.test.ts",
  },
  {
    id: "w16-stack-freezes-the-dose-again",
    bug: "an app suggestion stores its dose as text, so every future correction reaches the catalog and nobody who already onboarded",
    file: "src/store/mealPlanSchema.ts",
    find: "    if (CATALOG_IDS.has(s.id)) return [{ id: s.id, source: 'app' }]",
    to: "    if (CATALOG_IDS.has(s.id)) return [{ id: s.id, source: 'app', dose: s.dose, name: s.name }]",
    spec: "src/store/supplementMigration.test.ts",
  },
  {
    id: "w16-zinc-stays-on-disk-forever",
    bug: "advice the app withdrew is left in stored plans, so it keeps telling people to take it",
    file: "src/store/mealPlanSchema.ts",
    find: "    if (RETRACTED.has(s.id)) return []",
    to: "",
    spec: "src/store/supplementMigration.test.ts",
  },
  {
    id: "w16-app-edits-somebody-elses-health-record",
    bug: "a supplement the athlete typed themselves is rewritten by the app instead of kept word for word",
    file: "src/store/mealPlanSchema.ts",
    find: "      name: s.name ?? s.id,",
    to: "      name: s.id,",
    spec: "src/store/supplementMigration.test.ts",
  },
  {
    id: "w16-migration-invents-a-date",
    bug: "a row that predates the field is stamped with today, which the rest of the app then reads as fact",
    file: "src/store/mealPlanSchema.ts",
    find: "    if (CATALOG_IDS.has(s.id)) return [{ id: s.id, source: 'app' }]",
    to: "    if (CATALOG_IDS.has(s.id)) return [{ id: s.id, source: 'app', addedAt: '2026-08-19' }]",
    spec: "src/store/supplementMigration.test.ts",
  },
  {
    id: "w16-a-minor-is-offered-supplements",
    bug: "the whole-person suppression stops applying, so an under-18 account is offered a shelf",
    file: "src/plan/supplements.ts",
    find: "  if (ctx.signals.some((sig) => HARD_STOP.includes(sig))) return []",
    to: "",
    spec: "src/plan/supplements.test.ts",
  },
  {
    id: "w16-a-never-row-reaches-the-shelf",
    bug: "the categories the app refuses to name become offerable again, fat burners included",
    file: "src/plan/supplements.ts",
    find: "    if (r.appClass === 'never') return false",
    to: "",
    spec: "src/plan/supplements.test.ts",
  },
  {
    id: "ront-alias-resolves-what-it-should-only-suggest",
    bug: "a below-threshold guess is written into somebody's week as if it were certain, which is the parsing version of the load spiral",
    file: "src/plan/aliases.ts",
    find: "  if (sure.length === 1) return { kind: 'resolved', id: sure[0].id, how: 'alias' }",
    to: "  if (hits.length >= 1) return { kind: 'resolved', id: hits[0].id, how: 'alias' }",
    spec: "src/plan/aliases.test.ts",
  },
  {
    id: "ront-parenthetical-thrown-away",
    bug: "the qualifier is discarded, so Turkish Get-Up (Lunge) and (Squat) become the same movement",
    file: "src/plan/aliases.ts",
    find: "    quals.push(inner.trim())",
    to: "    void inner",
    spec: "src/plan/aliases.test.ts",
  },
  {
    id: "ront-singularizer-stops-short",
    bug: "short plurals stop converging, so push ups and push up are two different movements",
    file: "src/plan/aliases.ts",
    find: "  if (t.length <= 2) return t",
    to: "  if (t.length <= 3) return t",
    spec: "src/plan/aliases.test.ts",
  },
  {
    id: "ront-alias-table-shadows-the-catalog",
    bug: "a row the catalog already answers goes unnoticed, which is a dead row that reads as coverage",
    file: "src/plan/aliases.ts",
    find: "  { key: 'press', id: 'leg-press', source: 'bodyt', confidence: 0.4 },",
    to: "  { key: 'press', id: 'leg-press', source: 'bodyt', confidence: 0.4 },\n  { key: 'goblet squat', id: 'goblet-squat', source: 'bodyt', confidence: 1 },",
    spec: "src/plan/aliases.test.ts",
  },
  {
    id: "deload-rewrites-somebody-elses-week",
    bug: "a routine the athlete built is halved on a calendar, which is not coaching, it is taking their week off them",
    file: "src/engine/resolveDay.ts",
    find: "    if (theirs) {",
    to: "    if (false) {",
    spec: "src/engine/deloadOwnership.test.ts",
  },
  {
    id: "deload-promised-and-not-delivered",
    bug: "the day says deload while the sets stay full, so the debrief promises an unload that never arrives",
    file: "src/engine/resolveDay.ts",
    find: "    isDeload: isDeload && !theirs,",
    to: "    isDeload,",
    spec: "src/engine/deloadOwnership.test.ts",
  },
  {
    id: "routine-notes-promise-an-automatic-deload",
    bug: "the honest-read screen tells an athlete their week is auto-deloaded when the engine no longer touches it",
    file: "src/plan/analyze.ts",
    find: "    id: 'deload-offer',",
    to: "    id: 'deload-auto',",
    spec: "src/plan/analyze.test.ts",
  },
  {
    id: "usermodel-speaks-on-one-data-point",
    bug: "the model states a weight trend from a single weigh-in, and nine engines downstream believe it",
    file: "src/engine/userModel.ts",
    find: "  if (points.length < 3) return null",
    to: "  if (points.length < 1) return null",
    spec: "src/engine/userModel.test.ts",
  },
  {
    id: "usermodel-confidence-stops-being-earned",
    bug: "every fact claims full confidence regardless of how little evidence sits behind it",
    file: "src/engine/userModel.ts",
    find: "  const evidence = Math.min(1, samples / FULL_EVIDENCE)",
    to: "  const evidence = 1",
    spec: "src/engine/userModel.test.ts",
  },
  {
    id: "usermodel-facts-never-go-stale",
    bug: "a fact from months ago is as trusted as one from this morning",
    file: "src/engine/userModel.ts",
    find: "  const freshness = age <= STALE_DAYS ? 1 : Math.max(0.3, 1 - (age - STALE_DAYS) / 60)",
    to: "  const freshness = 1",
    spec: "src/engine/userModel.test.ts",
  },
  {
    id: "usermodel-counts-work-nobody-did",
    bug: "sets that were never ticked count as training, so an opened-and-abandoned session reads as evidence",
    file: "src/engine/userModel.ts",
    find: "    const done = s.exercises.reduce((n, ex) => n + ex.sets.filter((x) => x.done).length, 0)",
    to: "    const done = s.exercises.reduce((n, ex) => n + ex.sets.length, 0)",
    spec: "src/engine/userModel.test.ts",
  },
  {
    id: "usermodel-creatine-caveat-lost",
    bug: "the water weight caveat disappears, and the calorie rule starts reading a scale it cannot trust",
    file: "src/engine/userModel.ts",
    find: "    (s) => s.source === 'app' && supplementRecord(s.id)?.confoundsWeightTrend,",
    to: "    () => false,",
    spec: "src/engine/userModel.test.ts",
  },
  {
    id: "kcal-bump-trusts-a-moving-scale",
    bug: "the calorie suggestion fires off a scale creatine is moving, telling somebody to eat more for water they just lost",
    file: "src/engine/stats.ts",
    // The guard moved off the trend's caveat, which evaporated whenever
    // the window held too few weigh-ins to produce a trend at all.
    find: "  if (trendIsConfounded(data)) return null",
    to: "  if (false) return null",
    spec: "src/engine/userModel.test.ts",
  },
  {
    id: "bmr-never-looks-at-the-tape",
    bug: "the body-composition model is written, sourced and never reached, so a measured athlete gets the anthropometric guess",
    file: "src/plan/bmr.ts",
    find: "  if (k.bodyFatPct !== undefined) {",
    to: "  if (false && k.bodyFatPct !== undefined) {",
    spec: "src/plan/bmr.test.ts",
  },
  {
    id: "bmr-ignores-age",
    bug: "a 55 year old and a 22 year old at the same weight and height are handed the same maintenance, which is the old heuristic's exact defect",
    file: "src/plan/bmr.ts",
    find: "export const MIFFLIN_PER_YEAR = -5",
    to: "export const MIFFLIN_PER_YEAR = 0",
    spec: "src/plan/bmr.test.ts",
  },
  {
    id: "bmr-keeps-a-stale-tape",
    bug: "a fat-free mass from a body the athlete no longer has, used confidently, which is worse than having no tape at all",
    file: "src/plan/bmr.ts",
    find: "  if (!(a.ageDays >= 0) || a.ageDays > FRESH_TAPE_DAYS) return false",
    to: "  if (!(a.ageDays >= 0)) return false",
    spec: "src/engine/userModel.test.ts",
  },
  {
    id: "bmr-follows-one-sloppy-reading",
    bug: "a single bad tape measurement moves the calorie target by a meal, because the newest reading wins instead of the median",
    file: "src/plan/bmr.ts",
    find: "  return sorted[Math.floor((sorted.length - 1) / 2)]",
    to: "  return recent[recent.length - 1]",
    spec: "src/engine/userModel.test.ts",
  },
  {
    id: "bmr-charges-a-session-gross",
    bug: "the resting energy under a workout is paid for twice, because the session is billed at its full MET instead of net",
    file: "src/plan/bmr.ts",
    find: "  return Math.round((MET_ANCHORS[activity] - 1) * toKg(bodyweightLb) * hours)",
    to: "  return Math.round(MET_ANCHORS[activity] * toKg(bodyweightLb) * hours)",
    spec: "src/plan/bmr.test.ts",
  },
  {
    id: "bmr-double-counts-a-sitting-day",
    bug: "the movement answer is charged once inside the activity multiplier and again as a flat 50 kcal, on the one goal that can least afford it",
    file: "src/plan/nutritionPlan.ts",
    find: "    if (ans['day-movement'] === 'Sitting' && maintenance.model === 'bodyweight') kcalTraining -= 50",
    to: "    if (ans['day-movement'] === 'Sitting') kcalTraining -= 50",
    spec: "src/plan/nutritionPlan.test.ts",
  },
  {
    id: "bmr-trusts-an-impossible-tape",
    bug: "a neck-bigger-than-waist tape error becomes a fat-free mass equal to bodyweight, and the wrong answer arrives wearing the good model's name",
    file: "src/plan/bmr.ts",
    find: "  if (!(bodyFatPct >= 3 && bodyFatPct <= 60)) return null",
    to: "  if (!(bodyFatPct >= -100 && bodyFatPct <= 200)) return null",
    spec: "src/plan/bmr.test.ts",
  },
  {
    id: "bmr-grants-a-lab-multiplier",
    bug: "an activity level that needs doubly-labelled water is handed out on the strength of a training log",
    file: "src/plan/bmr.ts",
    find: "  return Math.min(PAL_CEILING, Math.round((lo + (hi - lo) * at) * 1000) / 1000)",
    to: "  return Math.round((lo + (hi - lo) * at) * 1000) / 1000 + 1",
    spec: "src/plan/bmr.test.ts",
  },
  {
    id: "bmr-moves-a-number-nobody-informed",
    bug: "an athlete we know nothing new about has their calorie target quietly changed anyway",
    file: "src/plan/bmr.ts",
    find: "      kcal: heuristicKcal,",
    to: "      kcal: round50(heuristicKcal),",
    spec: "src/plan/nutritionPlan.test.ts",
  },
  {
    id: "adapt-choice-leaves-no-trace",
    bug: "an accepted volume cut is never followed up and a waved-away one returns tomorrow, because neither reaches the ledger",
    file: "src/logic/fatigueActions.ts",
    find: "    appendDecision(\n      d,\n      adaptDecision({",
    to: "    if (false) appendDecision(\n      d,\n      adaptDecision({",
    // Aimed at the WRITE PATH's own spec. It survived pointed at the
    // outcome spec, where every row is built by calling adaptDecision
    // directly and the action that writes them is never exercised.
    spec: "src/logic/fatigueActions.test.ts",
  },
  {
    id: "adapt-calls-a-half-fix-a-fix",
    bug: "one clean session out of three is recorded as the intervention working, which teaches the learning loop the opposite of what happened",
    file: "src/engine/outcomes.ts",
    find: "  if (done === inWindow.length) return { row, outcome: rate, verdict: 'worked' }",
    to: "  if (done > 0) return { row, outcome: rate, verdict: 'worked' }",
    spec: "src/engine/outcomes.test.ts",
  },
  {
    id: "verdict-shows-on-the-wrong-screen",
    bug: "the food screen announces that trimming the sets did the job, because judging is global and nothing scopes what each screen may say",
    file: "src/engine/outcomes.ts",
    find: "      (types === undefined || types.includes(d.type)) &&",
    to: "",
    spec: "src/engine/outcomes.test.ts",
  },
  {
    id: "adapt-judged-with-nobody-training",
    bug: "an intervention nobody trained after is graded on an empty window instead of being recorded as abandoned",
    file: "src/engine/outcomes.ts",
    find: "  if (inWindow.length === 0) return { row, outcome: Number.NaN, verdict: 'abandoned' }",
    to: "",
    spec: "src/engine/outcomes.test.ts",
  },
  {
    id: "app-argues-with-itself",
    bug: "one card says that change made things worse and go back, while the next proposes more of the same, on the same screen about the same number",
    file: "src/engine/calorieStep.ts",
    find: "  if (lastAttemptBackfired(data, STEP_TARGET, today)) return null",
    to: "",
    spec: "src/engine/outcomes.test.ts",
  },
  {
    id: "verdict-metric-id-drifts",
    bug: "a metric id changes and orphans every row written under the old one, so those interventions are never graded and never say why",
    // Moved to engine/proposals.ts when the outcomes/calorieStep cycle
    // was broken; the vocabulary now has one neutral home.
    file: "src/engine/proposals.ts",
    find: "export const STEP_METRIC = 'trendLbPerWeek'",
    to: "export const STEP_METRIC = 'trend'",
    spec: "src/engine/outcomes.test.ts",
  },
  {
    id: "verdict-cannot-say-no",
    bug: "every accepted change is recorded as having worked, which turns the ledger into a compliment generator and teaches the learning loop nothing",
    file: "src/engine/outcomes.ts",
    find: "  return { row, outcome: trend.value, verdict: Math.sign(moved) === wanted ? 'worked' : 'worse' }",
    to: "  return { row, outcome: trend.value, verdict: 'worked' }",
    spec: "src/engine/outcomes.test.ts",
  },
  {
    id: "verdict-credits-two-changes-at-once",
    bug: "one intervention takes the credit for a window in which something else also changed, so the ledger learns a false lesson",
    file: "src/engine/outcomes.ts",
    find: "  if (!isolated(data, row) || trendIsConfounded(data)) {",
    to: "  if (false) {",
    spec: "src/engine/outcomes.test.ts",
  },
  {
    id: "verdict-judged-before-its-window",
    bug: "a change is graded days after it was made, on a trend that cannot have responded yet",
    file: "src/engine/outcomes.ts",
    find: "      daysBetween(d.windowClosesAt, today) >= 0,",
    to: "      true,",
    spec: "src/engine/outcomes.test.ts",
  },
  {
    id: "verdict-outcome-chosen-after-the-fact",
    bug: "the baseline is read at judging time instead of the one registered when the offer was accepted, which is how a result becomes a story",
    file: "src/engine/calorieStep.ts",
    find: "    baseline: s.trendLbPerWeek,",
    to: "    baseline: 0,",
    // Aimed at where stepDecision LIVES. Pointed at the outcome spec it
    // survived: every test there builds its accepted rows by hand and
    // never goes through the offer site.
    spec: "src/engine/calorieStep.test.ts",
  },
  {
    id: "verdict-card-never-leaves",
    bug: "feedback about something that finished a month ago stays on screen as though it were news",
    file: "src/engine/outcomes.ts",
    find: "      daysBetween(d.windowClosesAt, today) <= VERDICT_VISIBLE_DAYS &&",
    to: "",
    spec: "src/engine/outcomes.test.ts",
  },
  {
    id: "stated-limitation-called-a-complaint",
    bug: "a joint the athlete told us about is described as one the app noticed complaining, which read as a flat contradiction next to the offer saying the same joint had been quiet for three sessions",
    file: "src/engine/adapt.ts",
    find: "          because: (ctx.limited ?? []).includes(joint)",
    to: "          because: false",
    spec: "src/engine/persistentPain.test.ts",
  },
  {
    id: "raise-fires-off-a-softened-week",
    bug: "a set is added off a fortnight of downgraded and light days, so the tolerance being claimed was never actually tested",
    file: "src/engine/ceiling.ts",
    find: "  if (windowWasSoftened(data, today)) return null",
    to: "",
    spec: "src/engine/ceiling.test.ts",
  },
  {
    id: "raise-without-effort-headroom",
    bug: "a set is added to somebody already working at the edge, which is the one athlete more volume is worst for",
    file: "src/engine/ceiling.ts",
    find: "export const RAISE_MIN_RIR = 2",
    to: "export const RAISE_MIN_RIR = 0",
    spec: "src/engine/ceiling.test.ts",
  },
  {
    id: "raise-off-absent-evidence",
    bug: "no reported effort at all is read as permission, when R3 s5.3 says absent evidence is not permission",
    file: "src/engine/ceiling.ts",
    find: "    if (reported.length < 2) continue",
    to: "",
    spec: "src/engine/ceiling.test.ts",
  },
  {
    id: "raise-ignores-the-goal",
    bug: "volume is chased for fat loss and for the explosive goals, which R3 s5.6 says outright not to do",
    file: "src/engine/ceiling.ts",
    find: "  if (!RAISE_GOALS.has(data.plan?.goal ?? '')) return null",
    to: "",
    spec: "src/engine/ceiling.test.ts",
  },
  {
    id: "raise-past-the-weekly-band",
    bug: "a per-session raise pushes the weekly total past the researched band, which R3 s5.5 guard 6 calls a hard outer wall",
    file: "src/engine/ceiling.ts",
    find: "export const WEEKLY_BAND_TOP = 20",
    to: "export const WEEKLY_BAND_TOP = 999",
    spec: "src/engine/ceiling.test.ts",
  },
  {
    id: "raise-gap-read-from-the-wrong-end",
    bug: "attendance measures the whole window as one gap, so the raise silently never fires and looks like a rule nobody qualifies for",
    file: "src/engine/ceiling.ts",
    find: "  let worst = daysBetween(kept[kept.length - 1].date, today)",
    to: "  let worst = daysBetween(kept[0].date, today)",
    spec: "src/engine/ceiling.test.ts",
  },
  {
    id: "ceiling-delta-never-applied",
    bug: "the athlete agrees to take a set off and the ceiling does not move, so the answer is recorded and the session is unchanged",
    file: "src/engine/volume.ts",
    find: "  const own = Math.max(2, base + (deltas[region] ?? 0))",
    to: "  const own = base",
    spec: "src/engine/ceiling.test.ts",
  },
  {
    id: "ceiling-drift-uncapped",
    bug: "a ceiling can wander any distance from the researched number, which is the load-spiral family with volume in place of load",
    file: "src/engine/ceiling.ts",
    find: "export const CEILING_MAX_DRIFT = 2",
    to: "export const CEILING_MAX_DRIFT = 99",
    spec: "src/engine/ceiling.test.ts",
  },
  {
    id: "ceiling-moves-twice-a-fortnight",
    bug: "two ceiling changes land inside a fortnight, so neither can be attributed and a squat set gets counted off twice for quads and again for glutes",
    file: "src/engine/ceiling.ts",
    find: "  return !!last && daysBetween(last.respondedAt ?? last.offeredAt, today) < CEILING_MIN_DAYS_BETWEEN",
    to: "  return false",
    spec: "src/engine/ceiling.test.ts",
  },
  {
    id: "ceiling-lowered-by-two",
    bug: "one signal takes two fractional sets off instead of one, which is exactly the step size R3 s5.4 says never to take",
    file: "src/engine/ceiling.ts",
    find: "    const step = d.evidence.direction === 'raise' ? 1 : -1",
    to: "    const step = d.evidence.direction === 'raise' ? 2 : -2",
    spec: "src/engine/ceiling.test.ts",
  },
  {
    id: "ceiling-focus-bonus-drifts-too",
    bug: "the personal offset lands on the focus bonus as well, so the muscle the day was built around drifts twice as fast as the rest",
    file: "src/engine/volume.ts",
    find: "  return focus?.has(region) ? own + FOCUS_BONUS : own",
    to: "  return focus?.has(region) ? own + FOCUS_BONUS + (deltas[region] ?? 0) : own",
    spec: "src/engine/ceiling.test.ts",
  },
  {
    id: "readiness-flags-never-questioned",
    bug: "a readiness downgrade that keeps being followed by a fine day never gets questioned, so somebody who sleeps badly most Mondays has an ordinary session cut every week forever",
    file: "src/engine/readiness.ts",
    find: "  return eased(data) ? EASED_FLAGS_TO_DOWNGRADE : READY_FLAGS_TO_DOWNGRADE",
    to: "  return READY_FLAGS_TO_DOWNGRADE",
    spec: "src/engine/readiness.test.ts",
  },
  {
    id: "readiness-easing-goes-too-far",
    bug: "the offer moves the bar two flags instead of one, so three of four real flags stops dialling anybody back",
    file: "src/engine/readiness.ts",
    find: "export const EASED_FLAGS_TO_DOWNGRADE = READY_FLAGS_TO_DOWNGRADE + 1",
    to: "export const EASED_FLAGS_TO_DOWNGRADE = READY_FLAGS_TO_DOWNGRADE + 2",
    spec: "src/engine/readiness.test.ts",
  },
  {
    id: "readiness-counts-a-rough-patch",
    bug: "a downgrade followed by another downgrade counts as a false alarm, so a genuinely bad fortnight is read as proof the flags are wrong",
    file: "src/engine/readiness.ts",
    find: "    if (!next || next.readiness?.downgraded) continue",
    to: "    if (!next) continue",
    spec: "src/engine/readiness.test.ts",
  },
  {
    id: "readiness-counts-an-abandoned-day",
    bug: "a dialled-back session nobody finished counts as evidence the dialling back was unnecessary, which is backwards",
    file: "src/engine/readiness.ts",
    find: "    if (!s.readiness?.downgraded || !done(s)) continue",
    to: "    if (!s.readiness?.downgraded) continue",
    spec: "src/engine/readiness.test.ts",
  },
  {
    id: "readiness-asks-after-one-good-day",
    bug: "one dialled-back day that went fine is enough to offer turning the flags down, which is a pattern rule reading a single session",
    file: "src/engine/readiness.ts",
    find: "export const DOWNGRADES_BEFORE_EASING = 4",
    to: "export const DOWNGRADES_BEFORE_EASING = 1",
    spec: "src/engine/readiness.test.ts",
  },
  {
    id: "limit-load-asks-on-the-wrong-day",
    bug: "the app offers knee weight back on a pressing day, so tapping it changes nothing on screen and reads as broken",
    file: "src/engine/limitLoad.ts",
    find: "      if (loadedToday && !loadedToday.has(joint)) continue",
    to: "",
    spec: "src/engine/limitLoad.test.ts",
  },
  {
    id: "limit-load-never-comes-back",
    bug: "a stated limitation stays at 85% forever however many pain-free months follow, which is the app routing around an injury that may have healed eighteen months ago and never once asking",
    file: "src/engine/limitLoad.ts",
    find: "      if (flared || clean < CLEAN_EXPOSURES_FOR_STEP) continue",
    to: "      if (true) continue",
    spec: "src/engine/limitLoad.test.ts",
  },
  {
    id: "limit-load-back-on-one-good-day",
    bug: "one pain-free session hands weight back on an injury the athlete told us about, which is the opposite of the caution a stated limitation is asking for",
    file: "src/engine/limitLoad.ts",
    find: "export const CLEAN_EXPOSURES_FOR_STEP = 3",
    to: "export const CLEAN_EXPOSURES_FOR_STEP = 1",
    spec: "src/engine/limitLoad.test.ts",
  },
  {
    id: "limit-load-ignores-a-flare",
    bug: "the joint hurts again and the weight stays up, so the app keeps loading an injury it just watched flare",
    file: "src/engine/limitLoad.ts",
    find: "  return sessionsUpTo(data, today).some((s) => s.date > from && painJoints(s).has(joint))",
    to: "  return false",
    spec: "src/engine/limitLoad.test.ts",
  },
  {
    id: "limit-load-takes-the-braver-joint",
    bug: "a movement loading a good elbow and a bad shoulder moves at the elbow's pace, so the injured joint gets weight it never earned",
    file: "src/engine/limitLoad.ts",
    find: "    least = Math.min(least, flaredSinceFirstStep(data, j, today) ? 0 : stepsTaken(data, j).length)",
    to: "    least = Math.max(least === Infinity ? 0 : least, stepsTaken(data, j).length)",
    spec: "src/engine/limitLoad.test.ts",
  },
  {
    id: "limit-load-counts-the-wrong-sessions",
    bug: "pressing sessions count as evidence a knee is fine, so three upper-body days buy weight back on a squat",
    file: "src/engine/limitLoad.ts",
    find: "          !e.skipped && (MOVEMENT[e.exerciseId]?.stress ?? []).includes(joint) && e.sets.some((x) => x.done),",
    to: "          !e.skipped && e.sets.some((x) => x.done),",
    spec: "src/engine/limitLoad.test.ts",
  },
  {
    id: "limit-load-buys-four-steps-at-once",
    bug: "every step counts from the limitation date instead of the last step, so one good month hands back the whole reduction in a week",
    file: "src/engine/limitLoad.ts",
    find: "      const from = steps.length ? (steps[steps.length - 1].respondedAt ?? steps[steps.length - 1].offeredAt) : lim.since",
    to: "      const from = lim.since",
    spec: "src/engine/limitLoad.test.ts",
  },
  {
    id: "flag-note-says-nothing",
    bug: "the load drops and the rep range restarts and the athlete is told nothing, which is the silence FatigueSuggestion.because was written to end and never did",
    file: "src/engine/fatigue.ts",
    find: "  const states = [...flagStates(data, today)].filter(([id]) => present.has(id))",
    to: "  const states = []",
    spec: "src/engine/stalled.test.ts",
  },
  {
    id: "flag-note-talks-about-another-day",
    bug: "today explains a movement that is not in today's session, so the athlete reads an apology for a lift they are not doing",
    file: "src/engine/fatigue.ts",
    find: "].filter(([id]) => present.has(id))",
    to: "]",
    spec: "src/engine/stalled.test.ts",
  },
  {
    id: "easing-note-dropped",
    bug: "a movement opening lighter says why only once it is already stalled, so the ordinary softening is still unexplained",
    file: "src/engine/fatigue.ts",
    find: "  if (easing.length) {",
    to: "  if (false) {",
    spec: "src/engine/stalled.test.ts",
  },
  {
    id: "stalled-lift-drops-its-back-off",
    bug: "restarting the range spends the load reduction instead of adding to it, so the lift going worst quietly stops getting its step down at the moment the app decides it is stuck",
    file: "src/engine/reps.ts",
    find: "  return { ...step, reps: range.low, wrapped: false }",
    to: "  return { reps: range.low, wrapped: false, backOff: false, staleSteps: 0 }",
    spec: "src/engine/stalled.test.ts",
  },
  {
    id: "stalled-lift-never-re-climbs",
    bug: "a movement six sessions into a softened prescription that is not working never restarts its range, so there is nothing to climb and the athlete grinds the same failing ask indefinitely",
    file: "src/engine/reps.ts",
    find: "  if (!stalledLifts(data, before).has(exerciseId)) return step",
    to: "  if (true) return step",
    spec: "src/engine/stalled.test.ts",
  },
  {
    id: "stall-threshold-unreachable",
    bug: "the six-exposure escalation can never fire, which is the silence R3 s9.2 asked for it to end",
    file: "src/engine/fatigue.ts",
    find: "export const EXPOSURES_BEFORE_STALLED = 6",
    to: "export const EXPOSURES_BEFORE_STALLED = 999",
    spec: "src/engine/stalled.test.ts",
  },
  {
    id: "stall-fires-on-the-first-bad-session",
    bug: "one session after a flag is enough to declare the lighter weight a failure, so nothing is ever given a chance to work",
    file: "src/engine/fatigue.ts",
    find: "export const EXPOSURES_BEFORE_STALLED = 6",
    to: "export const EXPOSURES_BEFORE_STALLED = 1",
    spec: "src/engine/stalled.test.ts",
  },
  {
    id: "stall-counts-the-day-it-was-flagged",
    bug: "the session that raised the flag is counted as one of the six chances the softened prescription gets, which is a whole extra session of an athlete grinding",
    file: "src/engine/fatigue.ts",
    find: "      w.sinceFlag = w.flagged ? (wasFlagged ? w.sinceFlag + 1 : 0) : 0",
    to: "      w.sinceFlag = w.flagged ? w.sinceFlag + 1 : 0",
    spec: "src/engine/stalled.test.ts",
  },
  {
    id: "stalled-advice-repeats-what-failed",
    bug: "the coach says \"two clean sessions in a row puts it back to normal\" for a seventh time, having already watched six go by without it",
    file: "src/engine/fatigue.ts",
    find: "      because: state.stalled",
    to: "      because: false",
    spec: "src/engine/stalled.test.ts",
  },
  {
    id: "failing-flag-never-comes-off",
    bug: "the only route off a softened prescription closes, so a movement stays reduced forever however many clean sessions the athlete strings together, and work they have plainly earned is never given back",
    file: "src/engine/fatigue.ts",
    find: "export const CLEAN_SESSIONS_TO_UNFLAG = 2",
    to: "export const CLEAN_SESSIONS_TO_UNFLAG = 99",
    spec: "src/engine/shortfall.test.ts",
  },
  {
    id: "failing-flag-forgives-one-good-day",
    bug: "a single clean session inside a bad month hands back full load, which is the flicker the hysteresis was written to stop",
    file: "src/engine/fatigue.ts",
    find: "export const CLEAN_SESSIONS_TO_UNFLAG = 2",
    to: "export const CLEAN_SESSIONS_TO_UNFLAG = 1",
    spec: "src/engine/shortfall.test.ts",
  },
  {
    id: "failing-flag-has-no-window",
    bug: "three bad sessions spread across a year read as a movement that is failing today, which is the all-history mistake the weight trend was carrying",
    file: "src/engine/fatigue.ts",
    find: "export const RECENT_DAYS = 21",
    to: "export const RECENT_DAYS = 999",
    spec: "src/engine/shortfall.test.ts",
  },
  {
    id: "physio-escalation-goes-silent",
    bug: "the two-week escalation is computed, the joints are marked stuck, and then nothing is said at all, which is worse than the deadline it replaced",
    file: "src/engine/adapt.ts",
    find: "  if (alsoStuck.length) {",
    to: "  if (false) {",
    spec: "src/engine/persistentPain.test.ts",
  },
  {
    id: "physio-card-names-one-joint-of-several",
    bug: "a pressing movement stresses the shoulder and the elbow, and the athlete is told about whichever the catalog happened to list first",
    file: "src/plan/words.ts",
    find: "  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`",
    to: "  return words[0]",
    spec: "src/engine/persistentPain.test.ts",
  },
  {
    id: "pain-deadline-never-arrives",
    bug: "the app promises a physio conversation in two weeks and never notices two weeks passing, so it repeats the same deadline at somebody in month three",
    file: "src/engine/signals.ts",
    find: "export const PAIN_PERSISTS_DAYS = 14",
    to: "export const PAIN_PERSISTS_DAYS = 999",
    spec: "src/engine/persistentPain.test.ts",
  },
  {
    id: "old-injury-reads-as-one-long-one",
    bug: "a flare last winter and a flare this morning read as ten months of continuous pain, so a good day gets somebody sent to a physio",
    file: "src/engine/signals.ts",
    find: "      if (daysBetween(dates[i], start) > COMPLAINT_GAP_DAYS) break",
    to: "      if (false) break",
    spec: "src/engine/persistentPain.test.ts",
  },
  {
    id: "healed-joint-still-a-physio-question",
    bug: "a joint that stopped hurting a month ago is still treated as an open complaint, so the plan keeps taking weight off something that is fine",
    file: "src/engine/signals.ts",
    find: "    if (daysBetween(newest, today) > COMPLAINT_GAP_DAYS) continue",
    to: "",
    spec: "src/engine/persistentPain.test.ts",
  },
  {
    id: "physio-escalation-keeps-swapping",
    bug: "a joint that hurt through two weeks of being routed around gets routed around again, which is the app offering an answer it already watched fail",
    file: "src/engine/adapt.ts",
    find: "      const sub = stuck.has(joint)\n        ? undefined\n        : substitutesFor(ex.exerciseId, { can: can(ctx.owned), avoid })[0]",
    to: "      const sub = substitutesFor(ex.exerciseId, { can: can(ctx.owned), avoid })[0]",
    spec: "src/engine/persistentPain.test.ts",
  },
  {
    id: "drop-load-never-escalates",
    bug: "a movement the app takes weight off every session because the athlete emptied the tank never reaches the failing flag, so the same too-heavy prescription comes back next time, forever",
    file: "src/engine/shortfall.ts",
    find: "  return log.sets.some((set) => cameUpShort(set) || emptiedTheTank(log, set))",
    to: "  return log.sets.some((set) => cameUpShort(set))",
    spec: "src/engine/shortfall.test.ts",
  },
  {
    id: "empty-tank-becomes-any-miss",
    bug: "reps left in reserve stops mattering, so missing the last rep on a comfortable set counts as the weight being wrong and three good days flag the movement",
    file: "src/engine/shortfall.ts",
    find: "    log.rir !== undefined &&\n    log.rir <= 0 &&",
    to: "    true &&",
    spec: "src/engine/shortfall.test.ts",
  },
  {
    id: "shortfall-bar-lowered-to-one",
    bug: "one rep under the ask counts as the load being wrong, which is most sets on most days and turns the flag into noise",
    file: "src/engine/shortfall.ts",
    find: "export const SHORTFALL_TO_ACT = 2",
    to: "export const SHORTFALL_TO_ACT = 1",
    spec: "src/engine/shortfall.test.ts",
  },
  {
    id: "adapt-rows-orphaned-by-a-rename",
    bug: "the stored spelling of an adaptation changes, so every row a real athlete already has is invisible to the build that reads them: never graded, never shown, never explained",
    file: "src/engine/proposals.ts",
    find: "export const ADAPT_TYPE = 'adapt'",
    to: "export const ADAPT_TYPE = 'adaptation'",
    spec: "src/engine/proposals.test.ts",
  },
  {
    id: "deload-rows-orphaned-by-a-rename",
    bug: "the same rename on the deload, which also breaks the dedupe: weeks already judged stop being recognised and get judged again",
    file: "src/engine/proposals.ts",
    find: "export const DELOAD_TYPE = 'deload'",
    to: "export const DELOAD_TYPE = 'deload-week'",
    spec: "src/engine/proposals.test.ts",
  },
  {
    id: "adapt-metric-orphaned-by-a-rename",
    bug: "the metric an adaptation was registered under drifts, so judgeAdapt looks for its own metric, finds nothing, and the intervention is never graded and never says why",
    file: "src/engine/proposals.ts",
    find: "export const ADAPT_METRIC = 'sessionGrade'",
    to: "export const ADAPT_METRIC = 'grade'",
    spec: "src/engine/proposals.test.ts",
  },
  {
    id: "deload-verdict-cannot-say-which-week",
    bug: "the follow-up says \"the deload week\" while the screen above it says DELOAD WEEK in lime, so an athlete standing in one reads a report on a week a month earlier as a report on today",
    file: "src/engine/deloadOutcome.ts",
    find: "      return `Three weeks on from your last deload, your lifts still have not come back. Worth watching.`",
    to: "      return `Your lifts still have not come back since the deload week. Worth watching.`",
    spec: "src/engine/deloadOutcome.test.ts",
  },
  {
    id: "deload-rebound-counts-noise",
    bug: "the same lift twice reads as a rebound, so every deload week is scored a success and the most expensive habit in the app is never questioned",
    file: "src/engine/deloadOutcome.ts",
    find: "export const REBOUND_LB = 2.5",
    to: "export const REBOUND_LB = 0",
    spec: "src/engine/deloadOutcome.test.ts",
  },
  {
    id: "deload-graded-with-nothing-to-grade",
    bug: "a week with no lifting either side is recorded as a finding rather than as missing data, which is how the ledger fills up with answers nobody measured",
    file: "src/engine/deloadOutcome.ts",
    find: "    if (before === null || after === null) verdict = 'abandoned'",
    to: "    if (before === null || after === null) verdict = 'no-change'",
    spec: "src/engine/deloadOutcome.test.ts",
  },
  {
    id: "deload-judges-a-routine-it-never-wrote",
    bug: "BodyT grades a deload inside somebody else's program, taking credit or blame for a week it did not schedule",
    file: "src/engine/deloadOutcome.ts",
    find: "  if (!phaseStart || isAthleteAuthored(data.plan)) return []",
    to: "  if (!phaseStart) return []",
    spec: "src/engine/deloadOutcome.test.ts",
  },
  {
    id: "deload-judged-before-the-rebound-could-land",
    bug: "the week is graded days after it ends, on sessions that cannot yet show whether anything recovered",
    file: "src/engine/deloadOutcome.ts",
    find: "    if (daysBetween(weekEnd, today) < DELOAD_WINDOW_DAYS) continue",
    to: "",
    spec: "src/engine/deloadOutcome.test.ts",
  },
  {
    id: "deload-judged-twice",
    bug: "the same week is re-judged every time the screen opens, so one deload becomes a pile of rows and the learning loop counts it repeatedly",
    file: "src/engine/deloadOutcome.ts",
    find: "    if (already.has(monday)) continue",
    to: "",
    spec: "src/engine/deloadOutcome.test.ts",
  },
  {
    id: "deload-baseline-eats-its-own-week",
    bug: "the deload week's own lighter sessions are counted as the before, which drops the baseline and flatters every deload",
    file: "src/engine/deloadOutcome.ts",
    find: "addDaysISO(monday, -DELOAD_WINDOW_DAYS), addDaysISO(monday, -1))",
    to: "addDaysISO(monday, -DELOAD_WINDOW_DAYS), addDaysISO(monday, 6))",
    spec: "src/engine/deloadOutcome.test.ts",
  },
  {
    id: "deload-rebound-starts-inside-the-deload",
    bug: "the after window opens on the deload week itself, so the week is measured against sessions it contains",
    file: "src/engine/deloadOutcome.ts",
    find: "    const after = bestE1rmBetween(data, addDaysISO(monday, 7), addDaysISO(monday, 6 + DELOAD_WINDOW_DAYS))",
    to: "    const after = bestE1rmBetween(data, monday, addDaysISO(monday, 6 + DELOAD_WINDOW_DAYS))",
    spec: "src/engine/deloadOutcome.test.ts",
  },
  {
    id: "deload-cannot-report-a-loss",
    bug: "lifts that never came back are filed as no-change, so the one verdict that should stop the next deload is unreachable",
    file: "src/engine/deloadOutcome.ts",
    find: "    else if (before - after >= REBOUND_LB) verdict = 'worse'",
    to: "    else if (false) verdict = 'worse'",
    spec: "src/engine/deloadOutcome.test.ts",
  },
  {
    id: "ledger-row-lies-about-its-rule",
    bug: "a row records the wrong rule version, so a decision made by an old rule is read as though a new one made it",
    file: "src/engine/proposals.ts",
    find: "export const STEP_RULE_VERSION = 1",
    to: "export const STEP_RULE_VERSION = 7",
    spec: "src/engine/calorieStep.test.ts",
  },
  {
    id: "recheck-answers-never-reach-the-ledger",
    bug: "one card of two writes to the ledger, so the learning loop can only ever evaluate half the offers it made",
    file: "src/engine/nutritionRecheck.ts",
    find: "export const RECHECK_RULE_VERSION = 1",
    to: "export const RECHECK_RULE_VERSION = 9",
    spec: "src/engine/nutritionRecheck.test.ts",
  },
  {
    id: "decline-leaves-no-trace",
    bug: "the same proposal comes back tomorrow off the same evidence, so the app cannot tell somebody who disagreed from somebody who never saw the card",
    file: "src/engine/decisions.ts",
    find: "  if (declines.length === 0) return { allowed: true, declines: 0 }",
    to: "  return { allowed: true, declines: declines.length }",
    spec: "src/engine/decisions.test.ts",
  },
  {
    id: "three-noes-still-get-nagged",
    bug: "a fourth ask after three refusals, which is nagging in any language",
    file: "src/engine/decisions.ts",
    find: "  if (declines.length >= DECLINES_BEFORE_BACKOFF) {",
    to: "  if (false) {",
    spec: "src/engine/decisions.test.ts",
  },
  {
    id: "worsening-evidence-cannot-get-through",
    bug: "a situation that genuinely got worse waits out the full cooldown in silence, which is the one case where re-asking is coaching",
    file: "src/engine/decisions.ts",
    find: "  if (evidence && evidenceStrengthened(last.evidence, evidence)) {",
    to: "  if (false) {",
    spec: "src/engine/decisions.test.ts",
  },
  {
    id: "materiality-misses-a-sign-flip",
    bug: "an athlete who was losing and is now gaining is treated as unchanged, because 0.6 is not twice 0.4",
    file: "src/engine/decisions.ts",
    find: "    if (Math.sign(v) !== Math.sign(was)) return true",
    to: "    if (false) return true",
    spec: "src/engine/decisions.test.ts",
  },
  {
    id: "zero-doubles-into-anything",
    bug: "every number clears zero times two, so a step size moving off its floor reads as material as a first twinge of pain",
    file: "src/engine/decisions.ts",
    find: "    if (was === 0) return v !== 0 // something started\n    if (v === 0) continue // something stopped: better, and not a reason to re-ask",
    to: "",
    spec: "src/engine/decisions.test.ts",
  },
  {
    id: "step-asks-again-tomorrow",
    bug: "the calorie step ignores the ledger and re-offers a declined change the next day",
    file: "src/engine/calorieStep.ts",
    find: "  if (!policy.allowed) return null",
    to: "",
    spec: "src/engine/calorieStep.test.ts",
  },
  {
    id: "learned-maintenance-trusts-the-food-log",
    bug: "a self-reported food log fully replaces two validated equations, and self-reporting runs light",
    file: "src/engine/maintenanceLearned.ts",
    find: "export const MAX_MEASUREMENT_TRUST = 0.5",
    to: "export const MAX_MEASUREMENT_TRUST = 1",
    spec: "src/engine/maintenanceLearned.test.ts",
  },
  {
    id: "learned-maintenance-swallows-a-bad-log",
    bug: "900 logged calories a day at stable weight is taken as a real maintenance instead of a log that is missing meals",
    file: "src/engine/maintenanceLearned.ts",
    find: "  if (Math.abs(measuredKcal - modeledKcal) / modeledKcal > SANITY_BAND) return null",
    to: "  if (false) return null",
    spec: "src/engine/maintenanceLearned.test.ts",
  },
  {
    id: "learned-maintenance-runs-on-a-half-log",
    bug: "the mean of the days somebody remembered to log is passed off as what they eat",
    file: "src/engine/maintenanceLearned.ts",
    find: "  if (logged / WINDOW_DAYS < MIN_LOGGED_FRACTION) return null",
    to: "  if (logged === 0) return null",
    spec: "src/engine/maintenanceLearned.test.ts",
  },
  {
    id: "learned-maintenance-ignores-creatine",
    bug: "creatine water reads as energy balance and rewrites what the body is assumed to cost",
    file: "src/engine/maintenanceLearned.ts",
    find: "  if (trendIsConfounded(data)) return null\n  if (!trend || trend.samples < MIN_WEIGH_INS) return null",
    to: "  if (!trend || trend.samples < MIN_WEIGH_INS) return null",
    spec: "src/engine/maintenanceLearned.test.ts",
  },
  {
    id: "trend-forgets-its-window",
    bug: "a trend is regressed over every weigh-in ever recorded, so somebody flat for a month reads as still losing and the plateau rule never fires",
    file: "src/engine/userModel.ts",
    find: "      return typeof m.weightLb === 'number' && age >= 0 && age < windowDays",
    to: "      return typeof m.weightLb === 'number' && age >= 0",
    spec: "src/engine/userModel.test.ts",
  },
  {
    id: "learned-maintenance-mismatched-windows",
    bug: "a month of food is set against a trend covering a different stretch of somebody's life, and the subtraction between them means nothing",
    file: "src/engine/maintenanceLearned.ts",
    find: "const WINDOW_DAYS = TREND_WINDOW_DAYS",
    to: "const WINDOW_DAYS = 90",
    spec: "src/engine/maintenanceLearned.test.ts",
  },
  {
    id: "step-argues-with-the-recomp-signal",
    bug: "one screen tells the same athlete to add 150 kcal and to take 250 away, because a flat scale with strength climbing is read as a stalled cut",
    file: "src/engine/calorieStep.ts",
    find: "  if (kcalBumpSuggestion(data)) return null",
    to: "  if (false) return null",
    spec: "src/engine/calorieStep.test.ts",
  },
  {
    id: "trend-is-two-points-again",
    bug: "one heavy morning at either end of the window rewrites the week, and a calorie suggestion rides on it",
    file: "src/engine/userModel.ts",
    find: "  const cov = xs.reduce((acc, x, i) => acc + (x - mx) * (ys[i] - my), 0)\n  const perWeek = Math.round((cov / varX) * 7 * 100) / 100",
    to: "  const perWeek = Math.round((((last.weightLb as number) - (ys[0])) / Math.max(1, xs[xs.length - 1])) * 7 * 100) / 100",
    spec: "src/engine/userModel.test.ts",
  },
  {
    id: "step-uses-the-whole-static-correction",
    bug: "the full 3,500-per-pound correction is applied, which the pack itself says overshoots by more than half at any real horizon",
    file: "src/engine/calorieStep.ts",
    find: "export const STEP_FRACTION = 0.5",
    to: "export const STEP_FRACTION = 1",
    spec: "src/engine/calorieStep.test.ts",
  },
  {
    id: "step-adjusts-on-noise",
    bug: "the calorie target moves on a fortnight of water weight, which is the one thing the rule is explicitly told never to do",
    file: "src/engine/calorieStep.ts",
    find: "const MIN_DAYS_OF_TREND = 14",
    to: "const MIN_DAYS_OF_TREND = 0",
    spec: "src/engine/calorieStep.test.ts",
  },
  {
    id: "step-trusts-a-confounded-scale",
    bug: "creatine water reads as a stalled cut and the app takes food away for it",
    file: "src/engine/calorieStep.ts",
    find: "  if (trendIsConfounded(data)) return null\n  if (!trend || trend.samples < MIN_WEIGH_INS) return null",
    to: "  if (!trend || trend.samples < MIN_WEIGH_INS) return null",
    spec: "src/engine/calorieStep.test.ts",
  },
  {
    id: "step-breaks-the-floor",
    bug: "an athlete already at the bottom is told to eat less again, when the thing that should move is the pace",
    file: "src/engine/calorieStep.ts",
    find: "  const floor = Math.max(MIN_KCAL_TRAINING, Math.round(maintenance * (1 - MAX_DEFICIT)))",
    to: "  const floor = 0",
    spec: "src/engine/calorieStep.test.ts",
  },
  {
    id: "fibre-floor-stops-scaling",
    bug: "a 1,600 kcal cut is handed the fibre target of a 2,700 kcal day, a number built for a different amount of food",
    file: "src/plan/sportsNutrition.ts",
    find: "  return Math.round((kcal / 1000) * FIBER_G_PER_1000_KCAL)",
    to: "  return 38",
    spec: "src/plan/sportsNutrition.test.ts",
  },
  {
    id: "ea-check-never-fires",
    bug: "an athlete eating 1,400 while training six times a week and running thirty km is told nothing, because every floor she clears is an absolute one",
    file: "src/engine/energyAvailability.ts",
    find: "  if (ea >= EA_LOW) return null",
    to: "  if (ea >= 0) return null",
    spec: "src/engine/energyAvailability.test.ts",
  },
  {
    id: "ea-borrows-certainty-it-lacks",
    bug: "the female-derived line is reported to men as a finding rather than a caution, which is certainty the evidence does not have",
    file: "src/engine/energyAvailability.ts",
    find: "    level: data.profile?.bfFormula === 'female' ? 'low' : 'caution',",
    to: "    level: 'low',",
    spec: "src/engine/energyAvailability.test.ts",
  },
  {
    id: "ea-prices-unlogged-cardio-at-zero",
    bug: "a cardio session saved without a calorie estimate makes training look free, which inflates energy availability and hides the warning",
    file: "src/engine/energyAvailability.ts",
    find: "  if (!(s.minutes > 0)) return 0",
    to: "  return 0",
    spec: "src/engine/energyAvailability.test.ts",
  },
  {
    id: "ea-double-counts-a-tracked-run",
    bug: "every GPS run counts twice, once as a route and once as its mirrored cardio entry, overstating what training cost",
    file: "src/engine/energyAvailability.ts",
    find: "  const cardio = loggedSessions(data, { from: addDaysISO(today, -(WINDOW_DAYS - 1)), to: today })",
    to: "  const cardio = [...loggedSessions(data, { from: addDaysISO(today, -(WINDOW_DAYS - 1)), to: today }), ...data.runs.map((r) => ({ activityId: r.activity, minutes: Math.round(r.durationSec / 60), kcal: r.kcalEst }))]",
    spec: "src/engine/energyAvailability.test.ts",
  },
  {
    id: "rest-day-drop-is-flat-again",
    bug: "a 54 kg woman is dropped 300 kcal on a rest day, roughly double what her session actually cost, which makes rest punitive",
    file: "src/plan/bmr.ts",
    find: "  return Math.max(REST_SWING_MIN, Math.min(REST_SWING_MAX, sessionKcal(bodyweightLb, hours)))",
    to: "  return 300",
    spec: "src/plan/kcalFloor.test.ts",
  },
  {
    id: "rest-day-swing-unbounded",
    bug: "a heavy athlete on a long session has their rest day cut by more than any evidence supports",
    file: "src/plan/bmr.ts",
    find: "  return Math.max(REST_SWING_MIN, Math.min(REST_SWING_MAX, sessionKcal(bodyweightLb, hours)))",
    to: "  return sessionKcal(bodyweightLb, hours)",
    spec: "src/plan/kcalFloor.test.ts",
  },
  {
    id: "rest-day-floor-clamp-deleted",
    bug: "a 1,100 kcal rest target ships, which is the exact bug plan/kcalFloor.ts was written to stop",
    file: "src/plan/kcalFloor.ts",
    find: "    kcalRest: Math.max(training - restDrop, MIN_KCAL_REST),",
    to: "    kcalRest: training - restDrop,",
    spec: "src/plan/kcalFloor.test.ts",
  },
  {
    id: "recheck-ignores-the-tape",
    bug: "the body-composition model still cannot reach the calorie target, because the recheck does not read the tape either",
    file: "src/engine/nutritionRecheck.ts",
    // Moved into nutritionInputsNow when the step rule needed the same
    // inputs. Mutating it there now covers both engines, not one.
    find: "    bodyFatPct: readUserModel(data, today).bodyFatPct?.value,",
    to: "    bodyFatPct: undefined,",
    spec: "src/engine/nutritionRecheck.test.ts",
  },
  {
    id: "recheck-nags-about-rounding",
    bug: "the app offers to change your calories over a rounding step, which is how a real suggestion gets ignored",
    file: "src/engine/nutritionRecheck.ts",
    find: "export const MEANINGFUL_KCAL = 100",
    to: "export const MEANINGFUL_KCAL = 0",
    spec: "src/engine/nutritionRecheck.test.ts",
  },
  {
    id: "recheck-argues-with-a-human",
    bug: "a target a person typed themselves gets second-guessed, which is the deload mistake with a different number",
    file: "src/engine/nutritionRecheck.ts",
    find: "  const basis = plan?.nutritionBasis",
    to: "  const basis = plan?.nutritionBasis ?? { bodyweightLb: 175, model: 'bodyweight' as const }",
    spec: "src/engine/nutritionRecheck.test.ts",
  },
  {
    id: "recheck-counts-planned-not-completed",
    bug: "the appetite of a six-day week handed to somebody training once, because the plan is read instead of the log",
    file: "src/engine/nutritionRecheck.ts",
    find: "    sessionsPerWeek: shape ? Math.round(shape.samples / (ADHERENCE_WINDOW_DAYS / 7)) : undefined,",
    to: "    sessionsPerWeek: data.plan?.daysPerWeek,",
    spec: "src/engine/nutritionRecheck.test.ts",
  },
  {
    id: "recheck-never-settles",
    bug: "the same suggestion is offered again the moment it is accepted, which trains people to ignore the card",
    file: "src/engine/nutritionRecheck.ts",
    find: "  return r ? { nutrition: r.suggested, nutritionBasis: r.basis } : null",
    to: "  return r ? { nutrition: r.suggested, nutritionBasis: data.plan.nutritionBasis! } : null",
    spec: "src/engine/nutritionRecheck.test.ts",
  },
  {
    id: "recheck-mutes-a-typed-target",
    bug: "a target somebody typed at 200 lb is never mentioned again, so it is still their advice at 170",
    file: "src/engine/nutritionRecheck.ts",
    find: "    athleteSet: asBuilt.kcalTraining !== current.kcalTraining,",
    to: "    athleteSet: false,",
    spec: "src/engine/nutritionRecheck.test.ts",
  },
  {
    id: "recheck-credits-the-wrong-cause",
    bug: "a change the scale made gets explained as a tape reading, which is a coach visibly guessing",
    file: "src/engine/nutritionRecheck.ts",
    find: "const REAL_BF_CHANGE_PCT = 1.5",
    to: "const REAL_BF_CHANGE_PCT = 0",
    spec: "src/engine/nutritionRecheck.test.ts",
  },
  {
    id: "recheck-explains-nothing",
    bug: "a number changes with no reason attached, which reads as the algorithm twitching rather than a consequence",
    file: "src/engine/nutritionRecheck.ts",
    find: "  if (learned.includes('weight')) parts.push('the scale has moved')",
    to: "  if (false) parts.push('the scale has moved')",
    spec: "src/engine/nutritionRecheck.test.ts",
  },
]

const E2E_MUTATIONS = [
  {
    id: 'ceiling-change-never-reaches-the-day',
    bug: 'the ledger carries the ceiling change and resolveDay never reads it, so the session the athlete agreed to change is identical',
    file: 'src/engine/resolveDay.ts',
    find: 'trimToFit(exercises, 0, data.prefs.sessionMinutes, ceilingDeltas(data))',
    to: 'trimToFit(exercises, 0, data.prefs.sessionMinutes, ceilingDeltas(data) && {})',
    spec: 'e2e/adapt.spec.ts',
  },
  {
    id: 'two-offers-stacked-on-one-screen',
    bug: 'a verdict, two offers and a proposal stack on top of two banners, which is a wall of apology rather than a coach',
    file: 'src/screens/today/AdaptProposals.tsx',
    find: '  const early = ceil || limit ? null : earlyRaw',
    to: '  const early = earlyRaw',
    spec: 'e2e/adapt.spec.ts',
  },
  {
    id: 'load-back-offered-on-a-swapped-away-joint',
    bug: 'weight back is offered on a joint whose movements were all swapped out, so tapping it changes nothing on screen',
    file: 'src/screens/today/AdaptProposals.tsx',
    find: '      resolved.exercises.filter((e) => e.lightMode).flatMap((e) => MOVEMENT[e.exerciseId]?.stress ?? []),',
    to: '      resolved.exercises.flatMap((e) => MOVEMENT[e.exerciseId]?.stress ?? []),',
    spec: 'e2e/adapt.spec.ts',
  },
  {
    id: 'readiness-sheet-keeps-its-own-threshold',
    bug: 'the sheet says "the day downgrades" while sessionStart runs the full session, so the screen and the engine disagree in front of the athlete',
    file: 'src/screens/today/ReadinessSheet.tsx',
    find: '  const bar = downgradeThreshold(useAppStore((st) => st.data))',
    to: '  const bar = Math.min(2, downgradeThreshold(useAppStore((st) => st.data)))',
    spec: 'e2e/readiness.spec.ts',
  },
  {
    id: 'readiness-threshold-ignored-at-the-door',
    bug: 'the athlete says only dial back when it is really bad and the session start ignores it, so the answer is recorded and changes nothing',
    file: 'src/logic/sessionStart.ts',
    find: '    (readinessFlags?.filter(Boolean).length ?? 0) >= downgradeThreshold(data) ||',
    to: '    (readinessFlags?.filter(Boolean).length ?? 0) >= Math.min(2, downgradeThreshold(data)) ||',
    spec: 'e2e/readiness.spec.ts',
  },
  {
    id: 'limit-load-offer-never-renders',
    bug: 'the offer is computed and the component bails before rendering it, so a joint that earned its weight back is never asked and the engine talks to nobody',
    file: 'src/screens/today/AdaptProposals.tsx',
    find: '  if (!offering && !verdictLine && !limit && !early && !ceil) return null',
    to: '  if (!offering && !verdictLine && !early && !ceil) return null',
    spec: 'e2e/adapt.spec.ts',
  },
  {
    id: 'flag-note-never-reaches-the-day',
    bug: 'the note is built and never put on the day, so the engine explains itself to nobody',
    file: 'src/engine/resolveDay.ts',
    find: 'flagNotes(data, dateISO, new Set(exercises.map((e) => e.exerciseId)))',
    to: 'flagNotes(data, dateISO, new Set<string>())',
    spec: 'e2e/adapt.spec.ts',
  },
  {
    id: 'dismiss-dies-while-a-verdict-is-up',
    bug: 'the ✕ silently stops working for the week after every verdict, so the offers the athlete just waved away stay exactly where they were under a button that looks broken',
    file: 'src/screens/today/AdaptProposals.tsx',
    find: '      {offering && (',
    to: '      {true && (',
    spec: 'e2e/adapt.spec.ts',
  },
  {
    id: 'settings-self-closes',
    bug: 'opening Account throws you out of Settings to the Coach screen',
    file: 'src/screens/coach/CoachScreen.tsx',
    find: '    setSettingsOpen(false)\n    setBackToSettings(true)',
    to: '    setSettingsOpen(false)\n    setBackToSettings(false)',
    spec: 'e2e/settings.spec.ts',
  },
  {
    id: 'dialog-role-removed',
    bug: 'screen readers see an anonymous pile of divs again',
    file: 'src/components/Sheet.tsx',
    find: '        role="dialog"\n        aria-modal="true"',
    to: '        data-was-dialog="1"',
    spec: 'e2e/sheet.spec.ts',
  },
  {
    id: 'escape-removed',
    bug: 'a sheet is a keyboard dead end again',
    file: 'src/components/Sheet.tsx',
    find: "      if (e.key === 'Escape' && !lockedRef.current) {",
    to: "      if (false && e.key === 'Escape' && !lockedRef.current) {",
    spec: 'e2e/sheet.spec.ts',
  },
  {
    id: 'adaptation-never-runs',
    bug: 'the adaptation engine exists and nothing it decides ever lands',
    file: 'src/engine/adapt.ts',
    find: '  if (automatic.length > 0) {\n    out = applyAutomatic(out, automatic, nameOf)',
    to: '  if (automatic.length < 0) {\n    out = applyAutomatic(out, automatic, nameOf)',
    spec: 'e2e/adapt.spec.ts',
  },
  {
    id: 'proposals-never-render',
    bug: 'the proposal card is computed and never shown',
    file: 'src/screens/today/AdaptProposals.tsx',
    find: '  const offering = !waved && proposals.length > 0 && !(session?.startedAt && !session.endedAt)',
    to: '  const offering = !waved && proposals.length < 0 && !(session?.startedAt && !session.endedAt)',
    spec: 'e2e/adapt.spec.ts',
  },
  {
    id: 'week-sheet-hides-what-happened',
    bug: 'the day sheet goes back to being a schedule',
    file: 'src/engine/sessionRecap.ts',
    find: '    trained: out.some((r) => r.actual !== null) || cardio.length > 0,',
    to: '    trained: false,',
    spec: 'e2e/week.spec.ts',
  },
  {
    id: 'week-sheet-drops-cardio',
    bug: "the day's cardio disappears from its own record",
    file: 'src/screens/week/WeekScreen.tsx',
    find: '            {recap && recap.cardio.length > 0 && (',
    to: '            {recap && recap.cardio.length < 0 && (',
    spec: 'e2e/week.spec.ts',
  },
  {
    id: 'focus-stays-behind',
    bug: 'focus stays on the button underneath the sheet',
    file: 'src/components/Sheet.tsx',
    find: '    const raf = requestAnimationFrame(() => sheetRef.current?.focus())',
    to: '    const raf = requestAnimationFrame(() => {})',
    spec: 'e2e/sheet.spec.ts',
  },
  {
    id: "w17-byor-athlete-cannot-say-what-hurts",
    bug: "a routine brought from home commits with no limitations, so every joint the athlete declared is thrown away",
    file: "src/screens/onboarding/Onboarding.tsx",
    find: "      d.prefs.limitations = limitationsFrom(answers.goalAnswers, start)",
    to: "      d.prefs.limitations = limitationsFrom(mode === 'byor' ? {} : answers.goalAnswers, start)",
    spec: "e2e/booklet.spec.ts",
  },
  {
    id: "ront-picker-goes-back-to-substrings",
    bug: "a one-letter plural hides a movement that is right there, and the athlete is told nothing matches",
    file: "src/screens/booklet/ExercisePicker.tsx",
    find: "        .filter((id) => EXERCISES[id] && all.includes(id))",
    to: "        .filter((id) => EXERCISES[id] && all.includes(id) && false)",
    spec: "e2e/booklet.spec.ts",
  },
]

/**
 * Every file this run has mutated but not yet put back.
 *
 * The finally block below restores after each mutation, and a finally
 * block does not run when the process is KILLED. An interrupted run left
 * live poison sitting in source files, which then read as ordinary
 * uncommitted work and very nearly got committed twice.
 *
 * Three layers, because no single one is enough:
 *
 *   the finally, for the normal path;
 *   signal handlers, for Ctrl-C and an orderly terminate;
 *   assertClean at startup plus `--restore`, for SIGKILL, which cannot
 *   be trapped by anything and WILL happen (a worker restart is one).
 *
 * The last layer is the one that actually saves you. Everything this
 * touches is committed, so `--restore` is just git, and the guard means
 * a poisoned tree stops the next run dead instead of compounding.
 */
const dirty = new Map()

function restoreAll() {
  for (const [path, original] of dirty) writeFileSync(path, original)
  dirty.clear()
}

for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => {
    restoreAll()
    console.error(`\n[poison] interrupted (${sig}); every mutated file restored.`)
    process.exit(130)
  })
}
process.on('uncaughtException', (e) => {
  restoreAll()
  console.error('[poison] crashed; every mutated file restored.\n', e)
  process.exit(1)
})

/**
 * Put every target file back, whatever state it is in.
 *
 * The escape hatch for a run that was SIGKILLed. Safe because every file
 * in the mutation list is committed by definition: a mutation needs a
 * known anchor to find.
 */
function restoreFromGit(targets) {
  const files = [...new Set(targets)].join(' ')
  execSync(`git checkout HEAD -- ${files}`, { cwd: ROOT, stdio: 'pipe' })
  console.log(`[poison] restored ${new Set(targets).size} file(s) from HEAD.`)
}

/** Refuse to start on a tree that already has edits in a target file. */
function assertClean(targets) {
  const out = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' })
  const modified = new Set(
    out.split('\n').map((l) => l.slice(3).trim()).filter(Boolean),
  )
  const clash = [...new Set(targets)].filter((t) => modified.has(t))
  if (clash.length) {
    console.error(
      '[poison] refusing to run: these files are already modified, so a restore\n' +
        '         would silently discard real work. Commit or stash first,\n' +
        '         or if a previous run was killed mid-mutation:\n' +
        '           node scripts/poison.mjs --restore\n' +
        clash.map((c) => `           ${c}`).join('\n'),
    )
    process.exit(2)
  }
}

function run(cmd) {
  try {
    execSync(cmd, { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' })
    return true
  } catch {
    return false
  }
}

function check(m, isE2e) {
  const path = `${ROOT}/${m.file}`
  const original = readFileSync(path, 'utf8')
  if (!original.includes(m.find)) {
    return { id: m.id, bug: m.bug, result: 'ANCHOR MISSING', ok: false }
  }
  dirty.set(path, original)
  writeFileSync(path, original.replace(m.find, m.to))
  let caught
  try {
    if (isE2e) {
      // A mutation that does not COMPILE leaves the previous dist in
      // place, and Playwright then tests the un-mutated build and passes.
      // That reads as SURVIVED, which is a false alarm pointing at a test
      // that is actually fine. This is the same stale-build trap that
      // once made a whole e2e suite pass against code it had never run.
      if (!run('npm run build')) return { id: m.id, bug: m.bug, result: 'BUILD FAILED', ok: false }
      caught = !run(`npx playwright test ${m.spec}`)
    } else {
      caught = !run(`npx vitest run ${m.spec}`)
    }
  } finally {
    writeFileSync(path, original)
    dirty.delete(path)
  }
  return { id: m.id, bug: m.bug, result: caught ? 'CAUGHT' : 'SURVIVED', ok: caught }
}

if (arg === '--restore') {
  restoreFromGit([...MUTATIONS, ...E2E_MUTATIONS].map((m) => m.file))
  process.exit(0)
}

const list = arg === 'e2e' ? E2E_MUTATIONS : MUTATIONS
assertClean(list.map((m) => m.file))

// A find string that no longer matches is the quietest failure this
// harness has. The mutation never runs, so the bug is never reintroduced,
// so the test that was supposed to catch it is unguarded and nothing says
// so. It DID show up at the end as an ANCHOR MISSING survivor, thirty
// minutes and eighty-odd vitest runs later, which is the right verdict
// arriving far too late to be the thing you act on. Three anchors went
// stale in one commit when the reading half of adapt.ts moved to
// signals.ts; this is the check that would have said so in a second.
//
// Checked across BOTH lists, never just the one being run. The e2e
// anchors are exercised far less often than the unit ones, so scoping
// this to `list` gave exactly the rot it was written to prevent: an
// AdaptProposals anchor went stale when the dismiss button landed and
// nothing said so until a review pass happened to run the e2e half.
const stale = [...MUTATIONS, ...E2E_MUTATIONS].filter(
  (m) => !readFileSync(resolve(ROOT, m.file), 'utf8').includes(m.find),
)
// A find string that matches TWICE is worse than one that matches never.
// It fires, so nothing looks wrong, but it poisons whichever site comes
// first in the file, which need not be the one the spec guards. Found the
// hard way: collapsing the persistent-pain cards added a second
// `automatic: false` above the one pain-advice-claims-to-have-acted was
// aimed at, the harness mutated the new block, adapt.test.ts had no
// opinion about it, and a guard that had worked for months reported
// SURVIVED with nothing actually broken.
const ambiguous = [...MUTATIONS, ...E2E_MUTATIONS].filter(
  (m) => readFileSync(resolve(ROOT, m.file), 'utf8').split(m.find).length > 2,
)
if (ambiguous.length) {
  console.log('[poison] refusing to run: these anchors match more than one place.')
  console.log('         The mutation would poison whichever comes first, which is')
  console.log('         not necessarily the code the spec is guarding.')
  for (const m of ambiguous) console.log(`           ${m.id}  (${m.file})`)
  process.exit(1)
}

if (stale.length) {
  console.log('[poison] refusing to run: these anchors no longer match their file.')
  console.log('         The mutation cannot fire, so the test behind it is unguarded.')
  console.log('         Re-aim the find string, or delete the mutation if the bug is gone.')
  for (const m of stale) console.log(`           ${m.id}  (${m.file})`)
  process.exit(1)
}
const results = []
for (const m of list) {
  const r = check(m, arg === 'e2e')
  results.push(r)
  console.log(`${r.result.padEnd(15)} ${r.id}`)
}
if (arg === 'e2e') run('npm run build')

console.log('\n================ MUTATION REPORT ================')
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.id.padEnd(34)} ${r.result}`)
  console.log(`      poisoned: ${r.bug}`)
}
const survived = results.filter((r) => !r.ok)
console.log(`\n${results.length - survived.length}/${results.length} mutations caught`)
if (survived.length) {
  console.log('SURVIVORS (tests that did not notice the bug):')
  for (const s of survived) console.log(`  - ${s.id}: ${s.result}`)
}
process.exit(survived.length ? 1 : 0)
