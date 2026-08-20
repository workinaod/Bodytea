import { describe, expect, it } from 'vitest'
import { emptyAppData, type AppData } from '../types'
import { STEP_METRIC, STEP_TYPE, STEP_WINDOW_DAYS, calorieStep } from './calorieStep'
import { addDaysISO } from './calendar'
import { appendDecision, decisionRow } from './decisions'
import { MEANINGFUL_TREND_DELTA, VERDICT_VISIBLE_DAYS, dueForVerdict, freshVerdict, judge, lastAttemptBackfired, settleDue, verdictCopy } from './outcomes'

// ============================================================
// R3's fourth rule is the one this file is really about: if no
// observation could mark an intervention "did not work", it does not
// ship. So most of these tests are about the ways it fails.
// ============================================================

const TODAY = '2026-08-31'
const ACCEPTED_AT = addDaysISO(TODAY, -STEP_WINDOW_DAYS)

function account(): AppData {
  const d = emptyAppData('2026-06-01')
  d.settings.onboarded = true
  d.plan.goal = 'lean'
  d.plan.mealPlan.supplements = []
  return d
}

/** An accepted step, pre-registered exactly as the offer site writes it. */
function accepted(d: AppData, baseline: number, over: Partial<{ at: string; target: string; seq: number }> = {}): AppData {
  const at = over.at ?? ACCEPTED_AT
  appendDecision(d, {
    ...decisionRow({
      type: STEP_TYPE,
      target: over.target ?? 'kcalTraining',
      ruleVersion: 1,
      evidence: { stepKcal: -150, trendLbPerWeek: baseline, fromKcal: 2600 },
      response: 'accepted',
      at,
      seq: over.seq ?? 0,
    }),
    metricId: STEP_METRIC,
    windowDays: STEP_WINDOW_DAYS,
    windowClosesAt: addDaysISO(at, STEP_WINDOW_DAYS),
    baseline,
  })
  return d
}

/** Weekly weigh-ins inside the trend window at an exact rate. */
function scale(d: AppData, startLb: number, lbPerWeek: number, count = 4): AppData {
  for (let i = 0; i < count; i++) {
    d.measurements.push({
      date: addDaysISO(TODAY, -((count - 1 - i) * 7)),
      weightLb: startLb + lbPerWeek * i,
      photoIds: {},
    })
  }
  return d
}

describe('nothing is judged before its window closes', () => {
  it('waits', () => {
    const d = accepted(scale(account(), 190, -1), -0.3, { at: addDaysISO(TODAY, -5) })
    expect(dueForVerdict(d, TODAY)).toHaveLength(0)
    expect(settleDue(d, TODAY)).toBe(0)
  })

  it('and comes due on the day the window says it does', () => {
    const d = accepted(scale(account(), 190, -1), -0.3)
    expect(dueForVerdict(d, TODAY)).toHaveLength(1)
  })

  it('never judges something that was declined', () => {
    const d = scale(account(), 190, -1)
    appendDecision(d, decisionRow({
      type: STEP_TYPE, target: 'kcalTraining', ruleVersion: 1,
      evidence: { stepKcal: -150 }, response: 'declined', at: ACCEPTED_AT, seq: 0,
    }))
    expect(dueForVerdict(d, TODAY)).toHaveLength(0)
  })
})

describe('it can say no, which is the point', () => {
  it('calls it worked when the trend moved the way the step asked', () => {
    // Asked the scale to fall faster; it went from -0.3 to -1 a week.
    const d = accepted(scale(account(), 190, -1), -0.3)
    expect(judge(d, dueForVerdict(d, TODAY)[0], TODAY)!.verdict).toBe('worked')
  })

  it('calls it worse when the trend went the other way', () => {
    // Asked the scale to fall faster; it started climbing instead.
    const d = accepted(scale(account(), 190, 1), -0.3)
    expect(judge(d, dueForVerdict(d, TODAY)[0], TODAY)!.verdict).toBe('worse')
  })

  it('calls it no-change when nothing really moved', () => {
    const d = accepted(scale(account(), 190, -1), -1 + MEANINGFUL_TREND_DELTA / 2)
    expect(judge(d, dueForVerdict(d, TODAY)[0], TODAY)!.verdict).toBe('no-change')
  })

  it('says so out loud on every verdict a person should hear', () => {
    for (const [rate, baseline, expected] of [[-1, -0.3, 'worked'], [1, -0.3, 'worse']] as const) {
      const d = accepted(scale(account(), 190, rate), baseline)
      settleDue(d, TODAY)
      const copy = verdictCopy(d.decisions[0])
      expect(copy, expected).not.toBeNull()
      expect(copy).toContain('150')
    }
  })
})

describe('two changes at once means neither gets the credit', () => {
  it('closes the first as unattributable', () => {
    const d = accepted(scale(account(), 190, -1), -0.3)
    // a second decision on the same target, inside the first one's window
    appendDecision(d, decisionRow({
      type: STEP_TYPE, target: 'kcalTraining', ruleVersion: 1,
      evidence: { stepKcal: -100 }, response: 'accepted',
      at: addDaysISO(ACCEPTED_AT, 5), seq: 1,
    }))
    expect(judge(d, dueForVerdict(d, TODAY)[0], TODAY)!.verdict).toBe('unattributable')
  })

  it('but a decision about something else does not muddy it', () => {
    const d = accepted(scale(account(), 190, -1), -0.3)
    appendDecision(d, decisionRow({
      type: 'nutrition-recheck', target: 'somethingElse', ruleVersion: 1,
      evidence: {}, response: 'accepted', at: addDaysISO(ACCEPTED_AT, 5), seq: 1,
    }))
    expect(judge(d, dueForVerdict(d, TODAY)[0], TODAY)!.verdict).toBe('worked')
  })

  it('and a scale creatine is moving is not evidence either', () => {
    const d = accepted(scale(account(), 190, -1), -0.3)
    d.plan.mealPlan.supplements = [{ id: 'creatine', source: 'app' }]
    expect(judge(d, dueForVerdict(d, TODAY)[0], TODAY)!.verdict).toBe('unattributable')
  })
})

describe('somebody who stopped weighing in', () => {
  it('is abandoned, not failed, and is told nothing', () => {
    const d = accepted(account(), -0.3)
    const j = judge(d, dueForVerdict(d, TODAY)[0], TODAY)!
    expect(j.verdict).toBe('abandoned')
    settleDue(d, TODAY)
    expect(d.decisions[0].outcome).toBeUndefined()
    expect(verdictCopy(d.decisions[0])).toBeNull()
  })
})

describe('settling', () => {
  it('writes the verdict once and does not revisit it', () => {
    const d = accepted(scale(account(), 190, -1), -0.3)
    expect(settleDue(d, TODAY)).toBe(1)
    expect(d.decisions[0].verdict).toBe('worked')
    expect(d.decisions[0].outcome).toBeCloseTo(-1, 5)
    // already judged: nothing left due
    expect(settleDue(d, TODAY)).toBe(0)
    expect(dueForVerdict(d, TODAY)).toHaveLength(0)
  })

  it('leaves the offer and its evidence exactly as they were recorded', () => {
    const d = accepted(scale(account(), 190, -1), -0.3)
    const before = { ...d.decisions[0] }
    settleDue(d, TODAY)
    const after = d.decisions[0]
    expect(after.offeredAt).toBe(before.offeredAt)
    expect(after.evidence).toEqual(before.evidence)
    expect(after.baseline).toBe(before.baseline)
    expect(after.ruleVersion).toBe(before.ruleVersion)
  })
})

describe('a verdict does not live on the screen forever', () => {
  it('shows while it is news and expires on its own', () => {
    // Day counts as LITERALS. Written against VERDICT_VISIBLE_DAYS the
    // assertion moves with the constant and passes at any value, which is
    // how a probe set it to 999 and this test stayed green. Fourth guard
    // of that exact shape this session.
    const d = accepted(scale(account(), 190, -1), -0.3)
    settleDue(d, TODAY)
    expect(VERDICT_VISIBLE_DAYS).toBe(7)
    expect(freshVerdict(d, TODAY)).not.toBeNull()
    expect(freshVerdict(d, addDaysISO(TODAY, 7))).not.toBeNull()
    // a week later it is history rather than news
    expect(freshVerdict(d, addDaysISO(TODAY, 8))).toBeNull()
    expect(freshVerdict(d, addDaysISO(TODAY, 30))).toBeNull()
  })

  it('keeps the pre-registered identifiers stable, because old rows are read by them', () => {
    // A metric id that changes silently orphans every row written under
    // the old one: judge() looks for its own metric and finds nothing, so
    // the intervention is never graded and never says why.
    expect(STEP_METRIC).toBe('trendLbPerWeek')
    expect(STEP_WINDOW_DAYS).toBe(21)
  })

  it('never surfaces one with nothing to say', () => {
    const d = accepted(account(), -0.3) // no weigh-ins: abandoned
    settleDue(d, TODAY)
    expect(d.decisions[0].verdict).toBe('abandoned')
    expect(freshVerdict(d, TODAY)).toBeNull()
  })

  it('shows the most recent when two have settled', () => {
    const d = accepted(scale(account(), 190, -1), -0.3)
    settleDue(d, TODAY)
    appendDecision(d, {
      ...decisionRow({
        type: STEP_TYPE, target: 'kcalRest', ruleVersion: 1,
        evidence: { stepKcal: -250 }, response: 'accepted', at: ACCEPTED_AT, seq: 9,
      }),
      metricId: STEP_METRIC, windowDays: STEP_WINDOW_DAYS,
      windowClosesAt: addDaysISO(ACCEPTED_AT, STEP_WINDOW_DAYS), baseline: -0.3,
    })
    settleDue(d, TODAY)
    expect(verdictCopy(freshVerdict(d, TODAY)!)).toContain('250')
  })
})

describe('the app does not argue with itself', () => {
  /** A step that was accepted, judged, and made things worse. */
  function backfired(): AppData {
    const d = account()
    d.profile = { bfFormula: 'male', heightIn: 70, age: 30 }
    d.plan.nutrition = { kcalTraining: 2450, kcalRest: 2150 }
    // the cut is going the wrong way since the change
    for (let i = 0; i < 4; i++) {
      d.measurements.push({ date: addDaysISO(TODAY, -((3 - i) * 7)), weightLb: 190 + i * 0.8, photoIds: {} })
    }
    accepted(d, -0.3)
    settleDue(d, TODAY)
    return d
  }

  it('a verdict of worse stands down the rule that would repeat it', () => {
    // Both cards used to render at once: "that did not help, back to
    // where you were is a fair call" beside "about 250 kcal a day less
    // would put you back in it". Same screen, same number, opposite
    // directions.
    const d = backfired()
    expect(d.decisions[0].verdict).toBe('worse')
    expect(verdictCopy(d.decisions[0])).toContain('did not help')
    expect(calorieStep(d, TODAY)).toBeNull()
  })

  it('and starts offering again once that feedback is old news', () => {
    // Standing down is not giving up. Past the window the verdict stops
    // being on screen, so there is nothing left to contradict.
    const d = backfired()
    const later = addDaysISO(TODAY, VERDICT_VISIBLE_DAYS + 1)
    for (let i = 1; i <= 3; i++) {
      d.measurements.push({ date: addDaysISO(later, -((3 - i) * 7)), weightLb: 193 + i * 0.8, photoIds: {} })
    }
    expect(freshVerdict(d, later)).toBeNull()
    expect(calorieStep(d, later)).not.toBeNull()
  })

  it('a verdict of worked does not stand anything down', () => {
    const d = accepted(scale(account(), 190, -1), -0.3)
    settleDue(d, TODAY)
    expect(d.decisions[0].verdict).toBe('worked')
    expect(lastAttemptBackfired(d, 'kcalTraining', TODAY)).toBe(false)
  })
})
