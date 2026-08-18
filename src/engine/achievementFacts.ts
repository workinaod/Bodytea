import type { AppData, ISODate, SessionLog } from '../types'
import { addDaysISO, daysBetween, mondayOf, todayISO } from './calendar'
import { resolveDay } from './resolveDay'
import { getExercise } from '../plan/exercises'
import { e1RM } from './stats'
import { streakState } from './streak'
import { travelMiles } from './activityLog'

// ============================================================
// Every number the trophy case needs, measured once.
//
// The catalog says what the bars are. This says where the athlete
// actually stands, read off the logs and nothing else. If a fact
// cannot be derived from something the person did, it does not
// belong here, and the achievement that wanted it stays `pending`
// in the catalog rather than getting a fake number.
// ============================================================

export interface AthleteFacts {
  streakCurrent: number
  streakBest: number
  /** Whole years inside the best run. Each one is another Inferno. */
  infernoCycles: number

  earlySessions: number
  lateSessions: number

  perfectWeeks: number
  perfectMonths: number
  ironWeeks: number

  prTotal: number
  /** Most records set in one session. */
  prBestSession: number
  /** Longest a broken record had stood, in days. */
  oldestPrBrokenDays: number
  cleanSweepBlocks: number

  cardioSessions: number
  cardioMilesTotal: number
  distanceRecords: number
  paceRecords: number
  doubleDays: number

  /** Current run of days with no excuse logged. */
  ghostDays: number
  /** Completed 30 day no-excuse runs. */
  ghostRuns: number

  hasOwnRoutine: boolean
  ownRoutineWeeks: number
  ownRoutineBlocks: number

  /** Pounds below the starting weight, 0 if not down. */
  weightLostLb: number
  /** Pounds above the starting weight, 0 if not up. */
  weightGainedLb: number
  hitTargetWeight: boolean
  /** Weeks of unbroken measurable improvement, most recent run. */
  progressionWeeks: number
}

const DONE = (s: SessionLog) => s.status !== 'skipped'

/**
 * The hour a session happened, on the app's own clock.
 *
 * The day rolls at 3 AM here, so a 1 AM session belongs to the
 * night before. Counting it as "before 6 AM" would hand Early
 * Riser to the person who trains at one in the morning, which is
 * the exact opposite of what the badge is for.
 */
function sessionHour(s: SessionLog): number | null {
  const stamp = s.startedAt ?? s.endedAt
  if (!stamp) return null
  const h = new Date(stamp).getHours()
  return Number.isFinite(h) ? h : null
}

const isEarly = (h: number) => h >= 3 && h < 6
const isLate = (h: number) => h >= 22 || h < 3

/** Scheduled days in [from, to] and how many of them were honoured. */
function coverage(data: AppData, from: ISODate, to: ISODate) {
  let scheduled = 0
  let kept = 0
  for (let d = from; daysBetween(d, to) >= 0; d = addDaysISO(d, 1)) {
    const r = resolveDay(d, data)
    if (r.kind !== 'session' && r.kind !== 'mobility' && r.kind !== 'cardio-backup') continue
    scheduled++
    const log = data.sessions[d]
    if (log && DONE(log)) kept++
  }
  return { scheduled, kept }
}

/** Weeks and months where nothing scheduled was missed. */
function consistency(data: AppData, first: ISODate, today: ISODate) {
  let perfectWeeks = 0
  let ironWeeks = 0
  let perfectMonths = 0

  // A week only counts once it is over, so today's half-finished
  // week can never award a badge it has not earned yet.
  for (let w = mondayOf(first); daysBetween(addDaysISO(w, 6), today) > 0; w = addDaysISO(w, 7)) {
    const { scheduled, kept } = coverage(data, w, addDaysISO(w, 6))
    if (scheduled === 0 || kept !== scheduled) continue
    perfectWeeks++
    // Iron Week wants the cardio too: every day of the week that
    // planned cardio has a cardio entry against it.
    let cardioPlanned = 0
    let cardioKept = 0
    for (let i = 0; i < 7; i++) {
      const d = addDaysISO(w, i)
      if (resolveDay(d, data).kind !== 'cardio-backup') continue
      cardioPlanned++
      if ((data.cardio[d] ?? []).length > 0) cardioKept++
    }
    const anyCardio = Object.keys(data.cardio).some(
      (d) => daysBetween(w, d) >= 0 && daysBetween(d, addDaysISO(w, 6)) >= 0,
    )
    if (cardioPlanned === cardioKept && anyCardio) ironWeeks++
  }

  for (let m = first.slice(0, 7); m <= today.slice(0, 7); ) {
    const [y, mo] = m.split('-').map(Number)
    const firstOf = `${m}-01` as ISODate
    const lastOf = new Date(y, mo, 0)
    const last = `${m}-${String(lastOf.getDate()).padStart(2, '0')}` as ISODate
    if (daysBetween(last, today) > 0) {
      const { scheduled, kept } = coverage(data, firstOf, last)
      if (scheduled > 0 && kept === scheduled) perfectMonths++
    }
    const next = new Date(y, mo, 1)
    m = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
  }
  return { perfectWeeks, ironWeeks, perfectMonths }
}

interface PrRun {
  total: number
  bestSession: number
  oldestBrokenDays: number
  sweeps: number
}

/**
 * Records, in one forward pass.
 *
 * stats.detectPRs re-scans the whole history for every exercise of
 * every session, which is fine for one debrief and quadratic over
 * a year. Walking forward with a running best is linear, and it is
 * the only way to know how long the record it beat had stood.
 */
function records(data: AppData, dates: ISODate[]): PrRun {
  const bestE1rm = new Map<string, { value: number; since: ISODate }>()
  const bestReps = new Map<string, { value: number; since: ISODate }>()
  const tracked = new Set(data.plan.trackedLifts.map((t) => t.exerciseId))
  const out: PrRun = { total: 0, bestSession: 0, oldestBrokenDays: 0, sweeps: 0 }
  // block index → set of tracked lifts PR'd inside it
  const sweepProgress = new Map<number, Set<string>>()

  for (const date of dates) {
    const s = data.sessions[date]
    if (!s || !DONE(s)) continue
    let inSession = 0
    for (const log of s.exercises) {
      if (log.skipped) continue
      const def = getExercise(log.exerciseId)
      if (def.kind !== 'lift' && def.kind !== 'core') continue
      const done = log.sets.filter((x) => x.done)
      if (done.length === 0) continue

      // What was done outranks what was asked for, here as everywhere:
      // `reps` is the prescription copied in at session build, `achieved`
      // is the truth when they differ. Reading the ask credited records
      // nobody set, and it hit bodyweight athletes hardest, since reps
      // are the only number they have.
      const repsOf = (x: (typeof done)[number]) => x.achieved ?? x.reps ?? 0
      const loaded = done.filter((x) => x.weightLb !== undefined && x.weightLb > 0 && repsOf(x) > 0)
      let hit = false
      if (loaded.length) {
        const now = Math.max(...loaded.map((x) => e1RM(x.weightLb!, repsOf(x))))
        const prev = bestE1rm.get(log.exerciseId)
        if (prev && now > prev.value) {
          hit = true
          out.oldestBrokenDays = Math.max(out.oldestBrokenDays, daysBetween(prev.since, date))
        }
        if (!prev || now > prev.value) bestE1rm.set(log.exerciseId, { value: now, since: date })
      } else {
        const reps = Math.max(0, ...done.map(repsOf))
        if (reps > 0) {
          const prev = bestReps.get(log.exerciseId)
          if (prev && reps > prev.value) {
            hit = true
            out.oldestBrokenDays = Math.max(out.oldestBrokenDays, daysBetween(prev.since, date))
          }
          if (!prev || reps > prev.value) bestReps.set(log.exerciseId, { value: reps, since: date })
        }
      }

      if (hit) {
        inSession++
        out.total++
        if (tracked.has(log.exerciseId)) {
          const block = resolveDay(date, data).blockIndex
          const set = sweepProgress.get(block) ?? new Set<string>()
          set.add(log.exerciseId)
          sweepProgress.set(block, set)
        }
      }
    }
    if (inSession > out.bestSession) out.bestSession = inSession
  }

  if (tracked.size > 0) {
    for (const set of sweepProgress.values()) if (set.size >= tracked.size) out.sweeps++
  }
  return out
}

/** Distance and pace records, per activity so a ride never beats a run. */
function cardioRecords(data: AppData) {
  const bestMiles = new Map<string, number>()
  const bestPace = new Map<string, number>()
  let distanceRecords = 0
  let paceRecords = 0
  let sessions = 0
  let miles = 0

  for (const date of Object.keys(data.cardio).sort()) {
    for (const e of data.cardio[date]) {
      sessions++
      // Court sports now carry a miles figure derived from steps at a
      // shuffle stride. It is a real number for that sport and it is
      // not a distance record: "furthest pickleball" is not a thing
      // anyone is chasing, and a PACE record over shuffle distance is
      // arithmetic on two numbers that were never a pace. Only travel
      // counts here, which is the set that could contribute before
      // steps existed.
      const mi = travelMiles(e)
      miles += mi
      if (mi > 0) {
        const prev = bestMiles.get(e.activityId)
        if (prev !== undefined && mi > prev) distanceRecords++
        if (prev === undefined || mi > prev) bestMiles.set(e.activityId, mi)
        if (e.minutes && e.minutes > 0) {
          const pace = e.minutes / mi
          const prevPace = bestPace.get(e.activityId)
          if (prevPace !== undefined && pace < prevPace) paceRecords++
          if (prevPace === undefined || pace < prevPace) bestPace.set(e.activityId, pace)
        }
      }
    }
  }
  return { sessions, miles, distanceRecords, paceRecords }
}

/** Days with both a completed session and a cardio entry. */
function doubleDays(data: AppData): number {
  let n = 0
  for (const [date, s] of Object.entries(data.sessions)) {
    if (!DONE(s)) continue
    if ((data.cardio[date] ?? []).length > 0) n++
  }
  return n
}

/** No-excuse runs: current length, and how many full 30s are banked. */
function ghost(data: AppData, first: ISODate, today: ISODate) {
  const days = data.excuses.map((e) => e.date).sort()
  let runs = 0
  let cursor = first
  for (const d of days) {
    const len = daysBetween(cursor, d)
    runs += Math.floor(len / 30)
    cursor = addDaysISO(d, 1)
  }
  const current = Math.max(0, daysBetween(cursor, today) + 1)
  runs += Math.floor(current / 30)
  return { ghostDays: current, ghostRuns: runs }
}

/**
 * Weight moved against the first weigh-in on record.
 *
 * Deliberately measured from the start, not from the peak: a cut
 * that rebounded and came back down should not pay out twice.
 */
function bodyweight(data: AppData) {
  const weights = data.measurements.filter((m) => m.weightLb !== undefined)
  if (weights.length < 2) return { lost: 0, gained: 0, hitTarget: false }
  const start = weights[0].weightLb!
  const now = weights[weights.length - 1].weightLb!
  // Targets are user-written, so they are matched the same way the
  // Progress screen matches them: by what the label says.
  const target = data.plan.customTargets.find((t) => t.label.toLowerCase().includes('weight'))?.target
  return {
    lost: Math.max(0, start - now),
    gained: Math.max(0, now - start),
    hitTarget:
      target !== undefined &&
      (start > target ? now <= target : start < target ? now >= target : false),
  }
}

/**
 * How long they have been running something they wrote themselves.
 *
 * Creating a routine is not the achievement, sticking to it is, so
 * this counts weeks with a completed session while a custom plan
 * is the active one.
 */
function ownRoutine(data: AppData, first: ISODate, today: ISODate) {
  const custom = data.plan.routineGoals !== undefined || data.plan.whyWorks !== undefined
  if (!custom) return { hasOwnRoutine: false, weeks: 0, blocks: 0 }
  let weeks = 0
  for (let w = mondayOf(first); daysBetween(addDaysISO(w, 6), today) > 0; w = addDaysISO(w, 7)) {
    const any = Array.from({ length: 7 }, (_, i) => data.sessions[addDaysISO(w, i)]).some(
      (s) => s !== undefined && DONE(s),
    )
    if (any) weeks++
  }
  return { hasOwnRoutine: true, weeks, blocks: Math.floor(weeks / 4) }
}

/**
 * Consecutive weeks with something measurably better than the week
 * before: more tonnage on the bar, or more cardio distance. Either
 * counts, because a runner improving is progressing just as much as
 * a lifter adding plates.
 */
function progression(data: AppData, first: ISODate, today: ISODate): number {
  const weekly: { load: number; miles: number }[] = []
  for (let w = mondayOf(first); daysBetween(addDaysISO(w, 6), today) > 0; w = addDaysISO(w, 7)) {
    let load = 0
    let miles = 0
    for (let i = 0; i < 7; i++) {
      const d = addDaysISO(w, i)
      const s = data.sessions[d]
      if (s && DONE(s)) {
        for (const ex of s.exercises) {
          for (const set of ex.sets) {
            // Tonnage on the reps actually done, same as stats.sessionTonnage.
            const reps = set.achieved ?? set.reps
            if (set.done && set.weightLb && reps) load += set.weightLb * reps
          }
        }
      }
      for (const c of data.cardio[d] ?? []) miles += travelMiles(c)
    }
    weekly.push({ load, miles })
  }
  let run = 0
  for (let i = 1; i < weekly.length; i++) {
    const up =
      (weekly[i].load > weekly[i - 1].load && weekly[i].load > 0) ||
      (weekly[i].miles > weekly[i - 1].miles && weekly[i].miles > 0)
    run = up ? run + 1 : 0
  }
  // A run of N improvements spans N+1 weeks of climbing.
  return run === 0 ? 0 : run + 1
}

export function athleteFacts(data: AppData, today: ISODate = todayISO()): AthleteFacts {
  const dates = Object.keys(data.sessions).sort()
  const first = dates[0] ?? data.settings.phaseStartDate
  const streak = streakState(data, today)

  let earlySessions = 0
  let lateSessions = 0
  for (const d of dates) {
    const s = data.sessions[d]
    if (!DONE(s)) continue
    const h = sessionHour(s)
    if (h === null) continue
    if (isEarly(h)) earlySessions++
    else if (isLate(h)) lateSessions++
  }

  const con = consistency(data, first, today)
  const pr = records(data, dates)
  const cardio = cardioRecords(data)
  const g = ghost(data, first, today)
  const bw = bodyweight(data)
  const own = ownRoutine(data, first, today)

  return {
    streakCurrent: streak.current,
    streakBest: streak.best,
    infernoCycles: Math.floor(streak.best / 365),
    earlySessions,
    lateSessions,
    perfectWeeks: con.perfectWeeks,
    perfectMonths: con.perfectMonths,
    ironWeeks: con.ironWeeks,
    prTotal: pr.total,
    prBestSession: pr.bestSession,
    oldestPrBrokenDays: pr.oldestBrokenDays,
    cleanSweepBlocks: pr.sweeps,
    cardioSessions: cardio.sessions,
    cardioMilesTotal: cardio.miles,
    distanceRecords: cardio.distanceRecords,
    paceRecords: cardio.paceRecords,
    doubleDays: doubleDays(data),
    ghostDays: g.ghostDays,
    ghostRuns: g.ghostRuns,
    hasOwnRoutine: own.hasOwnRoutine,
    ownRoutineWeeks: own.weeks,
    ownRoutineBlocks: own.blocks,
    weightLostLb: bw.lost,
    weightGainedLb: bw.gained,
    hitTargetWeight: bw.hitTarget,
    progressionWeeks: progression(data, first, today),
  }
}
