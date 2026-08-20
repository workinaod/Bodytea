import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { sourceFiles } from './sourceFiles'

// ============================================================
// The approved look, everywhere. Not just on the screens that
// got rebuilt.
//
// research/OP12-visual-law.md governs how BodyT looks, and
// visualLaw.test.ts holds the PALETTE to it. That guard passes
// on a file that has every approved colour and still draws
// every surface in translucent glass with a hairline ring,
// which is precisely what happened: the six screens the
// overhaul rebuilt came out flat, and the sixty behind them
// (the logger, the sheets, the pickers, the reviews) kept the
// look the concept replaced.
//
// The owner's words, and they were right: "You have to go over
// the first stuff you touched as well."
//
// So this scans for the idioms the law bans by name:
//
//   bg-white/[...]   a fill made of opacity instead of colour
//   ring-1           a hairline where the law says 2px
//   gradient-to-     depth faked with light
//   blur / backdrop  glass
//   shadow-lg|xl|2xl a glow where the law says a hard lip
//
// EXCEPTIONS are listed below with a reason each, and the list
// only ever shrinks. If a new file needs one it gets argued for
// in the law file first.
// ============================================================

const ROOT = join(import.meta.dirname, '..')

/**
 * Idioms the approved look has no room for, with the words the
 * failure message uses so the fix is obvious from the report alone.
 */
const BANNED: { re: RegExp; why: string }[] = [
  { re: /bg-white\/\[/, why: 'a fill made of opacity. Use bg-surface or bg-surface-2' },
  { re: /\bring-1\b/, why: 'a hairline. The law is a 2px border: border-2 border-edge' },
  { re: /gradient-to-/, why: 'a gradient. Flat fills only' },
  { re: /\bbackdrop-blur|\bblur-(?!none)/, why: 'glass. The concept has none' },
  { re: /shadow-(lg|xl|2xl)\b/, why: 'a glow. The law is a hard lip: shadow-[0_3px_0_var(--color-edge)]' },
  // A ring COLOUR with no `ring-1` to draw it is a dead class, and it is
  // how a border ends up with no colour at all: `border-2` alone falls
  // back to currentColor, so a row meant to have a slate edge came out
  // outlined in near-white text colour. It looked deliberate on screen.
  {
    re: /(?<!focus:)(?<!focus-within:)(?<!ring-2 )\bring-(white|accent|lime|gold|cyan|danger|edge)\b/,
    why: 'a ring colour with nothing drawing it. Name the border colour instead',
  },
]

/**
 * Files that legitimately keep a translucent surface, each with the
 * reason it is not drift. Shrink-only: adding a row needs the law file
 * to say why first.
 */
const ALLOWED = new Map<string, string>([
  // Chrome drawn OVER a photographic satellite tile. A flat panel with a
  // 2px edge is unreadable there and a scrim is exactly right. Written
  // into research/OP12-visual-law.md under "the one place glass survives".
  ['components/RouteMap.tsx', 'map chrome over satellite tiles'],
  ['components/RunReplay.tsx', 'map chrome over satellite tiles'],
  ['screens/today/RunTrackerSheet.tsx', 'live-tracking controls and stat scrim over the map'],
  // The scrim that fades the last inch of a scrolling page into the ground
  // behind the docked tab bar. The approved preview draws the same thing
  // (its `.fade`), because a nav sitting on half a sentence is unreadable.
  ['components/TabBar.tsx', 'the approved fade behind the docked bar'],
])

/** The onboarding world is a separate look on purpose, and another lane owns it. */
const OUT_OF_SCOPE = /^screens\/onboarding\//

describe('the approved look, on every surface', () => {
  it('draws nothing in glass, gradients, hairlines or glow', () => {
    const hits: string[] = []
    for (const rel of sourceFiles('.tsx')) {
      if (OUT_OF_SCOPE.test(rel) || ALLOWED.has(rel)) continue
      const lines = readFileSync(join(ROOT, 'src', rel), 'utf8').split('\n')
      lines.forEach((line, i) => {
        // Comments talk ABOUT these idioms, which is the whole point of the
        // file headers in this repo. A guard that cannot tell prose from
        // markup fails on its own explanation of itself.
        const code = line.replace(/\/\/.*$/, '')
        if (/^\s*[*]/.test(line) || /^\s*\/\//.test(line)) return
        for (const { re, why } of BANNED) {
          if (re.test(code)) hits.push(`${rel}:${i + 1} ${why}`)
        }
      })
    }
    expect(
      hits,
      `${hits.length} surfaces still wear the look the concept replaced. ` +
        'See research/OP12-visual-law.md.',
    ).toEqual([])
  })

  it('keeps the stylesheets flat too', () => {
    // The rainbow strip the tab bar folded into was a linear-gradient in
    // index.css under a two-colour box-shadow, and the .tsx scan walked
    // straight past it. Drift hides in whatever the guard does not read.
    const hits: string[] = []
    for (const rel of ['index.css', 'styles/motion.css']) {
      readFileSync(join(ROOT, 'src', rel), 'utf8')
        .split('\n')
        .forEach((line, i) => {
          // A glow is a shadow with BLUR. The law's lip is `0 3px 0`, and
          // its pressed state is `0 0 0`, so testing the first two values
          // flags the very rule it exists to protect. Blur is the third.
          const m = /box-shadow:\s*(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+(-?[\d.]+)px/.exec(line)
          if (m && Number(m[3]) !== 0) hits.push(`${rel}:${i + 1} a glow, blur ${m[3]}px`)
        })
    }
    expect(hits, 'the law allows a hard lip, never a halo').toEqual([])
  })

  it('never grows the emoji the icon set has not replaced yet', () => {
    // The activity catalog identifies 24 sports with 23 emoji, and the law
    // says zero. Drawing 23 two-tone marks is artwork, not a sweep, and the
    // cheap version is worse than the emoji: five generic icons would make
    // a run and a swim identical. So the number is pinned instead, and it
    // only ever falls. See research/OP12-visual-law.md.
    const table = readFileSync(join(ROOT, 'src/plan/cardio.ts'), 'utf8')
    const found = new Set([...table.matchAll(/emoji: '([^']+)'/g)].map((m) => m[1]))
    expect(
      found.size,
      'a new activity brought a new emoji with it. Draw it in components/stickers.tsx instead',
    ).toBeLessThanOrEqual(23)
  })

  it('has no stale exceptions', () => {
    const stale = [...ALLOWED.keys()].filter((rel) => {
      const body = readFileSync(join(ROOT, 'src', rel), 'utf8')
      return !BANNED.some(({ re }) => body.split('\n').some((l) => re.test(l)))
    })
    expect(stale, 'these files no longer need their exception; drop the row').toEqual([])
  })
})
