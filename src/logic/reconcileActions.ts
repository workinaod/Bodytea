import type { ExcuseReason, ISODate } from '../types'
import { uid, useAppStore } from '../store/appStore'
import { addDaysISO, mondayOf, todayISO } from '../engine/calendar'
import { escalationLevel, excuseAccepted } from '../engine/coach'
import { pushCoachMessage } from './actions'

// ============================================================
// Answering the reconcile gate.
//
// Split out of logic/actions.ts, which had reached its line
// allowance again. These three are one job: every past day the
// app interrogates gets exactly one of these answers, and each
// writes the day AND the excuse record that explains it.
// ============================================================

const store = () => useAppStore.getState()

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
