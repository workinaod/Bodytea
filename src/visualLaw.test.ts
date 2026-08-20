import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// ============================================================
// The approved look is checked in, and this makes it stick.
//
// The concept the owner signed off on lived in a scratchpad
// HTML file in a temporary session directory. A session that
// lost its context had nothing to build against, rebuilt the
// visual language from memory, and got the two largest
// decisions backwards: pure black instead of the approved
// slate, and the old face instead of the approved one. The
// owner's words: "that's how projects are ruined."
//
// So the palette lives in research/OP12-visual-law.md, and this
// asserts src/ still agrees with it. An approved decision that
// nothing enforces is a decision that gets re-litigated by
// whoever forgets it next.
//
// If a value genuinely needs to change, the owner changes it,
// the law file changes, and this changes in the same commit.
// That is the whole point: drift fails, an intentional change
// is one edit away.
// ============================================================

const ROOT = join(import.meta.dirname, '..')
const CSS = readFileSync(join(ROOT, 'src/index.css'), 'utf8')
const LAW = readFileSync(join(ROOT, 'research/OP12-visual-law.md'), 'utf8')

/** The tokens the whole look hangs off, exactly as approved. */
const APPROVED: Record<string, string> = {
  '--color-bg': '#131f24',
  '--color-surface': '#1a2730',
  '--color-surface-2': '#22333e',
  '--color-edge': '#37464f',
  '--color-edge-soft': '#2a3944',
  '--color-ink': '#f1f7fb',
  '--color-ink-dim': '#93a8b4',
  '--color-ink-faint': '#5d7280',
  '--color-accent': '#ff4f30',
  '--color-accent-deep': '#c33714',
  '--color-accent-soft': '#ff8a66',
  '--color-lime': '#b9ec3e',
  '--color-cyan': '#1cb0f6',
  '--color-gold': '#ffc800',
  '--color-danger': '#ff4b4b',
}

describe('the approved visual law', () => {
  it('is written down in the repo, not in a scratchpad', () => {
    expect(LAW).toContain('#131F24')
    expect(LAW.length, 'the law file is a stub').toBeGreaterThan(2000)
  })

  for (const [token, value] of Object.entries(APPROVED)) {
    it(`${token} is ${value}`, () => {
      const found = new RegExp(`${token}\\s*:\\s*(#[0-9a-fA-F]{3,8})\\s*;`).exec(CSS)
      expect(found, `${token} is missing from src/index.css entirely`).not.toBeNull()
      expect(
        found![1].toLowerCase(),
        `${token} drifted from the approved concept. See research/OP12-visual-law.md; ` +
          'if this change is deliberate the law file moves with it.',
      ).toBe(value)
    })
  }

  it('every fill colour has the darker edge its lip and outline are drawn in', () => {
    // A control reads as one moulded object because its outline and the lip
    // beneath it are the SAME darker cut of the fill. Miss the edge and the
    // button goes back to being a rectangle with a shadow.
    for (const lip of ['--lip-accent', '--lip-lime', '--lip-gold', '--lip-danger']) {
      expect(CSS, `${lip} is missing: nothing to draw that colour's lip in`).toContain(lip)
    }
  })

  it('carries the face the concept was approved in, bundled rather than fetched', () => {
    expect(CSS, 'the approved face is Nunito').toMatch(/Nunito/)
    // An offline PWA that fetches a webfont is a blank screen on a gym floor.
    expect(CSS).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/)
  })
})
