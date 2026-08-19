import type { QuitCopy } from '../../engine/quit'

// ============================================================
// Ending a session with sets still open takes a deliberate yes.
// One mis-tap must never end the day, learned the hard way.
//
// Its own file because TodayScreen was at its cap and this is the
// most self-contained thing in it: no state, no store, two
// callbacks and the copy the quit engine already wrote.
// ============================================================

export function QuitGate({
  quit,
  onStay,
  onGo,
}: {
  quit: QuitCopy
  /** Keep training. */
  onStay: () => void
  /** End the session anyway. */
  onGo: () => void
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/70 animate-fade-in" onClick={onStay} />
      <div className="relative w-full max-w-sm rounded-2xl border border-danger/40 bg-bg p-5 shadow-2xl animate-fade-in">
        <h3 className="text-[17px] font-black tracking-tight text-danger">{quit.title}</h3>
        <p className="mt-1.5 text-[13px] leading-snug text-ink-dim">{quit.body}</p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            className="sheen w-full rounded-xl bg-gradient-to-b from-accent to-accent-deep py-3 text-[14px] font-black text-black shadow-lg shadow-accent/20 active:scale-[0.98]"
            onClick={onStay}
          >
            {quit.stay}
          </button>
          <button
            className="w-full rounded-xl border border-danger/40 bg-white/[0.07] py-3 text-[13px] font-bold text-danger active:scale-[0.98]"
            onClick={onGo}
          >
            {quit.go}
          </button>
        </div>
      </div>
    </div>
  )
}
