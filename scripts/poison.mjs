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
    file: 'src/plan/bookletOps.ts',
    find: "  const base = Math.round((bw * (sex === 'female' ? 14 : 15)) / 50) * 50",
    to: '  const base = Math.round((bw * 15) / 50) * 50',
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
    file: 'src/store/schema.ts',
    find: '      if (typeof n.kcalTraining === \'number\') n.kcalTraining = Math.max(MIN_KCAL_TRAINING, n.kcalTraining)',
    to: '      if (typeof n.kcalTraining === \'number\') n.kcalTraining = n.kcalTraining',
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
    find: "          kind: 'substitute',\n          automatic: true,\n          exerciseId: ex.exerciseId,\n          toExerciseId: sub,\n          because: `Your ${joint.replace('-', ' ')}",
    to: "          kind: 'substitute',\n          automatic: false,\n          exerciseId: ex.exerciseId,\n          toExerciseId: sub,\n          because: `Your ${joint.replace('-', ' ')}",
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
    find: 'So keep ${ids.length > 1 ? \'them\' : \'it\'} in and take the weight down instead:',
    to: 'So stop training ${ids.length > 1 ? \'them\' : \'it\'} until it settles:',
    spec: 'src/engine/adapt.test.ts',
  },
  {
    id: 'pain-advice-has-no-clock',
    bug: 'somebody manages a painful joint indefinitely with no prompt to get it looked at',
    file: 'src/engine/adapt.ts',
    find: 'If it is still there in two weeks, that is a question for a physio and not for an app.',
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
    find: "      kind: 'reduce-load',\n      automatic: false,",
    to: "      kind: 'reduce-load',\n      automatic: true,",
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
    file: 'src/engine/adapt.ts',
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
    file: 'src/engine/adapt.ts',
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
    find: '  }).filter((a) => a.automatic)',
    to: '  })',
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
]

const E2E_MUTATIONS = [
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
    find: '  if (proposals.length === 0 || (session?.startedAt && !session.endedAt)) return null',
    to: '  if (proposals.length >= 0 || (session?.startedAt && !session.endedAt)) return null',
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
