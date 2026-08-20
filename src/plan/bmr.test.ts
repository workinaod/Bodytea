import { describe, expect, it } from 'vitest'
import {
  bodyweightHeuristicKcal,
  CUNNINGHAM_INTERCEPT,
  CUNNINGHAM_PER_KG_FFM,
  dayMovementOf,
  maintenanceKcal,
  PAL_CEILING,
  smoothBodyFat,
  tapeIsFresh,
  type BodyKnowledge,
  type DayMovement,
  type Maintenance,
} from './bmr'

// Everything is asserted through what actually ships. The equations, the
// activity bands and the fat-free-mass conversion are not exported,
// because an export nothing outside calls is the exact thing the
// structural guard exists to catch, and Maintenance already carries the
// resting number and the multiplier it used.
const LB_PER_KG = 2.2046226218
const kg = (lb: number) => lb / LB_PER_KG

/** One athlete, one week, through the shipped entry point. */
function read(k: BodyKnowledge, sessions = 4, movement?: DayMovement): Maintenance {
  return maintenanceKcal(
    k,
    { sessionsPerWeek: sessions, movement },
    bodyweightHeuristicKcal(k.bodyweightLb, k.sex, k.heightIn),
  )
}

// R1's eval personas, section 8. The BMR column is the checkable part:
// it is the published equation applied to the persona's own numbers, so
// it is arithmetic rather than opinion, and it is what a regression here
// would break first.
//
// R1's "Maint. est" column is NOT asserted as a table, deliberately. Its
// rows are not mutually consistent under the architecture the same pack
// tells J7 to build: persona 1's range only fits if the number means a
// training day, persona 11's only fits if it means a rest day, and
// personas 2 and 7 sit in the same activity band while demanding
// multipliers on opposite sides of it. Fudging a tolerance until all of
// them go green would be inventing agreement that is not there. The
// disagreement is recorded in BODYT_STATE.md and the invariants that
// actually protect an athlete are asserted below instead.
const PERSONAS: {
  n: number
  who: string
  k: BodyKnowledge
  sessions: number
  movement?: DayMovement
  model: 'katch-mcardle' | 'mifflin-st-jeor' | 'bodyweight'
  bmr: number | null
}[] = [
  { n: 1, who: 'M 190 lb, 70 in, 30 y, tape 22%', k: { bodyweightLb: 190, heightIn: 70, ageYears: 30, bodyFatPct: 22, sex: 'male' }, sessions: 4, model: 'katch-mcardle', bmr: 1822 },
  { n: 2, who: 'F 150 lb, 65 in, 28 y, no tape', k: { bodyweightLb: 150, heightIn: 65, ageYears: 28, sex: 'female' }, sessions: 3, model: 'mifflin-st-jeor', bmr: 1411 },
  { n: 3, who: 'M 175 lb, 69 in, 25 y, no tape, walks daily', k: { bodyweightLb: 175, heightIn: 69, ageYears: 25, sex: 'male' }, sessions: 6, movement: 'Always moving', model: 'mifflin-st-jeor', bmr: 1769 },
  { n: 5, who: 'M 170 lb, tape 12%', k: { bodyweightLb: 170, bodyFatPct: 12, sex: 'male' }, sessions: 5, model: 'katch-mcardle', bmr: 1836 },
  { n: 7, who: 'M 150 lb, 70 in, 22 y, tape 15%', k: { bodyweightLb: 150, heightIn: 70, ageYears: 22, bodyFatPct: 15, sex: 'male' }, sessions: 4, model: 'katch-mcardle', bmr: 1619 },
  { n: 8, who: 'M 185 lb, tape 12%', k: { bodyweightLb: 185, bodyFatPct: 12, sex: 'male' }, sessions: 5, model: 'katch-mcardle', bmr: 1965 },
  { n: 9, who: 'M 210 lb, 71 in, 45 y, desk job', k: { bodyweightLb: 210, heightIn: 71, ageYears: 45, sex: 'male' }, sessions: 1, movement: 'Sitting', model: 'mifflin-st-jeor', bmr: 1860 },
  { n: 11, who: 'M 320 lb, 72 in, 38 y, no tape', k: { bodyweightLb: 320, heightIn: 72, ageYears: 38, sex: 'male' }, sessions: 2, model: 'mifflin-st-jeor', bmr: 2410 },
  { n: 12, who: 'M 180 lb, nothing else known', k: { bodyweightLb: 180, sex: 'male' }, sessions: 4, model: 'bodyweight', bmr: null },
]

describe('the published equations', () => {
  it('reproduces every R1 persona resting number to the kcal', () => {
    for (const p of PERSONAS) {
      const m = read(p.k, p.sessions, p.movement)
      expect(m.model, `persona ${p.n} (${p.who}) model`).toBe(p.model)
      if (p.bmr === null) {
        expect(m.restingKcal, `persona ${p.n} should have no resting number`).toBeNull()
        continue
      }
      expect(m.restingKcal, `persona ${p.n} (${p.who}) resting kcal`).toBeCloseTo(p.bmr, -0.7)
    }
  })

  it('is Cunningham 1991, not the 1980 variant', () => {
    // 500 + 22 x FFM also circulates. At 70 kg FFM they differ by 70 kcal,
    // which is a real meal's worth of daily target.
    const at70 = 70 / (1 - 0.12) // 70 kg of lean mass at 12 percent fat
    const m = read({ bodyweightLb: at70 * LB_PER_KG, bodyFatPct: 12, sex: 'male' })
    expect(m.model).toBe('katch-mcardle')
    expect(m.restingKcal).toBe(Math.round(CUNNINGHAM_INTERCEPT + CUNNINGHAM_PER_KG_FFM * 70))
    expect(m.restingKcal).not.toBe(Math.round(500 + 22 * 70))
  })

  it('carries the sex term Mifflin actually specifies', () => {
    const common = { bodyweightLb: 160, heightIn: 67, ageYears: 30 } as const
    const m = read({ ...common, sex: 'male' })
    const f = read({ ...common, sex: 'female' })
    expect(m.restingKcal! - f.restingKcal!).toBe(166)
  })

  it('ages a body downward, which the bodyweight heuristic cannot', () => {
    const at = (ageYears: number) => read({ bodyweightLb: 190, heightIn: 70, ageYears, sex: 'male' }).restingKcal!
    expect(at(50) - at(20)).toBe(-150)
    // and the number it replaced could not tell the two apart at all
    expect(bodyweightHeuristicKcal(190, 'male', 70)).toBe(bodyweightHeuristicKcal(190, 'male', 70))
  })
})

describe('choosing a model', () => {
  it('prefers the tape when there is one', () => {
    const withTape: BodyKnowledge = { bodyweightLb: 190, heightIn: 70, ageYears: 30, bodyFatPct: 22, sex: 'male' }
    expect(read(withTape).model).toBe('katch-mcardle')
    const { bodyFatPct: _drop, ...withoutTape } = withTape
    expect(read(withoutTape).model).toBe('mifflin-st-jeor')
  })

  it('falls to Mifflin when the tape reading cannot be real', () => {
    // A neck-bigger-than-waist tape error, or a typed 0, must not produce
    // a fat-free mass equal to bodyweight and a confident wrong answer.
    for (const bodyFatPct of [0, 1, 75, -5]) {
      expect(read({ bodyweightLb: 190, heightIn: 70, ageYears: 30, bodyFatPct, sex: 'male' }).model, `bf ${bodyFatPct}`)
        .toBe('mifflin-st-jeor')
    }
  })

  it('needs BOTH height and age before it will run Mifflin', () => {
    expect(read({ bodyweightLb: 190, heightIn: 70, sex: 'male' }).model).toBe('bodyweight')
    expect(read({ bodyweightLb: 190, ageYears: 30, sex: 'male' }).model).toBe('bodyweight')
    expect(read({ bodyweightLb: 190, heightIn: 70, ageYears: 30, sex: 'male' }).model).toBe('mifflin-st-jeor')
  })

  it('refuses heights and ages that are not a person', () => {
    for (const heightIn of [12, 200]) {
      expect(read({ bodyweightLb: 190, heightIn, ageYears: 30 }).model, `height ${heightIn}`).toBe('bodyweight')
    }
    for (const ageYears of [4, 130]) {
      expect(read({ bodyweightLb: 190, heightIn: 70, ageYears }).model, `age ${ageYears}`).toBe('bodyweight')
    }
  })
})

describe('the tape reading itself', () => {
  it('takes the median of the recent readings, never the newest alone', () => {
    // A sloppy 28 after two careful 20s must not move the number.
    expect(smoothBodyFat([20, 20, 28])).toBe(20)
    expect(smoothBodyFat([28, 20, 20])).toBe(20)
    // and only the last three count, so an old body is not still voting
    expect(smoothBodyFat([35, 35, 35, 20, 21, 20])).toBe(20)
  })

  it('returns a number somebody measured, not an average of two', () => {
    expect([20, 24]).toContain(smoothBodyFat([20, 24]))
    expect(smoothBodyFat([20, 24])).not.toBe(22)
  })

  it('has nothing to say when there is nothing usable', () => {
    expect(smoothBodyFat([])).toBeNull()
    expect(smoothBodyFat([0, 99, Number.NaN])).toBeNull()
  })

  it('expires on calendar age OR on weight drift, not just the date', () => {
    const bodyweightLb = 190
    expect(tapeIsFresh({ ageDays: 30, bodyweightLb })).toBe(true)
    expect(tapeIsFresh({ ageDays: 90, bodyweightLb })).toBe(false)
    // 30 days old but 15 lb ago is a different body
    expect(tapeIsFresh({ ageDays: 30, weightAtTapeLb: 175, bodyweightLb })).toBe(false)
    expect(tapeIsFresh({ ageDays: 30, weightAtTapeLb: 187, bodyweightLb })).toBe(true)
  })
})

describe('activity', () => {
  const known: BodyKnowledge = { bodyweightLb: 190, heightIn: 70, ageYears: 30, sex: 'male' }
  const pal = (sessions: number, movement?: DayMovement) => read(known, sessions, movement).pal!

  it('never grants a multiplier from a training log alone that needs a lab', () => {
    expect(pal(14, 'Always moving')).toBeLessThanOrEqual(PAL_CEILING)
    expect(pal(999, 'Always moving')).toBeLessThanOrEqual(PAL_CEILING)
  })

  it('rises with sessions and with how the day is spent', () => {
    expect(pal(0)).toBeLessThan(pal(4))
    expect(pal(4)).toBeLessThan(pal(6))
    expect(pal(4, 'Sitting')).toBeLessThan(pal(4, 'On my feet'))
    expect(pal(4, 'On my feet')).toBeLessThan(pal(4, 'Always moving'))
  })

  it('puts an unanswered movement question below the top of the band', () => {
    // People believe they move more than they do. An underestimate
    // self-corrects off the weight trend; an overestimate stalls a cut.
    expect(pal(4)).toBeLessThan(pal(4, 'Always moving'))
    expect(pal(4)).toBeGreaterThan(pal(4, 'Sitting'))
  })

  it('charges a session net of the resting energy already counted', () => {
    // An 86 kg hour at MET 5 costs (5-1) x 86, not 5 x 86, because
    // resting energy already paid for the first MET.
    const m = read(known, 4)
    const charged = m.kcal - m.restKcal
    expect(Math.abs(charged - 4 * kg(190))).toBeLessThanOrEqual(50)
    expect(charged).toBeLessThan(5 * kg(190))
  })

  it('reads the movement answer the onboarding question promised', () => {
    expect(dayMovementOf({ 'day-movement': 'Sitting' })).toBe('Sitting')
    expect(dayMovementOf({ 'day-movement': 'Always moving' })).toBe('Always moving')
    expect(dayMovementOf({ 'day-movement': 'Mostly sitting' })).toBeUndefined()
    expect(dayMovementOf({})).toBeUndefined()
    expect(dayMovementOf()).toBeUndefined()
  })
})

describe('maintenance', () => {
  it('adds a session only to the day it happens', () => {
    const m = read({ bodyweightLb: 190, heightIn: 70, ageYears: 30, bodyFatPct: 22, sex: 'male' }, 4)
    expect(m.kcal).toBeGreaterThan(m.restKcal)
    expect(Math.abs(m.kcal - m.restKcal - 4 * kg(190))).toBeLessThanOrEqual(50)
  })

  it('does not charge a session to somebody who trains zero days', () => {
    const m = read({ bodyweightLb: 190, heightIn: 70, ageYears: 30, sex: 'male' }, 0)
    expect(m.kcal).toBe(m.restKcal)
  })

  it('keeps today exactly for an athlete we know nothing else about', () => {
    // Nobody's calorie target moves without new information about them.
    const m = read({ bodyweightLb: 180, sex: 'male' }, 4)
    expect(m.model).toBe('bodyweight')
    expect(m.kcal).toBe(2700)
    expect(m.restKcal).toBe(2700)
    expect(m.pal).toBeNull()
    expect(m.restingKcal).toBeNull()
  })

  it('corrects the inflation the heuristic produces at high bodyweight', () => {
    // The whole reason the chain exists. A 320 lb man asking for help
    // losing weight was being told his maintenance was 4,800.
    const k: BodyKnowledge = { bodyweightLb: 320, heightIn: 72, ageYears: 38, sex: 'male' }
    const heuristic = bodyweightHeuristicKcal(320, 'male', 72)
    expect(heuristic).toBe(4875) // 4,800 plus the height nudge
    const m = read(k, 2)
    expect(m.model).toBe('mifflin-st-jeor')
    expect(m.kcal).toBeLessThan(heuristic - 1000)
    // and it lands inside the range R1 states for this persona, which is
    // the one row of that column architecture (a) can be checked against
    // without contradicting another row. See the note at the top.
    expect(m.restKcal).toBeGreaterThanOrEqual(2900)
    expect(m.restKcal).toBeLessThanOrEqual(3250)
  })

  it('always says what would sharpen it, and stops asking once it has it', () => {
    expect(read({ bodyweightLb: 190, heightIn: 70, ageYears: 30 }, 3).sharpenWith).toBe('tape')
    expect(read({ bodyweightLb: 190, heightIn: 70, ageYears: 30, bodyFatPct: 22 }, 3).sharpenWith).toBeNull()
    expect(read({ bodyweightLb: 190 }, 3).sharpenWith).toBe('height-and-age')
  })

  it('moves the right way with every input it reads', () => {
    const base: BodyKnowledge = { bodyweightLb: 190, heightIn: 70, ageYears: 30, sex: 'male' }
    const at = (k: Partial<BodyKnowledge>, sessions = 4) => read({ ...base, ...k }, sessions).kcal
    expect(at({ ageYears: 55 })).toBeLessThan(at({ ageYears: 25 }))
    expect(at({ heightIn: 64 })).toBeLessThan(at({ heightIn: 76 }))
    expect(at({ sex: 'female' })).toBeLessThan(at({ sex: 'male' }))
    expect(at({}, 2)).toBeLessThan(at({}, 6))
    // leaner body, same weight, burns more
    expect(at({ bodyFatPct: 30 })).toBeLessThan(at({ bodyFatPct: 12 }))
  })
})
