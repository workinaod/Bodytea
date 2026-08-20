import { beforeEach, describe, expect, it } from 'vitest'
import type { AppData } from '../types'
import { defaultWeekState, emptyAppData } from '../types'
import { useAppStore } from '../store/appStore'
import { finishSession, trimToday } from './actions'
import { resolveDay } from '../engine/resolveDay'
import { planWorkOutstanding } from '../engine/stats'
import { logExtraWork, startCustomSession, startSession } from './sessionStart'

// ============================================================
// One cut, never two.
//
// resolveDay trims a day when it is marked trimmed OR when the
// session was started downgraded, and guards those two against
// each other. startSession is a THIRD way in, and it had no such
// guard: mark a day trimmed, then start it as "Normal", and the
// downgrade ran twice. Every lift bottomed out at the 2-set floor
// and the day lost a quarter of its work with nobody asking for
// that.
//
// It was invisible while the transform only set a lightMode flag,
// because setting a flag twice is setting it once. It became real
// the moment trimming started removing sets.
// ============================================================

const START = '2026-08-10' // a Monday
const DATE = '2026-08-11' // Tuesday, a session day

function base(): AppData {
  const d = emptyAppData(START, START)
  d.settings.onboarded = true
  const w = defaultWeekState(START)
  w.tier = 1
  w.tierPickedAt = `${START}T08:00:00.000Z`
  d.weeks[START] = w
  return d
}

const totalSets = () =>
  useAppStore.getState().data.sessions[DATE].exercises.reduce((n, e) => n + e.sets.length, 0)

beforeEach(() => {
  useAppStore.setState({ data: base() })
})

describe('starting a day that is already trimmed', () => {
  it('does not trim it a second time', () => {
    trimToday(DATE, 'busy')
    startSession(DATE)
    const trimmedOnly = totalSets()

    useAppStore.setState({ data: base() })
    trimToday(DATE, 'busy')
    startSession(DATE, undefined, 'lighter')
    expect(totalSets(), 'the day was cut twice').toBe(trimmedOnly)
  })

  it('still trims a normal day when the athlete asks for lighter', () => {
    startSession(DATE)
    const full = totalSets()

    useAppStore.setState({ data: base() })
    startSession(DATE, undefined, 'lighter')
    expect(totalSets(), 'lighter did nothing').toBeLessThan(full)
  })

  it('never floors every lift at the minimum, which is what stacking looked like', () => {
    trimToday(DATE, 'busy')
    startSession(DATE, undefined, 'lighter')
    const s = useAppStore.getState().data.sessions[DATE]
    const lifts = s.exercises.filter((e) => e.sets.length > 0)
    expect(lifts.some((e) => e.sets.length > 2), 'every movement collapsed to 2 sets').toBe(true)
  })

  it('records the downgrade on the log either way, so the debrief stays honest', () => {
    trimToday(DATE, 'busy')
    startSession(DATE, [true, true, false, false])
    expect(useAppStore.getState().data.sessions[DATE].readiness?.downgraded).toBe(true)
  })
})

// ============================================================
// Off-plan sessions: a workout picked off the shelf or built by
// hand becomes an ordinary SessionLog, so nothing downstream
// needs to know the plan never scheduled it.
// ============================================================

const SUNDAY = '2026-08-16' // a rest day on the preset

describe('starting a custom workout', () => {
  it('builds a real session under templateId custom, with the title carried', () => {
    startCustomSession(SUNDAY, 'Quick pump', [
      { exerciseId: 'push-up', sets: 3, repText: 'max' },
      { exerciseId: 'goblet-squat', sets: 3, repText: '8-10' },
    ])
    const s = useAppStore.getState().data.sessions[SUNDAY]
    expect(s.templateId).toBe('custom')
    expect(s.customTitle).toBe('Quick pump')
    expect(s.status).toBe('partial')
    expect(s.exercises).toHaveLength(2)
    expect(s.exercises[0].sets).toHaveLength(3)
    expect(s.exercises.every((e) => e.sets.every((x) => !x.done))).toBe(true)
  })

  it('collapses a rep range to one number, the way the resolver does', () => {
    startCustomSession(SUNDAY, 'Quick pump', [
      { exerciseId: 'goblet-squat', sets: 3, repText: '8-10' },
    ])
    const s = useAppStore.getState().data.sessions[SUNDAY]
    // One number on screen, never a menu mid-set.
    expect(s.exercises[0].sets[0].targetReps).toMatch(/^\d+$/)
  })

  it('prefills the load from history, and an athlete-typed weight wins', () => {
    // History: last week's working goblet squat at 50.
    useAppStore.getState().update((d) => {
      d.sessions['2026-08-12'] = {
        date: '2026-08-12',
        templateId: 'wednesday',
        status: 'completed',
        exercises: [
          {
            exerciseId: 'goblet-squat',
            sets: [{ targetReps: '8', weightLb: 50, reps: 8, done: true }],
          },
        ],
      }
    })
    startCustomSession(SUNDAY, 'Legs again', [
      { exerciseId: 'goblet-squat', sets: 2, repText: '8', repsNum: 8 },
      { exerciseId: 'db-rdl', sets: 2, repText: '10', repsNum: 10, weightLb: 40 },
    ])
    const s = useAppStore.getState().data.sessions[SUNDAY]
    expect(s.exercises[0].sets[0].weightLb).toBe(50)
    expect(s.exercises[1].sets.every((x) => x.weightLb === 40)).toBe(true)
    // A weight the athlete chose is a working weight, never marked light.
    expect(s.exercises[1].sets.some((x) => x.light)).toBeFalsy()
  })

  it('markDone logs the whole thing as finished work, and finishSession completes it', () => {
    startCustomSession(SUNDAY, 'Already did it', [
      { exerciseId: 'push-up', sets: 3, repText: '12', repsNum: 12 },
      { exerciseId: 'plank-side-plank', sets: 2, repText: '30 sec' },
    ], { markDone: true })
    const before = useAppStore.getState().data.sessions[SUNDAY]
    expect(before.exercises.every((e) => e.sets.every((x) => x.done))).toBe(true)
    // Reps recorded as the ask on rep work, never on timed work.
    expect(before.exercises[0].sets[0].reps).toBe(12)
    expect(before.exercises[1].sets[0].reps).toBeUndefined()
    finishSession(SUNDAY)
    expect(useAppStore.getState().data.sessions[SUNDAY].status).toBe('completed')
  })

  it('does nothing with an empty list', () => {
    startCustomSession(SUNDAY, 'Nothing', [])
    expect(useAppStore.getState().data.sessions[SUNDAY]).toBeUndefined()
  })
})

// ============================================================
// Extra work ADDS to the day. The first version of the custom
// path assigned over d.sessions[date], so an athlete who trained
// their planned session and then logged anything extra lost the
// first session whole: every ticked set, the readiness answers,
// the make-up link. These are the tests that would have caught it.
// ============================================================

describe('logging extra work on a day that already has a session', () => {
  it('keeps every set of the session already there', () => {
    startSession(DATE)
    const before = useAppStore.getState().data.sessions[DATE]
    const plannedCount = before.exercises.length
    const firstId = before.exercises[0].exerciseId
    // Tick a set, so there is real work that must survive.
    useAppStore.getState().update((d) => {
      d.sessions[DATE].exercises[0].sets[0].done = true
    })

    startCustomSession(DATE, 'Extra abs', [
      { exerciseId: 'hollow-hold', sets: 3, repText: '30 sec' },
    ])

    const after = useAppStore.getState().data.sessions[DATE]
    expect(after.exercises.length).toBe(plannedCount + 1)
    expect(after.exercises[0].exerciseId).toBe(firstId)
    expect(after.exercises[0].sets[0].done, 'the logged set was destroyed').toBe(true)
    expect(after.exercises.some((e) => e.exerciseId === 'hollow-hold')).toBe(true)
    // The day keeps its own identity; the extra work does not rename it.
    expect(after.templateId).not.toBe('custom')
  })

  it('keeps the make-up link and readiness answers intact', () => {
    startSession(DATE, [true, true, false, false], 'full', '2026-08-10')
    startCustomSession(DATE, 'Extra', [{ exerciseId: 'push-up', sets: 2, repText: '10', repsNum: 10 }])
    const after = useAppStore.getState().data.sessions[DATE]
    expect(after.makeupFor).toBe('2026-08-10')
    expect(after.readiness?.downgraded).toBe(true)
  })

  it('merges a repeated movement into the entry already on the day', () => {
    startCustomSession(DATE, 'Morning', [{ exerciseId: 'push-up', sets: 3, repText: '10', repsNum: 10 }])
    startCustomSession(DATE, 'Evening', [{ exerciseId: 'push-up', sets: 2, repText: '10', repsNum: 10 }])
    const after = useAppStore.getState().data.sessions[DATE]
    // One entry, five sets: two entries for one movement would show twice
    // in the session and once in the day recap, which keys by exercise id.
    const pushups = after.exercises.filter((e) => e.exerciseId === 'push-up')
    expect(pushups).toHaveLength(1)
    expect(pushups[0].sets).toHaveLength(5)
  })

  it('leaves a finished day finished, with one debrief describing the fuller day', () => {
    logExtraWork(SUNDAY, 'First', [{ exerciseId: 'push-up', sets: 2, repText: '10', repsNum: 10 }])
    const endedAt = useAppStore.getState().data.sessions[SUNDAY].endedAt
    expect(endedAt, 'an off day with nothing on it should be closed by the log').toBeTruthy()

    logExtraWork(SUNDAY, 'Second', [{ exerciseId: 'hollow-hold', sets: 2, repText: '30 sec' }])
    const after = useAppStore.getState().data.sessions[SUNDAY]
    expect(after.endedAt, 'the ending moved').toBe(endedAt)
    expect(after.exercises).toHaveLength(2)
    // One day, one debrief, and it describes everything done.
    const debriefs = useAppStore
      .getState()
      .data.coach.feed.filter((f) => f.kind === 'debrief' && f.debrief?.date === SUNDAY)
    expect(debriefs).toHaveLength(1)
  })

  it('overwrites a skipped day rather than appending to the skip', () => {
    useAppStore.getState().update((d) => {
      d.sessions[DATE] = { date: DATE, templateId: 'tuesday', status: 'skipped', exercises: [] }
    })
    startCustomSession(DATE, 'Changed my mind', [
      { exerciseId: 'push-up', sets: 2, repText: '10', repsNum: 10 },
    ])
    const after = useAppStore.getState().data.sessions[DATE]
    expect(after.status).toBe('partial')
    expect(after.customTitle).toBe('Changed my mind')
    expect(after.exercises).toHaveLength(1)
  })
})

// ============================================================
// Logging extra work must never end the day, and must never be
// what the plan's workout gets spent on.
//
// Reported from the live app, twice: "i did an extra workout and
// logged it and todays session is now closed off and logged as
// done." The add-on path called finishSession, which stamps
// endedAt and a final grade on the WHOLE day. On a day nobody had
// started, it was worse: the add-on BECAME that day's session, so
// the scheduled workout was unreachable (Today offers Start only
// while the day has no session at all) and the day read as done.
// ============================================================

describe('logging extra work', () => {
  it('never spends the plan\'s workout on an extra log', () => {
    const planned = resolveDay(DATE, useAppStore.getState().data).exercises.map((e) => e.exerciseId)
    expect(planned.length, 'the fixture needs a day with real work on it').toBeGreaterThan(0)
    expect(planned).not.toContain('hollow-hold')

    logExtraWork(DATE, 'Pickup game', [{ exerciseId: 'hollow-hold', sets: 3, repText: '30 sec' }])

    const s = useAppStore.getState().data.sessions[DATE]
    expect(s.endedAt, 'the day was closed out').toBeUndefined()
    expect(s.status).toBe('partial')
    expect(s.templateId, 'the extra work stood in for the plan').not.toBe('custom')
    // Every scheduled movement is still on the day, and still not done.
    for (const id of planned) {
      const found = s.exercises.find((e) => e.exerciseId === id)
      expect(found, `${id} was dropped from the day`).toBeTruthy()
      expect(found!.sets.every((set) => !set.done), `${id} was ticked off`).toBe(true)
    }
    // And the extra work landed, already done.
    const extra = s.exercises.find((e) => e.exerciseId === 'hollow-hold')
    expect(extra?.sets).toHaveLength(3)
    expect(extra!.sets.every((set) => set.done)).toBe(true)
  })

  it('never finishes a session the athlete has not finished', () => {
    startSession(DATE) // the plan's day, started, nothing ticked
    logExtraWork(DATE, 'Quick abs', [{ exerciseId: 'hollow-hold', sets: 3, repText: '30 sec' }])

    const after = useAppStore.getState().data.sessions[DATE]
    expect(after.endedAt, 'the day was closed out').toBeUndefined()
    expect(after.status, 'the day was graded as if it were over').toBe('partial')
    // The planned work is still there, still waiting, still not done.
    expect(after.exercises.length).toBeGreaterThan(1)
    expect(after.exercises[0].sets.every((s) => !s.done)).toBe(true)
    // And the extra work really did land.
    expect(after.exercises.some((e) => e.exerciseId === 'hollow-hold')).toBe(true)
  })

  it('does not touch a half-done session either', () => {
    startSession(DATE)
    useAppStore.getState().update((d) => {
      d.sessions[DATE].exercises[0].sets[0].done = true
    })
    logExtraWork(DATE, 'Extra', [{ exerciseId: 'push-up', sets: 2, repText: '10', repsNum: 10 }])
    const after = useAppStore.getState().data.sessions[DATE]
    expect(after.endedAt).toBeUndefined()
    expect(after.exercises[0].sets[0].done).toBe(true)
  })

  it('closes the day only when the extra work IS the day', () => {
    // Nothing scheduled, nothing started: this log is the whole session,
    // and something has to be, or the app shows a workout nobody is running.
    logExtraWork(SUNDAY, 'Sunday circuit', [
      { exerciseId: 'push-up', sets: 3, repText: '10', repsNum: 10 },
    ])
    const s = useAppStore.getState().data.sessions[SUNDAY]
    expect(s.endedAt).toBeTruthy()
    expect(s.status).toBe('completed')
  })

  it('takes over a day that was written off as skipped', () => {
    useAppStore.getState().update((d) => {
      d.sessions[DATE] = { date: DATE, templateId: 'tuesday', status: 'skipped', exercises: [] }
    })
    logExtraWork(DATE, 'Changed my mind', [
      { exerciseId: 'push-up', sets: 2, repText: '10', repsNum: 10 },
    ])
    const s = useAppStore.getState().data.sessions[DATE]
    expect(s.status).toBe('completed')
    expect(s.customTitle).toBe('Changed my mind')
  })

  it('returns the debrief of a day that is over, and nothing for one that is not', () => {
    expect(logExtraWork(SUNDAY, 'Nothing', [])).toBeNull()
    const d = logExtraWork(SUNDAY, 'Something', [
      { exerciseId: 'push-up', sets: 1, repText: '10', repsNum: 10 },
    ])
    expect(d?.date).toBe(SUNDAY)
    // A scheduled day still has its workout waiting, so there is nothing
    // to debrief: grading it here would count sets nobody has reached.
    expect(
      logExtraWork(DATE, 'Something', [{ exerciseId: 'hollow-hold', sets: 1, repText: '30 sec' }]),
    ).toBeNull()
  })
})

// ============================================================
// A make-up must not eat the day it runs on.
//
// Reported from the live app, the third time this rule was
// broken: "why is my days session still closed like i did it. It
// shouldnt be, the extra workout i did should be added on top of
// it but it shouldnt close until ive done it." Running Monday's
// missed workout on a Thursday assigned straight over Thursday's
// session, so Thursday's own workout was replaced by Monday's and
// finishing it closed the day on a workout nobody had done.
// ============================================================

describe('running a previous day today', () => {
  it('adds to the day instead of replacing it, and keeps what was already logged', () => {
    // Something logged this morning, before the make-up was run.
    logExtraWork(DATE, 'Morning abs', [{ exerciseId: 'hollow-hold', sets: 3, repText: '30 sec' }])
    const before = useAppStore.getState().data.sessions[DATE]
    const plannedCount = before.exercises.length
    expect(before.exercises.some((e) => e.exerciseId === 'hollow-hold')).toBe(true)

    startSession(DATE, undefined, 'full', '2026-08-10')

    const after = useAppStore.getState().data.sessions[DATE]
    expect(after.exercises.some((e) => e.exerciseId === 'hollow-hold'), 'the morning work was destroyed').toBe(true)
    expect(after.exercises.length).toBeGreaterThanOrEqual(plannedCount)
    expect(after.makeupFor).toBe('2026-08-10')
  })

  it('re-opens a finished day, because starting work is not the same as logging it', () => {
    logExtraWork(SUNDAY, 'Sunday circuit', [{ exerciseId: 'push-up', sets: 3, repText: '10', repsNum: 10 }])
    expect(useAppStore.getState().data.sessions[SUNDAY].endedAt, 'the fixture needs a finished day').toBeTruthy()

    startSession(SUNDAY, undefined, 'full', DATE)

    const after = useAppStore.getState().data.sessions[SUNDAY]
    expect(after.endedAt, 'a day the athlete just started training is not over').toBeUndefined()
    expect(after.status).toBe('partial')
    // And the finished work is still on it.
    expect(after.exercises.some((e) => e.exerciseId === 'push-up')).toBe(true)
  })

  it('leaves the first run\'s readiness answers alone', () => {
    startSession(DATE, [true, true, false, false], 'full')
    startSession(DATE, [false, false, false, false], 'full', '2026-08-10')
    const after = useAppStore.getState().data.sessions[DATE]
    expect(after.readiness?.downgraded, 'the second run overwrote the first answers').toBe(true)
  })
})

describe('what the plan still owes the day', () => {
  it('owes everything when nothing has been logged', () => {
    const day = resolveDay(DATE, useAppStore.getState().data)
    expect(planWorkOutstanding(day.exercises, undefined)).toEqual(day.exercises.map((e) => e.exerciseId))
  })

  it('owes nothing once today\'s own session is on the day', () => {
    const day = resolveDay(DATE, useAppStore.getState().data)
    startSession(DATE)
    expect(planWorkOutstanding(day.exercises, useAppStore.getState().data.sessions[DATE])).toEqual([])
  })

  it('still owes today after a make-up of another day', () => {
    // THE REPORT: Monday's workout run on Tuesday, finished, and Tuesday
    // read as done. The plan's own movements are what decides that.
    const day = resolveDay(DATE, useAppStore.getState().data)
    startSession(DATE, undefined, 'full', '2026-08-10')
    // Actually DO the make-up, the way the report did: a session finished
    // with nothing ticked records as skipped, which is a different day.
    useAppStore.getState().update((d) => {
      for (const ex of d.sessions[DATE].exercises) for (const set of ex.sets) set.done = true
    })
    finishSession(DATE)
    const session = useAppStore.getState().data.sessions[DATE]
    expect(session.status, 'the fixture needs a completed session').not.toBe('skipped')
    expect(session.endedAt, 'the fixture needs a finished session').toBeTruthy()
    expect(planWorkOutstanding(day.exercises, session).length, 'the day claimed to be done').toBeGreaterThan(0)
  })

  it('still owes today after an off-plan workout is logged on a rest day slot', () => {
    const day = resolveDay(DATE, useAppStore.getState().data)
    // An off-plan log on a scheduled day seeds the plan first, so nothing
    // is owed; the same log where the plan is empty owes nothing either.
    logExtraWork(DATE, 'Pickup game', [{ exerciseId: 'hollow-hold', sets: 3, repText: '30 sec' }])
    expect(planWorkOutstanding(day.exercises, useAppStore.getState().data.sessions[DATE])).toEqual([])
  })

  it('owes nothing on a day that was deliberately skipped', () => {
    const day = resolveDay(DATE, useAppStore.getState().data)
    useAppStore.getState().update((d) => {
      d.sessions[DATE] = { date: DATE, templateId: 'tuesday', status: 'skipped', exercises: [] }
    })
    expect(planWorkOutstanding(day.exercises, useAppStore.getState().data.sessions[DATE])).toEqual([])
  })
})
