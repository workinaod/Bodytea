import { describe, expect, it } from 'vitest'
import { jointsInText, limitationsFrom } from './limitations'
import { buildFollowups } from './followups'
import { emptyPrefs, limitedJoints } from '../prefsTypes'
import { defaultWeekState, emptyAppData } from '../types'
import { adaptContext } from '../engine/adapt'
import type { Joint } from './movement'

// ============================================================
// The question that promised to route the plan around a joint, and did
// not. Its `informs` line is the contract these tests hold it to.
// ============================================================

const SINCE = '2026-08-17'

describe('what they tapped', () => {
  it('turns each chip into the joint it names', () => {
    const cases: [string, Joint][] = [
      ['Knees', 'knee'],
      ['Lower back', 'lower-back'],
      ['Shoulders', 'shoulder'],
      ['Hips', 'hip'],
      ['Ankles', 'ankle'],
    ]
    for (const [chip, joint] of cases) {
      const [lim] = limitationsFrom({ injuries: chip }, SINCE)
      expect(lim, chip).toBeDefined()
      expect(lim.joints, chip).toEqual([joint])
      expect(lim.label, chip).toBe(chip)
      expect(lim.since, chip).toBe(SINCE)
    }
  })

  it('covers every chip the question actually offers', () => {
    // A chip added to followups.ts and not here would silently route
    // nothing, which is the failure this whole file exists about.
    const q = buildFollowups({ goal: 'muscle', answers: {} }).find((f) => f.id === 'injuries')
    expect(q).toBeDefined()
    for (const opt of q!.options ?? []) {
      if (opt === 'Nothing' || opt === 'Something else') continue
      expect(limitationsFrom({ injuries: opt }, SINCE), opt).toHaveLength(1)
    }
  })

  it('records nothing when they said nothing hurts', () => {
    // "Nothing" is an answer, not a gap. It must not become a limitation
    // with an empty joint list that the coach then reads back at them.
    expect(limitationsFrom({ injuries: 'Nothing' }, SINCE)).toEqual([])
    expect(limitationsFrom({}, SINCE)).toEqual([])
    expect(limitationsFrom(undefined, SINCE)).toEqual([])
  })
})

describe('what they typed', () => {
  it('finds the joint in their own words', () => {
    expect(jointsInText('my left rotator cuff')).toEqual(['shoulder'])
    expect(jointsInText('torn meniscus, 2019')).toEqual(['knee'])
    expect(jointsInText('achilles still grumbling')).toEqual(['ankle'])
    expect(jointsInText('tennis elbow')).toEqual(['elbow'])
  })

  it('reads lower back as the back and not as something else', () => {
    expect(jointsInText('lower-back pain when I deadlift')).toEqual(['lower-back'])
    expect(jointsInText('lumbar disc')).toEqual(['lower-back'])
  })

  it('takes more than one joint out of one sentence', () => {
    const found = jointsInText('bad knees and my shoulder clicks')
    expect(found).toContain('knee')
    expect(found).toContain('shoulder')
  })

  it('keeps a phrase it cannot place, with no joints on it', () => {
    // The plan cannot route around a word it does not know. The coach can
    // still say it back, and that is the difference between a plan
    // written around them and one written as if they said nothing.
    const [lim] = limitationsFrom(
      { injuries: 'Something else', 'injury-what': 'costochondritis flares up' },
      SINCE,
    )
    expect(lim.label).toBe('costochondritis flares up')
    expect(lim.joints).toEqual([])
  })

  it('does not record a blank when they picked the option and typed nothing', () => {
    expect(limitationsFrom({ injuries: 'Something else' }, SINCE)).toEqual([])
    expect(limitationsFrom({ injuries: 'Something else', 'injury-what': '   ' }, SINCE)).toEqual([])
  })
})

describe('the whole way from the answer to the engine', () => {
  it('puts a declared knee in front of the adapt engine on day one', () => {
    // The point of the fix. Not "the translator works", but "a person who
    // typed it in onboarding has a plan that knows".
    const d = emptyAppData('2026-08-10', '2026-08-14')
    d.settings.onboarded = true
    d.weeks['2026-08-10'] = defaultWeekState('2026-08-10')
    d.prefs = { ...emptyPrefs(), limitations: limitationsFrom({ injuries: 'Knees' }, '2026-08-10') }
    expect(limitedJoints(d.prefs)).toEqual(['knee'])
    expect(adaptContext(d, '2026-08-14', d.plan.equipment).limited).toContain('knee')
  })

  it('leaves the engine unchanged for somebody with nothing to declare', () => {
    const d = emptyAppData('2026-08-10', '2026-08-14')
    d.settings.onboarded = true
    d.weeks['2026-08-10'] = defaultWeekState('2026-08-10')
    d.prefs = { ...emptyPrefs(), limitations: limitationsFrom({ injuries: 'Nothing' }, '2026-08-10') }
    expect(adaptContext(d, '2026-08-14', d.plan.equipment).limited).toEqual([])
  })
})
