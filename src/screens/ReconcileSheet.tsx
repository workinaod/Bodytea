import { useEffect, useMemo, useRef, useState } from 'react'
import type { ExcuseReason } from '../types'
import { useAppStore } from '../store/appStore'
import { findUnexplainedMisses, groupMissesByWeek } from '../engine/reconcile'
import { formatShort, todayISO } from '../engine/calendar'
import { Btn, Chip } from '../components/ui'
import { Sheet } from '../components/Sheet'
import {
  pushCoachMessage,
  resolveMissAsTrained,
  resolveMissWithReason,
  savePhotoFile,
  writeOffWeek,
} from '../logic/actions'

const REASONS: { id: ExcuseReason; label: string }[] = [
  { id: 'busy', label: 'Busy' },
  { id: 'tired', label: 'Tired' },
  { id: 'sick', label: 'Sick' },
  { id: 'gig', label: 'Gig' },
  { id: 'travel', label: 'Travel' },
  { id: 'other', label: 'Other' },
]

/**
 * The launch confrontation: every unaccounted past day must be answered
 * before Today unlocks. Bulk week write-off keeps a vacation from
 * becoming 14 separate interrogations.
 */
export function ReconcileSheet() {
  const data = useAppStore((s) => s.data)
  const misses = useMemo(() => findUnexplainedMisses(data, todayISO()), [data])
  const confronted = useRef(false)
  const [activeReason, setActiveReason] = useState<Record<string, ExcuseReason>>({})
  const [proofBusy, setProofBusy] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const pendingProofDate = useRef<string | null>(null)

  useEffect(() => {
    if (misses.length > 0 && !confronted.current) {
      confronted.current = true
      pushCoachMessage('unexplained-miss', { date: formatShort(misses[0].date) })
    }
  }, [misses])

  if (misses.length === 0) return null

  const weeks = groupMissesByWeek(misses)
  const latestCoach = data.coach.feed.find((f) => f.situation === 'unexplained-miss')

  return (
    <Sheet open onClose={() => {}} locked title={`${misses.length} day${misses.length > 1 ? 's' : ''} unaccounted for`}>
      <div className="space-y-4 pb-6">
        {latestCoach && (
          <div className="rounded-xl border border-danger/30 bg-danger/8 px-3.5 py-3 text-[13px] font-bold leading-snug text-danger">
            {latestCoach.text}
          </div>
        )}
        <p className="text-[12.5px] leading-snug text-ink-dim">
          The record only works if it's complete. Close these out — takes seconds each, or write off
          a whole week at once.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            const date = pendingProofDate.current
            if (!f || !date) return
            setProofBusy(date)
            try {
              const meta = await savePhotoFile(f, 'proof')
              resolveMissWithReason(date, activeReason[date] ?? 'other', meta.id)
            } finally {
              setProofBusy(null)
            }
          }}
        />

        {[...weeks.entries()].map(([monday, weekMisses]) => (
          <div key={monday} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-ink-faint">
                Week of {formatShort(monday)}
              </span>
              {weekMisses.length > 1 && (
                <div className="flex gap-1">
                  {(['travel', 'sick', 'busy'] as ExcuseReason[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => writeOffWeek(monday, r)}
                      className="rounded-lg bg-surface-2 px-2.5 py-1 text-[10.5px] font-bold text-ink-dim"
                    >
                      write off: {r}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {weekMisses.map((m) => (
              <div key={m.date} className="rounded-xl border border-edge bg-surface p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[13.5px] font-bold">
                    {formatShort(m.date)} — {m.title}
                  </span>
                  {m.cns && <Chip tone="cyan">CNS day</Chip>}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {REASONS.map((r) => (
                    <Chip
                      key={r.id}
                      tone={activeReason[m.date] === r.id ? 'accent' : 'default'}
                      onClick={() => setActiveReason({ ...activeReason, [m.date]: r.id })}
                    >
                      {r.label}
                    </Chip>
                  ))}
                </div>
                <div className="mt-2.5 flex gap-1.5">
                  <Btn kind="subtle" className="flex-1 !px-2 !py-2 text-[11.5px]" onClick={() => resolveMissAsTrained(m.date, m.templateId)}>
                    I trained — log it
                  </Btn>
                  <Btn
                    kind="ghost"
                    className="flex-1 !px-2 !py-2 text-[11.5px]"
                    disabled={!activeReason[m.date] || proofBusy === m.date}
                    onClick={() => {
                      pendingProofDate.current = m.date
                      fileRef.current?.click()
                    }}
                  >
                    {proofBusy === m.date ? 'Saving…' : 'Skipped + proof'}
                  </Btn>
                  <Btn
                    kind="danger"
                    className="flex-1 !px-2 !py-2 text-[11.5px]"
                    disabled={!activeReason[m.date]}
                    onClick={() => resolveMissWithReason(m.date, activeReason[m.date])}
                  >
                    Skipped, no proof
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Sheet>
  )
}
