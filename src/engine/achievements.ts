import type { AppData, ISODate } from '../types'
import { todayISO } from './calendar'
import { ACHIEVEMENTS, type AchievementDef } from '../plan/achievements'
import { athleteFacts, type AthleteFacts } from './achievementFacts'

// ============================================================
// Catalog meets athlete.
//
// Each achievement reduces to one number: how far along you are
// toward its bar. Earned is `progress >= goal`, count is how many
// times you have cleared it when it repeats. Nothing here reaches
// into AppData directly, it all comes through AthleteFacts, so
// adding a badge is adding a line rather than adding a query.
// ============================================================

export interface AchievementState {
  def: AchievementDef
  earned: boolean
  /** Times earned, for the repeatable ones. 0 or 1 for the rest. */
  count: number
  /** Where they stand against `goal`. */
  progress: number
  /** The bar. Mirrors def.goal, or 1 for the yes/no ones. */
  target: number
}

/**
 * progress = how far along, target = the bar, count = times cleared.
 *
 * A repeatable badge counts clears; a one-off caps at 1. Anything
 * `pending` in the catalog reports zero rather than guessing, since
 * the data behind it does not exist yet.
 */
type Measure = (f: AthleteFacts) => { progress: number; target: number; count?: number }

const at = (progress: number, target: number): { progress: number; target: number } => ({ progress, target })
const times = (n: number) => ({ progress: Math.min(n, 1), target: 1, count: n })

const MEASURES: Record<string, Measure> = {
  // Streaks are measured against the BEST run ever, not the live
  // one. A badge is a record of something that happened; losing a
  // streak does not un-happen the month you put together.
  'heating-up': (f) => at(f.streakBest, 30),
  'on-fire': (f) => at(f.streakBest, 90),
  blazing: (f) => at(f.streakBest, 180),
  inferno: (f) => ({ progress: Math.min(f.streakBest, 365), target: 365, count: f.infernoCycles }),

  'early-riser': (f) => at(f.earlySessions, 10),
  'dawn-patrol': (f) => at(f.earlySessions, 50),
  'night-shift': (f) => at(f.lateSessions, 10),
  'dark-knight': (f) => at(f.lateSessions, 50),

  'locked-in': (f) => times(f.perfectWeeks),
  'perfect-attendance': (f) => times(f.perfectMonths),
  clockwork: (f) => at(f.perfectMonths, 3),
  machine: (f) => at(f.perfectMonths, 6),

  'moving-up': (f) => at(f.progressionWeeks, 2),
  'steady-climber': (f) => at(f.progressionWeeks, 4),
  'leveling-up': (f) => at(f.progressionWeeks, 13),
  'different-animal': (f) => at(f.progressionWeeks, 26),

  'new-heights': (f) => at(f.prTotal, 1),
  'pr-machine': (f) => at(f.prTotal, 10),
  'record-breaker': (f) => at(f.prTotal, 25),
  'limit-breaker': (f) => at(f.prTotal, 50),
  'hat-trick': (f) => times(f.prBestSession >= 3 ? 1 : 0),
  'career-day': (f) => times(f.prBestSession >= 5 ? 1 : 0),
  untouchable: (f) => times(f.oldestPrBrokenDays >= 180 ? 1 : 0),
  'clean-sweep': (f) => times(f.cleanSweepBlocks),

  'first-mile': (f) => at(Math.floor(f.cardioMilesTotal), 1),
  roadwork: (f) => at(f.cardioSessions, 10),
  engine: (f) => at(f.cardioSessions, 50),
  'endless-tank': (f) => at(f.cardioSessions, 100),
  'going-the-distance': (f) => times(f.distanceRecords),
  'fastest-yet': (f) => times(f.paceRecords),
  'double-duty': (f) => times(f.doubleDays),

  'iron-week': (f) => times(f.ironWeeks),
  ghost: (f) => ({ progress: Math.min(f.ghostDays, 30), target: 30, count: f.ghostRuns }),

  freestyler: (f) => times(f.hasOwnRoutine ? 1 : 0),
  trendsetter: (f) => at(f.hasOwnRoutine ? f.ownRoutineWeeks : 0, 2),
  'self-made': (f) => at(f.hasOwnRoutine ? f.ownRoutineWeeks : 0, 6),
  'the-architect': (f) => times(f.ownRoutineBlocks),

  'down-bad': (f) => at(f.weightLostLb, 5),
  shredder: (f) => at(f.weightLostLb, 10),
  'growing-pains': (f) => at(f.weightGainedLb, 5),
  'mass-builder': (f) => at(f.weightGainedLb, 10),
  // The finished-goal ones need a goal to have been declared AND
  // met. Until goal completion is a recorded event rather than an
  // inference, hitting the target weight is the honest proxy.
  'big-business': (f) => times(f.hitTargetWeight && f.weightGainedLb >= 10 ? 1 : 0),
  bullseye: (f) => times(f.hitTargetWeight ? 1 : 0),
  transformation: (f) => times(f.hitTargetWeight && f.streakBest >= 60 ? 1 : 0),
  'new-body-who-dis': (f) => times(f.hitTargetWeight && f.streakBest >= 180 ? 1 : 0),
  // The joke survives, the crash diet does not: this wants a
  // finished cut with the consistency to match, never raw speed.
  'ozympic-god': (f) => times(f.hitTargetWeight && f.weightLostLb >= 20 && f.perfectMonths >= 2 ? 1 : 0),
}

export function evaluateAchievements(
  data: AppData,
  today: ISODate = todayISO(),
  facts: AthleteFacts = athleteFacts(data, today),
): AchievementState[] {
  return ACHIEVEMENTS.map((def) => {
    const measure = def.pending ? undefined : MEASURES[def.id]
    if (!measure) {
      return { def, earned: false, count: 0, progress: 0, target: def.goal ?? 1 }
    }
    const m = measure(facts)
    const count = m.count ?? (m.progress >= m.target ? 1 : 0)
    return {
      def,
      earned: count > 0,
      count: def.repeatable ? count : Math.min(count, 1),
      progress: Math.min(m.progress, m.target),
      target: m.target,
    }
  })
}

/** Just the ones they hold, most impressive first. */
export function earnedAchievements(states: AchievementState[]): AchievementState[] {
  return states.filter((s) => s.earned)
}

/**
 * The nearest thing to earn: something to work toward without
 * being told to. Only counts achievements actually in reach.
 */
export function nextUp(states: AchievementState[], n = 3): AchievementState[] {
  return states
    .filter((s) => !s.earned && !s.def.pending && s.progress > 0)
    .sort((a, b) => b.progress / b.target - a.progress / a.target)
    .slice(0, n)
}
