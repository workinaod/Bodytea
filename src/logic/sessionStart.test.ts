import { beforeEach, describe, expect, it } from 'vitest'
import type { AppData } from '../types'
import { defaultWeekState, emptyAppData } from '../types'
import { useAppStore } from '../store/appStore'
import { trimToday } from './actions'
import { startSession } from './sessionStart'

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
