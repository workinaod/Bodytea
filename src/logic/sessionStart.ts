import type { ISODate, SessionIntensity, SessionLog } from '../types'
import { planTemplate, resolveDay } from '../engine/resolveDay'
import { applyReadinessDowngrade, minimumViableFor } from '../engine/transforms'
import { useAppStore } from '../store/appStore'
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
    exercises: exercises.map((r) => {
      const pre = prefillFor(date, r.exerciseId, { repRange: r.repRange, lightMode: r.lightMode })
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
