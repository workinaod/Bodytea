import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ISODate, RunLog, RunPoint } from '../../types'
import type { GpsActivity } from '../../activityTypes'
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
import { saveRun, setRunFeltIntensity } from '../../logic/actions'
import type { Intensity } from '../../engine/intensity'
import { IntensityAsk } from './IntensityAsk'
import { useAppStore } from '../../store/appStore'
import { Btn } from '../../components/ui'
import { MAX_ZOOM, MIN_ZOOM, RouteMap } from '../../components/RouteMap'
import { RunReactionCard } from '../../components/RunReactionCard'
import { acceptsAltitude, currentGradePct, elevationStats } from '../../engine/elevation'
import { requestMotionPermission, startStepCounter, type StepCounter } from '../../platform/motion'
import { askState } from '../../platform/permissions'
import { stepDistanceMi, tracksSteps } from '../../engine/intensity'

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
  activity: GpsActivity
  date: ISODate
  onClose: () => void
}) {
  // Pinned when the screen opens. `date` comes from useToday(), which
  // ticks over at midnight, so a run started at 23:50 and finished at
  // 00:10 was filed under the new day while its own startedAt said the
  // old one. The session belongs to the day it began.
  const logDate = useRef(date)
  const [phase, setPhase] = useState<Phase>('acquiring')
  const [elapsed, setElapsed] = useState(0)
  // Street level by default: close enough to read the road you are on.
  const [zoom, setZoom] = useState(17)
  const stepsRef = useRef<StepCounter | null>(null)
  const [, forceRender] = useState(0)
  const [saved, setSaved] = useState<RunLog | null>(null)
  const [reaction, setReaction] = useState<Reaction | null>(null)
  const pastRuns = useAppStore((s) => s.data.runs)
  const [cardUrl, setCardUrl] = useState<string | null>(null)
  // The unmount cleanup runs with the deps it was created with, and that
  // effect has none, so it closed over cardUrl from the first render:
  // always null, so the blob URL was never revoked.
  const cardUrlRef = useRef<string | null>(null)
  const [shareNote, setShareNote] = useState<string | null>(null)
  const cardBlobRef = useRef<Blob | null>(null)
  const pointsRef = useRef<RunPoint[]>([])
  const startRef = useRef<number | null>(null)
  const startedAtIso = useRef('')
  const watchRef = useRef<number | null>(null)
  const wakeRef = useRef<{ release?: () => Promise<void> } | null>(null)

  // Steps run alongside GPS from the first moment. A treadmill gives the
  // satellites nothing to work with, so the pedometer is what turns an
  // indoor session from "0.00 mi" into real distance.
  //
  // Not on a bike, though. Nobody takes a step riding one, and the table
  // in plan/cardio.ts says so. Counting anyway meant a trainer session
  // indoors banked accelerometer vibration as thousands of "steps",
  // converted them at a WALKING stride, and reported miles that were
  // road buzz. The counter now starts only where footfalls exist.
  const countsSteps = tracksSteps(activity)
  useEffect(() => {
    if (!countsSteps) return
    let live = true
    // iOS only reports motion when the request came out of a user
    // gesture, and this effect runs after paint — outside that window.
    // For anyone who said yes on the last onboarding screen the answer
    // is already known, so the counter starts without asking again;
    // everyone else still gets the best-effort request, which is what
    // Android and desktop have always needed.
    const asked = askState('motion') === 'granted' ? Promise.resolve(true) : requestMotionPermission()
    void asked.then((ok) => {
      // The permission prompt can resolve after the screen is gone. Without
      // this the listener attaches to a dead component and never comes off.
      if (ok && live) stepsRef.current = startStepCounter()
      else if (ok) startStepCounter().stop()
    })
    return () => {
      live = false
      stepsRef.current?.stop()
    }
  }, [countsSteps])

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
          // Altitude is gated separately from position: the same fix can
          // be solid horizontally and useless vertically, and a point
          // stored with a junk altitude is worse than one stored with
          // none — the smoothing can bridge a gap, it cannot un-invent
          // a 15 m spike.
          const alt = acceptsAltitude(pos.coords.altitude, pos.coords.altitudeAccuracy)
            ? pos.coords.altitude ?? undefined
            : undefined
          pointsRef.current.push(
            alt === undefined
              ? [pos.coords.latitude, pos.coords.longitude, Math.round(t)]
              : [pos.coords.latitude, pos.coords.longitude, Math.round(t), Math.round(alt * 10) / 10],
          )
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
      if (cardUrlRef.current) URL.revokeObjectURL(cardUrlRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const points = pointsRef.current
  const bodyweight = useAppStore(
    (st) => [...st.data.measurements].reverse().find((m) => m.weightLb !== undefined)?.weightLb ?? 175,
  )
  // Stride length scales with height, so indoor distance needs it.
  const heightIn = useAppStore((st) => st.data.profile.heightIn)

  // Read straight off the counter. It lives in a ref, but the one-second
  // clock below re-renders this component anyway, so the number on screen
  // is never more than a second stale.
  const liveSteps = countsSteps ? (stepsRef.current?.steps() ?? 0) : 0

  // Distance, best evidence first — the SAME rule finish() banks by, so
  // the live number and the saved one can never disagree.
  //
  // Four walls block GPS. Someone doing laps in a garage produces no
  // fixes worth crediting, so distance stayed 0.00, pace stayed "--"
  // and speed stayed 0 for the whole session while they ran. The
  // pedometer saw every one of those steps the entire time.
  const gpsMi = totalDistanceMi(points)
  const stepMi = countsSteps ? stepDistanceMi(activity, liveSteps, heightIn) : null
  const fromSteps = gpsMi < 0.05 && stepMi !== null && stepMi > 0
  const distance = fromSteps ? (stepMi as number) : gpsMi
  const pace = paceSecPerMi(distance, elapsed)
  const mph = avgMph(distance, elapsed)
  // Recomputed on every fix, so climb, grade and calories move while
  // the session is running rather than appearing at the finish.
  const elev = useMemo(() => elevationStats(points), [points, points.length])
  const grade = useMemo(() => currentGradePct(points), [points, points.length])
  const liveKcal = estKcal(activity, distance, elapsed, bodyweight, elev.gainM)
  const label = activity === 'run' ? 'Run' : activity === 'bike' ? 'Ride' : activity === 'hike' ? 'Hike' : 'Walk'

  // The map is the whole screen while recording. It used to be the
  // viewport MINUS the furniture — a stats band and a button below it —
  // which cost a third of the display and still left the clock pressed
  // against the bottom edge. The furniture floats on top of it now.
  const vw = typeof window !== 'undefined' ? window.innerWidth : 390
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800

  const [scrapped, setScrapped] = useState(false)
  const [felt, setFelt] = useState<Intensity | undefined>(undefined)
  // Goal check-in: composed once per finished run against live app data
  const review = useMemo(
    () => (saved ? runGoalReview(useAppStore.getState().data, saved) : null),
    [saved],
  )

  function finish() {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
    void wakeRef.current?.release?.()
    const steps = stepsRef.current?.steps() ?? 0
    stepsRef.current?.stop()
    const gpsMi = totalDistanceMi(pointsRef.current)

    // False start: nothing moved AND nobody took a step AND barely any
    // time on the clock. Anything else is real work and gets logged.
    if (gpsMi < 0.05 && steps < 50 && elapsed < 120) {
      setScrapped(true)
      setPhase('done')
      return
    }
    const log = buildRunLog(uid(), activity, logDate.current, startedAtIso.current, elapsed, points)

    // A treadmill moves the body without moving the phone, so GPS reports
    // nothing for a genuine session. When the satellites saw no distance
    // but the pedometer did, count the steps and say where the number
    // came from rather than banking a run of 0.00 miles.
    // Each activity converts at its OWN stride: a hiking step over
    // uneven ground is not a walking step, and this used to hand both
    // of them the walking figure.
    // Same rule the live readout uses, so what was on screen for the
    // whole session is what gets banked. The old `steps >= 50` gate
    // here was a second, stricter threshold on top of the one inside
    // stepDistanceMi, and between them a real indoor session could
    // watch its distance climb and then save as 0.00 mi.
    const finalStepMi = countsSteps ? stepDistanceMi(activity, steps, heightIn) : null
    if (gpsMi < 0.05 && finalStepMi !== null && finalStepMi > 0) {
      log.steps = steps
      log.distanceMi = finalStepMi
      log.distanceSource = 'steps'
      log.avgPaceSec = log.distanceMi > 0 ? Math.round(elapsed / log.distanceMi) : 0
    } else {
      log.distanceSource = gpsMi >= 0.05 ? 'gps' : 'none'
      if (steps > 0) log.steps = steps
    }
    const rx = reactionForRun(log, pastRuns)
    saveRun(log)
    setSaved(log)
    setReaction(rx)
    setPhase('done')
    void buildShareImage(log, rx).then((blob) => {
      if (!blob) return
      cardBlobRef.current = blob
      cardUrlRef.current = URL.createObjectURL(blob)
      setCardUrl(cardUrlRef.current)
    })
  }

  // Portalled: this is rendered from inside CardioSheet, whose
  // backdrop-blur makes it the containing block for fixed children.
  // Without this the full-screen tracker is trapped in the sheet.
  return createPortal(
    <div className="fixed inset-0 z-[80] bg-bg">
      {phase === 'live' && (
        // Recording runs edge to edge: the map fills the screen and the
        // numbers, zoom and finish button all float on top of it. This
        // sits OUTSIDE the padded column below on purpose — inside it,
        // the map could never reach the edges.
        <div className="absolute inset-0">
          <RouteMap points={points} live follow pannable flush zoom={zoom} width={vw} height={vh} />

          {/* Zoom, held clear of the notch */}
          <div className="absolute right-3 top-[max(env(safe-area-inset-top),14px)] flex flex-col overflow-hidden rounded-xl bg-black/55 ring-1 ring-white/15 backdrop-blur-sm">
            <button
              aria-label="Zoom in"
              onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 1))}
              className="press h-9 w-9 text-[18px] font-bold text-white/90"
            >
              +
            </button>
            <span aria-hidden className="h-px bg-white/15" />
            <button
              aria-label="Zoom out"
              onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 1))}
              className="press h-9 w-9 text-[18px] font-bold text-white/90"
            >
              −
            </button>
          </div>

          {/* Everything else rides the bottom over a gradient dark enough
              to hold white numerals against bright aerial imagery. */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/85 to-transparent px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-14">
            <div className="mx-auto w-full max-w-lg">
              <div className="flex items-end justify-between gap-3 pb-2">
                <div>
                  <div className="num text-[46px] font-bold leading-none text-white">{fmtDuration(elapsed)}</div>
                  <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-white/55">
                    recording{liveKcal > 0 ? ` · ~${liveKcal} cal` : ''}
                  </div>
                </div>
                <div className="flex gap-3.5 text-right">
                  <div>
                    <div className="num text-[24px] font-bold leading-none text-white">{distance.toFixed(2)}</div>
                    {/* Says where the number came from. Indoors this is
                        stride arithmetic, not a measured route, and the
                        label is how the athlete can tell. */}
                    <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-white/55">
                      {fromSteps ? 'mi · steps' : 'mi'}
                    </div>
                  </div>
                  <div>
                    <div className="num text-[24px] font-bold leading-none text-white">
                      {fmtPace(pace).replace('/mi', '')}
                    </div>
                    <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-white/55">pace</div>
                  </div>
                  <div>
                    <div className="num text-[24px] font-bold leading-none text-white">{mph}</div>
                    <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-white/55">mph</div>
                  </div>
                </div>
              </div>

              {/* Steps, climb and grade share one quiet line. Each appears
                  only when the device is actually producing it. */}
              {(countsSteps || elev.samples > 1) && (
                <div className="flex items-center gap-4 pb-2.5 text-[10px] font-bold uppercase tracking-wider text-white/50">
                  {countsSteps && (
                    <span>
                      <span className="num mr-1 text-[15px] text-white">{liveSteps.toLocaleString()}</span>steps
                    </span>
                  )}
                  {elev.samples > 1 && (
                    <>
                      <span>
                        <span className="num mr-1 text-[15px] text-white">{elev.gainFt.toLocaleString()}</span>ft climb
                      </span>
                      <span>
                        <span className="num mr-1 text-[15px] text-white">
                          {grade > 0 ? '+' : ''}
                          {grade.toFixed(1)}
                        </span>
                        % grade
                      </span>
                    </>
                  )}
                </div>
              )}

              <Btn kind="lime" className="w-full py-4 text-[15px]" onClick={finish}>
                Finish {label.toLowerCase()}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* Not rendered at all while recording. It is a full-height box, and
          leaving it mounted over the map would put an invisible sheet
          between the athlete's thumb and the thing they are trying to
          pan. */}
      {phase !== 'live' && (
      <div className="mx-auto flex h-full w-full max-w-lg flex-col overflow-y-auto px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-[max(env(safe-area-inset-top),14px)]">
        {/* Top bar */}
        <div className="flex shrink-0 items-center justify-between py-1">
          <div className="eyebrow text-ink-dim">{`${label} tracker`}</div>
          <button onClick={onClose} className="press rounded-full bg-white/[0.07] px-4 py-1.5 text-[12px] font-bold text-ink-dim">
            {phase === 'done' ? '✕' : 'Cancel'}
          </button>
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

            {/* No distance means no pace and no speed either. Printing
                "0.00 mi · -- · 0 mph" three times over is a receipt for
                nothing; the time and the calories are what was earned. */}
            <p className="text-center text-[13px] font-semibold text-ink-dim">
              {saved.distanceMi >= 0.05 ? (
                <>
                  {saved.distanceMi.toFixed(2)} mi · {fmtDuration(saved.durationSec)} ·{' '}
                  {fmtPace(saved.avgPaceSec)} · {avgMph(saved.distanceMi, saved.durationSec)} mph
                </>
              ) : (
                <>
                  {fmtDuration(saved.durationSec)} moving
                  {saved.steps ? ` · ${saved.steps.toLocaleString()} steps` : ' · no distance recorded'}
                </>
              )}
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

            <div className="rounded-2xl bg-white/[0.045] p-3.5 ring-1 ring-white/[0.05]">
              <IntensityAsk
                answered={felt}
                onAnswer={(tier) => {
                  setFelt(tier)
                  setRunFeltIntensity(saved.id, tier)
                }}
              />
            </div>

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
      )}
    </div>,
    document.body,
  )
}
