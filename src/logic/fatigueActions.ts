import type { AdaptChoice, FatigueReason, ISODate } from '../types'
import { regionsFor, sameGroupAhead } from '../engine/fatigue'
import { isAutomatic, respondToSet, type FatigueResponse } from '../engine/sessionFatigue'
import { setWeightForward } from './actions'
import { setAchievedReps, setExerciseRir } from './prescription'
import { useAppStore } from '../store/appStore'

// ============================================================
// Acting on "I can't finish this".
//
// Its own file rather than more weight on logic/actions.ts, the
// same arrangement as mealActions and volumeActions. Everything
// here is called from a TAP: the sheet offers, the athlete
// chooses, and nothing in this file runs on its own.
//
// The note is written first and separately from whatever is done
// about it, because the two are different records. What happened
// is worth keeping even when the answer is "nothing, carry on".
// ============================================================

const store = () => useAppStore.getState()

/** Record why a set died. Kept whether or not anything is done about it. */
export function logFatigue(
  date: ISODate,
  exerciseId: string,
  reason: FatigueReason,
  atSetIdx: number,
  note?: string,
): void {
  const entry = {
    exerciseId,
    reason,
    atSetIdx,
    regions: regionsFor(exerciseId),
    ...(note?.trim() ? { note: note.trim() } : {}),
  }
  store().update((d) => {
    const s = d.sessions[date]
    if (!s) return
    ;(s.fatigue ??= []).push(entry)
  })
}

/**
 * This exercise is over. The sets already logged stay exactly as
 * they were, because the record of what was lifted has to stay
 * true; focusQueue skips a skipped exercise, so the session moves
 * on to the next movement rather than ending.
 */
export function endExercise(date: ISODate, exIdx: number): void {
  store().update((d) => {
    const ex = d.sessions[date]?.exercises[exIdx]
    if (ex) ex.skipped = true
  })
}

/**
 * Stop the rest of today's work on the same muscle.
 *
 * This exists instead of a swap. Swapping was the obvious offer and
 * it does not survive contact with the catalog: swap candidates
 * preserve the slot's training intent, so every alternative to a
 * squat is another quad movement. An offer to "find something that
 * misses it" would have returned nothing almost every time.
 *
 * What is actually true when a knee hurts on set two is that the
 * three quad movements later in the day are going to hurt too. So
 * that is the offer. Returns how many were stood down.
 */
export function endGroupAhead(date: ISODate, exIdx: number): number {
  const session = store().data.sessions[date]
  if (!session) return 0
  const ahead = sameGroupAhead(session, exIdx)
  if (ahead.length === 0) return 0
  const idxs = new Set(ahead.map((a) => a.exIdx))
  store().update((d) => {
    const s = d.sessions[date]
    if (!s) return
    for (const i of idxs) {
      const ex = s.exercises[i]
      if (ex) ex.skipped = true
    }
  })
  return idxs.size
}

// ---------- Accepting an adaptation ----------

/**
 * Take an offer the coach made off the last fortnight's evidence.
 *
 * Stored per date and only when ACCEPTED. A proposal nobody took leaves
 * no trace at all, which is what stops a declined suggestion quietly
 * shaping next week: engine/adapt.ts re-derives its offers from the
 * signals every time, so a decline is simply the absence of a yes.
 */
export function acceptAdaptation(date: ISODate, choice: AdaptChoice): void {
  store().update((d) => {
    const taken = d.adapt[date] ?? []
    if (!taken.includes(choice)) d.adapt[date] = [...taken, choice]
  })
}

export function undoAdaptation(date: ISODate, choice: AdaptChoice): void {
  store().update((d) => {
    const taken = (d.adapt[date] ?? []).filter((c) => c !== choice)
    if (taken.length) d.adapt[date] = taken
    else delete d.adapt[date]
  })
}

/**
 * The one thing in this file that is not a tap.
 *
 * Called as each set is finished. If the set says the weight is wrong,
 * the sets still ahead of it come down on their own and the caller gets
 * the sentence explaining it. Everything else is still an offer.
 *
 * The exception is argued in engine/sessionFatigue.ts and it is narrow:
 * the load, and only the load, and only forward. Work is never removed
 * without being asked.
 */
export function applySetFeedback(
  date: ISODate,
  exIdx: number,
  setIdx: number,
): (FatigueResponse & { from?: number }) | null {
  const log = store().data.sessions[date]?.exercises[exIdx]
  if (!log) return null
  const res = respondToSet(log, setIdx)
  if (!res) return null
  if (!isAutomatic(res.kind) || res.weightLb === undefined) return res
  const from = log.sets[setIdx].weightLb
  setWeightForward(date, exIdx, setIdx + 1, res.weightLb)
  // Marked, for the same reason a deload day is marked: this weight was
  // the rule's choice and not the athlete's, so it must not become next
  // week's working weight.
  //
  // Without this the drop ratchets. Each shortfall writes a lighter
  // number into the log, prefillFor reads the log to find the baseline,
  // and the baseline is now the lighter number. Twenty simulated weeks
  // took an overhead press from 90 lb to 5 and an incline press to
  // nothing at all, one honest bad set at a time. That is the exact
  // spiral this file's neighbours already guard against, arriving
  // through a door nobody had shut.
  store().update((d) => {
    const sets = d.sessions[date]?.exercises[exIdx]?.sets
    if (!sets) return
    for (let i = setIdx + 1; i < sets.length; i++) sets[i].light = true
  })
  return { ...res, from }
}

/** Put an automatic load drop back where it was. One tap, no argument. */
export function undoSetFeedback(date: ISODate, exIdx: number, setIdx: number, weightLb: number): void {
  setWeightForward(date, exIdx, setIdx + 1, weightLb)
}

/**
 * "I got five of the eight", and everything that follows from it.
 *
 * One call so the screen does not have to know that recording a
 * shortfall and acting on it are two different things.
 */
export function recordShortfall(date: ISODate, exIdx: number, setIdx: number, achieved: number): string | null {
  setAchievedReps(date, exIdx, setIdx, achieved)
  return applySetFeedback(date, exIdx, setIdx)?.because ?? null
}

/** Same, for the reps-in-reserve answer. */
export function recordRir(date: ISODate, exIdx: number, setIdx: number, rir: number): string | null {
  setExerciseRir(date, exIdx, rir)
  return applySetFeedback(date, exIdx, setIdx)?.because ?? null
}
