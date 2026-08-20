import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// ============================================================
// Copy guards: rules about what the app says, not how it is built.
//
// The em-dash rule is the owner's, and it is not a style preference. An
// em dash is the single most reliable tell that a sentence was written
// by a machine, and this app's whole voice is somebody who trains you
// talking to you. One dash undoes a screen of work.
//
// Sixteen of them had reached shipped copy by the time this landed: a
// coaching cue, two recipe steps, the adaptation the engine says out
// loud when a joint keeps getting flagged, and the microphone note. The
// sweep is the easy half. This test is the half that lasts.
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

/**
 * Files that must contain the character to do their job. Both handle the
 * dash rather than speak it, so neither can be rewritten around.
 */
const DASH_ALLOWED = new Set([
  // The v14 migration that strips em dashes out of copy already saved to
  // somebody's phone. It has to name what it is removing.
  'store/schema.ts',
  // Two character classes that turn a dash into spoken words ("8 to 12").
  'platform/speakable.ts',
])

/**
 * A lone dash standing where a number will go is a glyph, not a sentence.
 * Three screens use it for an empty stat and they should agree; prose is
 * what the rule is about.
 */
const PLACEHOLDER = /(?:^|[>'"`])\s*—\s*(?:[<'"`]|$)/

/**
 * Comments are for the next person reading the code, and they are not
 * copy. Block state has to be tracked across lines or the first `/*`
 * swallows the rest of the file, and JSX comments look like neither.
 */
function codeLines(text: string): { n: number; line: string }[] {
  const out: { n: number; line: string }[] = []
  let inBlock = false
  text.split('\n').forEach((line, i) => {
    const s = line.trim()
    const opened = inBlock
    if (s.includes('/*') && !s.includes('*/')) inBlock = true
    if (s.includes('*/')) inBlock = false
    if (opened || s.startsWith('*') || s.startsWith('/*') || s.startsWith('//') || s.startsWith('{/*')) return
    out.push({ n: i + 1, line: line.replace(/\s\/\/.*$/, '') })
  })
  return out
}

describe('user-visible copy', () => {
  it('never ships an em dash', () => {
    const offenders: string[] = []
    for (const f of FILES) {
      // A test asserting `not.toMatch(/—/)` has to contain one, and the
      // migration fixtures are old copy on purpose. Nothing here ships.
      if (/\.test\.tsx?$/.test(f.path)) continue
      if (DASH_ALLOWED.has(f.path)) continue
      for (const { n, line } of codeLines(f.text)) {
        if (!line.includes('—')) continue
        if (PLACEHOLDER.test(line)) continue
        offenders.push(`${f.path}:${n}  ${line.trim().slice(0, 80)}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('has no stale entries on the dash allowlist', () => {
    // A file that stopped needing the character must leave the list, or
    // the list becomes a place to hide a real one.
    const stale = [...DASH_ALLOWED].filter(
      (p) => !FILES.some((f) => f.path === p && f.text.includes('—')),
    )
    expect(stale).toEqual([])
  })

  it('still finds an em dash when there is one', () => {
    // A comment-stripper with an off-by-one turns this whole file into a
    // test that passes by seeing nothing. Prove it can see.
    const seen = codeLines("const a = 'one — two'\n// a comment — with one")
    expect(seen.map((l) => l.line.includes('—'))).toEqual([true])
  })
})

// ============================================================
// How much the coach is allowed to say at once.
//
// Owner, 2026-08-20, looking at a Today screen with two blue paragraphs
// stacked on it: "Why do generate paragraphs or super long sentences to
// explain stuff. It makes the app way too text heavy."
//
// He is right, and it was already a standing constraint ("casual,
// natural, SHORT") that drifted because every slice added one more card
// and each one read fine on its own. The worst were 72, 64 and 49 words,
// and three I shipped that same day were 35, 34 and 28. Nobody reads
// that on a phone between sets.
//
// Scoped to the CARD surfaces, because engine/ writes the lines that
// land on Today, Meals and Progress. Exercise guides and the plan
// booklet are deliberately out of scope: somebody who taps into a
// movement guide has asked for the explanation.
//
// Same shape as the allowlists in structure.test.ts. The gate is live
// today rather than after a big-bang rewrite, and it can only shrink.
// ============================================================

/** Words in one line of coach-facing copy. Past this, cut it. */
const MAX_WORDS = 30

/**
 * Already over the line when the rule landed, each on a surface worth
 * reading in place before rewriting: analyze.ts is the plan booklet read
 * once at signup, reviewStory is the periodic review, messages.ts is the
 * fallback nudge. None may grow and nothing new may join them.
 */
const LONG_ALLOWED = new Set([
  'engine/adapt.ts: Also worth not chasing a new number today. Sa',
  'plan/analyze.ts: Maintenance mode: the bar is showing up, not ',
  'plan/messages.ts: Your own plan says it: a month of fallback we',
  'engine/reviewStory.ts: Take a front and a side shot. Same spot, same',
  'plan/analyze.ts: You credited showing up. Correct. Consistency',
  'plan/analyze.ts: Your goal is ${goalWord} but nothing in this ',
  'plan/analyze.ts: Muscle up AND weight down at the same time is',
  'plan/analyze.ts: You said it yourself: the weight keeps going ',
  'plan/analyze.ts: Losing weight is won in the kitchen. Your cal',
  'plan/analyze.ts: Your routine stays yours: nothing here gets r',
])

/** Where the coach speaks in short form. */
const CARD_SURFACES = /^(engine\/|plan\/analyze\.ts|plan\/messages\.ts)/

/** A literal that reads like a sentence somebody is shown. */
const SENTENCE = /[`'"]([A-Z][^`'"\n]{40,})[`'"]/g

function longLines(): { key: string; words: number }[] {
  const out: { key: string; words: number }[] = []
  for (const { path, text } of FILES) {
    if (!CARD_SURFACES.test(path) || /\.test\./.test(path)) continue
    for (const raw of text.split('\n')) {
      for (const m of raw.matchAll(SENTENCE)) {
        const line = m[1]
        // Not prose unless it actually reads like prose.
        if (!line.includes('. ') && !line.endsWith('.')) continue
        const words = line.replace(/\$\{[^}]*\}/g, 'X').split(/\s+/).length
        // Keyed by its opening rather than its line number, so moving
        // code around cannot silently empty the allowlist.
        if (words > MAX_WORDS) out.push({ key: `${path}: ${line.slice(0, 45)}`, words })
      }
    }
  }
  return out
}

describe('the coach says it short', () => {
  it('never ships a new card line longer than a person will read', () => {
    const fresh = longLines().filter((l) => !LONG_ALLOWED.has(l.key))
    expect(fresh.map((l) => `${l.words}w ${l.key}`)).toEqual([])
  })

  it('keeps the allowlist honest: every entry is still over the line', () => {
    // An entry that has since been shortened comes OFF the list rather
    // than sitting there making the gate look bigger than it is.
    const keys = new Set(longLines().map((l) => l.key))
    expect([...LONG_ALLOWED].filter((k) => !keys.has(k))).toEqual([])
  })
})
