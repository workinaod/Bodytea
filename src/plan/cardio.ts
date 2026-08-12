// ============================================================
// Daily cardio / sport catalog. Every athlete logs what THEY
// do, runs, rides, swims, games, with the questions that
// activity actually needs (indoor/outdoor, miles, minutes,
// games vs shooting around). `sport` + an intense mode marks
// the day as "played" so the engine treats it like ball:
// conditioning covered, next-day speed work protected.
//
// MET values come from the Compendium of Physical Activities
// (Ainsworth et al., 2011 update), which is the reference every
// serious calorie model uses. They are per-MODE where the mode
// genuinely changes the cost: a competitive soccer match is 10
// METs, a kickaround is 7, and pretending those are the same
// number is how fitness apps end up lying about calories.
// ============================================================

export interface CardioActivityDef {
  id: string
  label: string
  emoji: string
  /** A game-type sport, intense modes mark the week's played dates. */
  sport?: boolean
  /** Counts toward the weekly "at least one conditioning session" rule. */
  conditioning?: boolean
  /** Recorded live with GPS and its own tracker screen. */
  gps?: boolean
  /** Compendium MET for the default/moderate effort. */
  met: number
  asks: { where?: boolean; miles?: boolean; minutes?: boolean }
  /** Activity-specific question, e.g. running games vs shooting around. */
  modes?: { id: string; label: string; intense: boolean; met?: number }[]
}

export const CARDIO_ACTIVITIES: CardioActivityDef[] = [
  // ---- GPS-tracked: their own recorder, live pace and route ----
  { id: 'run', label: 'Run', emoji: '🏃', conditioning: true, gps: true, met: 9.8, asks: { where: true, miles: true, minutes: true } },
  { id: 'bike', label: 'Bike', emoji: '🚴', conditioning: true, gps: true, met: 8.0, asks: { where: true, miles: true, minutes: true } },
  { id: 'walk', label: 'Walk', emoji: '🚶', gps: true, met: 4.3, asks: { where: true, miles: true, minutes: true } },

  // ---- Endurance ----
  {
    id: 'swim',
    label: 'Swim',
    emoji: '🏊',
    conditioning: true,
    met: 5.8,
    asks: { minutes: true },
    modes: [
      { id: 'laps', label: 'Laps, steady', intense: false, met: 5.8 },
      { id: 'hard', label: 'Hard sets', intense: true, met: 9.8 },
    ],
  },
  { id: 'row-erg', label: 'Row / erg', emoji: '🚣', conditioning: true, met: 7.0, asks: { minutes: true } },
  { id: 'jump-rope', label: 'Jump rope', emoji: '🪢', conditioning: true, met: 11.8, asks: { minutes: true } },
  { id: 'hike', label: 'Hike', emoji: '🥾', conditioning: true, gps: true, met: 6.0, asks: { miles: true, minutes: true } },

  // ---- Court sports ----
  {
    id: 'basketball',
    label: 'Basketball',
    emoji: '🏀',
    sport: true,
    met: 6.5,
    asks: { minutes: true },
    modes: [
      { id: 'games', label: 'Running games', intense: true, met: 8.0 },
      { id: 'shooting', label: 'Shooting around', intense: false, met: 4.5 },
    ],
  },
  {
    id: 'pickleball',
    label: 'Pickleball',
    emoji: '🥒',
    sport: true,
    met: 4.8,
    asks: { minutes: true },
    modes: [
      { id: 'singles', label: 'Singles / competitive', intense: true, met: 6.0 },
      { id: 'doubles', label: 'Doubles / social', intense: false, met: 4.1 },
    ],
  },
  {
    id: 'tennis',
    label: 'Tennis',
    emoji: '🎾',
    sport: true,
    met: 7.3,
    asks: { minutes: true },
    modes: [
      { id: 'singles', label: 'Singles', intense: true, met: 8.0 },
      { id: 'doubles', label: 'Doubles', intense: false, met: 6.0 },
      { id: 'rally', label: 'Rally / hitting', intense: false, met: 5.0 },
    ],
  },
  {
    id: 'volleyball',
    label: 'Volleyball',
    emoji: '🏐',
    sport: true,
    met: 4.0,
    asks: { minutes: true },
    modes: [
      { id: 'beach', label: 'Beach / sand', intense: true, met: 8.0 },
      { id: 'competitive', label: 'Competitive, indoor', intense: true, met: 6.0 },
      { id: 'casual', label: 'Casual / rec', intense: false, met: 3.0 },
    ],
  },

  // ---- Field sports ----
  {
    id: 'soccer',
    label: 'Soccer',
    emoji: '⚽',
    sport: true,
    met: 7.0,
    asks: { minutes: true },
    modes: [
      { id: 'match', label: 'Match / pickup', intense: true, met: 10.0 },
      { id: 'kickaround', label: 'Kickaround', intense: false, met: 7.0 },
    ],
  },
  {
    id: 'football',
    label: 'Football',
    emoji: '🏈',
    sport: true,
    met: 8.0,
    asks: { minutes: true },
    modes: [
      { id: 'tackle', label: 'Tackle / full pads', intense: true, met: 8.0 },
      { id: 'flag', label: 'Flag / touch', intense: true, met: 8.0 },
      { id: 'throwing', label: 'Throwing around', intense: false, met: 2.5 },
    ],
  },
  {
    id: 'hockey',
    label: 'Hockey',
    emoji: '🏒',
    sport: true,
    met: 8.0,
    asks: { minutes: true },
    modes: [
      { id: 'game', label: 'Game / scrimmage', intense: true, met: 8.0 },
      { id: 'skate', label: 'Skate / drills', intense: false, met: 6.0 },
    ],
  },

  // ---- Combat ----
  {
    id: 'combat',
    label: 'Combat sport',
    emoji: '🥊',
    sport: true,
    conditioning: true,
    met: 7.8,
    asks: { minutes: true },
    modes: [
      { id: 'sparring', label: 'Sparring / rolling', intense: true, met: 7.8 },
      { id: 'martial-arts', label: 'Judo, karate, kickboxing', intense: true, met: 10.3 },
      { id: 'bag', label: 'Bag work / pads', intense: false, met: 5.5 },
      { id: 'technique', label: 'Technique / drilling', intense: false, met: 5.3 },
    ],
  },

  // ---- Snow ----
  {
    id: 'snow',
    label: 'Ski / snowboard',
    emoji: '🏂',
    met: 5.3,
    asks: { minutes: true },
    modes: [
      { id: 'downhill', label: 'Downhill, moderate', intense: false, met: 5.3 },
      { id: 'hard', label: 'Steep / hard runs', intense: true, met: 8.0 },
      { id: 'nordic', label: 'Cross-country', intense: true, met: 9.0 },
    ],
  },

  { id: 'custom', label: 'Custom', emoji: '✨', conditioning: true, met: 6.0, asks: { minutes: true } },
]

export function cardioActivity(id: string): CardioActivityDef {
  return CARDIO_ACTIVITIES.find((a) => a.id === id) ?? CARDIO_ACTIVITIES[CARDIO_ACTIVITIES.length - 1]
}

/** Does this logged entry count as an intense "played" day (ball semantics)? */
export function isIntenseSport(activityId: string, mode?: string): boolean {
  const def = cardioActivity(activityId)
  if (!def.sport) return false
  const m = def.modes?.find((x) => x.id === mode)
  return m ? m.intense : true
}

/** The three activities with their own live recorder. */
export const GPS_ACTIVITIES = CARDIO_ACTIVITIES.filter((a) => a.gps)

/**
 * The MET for an activity at a given effort, which is what a calorie
 * estimate should actually be built on. Falls back to the activity's
 * moderate value when no mode was picked.
 */
export function metFor(activityId: string, modeId?: string | null): number {
  const def = cardioActivity(activityId)
  if (modeId) {
    const mode = def.modes?.find((m) => m.id === modeId)
    if (mode?.met) return mode.met
  }
  return def.met
}
