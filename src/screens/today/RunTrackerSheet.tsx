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
import { buildShareImage, shareRunCard } from '../../engine/shareCard'
import { saveRun } from '../../logic/actions'
import { Btn } from '../../components/ui'
import { RouteMap } from '../../components/RouteMap'

type Phase = 'acquiring' | 'live' | 'done' | 'denied'

/**
 * Live GPS tracker for outdoor runs and rides — a FULL-SCREEN takeover:
 * the map on top, the numbers underneath, one finish button. Finishing
 * saves the run AND logs the day's cardio, then rolls a social-ready
 * share card (the preview IS the image that gets shared).
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
  const [cardUrl, setCardUrl] = useState<string | null>(null)
  const [shareNote, setShareNote] = useState<string | null>(null)
  const cardBlobRef = useRef<Blob | null>(null)
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
      if (cardUrl) URL.revokeObjectURL(cardUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    void buildShareImage(log).then((blob) => {
      if (!blob) return
      cardBlobRef.current = blob
      setCardUrl(URL.createObjectURL(blob))
    })
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col overflow-y-auto bg-bg">
      <div className="mx-auto flex min-h-full w-full max-w-lg flex-col px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-[max(env(safe-area-inset-top),14px)]">
        {/* Top bar */}
        <div className="flex shrink-0 items-center justify-between py-1">
          <div className="text-[13px] font-bold uppercase tracking-[0.18em] text-ink-dim">{label} tracker</div>
          {phase !== 'live' && (
            <button onClick={onClose} className="rounded-full bg-surface-2 px-4 py-1.5 text-[12px] font-bold text-ink-dim">
              {phase === 'done' ? '✕' : 'Cancel'}
            </button>
          )}
        </div>

        {phase === 'denied' && (
          <div className="flex flex-1 flex-col justify-center">
            <div className="border-l-2 border-danger/70 py-1 pl-3 text-[13px] leading-snug text-danger">
              No GPS available — location permission is off or this device can't provide it. Log the{' '}
              {label.toLowerCase()} manually instead; nothing is lost but the map.
            </div>
            <Btn kind="ghost" className="mt-4 w-full" onClick={onClose}>
              Back
            </Btn>
          </div>
        )}

        {phase === 'acquiring' && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="h-14 w-14 animate-pulse rounded-full border-2 border-accent/50" />
            <p className="mt-5 max-w-[28ch] text-[13.5px] leading-relaxed text-ink-dim">
              Locking onto GPS… step outside for a faster fix. Recording starts on the first fix.
            </p>
          </div>
        )}

        {phase === 'live' && (
          <>
            {/* The map is the view — everything else sits under it */}
            <div className="mt-1 shrink-0 overflow-hidden rounded-2xl border border-edge/80">
              <RouteMap points={points} live height={Math.max(260, Math.round(window.innerHeight * 0.38))} />
            </div>
            <div className="flex flex-1 flex-col justify-center py-3 text-center">
              <div className="font-display text-[64px] font-bold leading-none tabular-nums">{fmtDuration(elapsed)}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-faint">
                recording — screen stays on
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-edge/80 bg-surface px-2 py-4">
                  <div className="font-display text-[34px] font-bold leading-none">{distance.toFixed(2)}</div>
                  <div className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-faint">miles</div>
                </div>
                <div className="rounded-2xl border border-edge/80 bg-surface px-2 py-4">
                  <div className="font-display text-[34px] font-bold leading-none">
                    {activity === 'bike' ? avgMph(distance, elapsed) : fmtPace(pace).replace('/mi', '')}
                  </div>
                  <div className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                    {activity === 'bike' ? 'mph avg' : 'avg pace'}
                  </div>
                </div>
              </div>
            </div>
            <Btn kind="lime" className="w-full shrink-0 py-4 text-[15px]" onClick={finish}>
              Finish {label.toLowerCase()}
            </Btn>
          </>
        )}

        {phase === 'done' && saved && (
          <div className="space-y-3 pb-4">
            <div className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-accent">
              {label} banked ✓ — cardio logged for today
            </div>

            {/* The share card — this exact image is what gets posted */}
            {cardUrl ? (
              <img src={cardUrl} alt="share card" className="w-full rounded-2xl border border-edge/80" />
            ) : (
              <div className="flex aspect-[4/5] w-full items-center justify-center rounded-2xl border border-edge/80 bg-surface text-[12px] text-ink-faint">
                building your card…
              </div>
            )}

            <p className="text-center text-[13px] font-semibold text-ink-dim">
              {saved.distanceMi.toFixed(2)} mi · {fmtDuration(saved.durationSec)} ·{' '}
              {saved.activity === 'bike'
                ? `${avgMph(saved.distanceMi, saved.durationSec)} mph avg`
                : fmtPace(saved.avgPaceSec)}
            </p>

            <div className="flex gap-2">
              <Btn
                className="flex-[2]"
                disabled={!cardUrl}
                onClick={() => {
                  if (!cardBlobRef.current) return
                  void shareRunCard(saved, cardBlobRef.current).then((r) =>
                    setShareNote(r === 'shared' ? 'Shared ✓' : 'Saved to your downloads ✓'),
                  )
                }}
              >
                Share the card
              </Btn>
              <Btn kind="lime" className="flex-1" onClick={onClose}>
                Done
              </Btn>
            </div>
            {shareNote && <p className="text-center text-[11.5px] font-bold text-lime">{shareNote}</p>}

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
          </div>
        )}
      </div>
    </div>
  )
}
