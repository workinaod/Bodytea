import { beforeEach, describe, expect, it } from 'vitest'
import type { AppData, SessionLog } from '../types'
import { defaultWeekState, emptyAppData } from '../types'
import { useAppStore } from '../store/appStore'
import { resolveDay } from '../engine/resolveDay'
import { focusQueue } from '../engine/focus'
import { cutToEssentials } from './timeActions'

// ============================================================
// Running out of time is not running out of strength.
//
// The whole reason this lives apart from the fatigue side: a day
// cut short because the gym closes says nothing about how strong
// anyone is, and must never end up in the notes that shape later
// sessions.
// ============================================================

const START = '2026-08-10' // a Monday
const DATE = '2026-08-11' // Tuesday, a real session day

function data(): AppData {
  const d = emptyAppData(START, START)
  d.settings.onboarded = true
  const week = defaultWeekState(START)
  week.tier = 1
  week.tierPickedAt = `${START}T08:00:00.000Z`
  d.weeks[START] = week
  return d
}

/** A session logged straight off the plan, nothing done yet. */
function seed(mutate: (s: SessionLog) => void = () => {}): AppData {
  const d = data()
  const day = resolveDay(DATE, d)
  const s: SessionLog = {
    date: DATE,
    templateId: day.templateId ?? 't',
    status: 'partial',
    exercises: day.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      sets: Array.from({ length: e.sets }, () => ({ targetReps: e.repText, weightLb: 50, done: false })),
    })),
  }
  mutate(s)
  d.sessions[DATE] = s
  useAppStore.setState({ data: d })
  return d
}

const live = () => useAppStore.getState().data.sessions[DATE]

beforeEach(() => {
  useAppStore.setState({ data: emptyAppData(START, START) })
})

describe('cutToEssentials', () => {
  it('makes the day genuinely shorter', () => {
    seed()
    const before = focusQueue(live()).length
    const cut = cutToEssentials(DATE)!
    expect(cut.dropped).toBeGreaterThan(0)
    expect(focusQueue(live()).length).toBeLessThan(before)
  })

  it('reports the sets it saved, and the count is true', () => {
    seed()
    const before = focusQueue(live()).length
    const cut = cutToEssentials(DATE)!
    expect(focusQueue(live()).length).toBe(before - cut.setsSaved)
  })

  it('never drops a movement that has already been started', () => {
    // The first version of this test part-finished exercise 0, which is
    // one of the ESSENTIALS, so it survived because of the keep list and
    // the assertion proved nothing. It has to be a movement the cut
    // would otherwise take: part-done work is banked, and dropping it
    // buys almost no time while losing what was performed.
    const d = seed()
    const dropped = cutToEssentials(DATE)!
    const victim = live().exercises.findIndex((e) => e.skipped)
    expect(dropped.dropped, 'nothing was cut, so there is nothing to protect').toBeGreaterThan(0)
    expect(victim).toBeGreaterThanOrEqual(0)
    const victimId = live().exercises[victim].exerciseId

    // Same day again, except that movement is now half done.
    useAppStore.setState({ data: d })
    seed((s) => {
      const i = s.exercises.findIndex((e) => e.exerciseId === victimId)
      s.exercises[i].sets[0].done = true
    })
    cutToEssentials(DATE)
    const kept = live().exercises.find((e) => e.exerciseId === victimId)!
    expect(kept.skipped, `${victimId} was cut despite being started`).toBeUndefined()
  })

  it('leaves every logged set exactly as performed', () => {
    seed((s) => {
      s.exercises[0].sets[0].done = true
      s.exercises[0].sets[0].reps = 9
    })
    cutToEssentials(DATE)
    expect(live().exercises[0].sets[0]).toMatchObject({ done: true, reps: 9, weightLb: 50 })
  })

  it('writes nothing to the fatigue notes, because this is not fatigue', () => {
    seed()
    cutToEssentials(DATE)
    expect(live().fatigue).toBeUndefined()
  })

  it('says so rather than pretending, when there is nothing left to cut', () => {
    seed()
    cutToEssentials(DATE)
    const again = cutToEssentials(DATE)!
    expect(again.dropped).toBe(0)
    expect(again.setsSaved).toBe(0)
  })

  it('returns null for a date with no session', () => {
    seed()
    expect(cutToEssentials('2026-08-19')).toBeNull()
  })
})
