import { useMemo } from 'react'
import type { ResolvedExercise } from '../../types'
import { regionName, totalSets, volumeVerdict } from '../../engine/volume'

// ============================================================
// "23 sets" tells you nothing. "11.5 of them land on your
// triceps" tells you why you were cooked by the third movement
// with twelve sets still to go.
//
// This sits ABOVE the start button on purpose. A day that is
// too much is worth knowing before you are halfway into it,
// and the fix is a tap rather than something the app does on
// its own.
// ============================================================

export function VolumeNotice({
  exercises,
  armed,
  onArm,
  onDisarm,
}: {
  exercises: ResolvedExercise[]
  /** The athlete has chosen the trimmed version for this session. */
  armed: boolean
  onArm: () => void
  onDisarm: () => void
}) {
  const v = useMemo(() => volumeVerdict(exercises), [exercises])
  if (!v.heavy || !v.trim) return null

  const worst = v.over.slice(0, 2)
  const trimmedTotal = totalSets(v.trim.exercises)
  const dropped = v.trim.cuts.filter((c) => c.to === 0)
  const shaved = v.trim.cuts.filter((c) => c.to > 0)

  return (
    <div className="rounded-2xl border border-gold/30 bg-gold/[0.07] px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[10.5px] font-black uppercase tracking-[0.16em] text-gold">
          {armed ? 'Trimmed' : 'Heavy day'}
        </span>
        <span className="text-[11px] font-bold tabular-nums text-gold/70">
          {armed ? `${trimmedTotal} sets` : `${v.total} sets`}
        </span>
      </div>

      {armed ? (
        <>
          <p className="mt-1.5 text-[12.5px] leading-snug text-gold/90">
            {dropped.length > 0 && (
              <>
                {dropped.map((c) => c.name).join(' and ')} {dropped.length > 1 ? 'are' : 'is'} out.{' '}
              </>
            )}
            {shaved.length > 0 && (
              <>{shaved.map((c) => `${c.name} to ${c.to}`).join(', ')}. </>
            )}
            Everything that matters is still in.
          </p>
          <button
            onClick={onDisarm}
            className="press mt-2.5 text-[11.5px] font-bold text-gold/70 underline underline-offset-2"
          >
            no, give me all {v.total}
          </button>
        </>
      ) : (
        <>
          <p className="mt-1.5 text-[12.5px] leading-snug text-gold/90">
            {worst
              .map((o) => `${o.load} of them land on your ${regionName(o.region)}`)
              .join(', and ')}
            . One session pays for about {worst[0].ceiling}.
          </p>
          {v.stacked[0] && (
            <p className="mt-1 text-[11.5px] leading-snug text-gold/65">
              {v.stacked[0].name} arrives after {v.stacked[0].priorLoad} sets of{' '}
              {regionName(v.stacked[0].region)} work.
            </p>
          )}
          <button
            onClick={onArm}
            className="press mt-2.5 rounded-full bg-gold/20 px-3.5 py-1.5 text-[12px] font-black text-gold"
          >
            Trim to {trimmedTotal} sets
          </button>
        </>
      )}
    </div>
  )
}
