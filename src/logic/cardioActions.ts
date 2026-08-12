import type { AppData, CardioEntry, ISODate, RunLog } from '../types'
import { defaultWeekState } from '../types'
import { perceivedIntensity } from '../engine/calibration'
import { cardioActivity, isIntenseSport } from '../plan/cardio'
import { uid, useAppStore } from '../store/appStore'
import { mondayOf } from '../engine/calendar'
import { estKcal } from '../engine/runs'
import type { Intensity } from '../engine/intensity'

// ============================================================
// Writing sport to the log.
//
// Split out of logic/actions.ts, which had reached its line
// allowance, and it belongs together anyway: everything here
// turns a finished session into the two records the rest of the
// app reads, and decides one thing that matters more than it
// looks, which is whether the day counts as PLAYED.
//
// A played day is not decoration. It covers the week's
// conditioning requirement and it protects the next day's speed
// work, so marking one wrongly changes the plan.
// ============================================================

const store = () => useAppStore.getState()

/**
 * Does this session make the day a game day?
 *
 * isIntenseSport answers from the mode chip, and returns TRUE when no
 * mode was picked, which was right when every entry came off a form
 * that always asked. The live timer never asks, so from the day it
 * shipped a fifteen-minute shootaround marked the day played, covered
 * the week's conditioning and protected the next day's speed work.
 *
 * A measured tier is better evidence than an unanswered question, so
 * it decides where there is one: a low-intensity session is the
 * shootaround that the 'shooting' chip would have called not intense.
 * With no mode AND no tier there is nothing new to go on, and the old
 * answer stands rather than quietly dropping days people did play.
 */
export function playedFrom(
  entry: {
    activityId: string
    mode?: string
    intensity?: Intensity
    feltIntensity?: Intensity
  },
  /**
   * The tier the SCREENS will show for this session. Passed in rather
   * than read off the entry, because `entry.intensity` is frozen at the
   * population band on the day it was saved while every display
   * re-derives against the athlete's calibrated one. Left unresolved,
   * one Week row could read "played" and "easy" at the same time.
   */
  shown?: Intensity | null,
): boolean {
  if (!cardioActivity(entry.activityId).sport) return false
  if (entry.mode) return isIntenseSport(entry.activityId, entry.mode)
  const tier = entry.feltIntensity ?? shown ?? entry.intensity
  if (tier) return tier !== 'low'
  return isIntenseSport(entry.activityId, entry.mode)
}

function setPlayed(d: AppData, date: ISODate): void {
  const played = (d.cardio[date] ?? []).some((e) =>
    playedFrom(e, perceivedIntensity(d, e.activityId, e.steps, e.minutes ?? 0, e.feltIntensity)),
  )
  const monday = mondayOf(date)
  if (played) {
    const w = (d.weeks[monday] ??= defaultWeekState(monday))
    if (!w.ballDates.includes(date)) w.ballDates = [...w.ballDates, date]
  } else {
    const w = d.weeks[monday]
    if (w) w.ballDates = w.ballDates.filter((x) => x !== date)
  }
}

/**
 * Log a cardio/sport entry for a date. Intense sport (a running game,
 * a match) also marks the week's played date, the same engine
 * semantics as the original ball log.
 */
export function logCardio(date: ISODate, entry: Omit<CardioEntry, 'id' | 'at'>): string {
  const id = uid()
  store().update((d) => {
    ;(d.cardio[date] ??= []).push({ ...entry, id, at: new Date().toISOString() })
    setPlayed(d, date)
  })
  return id
}

/**
 * Remove a logged entry; un-marks the played date when nothing intense
 * remains.
 *
 * A GPS session is two records, and the cardio list only ever showed
 * one of them. Deleting it dropped the entry and left the RunLog
 * behind, so the session stayed in the Progress table, the weekly
 * mileage chart and every total, while the list it was deleted from
 * showed it gone. The tap has to remove the session, not one of its
 * two halves.
 */
export function removeCardio(date: ISODate, entryId: string): void {
  store().update((d) => {
    const gone = (d.cardio[date] ?? []).find((e) => e.id === entryId)
    d.cardio[date] = (d.cardio[date] ?? []).filter((e) => e.id !== entryId)
    if (d.cardio[date].length === 0) delete d.cardio[date]
    if (gone?.runId) d.runs = d.runs.filter((r) => r.id !== gone.runId)
    setPlayed(d, date)
  })
}

/**
 * What the athlete said about a session, which outranks anything the
 * phone measured about it.
 *
 * The played mark is recomputed here on purpose. Somebody who tracked
 * an hour of ball and then told us it was a light shooting session
 * should not have that day covering the week's conditioning.
 */
export function setCardioFeltIntensity(date: ISODate, entryId: string, tier: Intensity): void {
  store().update((d) => {
    const e = (d.cardio[date] ?? []).find((x) => x.id === entryId)
    if (!e) return
    e.feltIntensity = tier
    setPlayed(d, date)
  })
}

export function setRunFeltIntensity(runId: string, tier: Intensity): void {
  store().update((d) => {
    const r = d.runs.find((x) => x.id === runId)
    if (r) r.feltIntensity = tier
  })
}

/**
 * Save a GPS session AND log its cardio entry in one shot, so the
 * tracker feeds the same conditioning machinery a manual log does.
 *
 * The two records are one session. The entry carries the run's id so
 * that anything adding the logs together knows not to count it twice.
 * See engine/activityLog.ts.
 */
export function saveRun(run: RunLog): void {
  store().update((d) => {
    // Estimate calories against the freshest bodyweight on record.
    let bw: number | undefined
    for (let i = d.measurements.length - 1; i >= 0; i--) {
      if (d.measurements[i].weightLb !== undefined) {
        bw = d.measurements[i].weightLb
        break
      }
    }
    run.kcalEst = estKcal(run.activity, run.distanceMi, run.durationSec, bw ?? 175)
    d.runs.push(run)
  })
  logCardio(run.date, {
    activityId: run.activity,
    // Was a two-way run-or-bike choice from when there were two GPS
    // activities, so every hike and every walk logged itself as "Bike".
    label: cardioActivity(run.activity).label,
    when: 'solo',
    where: 'outdoor',
    runId: run.id,
    // Only a distance the run itself stands behind. A session that
    // never got a fix keeps whatever scraps the tracker saw before
    // giving up, marked 'none', and copying that into the entry fed
    // noise straight into the achievement mileage.
    ...(run.distanceSource !== 'none' && run.distanceMi > 0 ? { miles: run.distanceMi } : {}),
    minutes: Math.round(run.durationSec / 60),
  })
}
