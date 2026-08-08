import { useEffect, useMemo, useRef, useState } from 'react'
import type { Measurement } from '../../types'
import { useAppStore } from '../../store/appStore'
import { addDaysISO, formatShort, todayISO, weekdayOf } from '../../engine/calendar'
import { useToday } from '../../logic/clock'
import {
  adherenceMap,
  currentStreak,
  liftSeries,
  proteinFor,
  repMaxSeries,
  totalSessions,
} from '../../engine/stats'
import { TRACKED_LIFTS } from '../../plan/blocks'
import { Btn, Card, Chip, SectionTitle, Stepper } from '../../components/ui'
import { Sheet } from '../../components/Sheet'
import { Heatmap, SimpleLine } from '../../components/charts'
import { PhotoStore } from '../../store/storage'
import { saveMeasurement, savePhotoFile } from '../../logic/actions'

function usePhotoUrl(id: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let revoked: string | null = null
    if (!id) {
      setUrl(null)
      return
    }
    void PhotoStore.get(id).then((blob) => {
      if (blob) {
        revoked = URL.createObjectURL(blob)
        setUrl(revoked)
      }
    })
    return () => {
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [id])
  return url
}

const METRICS = [
  { key: 'weightLb', label: 'Weight', unit: ' lb', caption: 'Will barely move — that\'s the design. Recomp, not a cut.' },
  { key: 'waistIn', label: 'Waist', unit: '"', caption: 'THE metric. This line falling is the whole recomp.' },
  { key: 'chestIn', label: 'Chest', unit: '"', caption: '' },
  { key: 'armsIn', label: 'Arms', unit: '"', caption: 'Target: 16"' },
  { key: 'thighIn', label: 'Thigh', unit: '"', caption: '' },
  { key: 'vertIn', label: 'Vert / rim', unit: '"', caption: 'Consistent dunks are the goal — track the same touch point.' },
] as const

export function ProgressScreen() {
  const data = useAppStore((s) => s.data)
  const [checkinOpen, setCheckinOpen] = useState(false)
  const [metric, setMetric] = useState<(typeof METRICS)[number]['key']>('waistIn')
  const [lift, setLift] = useState(TRACKED_LIFTS[0].exerciseId)

  const streak = currentStreak(data)
  const sessions = totalSessions(data)
  const heat = useMemo(() => adherenceMap(data, 12 * 7), [data])
  const today = useToday()
  const isCheckinDay = weekdayOf(today) === data.settings.checkinWeekday
  const lastCheckin = data.measurements[data.measurements.length - 1]
  const checkinDue =
    isCheckinDay && (!lastCheckin || lastCheckin.date !== today)

  const metricPoints = useMemo(
    () =>
      data.measurements
        .filter((m) => m[metric] !== undefined)
        .map((m) => ({ date: m.date, value: m[metric]! })),
    [data.measurements, metric],
  )

  const liftPoints = useMemo(() => {
    if (lift === 'pull-up') {
      return repMaxSeries(data, 'pull-up').map((p) => ({ date: p.date, value: p.reps }))
    }
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

  return (
    <div className="space-y-3 pb-6">
      <h1 className="text-[24px] font-black tracking-tight">Progress</h1>

      {checkinDue && (
        <Card className="border-accent/40">
          <p className="text-[13.5px] font-bold text-accent-soft">Weekly check-in day</p>
          <p className="mt-0.5 text-[12px] text-ink-dim">
            Same morning, same conditions. Write it down or it didn't happen.
          </p>
          <Btn className="mt-2.5 w-full" onClick={() => setCheckinOpen(true)}>
            Do the check-in
          </Btn>
        </Card>
      )}

      {/* Records strip */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="!p-3 text-center">
          <div className="text-[22px] font-black text-accent">{streak}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">streak</div>
        </Card>
        <Card className="!p-3 text-center">
          <div className="text-[22px] font-black text-lime">{sessions}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">sessions</div>
        </Card>
        <Card className="!p-3 text-center">
          <div className="text-[22px] font-black text-cyan">{data.measurements.length}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">check-ins</div>
        </Card>
      </div>

      {/* Adherence heatmap */}
      <SectionTitle>Last 12 weeks</SectionTitle>
      <Card>
        <Heatmap days={heat} />
      </Card>

      {/* Body metrics */}
      <SectionTitle
        right={
          !checkinDue ? (
            <button onClick={() => setCheckinOpen(true)} className="text-[11px] font-bold text-cyan underline">
              + log measurements
            </button>
          ) : undefined
        }
      >
        Body
      </SectionTitle>
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
        {METRICS.map((m) => (
          <Chip key={m.key} tone={metric === m.key ? 'accent' : 'default'} onClick={() => setMetric(m.key)}>
            {m.label}
          </Chip>
        ))}
      </div>
      <Card>
        <SimpleLine
          points={metricPoints}
          unit={activeMetric.unit}
          targetValue={metric === 'armsIn' ? 16 : undefined}
          targetLabel={metric === 'armsIn' ? '16" goal' : undefined}
        />
        {activeMetric.caption && (
          <p className="mt-1 text-[11px] font-semibold text-ink-faint">{activeMetric.caption}</p>
        )}
      </Card>

      {/* Strength */}
      <SectionTitle>Strength (est. 1RM)</SectionTitle>
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
        {TRACKED_LIFTS.map((l) => (
          <Chip key={l.exerciseId} tone={lift === l.exerciseId ? 'accent' : 'default'} onClick={() => setLift(l.exerciseId)}>
            {l.label}
          </Chip>
        ))}
        <Chip tone={lift === 'pull-up' ? 'accent' : 'default'} onClick={() => setLift('pull-up')}>
          Pull-ups (reps)
        </Chip>
      </div>
      <Card>
        <SimpleLine points={liftPoints} unit={lift === 'pull-up' ? ' reps' : ' lb'} color="var(--color-lime)" />
        <p className="mt-1 text-[11px] font-semibold text-ink-faint">
          Core movers never rotate — keep adding load and watch this climb.
        </p>
      </Card>

      {/* Protein */}
      <SectionTitle>Protein (last 30 days)</SectionTitle>
      <Card>
        <SimpleLine
          points={proteinPoints}
          unit="g"
          color="var(--color-cyan)"
          targetValue={data.settings.proteinTargetG}
          targetLabel={`${data.settings.proteinTargetG}g`}
        />
      </Card>

      {/* Photos */}
      <SectionTitle>Progress photos</SectionTitle>
      <PhotoCompare measurements={data.measurements} />

      <CheckinSheet open={checkinOpen} onClose={() => setCheckinOpen(false)} last={lastCheckin} />
    </div>
  )
}

// ---------- Check-in sheet ----------

function CheckinSheet({ open, onClose, last }: { open: boolean; onClose: () => void; last?: Measurement }) {
  const fresh = (): Measurement => ({
    date: todayISO(),
    photoIds: {},
    weightLb: last?.weightLb,
    waistIn: last?.waistIn,
    chestIn: last?.chestIn,
    armsIn: last?.armsIn,
    thighIn: last?.thighIn,
    vertIn: last?.vertIn,
  })
  const [m, setM] = useState<Measurement>(fresh)
  const [busy, setBusy] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const angleRef = useRef<'front' | 'side' | 'back'>('front')

  // Re-seed the form (incl. the DATE) each time the sheet opens — the
  // component mounts with the screen, not with the sheet.
  useEffect(() => {
    if (open) setM(fresh())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const fields = [
    { key: 'weightLb', label: 'Weight', step: 0.5, unit: 'lb' },
    { key: 'waistIn', label: 'Waist', step: 0.25, unit: 'in' },
    { key: 'chestIn', label: 'Chest', step: 0.25, unit: 'in' },
    { key: 'armsIn', label: 'Arms', step: 0.25, unit: 'in' },
    { key: 'thighIn', label: 'Thigh', step: 0.25, unit: 'in' },
    { key: 'vertIn', label: 'Vert / rim', step: 0.5, unit: 'in' },
  ] as const

  return (
    <Sheet open={open} onClose={onClose} title="Weekly check-in">
      <div className="space-y-3 pb-6">
        <p className="text-[12px] text-ink-dim">
          Same morning each week, same conditions. Prefilled with last week — adjust what changed.
        </p>
        {fields.map((f) => (
          <div key={f.key} className="flex items-center justify-between">
            <span className="text-[13.5px] font-bold">{f.label}</span>
            <Stepper
              value={m[f.key]}
              onChange={(v) => setM({ ...m, [f.key]: v })}
              step={f.step}
              suffix={f.unit}
              width="w-20"
            />
          </div>
        ))}

        <div className="pt-1">
          <div className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-ink-faint">
            Photos — front, side, back, same lighting
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              const angle = angleRef.current
              setBusy(angle)
              try {
                const meta = await savePhotoFile(f, 'progress')
                setM((prev) => ({ ...prev, photoIds: { ...prev.photoIds, [angle]: meta.id } }))
              } finally {
                setBusy(null)
              }
            }}
          />
          <div className="grid grid-cols-3 gap-2">
            {(['front', 'side', 'back'] as const).map((angle) => (
              <button
                key={angle}
                disabled={busy !== null}
                onClick={() => {
                  angleRef.current = angle
                  fileRef.current?.click()
                }}
                className={`rounded-xl border p-3 text-center text-[12px] font-bold ${
                  m.photoIds[angle] ? 'border-lime/40 bg-lime/8 text-lime' : 'border-edge bg-surface-2 text-ink-dim'
                }`}
              >
                {busy === angle ? 'Saving…' : m.photoIds[angle] ? `✓ ${angle}` : `📷 ${angle}`}
              </button>
            ))}
          </div>
        </div>

        <Btn
          className="w-full"
          onClick={() => {
            saveMeasurement(m)
            onClose()
          }}
        >
          Save check-in
        </Btn>
      </div>
    </Sheet>
  )
}

// ---------- Photo compare ----------

function PhotoCompare({ measurements }: { measurements: Measurement[] }) {
  const withPhotos = measurements.filter((m) => Object.keys(m.photoIds).length > 0)
  const [angle, setAngle] = useState<'front' | 'side' | 'back'>('front')
  const [leftIdx, setLeftIdx] = useState(0)
  const [rightIdx, setRightIdx] = useState(Math.max(0, withPhotos.length - 1))
  const left = withPhotos[leftIdx]
  const right = withPhotos[rightIdx]
  const leftUrl = usePhotoUrl(left?.photoIds[angle])
  const rightUrl = usePhotoUrl(right?.photoIds[angle])

  if (withPhotos.length === 0) {
    return (
      <Card>
        <p className="py-2 text-center text-[12.5px] text-ink-faint">
          No photos yet. The mirror lags the logbook — photos are how you catch it moving.
        </p>
      </Card>
    )
  }

  return (
    <Card className="space-y-2.5">
      <div className="flex gap-1.5">
        {(['front', 'side', 'back'] as const).map((a) => (
          <Chip key={a} tone={angle === a ? 'accent' : 'default'} onClick={() => setAngle(a)}>
            {a}
          </Chip>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { url: leftUrl, m: left, idx: leftIdx, set: setLeftIdx },
          { url: rightUrl, m: right, idx: rightIdx, set: setRightIdx },
        ].map((side, i) => (
          <div key={i}>
            <div className="aspect-[3/4] overflow-hidden rounded-xl border border-edge bg-surface-2">
              {side.url ? (
                <img src={side.url} alt="progress" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-[11px] text-ink-faint">
                  no {angle} photo
                </div>
              )}
            </div>
            <div className="mt-1 flex items-center justify-between">
              <button className="px-2 text-ink-faint" onClick={() => side.set(Math.max(0, side.idx - 1))}>‹</button>
              <span className="text-[10.5px] font-bold text-ink-dim">{side.m ? formatShort(side.m.date) : '—'}</span>
              <button className="px-2 text-ink-faint" onClick={() => side.set(Math.min(withPhotos.length - 1, side.idx + 1))}>›</button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
