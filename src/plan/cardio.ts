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

// ============================================================
// What the phone can actually measure, per activity.
//
// The old model asked "running games or shooting around?" and
// took the answer as fact. That question is a guess made after
// the fact by someone who just played for an hour. Meanwhile the
// phone was in their pocket the whole time counting footfalls,
// which is evidence. This table is what turns that evidence into
// an intensity and a calorie number.
//
// WHY STEPS AND NOT GPS, ON A COURT. GPS error runs 2-25% in
// court sports and a pickleball court is 44 feet long, which is
// inside the error bar. A satellite cannot tell you how hard a
// tennis match was. A pedometer can.
//
// WHY THE STRIDE IS PER SPORT. A step is not a step. A soccer
// player covering ground takes a near-walking stride; a boxer
// bouncing in stance moves a few inches per footfall. Converting
// court steps at a walking stride is how an app tells someone
// they ran five miles around a volleyball court.
//
// WHERE THE NUMBERS COME FROM. Distance-covered figures are the
// trustworthy part of the literature, because they are measured
// with video and local positioning rather than inferred:
//
//   soccer         10.5 km / 90 min professional, 7.8 km / 90 min
//                  amateur (Premier League tracking comparison)
//   basketball     5-6 km per 40 min of live game time, reported
//                  between 4.4 and 7.6 km depending on whether
//                  stoppages are counted
//   tennis         ~3.2 km over a two-set singles match
//   volleyball     287-398 m per set indoors, ~1.2 km per hour
//   pickleball     3,322 steps per hour measured directly, on 53
//                  recreational players wearing accelerometers.
//                  Doubles came in at a 2,791 median
//   walking        100 steps/min is moderate intensity and 130 is
//                  vigorous, which is the most replicated cadence
//                  finding there is (CADENCE-Adults)
//
// The step-equivalence charts that corporate step challenges run
// on (tennis at 200 steps/min, boxing at 222) are NOT used as
// thresholds. Those convert effort into credit, not footfalls
// into a count, and they sit two to four times above what
// tracking data supports. They were used only as a ceiling.
//
// MET values stay on the Compendium, same as the modes above, so
// a measured tier and a self-reported mode land on the same
// scale. Where the Compendium has no middle entry the standard
// tier is interpolated between its own low and high, and never
// invented outside them.
// ============================================================

export interface ActivityTracking {
  /**
   * Does a pocket pedometer count anything real here? False for
   * everything done on wheels, blades or water, and false for
   * grappling, where the round is spent off your feet.
   */
  steps: boolean
  /** Where a distance number should come from, best source first. */
  distance: 'gps' | 'steps' | 'none'
  /**
   * Step length as a fraction of standing height, the same model
   * the pedometer already uses for walking (0.415) and running
   * (0.55). Court sports sit far below both.
   */
  stride?: number
  /**
   * Steps per hour. At or under `low` this is the easy version of
   * the activity, at or over `high` it is the hard one, and the
   * whole middle is a normal session.
   */
  band?: { low: number; high: number }
  /** MET at each measured tier, for the calorie estimate. */
  met?: { low: number; standard: number; high: number }
}

const ACTIVITY_TRACKING: Record<string, ActivityTracking> = {
  // ---- Locomotion: GPS is the measurement, steps are the backup ----
  // Calories come from speed for these (engine/runs.ts), so the MET
  // band is only here to keep the intensity read honest.
  run: {
    steps: true,
    distance: 'gps',
    stride: 0.55,
    // 130 steps/min is where walking becomes vigorous; 170 is a
    // normal running cadence held for an hour.
    band: { low: 7800, high: 10200 },
    met: { low: 7.0, standard: 9.8, high: 11.8 },
  },
  walk: {
    steps: true,
    distance: 'gps',
    stride: 0.415,
    // 90 and 130 steps/min, straddling the 100 that marks moderate.
    band: { low: 5400, high: 7800 },
    met: { low: 2.8, standard: 4.3, high: 6.3 },
  },
  hike: {
    steps: true,
    distance: 'gps',
    // Uneven ground shortens the stride and the cadence both.
    stride: 0.38,
    band: { low: 4800, high: 7200 },
    met: { low: 4.5, standard: 6.0, high: 8.0 },
  },
  // Wheels. Nothing to count, and the route is the measurement.
  bike: { steps: false, distance: 'gps' },

  // ---- Court sports: GPS is useless, steps are everything ----
  basketball: {
    steps: true,
    distance: 'steps',
    stride: 0.342,
    // Shooting around vs running full court. 8,000/hr matches both
    // the 4.5 km/hr of live-play tracking and the recreational
    // number the conversion charts land on, which is the one place
    // those charts agree with the literature.
    band: { low: 4500, high: 8000 },
    met: { low: 4.5, standard: 6.5, high: 8.0 },
  },
  tennis: {
    steps: true,
    distance: 'steps',
    stride: 0.285,
    // Hitting balls vs competitive singles.
    band: { low: 2800, high: 5200 },
    met: { low: 5.0, standard: 7.3, high: 8.0 },
  },
  pickleball: {
    steps: true,
    distance: 'steps',
    // The smallest court here, and the shortest steps on it.
    stride: 0.228,
    // Straight off the measured 3,322/hr average, with social
    // doubles under it and competitive singles over.
    band: { low: 2400, high: 4200 },
    met: { low: 4.1, standard: 4.8, high: 6.0 },
  },
  volleyball: {
    steps: true,
    distance: 'steps',
    stride: 0.285,
    // The least movement of any sport in this list. A set runs about
    // 22 minutes and covers 287-398 m, which at this stride is a
    // measured range of 1,570 to 2,180 steps per hour. The band is set
    // so that whole range reads as a normal indoor match, with a
    // standing-around rec game under it and beach or high-tempo
    // competitive play over.
    band: { low: 1500, high: 2400 },
    // Beach volleyball is 8.0 METs because of the SAND, not because
    // of the step rate, so no number of steps can reach it. The
    // mode chip still can.
    met: { low: 3.0, standard: 4.0, high: 6.0 },
  },

  // ---- Field sports: outdoors and big, so GPS works again ----
  soccer: {
    steps: true,
    distance: 'gps',
    stride: 0.513,
    // A kickaround, an amateur match at 5.2 km/hr, a professional
    // one at 7.0.
    band: { low: 3600, high: 7200 },
    met: { low: 7.0, standard: 8.5, high: 10.0 },
  },
  football: {
    steps: true,
    distance: 'gps',
    stride: 0.485,
    // Huddles and dead balls make this a lower rate than the effort
    // suggests, which is exactly why the rate alone should not set
    // it. Throwing around vs a real game.
    band: { low: 2400, high: 5400 },
    // The Compendium has catch at 2.5 and flag or tackle at 8.0 with
    // nothing between; the low and standard tiers are interpolated
    // inside that gap.
    met: { low: 4.0, standard: 6.0, high: 8.0 },
  },

  // ---- Combat: steps read effort, but they are not travel ----
  combat: {
    steps: true,
    // Footwork is measurable. Distance is not a thing anyone covers
    // in a boxing ring, and reporting one would be theatre.
    distance: 'none',
    band: { low: 2000, high: 5000 },
    met: { low: 5.3, standard: 7.8, high: 10.3 },
  },

  // ---- Counted, but not travelled ----
  'jump-rope': {
    steps: true,
    distance: 'none',
    // 60 and 120 landings per minute averaged across the whole
    // session, rest included. A boxer's three-on-one-off rounds
    // average out near 110.
    band: { low: 3600, high: 7200 },
    met: { low: 8.8, standard: 11.8, high: 12.3 },
  },

  // ---- Nothing to count, nothing to measure ----
  // Water, machines, blades and lifts. These keep the mode chip as
  // their only intensity signal, which for them is the honest one.
  swim: { steps: false, distance: 'none' },
  'row-erg': { steps: false, distance: 'none' },
  hockey: { steps: false, distance: 'none' },
  // Skiing rides back up. A lift at 10 mph and a gondola at 25 both
  // clear the teleport filter, so a GPS total for a ski day is roughly
  // double the distance actually skied, and there is no way from a
  // track alone to tell a descent from the ride that preceded it.
  // Nothing is better than a number that is wrong by half.
  snow: { steps: false, distance: 'none' },

  // Whatever the user named it. Assume feet on ground and a normal
  // walking stride, and let GPS take over if it turns out to move.
  custom: {
    steps: true,
    distance: 'gps',
    stride: 0.415,
    band: { low: 3000, high: 6000 },
    met: { low: 4.0, standard: 6.0, high: 8.0 },
  },
}

export function trackingFor(activityId: string): ActivityTracking {
  return ACTIVITY_TRACKING[activityId] ?? ACTIVITY_TRACKING.custom
}

/** Every id in the tracking table, for the guard that keeps it in step. */
export const TRACKED_IDS = Object.keys(ACTIVITY_TRACKING)

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
