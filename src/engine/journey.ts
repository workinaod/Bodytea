import type { AppData, ISODate } from '../types'
import type { RungMetric, TrackId } from '../journeyTypes'
import {
  consistencyRungs,
  fatLossPctPerWeek,
  gainPctPerWeek,
  runRungs,
  DEFICIT_WATER_DAYS,
  rungId,
  strengthLbPerWeek,
  strengthRungs,
  TRACK_LABEL,
  TRACK_TONE,
  TRACKS_FOR_GOAL,
  vertInPerWeek,
  vertRungs,
  weeksToLongRun,
  weightRungs,
  type RungSpec,
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
  type EtaBasis,
} from './journeyMetrics'

export type { EtaBasis } from './journeyMetrics'
export { readMetric } from './journeyMetrics'

// ============================================================
// Turning a goal into a climb, and a climb into a date.
//
// Layer 1: this is the file that knows about AppData and the
// calendar. plan/milestones.ts holds the rungs and the rate
// model and speaks only in weeks-from-now; converting weeks to
// a month name happens here. That is also the only reason the
// layering works — loadStepLb lives in engine/, so a rank-0
// module could never have derived the strength rate itself.
//
// Everything below is DERIVED and rebuilt on every render. The
// only persisted thing in the whole feature is the date a rung
// was first reached (journeyTypes.ts), because that is a
// historical fact and re-deriving it would let a deload week or
// a bad morning on the scale take it away again.
// ============================================================

export type RungState = 'done' | 'next' | 'ahead' | 'locked'

export interface Rung {
  id: string
  track: TrackId
  metric: RungMetric
  exerciseId?: string
  label: string
  detail: string
  target: number
  unit: string
  state: RungState
  hitOn?: ISODate
  current?: number
  /** 0..1 from the anchor to this rung's target. */
  progress: number
  etaWeeks?: number
  etaLabel?: string
  basis: EtaBasis
  /** Why there is no estimate, in the athlete's terms. */
  note?: string
  /** state 'locked': the exact thing that would anchor it. */
  blocker?: string
  /** True when reaching this rung means the number going DOWN. */
  descending: boolean
}

export interface Track {
  id: TrackId
  label: string
  tone: 'accent' | 'lime' | 'cyan' | 'gold'
  rungs: Rung[]
}

export interface Journey {
  tracks: Track[]
  /** Every rung, ordered for the rail: reached ones oldest-first, then the rest. */
  rail: Rung[]
  doneCount: number
  totalCount: number
  next?: Rung
  summit?: Rung
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
  spec: RungSpec
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
  const tracks = TRACKS_FOR_GOAL[goal]
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
    // wrong in a way that quietly gutted the feature: a rung was never
    // on the rail at the moment it was cleared, so it could never be
    // scored, never stamped, and never appear as done. The stack of
    // ticks above the today line — the entire reason somebody scrolls
    // to this screen — would have been permanently empty.
    //
    // Safe to do precisely because targets are absolute. Extending the
    // ladder downward adds rungs below; it renames nothing.
    const from = firstMeasured(data, 'weightLb') ?? bw
    const far = cutting ? bw - 30 : bw + 15
    for (const spec of weightRungs(cutting ? Math.max(from, bw) : Math.min(from, bw), far).slice(0, 8)) {
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
      // rail as a tick. Not lower: a rung they cleared before they ever
      // opened the app is not something they did here, and a tick for
      // it would be the app taking credit for somebody else's work.
      const series = liftSeries(data, lift.exerciseId)
      const from = series.length ? Math.min(...series.map((p) => p.weightLb)) : cur
      for (const spec of strengthRungs(lift.exerciseId, lift.label, from, cur + 150).slice(0, 7)) {
        out.push({ spec, modelledPerWeek: perWeek, descending: false, observed: obs, from })
      }
    }
  }

  if (tracks.includes('engine')) {
    const cur = readMetric(data, 'longRunMi') ?? 0
    // Distances already covered stay on the rail: a first 5K is a thing
    // that happened, and it should read that way forever.
    for (const spec of runRungs(0, Math.max(cur, 3.1) + 8).slice(0, 6)) {
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
      for (const spec of vertRungs(Math.min(from, cur), 24)) {
        out.push({ spec, modelledPerWeek: vertInPerWeek(age), descending: false, observed: obs, from })
      }
    }
  }

  // Consistency is on every ladder and needs no anchor, which is what
  // makes day one of a brand-new account a real rail rather than a
  // screen of grey rows telling somebody to come back later.
  const sessions = totalSessions(data)
  const perWeekSessions = Math.max(1, data.plan.daysPerWeek)
  for (const spec of consistencyRungs(sessions)) {
    out.push({
      spec,
      modelledPerWeek: spec.metric === 'sessions' ? perWeekSessions : 7,
      descending: false,
      observed: null,
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

  const byTrack = new Map<TrackId, Rung[]>()
  const seenIndex = new Map<TrackId, number>()

  for (const b of built) {
    const id = rungId(b.spec)
    const current = b.blocker ? null : readMetric(data, b.spec.metric, b.spec.exerciseId)
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

    const rung: Rung = {
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
    }
    const list = byTrack.get(b.spec.track) ?? []
    list.push(rung)
    byTrack.set(b.spec.track, list)
  }

  // The first unreached rung on each track is the one being climbed.
  for (const list of byTrack.values()) {
    const first = list.find((r) => r.state === 'ahead')
    if (first) first.state = 'next'
  }

  const tracks: Track[] = TRACKS_FOR_GOAL[data.plan.goal]
    .filter((t) => byTrack.has(t))
    .map((t) => ({ id: t, label: TRACK_LABEL[t], tone: TRACK_TONE[t], rungs: byTrack.get(t)! }))

  const all = tracks.flatMap((t) => t.rungs)
  const rail = orderRail(all)
  const next = rail.find((r) => r.state === 'next')
  // The summit is the furthest thing on the board with a real estimate:
  // the one worth scrolling to the bottom for.
  const ahead = rail.filter((r) => r.state !== 'done' && r.state !== 'locked')
  const summit = [...ahead].sort((a, b) => (b.etaWeeks ?? 0) - (a.etaWeeks ?? 0))[0]

  return {
    tracks,
    rail,
    doneCount: all.filter((r) => r.state === 'done').length,
    totalCount: all.length,
    next,
    summit,
  }
}

/**
 * How far along this rung is, measured FROM THE BASELINE.
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
    // No baseline (behaviour rungs count up from nothing, which IS zero).
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
 * ETAs recompute on every store write, so sorting the rail by ETA
 * would let rows swap places between renders while their fills are
 * mid-animation. Reached rungs go first in the order they were
 * reached — that stack of ticks is the emotional payload of the whole
 * screen — then everything ahead, grouped so a track stays together,
 * then the locked ones. Ties break on id so the order never wobbles.
 */
export function orderRail(rungs: Rung[]): Rung[] {
  const rank = (r: Rung) => (r.state === 'done' ? 0 : r.state === 'locked' ? 2 : 1)
  return [...rungs].sort((a, b) => {
    const ra = rank(a)
    const rb = rank(b)
    if (ra !== rb) return ra - rb
    if (ra === 0) return (a.hitOn ?? '') < (b.hitOn ?? '') ? -1 : 1
    if (a.track !== b.track) return a.track < b.track ? -1 : 1
    // CLIMB order, not numeric order. On a cut the next rung is the
    // HIGHEST number left, and sorting ascending put the furthest one
    // at the top of the list and labelled it "next" — the rail pointing
    // somebody at a target four months out while the one three weeks
    // away sat at the bottom.
    if (a.target !== b.target) return a.descending ? b.target - a.target : a.target - b.target
    return a.id < b.id ? -1 : 1
  })
}

/**
 * Rungs reached since the last time this ran, for the store to stamp.
 *
 * Separated from buildJourney because building is a pure read that
 * happens on every render and stamping is a write that must happen
 * once. Calling this from a render would loop.
 */
export function newlyReached(data: AppData, today: ISODate): string[] {
  const hits = data.journey?.hits ?? {}
  return buildJourney(data, today)
    .rail.filter((r) => r.state === 'done' && !hits[r.id])
    .map((r) => r.id)
}

