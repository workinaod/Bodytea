import { useMemo, useState } from 'react'
import type { AppData, ISODate, RunLog } from '../../types'
import { formatShort } from '../../engine/calendar'
import { avgMph, fmtDuration, fmtPace, weeklyMiles } from '../../engine/runs'
import { intensityLabel } from '../../engine/intensity'
import { intensityTrend, sportSummary, sportTotals, type ActivityRollup } from '../../engine/activityStats'
import { Tile } from '../../components/ui'
import { Sheet } from '../../components/Sheet'
import { SimpleLine } from '../../components/charts'
import { RunReplay } from '../../components/RunReplay'

// ============================================================
// Everything logged as sport, in one place.
//
// Split out of ProgressScreen, which had reached the line cap
// with the runs list already in it and no room for the rest.
//
// The table below the chart is the payoff for all the step
// tracking: what each sport is actually doing for you, in time,
// ground covered and calories, plus how the measured sessions
// graded out. "You showed up" was the only question the log
// could answer before. This one answers "how hard, and is that
// changing".
//
// ONE tile. It used to be up to five top-level blocks (two
// section titles, two cards and a list) stacked under the
// charts, which is why Progress read as a document. Conditioning
// is one subject, so it is one object, with rules inside it.
// ============================================================

/** A month is long enough to have a shape and short enough to still be you. */
const WINDOW_DAYS = 30

const TIER_COLOR: Record<string, string> = {
  low: 'bg-white/25',
  standard: 'bg-cyan',
  high: 'bg-accent',
}

export function ActivityLog({ data, today }: { data: AppData; today: ISODate }) {
  const [openRun, setOpenRun] = useState<RunLog | null>(null)
  const rows = useMemo(() => sportSummary(data, today, WINDOW_DAYS), [data, today])
  const totals = useMemo(() => sportTotals(rows), [rows])
  const trend = useMemo(() => intensityTrend(data, today, WINDOW_DAYS), [data, today])

  if (rows.length === 0 && data.runs.length === 0) return null

  return (
    <>
      <Tile>
        <div className="eyebrow text-ink-faint">Conditioning · last 30 days</div>

        {rows.length > 0 && (
          <>
            {/* Two big numbers on one row, everything else on the caption
                under them. Stacking the session count beside the clock
                wrapped at 390px and dropped "sessions" onto the calories. */}
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <span className="num text-[26px] font-black leading-none">{hours(totals.minutes)}</span>
              {totals.kcal > 0 && (
                <span className="shrink-0">
                  <span className="num text-[20px] font-black leading-none">
                    {totals.kcal.toLocaleString()}
                  </span>
                  <span className="ml-1 text-[11px] font-bold text-ink-faint">cal</span>
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[11.5px] font-bold text-ink-faint">
              {[
                `${totals.sessions} ${totals.sessions === 1 ? 'session' : 'sessions'}`,
                totals.steps > 0 ? `${totals.steps.toLocaleString()} steps` : null,
                totals.miles > 0 ? `${totals.miles} mi` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>

            <div className="mt-3 space-y-2.5 border-t-2 border-edge-soft pt-3">
              {rows.map((r) => (
                <Row key={r.activityId} row={r} />
              ))}
            </div>

            {trend && (
              <p className="mt-3 border-t-2 border-edge-soft pt-2.5 text-[11.5px] leading-snug text-ink-dim">
                {trend.direction === 'up'
                  ? 'Your tracked sessions are grading harder than the month before.'
                  : trend.direction === 'down'
                    ? 'Your tracked sessions are grading easier than the month before.'
                    : 'Intensity is holding steady against the month before.'}
              </p>
            )}
          </>
        )}

        {data.runs.length > 0 && (
          <div className={rows.length > 0 ? 'mt-3 border-t-2 border-edge-soft pt-3' : 'mt-2'}>
            <div className="eyebrow text-ink-faint">Runs &amp; rides</div>
            <div className="mt-2">
              <SimpleLine points={weeklyMiles(data, today)} unit=" mi" color="var(--color-accent)" />
            </div>
            <p className="mt-1 text-[11px] font-bold text-ink-faint">Weekly miles, GPS-tracked.</p>
            <div className="mt-2.5">
              {[...data.runs]
                .reverse()
                .slice(0, 8)
                .map((r, i) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setOpenRun(r)}
                    className={`press flex w-full items-center justify-between gap-3 py-2.5 text-left ${
                      i > 0 ? 'border-t-2 border-edge-soft' : ''
                    }`}
                  >
                    <span className="shrink-0 text-[13px] font-extrabold">
                      {runLabel(r)} · {formatShort(r.date)}
                    </span>
                    <span className="num text-right text-[12px] font-bold text-ink-dim">{runSummary(r)}</span>
                  </button>
                ))}
            </div>
          </div>
        )}
      </Tile>

      <Sheet
        open={!!openRun}
        onClose={() => setOpenRun(null)}
        title={openRun ? `${runLabel(openRun)} · ${formatShort(openRun.date)}` : ''}
      >
        {openRun && (
          <div className="space-y-3 pb-8">
            <div className="text-center">
              {hasDistance(openRun) ? (
                <div className="font-display text-[40px] font-bold leading-none">
                  {openRun.distanceMi.toFixed(2)} <span className="text-[18px] text-ink-dim">mi</span>
                </div>
              ) : (
                // No distance means no pace and no speed either. Printing
                // "0.00 mi" three ways over is a receipt for nothing.
                <div className="font-display text-[40px] font-bold leading-none">
                  {fmtDuration(openRun.durationSec)}
                </div>
              )}
              <div className="mt-1.5 text-[12.5px] font-semibold text-ink-dim">{runSummary(openRun)}</div>
            </div>
            {openRun.points.length > 1 && <RunReplay log={openRun} height={240} />}
            {openRun.splits.length > 0 && (
              <div className="overflow-hidden rounded-2xl border-2 border-edge bg-surface-2">
                {openRun.splits.map((s, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between px-4 py-2 ${i > 0 ? 'border-t border-white/[0.05]' : ''}`}
                  >
                    <span className="text-[12.5px] font-bold">Mile {i + 1}</span>
                    <span className="font-mono text-[12px] text-ink-dim">{fmtDuration(s)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Sheet>
    </>
  )
}

function Row({ row }: { row: ActivityRollup }) {
  const bits = [
    row.miles > 0 ? `${row.miles} mi` : null,
    row.steps > 0 ? `${row.steps.toLocaleString()} steps` : null,
    row.kcal > 0 ? `${row.kcal.toLocaleString()} cal` : null,
  ].filter(Boolean)
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-[15px] leading-none">{row.emoji}</span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{row.label}</span>
        <span className="shrink-0 text-[12px] font-bold text-ink-dim">{hours(row.minutes)}</span>
      </div>
      {row.graded > 0 && (
        <div className="mt-1.5 flex h-[3px] gap-px overflow-hidden rounded-full">
          {(['high', 'standard', 'low'] as const).map((tier) =>
            row.mix[tier] > 0 ? (
              <span
                key={tier}
                title={`${row.mix[tier]} ${intensityLabel(tier).toLowerCase()}`}
                className={TIER_COLOR[tier]}
                style={{ flexGrow: row.mix[tier] }}
              />
            ) : null,
          )}
        </div>
      )}
      {bits.length > 0 && (
        <p className="mt-1 text-[11px] font-semibold text-ink-faint">{bits.join(' · ')}</p>
      )}
    </div>
  )
}

/** Minutes as something a person says out loud. */
function hours(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/**
 * Walk and hike used to print as "Run", because the label was a
 * two-way choice made when there were only two activities.
 */
function runLabel(r: RunLog): string {
  return r.activity === 'bike'
    ? 'Ride'
    : r.activity === 'walk'
      ? 'Walk'
      : r.activity === 'hike'
        ? 'Hike'
        : 'Run'
}

/** Did anything actually measure how far this went? */
function hasDistance(r: RunLog): boolean {
  return r.distanceSource !== 'none' && r.distanceMi >= 0.05
}

/**
 * The one-line receipt. A treadmill session has no distance and
 * therefore no pace and no speed, and printing "0.00 mi · 30:00 · --"
 * is three ways of saying nothing. The tracker's own finish screen
 * already knew that; this list did not.
 */
function runSummary(r: RunLog): string {
  if (!hasDistance(r)) {
    const bits = [fmtDuration(r.durationSec)]
    if (r.steps) bits.push(`${r.steps.toLocaleString()} steps`)
    if (r.kcalEst) bits.push(`~${r.kcalEst} cal`)
    return bits.join(' · ')
  }
  const rate = r.activity === 'bike' ? `${avgMph(r.distanceMi, r.durationSec)} mph` : fmtPace(r.avgPaceSec)
  return `${r.distanceMi.toFixed(2)} mi · ${fmtDuration(r.durationSec)} · ${rate}`
}
