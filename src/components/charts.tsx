import type { DayAdherence } from '../engine/stats'
import { formatShort } from '../engine/calendar'

// ============================================================
// Hand-rolled SVG charts — a line chart and a calendar heatmap
// are all this app needs; no chart library required.
// ============================================================

export interface LinePoint {
  date: string
  value: number
}

export function SimpleLine({
  points,
  color = 'var(--color-accent)',
  unit = '',
  height = 140,
  targetValue,
  targetLabel,
}: {
  points: LinePoint[]
  color?: string
  unit?: string
  height?: number
  targetValue?: number
  targetLabel?: string
}) {
  if (points.length < 2) {
    return (
      <div className="flex h-[100px] items-center justify-center text-[12px] text-ink-faint">
        Log at least two entries to draw the trend.
      </div>
    )
  }
  const W = 340
  const H = height
  const PAD = { l: 34, r: 10, t: 12, b: 22 }
  const values = points.map((p) => p.value)
  let min = Math.min(...values, targetValue ?? Infinity)
  let max = Math.max(...values, targetValue ?? -Infinity)
  if (max - min < 1) {
    min -= 1
    max += 1
  }
  const span = max - min
  min -= span * 0.12
  max += span * 0.12
  const x = (i: number) => PAD.l + (i / (points.length - 1)) * (W - PAD.l - PAD.r)
  const y = (v: number) => PAD.t + (1 - (v - min) / (max - min)) * (H - PAD.t - PAD.b)
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const last = points[points.length - 1]
  const first = points[0]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1={PAD.l}
          x2={W - PAD.r}
          y1={PAD.t + f * (H - PAD.t - PAD.b)}
          y2={PAD.t + f * (H - PAD.t - PAD.b)}
          stroke="var(--color-edge)"
          strokeWidth="0.6"
        />
      ))}
      {targetValue !== undefined && (
        <>
          <line
            x1={PAD.l}
            x2={W - PAD.r}
            y1={y(targetValue)}
            y2={y(targetValue)}
            stroke="var(--color-lime)"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity="0.6"
          />
          {targetLabel && (
            <text x={W - PAD.r} y={y(targetValue) - 4} textAnchor="end" className="fill-lime" fontSize="9" fontWeight="700">
              {targetLabel}
            </text>
          )}
        </>
      )}
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r={i === points.length - 1 ? 4 : 2.5} fill={color} />
      ))}
      <text x={PAD.l - 6} y={y(points[0].value) + 3} textAnchor="end" className="fill-ink-faint" fontSize="9.5" fontWeight="600">
        {first.value}
      </text>
      <text x={W - PAD.r} y={y(last.value) - 8} textAnchor="end" fill={color} fontSize="11" fontWeight="800">
        {last.value}
        {unit}
      </text>
      <text x={PAD.l} y={H - 6} className="fill-ink-faint" fontSize="9">
        {formatShort(first.date)}
      </text>
      <text x={W - PAD.r} y={H - 6} textAnchor="end" className="fill-ink-faint" fontSize="9">
        {formatShort(last.date)}
      </text>
    </svg>
  )
}

const ADHERENCE_COLORS: Record<DayAdherence, string> = {
  done: 'var(--color-lime)',
  partial: 'var(--color-gold)',
  skipped: 'var(--color-danger)',
  missed: '#7a2030',
  rest: 'var(--color-surface-2)',
  future: 'var(--color-edge)',
}

/** Calendar heatmap: columns = weeks (Mon-start), rows = Mon..Sun. */
export function Heatmap({ days }: { days: { date: string; state: DayAdherence }[] }) {
  if (!days.length) return null
  // pad the front so the first column starts on Monday
  const firstWd = new Date(days[0].date + 'T00:00').getDay()
  const lead = (firstWd + 6) % 7
  const cells: ({ date: string; state: DayAdherence } | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...days,
  ]
  const weeks: (typeof cells)[] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  const S = 13
  const G = 3
  return (
    <div className="overflow-x-auto no-scrollbar">
      <svg
        width={weeks.length * (S + G) + 4}
        height={7 * (S + G) + 4}
        className="block"
      >
        {weeks.map((col, wi) =>
          col.map((cell, di) =>
            cell ? (
              <rect
                key={`${wi}-${di}`}
                x={wi * (S + G) + 2}
                y={di * (S + G) + 2}
                width={S}
                height={S}
                rx={3.5}
                fill={ADHERENCE_COLORS[cell.state]}
                opacity={cell.state === 'rest' ? 0.5 : 1}
              />
            ) : null,
          ),
        )}
      </svg>
      <div className="mt-1.5 flex items-center gap-3 text-[10px] font-semibold text-ink-faint">
        <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: ADHERENCE_COLORS.done }} /> done</span>
        <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: ADHERENCE_COLORS.partial }} /> partial</span>
        <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: ADHERENCE_COLORS.skipped }} /> skipped</span>
        <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: ADHERENCE_COLORS.missed }} /> ghosted</span>
      </div>
    </div>
  )
}
