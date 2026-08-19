import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ALL_REGIONS, MuscleMap, type MuscleRegion } from './MuscleMap'
import { FRONT } from './anatomy/front'
import { BACK } from './anatomy/back'

// ============================================================
// Does lighting a region actually light something?
//
// plan/data.test.ts already checks that every exercise names
// regions the map knows about. It cannot check the other
// direction: a region the map knows about but never DRAWS lights
// nothing at all, and the exercise using it shows a blank body
// with no error anywhere. The compiler will not catch it either,
// because a region that is simply never passed to the state
// function is not a type error.
//
// Lit paths are marked in the markup: data-m="p" for a working
// muscle, "s" for an assisting one, "w" for the full-body wash.
// ============================================================

const render = (primary: MuscleRegion[], secondary: MuscleRegion[] = []) =>
  renderToStaticMarkup(createElement(MuscleMap, { primary, secondary }))

const count = (markup: string, m: 'p' | 's' | 'w') => markup.split(`data-m="${m}"`).length - 1

describe('every region the map advertises', () => {
  const drawn = ALL_REGIONS.filter((r) => r !== 'full-body' && r !== 'heart')

  for (const region of drawn) {
    it(`draws something for ${region}`, () => {
      expect(count(render([region]), 'p')).toBeGreaterThan(0)
    })
  }

  it('lights nothing when nothing is asked for', () => {
    const markup = render([])
    expect(count(markup, 'p') + count(markup, 's') + count(markup, 'w')).toBe(0)
  })

  it('washes the whole body for full-body', () => {
    expect(count(render(['full-body']), 'w')).toBeGreaterThan(20)
  })

  it('shows the heart only when it is named', () => {
    expect(render([])).not.toContain('--color-danger')
    expect(render(['heart'])).toContain('--color-danger')
  })
})

describe('the anatomy data stays inside the vocabulary', () => {
  // A muscle bound to a misspelled region would compile (the type
  // union catches new strings, not a stale list here) and then
  // never light. Walk every drawn piece against ALL_REGIONS.
  it('binds every drawn muscle to a region the map advertises', () => {
    const bad = [...FRONT.parts, ...BACK.parts]
      .filter((p) => p.r !== null && !ALL_REGIONS.includes(p.r))
      .map((p) => p.r)
    expect(bad).toEqual([])
  })

  it('draws both figures with distinct def namespaces', () => {
    // Front and back render into one document; shared gradient and
    // clip ids would silently resolve to whichever mounted first.
    expect(FRONT.id).not.toBe(BACK.id)
  })
})

describe('primary and assisting stay distinguishable', () => {
  it('paints an assisting region at a lower strength', () => {
    const asPrimary = render(['quads'])
    const asSecondary = render([], ['quads'])
    expect(count(asPrimary, 'p')).toBeGreaterThan(0)
    expect(count(asSecondary, 'p')).toBe(0)
    expect(count(asSecondary, 's')).toBeGreaterThan(0)
  })

  it('draws neighbouring shoulder heads independently', () => {
    // The delt heads are separate muscles now; asking for one as
    // primary and its neighbour as assisting must light both, at
    // different strengths, not collapse into one cap.
    const markup = render(['delts-side'], ['delts-front'])
    expect(count(markup, 'p')).toBeGreaterThan(0)
    expect(count(markup, 's')).toBeGreaterThan(0)
  })
})

describe('the resting body', () => {
  it('carries no accent when nothing is lit', () => {
    // The figure shows its anatomy through sculpt, not colour: a
    // resting body must not borrow the accent anywhere. Compact
    // mode drops the legend, so the markup is the figure alone.
    const compactRest = renderToStaticMarkup(
      createElement(MuscleMap, { primary: [], secondary: [], compact: true }),
    )
    expect(compactRest).not.toContain('var(--color-accent)')
  })
})
