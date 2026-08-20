import type { AppData, ISODate, ResolvedDay } from '../../types'
import { EmptyNote } from '../../components/ui'
import { getExercise } from '../../plan/exercises'
import { swapCandidatesFor } from '../../plan/subs'
import { swapExercise } from '../../logic/actions'

// ============================================================
// What today is asking for, before anybody starts it.
//
// Hairline-divided rows rather than a stack of cards: this is a
// glance, not a screen. Extracted from TodayScreen unchanged,
// swap and guide buttons included.
// ============================================================

export function TodayPreviewList({
  data,
  date,
  day,
  today,
  hasSession,
  onOpenGuide,
}: {
  data: AppData
  date: ISODate
  day: ResolvedDay
  /** Viewing the live day, as opposed to browsing with the arrows. */
  today: boolean
  hasSession: boolean
  onOpenGuide: (exerciseId: string) => void
}) {
  // Nothing to preview once a session is live, on a rest day, or on a
  // required-cardio day nobody has chosen yet (there the chooser IS the day).
  if (hasSession || day.kind === 'rest' || (day.kind === 'cardio-backup' && day.exercises.length === 0)) {
    return null
  }

  return (
    <>
      <div className="mt-1">
        {day.exercises.map((r, i) => {
          const def = getExercise(r.exerciseId)
          const swapBase = r.swappedFrom ?? r.exerciseId
          const canSwap = swapCandidatesFor(swapBase, data.plan).length > 0
          return (
            <div
              key={swapBase}
              className={`flex items-center justify-between gap-3 px-1 py-3.5 ${i > 0 ? 'border-t border-edge/40' : ''}`}
            >
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-[14.5px] font-bold">{def.name}</span>
                  {r.swappedFrom && (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-gold">swapped</span>
                  )}
                  {r.fromSlot && !r.swappedFrom && (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-cyan">rotates</span>
                  )}
                  {r.lightMode && (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-gold">light</span>
                  )}
                </div>
                <div className="mt-0.5 text-[12px] font-semibold text-ink-dim">
                  {r.sets > 1 ? `${r.sets} × ${r.repText}` : `${r.repText}${r.repsNum ? ' reps' : ''}`}
                  <span className="font-normal text-ink-faint"> · {def.equipment}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center">
                {canSwap && (
                  <button
                    aria-label={`Swap ${def.name}`}
                    onClick={() => swapExercise(date, swapBase)}
                    className="p-2 text-ink-faint active:text-accent"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 2v6h-6" />
                      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                      <path d="M3 22v-6h6" />
                      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => onOpenGuide(r.exerciseId)}
                  className="p-2 text-[14px] font-black text-ink-faint active:text-cyan"
                >
                  ?
                </button>
              </div>
            </div>
          )
        })}
        {day.exercises.length === 0 && <EmptyNote>Nothing scheduled.</EmptyNote>}
      </div>

      {day.note && (
        <p className="px-2 text-center text-[12px] leading-relaxed text-ink-faint">{day.note}</p>
      )}

      {!today && (
        <p className="px-1 text-center text-[11.5px] text-ink-faint">
          Preview only. Sessions start on their day.
        </p>
      )}
    </>
  )
}
