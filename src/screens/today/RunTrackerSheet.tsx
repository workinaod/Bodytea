import { useEffect, useMemo, useRef, useState } from 'react'
import type { ISODate, RunLog, RunPoint } from '../../types'
import { uid } from '../../store/appStore'
import {
  acceptFix,
  avgMph,
  buildRunLog,
  estKcal,
  fmtDuration,
  fmtPace,
  paceSecPerMi,
  runGoalReview,
  totalDistanceMi,
} from '../../engine/runs'
import { buildShareImage, shareRunCard } from '../../engine/shareCard'
import { reactionForRun, type Reaction } from '../../engine/reactions'
import { saveRun } from '../../logic/actions'
import { useAppStore } from '../../store/appStore'
import { Btn } from '../../components/ui'
import { RouteMap } from '../../components/RouteMap'
import { RunReactionCard } from '../../components/RunReactionCard'

type Phase = 'acquiring' | 'live' | 'done' | 'denied'

/**
 * Live GPS tracker for outdoor runs and rides, a FULL-SCREEN takeover:
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
  const [reaction, setReaction] = useState<Reaction | null>(null)
  const pastRuns = useAppStore((s) => s.data.runs)
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
  const mph = avgMph(distance, elapsed)
  const bodyweight = useAppStore(
    (st) => [...st.data.measurements].reverse().find((m) => m.weightLb !== undefined)?.weightLb ?? 175,
  )
  const liveKcal = estKcal(activity, distance, elapsed, bodyweight)
  const label = activity === 'run' ? 'Run' : 'Ride'

  const [scrapped, setScrapped] = useState(false)
  // Goal check-in: composed once per finished run against live app data
  const review = useMemo(
    () => (saved ? runGoalReview(useAppStore.getState().data, saved) : null),
    [saved],
  )

  function finish() {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
    void wakeRef.current?.release?.()
    // False start: nothing moved, seconds on the clock, log NOTHING.
    if (totalDistanceMi(pointsRef.current) < 0.05 && elapsed < 120) {
      setScrapped(true)
      setPhase('done')
      return
    }
    const log = buildRunLog(uid(), activity, date, startedAtIso.current, elapsed, points)
    const rx = reactionForRun(log, pastRuns)
    saveRun(log)
    setSaved(log)
    setReaction(rx)
    setPhase('done')
    void buildShareImage(log, rx).then((blob) => {
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
            <button onClick={onClose} className="rounded-full bg-white/[0.07] px-4 py-1.5 text-[12px] font-bold text-ink-dim">
              {phase === 'done' ? '✕' : 'Cancel'}
            </button>
          )}
        </div>

        {phase === 'denied' && (
          <div className="flex flex-1 flex-col justify-center">
            <div className="border-l-2 border-danger/70 py-1 pl-3 text-[13px] leading-snug text-danger">
              No GPS. Location permission is off or this device can't provide it. Log the{' '}
              {label.toLowerCase()} manually instead, you only lose the map.
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
            {/* The map IS the screen, stats ride in a compact band below */}
            <div className="mt-1 shrink-0 overflow-hidden rounded-2xl border border-edge/80">
              <RouteMap points={points} live height={Math.max(300, Math.round(window.innerHeight * 0.54))} />
            </div>
            <div className="flex flex-1 items-center justify-between gap-3 py-3">
              <div>
                <div className="font-display text-[46px] font-bold leading-none tabular-nums">{fmtDuration(elapsed)}</div>
                {liveKcal > 0 && (
                  <div className="mt-1 text-[12px] font-bold text-ink-dim">~{liveKcal} cal</div>
                )}
                <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-ink-faint">
                  recording, screen stays on
                </div>
              </div>
              <div className="flex gap-3.5 text-right">
                <div>
                  <div className="font-display text-[24px] font-bold leading-none">{distance.toFixed(2)}</div>
                  <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-ink-faint">mi</div>
                </div>
                <div>
                  <div className="font-display text-[24px] font-bold leading-none">{fmtPace(pace).replace('/mi', '')}</div>
                  <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-ink-faint">pace</div>
                </div>
                <div>
                  <div className="font-display text-[24px] font-bold leading-none">{mph}</div>
                  <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-ink-faint">mph</div>
                </div>
              </div>
            </div>
            <Btn kind="lime" className="w-full shrink-0 py-4 text-[15px]" onClick={finish}>
              Finish {label.toLowerCase()}
            </Btn>
          </>
        )}

        {phase === 'done' && scrapped && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="text-[13px] font-black uppercase tracking-[0.2em] text-ink-faint">False start</div>
            <p className="mt-3 max-w-[30ch] text-[13.5px] leading-relaxed text-ink-dim">
              Nothing moved yet, so nothing was logged. Step outside, let the dot find you, and give it a
              real go.
            </p>
            <Btn kind="ghost" className="mt-6 w-full max-w-xs" onClick={onClose}>
              Done
            </Btn>
          </div>
        )}

        {phase === 'done' && !scrapped && saved && (
          <div className="space-y-3 pb-4">
            <div className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-accent">
              {label} banked ✓, cardio logged for today
            </div>

            {/* The live card, reaction plays behind the route; the shared
                PNG freezes this exact frame */}
            {reaction && <RunReactionCard log={saved} reaction={reaction} />}

            <p className="text-center text-[13px] font-semibold text-ink-dim">
              {saved.distanceMi.toFixed(2)} mi · {fmtDuration(saved.durationSec)} · {fmtPace(saved.avgPaceSec)} ·{' '}
              {avgMph(saved.distanceMi, saved.durationSec)} mph
              {(saved.kcalEst ?? 0) > 0 && ` · ~${saved.kcalEst} cal`}
            </p>

            {review && (
              <div className="rounded-2xl bg-white/[0.045] p-4 ring-1 ring-white/[0.05]">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gold">{review.title}</p>
                <div className="mt-2.5 space-y-1.5">
                  {review.rows.map((r) => (
                    <div key={r.label} className="flex items-baseline justify-between gap-3 text-[12.5px]">
                      <span className="font-semibold text-ink-faint">{r.label}</span>
                      <span className="text-right font-bold">{r.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 space-y-2 border-t border-white/[0.05] pt-3">
                  {review.notes.map((n, i) => (
                    <p key={i} className="text-[12px] leading-snug text-ink-dim">{n}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Btn
                className="flex-[2]"
                disabled={!cardUrl}
                onClick={() => {
                  if (!cardBlobRef.current) return
                  void shareRunCard(saved, cardBlobRef.current).then((r) => {
                    if (r === 'cancelled') return
                    setShareNote(r === 'shared' ? 'Shared ✓' : 'Saved to your downloads ✓')
                  })
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
              <div className="overflow-hidden rounded-2xl bg-white/[0.045] ring-1 ring-white/[0.05]">
                {saved.splits.map((s, i) => (
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
      </div>
    </div>
  )
}
