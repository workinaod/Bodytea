import { bboxAround, buildQuery, parsePlaces, type OsmElement, type Place, type PlaceActivity } from '../engine/places'

// ============================================================
// The network side of the outdoor finder.
//
// Overpass is community-run and rate-limited by courtesy rather
// than by key, so this behaves: one request per search, a real
// timeout, mirrors tried in order, and results cached so panning
// around does not hammer anyone's server.
// ============================================================

/**
 * Mirrors in preference order. The main instance is the busiest and
 * rejects most often, so a healthy mirror goes first.
 */
const MIRRORS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

const CACHE_MS = 15 * 60_000
const cache = new Map<string, { at: number; places: Place[] }>()

export interface FindOptions {
  radiusMi?: number
  freeOnly?: boolean
  publicOnly?: boolean
  limit?: number
  signal?: AbortSignal
}

export class PlacesUnavailable extends Error {}

/**
 * Find named places nearby for one activity.
 *
 * Throws PlacesUnavailable when every mirror is unreachable, so the UI
 * can say "can't reach the map right now" instead of showing an empty
 * list that reads as "there is nothing near you".
 */
export async function findPlaces(
  activity: PlaceActivity,
  at: { lat: number; lng: number },
  opts: FindOptions = {},
): Promise<Place[]> {
  const radiusMi = opts.radiusMi ?? 5
  // Coarse key: two decimals is ~1km, so small drifts reuse the cache.
  const key = `${activity}|${at.lat.toFixed(2)}|${at.lng.toFixed(2)}|${radiusMi}|${opts.freeOnly ? 1 : 0}|${opts.publicOnly ? 1 : 0}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.places.slice(0, opts.limit ?? 40)

  const query = buildQuery(activity, bboxAround(at.lat, at.lng, radiusMi))
  let lastErr: unknown = null

  // Two passes over the mirrors. Measured against the live API, the
  // common failure is a transient 504 or a dropped connection under
  // load: the same mirror that failed twice answered fine on the third
  // try. One pass would report "nothing near you" for a server hiccup.
  for (const url of [...MIRRORS, ...MIRRORS]) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: opts.signal,
      })
      if (!res.ok) {
        lastErr = new Error(`${url} returned ${res.status}`)
        continue
      }
      const json = (await res.json()) as { elements?: OsmElement[] }
      const places = parsePlaces(json.elements ?? [], activity, at, {
        freeOnly: opts.freeOnly,
        publicOnly: opts.publicOnly,
      })
      cache.set(key, { at: Date.now(), places })
      return places.slice(0, opts.limit ?? 40)
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') throw e
      lastErr = e
    }
  }
  throw new PlacesUnavailable(
    lastErr instanceof Error ? lastErr.message : 'No Overpass mirror answered',
  )
}

/** Drop everything cached. For a manual refresh. */
export function clearPlacesCache(): void {
  cache.clear()
}
