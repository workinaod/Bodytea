import type { DebriefData, ExerciseKind, ISODate, SessionIntensity, SessionLog, SetLog } from '../types'
import { planTemplate, resolveDay } from '../engine/resolveDay'
import { applyReadinessDowngrade, minimumViableFor } from '../engine/transforms'
import { parseRepRange, repLabel, type RepRange } from '../engine/reps'
import { getExercise } from '../plan/exercises'
import { composeDebrief } from '../engine/debrief'
import { pushShown } from '../engine/coach'
import { uid, useAppStore } from '../store/appStore'
import { finishSession } from './actions'
import { prefillFor } from './prescription'

// ============================================================
// Building the day you are about to do.
//
// Its own file rather than more weight on logic/actions.ts,
// which had reached its allowance again. It is also a different
// job from everything else there: actions.ts changes a session
// that already exists, this one decides what the session IS
// before a single set is logged.
//
// That decision is where the day's shape is finally settled, so
// it is also where the trims must not stack. See below.
// ============================================================

const store = () => useAppStore.getState()

/**
 * The sets one exercise opens with. Shared by the scheduled path and the
 * off-plan one so the two can never drift: what a set asks for, what it
 * is prefilled with, and what gets marked `light` is one decision.
 */
function setsFor(
  date: ISODate,
  ex: {
    exerciseId: string
    kind: ExerciseKind
    sets: number
    repText: string
    repsNum?: number
    repRange?: RepRange
    lightMode?: boolean
    /** Athlete-chosen load (the own-workout builder); skips the prefill. */
    weightLb?: number
  },
): SetLog[] {
  const pre = prefillFor(date, ex.exerciseId, { repRange: ex.repRange, lightMode: ex.lightMode })
  const loaded = ex.kind === 'lift' || ex.kind === 'carry'
  const chosen = ex.weightLb !== undefined
  return Array.from({ length: ex.sets }, () => ({
    targetReps: ex.repText,
    weightLb: loaded ? (chosen ? ex.weightLb : pre.weightLb) : undefined,
    // The number actually being asked for, not the static one the
    // generator wrote months ago. repText has already been collapsed
    // to a single value by the rep engine, and it is the one on
    // screen, so it is the honest echo for the strength estimate to
    // read back. Only for genuine rep counts: a timed carry keeps
    // its own handling.
    reps:
      ex.repsNum !== undefined
        ? Number((ex.repText.match(/^\d+/) ?? [])[0]) || ex.repsNum
        : pre.reps,
    done: false,
    // Mark every weight the plan chose rather than the athlete, so
    // next week's baseline does not read it back as what they can do.
    //
    // Both doors matter. The obvious one is a deload or a readiness
    // cut. The other is a movement flagged as repeatedly failing:
    // that softening reads the baseline and returns a smaller
    // number, so if the smaller number is then logged as an ordinary
    // working set it becomes the next baseline and softens again.
    // Twenty simulated weeks walked a barbell row from 130 lb to 5
    // that way, one honest bad set at a time.
    //
    // A weight the athlete typed themselves is neither door.
    ...((ex.lightMode || pre.softened) && !chosen ? { light: true } : {}),
  }))
}

/**
 * Put a freshly built session onto the day WITHOUT destroying what is
 * already on it.
 *
 * Both doors reach this. The custom path was fixed to append first, but
 * `startSession` was left assigning straight over `d.sessions[date]`, and
 * that is the door a make-up comes through: run Monday's missed workout on
 * a Thursday and Thursday's own session was replaced by Monday's, along
 * with anything already logged that morning. The owner found it the same
 * way as the first one, from the app: "why is my days session still closed
 * like i did it."
 *
 * `reopen` is the whole difference between LOGGING work and STARTING it.
 * Recording something that already happened never changes whether the day
 * is over. Starting a workout does: a finished day the athlete then starts
 * training again is a day back in progress, and that is a deliberate tap,
 * not a side effect.
 */
function putOnDay(date: ISODate, skeleton: SessionLog, opts: { reopen: boolean }): void {
  store().update((d) => {
    const existing = d.sessions[date]
    if (!existing || existing.status === 'skipped') {
      // A skipped day that somebody then trains anyway is a day they
      // trained; the skip was the plan for it, not the record of it.
      d.sessions[date] = skeleton
      return
    }

    // Same movement twice in a day merges its sets into the entry that is
    // already there. Two entries for one exercise would read as two to the
    // session view and as one to the day recap, which keys by exercise id,
    // and the second would quietly vanish from the record.
    for (const add of skeleton.exercises) {
      const found = existing.exercises.find((e) => e.exerciseId === add.exerciseId)
      if (found) found.sets.push(...add.sets)
      else existing.exercises.push(add)
    }

    if (!opts.reopen) return
    delete existing.endedAt
    existing.status = 'partial'
    // Everything the day already recorded about itself outranks the new
    // run's blanks: the first readiness answers, the first make-up link,
    // the clock it started on.
    existing.startedAt = existing.startedAt ?? skeleton.startedAt
    existing.readiness = existing.readiness ?? skeleton.readiness
    existing.makeupFor = existing.makeupFor ?? skeleton.makeupFor
    existing.intensity = existing.intensity ?? skeleton.intensity
  })
}

export function startSession(
  date: ISODate,
  readinessFlags?: [boolean, boolean, boolean, boolean],
  intensity: SessionIntensity = 'full',
  makeupFor?: ISODate,
): void {
  const data = store().data
  // A make-up runs the MISSED day's workout, logged under today
  const resolved = resolveDay(makeupFor ?? date, data)
  const downgraded = (readinessFlags?.filter(Boolean).length ?? 0) >= 2 || intensity === 'lighter'
  // resolveDay ALREADY applied the downgrade if the day was marked trimmed,
  // so doing it again here cuts a second set off every lift and floors the
  // whole day at 2. resolveDay guards against stacking its own two paths
  // ("one cut, never stacked"); this is the third way in and needs the same
  // guard. Harmless while the transform only set a flag, visible the moment
  // it started removing sets.
  const alreadyTrimmed = data.dayLoad[makeupFor ?? date] === 'trimmed'
  let exercises =
    downgraded && !alreadyTrimmed ? applyReadinessDowngrade(resolved.exercises) : resolved.exercises
  if (intensity === 'minimum') {
    // The bare-minimum counter-offer, chosen up front instead of mid-excuse:
    // the template's authored recipe, or the first two movements at ≤2 sets.
    const template = resolved.templateId ? planTemplate(data.plan, resolved.templateId) : null
    exercises = template
      ? minimumViableFor(template, resolved.exercises).exercises
      : resolved.exercises.slice(0, 2).map((r) => ({ ...r, sets: Math.min(r.sets, 2) }))
  }

  const skeleton: SessionLog = {
    date,
    templateId: resolved.templateId ?? 'cardio',
    status: 'partial',
    startedAt: new Date().toISOString(),
    readiness: readinessFlags ? { flags: readinessFlags, downgraded } : undefined,
    intensity: intensity === 'full' ? undefined : intensity,
    makeupFor,
    exercises: exercises.map((r) => ({
      exerciseId: r.exerciseId,
      fromSlot: r.fromSlot,
      sets: setsFor(date, r),
    })),
  }
  putOnDay(date, skeleton, { reopen: true })
}

// ---------- Off-plan sessions ----------

/** One row of an off-plan workout: the shelf's items and the builder's both land here. */
export interface CustomWorkoutItem {
  exerciseId: string
  sets: number
  repText: string
  repsNum?: number
  /** Athlete-chosen load; absent means prefill from history like any session. */
  weightLb?: number
}

/**
 * Log a workout the plan never scheduled: one picked off the general
 * shelf, or built by hand from the exercise list.
 *
 * It ADDS to the day rather than replacing it. The first version of
 * this assigned straight over `d.sessions[date]`, which meant an
 * athlete who trained their planned session and then logged anything
 * extra lost the whole first session: every ticked set, the readiness
 * answers, the make-up link, the fatigue notes. A day is a record of
 * everything done in it, not of the last thing started.
 *
 * It becomes an ordinary SessionLog under templateId 'custom', so the
 * whole record pipeline (grades, PRs, tonnage, the debrief, prefill for
 * next time) reads it with no special cases. Rep ranges collapse through
 * the same rep engine the plan uses, which means a movement someone
 * keeps doing off-plan still climbs and still earns weight on the wrap.
 *
 * `markDone` is the after-the-fact path ("already did this"): every set
 * is created ticked. Callers reach it through logExtraWork below, which
 * owns the question of whether the day is now over. The reps recorded
 * are the ask; if the athlete did less, the set gates are right there.
 */
export function startCustomSession(
  date: ISODate,
  title: string,
  items: CustomWorkoutItem[],
  opts: { markDone?: boolean } = {},
): void {
  if (items.length === 0) return
  const data = store().data
  const skeleton: SessionLog = {
    date,
    templateId: 'custom',
    customTitle: title,
    status: 'partial',
    startedAt: new Date().toISOString(),
    exercises: items.map((item) => {
      const def = getExercise(item.exerciseId)
      const range = parseRepRange(item.repText) ?? undefined
      // One rep number, never a range: same collapse the resolver does,
      // reading this movement's own history so double progression keeps
      // working outside the schedule too.
      const repText = range ? repLabel(item.repText, data, item.exerciseId, date) : item.repText
      const sets = setsFor(date, {
        exerciseId: item.exerciseId,
        kind: def.kind,
        sets: item.sets,
        repText,
        repsNum: item.repsNum,
        repRange: range,
        weightLb: item.weightLb,
      })
      if (opts.markDone) {
        for (const s of sets) {
          s.done = true
          // The after-the-fact claim is "I did what it says". A set with
          // no history has no prefilled rep count, so the ask stands in,
          // except on timed work where the number is seconds, not reps.
          if (s.reps === undefined && !/sec|min|hold/.test(repText)) {
            const n = Number((repText.match(/^\d+/) ?? [])[0])
            if (n) s.reps = n
          }
        }
      }
      return { exerciseId: item.exerciseId, sets }
    }),
  }
  // Whether the day is OVER is deliberately left alone. A day mid-session
  // stays mid-session, a finished day stays finished: recording work that
  // happened is not a statement about the rest of the day, and
  // logExtraWork below is what refreshes the debrief.
  putOnDay(date, skeleton, { reopen: false })
}

/**
 * Log work that happened, without ending the day and without spending the
 * day's session on it.
 *
 * "Already did it" used to call finishSession, which stamps endedAt and a
 * final grade on the WHOLE day. On a scheduled day nobody had started yet
 * it was worse than a wrong label: the add-on BECAME that day's session,
 * so the plan's workout was no longer reachable (Today offers Start only
 * while the day has no session at all) and the day read as complete. The
 * report, twice: "i did an extra workout and logged it and todays session
 * is now closed off and logged as done."
 *
 * Two rules, and the rest follows from them.
 *
 * Recording work that happened is not a statement about the rest of the
 * day. A running day stays running, a finished day stays finished.
 *
 * The plan's workout is never what gets spent. On a day with scheduled
 * work and nothing logged against it yet, that workout is seeded first and
 * the extra work is added INSIDE it: the session is live, this work is in
 * it and ticked, and every scheduled movement is still sitting there
 * waiting to be done.
 *
 * The day ends here in exactly one case, when this work IS the day: an off
 * day with nothing scheduled and nothing logged, or a day already written
 * off as skipped. Something has to be the session then, and finishing it
 * is what earns the debrief. A debrief comes back only from a day that is
 * over, because grading a day mid-flight counts sets nobody has reached.
 */
export function logExtraWork(
  date: ISODate,
  title: string,
  items: CustomWorkoutItem[],
): DebriefData | null {
  if (items.length === 0) return null
  const before = store().data.sessions[date]

  // Nothing logged yet on a day the plan HAS a workout for.
  if (!before && resolveDay(date, store().data).exercises.length > 0) {
    startSession(date)
    startCustomSession(date, title, items, { markDone: true })
    return null
  }

  startCustomSession(date, title, items, { markDone: true })

  // Nothing scheduled and nothing logged, or a day written off as
  // skipped: the skip was the plan for the day, not the record of it.
  if (!before || before.status === 'skipped') return finishSession(date)

  const session = store().data.sessions[date]
  if (!session) return null
  const over =
    !!session.endedAt || session.status === 'completed' || session.status === 'downgraded-completed'
  // Still running, so the session view is the receipt for this work and
  // the athlete decides when the day is over.
  if (!over) return null

  // Added to a day that was already over. Its ending is left exactly where
  // it was and only the debrief is replaced, so the Record describes
  // everything done rather than the smaller day it was composed from.
  const composed = composeDebrief(store().data, session, session.date)
  store().update((d) => {
    for (const id of composed.shownIds) d.coach.shownMessageIds = pushShown(d.coach.shownMessageIds, id)
    d.coach.feed = d.coach.feed.filter((f) => !(f.kind === 'debrief' && f.debrief?.date === date))
    d.coach.feed.unshift({
      id: uid(),
      at: new Date().toISOString(),
      kind: 'debrief',
      text: `Debrief · ${composed.debrief.title}`,
      debrief: composed.debrief,
    })
  })
  return composed.debrief
}
