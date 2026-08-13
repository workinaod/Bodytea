import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ALL_REGIONS, MuscleMap, type MuscleRegion } from './MuscleMap'

// ============================================================
// Does lighting a region actually light something?
//
// plan/data.test.ts already checks that every exercise names
// regions the map knows about. It cannot check the other
// direction: a region the map knows about but never DRAWS lights
// nothing at all, and the exercise using it shows a blank body
// with no error anywhere. The compiler will not catch it either,
// because a region that is simply never passed to f() is not a
// type error.
// ============================================================

const render = (primary: MuscleRegion[], secondary: MuscleRegion[] = []) =>
  renderToStaticMarkup(createElement(MuscleMap, { primary, secondary }))

/** Paths painted at full accent, which is what "primary" looks like. */
const litCount = (markup: string) => markup.split('opacity="0.95"').length - 1

describe('every region the map advertises', () => {
  const drawn = ALL_REGIONS.filter((r) => r !== 'full-body' && r !== 'heart')

  for (const region of drawn) {
    it(`draws something for ${region}`, () => {
      expect(litCount(render([region]))).toBeGreaterThan(0)
    })
  }

  it('lights nothing when nothing is asked for', () => {
    expect(litCount(render([]))).toBe(0)
  })

  it('lights the whole body for full-body', () => {
    const markup = render(['full-body'])
    expect(markup.split('opacity="0.5"').length - 1).toBeGreaterThan(10)
  })

  it('shows the heart only when it is named', () => {
    expect(render([])).not.toContain('--color-danger')
    expect(render(['heart'])).toContain('--color-danger')
  })
})

describe('primary and assisting stay distinguishable', () => {
  it('paints an assisting region at a lower strength', () => {
    const asPrimary = render(['quads'])
    const asSecondary = render([], ['quads'])
    expect(litCount(asPrimary)).toBeGreaterThan(0)
    expect(litCount(asSecondary)).toBe(0)
    expect(asSecondary).toContain('opacity="0.34"')
  })

  it('gives a region lit both ways the stronger of the two', () => {
    // Shoulder caps are shared between the front, side and rear heads,
    // so one shape can be asked for twice at different strengths.
    expect(litCount(render(['delts-side'], ['delts-front']))).toBeGreaterThan(0)
  })
})

describe('the resting body', () => {
  it('draws no seam lines when nothing is lit', () => {
    // Head divisions are definition on a working muscle. On a resting
    // silhouette they are scratches, which is most of what made the old
    // figure read as plate armour.
    expect(render([])).not.toContain('fill="none"')
    expect(render(['quads'])).toContain('fill="none"')
  })
})
