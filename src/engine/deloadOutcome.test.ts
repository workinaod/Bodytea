import { describe, expect, it } from 'vitest'
import { emptyAppData, type AppData, type SessionLog } from '../types'
import { addDaysISO, mondayOf } from './calendar'
import { REBOUND_LB, deloadVerdictCopy, settleDeloads } from './deloadOutcome'
import { DELOAD_TYPE, DELOAD_WINDOW_DAYS } from './proposals'
import { blockMathFor } from './resolveDay'

// ============================================================
// A deload is a whole week of reduced training taken on faith, every
// fourth week, and nothing could say whether it bought anything. These
// tests are mostly about the answers that are not yes.
// ============================================================

const PHASE_START = '2026-01-05' // a Monday
const SQUAT = 'goblet-squat'

/** The Monday of the most recent deload week with a closed window. */
function deloadMonday(today: string): string {
  for (let w = 1; w <= 52; w++) {
    const monday = mondayOf(addDaysISO(today, -w * 7))
    if (!blockMathFor(monday, PHASE_START).isDeload) continue
    if (addDaysISO(monday, 6 + DELOAD_WINDOW_DAYS) <= today) return monday
  }
  throw new Error('no settled deload week in the last year')
}

function account(_today: string): AppData {
  const d = emptyAppData(PHASE_START, PHASE_START)
  d.settings.onboarded = true
  d.settings.phaseStartDate = PHASE_START
  d.plan.trackedLifts = [{ exerciseId: SQUAT, label: 'Goblet Squat' }]
  // A generated plan: routineGoals/whyWorks absent means BodyT wrote it.
  return d
}

function lifted(d: AppData, date: string, weightLb: number): AppData {
  d.sessions[date] = {
    date,
    templateId: 't',
    status: 'done',
    exercises: [{ exerciseId: SQUAT, sets: [{ targetReps: '5', done: true, reps: 5, weightLb }] }],
  } as unknown as SessionLog
  return d
}

const TODAY = '2026-06-01'
const DL = deloadMonday(TODAY)

/** The row for the week under test, not whichever came back first. */
const weekRow = (d: AppData) =>
  d.decisions.find((x) => x.type === DELOAD_TYPE && x.target === DL)!

describe('rebound is the test', () => {
  it('calls it worked when the lifts came back higher', () => {
    let d = account(TODAY)
    d = lifted(d, addDaysISO(DL, -10), 100)
    d = lifted(d, addDaysISO(DL, 10), 115)
    // Every unjudged deload week gets settled, not just the newest: an
    // established athlete's history is exactly what the learning loop
    // wants to read. The ones with no lifting either side come back
    // `abandoned`, which is honest rather than noisy.
    expect(settleDeloads(d, TODAY)).toBeGreaterThanOrEqual(1)
    const row = weekRow(d)
    expect(row.verdict).toBe('worked')
    expect(row.target).toBe(DL)
    expect(deloadVerdictCopy(row)).toContain('did its job')
  })

  it('says plainly when the week bought nothing', () => {
    let d = account(TODAY)
    d = lifted(d, addDaysISO(DL, -10), 100)
    d = lifted(d, addDaysISO(DL, 10), 100)
    settleDeloads(d, TODAY)
    const row = weekRow(d)
    expect(row.verdict).toBe('no-change')
    expect(deloadVerdictCopy(row)).toContain('not fatigue')
  })

  it('and when the lifts did not come back at all', () => {
    let d = account(TODAY)
    d = lifted(d, addDaysISO(DL, -10), 120)
    d = lifted(d, addDaysISO(DL, 10), 100)
    settleDeloads(d, TODAY)
    const row = weekRow(d)
    expect(row.verdict).toBe('worse')
    expect(deloadVerdictCopy(row)).toContain('fresher, not flatter')
  })

  it('does not call the same lift twice a rebound', () => {
    let d = account(TODAY)
    d = lifted(d, addDaysISO(DL, -10), 100)
    d = lifted(d, addDaysISO(DL, 10), 100 + REBOUND_LB / 2)
    settleDeloads(d, TODAY)
    expect(d.decisions.find((x) => x.type === DELOAD_TYPE)!.verdict).toBe('no-change')
  })
})

describe('the deload week itself is neither side of the comparison', () => {
  it('does not let the week under test flatter or spoil its own verdict', () => {
    // The one boundary that decides whether this rule is honest. A lift
    // inside the deload week belongs to neither window: counted as
    // "before" it inflates the baseline and the week reads as a failure,
    // counted as "after" it takes the credit for a rebound it is.
    // Numbers are pinned, not derived, because a comparison that moves
    // with the code proves nothing.
    let d = account(TODAY)
    d = lifted(d, addDaysISO(DL, -10), 100) // e1rm 117
    d = lifted(d, addDaysISO(DL, 2), 200) // inside the week: e1rm 233, ignored
    d = lifted(d, addDaysISO(DL, 10), 115) // e1rm 134
    settleDeloads(d, TODAY)
    const row = weekRow(d)
    expect(row.baseline).toBe(117)
    expect(row.outcome).toBe(134)
    expect(row.verdict).toBe('worked')
  })
})

describe('it refuses to judge what it cannot see', () => {
  it('is abandoned when nothing was lifted after', () => {
    let d = account(TODAY)
    d = lifted(d, addDaysISO(DL, -10), 100)
    settleDeloads(d, TODAY)
    const row = weekRow(d)
    expect(row.verdict).toBe('abandoned')
    expect(deloadVerdictCopy(row)).toBeNull()
  })

  it('is abandoned when there is nothing to beat', () => {
    let d = account(TODAY)
    d = lifted(d, addDaysISO(DL, 10), 115)
    settleDeloads(d, TODAY)
    expect(d.decisions.find((x) => x.type === DELOAD_TYPE)!.verdict).toBe('abandoned')
  })

  it('never judges a week whose window has not closed', () => {
    const soonAfter = addDaysISO(DL, 8)
    let d = account(soonAfter)
    d = lifted(d, addDaysISO(DL, -10), 100)
    settleDeloads(d, soonAfter)
    expect(d.decisions.find((x) => x.type === DELOAD_TYPE && x.target === DL)).toBeUndefined()
  })
})

describe('whose plan it is decides whether there is anything to judge', () => {
  it('says nothing about a routine the athlete brought', () => {
    // BodyT does not deload somebody else's routine, so there is no
    // intervention here that it caused. Same call as resolveDay makes.
    let d = account(TODAY)
    d.plan.routineGoals = ['muscle']
    d = lifted(d, addDaysISO(DL, -10), 100)
    d = lifted(d, addDaysISO(DL, 10), 115)
    expect(settleDeloads(d, TODAY)).toBe(0)
  })
})

describe('the ledger', () => {
  it('judges a week once and leaves it alone after', () => {
    let d = account(TODAY)
    d = lifted(d, addDaysISO(DL, -10), 100)
    d = lifted(d, addDaysISO(DL, 10), 115)
    const first = settleDeloads(d, TODAY)
    expect(first).toBeGreaterThanOrEqual(1)
    expect(settleDeloads(d, TODAY)).toBe(0)
    expect(d.decisions.filter((x) => x.type === DELOAD_TYPE && x.target === DL)).toHaveLength(1)
  })

  it('carries the numbers it was judged on, not a sentence about them', () => {
    let d = account(TODAY)
    d = lifted(d, addDaysISO(DL, -10), 100)
    d = lifted(d, addDaysISO(DL, 10), 115)
    settleDeloads(d, TODAY)
    const row = weekRow(d)
    expect(row.baseline).toBeGreaterThan(0)
    expect(row.outcome).toBeGreaterThan(row.baseline!)
    expect(row.metricId).toBe('bestE1RM')
    expect(row.ruleVersion).toBe(1)
  })
})

describe('the copy says which deload it means', () => {
  // Found in the J8 review pass, proved with a screenshot. A verdict is
  // visible 27 to 34 days after its deload week starts, and the next
  // deload starts on day 28, so this card lands inside the following
  // deload week almost every time. The screen was showing "DELOAD WEEK:
  // sets halved, keep the weights" and, directly under it, "your lifts
  // have not come back up since the deload week" about a week a month
  // earlier. Every line has to place itself in time, or the athlete
  // reads it as a report on the week they are being told to do today.
  const lines = (['worked', 'no-change', 'worse'] as const).map(
    (verdict) =>
      deloadVerdictCopy({
        id: 'x',
        type: DELOAD_TYPE,
        target: DL,
        ruleVersion: 1,
        evidence: {},
        offeredAt: DL,
        verdict,
      })!,
  )

  it('never says "the deload week", which always reads as this one', () => {
    for (const line of lines) expect(line).not.toContain('the deload week')
  })

  it('anchors every line three weeks off the week it judged', () => {
    // Nobody is three weeks after a week they are standing in, which is
    // what makes the misreading impossible rather than merely unlikely.
    for (const line of lines) expect(line).toContain('your last deload')
    expect(lines.filter((l) => l.startsWith('Three weeks'))).toHaveLength(3)
  })
})
