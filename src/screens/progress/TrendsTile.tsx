import { useMemo, useState } from 'react'
import type { AppData, ISODate } from '../../types'
import { Chip, Tile } from '../../components/ui'
import { SimpleLine } from '../../components/charts'
import { addDaysISO } from '../../engine/calendar'
import { liftSeries, proteinFor, repMaxSeries } from '../../engine/stats'

// ============================================================
// One chart, one chip row, one object.
//
// Body metrics, strength and protein used to be three separate
// sections, each with its own section title, its own chip row,
// its own card and its own "log at least two entries" empty
// state. Nine blocks down the screen to say one thing three
// times: here is a number over time.
//
// They are the same question, so they are one tile. The lens
// picker on top chooses which family, the chip row underneath
// chooses the line, and there is exactly one chart and one
// empty state on the screen at any moment.
// ============================================================

const METRICS = [
  { key: 'weightLb', label: 'Weight', unit: ' lb', caption: "Will barely move, that's the design. Recomp, not a cut." },
  { key: 'bodyFatPct', label: 'Body fat', unit: '%', caption: 'Target: 10% or less. Same method, same morning. The trend is the truth.' },
  { key: 'waistIn', label: 'Waist', unit: '"', caption: 'THE metric. This line falling is the whole recomp.' },
  { key: 'chestIn', label: 'Chest', unit: '"', caption: '' },
  { key: 'armsIn', label: 'Arms', unit: '"', caption: 'Target: 16"' },
  { key: 'thighIn', label: 'Thigh', unit: '"', caption: '' },
  { key: 'vertIn', label: 'Vert / rim', unit: '"', caption: 'Consistent dunks are the goal. Track the same touch point.' },
] as const

type MetricKey = (typeof METRICS)[number]['key']
type Lens = 'body' | 'lifts' | 'fuel'

const LENSES: { id: Lens; label: string }[] = [
  { id: 'body', label: 'Body' },
  { id: 'lifts', label: 'Lifts' },
  { id: 'fuel', label: 'Fuel' },
]

/**
 * Captions speak to the USER's booklet: custom targets win, then the goal
 * statement for the metric closest to their goal; the owner's NAOD preset
 * keeps its original captions.
 */
function captionFor(data: AppData, key: string, fallback: string): string {
  const plan = data.plan
  if (plan.name.startsWith('NAOD')) return fallback
  const hint =
    key === 'vertIn' ? 'vert'
    : key === 'armsIn' ? 'arm'
    : key === 'waistIn' ? 'waist'
    : key === 'weightLb' ? 'weight'
    : key === 'bodyFatPct' ? 'fat'
    : '␀'
  const t = plan.customTargets.find((c) => c.label.toLowerCase().includes(hint))
  if (t) return `Target: ${t.target}${t.unit} · “${plan.goalStatement}”`
  if (key === 'vertIn' && (plan.goal === 'vertical' || plan.goal === 'speed')) {
    return `“${plan.goalStatement}”. Track the same touch point every time.`
  }
  if (key === 'waistIn' && plan.goal === 'lean') return 'THE metric for your cut. This line falling is the whole goal.'
  if (key === 'weightLb' && plan.goal === 'muscle') return 'Should trend UP slowly. Muscle is built, not wished for.'
  return ''
}

export function TrendsTile({
  data,
  today,
  onLogMeasurements,
}: {
  data: AppData
  today: ISODate
  /** The one thing that fills the body lens up: the check-in. */
  onLogMeasurements: () => void
}) {
  const [lens, setLens] = useState<Lens>('body')
  const [metric, setMetric] = useState<MetricKey>('waistIn')
  const [lift, setLift] = useState(data.plan.trackedLifts[0]?.exerciseId ?? 'front-squat')

  const metricPoints = useMemo(
    () =>
      data.measurements
        .filter((m) => m[metric] !== undefined)
        .map((m) => ({ date: m.date, value: m[metric]! })),
    [data.measurements, metric],
  )

  const liftPoints = useMemo(() => {
    if (lift === 'pull-up') return repMaxSeries(data, 'pull-up').map((p) => ({ date: p.date, value: p.reps }))
    return liftSeries(data, lift).map((p) => ({ date: p.date, value: p.e1rm }))
  }, [data, lift])

  const proteinPoints = useMemo(() => {
    const pts: { date: string; value: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = addDaysISO(today, -i)
      const p = proteinFor(data, d)
      if (p > 0) pts.push({ date: d, value: p })
    }
    return pts
  }, [data, today])

  const activeMetric = METRICS.find((m) => m.key === metric)!

  // One line at a time, and everything the chart needs to draw it. The
  // three old sections differed only in these five values.
  const shown =
    lens === 'body'
      ? {
          points: metricPoints,
          unit: activeMetric.unit,
          color: undefined,
          targetValue: metric === 'armsIn' ? 16 : undefined,
          targetLabel: metric === 'armsIn' ? '16" goal' : undefined,
          caption: captionFor(data, activeMetric.key, activeMetric.caption),
        }
      : lens === 'lifts'
        ? {
            points: liftPoints,
            unit: lift === 'pull-up' ? ' reps' : ' lb',
            color: 'var(--color-lime)',
            targetValue: undefined,
            targetLabel: undefined,
            caption: 'Core movers never rotate. Keep adding load and watch this climb.',
          }
        : {
            points: proteinPoints,
            unit: 'g',
            color: 'var(--color-cyan)',
            targetValue: data.settings.proteinTargetG,
            targetLabel: `${data.settings.proteinTargetG}g`,
            caption: 'Last 30 days. The floor is the number that matters, not the average.',
          }

  return (
    <Tile>
      <div className="flex items-baseline justify-between gap-3">
        <div className="eyebrow text-ink-faint">Trends</div>
        <button onClick={onLogMeasurements} className="press text-[11px] font-bold text-cyan underline">
          + log measurements
        </button>
      </div>

      <div className="mt-2 flex gap-1.5">
        {LENSES.map((l) => (
          <Chip key={l.id} tone={lens === l.id ? 'accent' : 'default'} pressed={lens === l.id} onClick={() => setLens(l.id)}>
            {l.label}
          </Chip>
        ))}
      </div>

      {lens === 'body' && (
        <div className="no-scrollbar -mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1">
          {METRICS.map((m) => (
            <Chip key={m.key} tone={metric === m.key ? 'cyan' : 'default'} pressed={metric === m.key} onClick={() => setMetric(m.key)}>
              {m.label}
            </Chip>
          ))}
        </div>
      )}
      {lens === 'lifts' && (
        <div className="no-scrollbar -mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1">
          {data.plan.trackedLifts.map((l) => (
            <Chip
              key={l.exerciseId}
              tone={lift === l.exerciseId ? 'cyan' : 'default'}
              pressed={lift === l.exerciseId}
              onClick={() => setLift(l.exerciseId)}
            >
              {l.label}
            </Chip>
          ))}
          <Chip tone={lift === 'pull-up' ? 'cyan' : 'default'} pressed={lift === 'pull-up'} onClick={() => setLift('pull-up')}>
            Pull-ups (reps)
          </Chip>
        </div>
      )}

      <div className="mt-3">
        <SimpleLine
          points={shown.points}
          unit={shown.unit}
          color={shown.color}
          targetValue={shown.targetValue}
          targetLabel={shown.targetLabel}
        />
      </div>
      {shown.caption && (
        <p className="mt-1.5 text-[11px] font-semibold text-ink-faint">{shown.caption}</p>
      )}
    </Tile>
  )
}
