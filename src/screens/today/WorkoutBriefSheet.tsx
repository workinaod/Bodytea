import { Sheet } from '../../components/Sheet'
import { MuscleMap } from '../../components/MuscleMap'
import type { WorkoutBrief } from '../../engine/workoutBrief'

// ============================================================
// "How this workout works", on a sheet.
//
// The app explained every movement and never explained the
// session they added up to. This is the answer to the question
// people actually ask before they start: what is this doing to
// me, why is it in this order, and where does it sit in the
// plan I signed up for.
//
// Everything shown is measured off the day on screen by
// engine/workoutBrief.ts, so it cannot say one thing while the
// session asks for another.
// ============================================================

export function WorkoutBriefSheet({
  brief,
  title,
  onClose,
}: {
  brief: WorkoutBrief | null
  title: string
  onClose: () => void
}) {
  if (!brief) return null
  const topSets = Math.max(1, ...brief.focus.map((f) => f.sets))

  return (
    <Sheet open onClose={onClose} title={title}>
      <div className="space-y-4 pb-7">
        <div>
          {brief.intent && (
            <p className="text-[14px] font-bold leading-snug text-ink">{brief.intent}</p>
          )}
          <p className="mt-1 text-[12.5px] font-semibold text-accent-soft">{brief.headline}</p>
        </div>

        {brief.focus.length > 0 && (
          <section className="rounded-2xl bg-surface-2 border-2 border-edge p-4">
            <h4 className="mb-3 text-[11px] font-black uppercase tracking-[0.14em] text-ink-faint">
              What it works
            </h4>
            <MuscleMap primary={brief.map.primary} secondary={brief.map.secondary} />
            <div className="mt-3 space-y-1.5">
              {brief.focus.map((f) => (
                <div key={f.region} className="flex items-center gap-2.5">
                  <span className="w-[92px] shrink-0 truncate text-[12px] font-bold capitalize text-ink-dim">
                    {f.label}
                  </span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <span
                      className="block h-full rounded-full bg-accent"
                      style={{ width: `${(f.sets / topSets) * 100}%` }}
                    />
                  </span>
                  <span className="num w-12 shrink-0 text-right text-[11.5px] font-semibold text-ink-faint">
                    {f.sets} {f.sets === 1 ? 'set' : 'sets'}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2.5 text-[11px] leading-snug text-ink-faint">
              A set counts once for a muscle doing the job and half for one helping out, which is why
              the numbers land on halves.
            </p>
          </section>
        )}

        <section className="rounded-2xl bg-surface-2 border-2 border-edge p-4">
          <h4 className="mb-3 text-[11px] font-black uppercase tracking-[0.14em] text-ink-faint">
            The order, and why
          </h4>
          <div className="space-y-3">
            {brief.blocks.map((b, i) => (
              <div key={b.label} className="flex gap-3">
                <span className="num mt-0.5 w-4 shrink-0 text-[11px] font-black text-accent">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-extrabold">{b.label}</div>
                  <div className="mt-0.5 text-[12px] font-semibold leading-snug text-ink-dim">
                    {b.movements.join(', ')}
                  </div>
                  <p className="mt-1 text-[11.5px] leading-snug text-ink-faint">{b.why}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {brief.placement.length > 0 && (
          <section className="rounded-2xl border border-cyan/25 bg-cyan/[0.06] p-4">
            <h4 className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-cyan">
              Where this sits
            </h4>
            <ul className="space-y-2">
              {brief.placement.map((p, i) => (
                <li key={i} className="flex gap-2 text-[12.5px] leading-snug text-ink-dim">
                  <span className="shrink-0 text-cyan">•</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {brief.placement.length === 0 && (
          <p className="px-1 text-[11.5px] leading-snug text-ink-faint">
            Not from your plan, so nothing here moves your schedule. It still logs as a real session
            and still counts toward what you have done.
          </p>
        )}
      </div>
    </Sheet>
  )
}
