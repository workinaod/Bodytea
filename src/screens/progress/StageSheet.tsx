import type { Stage } from '../../engine/journey'
import { formatShort } from '../../engine/calendar'
import { Sheet } from '../../components/Sheet'

// ============================================================
// One stage of the path, up close.
//
// The path has room for a name and a date and nothing else, so
// everything that makes a target honest lives here: what it
// actually is, where the estimate came from, and — when there
// is no estimate — which of the several good reasons for that
// applies. A path node that just says "~Nov" and cannot be
// interrogated is a promise; one you can open is an estimate.
// ============================================================

export function StageSheet({ stage, onClose }: { stage: Stage; onClose: () => void }) {
  const pct = Math.round(stage.progress * 100)
  const done = stage.state === 'done'

  return (
    <Sheet open onClose={onClose} title={stage.label}>
      <div className="space-y-4 pb-8">
        {done ? (
          <div className="rounded-2xl bg-lime/10 px-4 py-3 ring-1 ring-lime/25">
            <p className="text-[13px] font-black text-lime">
              Done{stage.hitOn ? ` · ${formatShort(stage.hitOn)}` : ''}
            </p>
            <p className="mt-1 text-[11.5px] leading-snug text-ink-dim">
              This one is banked. It stays banked whatever the number does afterwards: a deload week, a bulk, a month
              off. It happened.
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] font-bold text-ink-dim">
                {stage.current !== undefined ? `${Math.round(stage.current * 10) / 10}${stage.unit} now` : 'Not measured yet'}
              </span>
              <span className="font-mono text-[12px] text-ink-faint">
                {stage.target}
                {stage.unit}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
              <div className="grow h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 text-[10.5px] text-ink-faint">{pct}% of the way from where you started</p>
          </div>
        )}

        {stage.isGoal && (
          <p className="text-[11.5px] font-black uppercase tracking-wider text-gold">★ The one you came for</p>
        )}
        <p className="text-[13px] leading-snug text-ink">{stage.detail}</p>

        {!done && (
          <div className="rounded-2xl bg-white/[0.045] px-4 py-3 ring-1 ring-white/[0.05]">
            {stage.blocker ? (
              <>
                <p className="text-[12.5px] font-black text-gold">Nothing to measure yet</p>
                <p className="mt-1 text-[11.5px] leading-snug text-ink-dim">{stage.blocker}.</p>
              </>
            ) : stage.etaWeeks === undefined ? (
              <>
                <p className="text-[12.5px] font-black text-ink">No honest date for this one</p>
                <p className="mt-1 text-[11.5px] leading-snug text-ink-dim">
                  {stage.note ?? 'Not enough behind it yet to say.'}
                </p>
              </>
            ) : (
              <>
                <p className="text-[12.5px] font-black text-ink">
                  {stage.etaWeeks <= 1 ? 'This week' : stage.etaWeeks < 9 ? `About ${stage.etaWeeks} weeks` : `Around ${stage.etaLabel}`}
                </p>
                <p className="mt-1 text-[11.5px] leading-snug text-ink-dim">
                  {stage.basis === 'observed'
                    ? 'Worked out from how fast YOU have actually been moving, not from a table. It moves when your rate does.'
                    : 'A typical rate for your training age, because there is not enough of your own data behind this yet. It switches to your real rate once there is.'}
                </p>
              </>
            )}
          </div>
        )}

        <p className="text-[10.5px] leading-snug text-ink-faint">
          The target does not move. If you take three weeks off, the date slides and {stage.target}
          {stage.unit} is still {stage.target}
          {stage.unit}.
        </p>
      </div>
    </Sheet>
  )
}
