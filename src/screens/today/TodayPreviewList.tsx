import type { AppData, ISODate, ResolvedDay } from '../../types'
import { EmptyNote, SectionTitle, SetCoin } from '../../components/ui'
import { getExercise } from '../../plan/exercises'
import { swapCandidatesFor } from '../../plan/subs'
import { swapExercise } from '../../logic/actions'
import { prefillFor } from '../../logic/prescription'

// ============================================================
// What today is asking for, before anybody starts it.
//
// Rows, not cards: this is a glance, not a screen. Each one
// leads with the same 40px coin the plan days and the meal rows
// use, holding the one number that decides whether you have
// time for this: 4×6.
//
// The sub-line is the load the first set will actually open
// with, read back out of your own history by the same function
// the logger uses. Not a guess, and not a different number from
// the one that appears on the bar thirty seconds later.
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
      <SectionTitle>The work</SectionTitle>
      <div>
        {day.exercises.map((r, i) => {
          const def = getExercise(r.exerciseId)
          const swapBase = r.swappedFrom ?? r.exerciseId
          const canSwap = swapCandidatesFor(swapBase, data.plan).length > 0
          const opening = prefillFor(date, r.exerciseId, {
            repRange: r.repRange,
            lightMode: r.lightMode,
          }).weightLb
          return (
            <div
              key={swapBase}
              className={`flex items-center gap-3 px-0.5 py-2.5 ${i > 0 ? 'border-t-2 border-edge-soft' : ''}`}
            >
              <SetCoin>
                {r.sets > 1 ? `${r.sets}×${r.repText}` : r.repText}
              </SetCoin>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-[14px] font-extrabold">{def.name}</span>
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
                <div className="mt-0.5 text-[11.5px] font-bold text-ink-faint">
                  {def.equipment}
                  {opening ? ` · ${opening} lb` : ''}
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
