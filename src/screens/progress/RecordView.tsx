import { useMemo, useState } from 'react'
import type { DebriefData } from '../../types'
import { useAppStore } from '../../store/appStore'
import { formatShort } from '../../engine/calendar'
import { avgMph, fmtDuration, fmtPace } from '../../engine/runs'
import { Btn, Chip, Tile } from '../../components/ui'
import { DebriefSheet } from '../today/DebriefSheet'

// ============================================================
// The record: what actually happened.
//
// Every session, PR, adjustment, skipped day and logged run,
// merged into one timeline and sorted by time. It used to be
// the bottom two thirds of a Coach tab, which meant the only
// factual history in the app sat underneath a motivational
// quote. It belongs next to the charts.
//
// Nothing here is generated for display. Every row was written
// by the engine at the moment it happened.
// ============================================================

/**
 * The feed used to print its internal situation id in a pill, so the
 * Sergeant announced himself with "protein-miss" and "tier-drop-planned".
 * Those are database keys, not headlines. Every one gets said in English.
 */
const FEED_LABELS: Record<string, string> = {
  'backup-nudge': 'Back it up',
  'chronic-fallback': 'A pattern',
  comeback: 'Comeback',
  contradiction: "Doesn't add up",
  'deload-start': 'Deload week',
  'explosive-day-warning': 'Heads up',
  lighten: 'Lighten it',
  'minimum-taken': 'Minimum taken',
  pr: 'Personal record',
  'protein-miss': 'Protein missed',
  'protein-streak': 'Protein streak',
  push: 'Need a push',
  'session-done': 'Session done',
  'skip-no-proof': 'Skipped',
  'skip-with-proof': 'Skipped, receipts in',
  streak: 'Streak',
  'tier-drop-midweek': 'Tier dropped',
  'tier-drop-planned': 'Tier planned down',
  'unexplained-miss': 'Missed day',
  'week-complete': 'Week complete',
}

function feedLabel(situation?: string): string {
  if (!situation) return 'Coach'
  return FEED_LABELS[situation] ?? situation.replace(/-/g, ' ')
}

export function RecordView() {
  const data = useAppStore((s) => s.data)
  const [count, setCount] = useState(20)
  const [debrief, setDebrief] = useState<DebriefData | null>(null)

  const record = useMemo(() => {
    const rows = [
      ...data.coach.feed.map((f) => ({ rowKind: 'feed' as const, at: f.at, f })),
      ...data.runs
        .filter((r) => r.distanceMi >= 0.05 && r.durationSec >= 120)
        .map((r) => ({ rowKind: 'run' as const, at: r.startedAt, r })),
    ]
    return rows.sort((a, b) => (a.at > b.at ? -1 : 1))
  }, [data.coach.feed, data.runs])

  return (
    <div className="space-y-2">
      {record.slice(0, count).map((row) => {
        if (row.rowKind === 'run') {
          const r = row.r
          return (
            <Tile key={`run-${r.id}`} className="!py-3">
              <div className="flex items-center justify-between">
                <Chip tone="cyan">{r.activity === 'bike' ? 'ride' : 'run'}</Chip>
                <span className="text-[10px] font-bold text-ink-faint">{formatShort(r.date)}</span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed">
                {`${r.activity === 'bike' ? 'Ride' : 'Run'} · ${r.distanceMi.toFixed(2)} mi · ${fmtDuration(r.durationSec)} · ${fmtPace(r.avgPaceSec)} · ${avgMph(r.distanceMi, r.durationSec)} mph${(r.kcalEst ?? 0) > 0 ? ` · ~${r.kcalEst} cal` : ''}`}
              </p>
            </Tile>
          )
        }
        const f = row.f
        const linkedClaim = f.excuseId
          ? data.excuses.find((e) => e.id === f.excuseId)?.claimText
          : undefined
        return (
          <Tile key={f.id} className="!py-3">
            <div className="flex items-baseline justify-between gap-3">
              <span
                className={`eyebrow ${
                  f.kind === 'debrief' ? 'text-cyan' : f.kind === 'insight' ? 'text-lime' : 'text-accent-soft'
                }`}
              >
                {f.kind === 'debrief'
                  ? 'Debrief'
                  : f.kind === 'insight'
                    ? 'Insight'
                    : feedLabel(f.situation)}
              </span>
              <span className="text-[10px] font-bold text-ink-faint">{formatShort(f.at.slice(0, 10))}</span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed">{f.text}</p>
            {linkedClaim && (
              <p className="mt-2 rounded-lg border-l-2 border-[var(--lip-gold)] bg-surface-2 px-3 py-2 text-[12.5px] italic leading-snug text-ink-dim">
                Your words: "{linkedClaim}"
              </p>
            )}
            {f.debrief && (
              <button
                className="mt-1.5 text-[12px] font-bold text-cyan underline"
                onClick={() => setDebrief(f.debrief!)}
              >
                open debrief
              </button>
            )}
          </Tile>
        )
      })}
      {record.length === 0 && (
        <p className="py-6 text-center text-[12.5px] font-bold text-ink-faint">
          Nothing yet. Finish a session and the record starts.
        </p>
      )}
      {record.length > count && (
        <Btn kind="ghost" className="w-full" onClick={() => setCount((c) => c + 20)}>
          Older entries
        </Btn>
      )}
      <DebriefSheet debrief={debrief} onClose={() => setDebrief(null)} />
    </div>
  )
}
