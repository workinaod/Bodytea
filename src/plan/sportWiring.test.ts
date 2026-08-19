import { describe, expect, it } from 'vitest'
import { generatePlan, type OnboardingAnswers } from './generator'
import { deepGoalStrategy } from './strategy'
import { buildNutrition } from './generator'
import { positionOf, qualitiesForSport, SPORTS, sportOf } from './followups'
import { NO_SPORT_PROFILE, profileForSport, SPORT_PROFILES, weightFor } from './sportProfiles'
import { bySportTransfer } from './sportPlan'
import { MOVEMENT } from './movement'
import type { AthleticQuality } from './athletic'
import { QUALITY_LABELS } from './athletic'
import type { Joint } from './movement'

// ============================================================
// R11 measured the app's worst dead wire and it was not close.
//
// `sport`, `sport-role`, `sport-level` and `in-season` are all asked at
// onboarding. A grep of the whole repo returned ZERO production call
// sites for any of them: `sportOf` was exported and called from nowhere
// at all, not even from a test, and `SPORT_QUALITIES` was read only by
// a test that checked the table was well formed. The question's own
// informs string calls sport "the biggest single lever there is", and
// answering it moved nothing.
//
// The test that makes this job real is the first one: two athletes
// identical but for their sport get different plans. Run it against the
// generator as it stood a commit ago and it fails.
// ============================================================

function athlete(over: Partial<OnboardingAnswers> = {}): OnboardingAnswers {
  return {
    goal: 'general',
    goalStatement: 'be a better athlete',
    customTargets: [],
    daysPerWeek: 4,
    equipProfile: 'gym',
    extraEquip: [],
    experience: 'returning',
    bodyweightLb: 180,
    skipMeals: true,
    ...over,
  }
}

/** Every exercise the booklet can put in front of somebody. */
function picks(a: OnboardingAnswers): string[] {
  const plan = generatePlan(a).plan
  const out = new Set<string>()
  for (const t of Object.values(plan.templates)) {
    for (const e of t.entries) {
      if (e.entry === 'fixed') out.add(e.exerciseId)
      else if (e.entry === 'ab') {
        out.add(e.a.exerciseId)
        out.add(e.b.exerciseId)
      } else {
        for (const b of [1, 2, 3] as const) {
          const id = plan.slots?.[b]?.[e.slot]
          if (id) out.add(id)
        }
      }
    }
  }
  return [...out].sort()
}

describe('the answer reaches the plan', () => {
  it('gives two sports two different plans', () => {
    // R11's F19, and the reason the whole job exists. A volleyball
    // player and a distance runner want opposite things out of a leg
    // day, and until this commit they got the same booklet.
    const volleyball = picks(athlete({ goalAnswers: { sport: 'Volleyball' } }))
    const running = picks(athlete({ goalAnswers: { sport: 'Running' } }))
    expect(volleyball).not.toEqual(running)
  })

  it('does NOT yet give two positions two different plans, and that is the honest state', () => {
    // R11's F20 asks for this and this slice cannot deliver it. The
    // position weights merge correctly (asserted below) but they only
    // reach the athlete through the strength pools, and no barbell lift
    // in POOLS transfers to reactive-agility or force-absorption. What
    // separates a keeper from a forward is DRILL selection out of the
    // athletic library, which is R11's step 4 and is not this commit.
    //
    // Pinned rather than left implied: the day somebody wires quality
    // slots to the ATHLETIC table this test fails and points them here,
    // instead of leaving them to rediscover the gap the way R11 did.
    const keeper = picks(athlete({ goalAnswers: { sport: 'Soccer', 'sport-role': 'Keeper' } }))
    const forward = picks(athlete({ goalAnswers: { sport: 'Soccer', 'sport-role': 'Forward' } }))
    expect(keeper).toEqual(forward)
    // The half that DOES work: the weights genuinely differ.
    expect(weightFor(profileForSport('Soccer', 'Keeper'), 'max-velocity')).toBe(0)
    expect(weightFor(profileForSport('Soccer', 'Forward'), 'max-velocity')).toBe(3)
  })

  it('counts the sports the strength pools cannot yet tell apart', () => {
    // A measured number, not a claim. Re-ranking barbell pools is a real
    // lever and a narrow one: it can only move a plan when some lift in
    // the pool transfers to something the sport weights. For these two
    // it does not, so their booklet is the no-sport booklet.
    //
    // This list SHRINKS as R11's later steps land. If it grows, a sport
    // profile lost its teeth.
    const none = JSON.stringify(generatePlan(athlete()).plan.slots?.[1])
    const unmoved = Object.keys(SPORT_PROFILES).filter(
      (s) => JSON.stringify(generatePlan(athlete({ goalAnswers: { sport: s } })).plan.slots?.[1]) === none,
    )
    expect(unmoved).toEqual(['Tennis', 'Running'])
  })

  it('changes nothing at all for somebody who named no sport', () => {
    // The golden snapshot caught this one live: handing the general
    // athletic base to an athlete who never mentioned a sport reordered
    // their press slot, so an answer nobody gave changed a plan. A sport
    // the app does not KNOW is a different case and still gets the base.
    expect(picks(athlete())).toEqual(picks(athlete({ goalAnswers: { goal: 'general' } })))
    expect(weightFor(NO_SPORT_PROFILE, 'acceleration')).toBe(0)
    expect(qualitiesForSport(null)).toEqual([])
  })

  it('switches on the practice machinery that was already written', () => {
    // resolveDay has read sportMode since long before this: ballDates
    // suppress scheduled conditioning and raise two banners. The only
    // place 'ball' was ever set was the owner's own preset.
    expect(generatePlan(athlete({ goalAnswers: { sport: 'Basketball' } })).plan.sportMode).toBe('ball')
    expect(generatePlan(athlete({ goalAnswers: { sport: 'Golf' } })).plan.sportMode).toBe('generic')
    expect(generatePlan(athlete()).plan.sportMode).toBe('generic')
  })
})

describe('the bridge between the two dead halves', () => {
  it('promotes the lift that feeds the sport, out of a pool that has one', () => {
    // `MOVEMENT.transfer` is declared 52 times in the catalog and was
    // read by exactly one test before this. Here is it deciding something.
    const jumpy = Object.keys(MOVEMENT).filter((id) => MOVEMENT[id].transfer?.includes('vertical-power'))
    expect(jumpy.length, 'no lift in the catalog claims to feed vertical power').toBeGreaterThan(1)
    const hammy = Object.keys(MOVEMENT).filter(
      (id) => MOVEMENT[id].transfer?.includes('sprint-hamstring') && !MOVEMENT[id].transfer?.includes('vertical-power'),
    )
    expect(hammy.length, 'no lift claims to feed the sprinting hamstring').toBeGreaterThan(0)
    // Same two lifts, two sports, two answers. Volleyball weights
    // vertical-power at 3 and the hamstring at nothing; soccer is the
    // mirror, and the hamstring is its signature injury.
    const pool = [hammy[0], jumpy[0]]
    expect(bySportTransfer(pool, profileForSport('Volleyball'))[0]).toBe(jumpy[0])
    expect(bySportTransfer(pool, profileForSport('Soccer'))[0]).toBe(hammy[0])
    // And a profile with no opinion leaves the pool exactly as it was.
    expect(bySportTransfer(pool, NO_SPORT_PROFILE)).toEqual(pool)
  })

  it('counts the lead qualities the strength catalog cannot reach', () => {
    // R11's guard 4, and it tells the truth immediately: `transfer` is
    // declared on 52 movements and between them they name only twelve
    // qualities. Every quality below is something a sport LEADS on at
    // weight 3 and no barbell lift in the catalog claims to feed, so
    // re-ranking the strength pools can never serve it. Golf is the
    // starkest: rotation is the entire sport and the bridge does not
    // reach it.
    //
    // These are served by DRILLS out of the athletic library, which is
    // R11's step 4. This list shrinks when that lands, or when somebody
    // adds a transfer tag to a lift that has earned one.
    const reachable = new Set(Object.values(MOVEMENT).flatMap((m) => m.transfer ?? []))
    const unreachable = new Set<string>()
    for (const p of Object.values(SPORT_PROFILES)) {
      for (const [q, w] of Object.entries(p.weights)) {
        if (w === 3 && !reachable.has(q as AthleticQuality)) unreachable.add(q)
      }
    }
    expect([...unreachable].sort()).toEqual([
      'deceleration',
      'elastic-reactive',
      'force-absorption',
      'max-velocity',
      'reactive-agility',
      'rotational-power',
      'sprint-mechanics',
    ])
  })

  it('promotes, and does not rewrite', () => {
    const pool = ['back-squat', 'leg-press', 'goblet-squat']
    // A profile with no opinion leaves the pool exactly as it found it.
    expect(bySportTransfer(pool, NO_SPORT_PROFILE)).toEqual(pool)
    // And whatever it promotes, it keeps every candidate.
    const reordered = bySportTransfer(pool, profileForSport('Basketball'))
    expect([...reordered].sort()).toEqual([...pool].sort())
  })
})

describe('every profile is a whole one', () => {
  const REAL = SPORTS.filter((s) => s !== 'Something else')

  it('knows every sport it offers, and offers every sport it knows', () => {
    for (const s of REAL) expect(SPORT_PROFILES[s], `${s} has no profile`).toBeTruthy()
    for (const s of Object.keys(SPORT_PROFILES)) expect(REAL, `${s} is not offered`).toContain(s)
  })

  it('says what each sport leads on and what it does not want', () => {
    // A weight of 0 is an instruction, not an absence, and it is the
    // half an ordered string[] could never express. Requiring one per
    // sport is what stops a profile being a list with numbers glued on.
    for (const s of REAL) {
      const p = SPORT_PROFILES[s]
      const w = Object.values(p.weights)
      expect(w.filter((x) => x === 3).length, `${s} leads on nothing`).toBeGreaterThan(0)
      // The zero may live on a position instead of the sport. Soccer is
      // the case that proves it: outfield soccer genuinely asks for
      // everything, and it is the KEEPER who rules top-end speed out.
      const rulesOut =
        w.some((x) => x === 0) ||
        Object.values(p.positions ?? {}).some((o) => Object.values(o.weights ?? {}).some((x) => x === 0))
      expect(rulesOut, `${s} rules nothing out, at the sport or at any position`).toBe(true)
    }
  })

  it('only ever names qualities and joints the rest of the app knows', () => {
    const JOINTS: Joint[] = ['shoulder', 'elbow', 'wrist', 'lower-back', 'hip', 'knee', 'ankle']
    for (const s of REAL) {
      const p = SPORT_PROFILES[s]
      for (const q of Object.keys(p.weights)) {
        expect(QUALITY_LABELS[q as AthleticQuality], `${s} weights unknown quality ${q}`).toBeTruthy()
      }
      for (const j of p.injuryWatch) expect(JOINTS, `${s} watches unknown joint ${j}`).toContain(j)
      for (const [pos, over] of Object.entries(p.positions ?? {})) {
        for (const q of Object.keys(over.weights ?? {})) {
          expect(QUALITY_LABELS[q as AthleticQuality], `${s}/${pos} weights unknown ${q}`).toBeTruthy()
        }
      }
    }
  })

  it('lets a position edit the sport and never replace it', () => {
    const soccer = profileForSport('Soccer')
    const keeper = profileForSport('Soccer', 'Keeper')
    // The keeper's own edits landed.
    expect(weightFor(keeper, 'lateral-power')).toBe(3)
    expect(weightFor(keeper, 'max-velocity')).toBe(0)
    // And everything the base said that the keeper did not contradict.
    expect(weightFor(keeper, 'deceleration')).toBe(weightFor(soccer, 'deceleration'))
  })
})

describe('what the athlete is told', () => {
  const n = buildNutrition('general', 180)

  it('says what the sport bought them', () => {
    const s = deepGoalStrategy('general', { sport: 'Basketball' }, n).join(' ')
    expect(s).toContain('Basketball')
    expect(s.toLowerCase()).toContain('vertical power')
  })

  it('admits it does not know a sport rather than bluffing', () => {
    // The north star: the app never pretends. A general base is a fine
    // answer; a general base with a confident face on it is not.
    const s = deepGoalStrategy('general', { sport: 'Something else', 'sport-other': 'Korfball' }, n).join(' ')
    expect(s).toContain('Korfball')
    expect(s).toContain('I do not know')
  })

  it('keeps the house copy rules', () => {
    for (const sport of SPORTS) {
      const s = deepGoalStrategy('general', { sport }, n).join(' ')
      expect(s, sport).not.toContain('—')
    }
  })

  it('reads the answer through the accessors that used to be dead', () => {
    expect(sportOf({ sport: 'Tennis' })).toBe('Tennis')
    expect(sportOf({ sport: 'Something else', 'sport-other': ' Korfball ' })).toBe('Korfball')
    expect(positionOf({ 'sport-role': 'Keeper' })).toBe('Keeper')
    expect(positionOf({})).toBe(null)
  })
})
