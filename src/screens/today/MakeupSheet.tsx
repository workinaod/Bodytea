import { useMemo } from 'react'
import type { ISODate } from '../../types'
import { useAppStore } from '../../store/appStore'
import { recentPlanDays, type PlanDayRow } from '../../engine/reconcile'
import { formatDayLabel } from '../../engine/calendar'
import { Sheet } from '../../components/Sheet'

// ============================================================
// Run any recent plan day today. The one-day make-up card only
// ever offered the week's first miss; this is the whole recent
// past: missed and skipped days to make up, trained ones to run
// again. The workout resolves exactly as it was on its day
// (block, tier, swaps), and logs under today with the original
// date on the record.
// ============================================================

const STATUS: Record<PlanDayRow['status'], { label: string; cls: string; action: string }> = {
  missed: { label: 'missed', cls: 'text-danger', action: 'Make it up' },
  skipped: { label: 'skipped', cls: 'text-danger', action: 'Make it up' },
  partial: { label: 'unfinished', cls: 'text-gold', action: 'Run it again' },
  done: { label: 'done', cls: 'text-lime', action: 'Run it again' },
}

export function MakeupSheet({
  open,
  today,
  onClose,
  onRun,
}: {
  open: boolean
  today: ISODate
  onClose: () => void
  /** Hand the picked day back to the start flow (readiness gate on CNS days). */
  onRun: (date: ISODate, cns: boolean) => void
}) {
  const data = useAppStore((s) => s.data)
  const rows = useMemo(() => (open ? recentPlanDays(data, today) : []), [open, data, today])
  const owed = rows.filter((r) => r.status === 'missed' || r.status === 'skipped').length

  return (
    <Sheet open={open} onClose={onClose} title="Run a previous day">
      <div className="pb-8">
        <p className="mb-3 px-0.5 text-[12px] leading-snug text-ink-dim">
          {owed > 0
            ? `${owed} ${owed === 1 ? 'day' : 'days'} from the last two weeks still ${owed === 1 ? 'wants' : 'want'} its work. Or rerun one you liked.`
            : 'Nothing owed from the last two weeks. Rerun any day you liked.'}{' '}
          It runs now and logs under today.
        </p>
        {rows.length === 0 && (
          <p className="py-8 text-center text-[13px] font-semibold text-ink-faint">
            No plan days behind you yet. Come back once the week has some history.
          </p>
        )}
        <div className="space-y-1.5">
          {rows.map((r) => {
            const st = STATUS[r.status]
            return (
              <button
                key={r.date}
                onClick={() => onRun(r.date, r.cns)}
                className="flex w-full items-center justify-between gap-3 rounded-xl bg-white/[0.05] ring-1 ring-white/[0.05] px-3.5 py-3 text-left active:bg-white/[0.08]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-bold">{r.title}</span>
                  <span className="mt-0.5 block text-[11px] text-ink-faint">
                    {formatDayLabel(r.date)} · <span className={`font-bold ${st.cls}`}>{st.label}</span>
                    {r.cns && ' · max-effort day'}
                  </span>
                </span>
                <span className="shrink-0 text-[12px] font-black text-accent">{st.action} ›</span>
              </button>
            )
          })}
        </div>
      </div>
    </Sheet>
  )
}
