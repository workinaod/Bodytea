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
