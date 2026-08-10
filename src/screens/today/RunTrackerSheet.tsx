import { useEffect, useRef, useState } from 'react'
import type { ISODate, RunLog, RunPoint } from '../../types'
import { uid } from '../../store/appStore'
import {
  acceptFix,
  avgMph,
  buildRunLog,
  fmtDuration,
  fmtPace,
  paceSecPerMi,
  totalDistanceMi,
} from '../../engine/runs'
import { saveRun } from '../../logic/actions'
import { Btn } from '../../components/ui'
import { Sheet } from '../../components/Sheet'
import { RouteMap } from '../../components/RouteMap'

type Phase = 'acquiring' | 'live' | 'done' | 'denied'

/**
 * Live GPS tracker for outdoor runs and rides: time, distance, pace
 * (or mph for rides), splits, and the route on a map. Finishing saves
 * the run AND logs the day's cardio entry — one workflow, no double
 * bookkeeping. Screen stays awake while recording where supported.
 */
export function RunTrackerSheet({
  activity,
  date,
  onClose,
}: {
  activity: 'run' | 'bike'
  date: ISODate
  onClose: () => void
}) {
  const [phase, setPhase] = useState<Phase>('acquiring')
  const [elapsed, setElapsed] = useState(0)
  const [, forceRender] = useState(0)
  const [saved, setSaved] = useState<RunLog | null>(null)
  const pointsRef = useRef<RunPoint[]>([])
  const startRef = useRef<number | null>(null)
  const startedAtIso = useRef('')
  const watchRef = useRef<number | null>(null)
  const wakeRef = useRef<{ release?: () => Promise<void> } | null>(null)

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setPhase('denied')
      return
    }
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (startRef.current === null) {
          startRef.current = Date.now()
          startedAtIso.current = new Date().toISOString()
          setPhase('live')
          type WakeNav = Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
          void (navigator as WakeNav).wakeLock
            ?.request('screen')
            .then((s) => { wakeRef.current = s })
            .catch(() => {})
        }
        const t = (Date.now() - startRef.current) / 1000
        const prev = pointsRef.current[pointsRef.current.length - 1] ?? null
        if (acceptFix(prev, pos.coords.latitude, pos.coords.longitude, t, pos.coords.accuracy ?? 99)) {
          pointsRef.current.push([pos.coords.latitude, pos.coords.longitude, Math.round(t)])
          forceRender((n) => n + 1)
        }
      },
      () => setPhase((p) => (p === 'acquiring' ? 'denied' : p)),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 },
    )
    const tick = setInterval(() => {
      if (startRef.current !== null) setElapsed((Date.now() - startRef.current) / 1000)
    }, 1000)
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
      clearInterval(tick)
      void wakeRef.current?.release?.()
    }
  }, [])

  const points = pointsRef.current
  const distance = totalDistanceMi(points)
  const pace = paceSecPerMi(distance, elapsed)
  const label = activity === 'run' ? 'Run' : 'Ride'

  function finish() {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
    void wakeRef.current?.release?.()
    const log = buildRunLog(uid(), activity, date, startedAtIso.current, elapsed, points)
    saveRun(log)
    setSaved(log)
    setPhase('done')
  }

  return (
    <Sheet open onClose={phase === 'live' ? () => {} : onClose} locked={phase === 'live'} title={`${label} tracker`}>
      <div className="space-y-4 pb-8">
        {phase === 'denied' && (
          <>
            <div className="border-l-2 border-danger/70 py-1 pl-3 text-[12.5px] leading-snug text-danger">
              No GPS available — location permission is off or this device can't provide it. Log the{' '}
              {label.toLowerCase()} manually instead; nothing is lost but the map.
            </div>
            <Btn kind="ghost" className="w-full" onClick={onClose}>
              Back
            </Btn>
          </>
        )}

        {phase === 'acquiring' && (
          <>
            <p className="py-6 text-center text-[13px] text-ink-dim">
              Locking onto GPS… step outside for a faster fix. Recording starts on the first fix.
            </p>
            <Btn kind="ghost" className="w-full" onClick={onClose}>
              Cancel
            </Btn>
          </>
        )}

        {phase === 'live' && (
          <>
            <div className="text-center">
              <div className="font-display text-[56px] font-bold leading-none tabular-nums">
                {fmtDuration(elapsed)}
              </div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-faint">
                recording — screen stays on
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-edge/80 bg-surface px-2 py-3 text-center">
                <div className="font-display text-[22px] font-bold leading-none">{distance.toFixed(2)}</div>
                <div className="mt-1 text-[9.5px] font-bold uppercase tracking-wider text-ink-faint">miles</div>
              </div>
              <div className="rounded-2xl border border-edge/80 bg-surface px-2 py-3 text-center">
                <div className="font-display text-[22px] font-bold leading-none">
                  {activity === 'bike' ? avgMph(distance, elapsed) : fmtPace(pace).replace('/mi', '')}
                </div>
                <div className="mt-1 text-[9.5px] font-bold uppercase tracking-wider text-ink-faint">
                  {activity === 'bike' ? 'mph avg' : 'avg pace'}
                </div>
              </div>
              <div className="rounded-2xl border border-edge/80 bg-surface px-2 py-3 text-center">
                <div className="font-display text-[22px] font-bold leading-none">{points.length}</div>
                <div className="mt-1 text-[9.5px] font-bold uppercase tracking-wider text-ink-faint">gps fixes</div>
              </div>
            </div>
            <RouteMap points={points} live height={200} />
            <Btn kind="lime" className="w-full py-4 text-[15px]" onClick={finish}>
              Finish {label.toLowerCase()}
            </Btn>
          </>
        )}

        {phase === 'done' && saved && (
          <>
            <div className="text-center">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">
                {label} banked ✓ — cardio logged for today
              </div>
              <div className="mt-2 font-display text-[44px] font-bold leading-none">
                {saved.distanceMi.toFixed(2)} <span className="text-[20px] text-ink-dim">mi</span>
              </div>
              <div className="mt-1.5 text-[13px] font-semibold text-ink-dim">
                {fmtDuration(saved.durationSec)} ·{' '}
                {saved.activity === 'bike'
                  ? `${avgMph(saved.distanceMi, saved.durationSec)} mph avg`
                  : fmtPace(saved.avgPaceSec)}
              </div>
            </div>
            <RouteMap points={saved.points} height={220} />
            {saved.splits.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-edge/80 bg-surface">
                {saved.splits.map((s, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between px-4 py-2 ${i > 0 ? 'border-t border-edge/50' : ''}`}
                  >
                    <span className="text-[12.5px] font-bold">Mile {i + 1}</span>
                    <span className="font-mono text-[12px] text-ink-dim">{fmtDuration(s)}</span>
                  </div>
                ))}
              </div>
            )}
            <Btn kind="lime" className="w-full" onClick={onClose}>
              Done
            </Btn>
          </>
        )}
      </div>
    </Sheet>
  )
}
