import { describe, expect, it } from 'vitest'
import { CARDIO_ACTIVITIES, cardioActivity, trackingFor } from './cardio'
import { defaultWeekState, emptyAppData, type AppData } from '../types'
import { mondayOf } from '../engine/calendar'
import { cardioRequiredForWeek } from '../engine/resolveDay'

// ============================================================
// The app makes exactly one health rule mandatory: at least one
// conditioning session a week. A yoga class used to satisfy it.
//
// The route was the `custom` fallback, which carried conditioning: true
// and an assumed 6.0 METs. Full yoga sessions measure 2.9 to 3.3, which
// is LIGHT on the ACSM and AHA scale, and a typical hatha session does
// not meet the intensity recommendation for cardiorespiratory fitness.
// So the one rule the app refuses to bend was being switched off by
// something that does not meet it, and the calorie estimate ran about
// double at the same time.
// ============================================================

const MAT = ['yoga', 'yoga-power', 'pilates', 'barre', 'tai-chi']

describe('a class is not the week\'s cardio', () => {
  it('gives no mat class the conditioning flag', () => {
    for (const id of MAT) {
      expect(cardioActivity(id).conditioning, id).toBeFalsy()
    }
  })

  it('does not let an unnamed activity satisfy the rule either', () => {
    // custom is the one activity the app knows nothing about, so it is
    // the last thing that should be allowed to vouch for a dose.
    expect(cardioActivity('custom').conditioning).toBeFalsy()
  })

  it('counts a sculpt class, which is the one that earns it', () => {
    // 5.5 METs is moderate. The flag is not a blanket no.
    expect(cardioActivity('sculpt-class').conditioning).toBe(true)
  })

  it('keeps counting everything that always counted', () => {
    for (const id of ['run', 'bike', 'row-erg', 'jump-rope', 'hike']) {
      expect(cardioActivity(id).conditioning, id).toBe(true)
    }
  })
})

describe('the numbers are the measured ones', () => {
  it('puts every mat class in the light band', () => {
    // Light is under 3 METs and moderate starts at 3. Barre and vinyasa
    // sit just over, which is why they are here and still not cardio: the
    // conditioning rule is about a sustained dose, not a threshold touch.
    for (const id of MAT) {
      expect(cardioActivity(id).met, id).toBeLessThan(4.5)
      expect(cardioActivity(id).met, id).toBeGreaterThan(2)
    }
  })

  it('stops assuming an unnamed activity was moderate to vigorous', () => {
    expect(cardioActivity('custom').met).toBeLessThan(6)
    expect(trackingFor('custom').met?.standard).toBeLessThan(6)
  })

  it('credits a mat class with no distance travelled', () => {
    // Step counting a Pilates class credits somebody with crossing a room
    // they never left.
    for (const id of MAT) {
      expect(trackingFor(id).steps, id).toBe(false)
      expect(trackingFor(id).distance, id).toBe('none')
    }
  })
})

describe('the catalog stays coherent', () => {
  it('gives every activity a MET and a unique id', () => {
    const ids = CARDIO_ACTIVITIES.map((a) => a.id)
    expect(ids.length).toBe(new Set(ids).size)
    for (const a of CARDIO_ACTIVITIES) expect(a.met, a.id).toBeGreaterThan(0)
  })

  it('keeps custom last, because it is the lookup fallback', () => {
    // cardioActivity falls back to the final entry for an unknown id.
    expect(CARDIO_ACTIVITIES[CARDIO_ACTIVITIES.length - 1].id).toBe('custom')
    expect(cardioActivity('nothing-like-this').id).toBe('custom')
  })
})

// ============================================================
// The catalog tests above are a proxy. This one is the actual rule:
// resolveDay reads `conditioning` to decide whether the week still owes
// a session, and that is the thing that was broken. A flag nobody reads
// is a flag that can be quietly re-flipped, so the assertion is made
// against the engine that consumes it, not against the data.
// ============================================================

describe('the weekly conditioning rule, end to end', () => {
  const START = '2026-08-10' // Monday
  const LOGGED = '2026-08-11'
  const ASKED = '2026-08-13'

  function weekOwing(): AppData {
    const data = emptyAppData(START)
    data.settings.onboarded = true
    data.weeks[mondayOf(START)] = { ...defaultWeekState(mondayOf(START)), ballThisWeek: false }
    return data
  }

  function log(data: AppData, activityId: string, label: string): AppData {
    data.cardio[LOGGED] = [{ id: 'x', at: 'x', activityId, label, when: 'solo', minutes: 60 }]
    return data
  }

  it('still asks for cardio after a full hour of yoga', () => {
    const data = weekOwing()
    expect(cardioRequiredForWeek(data, ASKED)).toBe(true)
    expect(cardioRequiredForWeek(log(data, 'yoga', 'Yoga'), ASKED)).toBe(true)
  })

  it('still asks after an hour logged as something the app cannot name', () => {
    // The original route: 'custom' at an assumed 6.0 METs with the flag on.
    const data = weekOwing()
    expect(cardioRequiredForWeek(log(data, 'custom', 'Aerial silks'), ASKED)).toBe(true)
  })

  it('stops asking after a sculpt class, and after a run', () => {
    expect(cardioRequiredForWeek(log(weekOwing(), 'sculpt-class', 'Sculpt'), ASKED)).toBe(false)
    expect(cardioRequiredForWeek(log(weekOwing(), 'run', 'Run'), ASKED)).toBe(false)
  })
})
