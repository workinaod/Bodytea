import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ResolvedDay, SessionLog } from '../../types'
import { getExercise } from '../../plan/exercises'
import { currentFocusItem, focusProgress, nextFocusItem, restAfter } from '../../engine/focus'
import { briefingFor, cadencePlan, timesTrained } from '../../engine/cadence'
import { cancelSpeech, say, speechInSupported, startEars } from '../../logic/speech'
import { useAppStore } from '../../store/appStore'
import { patchSet, toggleExerciseSkipped } from '../../logic/actions'
import { Stepper } from '../../components/ui'
import { MuscleMap } from '../../components/MuscleMap'
import { ExerciseDemo } from '../../components/ExerciseDemo'
import { musclesFor } from '../../plan/muscles'
import { demoFor } from '../../plan/demos'
import { photosFor } from '../../plan/demoPhotos'

// ============================================================
// Focus mode: one set at a time, how-to in the middle, a giant
// NEXT button, and a break screen with countdown → green READY.
// ============================================================

interface BreakState {
  seconds: number
  nextName: string
  nextSetLabel: string
}

export function FocusView({
  day,
  session,
  onOpenGuide,
  onFinish,
  onSkip,
  onListView,
}: {
  day: ResolvedDay
  session: SessionLog
  onOpenGuide: (id: string) => void
  onFinish: () => void
  onSkip: () => void
  onListView: () => void
}) {
  const [breakState, setBreakState] = useState<BreakState | null>(null)
  const [videoOpen, setVideoOpen] = useState(false)
  const [voiceOn, setVoiceOn] = useState(false)
  // Guided flow: every set waits at GO (tap or say it), then the coach
  // counts the set in rhythm. 'live' = the cadence chain is running.
  const [phase, setPhase] = useState<'go' | 'live'>('go')
  const [liveCount, setLiveCount] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const data = useAppStore((s) => s.data)
  const update = useAppStore((s) => s.update)
  const voiceCoach = data.settings.voiceCoach ?? true

  const current = currentFocusItem(session)
  const progress = focusProgress(session)

  const ex = current ? session.exercises[current.exIdx] : null
  const def = ex ? getExercise(ex.exerciseId) : null
  const set = current && ex ? ex.sets[current.setIdx] : null
  const resolved = def ? day.exercises.find((r) => r.exerciseId === def.id) : null
  const isLoaded = def ? def.kind === 'lift' || def.kind === 'carry' : false
  const isTimed = set ? /sec|min|hold/.test(set.targetReps) : false

  // Reset the lazy video player whenever the exercise changes
  const exId = def?.id
  useEffect(() => setVideoOpen(false), [exId])

  // ---- Keep the screen awake during the session ----
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null
    const acquire = async () => {
      try {
        const nav = navigator as Navigator & {
          wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> }
        }
        lock = (await nav.wakeLock?.request('screen')) ?? null
      } catch {
        /* unsupported or denied */
      }
    }
    void acquire()
    const onVis = () => {
      if (document.visibilityState === 'visible') void acquire()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      void lock?.release().catch(() => {})
    }
  }, [])

  // ---- Cadence machinery ----
  const cadenceTimers = useRef<number[]>([])
  const clearCadence = useCallback(() => {
    for (const id of cadenceTimers.current) window.clearTimeout(id)
    cadenceTimers.current = []
    cancelSpeech()
  }, [])

  const startSet = useCallback(() => {
    if (!current) return
    const exNow = session.exercises[current.exIdx]
    const defNow = getExercise(exNow.exerciseId)
    const resolvedNow = day.exercises.find((r) => r.exerciseId === defNow.id)
    setPhase('live')
    setLiveCount(null)
    if (!resolvedNow) return
    clearCadence()
    if (!voiceCoach) return
    for (const ev of cadencePlan(resolvedNow, defNow)) {
      cadenceTimers.current.push(
        window.setTimeout(() => {
          say(ev.say)
          setCaption(ev.say)
          if (ev.show) setLiveCount(ev.show)
        }, ev.atMs),
      )
    }
  }, [current, session, day, voiceCoach, clearCadence])

  // ---- Advance ----
  const autoStartNext = useRef(false)
  const advance = useCallback(() => {
    if (!current) return
    clearCadence()
    setLiveCount(null)
    patchSet(session.date, current.exIdx, current.setIdx, { done: true })
    const rest = restAfter(session, current)
    const next = nextFocusItem(session, current)
    if (rest > 0 && next) {
      const nextEx = session.exercises[next.exIdx]
      const nextDef = getExercise(nextEx.exerciseId)
      const sameExercise = next.exIdx === current.exIdx
      setBreakState({
        seconds: rest,
        nextName: nextDef.name,
        nextSetLabel: sameExercise
          ? `Set ${next.setIdx + 1} of ${nextEx.sets.length}`
          : `${nextEx.sets.length} × ${nextEx.sets[0]?.targetReps}`,
      })
      setPhase('go')
    } else if (rest <= 15 && next) {
      // Rapid-fire block: no break, no GO friction — roll straight on
      autoStartNext.current = true
    } else {
      setPhase('go')
    }
  }, [current, session, clearCadence])

  // New set position: wait at GO — unless a rapid-fire advance asked to roll
  const posKey = current ? `${current.exIdx}-${current.setIdx}` : 'done'
  useEffect(() => {
    if (autoStartNext.current) {
      autoStartNext.current = false
      startSet()
    } else {
      setPhase('go')
      setLiveCount(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posKey])

  // Entering a NEW exercise (session start included): speak the briefing —
  // setup steps while it's new to them, the benefit line once familiar.
  const announcedEx = useRef<string | null>(null)
  useEffect(() => {
    if (!def || breakState) return
    if (announcedEx.current === def.id) return
    announcedEx.current = def.id
    const line = briefingFor(def, timesTrained(data, def.id), data.plan.rationale[def.id])
    setCaption(line)
    if (voiceCoach) say(line, { interrupt: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exId, breakState])

  useEffect(() => () => clearCadence(), [clearCadence])

  // ---- Hands-free control: "go / done / skip" and friends ----
  const advanceRef = useRef(advance)
  advanceRef.current = advance
  const startSetRef = useRef(startSet)
  startSetRef.current = startSet
  const breakRef = useRef<BreakState | null>(breakState)
  breakRef.current = breakState
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  const voiceSupported = useMemo(() => speechInSupported(), [])

  useEffect(() => {
    if (!voiceOn || !voiceSupported) return
    const closeBreakAndGo = () => {
      setBreakState(null)
      startSetRef.current()
    }
    const stop = startEars({
      onGo: () => {
        if (breakRef.current) closeBreakAndGo()
        else if (phaseRef.current === 'go') startSetRef.current()
      },
      onDone: () => {
        if (breakRef.current) closeBreakAndGo()
        else advanceRef.current()
      },
      onSkip: () => {
        if (breakRef.current) closeBreakAndGo()
      },
    })
    return stop
  }, [voiceOn, voiceSupported])

  // ---- All done → finish screen ----
  if (!current || !def || !ex || !set) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-bg px-6 text-center">
        <div className="text-[13px] font-black uppercase tracking-[0.2em] text-lime">Session complete</div>
        <h2 className="mt-2 text-[32px] font-black leading-tight">{progress.done} sets. Done.</h2>
        <p className="mt-2 text-[13.5px] text-ink-dim">The work is banked — the debrief has your recovery orders.</p>
        <button
          onClick={onFinish}
          className="mt-8 w-full max-w-sm rounded-2xl bg-lime py-5 text-[17px] font-black text-black shadow-2xl shadow-lime/20 active:scale-[0.98]"
        >
          FINISH → DEBRIEF
        </button>
        <button onClick={onListView} className="mt-4 text-[12.5px] font-semibold text-ink-faint underline">
          back to the list view
        </button>
      </div>
    )
  }

  const totalSetsThisEx = ex.sets.length

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-bg pb-[max(env(safe-area-inset-bottom),12px)] pt-[max(env(safe-area-inset-top),12px)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4">
        <button onClick={onListView} className="rounded-full bg-surface-2 px-3 py-1.5 text-[11px] font-bold text-ink-dim">
          ☰ list
        </button>
        <div className="text-center">
          <div className="text-[11px] font-black uppercase tracking-wider text-ink-faint">
            {progress.done + 1} / {progress.total} sets
          </div>
          <div className="mx-auto mt-1 h-1 w-32 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full bg-accent transition-all" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
          </div>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => update((d) => { d.settings.voiceCoach = !(d.settings.voiceCoach ?? true) })}
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${voiceCoach ? 'bg-accent/20 text-accent-soft' : 'bg-surface-2 text-ink-faint'}`}
            aria-label="Toggle spoken coaching"
          >
            {voiceCoach ? '🔊' : '🔇'}
          </button>
          {voiceSupported && (
            <button
              onClick={() => setVoiceOn(!voiceOn)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${voiceOn ? 'bg-lime text-black' : 'bg-surface-2 text-ink-dim'}`}
            >
              🎙 {voiceOn ? 'on' : 'voice'}
            </button>
          )}
          <button onClick={() => onOpenGuide(def.id)} className="rounded-full bg-surface-2 px-3 py-1.5 text-[11px] font-black text-cyan">
            ?
          </button>
        </div>
      </div>

      {/* Exercise name + set */}
      <div className="mt-3 px-5 text-center">
        <h2 className="text-[24px] font-black leading-tight tracking-tight">{def.name}</h2>
        <div className="mt-1 flex items-center justify-center gap-2 text-[13px] font-bold text-ink-dim">
          <span className="rounded-full bg-accent/15 px-3 py-0.5 text-accent-soft">
            Set {current.setIdx + 1} of {totalSetsThisEx}
          </span>
          <span>target: {set.targetReps}</span>
          {resolved?.lightMode && <span className="text-gold">· light</span>}
        </div>
      </div>

      {/* Middle: how-to visual */}
      <div className="mx-4 mt-3 flex-1 overflow-y-auto">
        <div className="rounded-2xl border border-edge bg-surface p-4">
          {def.videoId ? (
            videoOpen ? (
              <div className="overflow-hidden rounded-xl">
                <iframe
                  className="aspect-video w-full"
                  src={`https://www.youtube-nocookie.com/embed/${def.videoId}?autoplay=1`}
                  title="How to"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <button onClick={() => setVideoOpen(true)} className="relative block w-full overflow-hidden rounded-xl">
                <img
                  src={`https://i.ytimg.com/vi/${def.videoId}/hqdefault.jpg`}
                  alt="How to do it"
                  className="aspect-video w-full object-cover opacity-85"
                  loading="lazy"
                />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent shadow-xl">
                    <svg viewBox="0 0 24 24" className="ml-0.5 h-6 w-6 fill-black">
                      <path d="M8 5v14l11-7L8 5Z" />
                    </svg>
                  </span>
                </span>
              </button>
            )
          ) : null}

          {def.cue && (
            <div className={`${def.videoId ? 'mt-3' : ''} rounded-lg border border-gold/30 bg-gold/8 px-3 py-2 text-[12.5px] font-semibold text-gold`}>
              {def.cue}
            </div>
          )}

          {/* The movement, animated — the promised mid-screen visual */}
          <div className={`${def.videoId || def.cue ? 'mt-3' : ''} flex items-center gap-2`}>
            <div className="min-w-0 flex-1">
              <ExerciseDemo compact spec={demoFor(def.id)} photos={photosFor(def.id)} />
            </div>
            <div className="w-[36%] shrink-0">
              <MuscleMap
                compact
                primary={musclesFor(def.id).primary}
                secondary={musclesFor(def.id).secondary}
              />
            </div>
          </div>

          <ol className="mt-3 space-y-2">
            {def.steps.slice(0, def.videoId ? 3 : 4).map((s, i) => (
              <li key={i} className="flex gap-2.5 text-[13px] leading-snug text-ink-dim">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[10.5px] font-black text-accent">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Weight / reps for THIS set */}
        <div className="mt-3 flex items-center justify-center gap-4">
          {isLoaded && (
            <Stepper
              value={set.weightLb}
              onChange={(v) => patchSet(session.date, current.exIdx, current.setIdx, { weightLb: v })}
              step={5}
              suffix="lb"
              width="w-16"
            />
          )}
          {!isTimed ? (
            <Stepper
              value={set.reps}
              onChange={(v) => patchSet(session.date, current.exIdx, current.setIdx, { reps: v })}
              step={1}
              suffix="reps"
              width="w-14"
            />
          ) : (
            <Stepper
              value={set.seconds}
              onChange={(v) => patchSet(session.date, current.exIdx, current.setIdx, { seconds: v })}
              step={5}
              suffix="sec"
              width="w-14"
            />
          )}
        </div>
      </div>

      {/* Coach caption + the giant GO / NEXT button */}
      <div className="px-4 pt-2">
        {caption && (
          <p className="mb-2 truncate text-center text-[11.5px] font-semibold text-ink-faint">
            {liveCount ? <span className="mr-2 font-display text-[15px] font-bold text-accent">{liveCount}</span> : null}
            {caption}
          </p>
        )}
        {phase === 'go' ? (
          <button
            onClick={startSet}
            className="w-full rounded-2xl bg-lime py-6 text-[19px] font-black tracking-wide text-black shadow-2xl shadow-lime/25 active:scale-[0.985]"
          >
            GO — START SET {current.setIdx + 1}
          </button>
        ) : (
          <button
            onClick={advance}
            className="w-full rounded-2xl bg-accent py-6 text-[19px] font-black tracking-wide text-black shadow-2xl shadow-accent/25 active:scale-[0.985]"
          >
            {current.setIdx + 1 === totalSetsThisEx ? 'SET DONE — NEXT' : 'NEXT SET ✓'}
          </button>
        )}
        <div className="mt-2 flex items-center justify-center gap-5 pb-1">
          <button
            onClick={() => toggleExerciseSkipped(session.date, current.exIdx)}
            className="text-[11.5px] font-semibold text-ink-faint underline"
          >
            skip exercise
          </button>
          <button onClick={onSkip} className="text-[11.5px] font-semibold text-danger underline">
            can't finish
          </button>
        </div>
      </div>

      {breakState && (
        <BreakScreen
          brk={breakState}
          voice={voiceCoach}
          onDone={() => {
            setBreakState(null)
            startSet()
          }}
        />
      )}
    </div>
  )
}

// ---------- Break screen: countdown → green READY gate ----------

function BreakScreen({ brk, voice, onDone }: { brk: BreakState; voice: boolean; onDone: () => void }) {
  const endsAt = useRef(Date.now() + brk.seconds * 1000)
  const [remaining, setRemaining] = useState(brk.seconds)
  const buzzed = useRef(false)

  // The coach uses the break to set up what's coming
  useEffect(() => {
    if (voice) say(`Rest. Next up: ${brk.nextName}, ${brk.nextSetLabel}. Say go or skip when you're ready.`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, Math.round((endsAt.current - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0 && !buzzed.current) {
        buzzed.current = true
        try {
          navigator.vibrate?.([250, 120, 250])
        } catch {
          /* no vibration */
        }
      }
    }
    tick()
    const id = setInterval(tick, 300)
    const onVis = () => tick()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  const ready = remaining === 0
  const mm = Math.floor(remaining / 60)
  const ss = String(remaining % 60).padStart(2, '0')

  if (ready) {
    return (
      <button
        onClick={onDone}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-lime text-black animate-fade-in"
      >
        <div className="text-[64px] font-black leading-none tracking-tight">READY?</div>
        <div className="mt-4 text-[16px] font-extrabold">{brk.nextName}</div>
        <div className="text-[13px] font-bold opacity-70">{brk.nextSetLabel}</div>
        <div className="mt-10 rounded-full border-2 border-black/30 px-6 py-2 text-[13px] font-black uppercase tracking-[0.2em]">
          tap anywhere to go
        </div>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg animate-fade-in">
      <div className="text-[13px] font-black uppercase tracking-[0.25em] text-ink-faint">Rest</div>
      <div className="mt-2 font-mono text-[96px] font-black leading-none tabular-nums text-ink">
        {mm}:{ss}
      </div>
      <div className="mt-6 text-center">
        <div className="text-[12px] font-bold uppercase tracking-wider text-ink-faint">next up</div>
        <div className="mt-1 text-[17px] font-extrabold text-ink">{brk.nextName}</div>
        <div className="text-[12.5px] font-semibold text-ink-dim">{brk.nextSetLabel}</div>
      </div>
      <button onClick={onDone} className="mt-10 rounded-full bg-surface-2 px-5 py-2.5 text-[12.5px] font-bold text-ink-dim">
        skip the rest — I'm ready
      </button>
      <p className="mt-3 max-w-[260px] text-center text-[11px] leading-snug text-ink-faint">
        Full recovery is part of the program — explosive quality dies when you rush it.
      </p>
    </div>
  )
}
