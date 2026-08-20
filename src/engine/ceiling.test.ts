import { describe, expect, it } from 'vitest'
import { emptyAppData, type AppData } from '../types'
import type { SessionLog } from '../sessionTypes'
import { appendDecision } from './decisions'
import {
  CEILING_MAX_DRIFT,
  ceilingDeltas,
  ceilingDecision,
  ceilingLowerOffer,
  ceilingRaiseOffer,
} from './ceiling'
import { ceilingFor } from './volume'

// ============================================================
// R3 s5.3 is blunt that volume autoregulation is the under-evidenced
// half of the literature. So: one fractional set, never two; the drift
// is capped both ways; the first move is DOWN; and lowering needs ONE
// signal where raising needs six.
//
// The delta lives in the ledger and the base stays the researched
// constant, because a lowered ceiling that quietly becomes the new base
// walks a muscle to nothing one honest bad week at a time. This repo
// already has that scar in reps.ts.
// ============================================================

const SQUAT = 'goblet-squat' // primary: quads
const TODAY = '2026-06-01'
const WEEKS = ['2026-05-04', '2026-05-11', '2026-05-18', '2026-05-25']

function base(): AppData {
  const d = emptyAppData(TODAY, TODAY)
  d.settings.onboarded = true
  return d
}

/** A session where the movement came up short, which raises its flag. */
function short(d: AppData, date: string): AppData {
  d.sessions[date] = {
    date,
    templateId: 't',
    status: 'completed',
    exercises: [{ exerciseId: SQUAT, sets: [{ targetReps: '10', done: true, achieved: 6, weightLb: 100 }] }],
  } as unknown as SessionLog
  return d
}

const flagged = (): AppData => {
  let d = base()
  for (const date of WEEKS.slice(0, 3)) d = short(d, date)
  return d
}

describe('the base never moves, only the offset', () => {
  it('leaves a fresh athlete on the researched number', () => {
    expect(ceilingDeltas(base())).toEqual({})
    expect(ceilingFor('quads')).toBe(ceilingFor('quads', undefined, {}))
  })

  it('takes exactly one set off when the offer is taken', () => {
    const plain = ceilingFor('quads')
    const d = flagged()
    const offer = ceilingLowerOffer(d, TODAY)!
    appendDecision(d, ceilingDecision(offer, 'lower', 'accepted', TODAY, 0))
    expect(ceilingFor('quads', undefined, ceilingDeltas(d))).toBe(plain - 1)
  })

  it('never drifts further than the cap in either direction', () => {
    expect(CEILING_MAX_DRIFT).toBe(2)
    const d = base()
    const change = { region: 'quads' as const, label: 'Quads', because: 'x' }
    for (let i = 0; i < 6; i++) appendDecision(d, ceilingDecision(change, 'lower', 'accepted', TODAY, i))
    expect(ceilingDeltas(d).quads).toBe(-CEILING_MAX_DRIFT)
  })

  it('keeps the focus bonus out of the drift', () => {
    // R3 s5.2 keeps the bonus exactly as researched: a personal offset
    // should not quietly double on the muscle the day was built around.
    const focus = new Set(['quads' as const])
    const withDelta = ceilingFor('quads', focus, { quads: -1 })
    expect(withDelta).toBe(ceilingFor('quads', focus) - 1)
  })
})

describe('one signal is enough to come down', () => {
  it('offers on a movement that keeps coming up short', () => {
    const offer = ceilingLowerOffer(flagged(), TODAY)
    expect(offer?.region).toBe('quads')
    expect(offer?.because).toContain('short')
  })

  it('says nothing to somebody whose sessions are fine', () => {
    let d = base()
    for (const date of WEEKS) {
      d.sessions[date] = {
        date,
        templateId: 't',
        status: 'completed',
        exercises: [{ exerciseId: SQUAT, sets: [{ targetReps: '10', done: true, achieved: 10, weightLb: 100 }] }],
      } as unknown as SessionLog
    }
    expect(ceilingLowerOffer(d, TODAY)).toBeNull()
  })

  it('will not move the same muscle twice in a fortnight', () => {
    // R3 s5.5 guard 4: two changes on one muscle at once cannot be
    // attributed to either.
    const d = flagged()
    const offer = ceilingLowerOffer(d, TODAY)!
    appendDecision(d, ceilingDecision(offer, 'lower', 'accepted', TODAY, 0))
    expect(ceilingLowerOffer(d, '2026-06-07')).toBeNull()
    expect(ceilingLowerOffer(d, '2026-06-16')).not.toBeNull()
  })

  it('stops offering once the muscle is as low as it may go', () => {
    // A squat is quads AND glutes, so both have to be at the floor
    // before there is nothing left to offer. Capping one and expecting
    // silence was my mistake, not the engine's: it correctly moved on to
    // the muscle that had not drifted yet.
    const d = flagged()
    for (const region of ['quads', 'glutes'] as const) {
      const change = { region, label: region, because: 'x' }
      for (let i = 0; i < CEILING_MAX_DRIFT; i++) {
        appendDecision(d, ceilingDecision(change, 'lower', 'accepted', '2026-01-01', i))
      }
    }
    expect(ceilingLowerOffer(d, TODAY)).toBeNull()
  })

  it('takes a no for an answer', () => {
    const d = flagged()
    const offer = ceilingLowerOffer(d, TODAY)!
    appendDecision(d, ceilingDecision(offer, 'lower', 'declined', TODAY, 0))
    expect(ceilingDeltas(d)).toEqual({})
    expect(ceilingLowerOffer(d, '2026-06-02')).toBeNull()
  })
})

// ============================================================
// Raising needs all six of R3 s5.3's conditions and a goal volume is
// even a lever for. Lowering needs one signal. That asymmetry is the
// whole design: a raise is an invitation to more fatigue, and s5.4 says
// hold when the evidence is ambiguous.
// ============================================================

const PRESS = 'flat-db-press' // primary: chest
const RAISE_DAYS = [
  '2026-05-06', '2026-05-09', '2026-05-13', '2026-05-16',
  '2026-05-20', '2026-05-23', '2026-05-27', '2026-05-30',
]

/** Everything R3 s5.3 asks for: clean, attended, with reps in reserve. */
function cruising(o: { goal?: string; rir?: number } = {}): AppData {
  const d = base()
  d.plan.goal = (o.goal ?? 'muscle') as never
  for (const date of RAISE_DAYS) {
    d.sessions[date] = {
      date,
      templateId: 't',
      status: 'completed',
      exercises: [
        {
          exerciseId: PRESS,
          rir: o.rir ?? 3,
          sets: [{ targetReps: '10', done: true, achieved: 10, weightLb: 50 }],
        },
      ],
    } as unknown as SessionLog
  }
  return d
}

describe('raising needs all six', () => {
  it('offers a set when everything holds', () => {
    const offer = ceilingRaiseOffer(cruising(), TODAY)
    expect(offer?.region).toBe('chest')
    expect(offer?.because).toContain('left in the tank')
  })

  it('refuses when there is no reported effort to read', () => {
    // R3 s5.3 condition 4: absent evidence is not permission.
    const d = cruising()
    for (const date of RAISE_DAYS) delete (d.sessions[date].exercises[0] as { rir?: number }).rir
    expect(ceilingRaiseOffer(d, TODAY)).toBeNull()
  })

  it('refuses on a single reported set, which is not a median', () => {
    // Distinct from reporting NOTHING: one honest answer is a data
    // point, not a pattern, and taking it as permission to add volume
    // is the shape of mistake this whole gate exists to avoid. The
    // no-effort test above does not cover this, because with nothing
    // reported the region never enters the tally at all.
    const d = cruising()
    for (const date of RAISE_DAYS.slice(1)) {
      delete (d.sessions[date].exercises[0] as { rir?: number }).rir
    }
    expect(ceilingRaiseOffer(d, TODAY)).toBeNull()
  })

  it('refuses when the athlete was working at the edge', () => {
    expect(ceilingRaiseOffer(cruising({ rir: 0 }), TODAY)).toBeNull()
  })

  it('refuses off a softened fortnight', () => {
    // R3 s5.5 guard 1: a downgraded week means the current dose was not
    // actually carried, so finishing it says nothing about carrying more.
    const d = cruising()
    d.sessions[RAISE_DAYS[7]].readiness = { flags: [true, true, false, false], downgraded: true }
    expect(ceilingRaiseOffer(d, TODAY)).toBeNull()
  })

  it('refuses when sessions were missed', () => {
    const d = cruising()
    for (const date of ['2026-05-07', '2026-05-08', '2026-05-10', '2026-05-11', '2026-05-12']) {
      d.sessions[date] = { date, templateId: 't', status: 'skipped', exercises: [] } as unknown as SessionLog
    }
    expect(ceilingRaiseOffer(d, TODAY)).toBeNull()
  })

  it('refuses on a goal volume is not the lever for', () => {
    // R3 s5.6: fat loss and general health should not chase volume, and
    // the explosive goals live on freshness.
    for (const goal of ['lean', 'general', 'endurance', 'vertical', 'speed']) {
      expect(ceilingRaiseOffer(cruising({ goal }), TODAY)).toBeNull()
    }
    expect(ceilingRaiseOffer(cruising({ goal: 'strength' }), TODAY)).not.toBeNull()
  })

  it('refuses once the weekly band is full', () => {
    const d = cruising()
    // Pile the last seven days high enough to hit the outer wall.
    for (const date of ['2026-05-27', '2026-05-30']) {
      d.sessions[date].exercises[0].sets = Array.from({ length: 12 }, () => ({
        targetReps: '10',
        done: true,
        achieved: 10,
        weightLb: 50,
      })) as never
    }
    expect(ceilingRaiseOffer(d, '2026-06-01')).toBeNull()
  })

  it('never raises past the cap', () => {
    const d = cruising()
    const change = { region: 'chest' as const, label: 'Chest', because: 'x' }
    for (let i = 0; i < CEILING_MAX_DRIFT; i++) {
      appendDecision(d, ceilingDecision(change, 'raise', 'accepted', '2026-01-01', i))
    }
    expect(ceilingRaiseOffer(d, TODAY)).toBeNull()
  })

  it('takes a set off before it ever adds one', () => {
    // Both offers live behind one card and down comes first.
    const d = cruising()
    for (const date of WEEKS.slice(0, 3)) d.sessions[date] = short(base(), date).sessions[date]
    expect(ceilingLowerOffer(d, TODAY)).not.toBeNull()
  })
})
