import { describe, expect, it } from 'vitest'
import { resolveDay } from './resolveDay'
import { addDaysISO } from './calendar'
import { emptyAppData, defaultWeekState, type AppData } from '../types'

// ============================================================
// GOLDEN LOCK, the owner-continuity guarantee for the
// plan-as-data refactor. This snapshots the resolved output of
// the NAOD V3 plan for every day of the full 16-week phase at
// every tier. The plan-as-data migration (schema v4, PlanConfig,
// parameterized engine) must reproduce this output EXACTLY,
// if this snapshot changes, the owner's booklet changed.
// ============================================================

const START = '2026-08-10' // a Monday

function dataAtTier(tier: 1 | 2 | 3): AppData {
  const data = emptyAppData(START, START)
  data.settings.onboarded = true
  for (let w = 0; w < 16; w++) {
    const monday = addDaysISO(START, w * 7)
    const week = defaultWeekState(monday)
    week.tier = tier
    week.tierPickedAt = `${monday}T08:00:00.000Z`
    data.weeks[monday] = week
  }
  return data
}

function summarize(data: AppData): unknown[] {
  const out: unknown[] = []
  for (let d = 0; d < 16 * 7; d++) {
    const date = addDaysISO(START, d)
    const r = resolveDay(date, data)
    out.push({
      date,
      wk: r.weekIndex,
      blk: r.blockIndex,
      wib: r.weekInBlock,
      ab: r.abWeek,
      deload: r.isDeload,
      tpl: r.templateId,
      kind: r.kind,
      cns: r.cns,
      title: r.title,
      ex: r.exercises.map((e) => `${e.exerciseId}|${e.sets}x${e.repText}${e.fromSlot ? '|slot' : ''}${e.lightMode ? '|light' : ''}${e.perSide ? '|ps' : ''}`),
    })
  }
  return out
}

describe('golden: NAOD V4 resolved plan is frozen', () => {
  it('tier 1, full 16-week phase', () => {
    expect(summarize(dataAtTier(1))).toMatchSnapshot()
  })

  it('tier 2, full 16-week phase', () => {
    expect(summarize(dataAtTier(2))).toMatchSnapshot()
  })

  it('tier 3, full 16-week phase', () => {
    expect(summarize(dataAtTier(3))).toMatchSnapshot()
  })
})
