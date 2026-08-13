import { describe, expect, it } from 'vitest'
import {
  consistencyStages,
  fatLossPctPerWeek,
  gainPctPerWeek,
  MAX_ETA_WEEKS,
  NOISE_FLOOR,
  runStages,
  STAGE_DECAY,
  stageId,
  strengthLbPerWeek,
  strengthStages,
  TRACKS_FOR_GOAL,
  vertInPerWeek,
  vertStages,
  weeksPerLoadStep,
  weeksToLongRun,
  weightStages,
} from './milestones'
import type { Goal } from '../types'

// ============================================================
// The rate tables ARE the product.
//
// A decimal-place typo in any of them ships a friendly progress
// bar promising +80 lb on a squat in ten weeks, and the person
// who believes it quits in week six when it does not happen.
// Nothing else in this app can be wrong in a way that costs
// somebody a year, so the bounds below are deliberately hard
// numbers rather than "is a number".
// ============================================================

describe('what a body can actually do in a week', () => {
  it('never promises fat loss faster than the evidence supports', () => {
    // Above ~1 %/wk the loss stops being fat. That is the ceiling for
    // ANY body composition, including someone with a lot to lose.
    for (const bf of [null, 45, 35, 30, 25, 20, 15, 12, 8]) {
      const pct = fatLossPctPerWeek(bf)
      expect(pct).toBeGreaterThan(0)
      expect(pct).toBeLessThanOrEqual(0.01)
    }
  })

  it('slows the rate as the athlete gets leaner, which is the actual mechanism', () => {
    // Fat available to mobilise sets the ceiling, so the last ten pounds
    // genuinely take longer than the first thirty. This is not a
    // motivational framing, it is why the curve bends.
    expect(fatLossPctPerWeek(35)).toBeGreaterThan(fatLossPctPerWeek(25))
    expect(fatLossPctPerWeek(25)).toBeGreaterThan(fatLossPctPerWeek(15))
    expect(fatLossPctPerWeek(15)).toBeGreaterThan(fatLossPctPerWeek(9))
  })

  it('does not scale fat loss by training age, because leanness governs it', () => {
    // A 300 lb beginner and a 300 lb ten-year lifter lose at the same
    // rate. Wiring training age in here would be a plausible-looking
    // mistake, so the signature makes it impossible.
    expect(fatLossPctPerWeek.length).toBe(1)
  })

  it('keeps muscle gain at the rate muscle is actually built', () => {
    // Aragon & Schoenfeld: roughly 1-1.5 % of bodyweight per MONTH for a
    // true beginner, halving per stage. Past 0.5 %/wk a surplus is fat.
    for (const age of ['new', 'returning', 'trained'] as const) {
      const pct = gainPctPerWeek(age)
      expect(pct).toBeGreaterThanOrEqual(0.0025)
      expect(pct).toBeLessThanOrEqual(0.005)
    }
    expect(gainPctPerWeek('new')).toBeGreaterThan(gainPctPerWeek('trained'))
  })

  it('a 180 lb beginner gains under a pound a week, not three', () => {
    // The specific number, because this is the one people get told
    // wrong. 0.5 % of 180 is 0.9 lb — and that is the OPTIMISTIC end.
    expect(180 * gainPctPerWeek('new')).toBeLessThan(1)
    expect(180 * gainPctPerWeek('trained')).toBeLessThan(0.7)
  })
})

describe('strength, projected from the plan the app actually prescribes', () => {
  const base = { loadStepLb: 10, repLow: 6, repHigh: 8, sessionsPerWeek: 2, age: 'new' as const }

  it('costs one wrap per trip through the rep range', () => {
    // Double progression: 6 → 7 → 8 reps, THEN add load. Three sessions
    // of work, at two sessions a week, before the bar moves.
    const w = weeksPerLoadStep({ repLow: 6, repHigh: 8, sessionsPerWeek: 2, age: 'new' })
    expect(w).toBeGreaterThan(1.5)
    expect(w).toBeLessThan(3.5)
  })

  it('pays the deload tax, because week four does not advance anything', () => {
    // Sets halve on week 4 of every block. Four weeks of calendar buy
    // three weeks of progression, and a model that ignores that is
    // 33 % fast on every single projection it makes.
    const w = weeksPerLoadStep({ repLow: 6, repHigh: 8, sessionsPerWeek: 2, age: 'new' })
    const noTax = ((8 - 6 + 1) / 2) * 1.15
    expect(w).toBeCloseTo(noTax * (4 / 3), 5)
  })

  it('slows down as the athlete runs out of beginner gains', () => {
    const beginner = strengthLbPerWeek({ ...base, age: 'new' })
    const returning = strengthLbPerWeek({ ...base, age: 'returning' })
    const trained = strengthLbPerWeek({ ...base, age: 'trained' })
    expect(beginner).toBeGreaterThan(returning)
    expect(returning).toBeGreaterThan(trained)
  })

  it('never projects a year of progress nobody has ever had', () => {
    // The hard one. Unbounded double progression says a beginner
    // squatting twice a week adds ~170 lb a year, which is roughly true
    // FOR A BEGINNER and absurd for anybody else. The ceiling is what
    // stops the mechanics from running away.
    const yearly = (age: 'new' | 'returning' | 'trained') =>
      strengthLbPerWeek({ ...base, age, sessionsPerWeek: 4 }) * 52
    expect(yearly('new')).toBeLessThanOrEqual(210)
    expect(yearly('returning')).toBeLessThanOrEqual(105)
    // A trained lifter adding 40 lb to a main lift in a year is a good
    // year. Anything over that is a supplement advert.
    expect(yearly('trained')).toBeLessThanOrEqual(40)
  })

  it('cannot promise faster than the plan actually serves the lift', () => {
    // The self-consistency property, and the reason this is derived
    // from loadStepLb rather than a table: squatting once a week cannot
    // project the same rate as squatting three times a week.
    const once = strengthLbPerWeek({ ...base, sessionsPerWeek: 1 })
    const thrice = strengthLbPerWeek({ ...base, sessionsPerWeek: 3 })
    expect(thrice).toBeGreaterThan(once)
  })
})

describe('running, where the rate is a stress fracture risk', () => {
  it('builds a long run at a rate that is not how people get hurt', () => {
    // Compounding 10 %/wk across a block is +33 %, which is how people
    // collect tibial stress reactions. ~8 %/wk plus a cutback week.
    const w = weeksToLongRun(3, 13.1)
    expect(w).toBeGreaterThanOrEqual(16)
    expect(w).toBeLessThanOrEqual(32)
  })

  it('agrees with how long a published half-marathon plan actually is', () => {
    // Couch-to-half plans run 12-20 weeks from a 3-mile base. Landing
    // outside that band means the model is wrong, not brave.
    const w = weeksToLongRun(3, 13.1)
    expect(w).toBeGreaterThan(12)
  })

  it('says nothing when there is nothing to build', () => {
    expect(weeksToLongRun(13.1, 13.1)).toBe(0)
    expect(weeksToLongRun(20, 13.1)).toBe(0)
  })
})

describe('jumping, the goal with the biggest gap between sold and real', () => {
  it('never approaches the numbers jump programmes advertise', () => {
    // Meta-analytic plyometric gains are ~3-8 cm over 8-12 weeks in the
    // UNTRAINED. That is 1.5-3 inches. "+10 inches in 12 weeks" is a
    // sales page, and this app does not get to print it.
    const twelveWeeks = vertInPerWeek('new') * 12
    expect(twelveWeeks).toBeLessThanOrEqual(3)
    expect(twelveWeeks).toBeGreaterThan(1)
    expect(vertInPerWeek('trained') * 52).toBeLessThanOrEqual(3)
  })
})

describe('the stages themselves', () => {
  it('gives every stage an id that survives the athlete moving', () => {
    // THE correctness property. Targets are absolute, so a rising
    // anchor drops stages off the bottom and never renames one. If an id
    // could change, a persisted hit would orphan and the stage would
    // silently un-achieve — a path that walks backwards.
    const early = strengthStages('bench', 'Bench', 95, 400)
    const later = strengthStages('bench', 'Bench', 200, 400)
    const commonEarly = early.filter((r) => r.target >= 225).map(stageId)
    const commonLater = later.filter((r) => r.target >= 225).map(stageId)
    expect(commonEarly).toEqual(commonLater)
  })

  it('keeps ids stable for bodyweight in both directions', () => {
    const cutting = weightStages(220, 180).filter((r) => r.target <= 200).map(stageId)
    const regained = weightStages(210, 180).filter((r) => r.target <= 200).map(stageId)
    expect(cutting).toEqual(regained)
  })

  it('builds the id out of the stable fields ONLY', () => {
    // Pinned exactly, because the danger is not a wrong id — it is an id
    // built from something that gets recomputed. `detail` in particular
    // is chosen by position in the ladder, so it moves when the anchor
    // moves; folding it into the id would orphan every persisted hit the
    // first time somebody got stronger.
    const [r] = strengthStages('bench-press', 'Bench', 180, 190)
    expect(stageId(r)).toBe('strength:topSetLb:bench-press:1850')
    const [w] = weightStages(203, 180)
    expect(stageId(w)).toBe('body:weightLb:-:2000')
  })

  it('keeps the id when the SAME target arrives with different copy', () => {
    // The stage detail cycles down the ladder, so the identical target
    // carries different prose depending on where the athlete started.
    // Same stage, same id, whatever it says underneath.
    const early = weightStages(230, 180).find((r) => r.target === 200)!
    const late = weightStages(211, 180).find((r) => r.target === 200)!
    expect(early.detail).not.toBe(late.detail)
    expect(stageId(early)).toBe(stageId(late))
  })

  it('counts in plates, because that is how lifters count', () => {
    const labels = strengthStages('bench', 'Bench', 100, 300).map((r) => r.target)
    expect(labels).toContain(135)
    expect(labels).toContain(225)
    expect(labels).not.toContain(137)
  })

  it('never puts a stage behind where the athlete already is', () => {
    for (const r of strengthStages('bench', 'Bench', 185, 400)) expect(r.target).toBeGreaterThan(185)
    for (const r of runStages(6.2, 26.2)) expect(r.target).toBeGreaterThan(6.2)
    for (const r of vertStages(12, 24)) expect(r.target).toBeGreaterThan(12)
    for (const r of weightStages(200, 180)) expect(r.target).toBeLessThan(200)
  })

  it('gives the jump goal landmarks, not inches', () => {
    // "28 inches" means nothing standing in a gym. "Touch the rim"
    // means everything, and you can go try it tonight.
    const labels = vertStages(0, 24).map((r) => r.label)
    expect(labels).toContain('Touch the rim')
    expect(labels).toContain('Dunk')
    expect(labels.join(' ')).not.toMatch(/\d+ in/)
  })

  it('gives the running goal real events, not round numbers', () => {
    const labels = runStages(0, 26.2).map((r) => r.label)
    expect(labels).toContain('5K')
    expect(labels).toContain('Half marathon')
    expect(labels).not.toContain('7 miles')
  })

  it('never runs a bodyweight ladder away forever', () => {
    // A guard against the loop, not a design statement: a bad anchor
    // must not build ten thousand stages.
    expect(weightStages(200, -500).length).toBeLessThanOrEqual(41)
  })
})

describe('every goal gets a climb, and more than one strand of it', () => {
  const GOALS: Goal[] = ['vertical', 'speed', 'muscle', 'strength', 'lean', 'general', 'endurance']

  it('covers all seven goals', () => {
    for (const g of GOALS) expect(TRACKS_FOR_GOAL[g]?.length ?? 0).toBeGreaterThan(0)
  })

  it('never leaves a goal on a single track', () => {
    // One track is one number, and one number sulking greys out the
    // whole board. A lean athlete whose scale stalls for a fortnight
    // still needs to watch something move.
    for (const g of GOALS) expect(TRACKS_FOR_GOAL[g].length).toBeGreaterThanOrEqual(2)
  })

  it('puts consistency on every single one', () => {
    // The only track a brand-new account can score on day one, and the
    // one that actually predicts whether the others ever happen.
    for (const g of GOALS) expect(TRACKS_FOR_GOAL[g]).toContain('consistency')
  })

  it('gives a brand-new account real stages with no data at all', () => {
    const stages = consistencyStages(0)
    expect(stages.length).toBeGreaterThan(4)
    // Nothing here needs a weigh-in, a lift or a measurement.
    for (const r of stages) expect(['sessions', 'streakDays']).toContain(r.metric)
  })
})

describe('the guards that stop an estimate becoming a claim', () => {
  it('refuses to project past the point a projection means anything', () => {
    expect(MAX_ETA_WEEKS).toBeLessThanOrEqual(104)
  })

  it('keeps a noise floor on every metric a person measures by hand', () => {
    // A bathroom scale swings two pounds on hydration; a chalk rim
    // touch is good to half an inch. Below the floor an ETA is
    // arithmetic on noise.
    expect(NOISE_FLOOR.weightLb).toBeGreaterThan(0)
    expect(NOISE_FLOOR.vertIn).toBeGreaterThan(0)
    expect(NOISE_FLOOR.waistIn).toBeGreaterThan(0)
  })

  it('makes later stages further away than a straight line says', () => {
    // A line drawn through a novice's hot first block goes straight
    // through the plateau every one of them hits.
    expect(STAGE_DECAY).toBeLessThan(1)
    expect(STAGE_DECAY).toBeGreaterThan(0.5)
  })
})
