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
      run('npm run build')
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
