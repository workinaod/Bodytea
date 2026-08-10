import type {
  CardioEntry,
  CoachSituation,
  DebriefData,
  ExcuseReason,
  ISODate,
  MealEntry,
  Measurement,
  PhotoMeta,
  SessionLog,
  Tier,
} from '../types'
import { DEFAULT_SUPPLEMENTS, defaultWeekState } from '../types'
import { isIntenseSport } from '../plan/cardio'
import { flushPersist, uid, useAppStore } from '../store/appStore'
import { downscalePhoto, PhotoStore } from '../store/storage'
import { planTemplate, resolveDay } from '../engine/resolveDay'
import { applyReadinessDowngrade, minimumViableFor } from '../engine/transforms'
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
import { currentStreak, detectPRs, proteinFor } from '../engine/stats'
import { addDaysISO, daysBetween, mondayOf, todayISO, weekdayOf } from '../engine/calendar'
import { nutritionDayType } from '../engine/resolveDay'

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

// ---------- Session lifecycle ----------

function prefillFor(date: ISODate, exerciseId: string): { weightLb?: number; reps?: number } {
  const sessions = Object.values(store().data.sessions)
    .filter((s) => s.date < date && s.status !== 'skipped')
    .sort((a, b) => (a.date > b.date ? -1 : 1))
  for (const s of sessions) {
    const log = s.exercises.find((e) => e.exerciseId === exerciseId)
    if (!log) continue
    const done = log.sets.filter((x) => x.done && x.weightLb !== undefined)
    if (done.length) {
      const best = done.reduce((a, b) => ((a.weightLb ?? 0) >= (b.weightLb ?? 0) ? a : b))
      return { weightLb: best.weightLb, reps: best.reps }
    }
  }
  return {}
}

export function startSession(date: ISODate, readinessFlags?: [boolean, boolean, boolean, boolean]): void {
  const data = store().data
  const resolved = resolveDay(date, data)
  const downgraded = (readinessFlags?.filter(Boolean).length ?? 0) >= 2
  const exercises = downgraded ? applyReadinessDowngrade(resolved.exercises) : resolved.exercises

  const skeleton: SessionLog = {
    date,
    templateId: resolved.templateId ?? 'cardio',
    status: 'partial',
    startedAt: new Date().toISOString(),
    readiness: readinessFlags ? { flags: readinessFlags, downgraded } : undefined,
    exercises: exercises.map((r) => {
      const pre = prefillFor(date, r.exerciseId)
      return {
        exerciseId: r.exerciseId,
        fromSlot: r.fromSlot,
        sets: Array.from({ length: r.sets }, () => ({
          targetReps: r.repText,
          weightLb: r.kind === 'lift' || r.kind === 'carry' ? pre.weightLb : undefined,
          reps: r.repsNum ?? pre.reps,
          done: false,
        })),
      }
    }),
  }
  store().update((d) => {
    d.sessions[date] = skeleton
  })
}

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

export function toggleExerciseSkipped(date: ISODate, exIdx: number): void {
  store().update((d) => {
    const ex = d.sessions[date]?.exercises[exIdx]
    if (ex) ex.skipped = !ex.skipped
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
    const considered = s.exercises.filter(
      (e, i) => !e.skipped && (s.trimmedFromIndex === undefined || i < s.trimmedFromIndex),
    )
    const allDone = considered.length > 0 && considered.every((e) => e.sets.every((x) => x.done))
    s.endedAt = new Date().toISOString()
    s.status = s.readiness?.downgraded
      ? allDone
        ? 'downgraded-completed'
        : 'partial'
      : allDone
        ? 'completed'
        : 'partial'
  })

  const data = store().data
  const session = data.sessions[date]!
  const prs = detectPRs(data, session)
  const composed = composeDebrief(data, session, todayISO())

  // 2. Persist debrief + anti-repeat state + insight cooldowns
  store().update((d) => {
    for (const id of composed.shownIds) d.coach.shownMessageIds = pushShown(d.coach.shownMessageIds, id)
    for (const ruleId of composed.surfacedInsightIds) d.coach.surfacedInsights[ruleId] = todayISO()
    d.coach.feed.unshift({
      id: uid(),
      at: new Date().toISOString(),
      kind: 'debrief',
      text: `Debrief — ${composed.debrief.title}`,
      debrief: composed.debrief,
    })
  })

  // 3. Coach reactions
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
    // one live drop message per week — a re-drop replaces, never stacks
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
    // Revert upward: an untrained drop leaves no record — the messages and
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

export function toggleBallToday(date: ISODate): void {
  store().updateWeek(date, (w) => {
    w.ballDates = w.ballDates.includes(date)
      ? w.ballDates.filter((d) => d !== date)
      : [...w.ballDates, date]
  })
}

/**
 * Log a cardio/sport entry for a date. Intense sport (running games, a
 * match) also marks the week's "played" date — same engine semantics as
 * the original ball log: conditioning covered, next-day speed protected.
 */
export function logCardio(
  date: ISODate,
  entry: Omit<CardioEntry, 'id' | 'at'>,
): void {
  const markPlayed = isIntenseSport(entry.activityId, entry.mode)
  store().update((d) => {
    ;(d.cardio[date] ??= []).push({ ...entry, id: uid(), at: new Date().toISOString() })
    if (markPlayed) {
      const monday = mondayOf(date)
      const w = (d.weeks[monday] ??= defaultWeekState(monday))
      if (!w.ballDates.includes(date)) w.ballDates = [...w.ballDates, date]
    }
  })
}

/** Remove a logged entry; un-marks the played date when no intense sport remains. */
export function removeCardio(date: ISODate, entryId: string): void {
  store().update((d) => {
    d.cardio[date] = (d.cardio[date] ?? []).filter((e) => e.id !== entryId)
    if (d.cardio[date].length === 0) delete d.cardio[date]
    const stillPlayed = (d.cardio[date] ?? []).some((e) => isIntenseSport(e.activityId, e.mode))
    if (!stillPlayed) {
      const w = d.weeks[mondayOf(date)]
      if (w) w.ballDates = w.ballDates.filter((x) => x !== date)
    }
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
    w.cardio = { exerciseId, weekday: weekdayOf(date) }
  })
}

// ---------- Reconcile resolutions ----------

export function resolveMissAsTrained(date: ISODate, templateId: string | null): void {
  store().update((d) => {
    d.sessions[date] = {
      date,
      templateId: templateId ?? 'unknown',
      status: 'completed',
      exercises: [],
      notes: 'Logged retroactively (no set data)',
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

function ensureMealDay(date: ISODate): void {
  store().update((d) => {
    if (!d.meals[date]) {
      d.meals[date] = { date, entries: [], supplements: { ...DEFAULT_SUPPLEMENTS } }
    }
  })
}

export function addMealEntry(date: ISODate, entry: Omit<MealEntry, 'id' | 'at' | 'servings'> & { servings?: number }): void {
  ensureMealDay(date)
  store().update((d) => {
    d.meals[date].entries.push({
      ...entry,
      id: uid(),
      at: new Date().toISOString(),
      servings: entry.servings ?? 1,
    })
  })
}

export function setMealServings(date: ISODate, entryId: string, servings: number): void {
  store().update((d) => {
    const e = d.meals[date]?.entries.find((x) => x.id === entryId)
    if (e) e.servings = Math.max(0.5, servings)
  })
}

export function removeMealEntry(date: ISODate, entryId: string): void {
  store().update((d) => {
    const day = d.meals[date]
    if (day) day.entries = day.entries.filter((x) => x.id !== entryId)
  })
}

export function toggleSupplement(date: ISODate, id: keyof typeof DEFAULT_SUPPLEMENTS): void {
  ensureMealDay(date)
  store().update((d) => {
    d.meals[date].supplements[id] = !d.meals[date].supplements[id]
  })
}

export function cycleDayTypeOverride(date: ISODate): void {
  ensureMealDay(date)
  store().update((d) => {
    const day = d.meals[date]
    day.dayTypeOverride =
      day.dayTypeOverride === undefined ? 'training' : day.dayTypeOverride === 'training' ? 'rest' : undefined
  })
}

// ---------- Measurements ----------

export function saveMeasurement(m: Measurement): void {
  store().update((d) => {
    d.measurements = [...d.measurements.filter((x) => x.date !== m.date), m].sort((a, b) =>
      a.date < b.date ? -1 : 1,
    )
  })
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

export function nutritionTargets(date: ISODate) {
  const data = store().data
  const dayType = nutritionDayType(date, data)
  return { dayType }
}
