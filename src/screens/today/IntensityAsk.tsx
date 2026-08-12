import type { Intensity } from '../../engine/intensity'

// ============================================================
// The one question at the end of a cardio session.
//
// It is here rather than inline in three trackers because it
// has to look and read identically wherever it appears, and
// because the answer means the same thing everywhere: it is the
// ground truth engine/calibration.ts learns the athlete's own
// bands from.
//
// One tap, three options, no skip button and no way to get it
// wrong. Closing the screen without answering is the skip, and
// it costs nothing: the session is already logged by the time
// this appears. Nothing here can fail and lose work.
// ============================================================

// Every hint stays on one line at 390px. "Could have kept going" wrapped
// and pushed the Easy label a row higher than the other two, which read
// as a rendering fault rather than a design.
const OPTIONS: { id: Intensity; label: string; hint: string }[] = [
  { id: 'low', label: 'Easy', hint: 'More in the tank?' },
  { id: 'standard', label: 'Solid', hint: 'Normal session' },
  { id: 'high', label: 'All out', hint: 'Left it all there' },
]

export function IntensityAsk({
  answered,
  onAnswer,
  className = '',
}: {
  /** Set once they tap, so the question becomes a receipt. */
  answered?: Intensity
  onAnswer: (tier: Intensity) => void
  className?: string
}) {
  return (
    <div className={`w-full ${className}`}>
      <p className="text-center text-[13px] font-bold text-ink-dim">
        {answered ? 'Logged how it felt ✓' : 'How hard was that?'}
      </p>
      <div className="mt-2.5 flex gap-1.5">
        {OPTIONS.map((o) => {
          const on = answered === o.id
          return (
            <button
              key={o.id}
              onClick={() => onAnswer(o.id)}
              aria-pressed={on}
              className={`press flex-1 rounded-2xl px-2 py-3 text-center ring-1 transition-colors ${
                on
                  ? 'bg-accent/15 ring-accent/45'
                  : answered
                    ? 'bg-white/[0.03] ring-white/[0.05] opacity-45'
                    : 'bg-white/[0.06] ring-white/[0.07]'
              }`}
            >
              <span
                className={`block text-[13.5px] font-extrabold leading-none ${
                  on ? 'text-accent-soft' : ''
                }`}
              >
                {o.label}
              </span>
              <span className="mt-1 block text-[10px] font-semibold leading-tight text-ink-faint">
                {o.hint}
              </span>
            </button>
          )
        })}
      </div>
      {!answered && (
        <p className="mt-2 text-center text-[10.5px] leading-snug text-ink-faint">
          Your answer teaches the app what your hard looks like.
        </p>
      )}
    </div>
  )
}
