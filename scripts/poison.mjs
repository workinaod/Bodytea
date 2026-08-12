#!/usr/bin/env node
// Mutation harness: poison each fix, confirm the tests catch it, revert.
//
// A green suite proves nothing on its own. It proves the tests RUN. This
// reintroduces each bug one at a time and asserts the relevant test goes
// red — a mutation that survives is a test that was decorative.
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const ROOT = '/home/user/Bodytea'
const arg = process.argv[2]

/** file, find, replace, the spec that must go red, and what bug it is. */
const MUTATIONS = [
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
    id: 'tired-cuts-volume-alone',
    bug: 'one rough night silently shrinks the session',
    file: 'src/engine/adapt.ts',
    find: '    if (tired && extra) {',
    to: '    if (tired || extra) {',
    spec: 'src/engine/adapt.test.ts',
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
    find: "  } else if (missed) {",
    to: "  } else if (missed && false) {",
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
    id: 'substitution-dead-end',
    bug: 'a gym movement strands a bodyweight user with no fallback',
    file: 'src/plan/equip.ts',
    find: "  'hack-squat': ['leg-press', 'front-squat', 'goblet-squat', 'split-squat'],",
    to: "  'hack-squat': ['leg-press'],",
    spec: 'src/plan/equipCoverage.test.ts',
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
    id: 'focus-stays-behind',
    bug: 'focus stays on the button underneath the sheet',
    file: 'src/components/Sheet.tsx',
    find: '    const raf = requestAnimationFrame(() => sheetRef.current?.focus())',
    to: '    const raf = requestAnimationFrame(() => {})',
    spec: 'e2e/sheet.spec.ts',
  },
]

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
  }
  return { id: m.id, bug: m.bug, result: caught ? 'CAUGHT' : 'SURVIVED', ok: caught }
}

const list = arg === 'e2e' ? E2E_MUTATIONS : MUTATIONS
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
