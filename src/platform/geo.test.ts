import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { watchDistance } from './geo'

// ============================================================
// The accumulation loop, with the satellites faked.
//
// The maths underneath (haversine, the junk-fix filter) is
// already covered in engine/runs.ts. What is new here is the
// running total: what it keeps, what it throws away, and whether
// it survives a platform that has no geolocation at all.
// ============================================================

type Fix = { coords: { latitude: number; longitude: number; accuracy: number } }
type Cb = (f: Fix) => void

let cb: Cb | null = null
let cleared = 0
let now = 0

/** ~111 m per 0.001 degree of latitude, close enough for a fixture. */
const NORTH_100M = 0.0009

function send(lat: number, lng: number, accuracy = 5, afterSec = 30) {
  now += afterSec * 1000
  vi.setSystemTime(now)
  cb?.({ coords: { latitude: lat, longitude: lng, accuracy } })
}

beforeEach(() => {
  cb = null
  cleared = 0
  now = 1_700_000_000_000
  vi.useFakeTimers()
  vi.setSystemTime(now)
  vi.stubGlobal('navigator', {
    geolocation: {
      watchPosition: (c: Cb) => {
        cb = c
        return 7
      },
      clearWatch: () => {
        cleared++
      },
    },
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('watchDistance', () => {
  it('adds up the ground covered between fixes', () => {
    const w = watchDistance()!
    expect(w.miles()).toBe(0)
    expect(w.hasFix()).toBe(false)

    send(40.0, -74.0)
    expect(w.hasFix()).toBe(true)
    // One fix is a position, not a distance.
    expect(w.miles()).toBe(0)

    send(40.0 + NORTH_100M, -74.0)
    send(40.0 + NORTH_100M * 2, -74.0)
    // Two hundred metres is a hair over a tenth of a mile.
    expect(w.miles()).toBeGreaterThan(0.11)
    expect(w.miles()).toBeLessThan(0.14)
  })

  // Each rejection gets its own watcher. Sharing one hid a bug in the
  // first version of these tests: a rejected fix does not become the
  // new `prev`, so the next fix was being measured against a point a
  // minute old and sailed through the speed check it was meant to fail.

  it('throws away a fix too vague to mean anything', () => {
    const w = watchDistance()!
    send(40.0, -74.0)
    send(40.0 + NORTH_100M, -74.0, 400)
    expect(w.miles()).toBe(0)
  })

  it('throws away a teleport', () => {
    // A hundred metres in a tenth of a second is 2,200 mph.
    const w = watchDistance()!
    send(40.0, -74.0)
    send(40.0 + NORTH_100M, -74.0, 5, 0.1)
    expect(w.miles()).toBe(0)
  })

  it('logs nothing for a whole hour of a phone sitting on a bench', () => {
    // The one that matters most, and the one the first version of this
    // file got wrong. It reused the run tracker's filter, which takes
    // any fix once 20 seconds have passed so a route keeps drawing
    // while you wait at a light. Applied to a TOTAL that clause turns
    // GPS wobble into mileage: a full hour on the sideline came out as
    // a quarter mile walked, and the calorie estimate believed it.
    const w = watchDistance()!
    send(40.0, -74.0)
    // An hour of fixes, wobbling a couple of metres either side of one
    // spot, which is what a stationary phone actually reports.
    for (let i = 1; i <= 1200; i++) {
      send(40.0 + (i % 2 === 0 ? 0.00002 : -0.00002), -74.0, 5, 3)
    }
    expect(w.miles()).toBe(0)
  })

  it('still takes the real move that follows a rejected one', () => {
    const w = watchDistance()!
    send(40.0, -74.0)
    send(40.0 + NORTH_100M, -74.0, 400) // rejected, too vague
    send(40.0 + NORTH_100M, -74.0) // same place, honestly measured
    expect(w.miles()).toBeGreaterThan(0.05)
  })

  it('lets go of the sensor when told to', () => {
    const w = watchDistance()!
    w.stop()
    expect(cleared).toBe(1)
  })

  it('returns null rather than pretending, on a platform with no GPS', () => {
    vi.stubGlobal('navigator', {})
    expect(watchDistance()).toBeNull()
  })
})
