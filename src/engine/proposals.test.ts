import { describe, expect, it } from 'vitest'
import { emptyAppData, type AppData } from '../types'
import type { DecisionRecord } from '../decisionTypes'
import { addDaysISO, mondayOf } from './calendar'
import { settleDeloads } from './deloadOutcome'
import { freshVerdict, verdictCopy } from './outcomes'
import {
  ADAPT_METRIC,
  ADAPT_RULE_VERSION,
  ADAPT_TYPE,
  ADAPT_WINDOW_DAYS,
  DELOAD_METRIC,
  DELOAD_RULE_VERSION,
  DELOAD_TYPE,
  DELOAD_WINDOW_DAYS,
  STEP_METRIC,
  STEP_RULE_VERSION,
  STEP_TARGET,
  STEP_TYPE,
  STEP_WINDOW_DAYS,
} from './proposals'
import { blockMathFor } from './resolveDay'

// ============================================================
// The ledger vocabulary is a wire format.
//
// `type` and `metricId` are stored as free strings (store/decisionSchema.ts),
// so every row a real athlete already has was written under whatever
// spelling shipped that day. Rename a constant and today's build stops
// recognising yesterday's rows: the judge finds nothing to grade, the
// screen finds nothing to show, and the dedupe that stops a week being
// judged twice stops seeing the row that says it already was.
//
// proposals.ts has always claimed tests pinned these. Three of them were
// not pinned, found by probe in the J8 review: ADAPT_TYPE, DELOAD_TYPE
// and ADAPT_METRIC all survived being set to 'zzz'.
//
// Every fixture below is built from LITERAL strings on purpose. A test
// that writes its rows through the same constants it is checking passes
// at any value, which is the decorative-guard shape this session has now
// found five times.
// ============================================================

const TODAY = '2026-06-01'

describe('the stored spelling of every proposal', () => {
  it('is what it was the day it shipped', () => {
    expect(STEP_TYPE).toBe('calorie-step')
    expect(STEP_TARGET).toBe('kcalTraining')
    expect(STEP_METRIC).toBe('trendLbPerWeek')
    expect(ADAPT_TYPE).toBe('adapt')
    expect(ADAPT_METRIC).toBe('sessionGrade')
    expect(DELOAD_TYPE).toBe('deload')
    expect(DELOAD_METRIC).toBe('bestE1RM')
  })

  it('carries rule versions and windows that an old row can still be read against', () => {
    // A row records the version of the rule that made it. Bump one of
    // these without meaning to and an old decision is reread as though a
    // rule it never saw had made it.
    expect(STEP_RULE_VERSION).toBe(1)
    expect(ADAPT_RULE_VERSION).toBe(1)
    expect(DELOAD_RULE_VERSION).toBe(1)
    expect(STEP_WINDOW_DAYS).toBe(21)
    expect(ADAPT_WINDOW_DAYS).toBe(14)
    expect(DELOAD_WINDOW_DAYS).toBe(21)
  })
})

/** A judged row exactly as a previous build would have left it on disk. */
function storedRow(over: Partial<DecisionRecord>): DecisionRecord {
  return {
    id: 'r1',
    type: 'calorie-step',
    target: 'kcalTraining',
    ruleVersion: 1,
    evidence: { stepKcal: 150 },
    offeredAt: '2026-05-01',
    response: 'accepted',
    respondedAt: '2026-05-01',
    metricId: 'trendLbPerWeek',
    windowDays: 21,
    windowClosesAt: addDaysISO(TODAY, -2),
    baseline: -0.5,
    outcome: -1,
    verdict: 'worked',
    ...over,
  }
}

describe('a row written by an older build is still read by this one', () => {
  it('speaks for a calorie step it did not write', () => {
    const row = storedRow({})
    expect(verdictCopy(row)).toContain('150 kcal')
  })

  it('speaks for an adaptation it did not write', () => {
    const row = storedRow({
      type: 'adapt',
      target: 'reduce-volume',
      metricId: 'sessionGrade',
      windowDays: 14,
      evidence: { choice: 'reduce-volume' },
    })
    expect(verdictCopy(row)).not.toBeNull()
  })

  it('speaks for a deload it did not write', () => {
    const row = storedRow({
      type: 'deload',
      target: '2026-05-04',
      metricId: 'bestE1RM',
      evidence: { beforeBestE1rm: 117, weekOf: '2026-05-04' },
    })
    expect(verdictCopy(row)).toContain('did its job')
  })

  it('still shows it on the screen that owns it', () => {
    const d = emptyAppData(TODAY, TODAY)
    d.decisions = [storedRow({ type: 'adapt', target: 'reduce-volume', evidence: { choice: 'reduce-volume' } })]
    // The Today screen asks for its own two types by constant. If either
    // constant drifted from the stored spelling, this comes back null.
    expect(freshVerdict(d, TODAY, [ADAPT_TYPE, DELOAD_TYPE])).not.toBeNull()
    // And the food screen still must not announce a training result.
    expect(freshVerdict(d, TODAY, [STEP_TYPE])).toBeNull()
  })
})

describe('the dedupe that stops a week being judged twice', () => {
  it('recognises a verdict an older build already wrote', () => {
    const phaseStart = '2026-01-05'
    let monday = ''
    for (let w = 1; w <= 52; w++) {
      const m = mondayOf(addDaysISO(TODAY, -w * 7))
      if (blockMathFor(m, phaseStart).isDeload && addDaysISO(m, 6 + DELOAD_WINDOW_DAYS) <= TODAY) {
        monday = m
        break
      }
    }
    expect(monday).not.toBe('')

    const withRow = (): AppData => {
      const d = emptyAppData(phaseStart, phaseStart)
      d.settings.onboarded = true
      d.settings.phaseStartDate = phaseStart
      // Written under the literal spelling, as a shipped build would have.
      d.decisions = [storedRow({ type: 'deload', target: monday, metricId: 'bestE1RM' })]
      return d
    }

    const d = withRow()
    settleDeloads(d, TODAY)
    // Other weeks in the history may settle. This one must not be judged
    // a second time, and the row that survives must be the stored one
    // rather than a fresh row that happens to agree with it.
    const rows = d.decisions.filter((r) => r.type === 'deload' && r.target === monday)
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe('r1')
  })
})
