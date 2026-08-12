import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ISODate } from '../../types'
import { cardioActivity } from '../../plan/cardio'
import {
  cardioKcal,
  distanceSourceFor,
  intensityLabel,
  intensityNote,
  stepDistanceMi,
  tracksSteps,
} from '../../engine/intensity'
import { logCardio, setCardioFeltIntensity } from '../../logic/actions'
import type { Intensity } from '../../engine/intensity'
import { IntensityAsk } from './IntensityAsk'
import { useAppStore } from '../../store/appStore'
import { requestMotionPermission, startStepCounter, type StepCounter } from '../../platform/motion'
import { watchDistance, type DistanceWatch } from '../../platform/geo'
import { Btn } from '../../components/ui'

/**
 * Tracker for any cardio that is not a GPS run or ride: pick it from
 * Track, hit start, work. Finish logs it as today's cardio.
 *
 * It used to record one number, the clock, and hand the rest to a
 * guess. Now the pedometer runs alongside it, and for anything played
 * over open ground the satellites do too, so an hour of ball comes
 * back as steps, distance and a calorie figure that came from what
 * happened rather than from what got claimed afterwards.
 *
 * Nothing here is mandatory. Motion permission refused, phone left in
 * a bag, five minutes on the clock: the session still logs, just with
 * fewer numbers on it. See engine/intensity.ts for why silence beats a
 * confident wrong answer.
 */
export function CardioTimerSheet({
  activityId,
  date,
  onClose,
  customLabel,
}: {
  activityId: string
  date: ISODate
  onClose: () => void
  /** What the user called it, when they named it themselves. */
  customLabel?: string
}) {
  const base = cardioActivity(activityId)
  // A session someone named "Padel" should say Padel everywhere, not
  // "Custom", or the Record reads as a list of anonymous blanks.
  const def = customLabel ? { ...base, label: customLabel } : base
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [saved, setSaved] = useState<{
    id: string
    steps?: number
    miles?: number
    kcal: number
    note: string | null
    tier: string | null
  } | null>(null)
  const [felt, setFelt] = useState<Intensity | undefined>(undefined)
  const wakeRef = useRef<{ release?: () => Promise<void> } | null>(null)
  const stepsRef = useRef<StepCounter | null>(null)
  const geoRef = useRef<DistanceWatch | null>(null)
  // Steps and miles tick under the clock, so the numbers have to
  // repaint on the same beat the seconds do.
  const [live, setLive] = useState({ steps: 0, miles: 0 })

  const bodyweightLb = useAppStore(
    (st) => [...st.data.measurements].reverse().find((m) => m.weightLb !== undefined)?.weightLb ?? 175,
  )
  const heightIn = useAppStore((st) => st.data.profile.heightIn)

  const countsSteps = tracksSteps(def.id)
  const usesGps = distanceSourceFor(def.id) === 'gps'
  const showsDistance = distanceSourceFor(def.id) !== 'none'

  useEffect(() => {
    if (startedAt === null) return
    const id = setInterval(() => {
      setElapsed((Date.now() - startedAt) / 1000)
      setLive({ steps: stepsRef.current?.steps() ?? 0, miles: geoRef.current?.miles() ?? 0 })
    }, 1000)
    type WakeNav = Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    void (navigator as WakeNav).wakeLock
      ?.request('screen')
      .then((s) => {
        wakeRef.current = s
      })
      .catch(() => {})
    return () => {
      clearInterval(id)
      void wakeRef.current?.release?.()
    }
  }, [startedAt])

  // Sensors stop when the screen goes, whichever way it goes.
  useEffect(
    () => () => {
      stepsRef.current?.stop()
      geoRef.current?.stop()
    },
    [],
  )

  const mm = Math.floor(elapsed / 60)
  const ss = String(Math.floor(elapsed % 60)).padStart(2, '0')

  /**
   * iOS will not report motion without a user gesture, so the sensors
   * start on the tap rather than on mount. That is also the honest
   * moment: nothing is counted before the session begins.
   */
  function start() {
    setStartedAt(Date.now())
    if (usesGps) geoRef.current = watchDistance()
    if (!countsSteps) return
    void requestMotionPermission().then((ok) => {
      if (ok) stepsRef.current = startStepCounter()
    })
  }

  function finish() {
    const minutes = Math.max(1, Math.round(elapsed / 60))
    const steps = countsSteps ? (stepsRef.current?.steps() ?? 0) : 0
    const gpsMi = geoRef.current?.miles() ?? 0
    stepsRef.current?.stop()
    geoRef.current?.stop()

    // GPS first where it works, steps where it does not, and nothing
    // where neither can honestly say. A phone that never got a fix
    // reports no distance rather than a zero, which reads as "you
    // stood still" and is a different claim entirely.
    const stepMi = stepDistanceMi(def.id, steps, heightIn)
    const miles = usesGps && gpsMi >= 0.05 ? gpsMi : showsDistance ? (stepMi ?? undefined) : undefined
    const distanceSource = miles === undefined ? undefined : usesGps && gpsMi >= 0.05 ? 'gps' : 'steps'

    const { kcal, intensity } = cardioKcal({ activityId: def.id, minutes, bodyweightLb, steps })

    const id = logCardio(date, {
      activityId: def.id,
      label: def.label,
      when: 'solo',
      minutes,
      ...(steps > 0 ? { steps } : {}),
      ...(miles !== undefined ? { miles, distanceSource } : {}),
      ...(intensity ? { intensity } : {}),
      ...(kcal > 0 ? { kcalEst: kcal } : {}),
    })
    setSaved({
      id,
      steps: steps > 0 ? steps : undefined,
      miles,
      kcal,
      tier: intensity,
      note: steps > 0 ? intensityNote(def.id, steps, minutes) : null,
    })
  }

  // Portalled to the body, above the session UI. Rendered in place it
  // competed with FocusView's own stacking context instead of sitting
  // over it, so a live session's close button painted straight through
  // this screen and you got two X buttons and a buried title.
  return createPortal(
    <div className="fixed inset-0 z-[90] flex flex-col bg-bg px-5 pb-[max(env(safe-area-inset-bottom),16px)] pt-[max(env(safe-area-inset-top),14px)]">
      <div className="flex items-center justify-between py-1">
        <div className="text-[13px] font-bold uppercase tracking-[0.18em] text-ink-dim">
          {def.emoji} {def.label}
        </div>
        {(startedAt === null || saved) && (
          <button
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.07] text-ink-dim"
          >
            <svg viewBox="0 0 24 24" className="h-[14px] w-[14px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        {saved ? (
          <>
            <div className="text-[12px] font-black uppercase tracking-[0.2em] text-lime">Logged ✓</div>
            <div className="mt-3 font-display text-[64px] font-bold leading-none tabular-nums">
              {mm}:{ss}
            </div>
            {saved.tier && (
              <div className="mt-3 rounded-full bg-accent/12 px-3.5 py-1.5 text-[11.5px] font-black uppercase tracking-[0.14em] text-accent-soft ring-1 ring-accent/25">
                {/* "All out session", not "All out intensity". The tier
                    words are the ones the question below offers, so the
                    two have to read as the same sentence. */}
                {intensityLabel(saved.tier as 'low' | 'standard' | 'high')} session
              </div>
            )}
            <Numbers steps={saved.steps} miles={saved.miles} kcal={saved.kcal} className="mt-6" />
            {saved.note && (
              <p className="mt-4 max-w-[30ch] text-center text-[12px] leading-snug text-ink-faint">
                {saved.note}
              </p>
            )}
            <p className="mt-3 text-[13px] text-ink-dim">Counts as today's cardio.</p>
            <div className="mt-6 w-full max-w-xs">
              <IntensityAsk
                answered={felt}
                onAnswer={(tier) => {
                  setFelt(tier)
                  setCardioFeltIntensity(date, saved.id, tier)
                }}
              />
            </div>
            <Btn kind="lime" className="mt-6 w-full max-w-xs" onClick={onClose}>
              Done
            </Btn>
          </>
        ) : startedAt === null ? (
          <>
            <div className="text-[64px]">{def.emoji}</div>
            <p className="mt-3 max-w-[30ch] text-center text-[13.5px] leading-relaxed text-ink-dim">
              {countsSteps
                ? `Keep the phone on you and it counts your steps${usesGps ? ' and distance' : ''} too.`
                : 'Timer starts when you do.'}
            </p>
            <Btn kind="lime" className="mt-8 w-full max-w-xs py-4 text-[15px]" onClick={start}>
              Start {def.label.toLowerCase()}
            </Btn>
          </>
        ) : (
          <>
            <div className="font-display text-[84px] font-bold leading-none tabular-nums">
              {mm}:{ss}
            </div>
            <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-faint">
              recording, screen stays on
            </div>
            {countsSteps && (
              <Numbers
                steps={live.steps}
                miles={showsDistance ? live.miles || undefined : undefined}
                className="mt-7"
              />
            )}
            <Btn kind="lime" className="mt-9 w-full max-w-xs py-4 text-[15px]" onClick={finish}>
              Finish
            </Btn>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}

/**
 * The secondary band, in the run tracker's shape so the two screens
 * read as one app. Anything the phone could not measure is left out
 * rather than shown as a zero.
 */
function Numbers({
  steps,
  miles,
  kcal,
  className = '',
}: {
  steps?: number
  miles?: number
  kcal?: number
  className?: string
}) {
  const cells = [
    steps !== undefined && steps > 0 ? { v: steps.toLocaleString(), k: 'steps' } : null,
    miles !== undefined && miles > 0 ? { v: miles.toFixed(2), k: 'mi' } : null,
    kcal !== undefined && kcal > 0 ? { v: String(kcal), k: 'cal' } : null,
  ].filter((c): c is { v: string; k: string } => c !== null)
  if (cells.length === 0) return null
  return (
    <div className={`flex items-end justify-center gap-7 ${className}`}>
      {cells.map((c) => (
        <div key={c.k} className="text-center">
          <div className="num text-[26px] font-bold leading-none">{c.v}</div>
          <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-ink-faint">{c.k}</div>
        </div>
      ))}
    </div>
  )
}
