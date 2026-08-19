import type { AppData, ISODate } from '../types'
import type { MuscleRegion } from '../plan/muscleRegions'
import { EXERCISE_MUSCLES } from '../plan/muscles'
import { addDaysISO, daysBetween } from './calendar'

// ============================================================
// Helping somebody choose, instead of handing them a catalog.
//
// The picker offered all 194 movements in one list with a
// search box. For an athlete training on a bare floor, 138 of
// them are impossible: sled pushes, hurdle hops, trap-bar
// jumps, sixteen machines. The equipment data to know that has
// existed since the generator was written, and the picker was
// the one place that never asked.
//
// The second half is the question people actually arrive with.
// Nobody thinks "I would like an exercise whose primary mover
// is the latissimus dorsi". They think "back day", or they
// think nothing at all and would be glad to be told what they
// have been skipping. So this counts what the athlete has
// really trained, per group, out of their own logged sets.
// ============================================================

export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'glutes' | 'core'

export const GROUP_ORDER: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'legs',
  'glutes',
  'core',
]

export const GROUP_LABEL: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  arms: 'Arms',
  legs: 'Legs',
  glutes: 'Glutes',
  core: 'Core',
}

/**
 * The coarse groups people think in, over the fine regions the
 * body map paints. Deliberately not a partition of the region list:
 * `full-body` and `heart` belong to no group, and a movement can
 * honestly serve two.
 */
export const GROUP_REGIONS: Record<MuscleGroup, MuscleRegion[]> = {
  chest: ['chest', 'chest-upper'],
  back: ['lats', 'mid-back', 'traps', 'lower-back'],
  shoulders: ['delts-front', 'delts-side', 'delts-rear'],
  arms: ['biceps', 'triceps', 'forearms'],
  legs: ['quads', 'hamstrings', 'calves', 'adductors', 'tibialis', 'achilles-feet'],
  glutes: ['glutes'],
  core: ['abs', 'obliques', 'hip-flexors'],
}

const REGION_GROUPS = (() => {
  const m = new Map<MuscleRegion, MuscleGroup[]>()
  for (const g of GROUP_ORDER) {
    for (const r of GROUP_REGIONS[g]) m.set(r, [...(m.get(r) ?? []), g])
  }
  return m
})()

/**
 * The groups a movement genuinely trains.
 *
 * Prime movers only. Counting assisting muscles would put every
 * press in the arms group and make "arms" mean nothing, which is
 * the same mistake as counting a set once per exercise.
 */
export function groupsOf(exerciseId: string): MuscleGroup[] {
  const m = EXERCISE_MUSCLES[exerciseId]
  if (!m) return []
  const out = new Set<MuscleGroup>()
  for (const r of m.primary) for (const g of REGION_GROUPS.get(r) ?? []) out.add(g)
  return [...out]
}

export interface GroupStatus {
  group: MuscleGroup
  label: string
  /** Sets actually completed on this group inside the window. */
  sets: number
  /** Days since the last completed set, null if never (or beyond the lookback). */
  daysSince: number | null
}

/** How long a group may go untouched before it is worth mentioning. */
export const STALE_DAYS = 6
const LOOKBACK = 30

/**
 * What the athlete has really trained lately, read off completed sets.
 *
 * Only ticked sets count. A session somebody opened and abandoned is
 * not evidence they trained their back, and telling them it was would
 * make every number here worth ignoring.
 */
export function groupCoverage(data: AppData, today: ISODate, windowDays = 7): GroupStatus[] {
  const sets: Record<string, number> = {}
  const last: Record<string, number> = {}

  for (let i = 0; i <= LOOKBACK; i++) {
    const date = addDaysISO(today, -i)
    const session = data.sessions[date]
    if (!session || session.status === 'skipped') continue
    for (const ex of session.exercises) {
      const done = ex.sets.filter((s) => s.done).length
      if (done === 0) continue
      for (const g of groupsOf(ex.exerciseId)) {
        if (i < windowDays) sets[g] = (sets[g] ?? 0) + done
        if (last[g] === undefined) last[g] = i
      }
    }
  }

  return GROUP_ORDER.map((group) => ({
    group,
    label: GROUP_LABEL[group],
    sets: sets[group] ?? 0,
    daysSince: last[group] ?? null,
  }))
}

/**
 * Groups worth suggesting, stalest first: never trained, or not since
 * STALE_DAYS. A brand-new account has no history and so gets no
 * suggestions rather than seven, because "you have never trained your
 * chest" on day one is noise dressed as insight.
 */
export function staleGroups(data: AppData, today: ISODate): GroupStatus[] {
  const trainedEver = Object.values(data.sessions).some(
    (s) => s.status !== 'skipped' && s.exercises.some((e) => e.sets.some((x) => x.done)),
  )
  if (!trainedEver) return []
  const installed = data.settings.installedAt
  return groupCoverage(data, today)
    .filter((g) => g.daysSince === null || g.daysSince >= STALE_DAYS)
    // A group cannot be overdue for longer than the app has existed.
    .filter(() => daysBetween(installed, today) >= STALE_DAYS)
    .sort((a, b) => (b.daysSince ?? 99) - (a.daysSince ?? 99))
}

/** Which groups a workout being built already covers. */
export function coverageOf(items: { exerciseId: string }[]): Set<MuscleGroup> {
  const out = new Set<MuscleGroup>()
  for (const it of items) for (const g of groupsOf(it.exerciseId)) out.add(g)
  return out
}
