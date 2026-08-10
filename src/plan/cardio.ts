// ============================================================
// Daily cardio / sport catalog. Every athlete logs what THEY
// do — runs, rides, swims, games — with the questions that
// activity actually needs (indoor/outdoor, miles, minutes,
// games vs shooting around). `sport` + an intense mode marks
// the day as "played" so the engine treats it like ball:
// conditioning covered, next-day speed work protected.
// ============================================================

export interface CardioActivityDef {
  id: string
  label: string
  emoji: string
  /** A game-type sport — intense modes mark the week's played dates. */
  sport?: boolean
  /** Counts toward the weekly "at least one conditioning session" rule. */
  conditioning?: boolean
  asks: { where?: boolean; miles?: boolean; minutes?: boolean }
  /** Activity-specific question, e.g. running games vs shooting around. */
  modes?: { id: string; label: string; intense: boolean }[]
}

export const CARDIO_ACTIVITIES: CardioActivityDef[] = [
  { id: 'run', label: 'Run', emoji: '🏃', conditioning: true, asks: { where: true, miles: true, minutes: true } },
  { id: 'run-club', label: 'Run club', emoji: '👟', conditioning: true, asks: { miles: true, minutes: true } },
  { id: 'bike', label: 'Bike', emoji: '🚴', conditioning: true, asks: { where: true, miles: true, minutes: true } },
  { id: 'swim', label: 'Swim', emoji: '🏊', conditioning: true, asks: { minutes: true } },
  {
    id: 'basketball',
    label: 'Basketball',
    emoji: '🏀',
    sport: true,
    asks: { minutes: true },
    modes: [
      { id: 'games', label: 'Running games', intense: true },
      { id: 'shooting', label: 'Shooting around', intense: false },
    ],
  },
  {
    id: 'soccer',
    label: 'Soccer',
    emoji: '⚽',
    sport: true,
    asks: { minutes: true },
    modes: [
      { id: 'match', label: 'Match / pickup', intense: true },
      { id: 'kickaround', label: 'Kickaround', intense: false },
    ],
  },
  {
    id: 'tennis',
    label: 'Tennis',
    emoji: '🎾',
    sport: true,
    asks: { minutes: true },
    modes: [
      { id: 'match', label: 'Match', intense: true },
      { id: 'rally', label: 'Rally / hitting', intense: false },
    ],
  },
  {
    id: 'hockey',
    label: 'Hockey',
    emoji: '🏒',
    sport: true,
    asks: { minutes: true },
    modes: [
      { id: 'game', label: 'Game / scrimmage', intense: true },
      { id: 'skate', label: 'Skate / drills', intense: false },
    ],
  },
  { id: 'walk-hike', label: 'Walk / hike', emoji: '🥾', asks: { miles: true, minutes: true } },
  { id: 'row-erg', label: 'Row / erg', emoji: '🚣', conditioning: true, asks: { minutes: true } },
  { id: 'jump-rope', label: 'Jump rope', emoji: '🪢', conditioning: true, asks: { minutes: true } },
  { id: 'custom', label: 'Something else', emoji: '✨', conditioning: true, asks: { minutes: true } },
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
