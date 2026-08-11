import type { AppData, ExerciseDef, ResolvedExercise } from '../types'

// ============================================================
// The voice coach's brain: pure timing + wording, no browser
// APIs. Given an exercise, produce the spoken/shown event list
// for a guided set — counted in a rhythm that respects how the
// movement should actually be performed.
// ============================================================

export type TempoClass = 'explosive' | 'standard' | 'controlled' | 'hold' | 'timed' | 'instructional'

export interface CadenceEvent {
  atMs: number
  say: string
  /** Big on-screen mirror (the count); falls back to `say` when absent. */
  show?: string
}

const SLOW_MARKERS = /romanian|rdl|tempo|eccentric|nordic|slow|negative/i

export function tempoFor(def: ExerciseDef, r: ResolvedExercise): TempoClass {
  const rep = r.repText.toLowerCase()
  if (/\bmin\b/.test(rep)) return 'timed'
  if (/sec|hold/.test(rep)) return 'hold'
  if (def.kind === 'jump' || def.kind === 'sprint') return 'explosive'
  if (def.kind === 'warmup' || def.kind === 'mobility' || def.kind === 'carry' || def.kind === 'cardio') return 'instructional'
  if (!r.repsNum) return 'instructional'
  if (SLOW_MARKERS.test(def.name) || SLOW_MARKERS.test(def.cue ?? '')) return 'controlled'
  return 'standard'
}

/** Parse the leading number out of a repText like "30 sec" / "2 min". */
function leadingNum(rep: string): number | null {
  const m = rep.match(/(\d+)/)
  return m ? Number(m[1]) : null
}

export function cadencePlan(r: ResolvedExercise, def: ExerciseDef): CadenceEvent[] {
  const tempo = tempoFor(def, r)
  const out: CadenceEvent[] = []

  if (tempo === 'standard' || tempo === 'controlled') {
    const reps = r.repsNum ?? 8
    const gap = tempo === 'controlled' ? 4500 : 2800
    for (let i = 1; i <= reps; i++) {
      const extra = tempo === 'controlled' && i <= 2 ? ' — down slow' : ''
      out.push({ atMs: (i - 1) * gap, say: `${i}${extra}`, show: String(i) })
    }
    out.push({ atMs: reps * gap, say: 'Rack it — set done.', show: '✓' })
    return out
  }

  if (tempo === 'hold') {
    const secs = leadingNum(r.repText) ?? 30
    out.push({ atMs: 0, say: 'Lock in the position — hold starts now.', show: 'HOLD' })
    const half = Math.floor(secs / 2)
    if (secs >= 16) out.push({ atMs: half * 1000, say: `Halfway — ${secs - half} to go.`, show: String(secs - half) })
    if (secs > 8) out.push({ atMs: (secs - 5) * 1000, say: 'Last five — hold.', show: '5' })
    out.push({ atMs: secs * 1000, say: 'Done. Release.', show: '✓' })
    return out
  }

  if (tempo === 'timed') {
    const mins = leadingNum(r.repText) ?? 2
    const total = mins * 60_000
    out.push({ atMs: 0, say: `${mins} minute${mins > 1 ? 's' : ''} on the clock. Go.`, show: 'GO' })
    out.push({ atMs: total / 2, say: 'Halfway.', show: '½' })
    out.push({ atMs: total - 10_000, say: 'Last ten seconds.', show: '10' })
    out.push({ atMs: total, say: 'Time. Done.', show: '✓' })
    return out
  }

  if (tempo === 'explosive') {
    const reps = r.repsNum ?? 3
    out.push({
      atMs: 0,
      say: `Set of ${reps}. Max intent, full reset between reps — quality over speed of the set. Go.`,
      show: 'MAX INTENT',
    })
    return out // athlete-paced: no counting an explosive rep
  }

  // instructional: walk the steps quickly
  def.steps.slice(0, 4).forEach((s, i) => out.push({ atMs: i * 3500, say: s }))
  return out
}

/** Count past sessions where this exercise has at least one done set. */
export function timesTrained(data: AppData, exerciseId: string): number {
  let n = 0
  for (const s of Object.values(data.sessions)) {
    const ex = s.exercises.find((e) => e.exerciseId === exerciseId)
    if (ex && ex.sets.some((x) => x.done)) n++
  }
  return n
}

/** What the coach says about the NEXT exercise during the break. */
export function briefingFor(def: ExerciseDef, trained: number, rationaleLine?: string): string {
  if (trained < 3) {
    const setup = def.steps.slice(0, 2).join(' ')
    return `${def.name}. ${setup}`
  }
  return `${def.name}. ${rationaleLine ?? def.why}`
}
