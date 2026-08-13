import type { RoutineNote } from '../../plan/analyze'

// ============================================================
// How a routine note is coloured in the review steps.
// ============================================================

export const NOTE_TONE: Record<RoutineNote['tone'], string> = {
  warn: 'border-danger/40 bg-danger/10 text-danger',
  good: 'border-lime/40 bg-lime/10 text-lime',
  info: 'border-cyan/30 bg-cyan/10 text-cyan',
}
export const NOTE_LABEL: Record<RoutineNote['tone'], string> = { warn: 'Fix this', good: 'Solid', info: 'Heads up' }
