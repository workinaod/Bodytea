import type { AppData, ISODate, ResolvedDay, ResolvedExercise, SessionLog } from '../types'
import type { MuscleRegion } from '../plan/muscleRegions'
import { getExercise } from '../plan/exercises'
import { estimateMinutes } from './focus'
import { band } from './sequence'
import { resolveDay } from './resolveDay'
import { regionLoad, regionName, totalSets } from './volume'

// ============================================================
// "What am I actually doing here, and why is it in this order?"
//
// The app could always explain a MOVEMENT: every exercise ships
// a guide, a demo, a muscle map and a reason. It could not
// explain a SESSION. You could read why the goblet squat is in
// your plan and still have no idea what today was for, how much
// of it lands on your legs, why the jumps come before the lifts,
// or where this week sits in the sixteen.
//
// The static answer already in the app is the owner's NAOD
// booklet prose in plan/guide.ts, which is the wrong answer for
// everybody else: somebody who onboarded to lose thirty pounds
// was reading about dunking and DJ gigs.
//
// So this composes the brief from the session in front of you.
// Every number here is measured off the exercises actually
// resolved for that day (after swaps, deloads, trims and
// adaptations), which means it cannot drift from what the
// screen is asking you to do, and it is as true for a workout
// off the shelf as for week nine of a generated plan.
// ============================================================

/** Anything a brief can be built from: a plan day, a shelf workout, your own picks. */
export interface BriefItem {
  exerciseId: string
  sets: number
  repText: string
  repsNum?: number
}

export interface BriefFocus {
  region: MuscleRegion
  label: string
  /** Fractional sets landing on this muscle (1.0 prime mover, 0.5 assisting). */
  sets: number
}

export interface BriefBlock {
  label: string
  movements: string[]
  why: string
}

/** Which muscles to light up on the body map, and how hot. */
export interface BriefMap {
  primary: MuscleRegion[]
  secondary: MuscleRegion[]
}

export interface WorkoutBrief {
  /** The session's own one-liner, where it has one. */
  intent?: string
  /** Its size, in the three numbers people actually want. */
  headline: string
  focus: BriefFocus[]
  map: BriefMap
  blocks: BriefBlock[]
  /** Where this sits in the plan. Empty for work the plan never scheduled. */
  placement: string[]
  totalSets: number
  minutes: number
}

/**
 * The order rules, said out loud.
 *
 * These are not decoration: engine/sequence.ts really does sort
 * every session into these bands before it reaches the screen, and
 * this is that same band list with the reasoning attached. If the
 * sequencer's bands change, these change with them.
 */
const BANDS: { label: string; why: string }[] = [
  { label: 'Warm-up', why: 'First, because cold joints are where the avoidable injuries live.' },
  {
    label: 'Explosive work',
    why: 'Jumps and sprints go on fresh legs, before anything tires them. Speed trained tired is just speed practised badly.',
  },
  { label: 'Main lifts', why: 'The heavy compounds while you still have something to give them.' },
  { label: 'Accessories', why: 'Smaller lifts after the big ones, where being tired costs you nothing.' },
  { label: 'Carries', why: 'Grip work late. Everything before it needs your hands to still work.' },
  { label: 'Core', why: 'Core after the lifting. A tired trunk under a heavy bar is how backs go.' },
  { label: 'Mobility', why: 'Stretching at the end, when the tissue is warm and will actually give.' },
  { label: 'Conditioning', why: 'Cardio last. Run it first and you spend the legs the lifts needed.' },
]

/** Muscles worth naming: the ones carrying at least a set of real work. */
const FOCUS_FLOOR = 1
const FOCUS_MAX = 6

function toResolved(items: BriefItem[]): ResolvedExercise[] {
  return items.map((it) => {
    const def = getExercise(it.exerciseId)
    return {
      exerciseId: it.exerciseId,
      name: def.name,
      kind: def.kind,
      restSec: def.restSec,
      sets: it.sets,
      repText: it.repText,
      repsNum: it.repsNum,
    }
  })
}

function focusOf(exercises: ResolvedExercise[]): BriefFocus[] {
  const load = regionLoad(exercises)
  return (Object.entries(load) as [MuscleRegion, number][])
    .map(([region, sets]) => ({ region, label: regionName(region), sets: Math.round(sets * 2) / 2 }))
    .filter((f) => f.sets >= FOCUS_FLOOR)
    .sort((a, b) => b.sets - a.sets || a.label.localeCompare(b.label))
    .slice(0, FOCUS_MAX)
}

/**
 * The same load, shaped for the body map.
 *
 * Primary is anything carrying at least half of what the hardest-worked
 * muscle is carrying, which is what makes a leg day read as a leg day
 * instead of lighting up in eleven places at once. Everything else with
 * any load at all still shows, dimmer, because it is still being paid.
 */
function mapOf(exercises: ResolvedExercise[]): BriefMap {
  const load = regionLoad(exercises)
  const entries = (Object.entries(load) as [MuscleRegion, number][]).filter(([, n]) => n > 0)
  if (entries.length === 0) return { primary: [], secondary: [] }
  const top = Math.max(...entries.map(([, n]) => n))
  return {
    primary: entries.filter(([, n]) => n >= top / 2).map(([r]) => r),
    secondary: entries.filter(([, n]) => n < top / 2).map(([r]) => r),
  }
}

function blocksOf(exercises: ResolvedExercise[]): BriefBlock[] {
  const byBand = new Map<number, string[]>()
  for (const ex of exercises) {
    const b = band(ex)
    const list = byBand.get(b) ?? []
    list.push(ex.name)
    byBand.set(b, list)
  }
  return [...byBand.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([b, movements]) => ({ ...BANDS[b], movements }))
}

function sizeLine(exercises: ResolvedExercise[], sets: number, minutes: number): string {
  const moves = exercises.length
  const setPart = sets === 1 ? '1 set' : `${sets} sets`
  const movePart = moves === 1 ? '1 movement' : `${moves} movements`
  return `${setPart} across ${movePart}, about ${minutes} min.`
}

/** The brief for any set of movements, with no plan context attached. */
export function briefForItems(items: BriefItem[], intent?: string): WorkoutBrief {
  const exercises = toResolved(items)
  const sets = totalSets(exercises)
  const minutes = estimateMinutes(exercises)
  return {
    intent,
    headline: sizeLine(exercises, sets, minutes),
    focus: focusOf(exercises),
    map: mapOf(exercises),
    blocks: blocksOf(exercises),
    placement: [],
    totalSets: sets,
    minutes,
  }
}

/**
 * Where a scheduled day sits: the week, the block, and whatever the
 * plan has done to this particular day. Only facts the athlete can act
 * on, and only ones true of THIS day, so it stays short enough to read.
 */
function placementOf(day: ResolvedDay, data: AppData, makeupFor?: ISODate): string[] {
  const out: string[] = []
  if (makeupFor) {
    out.push(`Running ${makeupFor.slice(5)}'s workout today. It logs under today, and that day stops counting as missed.`)
  }
  out.push(
    `Week ${day.weekIndex} of the plan. Block ${day.blockIndex}, week ${day.weekInBlock} of 4.`,
  )
  if (day.isDeload) {
    out.push('Deload week, so the sets are cut on purpose and the weights stay put. Leaving with something left is the point.')
  }
  if (day.cns) {
    out.push('A max-effort day, which is why it asks how you slept before it starts. Fresh or it does not count.')
  }
  if (day.tier === 2) out.push('Tier 2 week: three days instead of five, and this is one of them.')
  if (day.tier === 3) out.push('Tier 3 week: two days, holding ground until the week opens up again.')
  const goal = data.plan.goalStatement?.trim()
  if (goal) out.push(`All of it points at what you said you wanted: ${goal}`)
  return out
}

/** The brief for a scheduled plan day, placement and all. */
export function briefForDay(day: ResolvedDay, data: AppData, makeupFor?: ISODate): WorkoutBrief {
  const base = briefForItems(day.exercises, day.tagline)
  return { ...base, placement: placementOf(day, data, makeupFor) }
}

/**
 * The brief for a session that already exists, however it was started.
 *
 * The custom/scheduled fork lives here rather than in the screens
 * because three of them would otherwise each carry their own copy of it,
 * and a session built off the shelf has no template to resolve: what it
 * is, is the exercises it was built with.
 */
export function briefForSession(session: SessionLog, data: AppData): WorkoutBrief {
  if (session.customTitle) {
    return briefForItems(
      session.exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        sets: ex.sets.length,
        repText: ex.sets[0]?.targetReps ?? '',
        repsNum: ex.sets[0]?.reps,
      })),
      'Your own workout, logged like any other.',
    )
  }
  return briefForDay(
    resolveDay(session.makeupFor ?? session.date, data),
    data,
    session.makeupFor,
  )
}

// ---------- The plan, not just the day ----------

export interface PlanDayLine {
  weekday: string
  title: string
  tagline: string
}

export interface PlanBrief {
  name: string
  /** What the athlete said they wanted, in their words. */
  goalStatement?: string
  headline: string
  week: PlanDayLine[]
  rules: { title: string; text: string }[]
}

const WD_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * How YOUR plan works, read off your booklet.
 *
 * The app already had a "The Plan" reader, and it was the owner's NAOD
 * booklet transcribed: dunking, DJ Fridays, the penultimate step. Every
 * athlete saw it, including the one who onboarded to lose thirty pounds
 * and does not own a basketball. This is the same question answered from
 * the plan the person is actually training on, so it is true for the
 * preset, for a generated plan and for a routine somebody pasted in.
 */
export function planBrief(data: AppData): PlanBrief {
  const plan = data.plan
  const week: PlanDayLine[] = []
  for (const wd of [1, 2, 3, 4, 5, 6, 0] as const) {
    const id = plan.tier1ByWeekday[wd]
    const t = id ? plan.templates[id] : null
    week.push({
      weekday: WD_NAME[wd],
      title: t?.title ?? 'Rest',
      tagline: t?.tagline ?? 'Recovery is part of the program.',
    })
  }
  const training = week.filter((d) => d.title !== 'Rest').length
  const rules = [
    {
      title: 'Four-week blocks',
      text: 'Three weeks of building, then a deload week where the sets halve and the weights stay. The easy week is what makes the hard ones keep working.',
    },
    {
      title: 'One rep number',
      text: 'You never pick reps. The plan asks for a single number and raises it as you clear it, then puts the next step on the bar instead.',
    },
    {
      title: 'Tiers, for the weeks life wins',
      text: 'Tier 1 is the full week. Tier 2 is three days, tier 3 is two. Dropping a tier is a plan, and it beats missing the week.',
    },
    {
      title: 'Nothing moves without your tap',
      text: 'Every adjustment the app works out is offered with its evidence and waits for you. It never quietly rewrites your plan.',
    },
  ]
  return {
    name: plan.name,
    goalStatement: plan.goalStatement?.trim() || undefined,
    headline: `${training} training day${training === 1 ? '' : 's'} a week, built around ${plan.daysPerWeek} you said you had.`,
    week,
    rules,
  }
}
