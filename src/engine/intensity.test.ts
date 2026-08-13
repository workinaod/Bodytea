import { describe, expect, it } from 'vitest'
import { CARDIO_ACTIVITIES, TRACKED_IDS, cardioActivity, metFor, trackingFor } from '../plan/cardio'
import { strideMiles } from '../platform/motion'
import { estKcal, estKcalFromMet } from './runs'
import {
  MIN_MINUTES_TO_JUDGE,
  MIN_STEPS_TO_JUDGE,
  cardioKcal,
  classifyIntensity,
  distanceSourceFor,
  intensityNote,
  stepDistanceMi,
  stepsPerHour,
  tracksSteps,
  usableHeightIn,
} from './intensity'

// ============================================================
// The point of this file is the second block: the research the
// bands were built from, replayed as assertions. If someone
// "tidies" a threshold, a measured soccer match stops reading as
// a soccer match and the test says so by name.
// ============================================================

const LB = 176 // ~80 kg, so MET math reads in round numbers

describe('the tracking table', () => {
  it('covers every activity, and nothing else', () => {
    expect([...TRACKED_IDS].sort()).toEqual([...CARDIO_ACTIVITIES.map((a) => a.id)].sort())
  })

  it('gives every step-tracked activity a band and a MET for each tier', () => {
    // Without these, classifyIntensity returns null forever and the
    // whole feature is dead code that still compiles.
    const broken = CARDIO_ACTIVITIES.filter((a) => trackingFor(a.id).steps).filter((a) => {
      const t = trackingFor(a.id)
      return !t.band || !t.met
    })
    expect(broken.map((a) => a.id)).toEqual([])
  })

  it('gives every steps-derived distance a stride', () => {
    const broken = CARDIO_ACTIVITIES.filter((a) => trackingFor(a.id).distance === 'steps').filter(
      (a) => trackingFor(a.id).stride === undefined,
    )
    expect(broken.map((a) => a.id)).toEqual([])
  })

  it('orders every band and every MET tier', () => {
    const wrong: string[] = []
    for (const a of CARDIO_ACTIVITIES) {
      const t = trackingFor(a.id)
      if (t.band && t.band.low >= t.band.high) wrong.push(`${a.id} band`)
      if (t.met && !(t.met.low <= t.met.standard && t.met.standard <= t.met.high)) {
        wrong.push(`${a.id} met`)
      }
    }
    expect(wrong).toEqual([])
  })

  it('never invents a MET outside what the activity already claimed', () => {
    // The mode chips are Compendium values. A measured tier is allowed
    // to pick between them, never to exceed them, or the app starts
    // paying calories for work no source says exists.
    const escaped: string[] = []
    for (const a of CARDIO_ACTIVITIES) {
      const t = trackingFor(a.id)
      if (!t.met || !a.modes) continue
      const ceiling = Math.max(a.met, ...a.modes.map((m) => m.met ?? a.met))
      const floor = Math.min(a.met, ...a.modes.map((m) => m.met ?? a.met))
      if (t.met.high > ceiling || t.met.low < floor) escaped.push(a.id)
    }
    expect(escaped).toEqual([])
  })

  it('brackets the published MET rather than replacing it', () => {
    // The number the activity already shipped has to sit inside its
    // own new band, or the band is describing a different sport.
    const wrong: string[] = []
    for (const a of CARDIO_ACTIVITIES) {
      const t = trackingFor(a.id)
      if (!t.met) continue
      if (a.met < t.met.low || a.met > t.met.high) wrong.push(a.id)
    }
    expect(wrong).toEqual([])
  })

  it('keeps the standard tier on the number a mode-less activity already used', () => {
    // Anything with no mode chips publishes exactly one MET, and it is
    // the moderate one. The standard tier has to BE that number, so a
    // normal session costs what it always cost.
    const drifted = CARDIO_ACTIVITIES.filter((a) => !a.modes).filter((a) => {
      const t = trackingFor(a.id)
      return t.met !== undefined && t.met.standard !== a.met
    })
    expect(drifted.map((a) => a.id)).toEqual([])
  })

  it('reports distance for everything it counts steps for, bar the rope', () => {
    // The rule, stated: if the phone can count your footfalls it can
    // say how far you moved, and it should. Jump rope is the one
    // exception and it is a real one, not a gap: a skipper lands ten
    // thousand times on the same square metre.
    const missing = CARDIO_ACTIVITIES.filter(
      (a) => trackingFor(a.id).steps && a.id !== 'jump-rope',
    ).filter((a) => trackingFor(a.id).distance === 'none')
    expect(missing.map((a) => a.id)).toEqual([])
  })

  it('keeps steps off the water, the wheels and the blades', () => {
    for (const id of ['swim', 'row-erg', 'bike', 'hockey', 'snow']) {
      expect(tracksSteps(id)).toBe(false)
    }
  })
})

describe('the research, replayed', () => {
  // Every case here is a real measured number from the literature in
  // plan/cardio.ts, converted at that sport's own stride. Each one
  // must land in the tier the sport is actually played at.

  const cases: { what: string; id: string; steps: number; minutes: number; tier: string }[] = [
    // Walking: the most replicated cadence finding there is. 100
    // steps/min is moderate, 130 is vigorous.
    { what: 'a stroll at 80 steps/min', id: 'walk', steps: 4800, minutes: 60, tier: 'low' },
    { what: 'moderate walking at 100 steps/min', id: 'walk', steps: 6000, minutes: 60, tier: 'standard' },
    { what: 'vigorous walking at 130 steps/min', id: 'walk', steps: 7800, minutes: 60, tier: 'high' },

    // Running cadence, held for an hour.
    { what: 'a shuffle at 130 steps/min', id: 'run', steps: 7800, minutes: 60, tier: 'low' },
    { what: 'a run at 170 steps/min', id: 'run', steps: 10200, minutes: 60, tier: 'high' },

    // Soccer: 7.8 km/90min amateur, 10.5 km/90min professional.
    { what: 'an amateur match, 5.2 km/hr', id: 'soccer', steps: 5784, minutes: 60, tier: 'standard' },
    { what: 'a professional match, 7.0 km/hr', id: 'soccer', steps: 7786, minutes: 60, tier: 'high' },
    { what: 'a kickaround', id: 'soccer', steps: 3000, minutes: 60, tier: 'low' },

    // Basketball: 4.5 km/hr of live full-court play.
    { what: 'running full court', id: 'basketball', steps: 7500, minutes: 60, tier: 'standard' },
    { what: 'shooting around', id: 'basketball', steps: 3500, minutes: 60, tier: 'low' },
    { what: 'a hard pickup run', id: 'basketball', steps: 8600, minutes: 60, tier: 'high' },

    // Tennis: ~3.2 km over a two-set singles match.
    { what: 'two sets of singles', id: 'tennis', steps: 6318, minutes: 78, tier: 'standard' },
    { what: 'hitting balls', id: 'tennis', steps: 2500, minutes: 60, tier: 'low' },

    // Pickleball: 3,322 steps/hr measured directly on 53 players,
    // doubles at a 2,791 median.
    { what: 'the measured average', id: 'pickleball', steps: 3322, minutes: 60, tier: 'standard' },
    { what: 'the measured doubles median', id: 'pickleball', steps: 2791, minutes: 60, tier: 'standard' },
    { what: 'competitive singles', id: 'pickleball', steps: 4500, minutes: 60, tier: 'high' },

    // Volleyball: 287-398 m per set indoors over a ~22 minute set,
    // which is 1,570 to 2,180 steps an hour at a volleyball stride.
    { what: 'the bottom of the measured range', id: 'volleyball', steps: 1570, minutes: 60, tier: 'standard' },
    { what: 'the top of the measured range', id: 'volleyball', steps: 2180, minutes: 60, tier: 'standard' },
    { what: 'a rec game with long rotations', id: 'volleyball', steps: 1200, minutes: 60, tier: 'low' },
    { what: 'beach, or a high-tempo gym', id: 'volleyball', steps: 2800, minutes: 60, tier: 'high' },
  ]

  for (const c of cases) {
    it(`reads ${c.what} as ${c.tier}`, () => {
      expect(classifyIntensity(c.id, c.steps, c.minutes)).toBe(c.tier)
    })
  }

  it('gives a distance long before it will judge an intensity', () => {
    // Laps in a garage: GPS sees nothing through four walls, so steps
    // are the only evidence there is. 80 of them is not enough to call
    // a session easy or all-out, but it is unambiguously some distance,
    // and refusing to say so is what left the tracker reading 0.00 mi
    // while somebody ran.
    expect(stepDistanceMi('run', 80, 70)).not.toBeNull()
    expect(stepDistanceMi('run', 80, 70) as number).toBeGreaterThan(0)
    expect(classifyIntensity('run', 80, 5)).toBeNull()
  })

  it('still refuses a handful of stray steps', () => {
    // A phone jostled in a bag is not a distance.
    expect(stepDistanceMi('run', 5, 70)).toBeNull()
  })

  it('grows with every step taken', () => {
    const a = stepDistanceMi('run', 100, 70) as number
    const b = stepDistanceMi('run', 400, 70) as number
    expect(b).toBeGreaterThan(a)
  })

  it('turns basketball steps back into the distance the literature measured', () => {
    // 7,500 steps of full-court play should come back out as the
    // ~4.5 km per hour that tracking studies report, not as the 5.7 km
    // a walking stride would claim.
    const mi = stepDistanceMi('basketball', 7500, 69)
    expect(mi).not.toBeNull()
    const km = (mi as number) * 1.609
    expect(km).toBeGreaterThan(4.0)
    expect(km).toBeLessThan(5.0)
  })

  it('turns volleyball steps back into a third of a kilometre per set', () => {
    // 287-398 m per set, and a set is about 22 minutes. The midpoint
    // of the measured band, taken over one set, has to land back
    // inside the window it came from. The first version of this test
    // did not: the band had been written off a hand-waved "1.2 km an
    // hour" that nothing in the literature said, and it put a set at
    // 434 m. The band moved, not the assertion.
    const perSet = Math.round(((1570 + 2180) / 2) * (22 / 60))
    const metres = (stepDistanceMi('volleyball', perSet, 69) as number) * 1609
    expect(metres).toBeGreaterThan(287)
    expect(metres).toBeLessThan(398)
  })

  it('turns a soccer match back into the kilometres it was measured at', () => {
    const km = (stepDistanceMi('soccer', 8676, 69) as number) * 1.609
    expect(km).toBeGreaterThan(7.0)
    expect(km).toBeLessThan(8.5)
  })
})

describe('classification', () => {
  it('never drops a tier when the same session has more steps in it', () => {
    // Monotonicity: the one property the whole feature rests on.
    const rank = { low: 0, standard: 1, high: 2 }
    for (const a of CARDIO_ACTIVITIES.filter((x) => trackingFor(x.id).band)) {
      let last = -1
      for (let steps = MIN_STEPS_TO_JUDGE; steps <= 20000; steps += 137) {
        const tier = classifyIntensity(a.id, steps, 60)
        if (tier === null) continue
        expect(rank[tier]).toBeGreaterThanOrEqual(last)
        last = rank[tier]
      }
    }
  })

  it('reads the rate, not the raw count', () => {
    // Half the steps in half the time is the same session.
    expect(classifyIntensity('basketball', 8600, 60)).toBe('high')
    expect(classifyIntensity('basketball', 4300, 30)).toBe('high')
    // The same count over three times as long is not.
    expect(classifyIntensity('basketball', 8600, 180)).toBe('low')
  })

  it('refuses to judge a session too short to have a rate', () => {
    expect(classifyIntensity('basketball', 900, MIN_MINUTES_TO_JUDGE - 1)).toBeNull()
    expect(classifyIntensity('basketball', 900, MIN_MINUTES_TO_JUDGE)).not.toBeNull()
  })

  it('refuses to judge when the phone was clearly not on the athlete', () => {
    // 40 steps in an hour of basketball is a phone in a bag, and
    // calling that "low intensity basketball" would be a lie about
    // the athlete rather than about the phone.
    expect(classifyIntensity('basketball', 40, 60)).toBeNull()
    expect(classifyIntensity('basketball', MIN_STEPS_TO_JUDGE - 1, 60)).toBeNull()
    expect(classifyIntensity('basketball', undefined, 60)).toBeNull()
  })

  it('says nothing about activities the pedometer cannot see', () => {
    for (const id of ['swim', 'bike', 'row-erg', 'hockey']) {
      expect(classifyIntensity(id, 9000, 60)).toBeNull()
    }
  })

  it('explains itself in one line, or not at all', () => {
    const note = intensityNote('basketball', 8600, 60) as string
    expect(note).toContain('8,600')
    expect(note).toContain('basketball')
    expect(note).not.toContain('—')
    expect(intensityNote('swim', 8600, 60)).toBeNull()
  })
})

describe('distance', () => {
  it('is blank wherever a number would be theatre', () => {
    // No ground is covered in a boxing ring, a lane, an erg or a
    // skipping rope. A mileage figure for any of them is invented.
    for (const id of ['jump-rope', 'swim', 'row-erg', 'hockey', 'snow']) {
      expect(distanceSourceFor(id)).toBe('none')
      expect(stepDistanceMi(id, 9000, 69)).toBeNull()
    }
    // Skiing rides back up, and a lift at 10 mph clears the teleport
    // filter, so a GPS day total is about double what was actually
    // skied. Nothing beats a number wrong by half.
  })

  it('uses GPS where GPS works and steps where it does not', () => {
    // A pickleball court is 44 feet long, which is inside GPS error.
    for (const id of ['basketball', 'tennis', 'pickleball', 'volleyball']) {
      expect(distanceSourceFor(id)).toBe('steps')
    }
    for (const id of ['run', 'walk', 'hike', 'bike', 'soccer', 'football']) {
      expect(distanceSourceFor(id)).toBe('gps')
    }
  })

  it('agrees with the pedometer that already ships', () => {
    // platform/motion.ts converts steps to miles for the treadmill
    // case. If these two ever disagree, one screen says 3.1 miles and
    // another says 4.4 for the same walk.
    for (const [id, running] of [
      ['walk', false],
      ['run', true],
    ] as const) {
      const mine = stepDistanceMi(id, 10000, 71) as number
      const theirs = 10000 * strideMiles(71, running)
      expect(mine).toBeCloseTo(theirs, 2)
    }
  })

  it('scales with height', () => {
    const short = stepDistanceMi('basketball', 8000, 62) as number
    const tall = stepDistanceMi('basketball', 8000, 79) as number
    expect(tall).toBeGreaterThan(short)
  })

  it('falls back to an average adult when height is missing or absurd', () => {
    const base = stepDistanceMi('basketball', 8000, 69)
    expect(stepDistanceMi('basketball', 8000, undefined)).toBe(base)
    expect(stepDistanceMi('basketball', 8000, 3)).toBe(base)
    expect(stepDistanceMi('basketball', 8000, 400)).toBe(base)
    expect(usableHeightIn(undefined)).toBe(69)
  })

  it('never claims a court sport covered a marathon', () => {
    // The bug this exists to catch: converting court steps at a
    // walking stride. An hour of volleyball at a walking stride reads
    // as 1.7 miles of travel, which is not what happened.
    const hour = stepDistanceMi('volleyball', 2400, 69) as number
    expect(hour).toBeLessThan(1.0)
  })
})

describe('calories', () => {
  it('bills the measured tier, not the claimed one', () => {
    const easy = cardioKcal({ activityId: 'basketball', minutes: 60, bodyweightLb: LB, steps: 3000 })
    const hard = cardioKcal({ activityId: 'basketball', minutes: 60, bodyweightLb: LB, steps: 9000 })
    expect(easy.intensity).toBe('low')
    expect(hard.intensity).toBe('high')
    expect(hard.kcal).toBeGreaterThan(easy.kcal)
    expect(easy.basis).toBe('steps')
  })

  it('lets a mode raise the number but never lower it', () => {
    // Sand, hills and body armour are real costs no step counter
    // sees. A phone on a bench is the opposite problem. Taking the
    // higher of the two is the only rule that survives both.
    const beach = cardioKcal({
      activityId: 'volleyball',
      minutes: 60,
      bodyweightLb: LB,
      steps: 1870, // a standard rate: sand slows you down, it does not stop you
      mode: 'beach', // 8.0 MET, and the sand is real
    })
    expect(beach.intensity).toBe('standard')
    expect(beach.met).toBe(8.0)
    expect(beach.basis).toBe('mode')

    const benched = cardioKcal({
      activityId: 'basketball',
      minutes: 60,
      bodyweightLb: LB,
      steps: 3000, // low by rate: the phone was courtside
      mode: 'games', // 8.0 MET, and the athlete was not
    })
    expect(benched.met).toBe(8.0)
  })

  it('lets the measurement raise a modest claim', () => {
    const under = cardioKcal({
      activityId: 'basketball',
      minutes: 60,
      bodyweightLb: LB,
      steps: 9000,
      mode: 'shooting', // claimed 4.5
    })
    expect(under.met).toBe(8.0)
    expect(under.basis).toBe('steps')
  })

  it('lands exactly where it always did when there are no steps', () => {
    // Nothing already in anyone's history changes value.
    for (const a of CARDIO_ACTIVITIES) {
      for (const mode of [null, ...(a.modes ?? []).map((m) => m.id)]) {
        const got = cardioKcal({ activityId: a.id, minutes: 45, bodyweightLb: LB, mode })
        const was = estKcalFromMet(mode ? metFor(a.id, mode) : cardioActivity(a.id).met, 45, LB)
        expect(got.kcal).toBe(was)
        expect(got.intensity).toBeNull()
      }
    }
  })

  it('stays inside what an activity with mode chips already claims', () => {
    // Where the activity publishes a range of its own, a measured tier
    // may pick inside it and never step outside it.
    const escaped: string[] = []
    for (const a of CARDIO_ACTIVITIES) {
      if (!a.modes) continue
      const ceiling = Math.max(a.met, ...a.modes.map((m) => m.met ?? a.met))
      for (const steps of [0, 500, 3000, 6000, 9000, 25000]) {
        const { met } = cardioKcal({ activityId: a.id, minutes: 60, bodyweightLb: LB, steps })
        if (met > ceiling) escaped.push(`${a.id} @ ${steps} steps billed ${met}`)
      }
    }
    expect(escaped).toEqual([])
  })

  it('agrees with the speed-based estimate the GPS tracker already uses', () => {
    // Running, walking and hiking now have two calorie paths: speed
    // when the satellites measured the route, steps when they did not.
    // If the two disagree the same hour is worth different numbers
    // depending on whether the phone had a view of the sky.
    for (const [id, mph] of [
      ['run', 6.0],
      ['walk', 3.0],
      ['hike', 3.0],
    ] as const) {
      const met = trackingFor(id).met
      expect(met).toBeDefined()
      const bySpeed = estKcal(id, mph, 3600, LB)
      expect(bySpeed).toBeGreaterThanOrEqual(estKcalFromMet(met!.low, 60, LB))
      expect(bySpeed).toBeLessThanOrEqual(estKcalFromMet(met!.high, 60, LB))
    }
  })

  it('scales with time and bodyweight, and stops at zero', () => {
    const half = cardioKcal({ activityId: 'soccer', minutes: 30, bodyweightLb: LB, steps: 3000 })
    const full = cardioKcal({ activityId: 'soccer', minutes: 60, bodyweightLb: LB, steps: 6000 })
    // To the rounding: two half-hours and one hour are the same work.
    expect(Math.abs(full.kcal - half.kcal * 2)).toBeLessThanOrEqual(1)
    const heavy = cardioKcal({ activityId: 'soccer', minutes: 60, bodyweightLb: 240, steps: 6000 })
    expect(heavy.kcal).toBeGreaterThan(full.kcal)
    expect(cardioKcal({ activityId: 'soccer', minutes: 0, bodyweightLb: LB, steps: 6000 }).kcal).toBe(0)
  })

  it('never returns a number a human could not burn', () => {
    // Sanity ceiling: nobody burns 1,500 calories in an hour of
    // pickleball no matter what the accelerometer saw.
    for (const a of CARDIO_ACTIVITIES) {
      const { kcal } = cardioKcal({ activityId: a.id, minutes: 60, bodyweightLb: 300, steps: 30000 })
      expect(kcal).toBeGreaterThan(0)
      expect(kcal).toBeLessThan(1900)
    }
  })
})

describe('stepsPerHour', () => {
  it('is a rate, and survives a zero', () => {
    expect(stepsPerHour(6000, 60)).toBe(6000)
    expect(stepsPerHour(3000, 30)).toBe(6000)
    expect(stepsPerHour(1000, 10)).toBe(6000)
    expect(stepsPerHour(6000, 0)).toBe(0)
  })
})

describe('a combat round', () => {
  it('covers ground, and not much of it', () => {
    // A fighter in stance moves in inches. An hour of hard work is
    // somewhere under a mile of actual travel, and a number near a
    // walking stride would report a boxing round as a stroll across a
    // car park.
    const mi = stepDistanceMi('combat', 4000, 69) as number
    expect(mi).not.toBeNull()
    expect(mi).toBeGreaterThan(0.5)
    expect(mi).toBeLessThan(1.2)
    // Shorter per step than the smallest court in the table.
    expect(stepDistanceMi('combat', 5000, 69)!).toBeLessThan(stepDistanceMi('pickleball', 5000, 69)!)
  })

  it('still stays out of lifetime mileage', async () => {
    // Ground covered on a mat is real and it is not travel, same as
    // every court sport. It has its own row; it does not join the hikes.
    const { travelMiles } = await import('./activityLog')
    expect(travelMiles({ activityId: 'combat', miles: 0.9 })).toBe(0)
  })
})
