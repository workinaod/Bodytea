// ============================================================
// Muscle activation map: an anatomical figure, front and back,
// with every superficial muscle drawn and individually lit.
// Inline SVG, fully offline.
//
// The figure itself lives in anatomy/: front.ts and back.ts hold
// the muscle paths, AnatomyFigure.tsx does the sculpt-and-light
// rendering. This file is the vocabulary bridge: it takes the
// same primary/secondary regions the exercise data has always
// spoken and decides what state each drawn muscle is in.
// ============================================================

import { AnatomyFigure, type PieceState } from './anatomy/AnatomyFigure'
import { FRONT } from './anatomy/front'
import { BACK } from './anatomy/back'
import type { MuscleRegion } from '../plan/muscleRegions'
export type { MuscleRegion } from '../plan/muscleRegions'

export const ALL_REGIONS: MuscleRegion[] = [
  'delts-front', 'delts-side', 'delts-rear', 'traps', 'chest-upper', 'chest',
  'biceps', 'triceps', 'forearms', 'abs', 'obliques', 'hip-flexors', 'quads',
  'adductors', 'tibialis', 'calves', 'achilles-feet', 'lats', 'mid-back',
  'lower-back', 'glutes', 'hamstrings', 'full-body', 'heart',
]

function makeState(primary: MuscleRegion[], secondary: MuscleRegion[]) {
  const full = primary.includes('full-body') || secondary.includes('full-body')
  return (r: MuscleRegion | null): PieceState => {
    if (r === null) return 'base'
    if (primary.includes(r)) return 'primary'
    if (secondary.includes(r)) return 'secondary'
    if (full) return 'wash'
    return 'base'
  }
}

export function MuscleMap({
  primary,
  secondary = [],
  compact = false,
}: {
  primary: MuscleRegion[]
  secondary?: MuscleRegion[]
  compact?: boolean
}) {
  const state = makeState(primary, secondary)
  const heartListed = primary.includes('heart') || secondary.includes('heart')
  const heart = heartListed ? (primary.includes('heart') ? ('hot' as const) : ('listed' as const)) : undefined

  return (
    <div>
      <div className={`flex items-stretch justify-center gap-4 ${compact ? 'h-36' : 'h-56'}`}>
        <div className="flex flex-col items-center">
          <AnatomyFigure data={FRONT} state={state} heart={heart} />
          {!compact && <span className="eyebrow mt-1 text-ink-faint">front</span>}
        </div>
        <div className="flex flex-col items-center">
          <AnatomyFigure data={BACK} state={state} />
          {!compact && <span className="eyebrow mt-1 text-ink-faint">back</span>}
        </div>
      </div>
      {!compact && (
        <div className="mt-2 flex items-center justify-center gap-4 text-[10px] font-semibold text-ink-faint">
          <span className="flex items-center gap-1.5">
            <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--color-accent)' }} />
            primary
          </span>
          <span className="flex items-center gap-1.5">
            <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--color-accent)', opacity: 0.4 }} />
            assisting
          </span>
        </div>
      )}
    </div>
  )
}
