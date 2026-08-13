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
  'types.ts': 663,
  // Real splits owed, in plan order.
  'screens/onboarding/Onboarding.tsx': 1095,
  // screens/meals/MealsScreen.tsx came off this list. It was the second
  // entry here and it is gone: the two alternate views and the five
  // sheets moved to siblings, leaving a 244-line shell that keeps only
  // its own Log view. No entry replaces it — the whole point of the list
  // is that it gets shorter.
  // +20 for proteinContextFor: the protein target now depends on whether
  // the athlete is cutting, building or running, which is a decision the
  // generator is the right place to make and a table it is not.
  'plan/generator.ts': 940,
  // Was 835, which it blew through and broke three deploys on. Meal
  // logging moved to logic/mealActions.ts, then the prescription (what
  // load and how many reps to ask for) to logic/prescription.ts, then
  // writing sport to the log to logic/cardioActions.ts. The allowance
  // follows it down each time: an oversized file that shrinks does not
  // keep the headroom.
  // +1: one name added to the mealActions re-export block.
  'logic/actions.ts': 652,
  // Was 836. The how-to reader and the rest screen both moved out, and
  // the allowance follows it down: an oversized file that shrinks does
  // not get to keep the headroom it earned.
  'screens/today/FocusView.tsx': 660,
  // Session shapes moved to store/sessionSchema.ts, beside the types they
  // mirror, the shared zod primitives to store/primitives.ts, and the
  // GPS and cardio shapes to store/activitySchema.ts. The allowance
  // follows it down each time.
  // Migrations only ever accumulate: every schema bump adds a step that
  // can never be deleted while any device might still hold the old shape.
  // This one is the +21 for v19 → v20, the calorie-floor repair.
  'store/schema.ts': 640,
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
  'screens/onboarding/Onboarding.tsx',
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
