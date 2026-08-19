import type { Goal } from '../types'
import { bodyweightHeuristicKcal, dayMovementOf, DEFAULT_SESSIONS_PER_WEEK, maintenanceKcal } from './bmr'
import { flooredTargets } from './kcalFloor'
import { proteinContextFor, proteinTargetG } from './sportsNutrition'

// ============================================================
// The two calorie numbers and the protein number, for one athlete.
//
// Lifted out of generator.ts, which was already at its size cap and is
// about to carry the rest of R1: activity from the log, weight-trend
// steps, carb cycling, the fibre floor and an explanation attached to
// every number it prints. None of that is plan assembly, and none of it
// belongs in the file that assembles plans.
//
// What decides the calorie baseline lives one level down again, in
// plan/bmr.ts. This file is only the goal adjustments on top of it.
// ============================================================

export function buildNutrition(
  goal: Goal,
  bodyweightLb: number,
  sex?: 'male' | 'female',
  ans: Record<string, string> = {},
  heightIn?: number,
  body: { ageYears?: number; bodyFatPct?: number; sessionsPerWeek?: number } = {},
) {
  const bw = Math.min(330, Math.max(90, bodyweightLb || 175))
  // Best model this body has the inputs for; the old bodyweight number is
  // passed in as the last branch, so anyone we know nothing else about
  // still lands exactly where they did. plan/bmr.ts says why, and in what
  // order.
  const maintenance = maintenanceKcal(
    { bodyweightLb: bw, sex, heightIn, ageYears: body.ageYears, bodyFatPct: body.bodyFatPct },
    { sessionsPerWeek: body.sessionsPerWeek ?? DEFAULT_SESSIONS_PER_WEEK, movement: dayMovementOf(ans) },
    bodyweightHeuristicKcal(bw, sex, heightIn),
  )
  const base = maintenance.kcal
  const adj: Record<Goal, number> = { muscle: 300, strength: 250, vertical: 200, speed: 150, general: 100, lean: -300, endurance: 150 }
  let kcalTraining = base + adj[goal]
  // Follow-up answers sharpen the number. A 30+ lb cut needs a real
  // deficit; a desk-bound day burns less than the formula assumes.
  if (goal === 'lean') {
    if ((ans['lose-amount'] === '30 to 60 lb' || ans['lose-amount'] === 'More than that')) kcalTraining -= 150
    else if (ans['lose-amount'] === '10 to 30 lb') kcalTraining -= 75
    // Heuristic branch only: everywhere else this answer is already
    // inside the activity multiplier, and charging it twice is the
    // double-count plan/bmr.ts exists to avoid.
    if (ans['day-movement'] === 'Sitting' && maintenance.model === 'bodyweight') kcalTraining -= 50
    kcalTraining = Math.max(1700, kcalTraining)
  }
  if (goal === 'muscle' && ans['gain-amount'] === 'As much as I can') kcalTraining += 100
  return {
    // Protein now depends on the SITUATION, not just the scale. A cut is
    // where protein does its most important job (deciding whether the
    // weight lost is fat or muscle) and where a flat 1 g/lb undershot;
    // an endurance athlete was being handed protein instead of the carbs
    // they run on. See plan/sportsNutrition.ts for the ranges and why.
    proteinTargetG: proteinTargetG(bw, proteinContextFor(goal, ans)),
    // 1700 above is lean-only; this floors every goal, and the rest day.
    ...flooredTargets(kcalTraining, base),
  }
}
