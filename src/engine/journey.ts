import type { AppData, ISODate } from '../types'
import type { StageMetric, TrackId } from '../journeyTypes'
import {
  consistencyStages,
  fatLossPctPerWeek,
  gainPctPerWeek,
  runStages,
  DEFICIT_WATER_DAYS,
  stageId,
  strengthLbPerWeek,
  strengthStages,
  TRACK_LABEL,
  TRACK_TONE,
  TRACKS_FOR_GOAL,
  vertInPerWeek,
  vertStages,
  unitOf,
  TRACK_OF_METRIC,
  weeklyMileageStages,
  weeksToLongRun,
  weightStages,
  type StageSpec,
  type TrainingAge,
} from '../plan/milestones'
import { loadStepLb } from './reps'
import { latestBodyweightLb, liftSeries, totalSessions } from './stats'
import {
  estimateWeeks,
  etaLabelFor,
  lastMeasured,
  measuredSeries,
  observedRatePerWeek,
  reachedNow,
  readMetric,
  statedTarget,
  type EtaBasis,
} from './journeyMetrics'

export type { EtaBasis } from './journeyMetrics'
export { readMetric } from './journeyMetrics'

// ============================================================
// Turning a goal into a climb, and a climb into a date.
//
// Layer 1: this is the file that knows about AppData and the
// calendar. plan/milestones.ts holds the stages and the rate
// model and speaks only in weeks-from-now; converting weeks to
// a month name happens here. That is also the only reason the
// layering works — loadStepLb lives in engine/, so a rank-0
// module could never have derived the strength rate itself.
//
// Everything below is DERIVED and rebuilt on every render. The
// only persisted thing in the whole feature is the date a stage
// was first reached (journeyTypes.ts), because that is a
// historical fact and re-deriving it would let a deload week or
// a bad morning on the scale take it away again.
// ============================================================

export type StageState = 'done' | 'next' | 'ahead' | 'locked'

export interface Stage {
  id: string
  track: TrackId
  metric: StageMetric
  exerciseId?: string
  label: string
  detail: string
  target: number
  unit: string
  state: StageState
  hitOn?: ISODate
  current?: number
  /** 0..1 from the anchor to this stage's target. */
  progress: number
  etaWeeks?: number
  etaLabel?: string
  basis: EtaBasis
  /** Why there is no estimate, in the athlete's terms. */
  note?: string
  /** state 'locked': the exact thing that would anchor it. */
  blocker?: string
  /** True when reaching this stage means the number going DOWN. */
  descending: boolean
  /** The athlete's OWN stated target, rather than one of our landmarks. */
  isGoal?: boolean
}

export interface Track {
  id: TrackId
  label: string
  tone: 'accent' | 'lime' | 'cyan' | 'gold'
  stages: Stage[]
}

export interface Journey {
  tracks: Track[]
  /** Every stage, ordered for the path: reached ones oldest-first, then the rest. */
  path: Stage[]
  doneCount: number
  totalCount: number
  next?: Stage
  summit?: Stage
}

// ---------------- Building the climb ----------------

/** The earliest recorded value, which is where the ladder starts. */
function firstMeasured(data: AppData, key: 'weightLb' | 'vertIn'): number | null {
  for (const m of data.measurements) {
    const v = m[key]
    if (typeof v === 'number') return v
  }
  return null
}

function ageOf(data: AppData): TrainingAge {
  return data.plan.experience ?? 'new'
}

/**
 * Every (exerciseId, repText) a template actually prescribes.
 *
 * TemplateEntry is a three-way union and a tracked lift reaches the
 * athlete through any of them: named outright, filled from a slot the
 * plan maps per block, or as one side of an A/B pair. Reading only the
 * 'fixed' arm would silently report that somebody squats zero times a
 * week on every generated plan, which is exactly the sort of quiet
 * wrong number that produces a confident, useless estimate.
 */
function prescribedIn(data: AppData, templateId: string): { exerciseId: string; repText: string }[] {
  const t = data.plan.templates[templateId]
  if (!t) return []
  const out: { exerciseId: string; repText: string }[] = []
  for (const e of t.entries) {
    if (e.entry === 'fixed') out.push({ exerciseId: e.exerciseId, repText: e.repText })
    else if (e.entry === 'ab') {
      out.push({ exerciseId: e.a.exerciseId, repText: e.a.repText })
      out.push({ exerciseId: e.b.exerciseId, repText: e.b.repText })
    } else {
      // A slot resolves differently per block; any block that serves the
      // lift counts, since the question is how often it comes round.
      for (const block of [1, 2, 3] as const) {
        const id = data.plan.slots[block]?.[e.slot]
        if (id) out.push({ exerciseId: id, repText: e.repText })
      }
    }
  }
  return out
}

/** How often a lift actually comes round in a week, from the plan itself. */
function sessionsPerWeekFor(data: AppData, exerciseId: string): number {
  const days = Object.values(data.plan.tier1ByWeekday).filter(Boolean) as string[]
  let hits = 0
  for (const tid of days) {
    if (prescribedIn(data, tid).some((p) => p.exerciseId === exerciseId)) hits++
  }
  return hits || 1
}

function repRangeFor(data: AppData, exerciseId: string): { low: number; high: number } {
  for (const tid of Object.keys(data.plan.templates)) {
    for (const p of prescribedIn(data, tid)) {
      if (p.exerciseId !== exerciseId) continue
      const m = p.repText.match(/(\d+)\s*[-–]\s*(\d+)/)
      if (m) return { low: Number(m[1]), high: Number(m[2]) }
    }
  }
  return { low: 6, high: 10 }
}

interface Built {
  spec: StageSpec
  modelledPerWeek: number
  descending: boolean
  observed: number | null
  blocker?: string
  /**
   * Where this track started, so the bar can measure how far they have
   * come rather than how close the number is to another number.
   */
  from?: number
}

function buildSpecs(data: AppData, today: ISODate): Built[] {
  const goal = data.plan.goal
  const stated = statedTarget(data)
  // What they typed outranks what we inferred from a chip.
  //
  // Somebody whose goal chip says "lean" and who then typed "vert 30"
  // in their own words is telling us something the chip cannot. Their
  // number gets its track whether or not the goal would have shown it,
  // because the alternative is a path that never mentions the one
  // thing they actually asked for.
  const tracks: TrackId[] = [...TRACKS_FOR_GOAL[goal]]
  if (stated && !tracks.includes(TRACK_OF_METRIC[stated.metric])) {
    tracks.push(TRACK_OF_METRIC[stated.metric])
  }
  const age = ageOf(data)
  const bw = latestBodyweightLb(data)
  const out: Built[] = []

  if (tracks.includes('body') && bw !== null) {
    const bf = lastMeasured(data, 'bodyFatPct')
    const cutting = goal === 'lean'
    const pct = cutting ? fatLossPctPerWeek(bf) : gainPctPerWeek(age)
    const perWeek = bw * pct
    // The ladder runs from where they STARTED, not from where they are.
    //
    // Generating only what is ahead was the first version and it was
    // wrong in a way that quietly gutted the feature: a stage was never
    // on the path at the moment it was cleared, so it could never be
    // scored, never stamped, and never appear as done. The stack of
    // ticks above the today line — the entire reason somebody scrolls
    // to this screen — would have been permanently empty.
    //
    // Safe to do precisely because targets are absolute. Extending the
    // ladder downward adds stages below; it renames nothing.
    const from = firstMeasured(data, 'weightLb') ?? bw
    const far = cutting ? bw - 30 : bw + 15
    for (const spec of weightStages(cutting ? Math.max(from, bw) : Math.min(from, bw), far).slice(0, 8)) {
      out.push({
        spec,
        modelledPerWeek: perWeek,
        descending: cutting,
        observed: observedRatePerWeek(measuredSeries(data, 'weightLb'), today, {
          skipFirstDays: cutting ? DEFICIT_WATER_DAYS : 0,
        }),
        from,
      })
    }
  } else if (tracks.includes('body')) {
    out.push({
      spec: {
        track: 'body',
        metric: 'weightLb',
        target: 0,
        unit: 'lb',
        label: 'Your body track',
        detail: 'Everything on this strand hangs off one number the app does not have yet.',
      },
      modelledPerWeek: 0,
      descending: false,
      observed: null,
      blocker: 'Log a weigh-in to start this one',
    })
  }

  if (tracks.includes('strength')) {
    const lifts = data.plan.trackedLifts.slice(0, 2)
    for (const lift of lifts) {
      const cur = readMetric(data, 'topSetLb', lift.exerciseId)
      if (cur === null) {
        out.push({
          spec: {
            track: 'strength',
            metric: 'topSetLb',
            exerciseId: lift.exerciseId,
            target: 0,
            unit: 'lb',
            label: lift.label,
            detail: 'The ladder for this lift appears once there is a working set behind it.',
          },
          modelledPerWeek: 0,
          descending: false,
          observed: null,
          blocker: `Log a set of ${lift.label.toLowerCase()} to start this one`,
        })
        continue
      }
      const range = repRangeFor(data, lift.exerciseId)
      const perWeek = strengthLbPerWeek({
        loadStepLb: loadStepLb(lift.exerciseId),
        repLow: range.low,
        repHigh: range.high,
        sessionsPerWeek: sessionsPerWeekFor(data, lift.exerciseId),
        age,
      })
      const obs = observedRatePerWeek(
        liftSeries(data, lift.exerciseId).map((p) => ({ date: p.date, value: p.weightLb })),
        today,
      )
      // The ladder starts at the BASELINE — their first logged working
      // set — so every plate they have put on the bar since is on the
      // path as a tick. Not lower: a stage they cleared before they ever
      // opened the app is not something they did here, and a tick for
      // it would be the app taking credit for somebody else's work.
      const series = liftSeries(data, lift.exerciseId)
      const from = series.length ? Math.min(...series.map((p) => p.weightLb)) : cur
      for (const spec of strengthStages(lift.exerciseId, lift.label, from, cur + 150).slice(0, 7)) {
        out.push({ spec, modelledPerWeek: perWeek, descending: false, observed: obs, from })
      }
    }
  }

  if (tracks.includes('engine')) {
    const cur = readMetric(data, 'longRunMi') ?? 0
    // Distances already covered stay on the path: a first 5K is a thing
    // that happened, and it should read that way forever.
    for (const spec of runStages(0, Math.max(cur, 3.1) + 8).slice(0, 6)) {
      // Distance is the one metric whose model is not linear: carrying a
      // long run from 3 to 6 miles is not the same work as 20 to 23.
      const weeks = Math.max(1, weeksToLongRun(cur, spec.target))
      out.push({
        spec,
        modelledPerWeek: (spec.target - cur) / weeks,
        descending: false,
        observed: null,
        from: 0,
      })
    }
    // Weekly volume, which is what actually builds the engine. The long
    // run is the headline; this is the work behind it, and it was the
    // one endurance number the app already computed and never set a
    // target for.
    const wk = readMetric(data, 'weeklyMi') ?? 0
    for (const spec of weeklyMileageStages(0, Math.max(wk, 10) + 20).slice(0, 5)) {
      const weeks = Math.max(1, weeksToLongRun(Math.max(wk, 3), spec.target))
      out.push({
        spec,
        modelledPerWeek: (spec.target - wk) / weeks,
        descending: false,
        observed: null,
        from: 0,
      })
    }
  }

  if (tracks.includes('explosive')) {
    const cur = lastMeasured(data, 'vertIn')
    if (cur === null) {
      out.push({
        spec: {
          track: 'explosive',
          metric: 'vertIn',
          target: 0,
          unit: 'in',
          label: 'Your jump',
          detail: 'The rim ladder needs one number: how far above your reach you get right now.',
        },
        modelledPerWeek: 0,
        descending: false,
        observed: null,
        blocker: 'Log a vertical to start this one',
      })
    } else {
      const obs = observedRatePerWeek(measuredSeries(data, 'vertIn'), today)
      // Same baseline rule as the bar: the landmarks they have reached
      // since the first jump they logged here.
      const from = firstMeasured(data, 'vertIn') ?? cur
      for (const spec of vertStages(Math.min(from, cur), 24)) {
        out.push({ spec, modelledPerWeek: vertInPerWeek(age), descending: false, observed: obs, from })
      }
    }
  }

  // Consistency is on every ladder and needs no anchor, which is what
  // makes day one of a brand-new account a real path rather than a
  // screen of grey rows telling somebody to come back later.
  const sessions = totalSessions(data)
  const perWeekSessions = Math.max(1, data.plan.daysPerWeek)
  for (const spec of consistencyStages(sessions)) {
    out.push({
      spec,
      modelledPerWeek: spec.metric === 'sessions' ? perWeekSessions : 7,
      descending: false,
      observed: null,
    })
  }

  // Their own number goes on last, so it sits past our landmarks: it
  // is the summit, and everything else is on the way to it.
  if (stated) {
    const cur = readMetric(data, stated.metric, stated.exerciseId)
    const descending = stated.metric === 'weightLb' || stated.metric === 'waistIn' || stated.metric === 'bodyFatPct'
      ? cur !== null && stated.target < cur
      : false
    const twin = out.find((b) => b.spec.metric === stated.metric && b.spec.exerciseId === stated.exerciseId)
    out.push({
      spec: {
        track: TRACK_OF_METRIC[stated.metric],
        metric: stated.metric,
        exerciseId: stated.exerciseId,
        target: stated.target,
        unit: unitOf(stated.metric),
        label: `${data.plan.customTargets[0]?.label ?? 'Your target'} ${stated.target}${unitOf(stated.metric)}`,
        detail: 'The number you came here for, in your own words.',
        isGoal: true,
      },
      // Reuses the rate the rest of that track is projected from, so
      // the athlete's own target cannot quietly get a friendlier
      // estimate than the landmarks leading up to it.
      modelledPerWeek: twin?.modelledPerWeek ?? 0,
      descending,
      observed: twin?.observed ?? null,
      from: twin?.from,
    })
  }

  return out
}

/**
 * The whole climb, rebuilt from scratch on every call.
 *
 * Cheap on purpose: a handful of array passes over sessions,
 * measurements and runs. It never calls resolveDay and never walks the
 * calendar day by day, because this renders on the Progress tab
 * alongside things that already do.
 */
export function buildJourney(data: AppData, today: ISODate): Journey {
  const hits = data.journey?.hits ?? {}
  const built = buildSpecs(data, today)

  const byTrack = new Map<TrackId, Stage[]>()
  const seenIndex = new Map<TrackId, number>()

  for (const b of built) {
    const id = stageId(b.spec)
    const current = b.blocker ? null : readMetric(data, b.spec.metric, b.spec.exerciseId, today)
    const hitOn = hits[id]
    const reached = Boolean(hitOn) || reachedNow(data, b.spec, current, b.descending)

    const idx = seenIndex.get(b.spec.track) ?? 0
    const gap = b.descending ? (current ?? 0) - b.spec.target : b.spec.target - (current ?? 0)
    // Both rates are expressed as PROGRESS TOWARD THE TARGET per week,
    // so a cut's observed slope of −1.2 lb/wk becomes +1.2. Without
    // this the stall check reads every successful cut as stalled and
    // refuses an ETA to exactly the people making the most progress.
    const observed = b.observed === null ? null : b.descending ? -b.observed : b.observed
    const eta = reached || b.blocker ? { basis: 'none' as EtaBasis } : estimateWeeks({
      gap,
      modelledPerWeek: b.modelledPerWeek,
      observedPerWeek: observed,
      metric: b.spec.metric,
      index: idx,
    })
    if (!reached && !b.blocker) seenIndex.set(b.spec.track, idx + 1)

    const stage: Stage = {
      id,
      track: b.spec.track,
      metric: b.spec.metric,
      exerciseId: b.spec.exerciseId,
      label: b.spec.label,
      detail: b.spec.detail,
      target: b.spec.target,
      unit: b.spec.unit,
      state: b.blocker ? 'locked' : reached ? 'done' : 'ahead',
      hitOn,
      current: current ?? undefined,
      progress: progressOf(current, b.from, b.spec.target, b.descending, reached),
      etaWeeks: eta.weeks,
      etaLabel: eta.weeks !== undefined ? etaLabelFor(today, eta.weeks) : undefined,
      basis: eta.basis,
      note: eta.note,
      blocker: b.blocker,
      descending: b.descending,
      isGoal: b.spec.isGoal,
    }
    const list = byTrack.get(b.spec.track) ?? []
    list.push(stage)
    byTrack.set(b.spec.track, list)
  }

  // The stage being climbed on each track is the one that ARRIVES first,
  // not the one that happens to be built first.
  //
  // Those differ: the consistency track builds every session stage before
  // any streak stage, so "50 sessions" was being called the next stop
  // while a 7-day streak two weeks nearer sat behind it looking like
  // something for later. On a path that is not a cosmetic mislabel — it
  // points the walker at the wrong stop.
  for (const list of byTrack.values()) {
    const ahead = list.filter((r) => r.state === 'ahead')
    if (ahead.length === 0) continue
    const soonest = ahead.reduce((best, r) =>
      (r.etaWeeks ?? Number.MAX_SAFE_INTEGER) < (best.etaWeeks ?? Number.MAX_SAFE_INTEGER) ? r : best,
    )
    soonest.state = 'next'
  }

  const stated = statedTarget(data)
  const trackOrder: TrackId[] = [...TRACKS_FOR_GOAL[data.plan.goal]]
  if (stated && !trackOrder.includes(TRACK_OF_METRIC[stated.metric])) {
    trackOrder.push(TRACK_OF_METRIC[stated.metric])
  }
  const tracks: Track[] = trackOrder
    .filter((t) => byTrack.has(t))
    .map((t) => ({ id: t, label: TRACK_LABEL[t], tone: TRACK_TONE[t], stages: byTrack.get(t)! }))

  const all = tracks.flatMap((t) => t.stages)
  const path = orderPath(all)
  const next = path.find((r) => r.state === 'next')
  // The summit is the furthest thing on the board with a real estimate:
  // the one worth scrolling to the bottom for.
  const ahead = path.filter((r) => r.state !== 'done' && r.state !== 'locked')
  const summit = [...ahead].sort((a, b) => (b.etaWeeks ?? 0) - (a.etaWeeks ?? 0))[0]

  return {
    tracks,
    path,
    doneCount: all.filter((r) => r.state === 'done').length,
    totalCount: all.length,
    next,
    summit,
  }
}

/**
 * How far along this stage is, measured FROM THE BASELINE.
 *
 * The first version was current/target, and on a cut that made every
 * bar read ~95 % full: somebody at 198 lb is 98 % of the way from ZERO
 * to 195, and 91 % of the way from zero to 180. Both bars looked
 * nearly done, including one four months out. Nobody is climbing from
 * zero pounds — they are climbing from where they started, and the
 * distance that matters is the one they have actually covered.
 */
function progressOf(
  current: number | null,
  from: number | undefined,
  target: number,
  descending: boolean,
  reached: boolean,
): number {
  if (reached) return 1
  if (current === null || target === 0) return 0
  if (from === undefined || from === target) {
    // No baseline (behaviour stages count up from nothing, which IS zero).
    return Math.max(0, Math.min(1, descending ? target / Math.max(current, 0.0001) : current / target))
  }
  const covered = descending ? from - current : current - from
  const total = descending ? from - target : target - from
  if (total <= 0) return 0
  return Math.max(0, Math.min(1, covered / total))
}

/**
 * A deterministic order, which matters more than it sounds.
 *
 * ETAs recompute on every store write, so sorting the path by ETA
 * would let rows swap places between renders while their fills are
 * mid-animation. Reached stages go first in the order they were
 * reached — that stack of ticks is the emotional payload of the whole
 * screen — then everything ahead, grouped so a track stays together,
 * then the locked ones. Ties break on id so the order never wobbles.
 */
export function orderPath(stages: Stage[]): Stage[] {
  const rank = (r: Stage) => (r.state === 'done' ? 0 : r.state === 'locked' ? 2 : 1)
  return [...stages].sort((a, b) => {
    const ra = rank(a)
    const rb = rank(b)
    if (ra !== rb) return ra - rb
    if (ra === 0) return (a.hitOn ?? '') < (b.hitOn ?? '') ? -1 : 1
    // Everything still ahead goes in the order it is expected to
    // ARRIVE, across all tracks, because the path is a timeline and a
    // timeline that groups by track is not one. A stage with no honest
    // estimate sorts to the far end rather than to the front — no date
    // means "further than we can see", not "any minute now".
    const ea = a.etaWeeks ?? Number.MAX_SAFE_INTEGER
    const eb = b.etaWeeks ?? Number.MAX_SAFE_INTEGER
    if (ea !== eb) return ea - eb
    if (a.track !== b.track) return a.track < b.track ? -1 : 1
    // METRIC before target, because one track carries several of them
    // and their numbers are not the same kind of thing. The body track
    // holds pounds, inches and a percentage; sorting 10 (% body fat)
    // against 180 (lb) as if they were comparable put a body-fat target
    // in the middle of the bodyweight ladder.
    if (a.metric !== b.metric) return a.metric < b.metric ? -1 : 1
    // CLIMB order, not numeric order. On a cut the next stage is the
    // HIGHEST number left, and sorting ascending put the furthest one
    // at the top of the list and labelled it "next" — the path pointing
    // somebody at a target four months out while the one three weeks
    // away sat at the bottom.
    if (a.target !== b.target) return a.descending ? b.target - a.target : a.target - b.target
    return a.id < b.id ? -1 : 1
  })
}

/**
 * Stages reached since the last time this ran, for the store to stamp.
 *
 * Separated from buildJourney because building is a pure read that
 * happens on every render and stamping is a write that must happen
 * once. Calling this from a render would loop.
 */
export function newlyReached(data: AppData, today: ISODate): string[] {
  const hits = data.journey?.hits ?? {}
  return buildJourney(data, today)
    .path.filter((r) => r.state === 'done' && !hits[r.id])
    .map((r) => r.id)
}

