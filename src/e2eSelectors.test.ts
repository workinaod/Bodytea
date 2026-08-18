import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// ============================================================
// Every button an e2e test reaches for has to exist.
//
// This is here because of a five-day silent outage. The onboarding
// rebuild split the final screen in two: the generated path ends on
// "Start Week 1", the bring-your-own-routine path on "Start Week 1,
// let's work". Sixteen spec files kept reaching for the longer label on
// the generated path, and Playwright matches an accessible name by
// SUBSTRING, so a search string longer than the button can never match.
// Thirty-four tests failed on the same line, in every run, for days.
//
// Nobody saw it, and that is the part worth fixing. A Playwright run
// prints its failures above its summary, so a report read from the
// bottom shows "35 passed" and a list of names that look like a table of
// contents. Read that way it is indistinguishable from green. The ship
// ritual said e2e was passing the whole time.
//
// So the guard does not live in the e2e suite. It lives here, in the
// unit run, where it costs milliseconds: if a spec asks for a button
// whose text is nowhere in src, say so now rather than in half an hour.
//
// WHAT THIS DOES NOT CATCH, said plainly because it is the exact bug
// above: "Start Week 1, let's work" DOES exist in src, on the
// bring-your-own-routine screen. The spec was on the generated path,
// which ends on a different button. A static check cannot know which
// screen a click sequence lands on, so this catches a label that exists
// NOWHERE, which is a real and common class, and not a label that exists
// on the wrong screen. The thing that actually catches that one is
// reading the whole Playwright report instead of its last few lines, and
// trusting its exit code over its summary.
// ============================================================

const ROOT = join(import.meta.dirname, '..')
const SRC = join(ROOT, 'src')
const E2E = join(ROOT, 'e2e')

function walk(dir: string, re: RegExp): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return walk(full, re)
    return re.test(name) ? [full] : []
  })
}

const SOURCE = walk(SRC, /\.tsx?$/)
  .filter((f) => !/\.test\.tsx?$/.test(f))
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n')

/**
 * Names that are legitimately not literals in src: composed at runtime,
 * or supplied by the platform rather than by us.
 */
const NOT_OURS = new Set(['Close', 'Back', 'Next', 'Done', 'Save', 'Cancel'])

/** `getByRole('button', { name: 'Thing' })`, single or double quoted. */
const BUTTON_NAME = /getByRole\(\s*['"]button['"]\s*,\s*\{\s*name:\s*(['"])([^'"]+)\1/g

describe('e2e selectors point at buttons that exist', () => {
  const asked = new Map<string, string[]>()
  for (const file of walk(E2E, /\.spec\.ts$/)) {
    const text = readFileSync(file, 'utf8')
    for (const m of text.matchAll(BUTTON_NAME)) {
      const name = m[2]
      if (NOT_OURS.has(name)) continue
      asked.set(name, [...(asked.get(name) ?? []), file.split('/').pop()!])
    }
  }

  /**
   * A button holding two text nodes has both in its accessible name, so
   * "Log it Already done" is one name made of two literals that sit apart
   * in the source. Accept a name that splits cleanly into pieces we can
   * each find, rather than demanding one contiguous string.
   */
  const inSource = (name: string): boolean => {
    if (SOURCE.includes(name)) return true
    const words = name.split(' ')
    for (let i = 1; i < words.length; i++) {
      const head = words.slice(0, i).join(' ')
      if (SOURCE.includes(head) && inSource(words.slice(i).join(' '))) return true
    }
    return false
  }

  it('finds every button label somewhere in src', () => {
    // Playwright matches by substring, so the label in src must CONTAIN
    // what the spec asks for. A longer ask never matches a shorter button,
    // which is exactly how this went unnoticed.
    const missing = [...asked.entries()]
      .filter(([name]) => !inSource(name))
      .map(([name, files]) => `${JSON.stringify(name)} (${[...new Set(files)].join(', ')})`)
    expect(missing).toEqual([])
  })

  it('still refuses a label that is nowhere in the app', () => {
    // The split above is a loosening, and a loosening that accepts
    // anything is not a check. Prove it still says no.
    expect(inSource('Start Week 1')).toBe(true)
    expect(inSource('Detonate the gym')).toBe(false)
    expect(inSource('Start Week 1 Detonate the gym')).toBe(false)
  })

  it('is actually reading the specs', () => {
    // A regex that matched nothing would pass the check above forever.
    expect(asked.size).toBeGreaterThan(10)
  })
})
