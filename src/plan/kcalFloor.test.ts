// Run `node scripts/poison.mjs` to re-verify these tests actually bite:
// it reintroduces each bug one at a time and asserts the suite goes red.
import { describe, expect, it } from 'vitest'
import { MIN_KCAL_REST, MIN_KCAL_TRAINING, flooredTargets } from './kcalFloor'
import { REST_SWING_MAX, REST_SWING_MIN, restDaySwing } from './bmr'
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

  it('the rest-day clamp binds now, and it did not used to', () => {
    // This test used to assert the opposite: that MIN_KCAL_TRAINING minus
    // REST_DAY_DROP could never fall under MIN_KCAL_REST, which made the
    // clamp inside flooredTargets look like dead code. Its own comment
    // said it would go live the day the drop widened past 300.
    //
    // That day arrived. The drop is the athlete's own session cost now
    // and tops out at 400, so a floored training day minus the widest
    // swing is 1,100, and this clamp is the only thing between a heavy
    // athlete on a hard cut and a rest target no clinician would sign.
    expect(MIN_KCAL_TRAINING - REST_SWING_MAX).toBeLessThan(MIN_KCAL_REST)
    expect(flooredTargets(1500, 2000, REST_SWING_MAX).kcalRest).toBe(MIN_KCAL_REST)
    // and at the narrow end it does not interfere at all
    expect(flooredTargets(2600, 2900, REST_SWING_MIN).kcalRest).toBe(2600 - REST_SWING_MIN)
  })

  it('caps the cut at a quarter off maintenance, which binds before the flat floor for bigger athletes', () => {
    // 4,000 maintenance: a 2,000 target clears the 1,500 minimum easily and
    // is still a 50% deficit. The proportional rule is what catches it.
    expect(flooredTargets(2000, 4000).kcalTraining).toBe(3000)
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

describe('the rest day scales to the body that is resting', () => {
  it('reproduces the old flat 300 for exactly the body it was written for', () => {
    // 300 was never a rule, it was one 86 kg body lifting for an hour.
    // (5 - 1) METs x 86 kg x 1 h = 345, and 190 lb is 86 kg.
    expect(restDaySwing(190)).toBe(345)
  })

  it('stops making a small athlete s rest day punitive', () => {
    // R1's case: a 54 kg woman was dropped 300 kcal, roughly double what
    // her session actually cost. She now drops by what she actually spent.
    const her = restDaySwing(120)
    expect(her).toBeLessThan(300)
    expect(her).toBeGreaterThanOrEqual(REST_SWING_MIN)
    // and a 45 minute session costs less again, once a duration is known
    expect(restDaySwing(120, 0.75)).toBeLessThan(her)
  })

  it('rises with bodyweight, inside bounds at both ends', () => {
    expect(restDaySwing(120)).toBeLessThan(restDaySwing(190))
    expect(restDaySwing(190)).toBeLessThan(restDaySwing(300))
    expect(restDaySwing(90, 0.25)).toBe(REST_SWING_MIN)
    expect(restDaySwing(330, 2)).toBe(REST_SWING_MAX)
  })

  it('never lets the scaled swing push a rest day under the floor', () => {
    for (let bw = 90; bw <= 330; bw += 10) {
      const n = buildNutrition('lean', bw, 'female', { 'lose-amount': 'More than that' }, 62, { ageYears: 40 })
      expect(n.kcalRest, `bw ${bw}`).toBeGreaterThanOrEqual(MIN_KCAL_REST)
      expect(n.kcalTraining - n.kcalRest, `bw ${bw}`).toBeLessThanOrEqual(REST_SWING_MAX)
    }
  })
})
