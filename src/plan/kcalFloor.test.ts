// Run `node scripts/poison.mjs` to re-verify these tests actually bite:
// it reintroduces each bug one at a time and asserts the suite goes red.
import { describe, expect, it } from 'vitest'
import { MIN_KCAL_REST, MIN_KCAL_TRAINING, REST_DAY_DROP, flooredTargets } from './kcalFloor'
import { byorNutrition } from './bookletOps'
import { buildNutrition } from './generator'

describe('nobody gets prescribed a crash diet', () => {
  it('leaves a sane target alone', () => {
    expect(flooredTargets(2300, 2700)).toEqual({ kcalTraining: 2300, kcalRest: 2000 })
  })

  it('never returns a target under the absolute minimum', () => {
    const t = flooredTargets(600, 1350)
    expect(t.kcalTraining).toBeGreaterThanOrEqual(MIN_KCAL_TRAINING)
    expect(t.kcalRest).toBeGreaterThanOrEqual(MIN_KCAL_REST)
  })

  it('caps the cut at a quarter off maintenance, which binds before the flat floor for bigger athletes', () => {
    // 4,000 maintenance: a 2,000 target clears the 1,500 minimum easily and
    // is still a 50% deficit. The proportional rule is what catches it.
    expect(flooredTargets(2000, 4000).kcalTraining).toBe(3000)
  })

  it('the rest-day drop cannot outrun the rest-day floor', () => {
    // This is what makes the clamp inside flooredTargets look redundant:
    // a floored training day minus the drop lands exactly on MIN_KCAL_REST,
    // so the clamp never binds. Pinned here because the day somebody
    // widens REST_DAY_DROP is the day it starts binding, and a silent
    // 1,100 kcal rest target is precisely the bug this file exists for.
    expect(MIN_KCAL_TRAINING - REST_DAY_DROP).toBeGreaterThanOrEqual(MIN_KCAL_REST)
  })

  it('only ever raises a target', () => {
    for (const maintenance of [1350, 1800, 2400, 3000, 4200]) {
      for (const asked of [500, 1200, 1900, 2600, 3400, 5000]) {
        const t = flooredTargets(asked, maintenance)
        expect(t.kcalTraining).toBeGreaterThanOrEqual(asked)
      }
    }
  })
})

describe('both nutrition paths agree, at every bodyweight', () => {
  // The bug: byorNutrition had no floor of any kind, so a 120 lb user
  // choosing "lose weight" in the build-your-own flow got 1,400 training /
  // 1,100 rest, and a 90 lb user got 950 / 650. The guided flow floored
  // the same person at 1,700.
  it('BYOR floors a small athlete on a cut', () => {
    const n = byorNutrition(['lose-weight'], 120)
    expect(n.kcalTraining).toBeGreaterThanOrEqual(MIN_KCAL_TRAINING)
    expect(n.kcalRest).toBeGreaterThanOrEqual(MIN_KCAL_REST)
  })

  it('no bodyweight, goal or sex can produce an unsafe target on either path', () => {
    const goalSets = [
      ['lose-weight'],
      ['muscle'],
      ['maintain'],
      ['athletic'],
      ['muscle', 'lose-weight'],
      ['muscle', 'lose-weight', 'athletic'],
    ] as const
    for (let bw = 90; bw <= 330; bw += 5) {
      for (const sex of ['male', 'female', undefined] as const) {
        for (const goals of goalSets) {
          const n = byorNutrition([...goals], bw, sex)
          expect(n.kcalTraining, `byor ${goals} ${bw} ${sex}`).toBeGreaterThanOrEqual(MIN_KCAL_TRAINING)
          expect(n.kcalRest, `byor ${goals} ${bw} ${sex}`).toBeGreaterThanOrEqual(MIN_KCAL_REST)
        }
        for (const goal of ['lean', 'muscle', 'strength', 'vertical', 'speed', 'general', 'endurance'] as const) {
          const n = buildNutrition(goal, bw, sex, {
            'lose-amount': '30+ lb',
            'day-movement': 'Mostly sitting',
          })
          expect(n.kcalTraining, `guided ${goal} ${bw} ${sex}`).toBeGreaterThanOrEqual(MIN_KCAL_TRAINING)
          expect(n.kcalRest, `guided ${goal} ${bw} ${sex}`).toBeGreaterThanOrEqual(MIN_KCAL_REST)
        }
      }
    }
  })

  it('a woman building her own routine no longer gets a man s maintenance', () => {
    expect(byorNutrition(['muscle'], 160, 'female').kcalTraining).toBeLessThan(
      byorNutrition(['muscle'], 160, 'male').kcalTraining,
    )
  })

  it('the protein target is never more than half the calories it has to fit inside', () => {
    for (let bw = 90; bw <= 330; bw += 5) {
      const n = byorNutrition(['lose-weight'], bw)
      expect(n.proteinTargetG * 4, `bw ${bw}`).toBeLessThanOrEqual(n.kcalRest * 0.6)
    }
  })
})
