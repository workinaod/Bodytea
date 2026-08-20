import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ExerciseDef, ResolvedDay, SessionLog } from '../../types'
import { getExercise } from '../../plan/exercises'
import { videoFor } from '../../plan/videos'
import { currentFocusItem, focusProgress, nextFocusItem, restAfter } from '../../engine/focus'
import { beep, cancelSpeech, say, speechInSupported, startEars, type EarStatus } from '../../platform/speech'
import { EarStatusNote } from './EarStatusNote'
import { useAppStore } from '../../store/appStore'
import { abandonSession, patchSet, restartSession, setWeightForward} from '../../logic/actions'
import { setSessionFeel } from '../../logic/prescription'
import { recordRir, recordShortfall } from '../../logic/fatigueActions'
import { Stepper } from '../../components/ui'
import { HowToSlides } from './HowToSlides'
import { ExerciseBrief } from './ExerciseBrief'
import { weightDropped } from '../../engine/volume'
import { easeRemaining } from '../../logic/volumeActions'
import { BreakScreen, type BreakState } from './BreakScreen'
import { CantFinishSheet } from './CantFinishSheet'
import { TimeCheckSheet } from './TimeCheckSheet'

// ============================================================
// Focus mode, guided: each set is intro'd (name, set, reps at
// weight), the weight is confirmed BEFORE the set, ready starts
// a true 1-second 3-2-1, then the coach shuts up and lets you
// work. Instructions are spoken only when asked, and shortened.
// ============================================================

/** What load the number means, by equipment. "Your weight" reads like
    body weight; "Weight per dumbbell" can't be misread. */
function loadLabel(equipment: string): string {
  if (/dumbbell/i.test(equipment)) return 'Weight per dumbbell'
  if (/barbell|ez bar|trap bar/i.test(equipment)) return 'Weight on the bar'
  if (/kettlebell/i.test(equipment)) return 'Kettlebell weight'
  return 'Added weight'
}

/** m:ss for the working clock, so a long hold does not read as "184". */
function fmtClock(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** The main details in one breath, cue first, then the first two steps
    trimmed to their opening clause. Never the write-up verbatim. */
function shortHowTo(def: ExerciseDef): string {
  const bits = [def.cue, ...def.steps.slice(0, 2).map((s) => s.split(/[,.;, (]/)[0]?.trim())]
  return `${bits.filter((b): b is string => !!b).map((b) => b.replace(/\.+$/, '')).join('. ')}.`
}

export function FocusView({
  day,
  session,
  onFinish,
  onListView,
}: {
  day: ResolvedDay
  session: SessionLog
  onFinish: () => void
  onListView: () => void
}) {
  const [breakState, setBreakState] = useState<BreakState | null>(null)
  const [videoOpen, setVideoOpen] = useState(false)
  const [voiceOn, setVoiceOn] = useState(false)
  const [earStatus, setEarStatus] = useState<EarStatus>('listening') // see EarStatusNote
  // 'go' = the ready gate (weight confirm), 'live' = they're working
  const [phase, setPhase] = useState<'go' | 'live'>('go')
  const [caption, setCaption] = useState('')
  const [howToOpen, setHowToOpen] = useState(false)
  const [cantFinish, setCantFinish] = useState(false)
  const [timeCheck, setTimeCheck] = useState(false)
  // The how-to rolls away when work starts. Tapping STEPS brings it back.
  const [stepsOpen, setStepsOpen] = useState(false)
  const data = useAppStore((s) => s.data)
  const update = useAppStore((s) => s.update)
  // Four sound levels: full voice / beeps + next-exercise name / beeps / silent
  const soundMode = data.settings.soundMode ?? ((data.settings.voiceCoach ?? true) ? 'voice' : 'silent')
  const [soundOpen, setSoundOpen] = useState(false)
  const soundRef = useRef(soundMode)
  soundRef.current = soundMode

  // The voice nudge shows whenever a session opens on its first set, so
  // cancelling a set and coming back in still gets it. Only actually USING
  // voice control retires it.
  //
  // Renamed from voiceTipSeen deliberately. That flag was set by swatting
  // the bubble away, which is not the same as learning what it pointed at,
  // so one dismissal silenced it permanently. The old value is stale by
  // design: a new name means everyone gets the nudge back.
  const [voiceTip, setVoiceTip] = useState(!data.settings.voiceUsed)
  const dismissVoiceTip = (permanently = false) => {
    setVoiceTip(false)
    if (permanently && !data.settings.voiceUsed) {
      update((d) => {
        d.settings.voiceUsed = true
      })
    }
  }

  // Flipping the sound down mid-sentence must actually silence it
  useEffect(() => {
    if (soundMode !== 'voice') cancelSpeech()
  }, [soundMode])

  const current = currentFocusItem(session)
  const progress = focusProgress(session)
  /** Half the day's sets, rounded up: the moment the check-in is worth asking. */
  const halfwayAt = Math.ceil(progress.total / 2)

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

  // ---- Countdown timers (the only scheduled audio left) ----
  const timers = useRef<number[]>([])
  const clearTimers = useCallback(() => {
    for (const id of timers.current) window.clearTimeout(id)
    timers.current = []
    cancelSpeech()
  }, [])

  // ---- Live clock ----
  // Runs for every working set now, not just the timed ones. Once the
  // how-to rolls away the clock IS the screen, so it has to tick even
  // when the prescription is reps rather than seconds.
  const liveStartRef = useRef(0)
  const [liveTick, setLiveTick] = useState(0)
  useEffect(() => {
    if (phase !== 'live') return
    const id = window.setInterval(() => setLiveTick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [phase])
  const liveSec = phase === 'live' && liveStartRef.current > 0 ? Math.max(0, Math.floor((Date.now() - liveStartRef.current) / 1000)) : 0
  void liveTick
  /** How-to hidden, clock showing. */
  const rolled = phase === 'live' && !stepsOpen

  // Work starting hides the nudge for this set. It is not marked seen: a
  // cancelled set that comes back to the gate should still get it.
  useEffect(() => {
    if (phase === 'go') setStepsOpen(false)
  }, [phase, current?.exIdx, current?.setIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase === 'live') setVoiceTip(false)
    else if (!data.settings.voiceUsed && current?.setIdx === 0) setVoiceTip(true)
  }, [phase, current?.exIdx, current?.setIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  const startSet = useCallback(
    (chained = false) => {
      setPhase('live')
      clearTimers()
      if (chained || soundRef.current === 'silent') {
        // Chained rapid-fire rolls straight in; silent users get the
        // visual count only if they came through the gate.
        liveStartRef.current = Date.now()
        if (!chained) {
          const words = ['3…', '2…', '1…', 'Go. Work.']
          liveStartRef.current = Date.now() + 3000
          words.forEach((w, i) => {
            timers.current.push(window.setTimeout(() => setCaption(w), i * 1000))
          })
        } else {
          setCaption('')
        }
        return
      }
      // A true one-second count: 3 … 2 … 1 … go-tone
      liveStartRef.current = Date.now() + 3000
      const steps: [number, string, number][] = [
        [0, '3…', 600],
        [1000, '2…', 600],
        [2000, '1…', 600],
        [3000, 'Go. Work.', 1000],
      ]
      for (const [t, word, freq] of steps) {
        timers.current.push(
          window.setTimeout(() => {
            beep(freq, t === 3000 ? 240 : 130)
            setCaption(word)
          }, t),
        )
      }
    },
    [clearTimers],
  )

  // Stalled-start watch: still on the FIRST exercise with 30+ min on the
  // clock → offer a clean restart with fresh time (nothing else changes).
  const [nowTick, setNowTick] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])
  const startedMs = session.startedAt ? Date.parse(session.startedAt) : 0
  const staleOnFirst =
    current !== null && current.exIdx === 0 && startedMs > 0 && nowTick - startedMs >= 30 * 60_000

  const restartFresh = useCallback(() => {
    clearTimers()
    restartSession(session.date)
    setBreakState(null)
    setPhase('go')
    setNowTick(Date.now())
    setCaption('Fresh clock. Take it from the top. Set one.')
  }, [clearTimers, session.date])

  // ---- Advance ----
  const autoStartNext = useRef(false)
  /** The set the rest screen is resting FROM, so its answers land on it. */
  const justRef = useRef<{ exIdx: number; setIdx: number } | null>(null)
  const advance = useCallback(() => {
    if (!current) return
    clearTimers()
    justRef.current = { exIdx: current.exIdx, setIdx: current.setIdx }
    patchSet(session.date, current.exIdx, current.setIdx, { done: true })
    const rest = restAfter(session, current)
    const next = nextFocusItem(session, current)
    if (rest > 0 && next) {
      const nextEx = session.exercises[next.exIdx]
      const nextDef = getExercise(nextEx.exerciseId)
      const sameExercise = next.exIdx === current.exIdx
      const justEx = session.exercises[current.exIdx]
      // ONE check-in, at the halfway point of the whole session, asked once.
      // Not on the middle set of an exercise: early on you can feel good and
      // by the third movement you are done, so a single lift is the wrong
      // thing to ask about and the wrong moment to ask.
      const askSessionFeel = session.feel === undefined && progress.done + 1 >= halfwayAt
      setBreakState({
        seconds: rest,
        nextName: nextDef.name,
        nextSetLabel: sameExercise
          ? `Set ${next.setIdx + 1} of ${nextEx.sets.length}`
          : `${nextEx.sets.length} × ${nextEx.sets[0]?.targetReps}`,
        askSessionFeel,
        easeOffer: weightDropped(justEx.sets),
        nextExerciseId: nextDef.id,
        justTarget: Number((justEx.sets[current.setIdx]?.targetReps.match(/^\d+/) ?? [])[0]) || undefined,
        // Once per movement, around its midpoint: late enough to know, early
        // enough that the answer still describes the sets that are left.
        askRir: justEx.rir === undefined && current.setIdx + 1 >= Math.ceil(justEx.sets.length / 2),
      })
      setPhase('go')
    } else if (rest <= 15 && next) {
      // Rapid-fire block: no break, no gate friction, roll straight on
      autoStartNext.current = true
    } else {
      setPhase('go')
    }
  }, [current, session, clearTimers])

  // New set position: back to the gate, unless a rapid-fire advance asked to roll
  const posKey = current ? `${current.exIdx}-${current.setIdx}` : 'done'
  useEffect(() => {
    if (autoStartNext.current) {
      autoStartNext.current = false
      startSet(true)
    } else {
      setPhase('go')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posKey])

  // ---- The set intro: name, set count, prescribed reps, weight prompt.
  // Spoken once per set position (voice mode), mirrored on screen. NO
  // instruction reading, that only happens on request.
  const introFor = useRef<string | null>(null)
  useEffect(() => {
    if (!def || !set || !current || breakState || phase !== 'go') return
    if (introFor.current === posKey) return
    introFor.current = posKey
    // Ranges, units and shorthand are the speech layer's job now
    // (speakable()), so this only has to build the sentence.
    const repsBit = isTimed
      ? set.targetReps
      : set.reps !== undefined
        ? `${set.reps} reps`
        : `${set.targetReps} reps`
    const weightBit = isLoaded && set.weightLb !== undefined ? ` at ${set.weightLb} pounds` : ''

    // Set 1 gets the full introduction. After that they know what they are
    // doing, so repeating the exercise name every set is a coach who does
    // not trust you. Sets 2 and up get the count and nothing else.
    const first = current.setIdx === 0
    const line = first
      ? `${def.name}. Set 1 of ${ex?.sets.length}: ${repsBit}${weightBit}. Tap go or tell me when you're ready.`
      : `Set ${current.setIdx + 1} of ${ex?.sets.length}.`
    // Spoken only. The screen already shows all of this (name, set line,
    // weight card), so no caption: screen-followers don't need an echo.
    if (soundRef.current === 'voice') say(line, { interrupt: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posKey, breakState, phase])

  // Instructions only when asked, and shortened, not the write-up
  const speakInstructions = useCallback(() => {
    if (!def) return
    const line = shortHowTo(def)
    setCaption(line)
    if (soundRef.current === 'voice') say(line, { interrupt: true })
  }, [def])

  useEffect(() => () => clearTimers(), [clearTimers])

  // ---- Hands-free control: "ready / done / skip / how do I" ----
  const advanceRef = useRef(advance)
  advanceRef.current = advance
  const startSetRef = useRef(startSet)
  startSetRef.current = startSet
  const gateRef = useRef<() => void>(() => {})
  const askRef = useRef(speakInstructions)
  askRef.current = speakInstructions
  const breakRef = useRef<BreakState | null>(breakState)
  breakRef.current = breakState
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  const voiceSupported = useMemo(() => speechInSupported(), [])
  const deaf = voiceOn && earStatus !== 'listening'
  const micTone = !voiceOn ? 'bg-surface-2 text-ink-dim' : deaf ? 'bg-gold/25 text-gold' : 'bg-lime text-black'

  useEffect(() => {
    if (!voiceOn || !voiceSupported) return
    const stop = startEars({
      onGo: () => {
        if (breakRef.current) setBreakState(null) // back to the gate, weight first
        else if (phaseRef.current === 'go') gateRef.current()
      },
      onDone: () => {
        if (breakRef.current) setBreakState(null)
        else advanceRef.current()
      },
      onSkip: () => {
        if (breakRef.current) setBreakState(null)
      },
      onAsk: () => askRef.current(),
      onStatus: setEarStatus,
    })
    return () => {
      stop()
      setEarStatus('listening')
    }
  }, [voiceOn, voiceSupported])

  // ---- All done → finish screen ----
  if (!current || !def || !ex || !set) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-bg px-6 text-center">
        <div className="text-[13px] font-black uppercase tracking-[0.2em] text-lime">Session complete</div>
        <h2 className="mt-2 text-[32px] font-black leading-tight">{progress.done} sets. Done.</h2>
        <p className="mt-2 text-[13.5px] text-ink-dim">Work banked. The debrief has your recovery orders.</p>
        <button
          onClick={onFinish}
          className="press-down mt-8 w-full max-w-sm rounded-2xl border-2 border-[var(--lip-lime)] bg-lime py-5 text-[17px] font-black text-[var(--ink-on-lime)] [--lip:var(--lip-lime)]"
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
  const vid = videoFor(def)
  // Loaded movements need a real weight before the set can start
  const needsWeight =
    isLoaded &&
    /dumbbell|barbell|kettlebell|ez bar|trap bar|plate|weighted/i.test(def.equipment) &&
    (set.weightLb === undefined || set.weightLb <= 0)
  const gateGo = () => {
    if (needsWeight) {
      const line = `${loadLabel(def.equipment)} first.`
      setCaption(line)
      if (soundRef.current === 'voice') say(line, { interrupt: true })
      return
    }
    startSet()
  }
  gateRef.current = gateGo

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-bg pb-[max(env(safe-area-inset-bottom),12px)] pt-[max(env(safe-area-inset-top),12px)]">
      {/* Top bar */}
      <div className="flex items-center gap-1.5 px-4">
        {current.exIdx === 0 && (
          <button
            aria-label="Exit session"
            onClick={() => abandonSession(session.date)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-dim"
          >
            <svg viewBox="0 0 24 24" className="h-[13px] w-[13px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
        <button onClick={onListView} className="rounded-full bg-surface-2 px-3 py-1.5 text-[11px] font-bold text-ink-dim">
          ☰ list
        </button>
        <div className="flex-1" />
        <div className="text-center">
          <div className="text-[11px] font-black uppercase tracking-wider text-ink-faint">
            {progress.done + 1} / {progress.total} sets
          </div>
          <div className="mx-auto mt-1 h-1 w-32 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full bg-accent transition-all" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex gap-1.5">
          <div className="relative">
            <button
              onClick={() => setSoundOpen((v) => !v)}
              className={`rounded-full px-3 py-1.5 ${soundMode !== 'silent' ? 'bg-accent/20 text-accent-soft' : 'bg-surface-2 text-ink-faint'}`}
              aria-label="Session sound"
            >
              <VolumeIcon waves={soundMode === 'voice' ? 3 : soundMode === 'beeps-names' ? 2 : soundMode === 'beeps' ? 1 : 0} />
            </button>
            {soundOpen && (
              <div className="absolute right-0 top-9 z-30 w-56 overflow-hidden rounded-2xl border-2 border-edge bg-surface shadow-[0_4px_0_var(--color-edge)]">
                {(
                  [
                    ['voice', 3, 'Voice coach', 'Set intros + countdown'],
                    ['beeps-names', 2, 'Beeps + names', 'Countdown beeps, next exercise name only'],
                    ['beeps', 1, 'Beeps only', 'Countdown beeps'],
                    ['silent', 0, 'Silent', 'Screen only, no sound'],
                  ] as const
                ).map(([id, waves, label, sub], i) => (
                  <button
                    key={id}
                    onClick={() => {
                      update((d) => { d.settings.soundMode = id })
                      setSoundOpen(false)
                    }}
                    className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left ${i > 0 ? 'border-t border-white/[0.05]' : ''} ${soundMode === id ? 'bg-accent/10' : ''}`}
                  >
                    <VolumeIcon waves={waves} />
                    <span className="min-w-0">
                      <span className={`block text-[12.5px] font-bold ${soundMode === id ? 'text-accent-soft' : 'text-ink'}`}>{label}</span>
                      <span className="block text-[10px] leading-snug text-ink-faint">{sub}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {voiceSupported && (
            <button
              onClick={() => {
                setVoiceOn(!voiceOn)
                dismissVoiceTip(true)
              }}
              aria-label={`Voice control${voiceOn ? ' on' : ''}${deaf ? ', microphone unavailable' : ''}`}
              // Amber, not lime, the moment the mic stops working: this
              // button is the only thing on screen claiming the app is
              // listening, so it is what has to stop claiming it.
              className={`press grid h-8 w-8 place-items-center rounded-full ${micTone}`}
            >
              <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="2.5" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3.5" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Back on every session that opens on its first set. Tapping it away
          or starting a set clears it for NOW, not for good: swatting a
          tooltip is not the same as learning what it was pointing at, and
          treating it that way is why this stopped appearing at all. Only
          the mic button itself retires it. Sits in normal flow under the
          mic so it points at the button it is about without ever covering
          the lift being described. */}
      {voiceOn && voiceSupported && <EarStatusNote status={earStatus} />}

      {voiceSupported && voiceTip && earStatus === 'listening' && (
        <div className="mt-2 flex justify-end px-4">
          <button
            onClick={() => dismissVoiceTip()}
            className="breathe-in relative rounded-2xl border-2 border-[var(--lip-lime)] bg-lime px-3 py-1.5 text-[11.5px] font-black text-[var(--ink-on-lime)]"
          >
            <span
              aria-hidden
              className="absolute -top-1 right-3.5 h-2.5 w-2.5 rotate-45 rounded-[2px] bg-lime"
            />
            Use voice commands
          </button>
        </div>
      )}

      {/* Exercise name + prescription, told, not picked */}
      <div className="mt-3 px-5 text-center">
        <h2 className="text-[25px] font-black leading-tight tracking-tight">{def.name}</h2>
        <div className="mt-1.5 text-[15.5px] font-black uppercase tracking-[0.1em] text-ink-dim">
          Set {current.setIdx + 1} of {totalSetsThisEx}
          <span className="text-accent-soft"> · {set.targetReps}{!isTimed && !/rep/i.test(set.targetReps) ? ' reps' : ''}</span>
          {resolved?.lightMode && <span className="text-gold"> · light</span>}
        </div>
      </div>

      <ExerciseBrief
        def={def}
        vid={vid ?? null}
        videoOpen={videoOpen}
        onOpenVideo={() => setVideoOpen(true)}
        rolled={rolled}
        live={phase === 'live'}
        stepsOpen={stepsOpen}
        onToggleSteps={() => setStepsOpen((v) => !v)}
        clock={fmtClock(liveSec)}
        clockNote={isTimed ? `of ${set.targetReps}` : 'under tension'}
      />

      {/* One quiet caption line + the single dominant button */}
      <div className="px-4 pt-2">
        {/* The gate: weight goes in BEFORE the set, always in view */}
        {phase === 'go' && isLoaded && (
          <div className="mx-auto mb-2 flex max-w-xs items-center justify-between rounded-2xl border border-accent/30 bg-surface-2 px-4 py-2.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-ink-dim">{loadLabel(def.equipment)}</span>
            <Stepper
              value={set.weightLb}
              onChange={(v) => setWeightForward(session.date, current.exIdx, current.setIdx, v)}
              step={5}
              suffix="lb"
              width="w-16"
            />
          </div>
        )}

        {/* Live: a clean working state, timer for timed sets, otherwise quiet */}
        {/* The clock moved to the middle of the screen, where the
            how-to used to be. This line is just the instruction. */}
        {phase === 'live' && (
          <div className="mb-2 text-center text-[11px] font-black uppercase tracking-[0.22em] text-ink-faint">
            tap or say done when finished
          </div>
        )}
        {caption && (
          <p className="mb-1.5 line-clamp-2 text-center text-[12px] font-semibold leading-snug text-ink-faint">{caption}</p>
        )}
        {phase === 'go' ? (
          <button
            onClick={gateGo}
            className={`w-full rounded-2xl border-2 border-[var(--lip-lime)] py-6 text-[19px] font-black tracking-wide text-[var(--ink-on-lime)] ${
              needsWeight ? 'border-opacity-40 bg-lime/35' : 'press-down bg-lime [--lip:var(--lip-lime)]'
            }`}
          >
            GO · START SET {current.setIdx + 1}
          </button>
        ) : (
          <button
            onClick={advance}
            className="press-down w-full rounded-2xl border-2 border-accent-deep bg-accent py-6 text-[19px] font-black tracking-wide text-white [--lip:var(--lip-accent)]"
          >
            {current.setIdx + 1 === totalSetsThisEx ? 'SET DONE. NEXT' : 'NEXT SET ✓'}
          </button>
        )}
        <div className="mt-2.5 flex items-center justify-center gap-1.5 pb-1">
          {staleOnFirst && (
            <button onClick={restartFresh} className="whitespace-nowrap rounded-full bg-surface-2 px-3 py-2.5 text-[11.5px] font-bold text-cyan active:scale-95">
              ↻ Fresh time
            </button>
          )}
          <button
            onClick={() => setHowToOpen(true)}
            className="whitespace-nowrap rounded-full bg-surface-2 px-3 py-2.5 text-[11.5px] font-bold text-ink-dim active:scale-95"
          >
            How do I do this?
          </button>
          <button onClick={() => setCantFinish(true)} className="whitespace-nowrap rounded-full bg-danger/15 px-3 py-2.5 text-[11.5px] font-bold text-danger active:scale-95">
            Can't finish
          </button>
          <button onClick={() => setTimeCheck(true)} className="whitespace-nowrap rounded-full bg-surface-2 px-3 py-2.5 text-[11.5px] font-bold text-ink-dim active:scale-95">
            Short on time?
          </button>
        </div>
      </div>

      {breakState && (
        <BreakScreen
          brk={breakState}
          mode={soundMode}
          onDone={() => setBreakState(null)}
          onSessionFeel={
            breakState.askSessionFeel ? (f) => setSessionFeel(session.date, f) : undefined
          }
          onShort={(n) => (justRef.current ? recordShortfall(session.date, justRef.current.exIdx, justRef.current.setIdx, n) : null)}
          onRir={(r) => (justRef.current ? recordRir(session.date, justRef.current.exIdx, justRef.current.setIdx, r) : null)}
          onEase={() => {
            const cuts = easeRemaining(session.date)
            if (cuts.length === 0) return 'Nothing left worth cutting. Finish it.'
            const gone = cuts.filter((c) => c.to === 0).map((c) => c.name)
            return gone.length
              ? `Done. ${gone.join(' and ')} dropped.`
              : `Done. ${cuts.length} ${cuts.length === 1 ? 'exercise' : 'exercises'} shortened.`
          }}
          weightLb={set.weightLb}
          loadLabel={isLoaded ? loadLabel(def.equipment) : undefined}
          onWeight={
            isLoaded
              ? (v) => setWeightForward(session.date, current.exIdx, current.setIdx, v)
              : undefined
          }
        />
      )}
      <CantFinishSheet
        open={cantFinish}
        onClose={() => setCantFinish(false)}
        session={session}
        exIdx={current.exIdx}
        setIdx={current.setIdx}
        weightLb={set.weightLb}
        onFinishSession={onFinish}
      />
      <TimeCheckSheet
        open={timeCheck}
        onClose={() => setTimeCheck(false)}
        session={session}
        onFinishSession={onFinish}
      />
      {howToOpen && <HowToSlides def={def} onClose={() => setHowToOpen(false)} />}
    </div>
  )
}


function VolumeIcon({ waves }: { waves: 0 | 1 | 2 | 3 }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" fill="currentColor" stroke="none" />
      {waves >= 1 && <path d="M14.5 10a3.2 3.2 0 0 1 0 4" />}
      {waves >= 2 && <path d="M16.8 8a6.4 6.4 0 0 1 0 8" />}
      {waves >= 3 && <path d="M19.1 6a9.6 9.6 0 0 1 0 12" />}
      {waves === 0 && <path d="M14.5 9.5 20 15M20 9.5 14.5 15" />}
    </svg>
  )
}
