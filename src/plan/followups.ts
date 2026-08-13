import type { Goal } from '../types'

// ============================================================
// The questions a coach asks, generated rather than listed.
//
// Three things were wrong with the old version, and they were all
// the same thing: it was a table.
//
// It asked exactly three questions per goal, forever, because
// three fitted under the goal box. Three is not a number that
// comes from anywhere — a marathon in eleven weeks needs more
// asking than "get a bit fitter" does, and now that these have a
// screen of their own there is no reason to stop at three.
//
// It never read what the athlete had already told us. Somebody
// types "lose 30 lb before my wedding in June" and the old
// version's first question was "roughly how much do you want to
// lose?". Asking a person something they just said is the fastest
// way to prove nothing is listening.
//
// And it asked nobody about injuries — the question every real
// coach asks in the first minute, missing from all seven goals.
//
// So: a bank of questions, each tied to a decision the plan
// actually makes, and a builder that picks the ones THIS athlete
// still needs to answer.
// ============================================================

export type FollowupKind = 'chips' | 'number' | 'text'

export interface GoalFollowup {
  id: string
  q: string
  kind?: FollowupKind
  options?: string[]
  /** number/text: what goes in the empty box. */
  placeholder?: string
  /** number: the unit shown beside the box, and stored with the target. */
  unit?: string
  /** number: what this target is called on the climb ("Vert", "Bench"). */
  targetLabel?: string
  /** Shown only when an earlier answer was one of these. */
  showIf?: { id: string; is: string[] }
  /** What the plan does differently. Kept honest: no answer, no question. */
  informs: string
}

/**
 * The sports people actually play, and the ones the engine can bias for.
 *
 * This is the question the app was not asking at all. "Dominate my
 * sport" and then silence on which sport is the single worst miss in
 * the whole flow: a keeper, a distance midfielder and a lineman need
 * three different plans and the app was writing one.
 */
export const SPORTS = [
  'Basketball', 'Soccer', 'Football', 'Track & field', 'Tennis', 'Volleyball',
  'Baseball / softball', 'Hockey', 'Rugby', 'Netball', 'Cricket', 'Lacrosse',
  'Swimming', 'Rowing', 'Cycling', 'Running',
  'Climbing', 'Snowboard / ski', 'Surfing', 'Skating',
  'Martial arts / boxing', 'Wrestling', 'Gymnastics', 'Dance',
  'CrossFit', 'Powerlifting', 'Bodybuilding', 'Golf',
  'Something else',
] as const

/**
 * What each sport is mostly made of, in the engine's own vocabulary.
 *
 * This is what makes the app work for somebody it has never heard of.
 * There will always be a sport not on the list — the answer is not to
 * keep adding bespoke plans, it is to describe every sport as a mix of
 * the qualities the engine already trains. A climber is grip, pulling
 * and body control; a snowboarder is landing forces, rotation and knees
 * that can take it. Neither needs its own engine.
 *
 * `DEFAULT_SPORT_QUALITIES` is what an unrecognised answer gets: the
 * general athletic base almost every sport shares. Somebody who types
 * "korfball" still gets a coherent plan rather than a shrug.
 */
export const SPORT_QUALITIES: Record<string, string[]> = {
  Basketball: ['vertical-power', 'cod', 'reactive-agility', 'elastic-reactive', 'acceleration'],
  Soccer: ['acceleration', 'max-velocity', 'cod', 'sprint-hamstring', 'deceleration'],
  Football: ['acceleration', 'explosive-strength', 'athletic-strength', 'cod', 'force-absorption'],
  'Track & field': ['max-velocity', 'sprint-mechanics', 'acceleration', 'elastic-reactive', 'ankle-stiffness'],
  Tennis: ['lateral-power', 'rotational-power', 'reactive-agility', 'deceleration', 'cod'],
  Volleyball: ['vertical-power', 'elastic-reactive', 'force-absorption', 'lateral-power', 'coordination'],
  'Baseball / softball': ['rotational-power', 'acceleration', 'coordination', 'explosive-strength'],
  Hockey: ['lateral-power', 'acceleration', 'balance-stability', 'rotational-power', 'cod'],
  Rugby: ['acceleration', 'athletic-strength', 'explosive-strength', 'force-absorption', 'deceleration'],
  Netball: ['deceleration', 'vertical-power', 'cod', 'force-absorption', 'balance-stability'],
  Cricket: ['rotational-power', 'acceleration', 'coordination', 'explosive-strength'],
  Lacrosse: ['acceleration', 'rotational-power', 'cod', 'max-velocity'],
  Swimming: ['rotational-power', 'athletic-strength', 'coordination', 'balance-stability'],
  Rowing: ['athletic-strength', 'explosive-strength', 'balance-stability', 'coordination'],
  Cycling: ['athletic-strength', 'explosive-strength', 'balance-stability'],
  Running: ['sprint-mechanics', 'foot-ankle', 'sprint-hamstring', 'elastic-reactive'],
  // Grip and pulling, and the body control to stay on the wall.
  Climbing: ['athletic-strength', 'balance-stability', 'coordination', 'foot-ankle'],
  // Landing forces first: the injuries here are knees on impact.
  'Snowboard / ski': ['force-absorption', 'deceleration', 'rotational-power', 'balance-stability', 'athletic-strength'],
  Surfing: ['balance-stability', 'rotational-power', 'explosive-strength', 'coordination'],
  Skating: ['lateral-power', 'balance-stability', 'acceleration', 'foot-ankle'],
  'Martial arts / boxing': ['rotational-power', 'reactive-agility', 'explosive-strength', 'coordination'],
  Wrestling: ['athletic-strength', 'explosive-strength', 'rotational-power', 'balance-stability'],
  Gymnastics: ['athletic-strength', 'elastic-reactive', 'balance-stability', 'coordination', 'force-absorption'],
  Dance: ['elastic-reactive', 'balance-stability', 'coordination', 'force-absorption', 'foot-ankle'],
  CrossFit: ['athletic-strength', 'explosive-strength', 'coordination'],
  Powerlifting: ['athletic-strength', 'explosive-strength'],
  // Bodybuilding is not an athletic-quality sport, but a plan still has
  // to hold a body together: the control to own the range and the base
  // strength the size is built on.
  Bodybuilding: ['athletic-strength', 'balance-stability', 'coordination'],
  Golf: ['rotational-power', 'balance-stability', 'coordination'],
}

/** What an unrecognised sport gets: the base nearly all of them share. */
export const DEFAULT_SPORT_QUALITIES = ['acceleration', 'athletic-strength', 'cod', 'balance-stability']

/** The qualities to bias toward, for any answer including one we do not know. */
export function qualitiesForSport(sport: string | null): string[] {
  if (!sport) return []
  return SPORT_QUALITIES[sport] ?? DEFAULT_SPORT_QUALITIES
}

/** Positions worth asking about, per sport. Absent = do not ask. */
const POSITIONS: Record<string, string[]> = {
  Basketball: ['Guard', 'Wing', 'Big'],
  Soccer: ['Keeper', 'Defender', 'Midfield', 'Forward'],
  Football: ['Skill / back', 'Line', 'Both ways'],
  Hockey: ['Keeper', 'Defence', 'Forward'],
  Rugby: ['Back', 'Forward'],
  'Track & field': ['Sprints', 'Jumps', 'Throws', 'Distance'],
  Netball: ['Shooter', 'Centre court', 'Defence'],
  Cricket: ['Batter', 'Bowler', 'Keeper', 'All-rounder'],
  Climbing: ['Bouldering', 'Sport / lead', 'Trad', 'A bit of everything'],
  'Snowboard / ski': ['Park / freestyle', 'All-mountain', 'Racing'],
  Swimming: ['Sprint', 'Distance', 'Mixed'],
  Rowing: ['Sweep', 'Sculling', 'Erg only'],
  'Martial arts / boxing': ['Striking', 'Grappling', 'Both'],
  Gymnastics: ['Floor / tumbling', 'Bars / rings', 'All-around'],
}

// ---------------- The bank ----------------

const Q = {
  // ---- everyone, whatever they picked ----
  injuries: {
    id: 'injuries',
    q: 'Anything that hurts right now?',
    options: ['Nothing', 'Knees', 'Lower back', 'Shoulders', 'Hips', 'Ankles', 'Something else'],
    informs: 'Routes the plan around the joint from day one instead of waiting for it to flare.',
  },
  injuryWhat: {
    id: 'injury-what',
    q: 'What is it?',
    kind: 'text' as const,
    placeholder: 'Just so the plan can work around it',
    showIf: { id: 'injuries', is: ['Something else'] },
    informs: 'Shows in the coach notes so the plan is not written as if nothing is wrong.',
  },
  deadline: {
    id: 'deadline',
    q: 'Is there a date you are working to?',
    options: ['No date', 'A few weeks', 'A few months', 'This year'],
    informs: 'Decides whether the plan builds slowly or gets to the point.',
  },
  enjoy: {
    id: 'enjoy',
    q: 'What do you actually enjoy?',
    options: ['Lifting', 'Running', 'Classes', 'Sport', 'Walking', 'None of it yet'],
    informs: 'The plan leans on what you will actually turn up for.',
  },

  // ---- losing weight ----
  loseAmount: {
    id: 'lose-amount',
    q: 'Roughly how much do you want to lose?',
    options: ['A few pounds', '10 to 30 lb', '30 to 60 lb', 'More than that'],
    informs: 'Sets how long the plan runs and how big the calorie gap is.',
  },
  goalWeight: {
    id: 'goal-weight',
    q: 'Know the number you want to see?',
    kind: 'number' as const,
    placeholder: 'Leave blank if you would rather not',
    unit: 'lb',
    targetLabel: 'Bodyweight',
    informs: 'Becomes the finish line on your plan.',
  },
  foodStruggle: {
    id: 'food-struggle',
    q: 'Where does eating usually go wrong?',
    options: ['Snacking', 'Big portions', 'Drinks and sweets', 'Late at night', 'Eating out', 'It does not'],
    informs: 'Picks which one habit the food plan attacks first.',
  },
  beenHere: {
    id: 'been-here',
    q: 'Tried to lose weight before?',
    options: ['First go', 'Lost it, it came back', 'Yes, and kept it off'],
    informs: 'Somebody who has regained it needs a slower plan they can hold, not a faster one.',
  },
  dayMovement: {
    id: 'day-movement',
    q: 'Most days, are you sitting or moving?',
    options: ['Sitting', 'On my feet', 'Always moving'],
    informs: 'Sets the calorie baseline before a single session is counted.',
  },

  // ---- building muscle ----
  gainAmount: {
    id: 'gain-amount',
    q: 'How much bigger are you trying to get?',
    options: ['A bit more solid', 'Noticeably bigger', 'As much as I can'],
    informs: 'Sets how much you eat above maintenance.',
  },
  appetite: {
    id: 'appetite',
    q: 'How is eating for you?',
    options: ['Struggle to eat enough', 'Fine', 'I can always eat'],
    informs: 'Decides meal size and count — big meals fail people who are not hungry.',
  },
  sleepHours: {
    id: 'sleep-hours',
    q: 'How much sleep do you usually get?',
    options: ['Under 6 hours', '6 to 7', '8 or more'],
    informs: 'Under six, the plan holds volume back, because that is where it would be wasted.',
  },
  muscleWhere: {
    id: 'muscle-where',
    q: 'Anywhere you especially want it?',
    options: ['Upper body', 'Legs', 'Everywhere'],
    informs: 'Weights the week toward it without dropping the rest.',
  },

  // ---- getting strong ----
  liftFocus: {
    id: 'lift-focus',
    q: 'Which lift do you care most about?',
    options: ['Squat', 'Bench press', 'Deadlift', 'Overhead press', 'All of them'],
    informs: 'That lift gets the most frequency and the first slot on the day.',
  },
  liftTarget: {
    id: 'lift-target',
    q: 'A number you want to hit?',
    kind: 'number' as const,
    placeholder: 'Leave blank if you have not picked one',
    unit: 'lb',
    targetLabel: 'Target lift',
    informs: 'Becomes the finish line on your plan.',
  },
  barYears: {
    id: 'bar-years',
    q: 'How long have you been lifting?',
    options: ['Just starting', 'Under a year', '1 to 3 years', 'Longer'],
    informs: 'Beginners add weight every session. Nobody else does, and pretending otherwise stalls people.',
  },
  maxesKnown: {
    id: 'maxes-known',
    q: 'Do you know your best lifts?',
    options: ['Yes', 'Roughly', 'No idea'],
    informs: 'Decides whether week one is a starting weight or a find-your-weight session.',
  },

  // ---- jumping ----
  vertNow: {
    id: 'vert-now',
    q: 'How close to the rim are you now?',
    options: ['Can grab it', 'Touch it', 'Backboard', 'Net', 'Not close'],
    informs: 'Sets where the jump ladder starts.',
  },
  vertTarget: {
    id: 'vert-target',
    q: 'Want to name a jump number?',
    kind: 'number' as const,
    placeholder: 'Inches above your reach',
    unit: 'in',
    targetLabel: 'Vert',
    informs: 'Becomes the finish line on your plan.',
  },
  jumpHistory: {
    id: 'jump-history',
    q: 'Done jump training before?',
    options: ['Never', 'A bit', 'A lot'],
    informs: 'Never means landings first. Tendons take longer to toughen than muscles do.',
  },
  vertLimiting: {
    id: 'limiting',
    q: 'What feels like the thing holding you back?',
    options: ['Strength', 'Bounce', 'Not sure'],
    informs: 'Strength and bounce are trained differently. "Not sure" gets both while we find out.',
  },
  sprintFeel: {
    id: 'sprint-feel',
    q: 'When you last ran flat out, it felt',
    options: ['Fine', 'Stiff', 'It has been years'],
    informs: 'Years off means weeks of build-up before anything is done at full speed.',
  },
  jumpFor: {
    id: 'jump-for',
    q: 'Jumping for something in particular?',
    options: ['Basketball', 'Volleyball', 'Track', 'Just want to dunk'],
    informs: 'One foot or two changes which jump you actually train.',
  },

  // ---- speed and sport ----
  sport: {
    id: 'sport',
    q: 'What do you play?',
    options: [...SPORTS],
    informs: 'The biggest single lever there is — it decides which athletic quality leads the plan.',
  },
  sportOther: {
    id: 'sport-other',
    q: 'Which one?',
    kind: 'text' as const,
    placeholder: 'Type your sport',
    showIf: { id: 'sport', is: ['Something else'] },
    informs: 'Keeps the coach talking about your sport by name.',
  },
  sportLevel: {
    id: 'sport-level',
    q: 'What level?',
    options: ['For fun', 'Club or school', 'Competitive', 'Semi-pro or above'],
    informs: 'Sets how much of the week training can take without hurting your actual games.',
  },
  inSeason: {
    id: 'in-season',
    q: 'Are you in season?',
    options: ['In season', 'Pre-season', 'Off season'],
    informs: 'In season the plan protects your legs for games. Off season it goes after the gap.',
  },
  speedWhat: {
    id: 'speed-what',
    q: 'Which bit needs work?',
    options: ['First few steps', 'Top speed', 'Changing direction', 'Not gassing out'],
    informs: 'Each one is a different kind of session, not a harder version of the same one.',
  },
  sprintSpace: {
    id: 'sprint-space',
    q: 'Somewhere to run flat out?',
    options: ['Track or field', 'Street or park', 'Treadmill only', 'Nowhere really'],
    informs: 'No space means the plan builds speed with hills and gym work instead.',
  },

  // ---- running ----
  raceWhat: {
    id: 'race-what',
    q: 'What are you training for?',
    options: ['5K', '10K', 'Half marathon', 'Marathon', 'Something longer', 'No race, just running'],
    informs: 'Sets the whole shape of the build.',
  },
  raceWhen: {
    id: 'race-when',
    q: 'When is it?',
    options: ['Under 3 months', '3 to 6 months', 'Later', 'No date'],
    informs: 'If the date does not fit the distance, the plan says so instead of pretending.',
  },
  runNow: {
    id: 'run-now',
    q: 'How much are you running now?',
    options: ['Not really running', 'Under 10 miles a week', '10 to 25', 'More than 25'],
    informs: 'Your starting mileage decides week one. Getting this wrong is how people get hurt.',
  },
  runGoal: {
    id: 'run-goal',
    q: 'What matters more?',
    options: ['Just finishing', 'A time I want', 'Enjoying it'],
    informs: 'Chasing a time buys harder sessions. Finishing buys easy miles.',
  },
  runTime: {
    id: 'run-time',
    q: 'What time are you after?',
    kind: 'text' as const,
    placeholder: 'e.g. under 2 hours',
    showIf: { id: 'run-goal', is: ['A time I want'] },
    informs: 'Sets your training paces.',
  },

  // ---- general health ----
  mattersMost: {
    id: 'matters-most',
    q: 'What would you most like to change?',
    options: ['More energy', 'Look better', 'Get stronger', 'Health numbers', 'Keep up with my kids'],
    informs: 'Decides what the plan leads with.',
  },
  startingFrom: {
    id: 'starting-from',
    q: 'How active are you right now?',
    options: ['Not at all', 'A bit here and there', 'Fairly active'],
    informs: 'Sets week one so it is neither insulting nor impossible.',
  },
  barrier: {
    id: 'barrier',
    q: 'What usually stops you keeping it going?',
    options: ['No time', 'No energy', 'It gets boring', 'I get sore', 'Nothing yet'],
    informs: 'The plan is built against this — short sessions for no time, variety for boredom.',
  },
} satisfies Record<string, GoalFollowup>

/**
 * What each goal needs asked, in the order a coach would ask it.
 *
 * Length varies because the goals genuinely differ: a marathon with a
 * date needs more established before anybody writes a week than "get a
 * bit fitter" does. Nothing here is capped at three.
 */
const BY_GOAL: Record<Goal, GoalFollowup[]> = {
  lean: [Q.loseAmount, Q.goalWeight, Q.dayMovement, Q.foodStruggle, Q.beenHere, Q.enjoy],
  muscle: [Q.gainAmount, Q.appetite, Q.sleepHours, Q.muscleWhere, Q.barYears],
  strength: [Q.liftFocus, Q.liftTarget, Q.barYears, Q.maxesKnown],
  vertical: [Q.vertNow, Q.vertTarget, Q.jumpHistory, Q.vertLimiting, Q.jumpFor, Q.sportLevel],
  speed: [Q.sport, Q.sportOther, Q.sportLevel, Q.inSeason, Q.speedWhat, Q.sprintFeel, Q.sprintSpace],
  endurance: [Q.raceWhat, Q.raceWhen, Q.runNow, Q.runGoal, Q.runTime],
  general: [Q.mattersMost, Q.startingFrom, Q.barrier, Q.enjoy],
}

/** Asked of everybody, after the goal-specific ones. */
const UNIVERSAL: GoalFollowup[] = [Q.injuries, Q.injuryWhat, Q.deadline]

// ---------------- Reading what they already told us ----------------

/**
 * Answers their own sentence has already given, so nothing gets asked
 * twice.
 *
 * This is the part that makes the screen feel like somebody read the
 * thing you typed. "lose 30 lb by June" should never be followed by
 * "roughly how much do you want to lose?" — that is the moment a
 * person decides the app is a form with a coach painted on it.
 *
 * Deliberately cautious: it only claims an answer when the sentence is
 * unambiguous. A wrong pre-fill is worse than an extra question,
 * because the athlete has to notice it to correct it.
 */
export function readStatement(statement: string): Record<string, string> {
  const t = statement.toLowerCase()
  const out: Record<string, string> = {}
  const has = (re: RegExp) => re.test(t)

  // How much weight, when they said a number.
  const lbs = t.match(/(\d+)\s*(lb|lbs|pound|pounds|kg|kilo)/)
  if (lbs && has(/\b(lose|drop|shed|cut|down)\b/)) {
    const n = Number(lbs[1]) * (lbs[2].startsWith('kg') || lbs[2].startsWith('kilo') ? 2.2 : 1)
    out['lose-amount'] = n <= 9 ? 'A few pounds' : n <= 30 ? '10 to 30 lb' : n <= 60 ? '30 to 60 lb' : 'More than that'
  }

  // The race, when they named one.
  if (has(/\bmarathon\b/) && !has(/half/)) out['race-what'] = 'Marathon'
  else if (has(/half.?marathon|\bhalf\b/)) out['race-what'] = 'Half marathon'
  else if (has(/\b10\s?k\b/)) out['race-what'] = '10K'
  else if (has(/\b5\s?k\b/)) out['race-what'] = '5K'
  else if (has(/\bultra|50\s?k|100\s?k|50\s?mi/)) out['race-what'] = 'Something longer'

  // The lift, when they named one.
  if (has(/\bbench\b/)) out['lift-focus'] = 'Bench press'
  else if (has(/\bsquat\b/)) out['lift-focus'] = 'Squat'
  else if (has(/\bdeadlift\b/)) out['lift-focus'] = 'Deadlift'

  // Dunking is a jump goal with the sport already stated.
  if (has(/\bdunk\b/)) out['jump-for'] = 'Basketball'

  // The sport, when they named one.
  for (const s of SPORTS) {
    if (s === 'Something else') continue
    const word = s.split(/[\s/]/)[0].toLowerCase()
    if (word.length > 3 && has(new RegExp(`\\b${word}`))) {
      out.sport = s
      break
    }
  }

  // A deadline, when they gave one.
  if (has(/\b(\d+)\s*(week|wk)/)) {
    const w = Number(t.match(/\b(\d+)\s*(week|wk)/)![1])
    out.deadline = w <= 8 ? 'A few weeks' : w <= 20 ? 'A few months' : 'This year'
  } else if (has(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\b|\bsummer\b|\bwedding\b|\bholiday\b|\bvacation\b/)) {
    out.deadline = 'A few months'
  }

  return out
}

// ---------------- The generator ----------------

export interface FollowupContext {
  goal: Goal
  /** Their goal in their own words. Read, not just stored. */
  statement?: string
  answers: Record<string, string>
}

/**
 * The questions THIS athlete still needs to answer.
 *
 * Order is the order a coach would ask in: what you want, where you
 * are, then the things that shape how hard the plan can be. Branch
 * questions appear the moment the answer above them opens them, and
 * a question their own sentence already answered never appears at all.
 */
export function buildFollowups(ctx: FollowupContext): GoalFollowup[] {
  const known = { ...readStatement(ctx.statement ?? ''), ...ctx.answers }
  const out: GoalFollowup[] = []

  for (const q of [...(BY_GOAL[ctx.goal] ?? []), ...UNIVERSAL]) {
    // A branch whose parent answer has not been given yet.
    if (q.showIf && !q.showIf.is.includes(known[q.showIf.id] ?? ' ')) continue
    // Their sentence already said it — but only skip chip questions.
    // A number or a name is worth confirming rather than guessing.
    if (q.kind === undefined && known[q.id] !== undefined && ctx.answers[q.id] === undefined) continue
    out.push(q)
  }

  // Which position, but only for the sports where position changes the
  // training. Asking a golfer their position is noise.
  const sport = known.sport === 'Something else' ? null : known.sport
  if (sport && POSITIONS[sport]) {
    const at = out.findIndex((q) => q.id === 'sport-level')
    const posQ: GoalFollowup = {
      id: 'sport-role',
      q: 'What position?',
      options: POSITIONS[sport],
      informs: 'A keeper and a midfielder are not the same athlete.',
    }
    out.splice(at >= 0 ? at : out.length, 0, posQ)
  }

  return out
}

/** Everything known about the athlete: what they typed plus what they tapped. */
export function mergedAnswers(ctx: FollowupContext): Record<string, string> {
  return { ...readStatement(ctx.statement ?? ''), ...ctx.answers }
}

/** The sport they play, in their words, or null. */
export function sportOf(answers: Record<string, string>): string | null {
  const s = answers.sport
  if (!s) return null
  if (s === 'Something else') return answers['sport-other']?.trim() || null
  return s
}

/** Kept for the plan generator, which still reads per-goal question sets. */
export const GOAL_FOLLOWUPS: Record<Goal, GoalFollowup[]> = BY_GOAL

/**
 * The targets the athlete named, pulled back out of their answers.
 *
 * The "number to beat" used to be three boxes on the goal screen —
 * label, number, unit — shown to everybody. Most people's goals do not
 * have a number, so most people got an empty form they could not fill
 * and felt vaguely bad about. Now a number is only ever asked where one
 * genuinely fits, by a question that already knows what it is called
 * and what unit it is in.
 */
export function targetsFromAnswers(
  goal: Goal,
  answers: Record<string, string>,
): { label: string; target: number; unit: string }[] {
  const out: { label: string; target: number; unit: string }[] = []
  for (const q of BY_GOAL[goal] ?? []) {
    if (q.kind !== 'number' || !q.targetLabel) continue
    const n = Number((answers[q.id] ?? '').replace(/[^0-9.]/g, ''))
    if (n > 0) out.push({ label: q.targetLabel, target: n, unit: q.unit ?? '' })
  }
  return out
}
