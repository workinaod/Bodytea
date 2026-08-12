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
  'plan/exercises.ts': 1830,
  'plan/athleticExercises.ts': 1250,
  'plan/demos.ts': 900,
  'plan/athletic.ts': 735,
  // Activity shapes moved to activityTypes.ts, the logged-session shapes
  // to sessionTypes.ts, the engine's day output to resolvedTypes.ts; the
  // allowance follows each time.
  'types.ts': 632,
  // Real splits owed, in plan order.
  'screens/onboarding/Onboarding.tsx': 1095,
  'screens/meals/MealsScreen.tsx': 980,
  'plan/generator.ts': 920,
  // Was 835, which it blew through and broke three deploys on. Meal
  // logging moved to logic/mealActions.ts, then the prescription (what
  // load and how many reps to ask for) to logic/prescription.ts. The
  // allowance follows it down each time: an oversized file that shrinks
  // does not keep the headroom.
  'logic/actions.ts': 711,
  // Was 836. The how-to reader and the rest screen both moved out, and
  // the allowance follows it down: an oversized file that shrinks does
  // not get to keep the headroom it earned.
  'screens/today/FocusView.tsx': 660,
  // Session shapes moved to store/sessionSchema.ts, beside the types they
  // mirror, and the shared zod primitives to store/primitives.ts.
  'store/schema.ts': 645,
  'engine/engine.test.ts': 705,
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
