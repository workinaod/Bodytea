import type { AthleticQuality } from './athletic'
import type { Joint } from './movement'

/**
 * What a sport is made of, in the engine's own vocabulary.
 *
 * R11 found the app's worst dead wire: `sport` is asked, `sport-role` is
 * asked, `sport-level` is asked, `in-season` is asked, and NOTHING read
 * any of them. The question's own informs string calls it "the biggest
 * single lever there is" and it moved nothing.
 *
 * The half that was missing is weights. An ordered `string[]` cannot say
 * "volleyball needs absorption as much as it needs vertical power, and
 * needs max velocity NOT AT ALL", which is exactly the distinction that
 * changes a plan. A weight of 0 is an instruction, not an absence.
 *
 * This is the source of truth. `followups.ts` derives its old
 * `SPORT_QUALITIES` and `POSITIONS` tables from here, so the question
 * bank and the plan can never disagree about which sports exist.
 *
 * TWO OF R11'S WEIGHTS CANNOT BE WRITTEN YET. The pack assigns
 * `work-capacity` and `mobility` to nine sports between them, and
 * neither is an `AthleticQuality`. Widening that union is not free:
 * `movement.test.ts` flags any quality with fewer than two drills, so
 * the values need drills authored before they can exist, and R11 lists
 * the widening as an owner question. They are left out rather than
 * faked, and `MISSING_QUALITIES` below records exactly what was lost so
 * the day the union grows there is a list to come back to.
 */

export type QualityWeight = 0 | 1 | 2 | 3
export type SportContact = 'none' | 'incidental' | 'collision'
export type EnergyLead = 'alactic' | 'glycolytic' | 'aerobic'

/** A position edits the base profile. It never replaces it. */
export interface PositionOverride {
  weights?: Partial<Record<AthleticQuality, QualityWeight>>
  injuryWatch?: Joint[]
}

export interface SportProfile {
  /** 0 means do not program, not program last. */
  weights: Partial<Record<AthleticQuality, QualityWeight>>
  energyLead: EnergyLead
  contact: SportContact
  /**
   * Joints the needs analysis says to watch. Joins MOVEMENT.stress.
   *
   * R11 names injury SITES, and some of them are muscles: soccer's is
   * the hamstring. The catalog's vocabulary is joints, so a muscle site
   * becomes the joints it crosses (hamstring -> hip + knee). That is a
   * real loss of precision and it is deliberate: one vocabulary that
   * MOVEMENT.stress can actually be matched against beats two that
   * cannot.
   */
  injuryWatch: Joint[]
  /** 'ball' switches on the practice machinery resolveDay already has. */
  sportMode: 'ball' | 'generic'
  /** R11 profiled twelve sports. The rest are read off the old list. */
  confidence: 'source' | 'house'
  positions?: Record<string, PositionOverride>
}

/**
 * R11 weights this table cannot express yet, kept so nothing is quietly
 * dropped. Read by the test that pins the gap, and by nothing else.
 */
export const MISSING_QUALITIES: Record<string, string[]> = {
  Soccer: ['work-capacity 3'],
  'Baseball / softball': ['mobility 2', 'pitcher: mobility 3, work-capacity 1'],
  Tennis: ['mobility 2'],
  Running: ['work-capacity 3'],
  Swimming: ['mobility 3', 'work-capacity 2'],
  'Martial arts / boxing': ['work-capacity 3'],
  Wrestling: ['work-capacity 3'],
  Hockey: ['work-capacity 2', 'mobility 3'],
  Rugby: ['forward: work-capacity 3'],
  Golf: ['mobility 3'],
}

const P = (
  weights: Partial<Record<AthleticQuality, QualityWeight>>,
  energyLead: EnergyLead,
  contact: SportContact,
  injuryWatch: Joint[],
  extra?: Partial<SportProfile>,
): SportProfile => ({ weights, energyLead, contact, injuryWatch, sportMode: 'generic', confidence: 'house', ...extra })

export const SPORT_PROFILES: Record<string, SportProfile> = {
  // ---------------- Sourced: R11 section 4 profiles these twelve ----------------

  // ~50 explosive jumping actions a game, one every 52 seconds, and
  // almost never a max-velocity exposure: the working sprint range is
  // 0 to 15 feet. Ankle is the highest-frequency injury, knee the
  // highest-cost. The guard/big split is the clearest in the whole list.
  Basketball: P(
    { 'vertical-power': 3, 'elastic-reactive': 3, cod: 2, 'reactive-agility': 2, acceleration: 2, 'force-absorption': 2, 'foot-ankle': 2, 'athletic-strength': 2, deceleration: 2, 'max-velocity': 0 },
    'alactic', 'incidental', ['ankle', 'knee'],
    { sportMode: 'ball', confidence: 'source', positions: {
      Guard: { weights: { acceleration: 3, 'reactive-agility': 3, 'athletic-strength': 1 } },
      Wing: {},
      Big: { weights: { 'force-absorption': 3, 'athletic-strength': 3, 'reactive-agility': 1 } },
    } },
  ),

  // 10 +/- 5 sprints a match over ~10 km, and high-intensity
  // decelerations outnumber high-intensity accelerations. Hamstring is
  // the signature injury. A keeper is a different sport.
  Soccer: P(
    { acceleration: 3, 'sprint-hamstring': 3, deceleration: 3, cod: 2, 'max-velocity': 2, 'horizontal-power': 2, 'lateral-power': 1 },
    'aerobic', 'incidental', ['hip', 'knee', 'ankle'],
    { sportMode: 'ball', confidence: 'source', positions: {
      Keeper: { weights: { 'reactive-agility': 3, 'lateral-power': 3, 'force-absorption': 3, 'max-velocity': 0, 'sprint-hamstring': 1 } },
      Defender: {},
      Midfield: { weights: { cod: 3 } },
      Forward: { weights: { 'max-velocity': 3 } },
    } },
  ),

  // The sport where one quality profile is most wrong. Skill positions
  // touch true max velocity; the line rarely goes past ten yards.
  Football: P(
    { acceleration: 3, 'explosive-strength': 3, 'athletic-strength': 3, cod: 2, 'force-absorption': 2, deceleration: 2, 'max-velocity': 1 },
    'alactic', 'collision', ['shoulder', 'knee', 'hip'],
    { sportMode: 'ball', confidence: 'source', positions: {
      'Skill / back': { weights: { acceleration: 3, 'max-velocity': 2, cod: 3, deceleration: 3, 'explosive-strength': 2, 'sprint-hamstring': 3, 'athletic-strength': 2 } },
      Line: { weights: { 'athletic-strength': 3, 'explosive-strength': 3, 'horizontal-power': 3, 'force-absorption': 2, 'balance-stability': 2, acceleration: 1, 'max-velocity': 0 } },
      'Both ways': {},
    } },
  ),

  // A pitcher and a position player share a shoulder and nothing else.
  'Baseball / softball': P(
    { 'rotational-power': 3, acceleration: 3, 'explosive-strength': 2, coordination: 2, 'athletic-strength': 2, 'max-velocity': 1 },
    'alactic', 'none', ['shoulder', 'elbow'],
    { sportMode: 'ball', confidence: 'source', positions: {
      'Position player': {},
      Pitcher: { weights: { 'rotational-power': 3, 'athletic-strength': 2, 'balance-stability': 2, 'max-velocity': 0, 'vertical-power': 0, acceleration: 1 }, injuryWatch: ['shoulder', 'elbow'] },
      Catcher: { weights: { 'balance-stability': 2, 'force-absorption': 2, acceleration: 1 }, injuryWatch: ['shoulder', 'knee', 'hip'] },
    } },
  ),

  Tennis: P(
    { 'lateral-power': 3, 'reactive-agility': 3, deceleration: 3, 'rotational-power': 2, cod: 2, 'athletic-strength': 2, 'max-velocity': 0 },
    'alactic', 'none', ['shoulder', 'elbow', 'hip'],
    { confidence: 'source' },
  ),

  Volleyball: P(
    { 'vertical-power': 3, 'elastic-reactive': 3, 'force-absorption': 3, 'lateral-power': 2, coordination: 2, 'ankle-stiffness': 2, 'max-velocity': 0 },
    'alactic', 'none', ['shoulder', 'ankle', 'knee'],
    { sportMode: 'ball', confidence: 'source' },
  ),

  // Distance running. Jumping and cutting are not what it asks for.
  Running: P(
    { 'foot-ankle': 3, 'sprint-hamstring': 2, 'elastic-reactive': 2, 'sprint-mechanics': 2, 'athletic-strength': 2, 'vertical-power': 0, cod: 0 },
    'aerobic', 'none', ['knee', 'ankle', 'hip'],
    { confidence: 'source' },
  ),

  Swimming: P(
    // R11 leads swimming on mobility 3, which this union cannot say yet
    // (see MISSING_QUALITIES). Strength carries the lead in its place:
    // it is the next thing down in the same analysis, and leaving the
    // profile with no lead at all would have been the worse lie.
    { 'athletic-strength': 3, 'balance-stability': 2, 'rotational-power': 1, 'foot-ankle': 0, cod: 0, 'max-velocity': 0 },
    'glycolytic', 'none', ['shoulder'],
    { confidence: 'source', positions: {
      Sprint: { weights: { 'explosive-strength': 2, 'athletic-strength': 3 } },
      Distance: {},
      Mixed: {},
    } },
  ),

  'Martial arts / boxing': P(
    { 'rotational-power': 3, 'explosive-strength': 3, 'athletic-strength': 3, 'reactive-agility': 2, 'balance-stability': 2, 'max-velocity': 0 },
    'glycolytic', 'collision', ['shoulder', 'lower-back', 'knee'],
    { confidence: 'source', positions: {
      Striking: { weights: { 'rotational-power': 3, 'reactive-agility': 3 } },
      Grappling: { weights: { 'athletic-strength': 3, 'balance-stability': 3 } },
      Both: {},
    } },
  ),

  Hockey: P(
    { 'lateral-power': 3, 'balance-stability': 3, 'athletic-strength': 3, acceleration: 2, cod: 2, 'max-velocity': 0 },
    'alactic', 'collision', ['hip', 'lower-back', 'knee'],
    { sportMode: 'ball', confidence: 'source', positions: {
      Keeper: { weights: { 'reactive-agility': 3, 'lateral-power': 3, 'balance-stability': 3, acceleration: 0 } },
      Defence: {},
      Forward: { weights: { acceleration: 3 } },
    } },
  ),

  Rugby: P(
    { 'athletic-strength': 3, 'explosive-strength': 3, 'force-absorption': 3, acceleration: 2, deceleration: 2, 'max-velocity': 1 },
    'glycolytic', 'collision', ['shoulder', 'knee', 'hip'],
    { sportMode: 'ball', confidence: 'source', positions: {
      Back: { weights: { acceleration: 3, 'max-velocity': 2, cod: 3, deceleration: 3, 'sprint-hamstring': 3, 'athletic-strength': 2 } },
      Forward: { weights: { 'athletic-strength': 3, 'explosive-strength': 3, 'force-absorption': 3, acceleration: 2, 'max-velocity': 0 } },
    } },
  ),

  // R11: "everything else 0". The one sport in the list where that is
  // literally the right answer.
  Golf: P(
    { 'rotational-power': 3, 'balance-stability': 2, 'athletic-strength': 2, coordination: 2, acceleration: 0, 'max-velocity': 0, 'vertical-power': 0, cod: 0 },
    'alactic', 'none', ['lower-back', 'shoulder'],
    { confidence: 'source' },
  ),

  // ---------------- House: read off the old ordered lists ----------------
  // These sixteen were never profiled by R11. The weights are the old
  // SPORT_QUALITIES order turned into numbers (lead 3, next 2, tail 1)
  // plus the one or two zeroes the sport obviously earns. Marked house
  // so a later session can tell what was researched from what was read.

  'Track & field': P(
    { 'max-velocity': 3, 'sprint-mechanics': 3, acceleration: 2, 'elastic-reactive': 2, 'ankle-stiffness': 2, cod: 0 },
    'alactic', 'none', ['hip', 'knee', 'ankle'],
    { positions: {
      Sprints: { weights: { 'max-velocity': 3, acceleration: 3 } },
      Jumps: { weights: { 'vertical-power': 3, 'elastic-reactive': 3, 'force-absorption': 2 } },
      Throws: { weights: { 'rotational-power': 3, 'explosive-strength': 3, 'athletic-strength': 3, 'max-velocity': 1 } },
      Distance: { weights: { 'max-velocity': 0, 'foot-ankle': 3, 'sprint-mechanics': 1 } },
    } },
  ),
  Netball: P(
    { deceleration: 3, 'vertical-power': 3, cod: 2, 'force-absorption': 2, 'balance-stability': 2, 'max-velocity': 0 },
    'alactic', 'incidental', ['knee', 'ankle'],
    { sportMode: 'ball', positions: {
      Shooter: { weights: { 'vertical-power': 3, 'force-absorption': 3 } },
      'Centre court': { weights: { cod: 3, deceleration: 3 } },
      Defence: { weights: { 'vertical-power': 3, 'reactive-agility': 2 } },
    } },
  ),
  Cricket: P(
    // Running between the wickets is about twenty metres. There is no
    // top-speed exposure in this sport to train for.
    { 'rotational-power': 3, acceleration: 2, coordination: 2, 'explosive-strength': 2, 'max-velocity': 0 },
    'alactic', 'none', ['shoulder', 'lower-back'],
    { sportMode: 'ball', positions: {
      Batter: { weights: { 'rotational-power': 3, acceleration: 3 } },
      Bowler: { weights: { 'rotational-power': 3, 'explosive-strength': 3 }, injuryWatch: ['shoulder', 'lower-back', 'knee'] },
      Keeper: { weights: { 'reactive-agility': 3, 'balance-stability': 2 } },
      'All-rounder': {},
    } },
  ),
  Lacrosse: P(
    // A field sport with a stick: plenty of running, no jumping worth
    // spending a session on.
    { acceleration: 3, 'rotational-power': 2, cod: 2, 'max-velocity': 2, 'sprint-hamstring': 2, 'vertical-power': 0 },
    'alactic', 'incidental', ['shoulder', 'knee', 'hip'],
    { sportMode: 'ball' },
  ),
  Rowing: P(
    { 'athletic-strength': 3, 'explosive-strength': 2, 'balance-stability': 2, coordination: 2, 'max-velocity': 0, cod: 0 },
    'glycolytic', 'none', ['lower-back', 'knee'],
    { positions: {
      Sweep: { weights: { 'rotational-power': 2 } },
      Sculling: {},
      'Erg only': { weights: { 'balance-stability': 1 } },
    } },
  ),
  Cycling: P(
    { 'athletic-strength': 3, 'explosive-strength': 2, 'balance-stability': 2, cod: 0, 'max-velocity': 0, 'foot-ankle': 0 },
    'aerobic', 'none', ['knee', 'lower-back'],
  ),
  Climbing: P(
    { 'athletic-strength': 3, 'balance-stability': 2, coordination: 2, 'foot-ankle': 2, 'max-velocity': 0, cod: 0 },
    'glycolytic', 'none', ['shoulder', 'elbow', 'wrist'],
    { positions: {
      Bouldering: { weights: { 'explosive-strength': 3, 'athletic-strength': 3 } },
      'Sport / lead': {},
      Trad: {},
      'A bit of everything': {},
    } },
  ),
  'Snowboard / ski': P(
    { 'force-absorption': 3, deceleration: 3, 'rotational-power': 2, 'balance-stability': 2, 'athletic-strength': 2, 'max-velocity': 0 },
    'glycolytic', 'none', ['knee', 'ankle'],
    { positions: {
      'Park / freestyle': { weights: { 'force-absorption': 3, 'vertical-power': 2 } },
      'All-mountain': {},
      Racing: { weights: { 'athletic-strength': 3, deceleration: 3 } },
    } },
  ),
  Surfing: P(
    { 'balance-stability': 3, 'rotational-power': 2, 'explosive-strength': 2, coordination: 2, 'max-velocity': 0 },
    'glycolytic', 'none', ['shoulder', 'lower-back'],
  ),
  Skating: P(
    { 'lateral-power': 3, 'balance-stability': 2, acceleration: 2, 'foot-ankle': 2, 'max-velocity': 0 },
    'alactic', 'none', ['ankle', 'knee'],
  ),
  Wrestling: P(
    { 'athletic-strength': 3, 'explosive-strength': 3, 'rotational-power': 2, 'balance-stability': 2, 'max-velocity': 0 },
    'glycolytic', 'collision', ['shoulder', 'knee', 'lower-back'],
  ),
  Gymnastics: P(
    { 'athletic-strength': 3, 'elastic-reactive': 3, 'balance-stability': 2, coordination: 2, 'force-absorption': 2, 'max-velocity': 0, cod: 0 },
    'alactic', 'none', ['shoulder', 'wrist', 'lower-back'],
    { positions: {
      'Floor / tumbling': { weights: { 'elastic-reactive': 3, 'force-absorption': 3 } },
      'Bars / rings': { weights: { 'athletic-strength': 3 }, injuryWatch: ['shoulder', 'elbow', 'wrist'] },
      'All-around': {},
    } },
  ),
  Dance: P(
    { 'elastic-reactive': 3, 'balance-stability': 2, coordination: 2, 'force-absorption': 2, 'foot-ankle': 2, 'max-velocity': 0, cod: 0 },
    'glycolytic', 'none', ['ankle', 'hip'],
  ),
  CrossFit: P(
    { 'athletic-strength': 3, 'explosive-strength': 3, coordination: 2, 'max-velocity': 0 },
    'glycolytic', 'none', ['shoulder', 'lower-back'],
  ),
  Powerlifting: P(
    { 'athletic-strength': 3, 'explosive-strength': 2, 'max-velocity': 0, cod: 0, 'reactive-agility': 0 },
    'alactic', 'none', ['lower-back', 'shoulder', 'knee'],
  ),
  // Not an athletic-quality sport, but a plan still has to hold a body
  // together: the control to own the range and the base under the size.
  Bodybuilding: P(
    { 'athletic-strength': 3, 'balance-stability': 2, coordination: 2, 'max-velocity': 0, cod: 0, 'reactive-agility': 0 },
    'glycolytic', 'none', ['shoulder', 'lower-back'],
  ),
}

/**
 * What an unrecognised sport gets: the base nearly all of them share.
 *
 * There will always be a sport not on the list. The answer is not to
 * keep adding bespoke plans, it is to describe every sport as a mix of
 * qualities the engine already trains, and to SAY it is a general base
 * rather than pretend the app knows korfball.
 */
export const DEFAULT_SPORT_PROFILE: SportProfile = {
  weights: { acceleration: 2, 'athletic-strength': 2, cod: 2, 'balance-stability': 2 },
  energyLead: 'glycolytic',
  contact: 'none',
  injuryWatch: [],
  sportMode: 'generic',
  confidence: 'house',
}

/**
 * No sport answered at all, which is most people.
 *
 * This is NOT the same as a sport the app does not recognise, and the
 * difference is the whole reason it exists. The golden snapshot caught
 * it: handing the general-athletic-base weights to somebody who never
 * mentioned a sport reordered their press slot and quietly changed a
 * plan that no answer had asked to change. An empty weights table
 * scores every candidate at zero, so the pool comes back untouched.
 *
 * `qualitiesForSport(null)` has always returned an empty list. This is
 * the same contract, in profile shape.
 */
export const NO_SPORT_PROFILE: SportProfile = {
  weights: {},
  energyLead: 'glycolytic',
  contact: 'none',
  injuryWatch: [],
  sportMode: 'generic',
  confidence: 'house',
}
/** Merge a position's edits over the base. A position never replaces it. */
export function profileForSport(sport: string | null, position?: string | null): SportProfile {
  if (!sport) return NO_SPORT_PROFILE
  const base = SPORT_PROFILES[sport] ?? DEFAULT_SPORT_PROFILE
  const over = position ? base.positions?.[position] : undefined
  if (!over) return base
  return {
    ...base,
    weights: { ...base.weights, ...over.weights },
    injuryWatch: over.injuryWatch ?? base.injuryWatch,
  }
}

/** Highest weight first, then alphabetical so the order is stable. */
export function orderedQualities(p: SportProfile): string[] {
  return Object.entries(p.weights)
    .filter(([, w]) => (w ?? 0) > 0)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0) || a[0].localeCompare(b[0]))
    .map(([q]) => q)
}

/** Whether this sport's own practice already covers a quality. */
export function weightFor(p: SportProfile, quality: string): QualityWeight {
  return (p.weights as Record<string, QualityWeight | undefined>)[quality] ?? 0
}
