import { describe, expect, it } from 'vitest'
import { playedFrom } from '../logic/cardioActions'

// ============================================================
// Whether a session makes the day a GAME DAY.
//
// This is not decoration. A played day covers the week's
// conditioning requirement and protects the next day's speed
// work, so getting it wrong changes what the plan asks of
// somebody tomorrow.
//
// The bug: isIntenseSport answers off the mode chip and returns
// TRUE when no mode was picked, which was correct back when
// every entry came off a form that always asked. The live timer
// never asks. So from the day tracking shipped, a fifteen-minute
// shootaround marked the day played, banked the week's
// conditioning, and cancelled the next day's speed work.
// ============================================================

describe('the mode chip, when there is one', () => {
  it('still decides, exactly as it always did', () => {
    expect(playedFrom({ activityId: 'basketball', mode: 'games' })).toBe(true)
    expect(playedFrom({ activityId: 'basketball', mode: 'shooting' })).toBe(false)
    expect(playedFrom({ activityId: 'soccer', mode: 'match' })).toBe(true)
    expect(playedFrom({ activityId: 'soccer', mode: 'kickaround' })).toBe(false)
    expect(playedFrom({ activityId: 'football', mode: 'throwing' })).toBe(false)
  })

  it('outranks a measurement that disagrees', () => {
    // Somebody who says they were shooting around was shooting around,
    // whatever the pedometer made of it.
    expect(playedFrom({ activityId: 'basketball', mode: 'shooting', intensity: 'high' })).toBe(false)
  })
})

describe('a tracked session, where nothing was asked', () => {
  it('does not call a low-intensity hour a game', () => {
    // The bug, stated: this returned true and there was no way to say
    // otherwise, because no mode was ever picked.
    expect(playedFrom({ activityId: 'basketball', intensity: 'low' })).toBe(false)
    expect(playedFrom({ activityId: 'soccer', intensity: 'low' })).toBe(false)
  })

  it('does call a real one a game', () => {
    expect(playedFrom({ activityId: 'basketball', intensity: 'standard' })).toBe(true)
    expect(playedFrom({ activityId: 'basketball', intensity: 'high' })).toBe(true)
  })

  it('lets the athlete overrule the phone', () => {
    // They tracked an hour, the pedometer saw a slow one, and they say
    // it took everything. Theirs is the better evidence.
    expect(playedFrom({ activityId: 'basketball', intensity: 'low', feltIntensity: 'high' })).toBe(true)
    // And the other way: measured hard, but they were messing about.
    expect(playedFrom({ activityId: 'basketball', intensity: 'high', feltIntensity: 'low' })).toBe(false)
  })

  it('keeps the old answer when there is nothing new to go on', () => {
    // No mode, no steps, no answer: an hour of ball logged by hand on a
    // phone that measured nothing. Silently dropping days people did
    // play would be a worse bug than the one being fixed.
    expect(playedFrom({ activityId: 'basketball' })).toBe(true)
    expect(playedFrom({ activityId: 'soccer' })).toBe(true)
  })
})

describe('things that were never game days', () => {
  it('leaves non-sport activities alone at every tier', () => {
    for (const id of ['run', 'bike', 'walk', 'hike', 'swim', 'row-erg', 'jump-rope', 'custom', 'snow']) {
      for (const tier of ['low', 'standard', 'high'] as const) {
        expect(playedFrom({ activityId: id, intensity: tier })).toBe(false)
        expect(playedFrom({ activityId: id, feltIntensity: tier })).toBe(false)
      }
      expect(playedFrom({ activityId: id })).toBe(false)
    }
  })
})
