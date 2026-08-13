import type { Goal } from '../types'
import type { StageMetric, TrackId } from '../journeyTypes'
import { WEEKLY_CHANGE_PCT } from './sportsNutrition'

// ============================================================
// How fast a person actually changes, and the stages worth
// putting in front of them.
//
// Layer 0: pure data and week arithmetic, no AppData, no dates.
// Everything here speaks in WEEKS FROM NOW; engine/journey.ts is
// what turns weeks into a calendar. That split is what keeps the
// layering honest — the rate model cannot reach engine/reps.ts
// for loadStepLb, so the caller passes the step in.
//
// The numbers below are the whole product. A milestone somebody
// cannot hit in the time stated is not an encouraging estimate,
// it is a lie that makes them quit in week six, and it is worse
// than showing no estimate at all. Where the evidence is thin
// the band is wide; where it is absent there is no band and the
// app says so.
// ============================================================

export type TrainingAge = 'new' | 'returning' | 'trained'

// ---------------- Body mass ----------------

/**
 * Fat loss is governed by how lean you already are, not by training age.
 *
 * A 300 lb beginner and a 300 lb ten-year lifter lose at the same rate;
 * what changes the rate is the fat available to mobilise. Alpert's work
 * on the ceiling of fat oxidation per unit of fat mass is the mechanism,
 * and it is why the last ten pounds genuinely take longer than the first
 * thirty rather than that being a motivational cliché.
 *
 * The band the app already carries (WEEKLY_CHANGE_PCT, 0.5–1 %/wk) is
 * the outer envelope; this places the athlete inside it. Above ~1 %/wk
 * lean mass goes with the fat, which defeats the point of eating this
 * much protein and lifting this hard.
 */
export function fatLossPctPerWeek(bodyFatPct: number | null): number {
  if (bodyFatPct === null) return 0.0075 // mid-band when we genuinely do not know
  if (bodyFatPct >= 30) return WEEKLY_CHANGE_PCT.fatLossMax // 1.0 %
  if (bodyFatPct >= 20) return 0.0075
  if (bodyFatPct >= 12) return WEEKLY_CHANGE_PCT.fatLossMin // 0.5 %
  return 0.0035
}

/**
 * Muscle gain, which is slower than anybody wants to hear.
 *
 * Aragon & Schoenfeld's rate table is the reference: roughly 1–1.5 % of
 * bodyweight per MONTH for a true beginner, halving for each stage after
 * that. Past about 0.5 % a week almost all of a surplus is fat, which is
 * why WEEKLY_CHANGE_PCT tops out there. Training age is the right dial
 * here — unlike fat loss, this one really is about how much adaptation
 * is left on the table.
 */
export function gainPctPerWeek(age: TrainingAge): number {
  const scale = { new: 1, returning: 0.7, trained: 0.45 }[age]
  return WEEKLY_CHANGE_PCT.gainMin + (WEEKLY_CHANGE_PCT.gainMax - WEEKLY_CHANGE_PCT.gainMin) * scale
}

// ---------------- Strength ----------------

/**
 * How many weeks one load step takes, derived from the app's OWN
 * progression rule rather than from a table.
 *
 * This is the property worth having: the plan runs double progression —
 * add reps inside the range, and when the top is reached add load and
 * drop back to the bottom. So a wrap costs (repHigh − repLow + 1)
 * successful sessions, and the calendar cost of that is fixed by how
 * often the lift appears in the week. Projecting from those two numbers
 * means the app structurally CANNOT promise faster progress than it
 * actually prescribes, which no rate table can guarantee.
 *
 * Two corrections on top:
 *
 *   DELOAD. Week 4 of every block halves the sets, so a quarter of all
 *   weeks do not advance a wrap. Four weeks of calendar buy three weeks
 *   of progression, hence the 4/3.
 *
 *   STALL. Nobody wraps cleanly forever. A beginner very nearly does;
 *   a trained lifter misses far more often than they hit, and the
 *   multiplier is what stops a linear model from projecting a 405 lb
 *   squat for somebody who has been stuck at 315 for a year.
 */
const DELOAD_TAX = 4 / 3
const STALL: Record<TrainingAge, number> = { new: 1.15, returning: 1.6, trained: 2.6 }

export function weeksPerLoadStep(args: {
  repLow: number
  repHigh: number
  sessionsPerWeek: number
  age: TrainingAge
}): number {
  const stepsInRange = Math.max(1, args.repHigh - args.repLow + 1)
  const perWeek = Math.max(0.5, args.sessionsPerWeek)
  return (stepsInRange / perWeek) * DELOAD_TAX * STALL[args.age]
}

/**
 * The ceiling, because the mechanics above are a local model.
 *
 * Double progression says a beginner squatting twice a week wraps every
 * ~3 weeks, which at a 10 lb step is ~170 lb a year. That is roughly
 * right for a beginner and absurd for anyone else, and the mechanics
 * alone have no way to know. These caps are the literature's honest
 * annual ceilings on a main lift, and the projection takes whichever of
 * the two is slower.
 */
const LB_PER_WEEK_CEILING: Record<TrainingAge, number> = { new: 4, returning: 2, trained: 0.75 }

export function strengthLbPerWeek(args: {
  loadStepLb: number
  repLow: number
  repHigh: number
  sessionsPerWeek: number
  age: TrainingAge
}): number {
  const mechanical = args.loadStepLb / weeksPerLoadStep(args)
  return Math.min(mechanical, LB_PER_WEEK_CEILING[args.age])
}

// ---------------- Running ----------------

/**
 * Weeks to carry a long run from here to there.
 *
 * The 10 %-a-week rule is the folk standard and the evidence for it is
 * genuinely weak (Buist 2008 found no injury benefit from a graded 10 %
 * programme), but compounding it for a whole block is +33 %, which is
 * how people collect tibial stress reactions. What the literature does
 * support is cutback weeks. So: ~8 % a week on the long run, with the
 * same one-week-in-four tax the lifting model pays.
 */
export function weeksToLongRun(fromMi: number, toMi: number): number {
  if (toMi <= fromMi) return 0
  const from = Math.max(1, fromMi)
  return Math.ceil((Math.log(toMi / from) / Math.log(1.08)) * DELOAD_TAX)
}

// ---------------- Jumping ----------------

/**
 * Vertical jump, the goal with the widest gap between what is sold and
 * what happens.
 *
 * Meta-analytic gains from plyometric training run roughly 3–8 cm over
 * 8–12 weeks in previously untrained subjects — about 1.5–3 inches, and
 * that is people who had never jumped for training. A trained jumper
 * gaining an inch in a season is doing well. Anybody quoting "+10 inches
 * in 12 weeks" is selling something.
 */
const VERT_IN_PER_WEEK: Record<TrainingAge, number> = { new: 0.2, returning: 0.12, trained: 0.05 }
export const vertInPerWeek = (age: TrainingAge): number => VERT_IN_PER_WEEK[age]

// ---------------- Honesty guards ----------------

/**
 * Below this, the metric moves slower than the instrument reads it.
 *
 * A bathroom scale swings two pounds on hydration alone and a chalk
 * rim-touch is good to about half an inch. When the modelled rate per
 * week falls under the floor, an ETA computed off it is arithmetic on
 * noise, and the app says that instead of printing a date.
 */
export const NOISE_FLOOR: Partial<Record<StageMetric, number>> = {
  weightLb: 1.0,
  waistIn: 0.5,
  vertIn: 0.5,
  bodyFatPct: 1.0,
}

/** Past two years, an estimate is a fantasy however good the fit. */
export const MAX_ETA_WEEKS = 104

/**
 * Stages further out are further out than they look.
 *
 * A straight line drawn through a novice's first good block projects
 * through the plateau every one of them hits. Each successive stage gets
 * the modelled rate cut by 15 %, which is a crude stand-in for a curve
 * that flattens but is much closer than not doing it.
 */
export const STAGE_DECAY = 0.85

/** An observed rate needs this much behind it before it beats the model. */
export const MIN_OBSERVED_POINTS = 3
export const MIN_OBSERVED_DAYS = 21

/**
 * A hot month does not get to promise a hot year.
 *
 * Somebody's first four weeks in a deficit include the glycogen and
 * water drop, and their first month back under a bar includes a lot of
 * skill relearning. Both regress. The observed rate is allowed to beat
 * the model, but only by half again.
 */
export const OBSERVED_CAP_MULTIPLE = 1.5

/**
 * The first stretch of a new deficit is water, not fat.
 *
 * Glycogen binds roughly 3 g of water per gram, so the first days of a
 * deficit drop several pounds that were never fat and never come back
 * as fat. Regressing through them projects a rate nobody can hold.
 */
export const DEFICIT_WATER_DAYS = 10

// ---------------- The stages ----------------

export interface StageSpec {
  track: TrackId
  metric: StageMetric
  /** Absolute target. NEVER anchor-relative — see the id-stability note. */
  target: number
  unit: string
  label: string
  /** One honest sentence about why this stage is worth wanting. */
  detail: string
  exerciseId?: string
}

/**
 * THE ID-STABILITY RULE, which is the whole correctness story.
 *
 * A stage id must never change for the same real-world target, or the
 * persisted hit orphans and the stage silently un-achieves — a path that
 * walks backwards, which is worse than no path.
 *
 * So every target is an ABSOLUTE number and never a percentage of a
 * moving anchor. 185 on the bench, 200 on the scale, 13.1 miles. The
 * anchor decides WHICH stages appear; it never decides where one sits.
 * A rising anchor drops stages off the bottom and adds none in the
 * middle. Nothing already on the path moves.
 *
 * It also happens to be how people actually think. Nobody is chasing
 * "+12 % on my bench"; they are chasing two plates.
 */
export const stageId = (s: StageSpec): string =>
  `${s.track}:${s.metric}:${s.exerciseId ?? '-'}:${Math.round(s.target * 10)}`

/** The plates, which is how lifters count. */
const PLATE_LADDER = [95, 135, 185, 225, 275, 315, 365, 405, 495]

export function strengthStages(exerciseId: string, liftLabel: string, fromLb: number, toLb: number): StageSpec[] {
  return PLATE_LADDER.filter((w) => w > fromLb && w <= toLb).map((w) => ({
    track: 'strength' as const,
    metric: 'topSetLb' as const,
    exerciseId,
    target: w,
    unit: 'lb',
    label: `${liftLabel} ${w}`,
    detail:
      w === 135
        ? 'A plate a side. The first number that sounds like a number.'
        : w === 225
          ? 'Two plates. The one everybody in the room can count without asking.'
          : w === 315
            ? 'Three plates.'
            : `${w} lb for a full working set, not a grinder.`,
  }))
}

/**
 * Bodyweight stages on the fives, because that is where a scale reading
 * feels like it crossed something.
 */
export function weightStages(fromLb: number, toLb: number): StageSpec[] {
  const down = toLb < fromLb
  const step = 5
  const out: StageSpec[] = []
  const first = down ? Math.floor((fromLb - 0.01) / step) * step : Math.ceil((fromLb + 0.01) / step) * step
  // The same sentence under four stages in a row reads as filler and
  // trains people to stop reading the row at all, so the ladder says
  // something different as it goes: what the number means changes.
  const DOWN = [
    'Held for a week, not hit once on a dry morning.',
    'The leaner you get the slower this comes off. That is the body, not you failing.',
    'Keep the bar heavy through here or some of this comes off the wrong tissue.',
    'Scale weight is noisy. It is the direction across a month that counts.',
  ]
  const UP = [
    'Gained slowly enough that most of it is the good kind.',
    'Strength should be climbing alongside this, or the scale is lying about what it is.',
    'Still under half a pound a week. Faster than that is mostly fat.',
    'Muscle is built at a rate nobody likes hearing. This is that rate.',
  ]
  for (let w = first; down ? w >= toLb : w <= toLb; w += down ? -step : step) {
    out.push({
      track: 'body',
      metric: 'weightLb',
      target: w,
      unit: 'lb',
      label: `${w} lb`,
      // Cycled, not clamped: clamping meant every stage past the fourth
      // got the same sentence, which on a long cut is the same line
      // under six rows in a row.
      detail: (down ? DOWN : UP)[out.length % DOWN.length],
    })
    if (out.length > 40) break
  }
  return out
}

/** The distances that are actually events, not arbitrary round numbers. */
const RUN_LADDER: { mi: number; label: string; detail: string }[] = [
  { mi: 1, label: 'A mile without stopping', detail: 'The one that decides whether you are a runner.' },
  { mi: 3.1, label: '5K', detail: 'The distance with a race in every town, most weekends.' },
  { mi: 6.2, label: '10K', detail: 'Twice the 5K and more than twice the training.' },
  { mi: 13.1, label: 'Half marathon', detail: 'The longest distance most people can train for around a job.' },
  { mi: 26.2, label: 'Marathon', detail: 'Every long run to here has been rehearsal.' },
]

export function runStages(fromMi: number, toMi: number): StageSpec[] {
  return RUN_LADDER.filter((r) => r.mi > fromMi && r.mi <= toMi + 0.01).map((r) => ({
    track: 'engine',
    metric: 'longRunMi',
    target: r.mi,
    unit: 'mi',
    label: r.label,
    detail: r.detail,
  }))
}

/**
 * The vertical ladder, and the reason this goal gets landmarks rather
 * than inches: "28 inches" means nothing standing in a gym, and "touch
 * the rim" means everything. These are things somebody can drive to a
 * park and attempt tonight, which is the closest this whole feature
 * gets to the point of it.
 *
 * Heights are for a 10-ft rim and are measured as REACH ABOVE STANDING
 * REACH, so they stay the same number whatever the athlete's height —
 * the ladder is what their jump has to be worth, not how tall they are.
 */
export const VERT_LADDER: { gapIn: number; label: string; detail: string }[] = [
  { gapIn: 0, label: 'Touch the net', detail: 'The bottom of the net, cleanly, off one step.' },
  { gapIn: 6, label: 'Touch the backboard', detail: 'Flat palm on the board, not a fingertip.' },
  { gapIn: 12, label: 'Touch the rim', detail: 'Fingers on the metal. The first one that is unmistakable.' },
  { gapIn: 18, label: 'Grab the rim', detail: 'Whole hand on, and hold it for a beat.' },
  { gapIn: 24, label: 'Dunk', detail: 'Ball through, one hand. The whole reason for the rest of it.' },
]

export function vertStages(fromIn: number, toIn: number): StageSpec[] {
  return VERT_LADDER.filter((v) => v.gapIn > fromIn && v.gapIn <= toIn + 0.01).map((v) => ({
    track: 'explosive',
    metric: 'vertIn',
    target: v.gapIn,
    unit: 'in',
    label: v.label,
    detail: v.detail,
  }))
}

/**
 * The consistency track, which is on every ladder regardless of goal.
 *
 * It is the only track a brand-new account can score on day one, and
 * it is the one that actually predicts whether any of the others
 * happen. Everything here is counted straight off the log, so it needs
 * no anchor, no measurement and no estimate.
 */
export const SESSION_STAGES = [10, 25, 50, 100, 200, 500]
export const STREAK_STAGES = [7, 14, 30, 60, 100]

export function consistencyStages(sessionsSoFar: number): StageSpec[] {
  const out: StageSpec[] = []
  for (const n of SESSION_STAGES) {
    out.push({
      track: 'consistency',
      metric: 'sessions',
      target: n,
      unit: '',
      label: `${n} sessions`,
      detail:
        n === 10
          ? 'Ten is where it stops being a new thing you are trying.'
          : n === 100
            ? 'A hundred sessions is a training age, not a phase.'
            : 'Work in the bank, whatever the scale says.',
    })
  }
  for (const n of STREAK_STAGES) {
    out.push({
      track: 'consistency',
      metric: 'streakDays',
      target: n,
      unit: 'd',
      label: `${n}-day streak`,
      detail: n === 7 ? 'One full week without a gap.' : 'Showing up is the one that carries all the others.',
    })
  }
  void sessionsSoFar
  return out
}

/**
 * Which tracks a goal climbs.
 *
 * Every goal gets consistency, and every goal gets at least two, so a
 * lean athlete whose scale stalls for a fortnight still watches their
 * squat-hold stage and their sessions stage advance. A single-track path
 * is a path that goes grey the first time one number sulks.
 */
export const TRACKS_FOR_GOAL: Record<Goal, TrackId[]> = {
  lean: ['body', 'strength', 'consistency'],
  muscle: ['body', 'strength', 'consistency'],
  strength: ['strength', 'body', 'consistency'],
  vertical: ['explosive', 'strength', 'consistency'],
  speed: ['explosive', 'strength', 'consistency'],
  endurance: ['engine', 'body', 'consistency'],
  general: ['consistency', 'strength', 'body'],
}

export const TRACK_LABEL: Record<TrackId, string> = {
  body: 'Body',
  strength: 'Strength',
  engine: 'Engine',
  explosive: 'Explosive',
  consistency: 'Consistency',
}

export const TRACK_TONE: Record<TrackId, 'accent' | 'lime' | 'cyan' | 'gold'> = {
  body: 'cyan',
  strength: 'accent',
  engine: 'lime',
  explosive: 'gold',
  consistency: 'lime',
}
