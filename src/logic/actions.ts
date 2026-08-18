import type {
  CoachSituation,
  DebriefData,
  ExcuseReason,
  ISODate,
  Measurement,
  PhotoMeta,
  Tier,
} from '../types'
import { flushPersist, uid, useAppStore } from '../store/appStore'
import { downscalePhoto, PhotoStore } from '../store/storage'
import { planTemplate, resolveDay } from '../engine/resolveDay'
import { swapCandidatesFor } from '../plan/subs'
import { minimumViableFor } from '../engine/transforms'
import {
  busyButMealsLogged,
  pruneTierDropExcuses,
  pruneTierDropFeed,
  trainedInDroppedTier,
  coachMessageFor,
  contradictionsOnSessionFinish,
  escalationLevel,
  excuseAccepted,
  fallbackWeekCount,
  pushShown,
} from '../engine/coach'
import { composeDebrief } from '../engine/debrief'
import { stampReachedStages } from './journeyActions'
import { finalStatus } from '../engine/quit'
import { currentStreak, detectPRs, proteinFor } from '../engine/stats'
import { addDaysISO, daysBetween, mondayOf, todayISO, weekdayOf } from '../engine/calendar'

// ============================================================
// Store-facing actions. Screens call these; each composes the
// engine's pure outputs into state changes + coach feed items.
// ============================================================

const store = () => useAppStore.getState()

export function pushCoachMessage(
  situation: CoachSituation,
  vars: Record<string, string | number> = {},
  poolOverride?: string,
  excuseId?: string,
  weekISO?: string,
): string {
  const data = store().data
  const msg = coachMessageFor(data, situation, todayISO(), vars, poolOverride)
  store().update((d) => {
    d.coach.feed.unshift({
      id: uid(),
      at: new Date().toISOString(),
      kind: 'coach',
      situation,
      text: msg.text,
      excuseId,
      weekISO,
    })
    d.coach.shownMessageIds = pushShown(d.coach.shownMessageIds, msg.shownId)
  })
  return msg.text
}

/**
 * A coach line WITHOUT a Record entry, for on-demand pep talks. The
 * Record recounts what happened; asking for a push isn't an event.
 * Anti-repeat bookkeeping still applies so lines don't recycle.
 */
export function coachLineFor(situation: CoachSituation, vars: Record<string, string | number> = {}): string {
  const data = store().data
  const msg = coachMessageFor(data, situation, todayISO(), vars)
  store().update((d) => {
    d.coach.shownMessageIds = pushShown(d.coach.shownMessageIds, msg.shownId)
  })
  return msg.text
}

// ---------- Exercise swaps (🔄 on a Today row) ----------

/**
 * Cycle an exercise through its slot-intent-preserving substitutes for
 * one date: original → sub 1 → sub 2 → … → back to the original.
 * `originalId` is the exercise as the plan wrote it (swappedFrom when a
 * swap is already active). Returns the id now occupying the row.
 */
export function swapExercise(date: ISODate, originalId: string): string {
  const data = store().data
  const day = resolveDay(date, data)
  const othersInDay = day.exercises
    .map((e) => e.swappedFrom ?? e.exerciseId)
    .filter((id) => id !== originalId)
    .flatMap((id) => [id, data.swaps[date]?.[id] ?? id])
  const candidates = swapCandidatesFor(originalId, data.plan, othersInDay)
  if (candidates.length === 0) return originalId

  const cycle = [originalId, ...candidates]
  const current = data.swaps[date]?.[originalId] ?? originalId
  const next = cycle[(cycle.indexOf(current) + 1) % cycle.length]

  store().update((d) => {
    if (next === originalId) {
      if (d.swaps[date]) {
        delete d.swaps[date][originalId]
        if (Object.keys(d.swaps[date]).length === 0) delete d.swaps[date]
      }
    } else {
      ;(d.swaps[date] ??= {})[originalId] = next
    }
  })
  return next
}

// ---------- Same-day load trim ("work ran long") ----------

const TRIM_REASON_LABEL: Record<ExcuseReason, string> = {
  busy: 'work ran long',
  tired: 'running on empty',
  sick: 'body says easy',
  gig: 'gig / shift day',
  travel: 'on the road',
  sore: 'muscles need a break',
  other: 'life happened', none: 'life happened',
}

/**
 * Cut TODAY's load without dropping the week's tier: readiness-style
 * trim (explosive −1/3, lifts light) for one date. Not an excuse, the
 * session still happens, but it goes in the coach feed so patterns
 * are visible.
 */
export function trimToday(date: ISODate, reason: ExcuseReason, claimText?: string): void {
  store().update((d) => {
    d.dayLoad[date] = 'trimmed'
    d.coach.feed.unshift({
      id: uid(),
      at: new Date().toISOString(),
      kind: 'insight',
      text: `📉 Trimmed ${date.slice(5)}: ${TRIM_REASON_LABEL[reason]}${claimText?.trim() ? ` (“${claimText.trim()}”)` : ''}. Still training. That's the difference.`,
    })
  })
}

/** Meeting got cancelled after all, put the full session back. */
export function restoreToday(date: ISODate): void {
  store().update((d) => {
    delete d.dayLoad[date]
  })
}

// ---------- Session lifecycle ----------

export function patchSet(
  date: ISODate,
  exIdx: number,
  setIdx: number,
  patch: Partial<{ weightLb: number; reps: number; seconds: number; done: boolean }>,
): void {
  store().update((d) => {
    const set = d.sessions[date]?.exercises[exIdx]?.sets[setIdx]
    if (set) Object.assign(set, patch)
  })
}

/**
 * Set the weight for THIS set and every later set of the same exercise
 * that is not already logged.
 *
 * Each set used to be prefilled independently from past sessions, so
 * moving set 1 from 25 to 30 left sets 2, 3 and 4 sitting at 25 and you
 * had to redo it at every gate. Nobody changes the load mid-exercise
 * and then wants the old number back on the next set; if they do, the
 * next gate is right there. Sets already done are never touched, so the
 * record of what was actually lifted stays true.
 */
export function setWeightForward(
  date: ISODate,
  exIdx: number,
  setIdx: number,
  weightLb: number,
): void {
  store().update((d) => {
    const sets = d.sessions[date]?.exercises[exIdx]?.sets
    if (!sets) return
    for (let i = setIdx; i < sets.length; i++) {
      if (i === setIdx || !sets[i].done) sets[i].weightLb = weightLb
    }
  })
}

/**
 * Walk away before the work starts: wipes the in-progress session so
 * the day is startable again later. Only offered while nothing past
 * the first exercise is logged.
 */
export function abandonSession(date: ISODate): void {
  store().update((d) => {
    delete d.sessions[date]
  })
}

/**
 * Un-finish an early-ended session: the endedAt stamp and its debrief
 * come off, and the session resumes in-progress. The self-serve fix
 * for a mis-tapped finish.
 */
export function reopenSession(date: ISODate): void {
  store().update((d) => {
    const s = d.sessions[date]
    if (!s || !s.endedAt) return
    delete s.endedAt
    s.status = 'partial'
    d.coach.feed = d.coach.feed.filter((f) => !(f.kind === 'debrief' && f.debrief?.date === date))
  })
}

/**
 * Fresh clock on a stalled session: same day, same exercises, same
 * prefilled weights, startedAt reset to now, every set unticked.
 * Offered only while the athlete never got past the first exercise.
 */
export function restartSession(date: ISODate): void {
  store().update((d) => {
    const s = d.sessions[date]
    if (!s) return
    s.startedAt = new Date().toISOString()
    delete s.endedAt
    for (const ex of s.exercises) for (const set of ex.sets) set.done = false
  })
}

export function trimFromExercise(date: ISODate, exIdx: number): void {
  store().update((d) => {
    const s = d.sessions[date]
    if (s) s.trimmedFromIndex = s.trimmedFromIndex === exIdx ? undefined : exIdx
  })
}

/** Finish the session: set status, compose debrief, emit coach events. */
export function finishSession(date: ISODate): DebriefData {
  // 1. Final status
  store().update((d) => {
    const s = d.sessions[date]
    if (!s) return
    s.endedAt = new Date().toISOString()
    s.status = finalStatus(s)
  })

  const data = store().data
  const session = data.sessions[date]!
  const prs = detectPRs(data, session)
  const composed = composeDebrief(data, session, session.date)

  // 2. Persist debrief + anti-repeat state + insight cooldowns
  store().update((d) => {
    for (const id of composed.shownIds) d.coach.shownMessageIds = pushShown(d.coach.shownMessageIds, id)
    for (const ruleId of composed.surfacedInsightIds) d.coach.surfacedInsights[ruleId] = todayISO()
    d.coach.feed.unshift({
      id: uid(),
      at: new Date().toISOString(),
      kind: 'debrief',
      text: `Debrief · ${composed.debrief.title}`,
      debrief: composed.debrief,
    })
  })

  // 3. Coach reactions
  //
  // The stage stamp goes first, so a session that carried somebody past
  // a stage has it recorded before anything reads the journey. A top set
  // at 225 is a stage crossed the moment it is logged, and the deload
  // that follows must not be able to take it back.
  stampReachedStages(todayISO())
  for (const pr of prs) pushCoachMessage('pr', { exercise: pr.name })
  const streak = currentStreak(store().data, todayISO())
  if ([3, 7, 14, 30, 50, 100].includes(streak)) pushCoachMessage('streak', { streak })

  for (const c of contradictionsOnSessionFinish(store().data, session, prs.length > 0)) {
    pushCoachMessage('contradiction', c.vars, c.poolId)
  }

  // 4. Week-complete check (all scheduled days of this week logged, none skipped)
  const monday = mondayOf(date)
  const d2 = store().data
  let scheduled = 0
  let done = 0
  for (let i = 0; i < 7; i++) {
    const day = addDaysISO(monday, i)
    const r = resolveDay(day, d2)
    if (r.kind === 'rest') continue
    scheduled++
    const log = d2.sessions[day]
    if (log && log.status !== 'skipped') done++
  }
  const alreadyCelebrated = d2.coach.feed.some(
    (f) => f.situation === 'week-complete' && mondayOf(f.at.slice(0, 10)) === monday,
  )
  if (scheduled > 0 && done === scheduled && !alreadyCelebrated) {
    pushCoachMessage('week-complete', { weekIndex: resolveDay(date, d2).weekIndex })
  }

  flushPersist()
  return composed.debrief
}

// ---------- Skip / lighten / excuse flows ----------

export async function savePhotoFile(file: Blob, kind: PhotoMeta['kind']): Promise<PhotoMeta> {
  const { blob, w, h } = await downscalePhoto(file)
  const meta: PhotoMeta = {
    id: uid(),
    kind,
    takenAt: new Date().toISOString(),
    w,
    h,
    bytes: blob.size,
  }
  await PhotoStore.put(meta.id, blob)
  store().update((d) => {
    d.photos.push(meta)
  })
  return meta
}

export interface SkipOutcome {
  message: string
  minViableLabel?: string
}

/**
 * The SkipFlow resolution. `mode` skip = day zeroed; lighten = the
 * minimum-viable session is created instead.
 */
export function resolveSkipFlow(opts: {
  date: ISODate
  mode: 'skip' | 'lighten'
  reason: ExcuseReason
  claimText?: string
  proofPhotoId?: string
  takeMinimum: boolean
}): SkipOutcome {
  const { date, mode, reason, claimText, proofPhotoId } = opts
  const data = store().data
  const resolved = resolveDay(date, data)
  const level = escalationLevel(data.excuses, todayISO())
  const accepted = excuseAccepted({
    reason,
    proofPhotoId,
    week: data.weeks[mondayOf(date)],
    prevWeek: data.weeks[mondayOf(addDaysISO(date, -1))],
    date,
    scope: 'day',
  })

  const excuseId = uid()
  store().update((d) => {
    d.excuses.push({
      id: excuseId,
      at: new Date().toISOString(),
      date,
      scope: 'day',
      action: opts.takeMinimum || mode === 'lighten' ? 'lighten' : 'skip',
      reason,
      claimText,
      proofPhotoId,
      accepted,
      minimumViableTaken: opts.takeMinimum,
      escalationLevelAtTime: level,
    })
  })

  let minViableLabel: string | undefined
  if (opts.takeMinimum || mode === 'lighten') {
    // Build the minimum-viable session as today's session
    const template = resolved.templateId ? planTemplate(store().data.plan, resolved.templateId) : null
    if (template) {
      const mv = minimumViableFor(template, resolved.exercises)
      minViableLabel = mv.label
      store().update((d) => {
        d.sessions[date] = {
          date,
          templateId: resolved.templateId!,
          status: 'partial',
          startedAt: new Date().toISOString(),
          exercises: mv.exercises.map((r) => ({
            exerciseId: r.exerciseId,
            sets: Array.from({ length: r.sets }, () => ({
              targetReps: r.repText,
              reps: r.repsNum,
              done: false,
            })),
          })),
          notes: `Minimum viable (${mv.label})`,
        }
      })
    }
  } else {
    store().update((d) => {
      d.sessions[date] = {
        date,
        templateId: resolved.templateId ?? 'rest',
        status: 'skipped',
        exercises: [],
      }
    })
  }

  // Coach reaction
  let message: string
  if (opts.takeMinimum) {
    message = pushCoachMessage('minimum-taken', {}, undefined, excuseId)
  } else if (accepted) {
    message = pushCoachMessage('skip-with-proof', {}, undefined, excuseId)
  } else if (mode === 'lighten') {
    message = pushCoachMessage('lighten', {}, undefined, excuseId)
  } else {
    message = pushCoachMessage('skip-no-proof', {}, undefined, excuseId)
    // busy claim while the meal log shows a full day → receipts
    if (reason === 'busy' && busyButMealsLogged(store().data, date)) {
      pushCoachMessage('contradiction', {}, 'contradiction-busy-meals')
    }
  }
  flushPersist()
  return { message, minViableLabel }
}

// ---------- Tier changes ----------

export function changeTier(date: ISODate, to: Tier, excuseInfo?: { reason: ExcuseReason; claimText: string }): void {
  const monday = mondayOf(date)
  const data = store().data
  const week = data.weeks[monday]
  const from = week?.tier ?? 1
  if (from === to) return

  const anySessionThisWeek = Object.values(data.sessions).some(
    (s) => mondayOf(s.date) === monday && s.status !== 'skipped',
  )
  const isPlannedPick = !anySessionThisWeek && (weekdayOf(date) === 1 || !week?.tierPickedAt)
  const isDrop = to > from

  // Every drop records the user's written reason. The reason IS the
  // requirement (no proof for tier drops), so the record is `accepted`
  // and never feeds the unproven-escalation counter.
  let excuseId: string | undefined
  if (isDrop) {
    excuseId = uid()
    store().update((d) => {
      d.excuses.push({
        id: excuseId!,
        at: new Date().toISOString(),
        date,
        scope: 'week',
        action: 'tier-drop',
        reason: excuseInfo?.reason ?? 'none',
        claimText: excuseInfo?.claimText,
        accepted: true,
        minimumViableTaken: false,
        escalationLevelAtTime: escalationLevel(d.excuses, todayISO()),
      })
    })
  }

  store().updateWeek(date, (w) => {
    w.tier = to
    w.tierPickedAt = w.tierPickedAt ?? new Date().toISOString()
    w.tierChanges.push({ at: new Date().toISOString(), from, to, excuseId })
  })

  if (isDrop) {
    // one live drop message per week, a re-drop replaces, never stacks
    store().update((d) => pruneTierDropFeed(d, monday))
    if (isPlannedPick) {
      pushCoachMessage('tier-drop-planned', { tier: to }, undefined, excuseId, monday)
    } else {
      pushCoachMessage('tier-drop-midweek', { tier: to }, undefined, excuseId, monday)
    }
    const fallbacks = fallbackWeekCount(store().data, todayISO())
    const nagged = store().data.coach.feed.some(
      (f) => f.situation === 'chronic-fallback' && daysBetween(f.at.slice(0, 10), todayISO()) < 7,
    )
    if (fallbacks >= 4 && !nagged) pushCoachMessage('chronic-fallback', { count: fallbacks })
  } else {
    // Revert upward: an untrained drop leaves no record, the messages and
    // excuses disappear. Train even once in the dropped tier and it's permanent.
    store().update((d) => {
      if (!trainedInDroppedTier(d, monday)) {
        pruneTierDropFeed(d, monday)
        pruneTierDropExcuses(d, monday)
      }
    })
  }
}

// ---------- Same-day ball / cardio ----------

// Writing sport to the log moved to logic/cardioActions.ts, and the
// allowance follows the file down. Re-exported so the screens that
// already import from here keep working.
export { logCardio, playedFrom, removeCardio, saveRun, setCardioFeltIntensity, setRunFeltIntensity } from './cardioActions'

export function toggleBallToday(date: ISODate): void {
  store().updateWeek(date, (w) => {
    w.ballDates = w.ballDates.includes(date)
      ? w.ballDates.filter((d) => d !== date)
      : [...w.ballDates, date]
  })
}

/** Swap a CNS day's speed work out (plan-sanctioned after a hard run). */
export function toggleCnsSwap(date: ISODate): void {
  store().updateWeek(date, (w) => {
    w.cnsSwapDates = w.cnsSwapDates.includes(date)
      ? w.cnsSwapDates.filter((d) => d !== date)
      : [...w.cnsSwapDates, date]
  })
}

/** Pick the required cardio option for a day (from the Today chooser). */
export function chooseCardio(date: ISODate, exerciseId: string): void {
  store().updateWeek(date, (w) => {
    w.cardio = { exerciseId, weekdays: [weekdayOf(date)] }
  })
}

// ---------- Reconcile resolutions ----------

export function resolveMissAsTrained(date: ISODate, templateId: string | null, ownWorkout = false): void {
  store().update((d) => {
    d.sessions[date] = {
      date,
      templateId: templateId ?? 'unknown',
      status: 'completed',
      exercises: [],
      notes: ownWorkout ? 'Own workout, logged after the fact' : 'Logged after the fact, no set data',
    }
  })
  pushCoachMessage('comeback')
}

export function resolveMissWithReason(date: ISODate, reason: ExcuseReason, proofPhotoId?: string): void {
  const accepted = excuseAccepted({
    reason,
    proofPhotoId,
    week: store().data.weeks[mondayOf(date)],
    prevWeek: store().data.weeks[mondayOf(addDaysISO(date, -1))],
    date,
    scope: 'day',
  })
  const excuseId = uid()
  store().update((d) => {
    d.excuses.push({
      id: excuseId,
      at: new Date().toISOString(),
      date,
      scope: 'day',
      action: 'skip',
      reason,
      proofPhotoId,
      accepted,
      minimumViableTaken: false,
      escalationLevelAtTime: escalationLevel(d.excuses, todayISO()),
    })
    d.sessions[date] = { date, templateId: 'reconciled', status: 'skipped', exercises: [] }
  })
}

export function writeOffWeek(monday: ISODate, reason: ExcuseReason, proofPhotoId?: string): void {
  const accepted = excuseAccepted({
    reason,
    proofPhotoId,
    week: store().data.weeks[monday],
    date: monday,
    scope: 'week',
  })
  store().update((d) => {
    d.excuses.push({
      id: uid(),
      at: new Date().toISOString(),
      date: monday,
      scope: 'week',
      action: 'skip',
      reason,
      proofPhotoId,
      accepted,
      minimumViableTaken: false,
      escalationLevelAtTime: escalationLevel(d.excuses, todayISO()),
    })
  })
}

// ---------- Meals ----------
// Food logging lives in ./mealActions. Re-exported here so the
// screens keep one import for every action they call.
export {
  addMealEntry,
  cycleDayTypeOverride,
  loggableTemplates,
  nutritionTargets,
  removeMealEntry,
  setMealServings,
  toggleSupplement,
} from './mealActions'

// ---------- Measurements ----------

export function saveMeasurement(m: Measurement): void {
  store().update((d) => {
    d.measurements = [...d.measurements.filter((x) => x.date !== m.date), m].sort((a, b) =>
      a.date < b.date ? -1 : 1,
    )
  })
  // A check-in is the only way a body stage ever gets crossed, so this is
  // where one gets stamped. After the write, not inside it: the stamp is
  // decided by reading the state the measurement just created.
  stampReachedStages(todayISO())
}

// ---------- Daily sweep (on app open) ----------

export function dailyCoachSweep(): void {
  const data = store().data
  if (!data.settings.onboarded) return
  const today = todayISO()
  const feedToday = (situation: CoachSituation) =>
    data.coach.feed.some((f) => f.situation === situation && f.at.slice(0, 10) === today)

  // Protein miss yesterday (only when meals were actually logged)
  const yesterday = addDaysISO(today, -1)
  const yProtein = proteinFor(data, yesterday)
  const yLogged = (data.meals[yesterday]?.entries.length ?? 0) > 0
  if (yLogged && yProtein < data.settings.proteinTargetG && !feedToday('protein-miss')) {
    pushCoachMessage('protein-miss', { protein: yProtein })
  }

  // Protein streak milestones
  const pStreak = (() => {
    let streak = 0
    let d = yesterday
    while (proteinFor(data, d) >= data.settings.proteinTargetG) {
      streak++
      d = addDaysISO(d, -1)
      if (streak > 365) break
    }
    return streak
  })()
  if ([5, 10, 21, 50].includes(pStreak) && !feedToday('protein-streak')) {
    pushCoachMessage('protein-streak', { streak: pStreak })
  }

  // Deload-start (Monday of a deload week)
  const resolved = resolveDay(today, data)
  if (resolved.isDeload && weekdayOf(today) === 1 && !feedToday('deload-start')) {
    pushCoachMessage('deload-start')
  }

  // Backup nudge
  const last = data.settings.lastExportAt
  const daysSince = last ? daysBetween(last.slice(0, 10), today) : daysBetween(data.settings.phaseStartDate, today)
  if (daysSince >= 7 && !feedToday('backup-nudge')) {
    pushCoachMessage('backup-nudge', { count: daysSince })
  }
}
