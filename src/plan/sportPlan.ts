import { QUALITY_LABELS, type AthleticQuality } from './athletic'
import { MOVEMENT } from './movement'
import { orderedQualities, profileForSport, SPORT_PROFILES, weightFor, type SportProfile } from './sportProfiles'

// ============================================================
// Where the sport answer meets the plan.
//
// R11 found the app's worst dead wire and it was not subtle: `sport`,
// `sport-role`, `sport-level` and `in-season` are all asked, and a grep
// of the whole repo returned zero production call sites for any of
// them. `sportOf` was exported and called from nowhere at all, not even
// from a test. The question's own informs string calls it "the biggest
// single lever there is".
//
// Two of the things needed to fix it were already in the repo, both
// dead. `SPORT_QUALITIES` says which qualities a sport needs.
// `MOVEMENT.transfer` says which lifts feed which qualities. They are
// two halves of one bridge and neither half was load bearing. This file
// is the join, and it adds no new data to make it.
// ============================================================

/**
 * How much this lift feeds the sport, summed over what it transfers to.
 *
 * `transfer` is declared 52 times in the catalog and, before this, was
 * read by exactly one test. A weight of 0 contributes nothing, so a
 * sport with no opinion about a quality neither promotes nor punishes
 * the lifts that feed it.
 */
function sportScore(exerciseId: string, sport: SportProfile): number {
  const m = MOVEMENT[exerciseId]
  if (!m?.transfer) return 0
  return m.transfer.reduce((sum, q) => sum + weightFor(sport, q), 0)
}

/**
 * Reorder a legal pool so the lift that most feeds this sport leads.
 *
 * The sport gets to promote, not to rewrite. A goal promotion still
 * leads when nothing in the pool transfers, ties keep the pool's own
 * order, and a profile with no matching weights returns the pool
 * untouched. That is what keeps this a bias and not a second generator.
 */
export function bySportTransfer(pool: string[], sport: SportProfile): string[] {
  if (pool.length < 2) return pool
  const best = pool.reduce((top, id) => (sportScore(id, sport) > sportScore(top, sport) ? id : top), pool[0])
  return best === pool[0] ? pool : [best, ...pool.filter((id) => id !== best)]
}

/** "a, b and c", because a bare comma list reads like a form. */
function listOf(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

const label = (q: string): string => QUALITY_LABELS[q as AthleticQuality] ?? q

/**
 * What the sport answer bought them, in one or two lines.
 *
 * Every other goal answer already produces a strategy line. Sport was
 * the exception, which is a strange thing for the answer the app calls
 * its biggest lever. This is the cheapest visible proof to the athlete
 * that it landed.
 *
 * The unknown-sport line is the one that matters most. The app does not
 * know korfball, and it says so, instead of quietly handing over a
 * general plan with a confident face on it.
 */
export function sportStrategy(sport: string | null, position: string | null): string[] {
  if (!sport) return []
  if (SPORT_PROFILES[sport] === undefined) {
    return [
      `I do not know ${sport}, so this is a general athletic base: getting off the mark, strength, changing direction, balance. Tell me what it actually asks of you and I will bias it.`,
    ]
  }
  const p = profileForSport(sport, position)
  const leads = orderedQualities(p)
    .filter((q) => weightFor(p, q) === 3)
    .map((q) => label(q).toLowerCase())
  const dropped = Object.entries(p.weights)
    .filter(([, w]) => w === 0)
    .map(([q]) => label(q).toLowerCase())
    .sort()
  const who = position ? `${sport}, ${position.toLowerCase()}, so this` : `${sport}, so this`
  const out = leads.length ? [`You play ${who} leans on ${listOf(leads)}.`] : []
  if (dropped.length) {
    out.push(
      `${listOf(dropped)} is not what ${sport.toLowerCase()} asks for, so I left it out rather than filling time with it.`,
    )
  }
  return out
}
