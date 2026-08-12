import { describe, expect, it } from 'vitest'
import {
  bboxAround,
  buildQuery,
  haversineMi,
  hoursLabel,
  mapsLinks,
  parsePlaces,
  PARK_ADOPT_MI,
  type OsmElement,
  type Place,
} from './places'

// ============================================================
// The rule under test throughout: A PLACE WITHOUT A NAME IS
// NEVER RETURNED. Coordinates are not somewhere you can be told
// to go.
// ============================================================

const pitch = (id: number, lat: number, lon: number, tags: Record<string, string>): OsmElement => ({
  type: 'way',
  id,
  center: { lat, lon },
  tags: { leisure: 'pitch', ...tags },
})

const park = (id: number, lat: number, lon: number, name: string): OsmElement => ({
  type: 'way',
  id,
  center: { lat, lon },
  tags: { leisure: 'park', name },
})

const HERE = { lat: 40.75, lng: -73.98 }

describe('query building', () => {
  it('boxes a radius around a point', () => {
    const [s, w, n, e] = bboxAround(40.75, -73.98, 5).split(',').map(Number)
    expect(n).toBeGreaterThan(s)
    expect(e).toBeGreaterThan(w)
    // 5 miles is about 0.072 degrees of latitude
    expect(n - 40.75).toBeCloseTo(0.0725, 2)
  })

  it('widens longitude with latitude, so a box stays square on the ground', () => {
    const width = (lat: number) => {
      const [, w, , e] = bboxAround(lat, 0, 5).split(',').map(Number)
      return e - w
    }
    // Meridians converge toward the poles, so the same miles need more degrees
    expect(width(60)).toBeGreaterThan(width(0))
  })

  it('asks for named parks alongside the courts', () => {
    // Three quarters of pitches borrow a park's name, so they have to
    // arrive in the same response or the naming step cannot run.
    const q = buildQuery('basketball', '1,2,3,4')
    expect(q).toContain('"sport"~"basketball"')
    expect(q).toContain('"leisure"="park"')
    expect(q).toContain('out center tags')
  })

  it('asks for routes when the activity is a route', () => {
    expect(buildQuery('hike', '1,2,3,4')).toContain('"route"="hiking"')
    expect(buildQuery('bike', '1,2,3,4')).toContain('"route"="bicycle"')
    expect(buildQuery('run', '1,2,3,4')).toContain('"leisure"="track"')
  })

  it('covers the sports that are tagged under more than one name', () => {
    expect(buildQuery('soccer', 'b')).toMatch(/soccer\|football/)
    expect(buildQuery('rugby', 'b')).toMatch(/rugby_union/)
    expect(buildQuery('football', 'b')).toMatch(/american_football/)
  })
})

describe('naming', () => {
  it('keeps a place that names itself', () => {
    const out = parsePlaces([pitch(1, 40.75, -73.98, { sport: 'basketball', name: 'The Cage' })], 'basketball', HERE)
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('The Cage')
    expect(out[0].nameSource).toBe('own')
  })

  it('lets an anonymous court borrow the park it sits in', () => {
    const out = parsePlaces(
      [pitch(1, 40.7501, -73.9801, { sport: 'basketball' }), park(2, 40.7502, -73.9802, 'McKinley Playground')],
      'basketball',
      HERE,
    )
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('McKinley Playground')
    expect(out[0].nameSource).toBe('park')
    expect(out[0].kind).toBe('Basketball court')
  })

  it('drops a court with no name and no park near it', () => {
    // A mile away is not "in" the park.
    const out = parsePlaces(
      [pitch(1, 40.75, -73.98, { sport: 'basketball' }), park(2, 40.77, -73.98, 'Far Away Park')],
      'basketball',
      HERE,
    )
    expect(out).toEqual([])
  })

  it('adopts only within the stated radius', () => {
    const justInside = PARK_ADOPT_MI * 0.9
    const justOutside = PARK_ADOPT_MI * 1.5
    const at = (mi: number) => 40.75 + mi / 69
    expect(
      parsePlaces([pitch(1, 40.75, -73.98, { sport: 'tennis' }), park(2, at(justInside), -73.98, 'P')], 'tennis', HERE),
    ).toHaveLength(1)
    expect(
      parsePlaces([pitch(1, 40.75, -73.98, { sport: 'tennis' }), park(2, at(justOutside), -73.98, 'P')], 'tennis', HERE),
    ).toHaveLength(0)
  })
})

describe('filtering', () => {
  const set: OsmElement[] = [
    pitch(1, 40.7501, -73.98, { sport: 'tennis', name: 'Free Courts' }),
    pitch(2, 40.7502, -73.98, { sport: 'tennis', name: 'Paid Club', fee: 'yes' }),
    pitch(3, 40.7503, -73.98, { sport: 'tennis', name: 'Members Only', access: 'private' }),
    pitch(4, 40.7504, -73.98, { sport: 'tennis', name: 'Permit Courts', access: 'permit' }),
  ]

  it('reads fee and access straight off the map', () => {
    const all = parsePlaces(set, 'tennis', HERE)
    expect(all.find((p) => p.name === 'Free Courts')!.free).toBe(true)
    expect(all.find((p) => p.name === 'Paid Club')!.free).toBe(false)
    expect(all.find((p) => p.name === 'Members Only')!.access).toBe('private')
    expect(all.find((p) => p.name === 'Permit Courts')!.access).toBe('permit')
  })

  it('can return only the free, public ones', () => {
    const out = parsePlaces(set, 'tennis', HERE, { freeOnly: true, publicOnly: true })
    expect(out.map((p) => p.name)).toEqual(['Free Courts'])
  })
})

describe('results', () => {
  it('sorts nearest first', () => {
    const out = parsePlaces(
      [
        pitch(1, 40.80, -73.98, { sport: 'basketball', name: 'Far' }),
        pitch(2, 40.7505, -73.98, { sport: 'basketball', name: 'Near' }),
      ],
      'basketball',
      HERE,
    )
    expect(out.map((p) => p.name)).toEqual(['Near', 'Far'])
    expect(out[0].distanceMi).toBeLessThan(out[1].distanceMi)
  })

  it('collapses a park with six identical courts into one destination', () => {
    const els = [park(99, 40.7501, -73.98, 'Tompkins Square Park')]
    for (let i = 0; i < 6; i++) els.push(pitch(i, 40.7501, -73.98, { sport: 'basketball' }))
    const out = parsePlaces(els, 'basketball', HERE)
    expect(out).toHaveLength(1)
  })

  it('carries the details worth knowing before walking there', () => {
    const out = parsePlaces(
      [pitch(1, 40.75, -73.98, { sport: 'basketball', name: 'X', lit: 'yes', surface: 'asphalt', hoops: '4' })],
      'basketball',
      HERE,
    )
    expect(out[0].notes).toContain('Lit')
    expect(out[0].notes).toContain('asphalt')
    expect(out[0].notes).toContain('4 hoops')
  })
})

describe('hours', () => {
  const base: Place = {
    id: 'way/1', name: 'X', nameSource: 'own', activity: 'basketball', kind: 'Basketball court',
    lat: 0, lng: 0, distanceMi: 0, free: true, access: 'public', notes: [],
  }
  it('never invents opening hours', () => {
    expect(hoursLabel(base)).toBe('Hours not listed')
    expect(hoursLabel({ ...base, hours: '24/7' })).toBe('Open 24/7')
    expect(hoursLabel({ ...base, hours: 'Mo-Fr 06:00-22:00' })).toBe('Mo-Fr 06:00-22:00')
  })
})

describe('maps handoff', () => {
  it('sends the NAME, with coordinates only as a hint', () => {
    const links = mapsLinks({
      id: 'way/1', name: 'McCarren Park', nameSource: 'park', activity: 'soccer', kind: 'Soccer field',
      lat: 40.72, lng: -73.95, distanceMi: 1, free: true, access: 'public', notes: [],
    })
    expect(links.google).toContain('query=McCarren%20Park')
    expect(links.apple).toContain('q=McCarren%20Park')
    // Coordinates ride along to disambiguate, they are not the query.
    expect(links.google).toContain('40.72,-73.95')
    expect(links.apple).toContain('40.72,-73.95')
  })
})

describe('distance', () => {
  it('measures real ground distance', () => {
    // Manhattan to Brooklyn, roughly 4 miles
    const d = haversineMi(40.7580, -73.9855, 40.7061, -73.9969)
    expect(d).toBeGreaterThan(3.5)
    expect(d).toBeLessThan(4.2)
  })
})
