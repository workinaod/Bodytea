import { beforeEach, describe, expect, it } from 'vitest'
import type { AppData } from '../types'
import { defaultWeekState, emptyAppData } from '../types'
import { useAppStore } from '../store/appStore'
import { finishSession, trimToday } from './actions'
import { startCustomSession, startSession } from './sessionStart'

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

  it('re-opens a finished day and drops the debrief that no longer describes it', () => {
    startCustomSession(DATE, 'First', [{ exerciseId: 'push-up', sets: 2, repText: '10', repsNum: 10 }], {
      markDone: true,
    })
    finishSession(DATE)
    expect(useAppStore.getState().data.sessions[DATE].endedAt).toBeTruthy()
    const debriefsAfterFirst = useAppStore
      .getState()
      .data.coach.feed.filter((f) => f.kind === 'debrief' && f.debrief?.date === DATE)
    expect(debriefsAfterFirst).toHaveLength(1)

    startCustomSession(DATE, 'Second', [{ exerciseId: 'hollow-hold', sets: 2, repText: '30 sec' }])
    const after = useAppStore.getState().data.sessions[DATE]
    expect(after.endedAt, 'the day stayed closed').toBeUndefined()
    expect(after.status).toBe('partial')
    // One day, one debrief: the old one described a day that no longer happened.
    const debriefs = useAppStore
      .getState()
      .data.coach.feed.filter((f) => f.kind === 'debrief' && f.debrief?.date === DATE)
    expect(debriefs).toHaveLength(0)
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
