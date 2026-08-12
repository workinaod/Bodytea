// ============================================================
// The outdoor finder: where can I actually go and do this?
//
// Source is OpenStreetMap through the Overpass API. Free, no key,
// no quota to buy, and it already carries the tags this needs:
// leisure=pitch + sport=*, leisure=track, routes for trails,
// access, fee and opening_hours.
//
// The hard rule from the brief: LIST ONLY PLACES WITH A NAME.
// Coordinates are useless to a human being told where to go.
// Measured against real data (a 9km box over Manhattan and North
// Brooklyn, 637 facilities):
//   11% carry their own name
//   74% sit inside a named park and can borrow it
//   14% are anonymous and get dropped
// So the naming step is not a nicety, it is the difference
// between 11% and 85% of the map being usable.
//
// Everything here is pure. The network call lives in
// platform/overpass.ts so this stays testable with fixtures.
// ============================================================

/** What someone wants to go and do. Maps onto OSM sport/route tags. */
export type PlaceActivity =
  | 'basketball'
  | 'soccer'
  | 'tennis'
  | 'pickleball'
  | 'volleyball'
  | 'football'
  | 'baseball'
  | 'cricket'
  | 'rugby'
  | 'hockey'
  | 'swim'
  | 'run'
  | 'walk'
  | 'hike'
  | 'bike'
  | 'skate'
  | 'climb'
  | 'fitness'

export interface OsmElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

export interface Place {
  id: string
  /** Always present. A place without one is never returned. */
  name: string
  /** Where the name came from, so the UI can be honest about it. */
  nameSource: 'own' | 'park'
  activity: PlaceActivity
  kind: string
  lat: number
  lng: number
  distanceMi: number
  /** Free to use as far as the data says. `fee=yes` is the only no. */
  free: boolean
  /** Raw opening_hours when the map has it. Never invented. */
  hours?: string
  /** Public, or needs a membership/permit. */
  access: 'public' | 'permit' | 'private'
  /** Surface, lit, indoor, etc. Whatever is worth knowing before you go. */
  notes: string[]
}

// ---------- Query building ----------

/**
 * OSM sport tag values per activity. Several are genuinely multi-valued
 * (`multi` pitches host whatever fits) and rugby splits into codes, so
 * these are regex alternatives rather than single strings.
 */
const SPORT_TAGS: Record<PlaceActivity, string> = {
  basketball: 'basketball',
  soccer: 'soccer|football',
  tennis: 'tennis',
  pickleball: 'pickleball',
  volleyball: 'volleyball|beachvolleyball',
  football: 'american_football|gridiron',
  baseball: 'baseball|softball',
  cricket: 'cricket',
  rugby: 'rugby|rugby_union|rugby_league',
  hockey: 'hockey|ice_hockey|field_hockey',
  swim: 'swimming',
  run: 'running|athletics',
  walk: 'running|athletics',
  hike: 'hiking',
  bike: 'cycling|bmx|mtb',
  skate: 'skateboard|skating',
  climb: 'climbing',
  fitness: 'fitness|calisthenics',
}

/** A bounding box in degrees, south,west,north,east as Overpass wants it. */
export function bboxAround(lat: number, lng: number, radiusMi: number): string {
  const dLat = radiusMi / 69
  const dLng = radiusMi / (69 * Math.max(0.1, Math.cos((lat * Math.PI) / 180)))
  return [lat - dLat, lng - dLng, lat + dLat, lng + dLng].map((n) => n.toFixed(5)).join(',')
}

/**
 * The Overpass query for one activity.
 *
 * Named parks come back alongside the facilities on purpose: three
 * quarters of pitches are anonymous and borrow their park's name, so
 * fetching them separately would double the round trips for the step
 * that makes the results usable at all.
 */
export function buildQuery(activity: PlaceActivity, bbox: string): string {
  const sport = SPORT_TAGS[activity]
  const parts: string[] = []

  if (activity === 'hike' || activity === 'walk') {
    parts.push(`nwr["route"="hiking"]["name"](${bbox});`)
    parts.push(`nwr["highway"="path"]["name"](${bbox});`)
  }
  if (activity === 'bike') {
    parts.push(`nwr["route"="bicycle"]["name"](${bbox});`)
    parts.push(`nwr["highway"="cycleway"]["name"](${bbox});`)
  }
  if (activity === 'run' || activity === 'walk') {
    parts.push(`nwr["leisure"="track"](${bbox});`)
  }
  if (activity === 'swim') {
    parts.push(`nwr["leisure"="swimming_pool"](${bbox});`)
    parts.push(`nwr["leisure"="water_park"](${bbox});`)
  }
  if (activity === 'fitness') {
    parts.push(`nwr["leisure"="fitness_station"](${bbox});`)
  }
  if (activity === 'skate') {
    parts.push(`nwr["leisure"="skatepark"](${bbox});`)
  }
  if (activity === 'climb') {
    parts.push(`nwr["sport"="climbing"](${bbox});`)
  }
  // Pitches cover the ball sports, and most of everything else too.
  parts.push(`nwr["leisure"="pitch"]["sport"~"${sport}"](${bbox});`)
  parts.push(`nwr["leisure"="sports_centre"]["sport"~"${sport}"](${bbox});`)
  // The name donors.
  parts.push(`nwr["leisure"="park"]["name"](${bbox});`)
  parts.push(`nwr["leisure"="nature_reserve"]["name"](${bbox});`)

  return `[out:json][timeout:30];(${parts.join('')});out center tags;`
}

// ---------- Parsing ----------

const R_MI = 3958.8

export function haversineMi(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(bLat - aLat)
  const dLng = rad(bLng - aLng)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * R_MI * Math.asin(Math.min(1, Math.sqrt(h)))
}

const posOf = (e: OsmElement): [number, number] | null => {
  if (e.center) return [e.center.lat, e.center.lon]
  if (e.lat !== undefined && e.lon !== undefined) return [e.lat, e.lon]
  return null
}

/** How far a facility may sit from a park before it stops being "in" it. */
export const PARK_ADOPT_MI = 0.19 // ~300 m

/** Human label for the kind of place, given its tags and the activity. */
function kindLabel(tags: Record<string, string>, activity: PlaceActivity): string {
  if (tags.leisure === 'track') return 'Running track'
  if (tags.leisure === 'swimming_pool') return 'Pool'
  if (tags.leisure === 'skatepark') return 'Skate park'
  if (tags.leisure === 'fitness_station') return 'Outdoor gym'
  if (tags.leisure === 'sports_centre') return 'Sports centre'
  if (tags.route === 'hiking' || tags.highway === 'path') return 'Trail'
  if (tags.route === 'bicycle' || tags.highway === 'cycleway') return 'Bike route'
  const courts: Partial<Record<PlaceActivity, string>> = {
    basketball: 'Basketball court',
    tennis: 'Tennis court',
    pickleball: 'Pickleball court',
    volleyball: 'Volleyball court',
    soccer: 'Soccer field',
    football: 'Football field',
    baseball: 'Baseball field',
    cricket: 'Cricket ground',
    rugby: 'Rugby pitch',
    hockey: 'Hockey rink',
    climb: 'Climbing spot',
  }
  return courts[activity] ?? 'Pitch'
}

/** Things worth knowing before you walk there. */
function notesFor(tags: Record<string, string>): string[] {
  const out: string[] = []
  if (tags.lit === 'yes') out.push('Lit')
  if (tags.indoor === 'yes' || tags.covered === 'yes') out.push('Indoor')
  if (tags.surface) out.push(tags.surface.replace(/_/g, ' '))
  if (tags.hoops) out.push(`${tags.hoops} hoops`)
  if (tags.lanes) out.push(`${tags.lanes} lanes`)
  if (tags.length) out.push(tags.length)
  return out
}

function accessOf(tags: Record<string, string>): Place['access'] {
  const a = tags.access
  if (a === 'private' || a === 'no') return 'private'
  if (a === 'permit' || a === 'customers' || a === 'members') return 'permit'
  return 'public'
}

/**
 * Turn a raw Overpass response into places a person can be sent to.
 *
 * Anonymous facilities borrow the name of the nearest named park within
 * PARK_ADOPT_MI, which is what lifts real-world coverage from 11% to
 * about 85%. Anything still nameless is dropped rather than shown as a
 * pair of coordinates.
 */
export function parsePlaces(
  elements: OsmElement[],
  activity: PlaceActivity,
  from: { lat: number; lng: number },
  opts: { freeOnly?: boolean; publicOnly?: boolean } = {},
): Place[] {
  const parks = elements.filter(
    (e) => (e.tags?.leisure === 'park' || e.tags?.leisure === 'nature_reserve') && e.tags?.name && posOf(e),
  )
  const out: Place[] = []

  for (const e of elements) {
    const tags = e.tags
    if (!tags) continue
    // Parks are name donors, not destinations, unless the activity IS the park.
    if ((tags.leisure === 'park' || tags.leisure === 'nature_reserve') && activity !== 'walk') continue
    const p = posOf(e)
    if (!p) continue
    const [lat, lng] = p

    let name = tags.name
    let nameSource: Place['nameSource'] = 'own'
    if (!name) {
      let best: OsmElement | null = null
      let bestD = Infinity
      for (const park of parks) {
        const pp = posOf(park)!
        const d = haversineMi(lat, lng, pp[0], pp[1])
        if (d < bestD) {
          bestD = d
          best = park
        }
      }
      if (best && bestD <= PARK_ADOPT_MI) {
        name = best.tags!.name
        nameSource = 'park'
      }
    }
    // The rule: no name, no listing.
    if (!name) continue

    const access = accessOf(tags)
    const free = tags.fee !== 'yes'
    if (opts.publicOnly && access !== 'public') continue
    if (opts.freeOnly && !free) continue

    out.push({
      id: `${e.type}/${e.id}`,
      name,
      nameSource,
      activity,
      kind: kindLabel(tags, activity),
      lat,
      lng,
      distanceMi: +haversineMi(from.lat, from.lng, lat, lng).toFixed(2),
      free,
      hours: tags.opening_hours,
      access,
      notes: notesFor(tags),
    })
  }

  // Nearest first, and one entry per name+kind: a park with six identical
  // courts is one destination, not six lines that all say the same thing.
  const seen = new Set<string>()
  return out
    .sort((a, b) => a.distanceMi - b.distanceMi)
    .filter((pl) => {
      const key = `${pl.name}|${pl.kind}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

// ---------- Handoff to a maps app ----------

/**
 * Deep links that search by NAME, with the coordinates only as a hint.
 * Sending raw coordinates drops people in a field near the thing they
 * wanted; sending the name lands them on the place itself.
 */
export function mapsLinks(place: Place): { google: string; apple: string } {
  const q = encodeURIComponent(place.name)
  const ll = `${place.lat},${place.lng}`
  return {
    google: `https://www.google.com/maps/search/?api=1&query=${q}&query_place_id=&center=${ll}`,
    apple: `https://maps.apple.com/?q=${q}&sll=${ll}`,
  }
}

/** What to say about opening hours without ever making them up. */
export function hoursLabel(place: Place): string {
  if (place.hours === '24/7') return 'Open 24/7'
  if (place.hours) return place.hours
  return 'Hours not listed'
}
