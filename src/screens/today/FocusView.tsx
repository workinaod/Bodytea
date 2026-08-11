import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ExerciseDef, ResolvedDay, SessionLog } from '../../types'
import { getExercise } from '../../plan/exercises'
import { currentFocusItem, focusProgress, nextFocusItem, restAfter } from '../../engine/focus'
import { beep, cancelSpeech, say, speechInSupported, startEars } from '../../logic/speech'
import { useAppStore } from '../../store/appStore'
import { abandonSession, patchSet, restartSession } from '../../logic/actions'
import { Stepper } from '../../components/ui'
import { MuscleMap } from '../../components/MuscleMap'
import { ExerciseDemo } from '../../components/ExerciseDemo'
import { musclesFor } from '../../plan/muscles'
import { demoFor } from '../../plan/demos'
import { photosFor } from '../../plan/demoPhotos'

// ============================================================
// Focus mode, guided: each set is intro'd (name, set, reps at
// weight), the weight is confirmed BEFORE the set, ready starts
// a true 1-second 3-2-1 — then the coach shuts up and lets you
// work. Instructions are spoken only when asked, and shortened.
// ============================================================

interface BreakState {
  seconds: number
  nextName: string
  nextSetLabel: string
}

/** What load the number means, by equipment. "Your weight" reads like
    body weight; "Weight per dumbbell" can't be misread. */
function loadLabel(equipment: string): string {
  if (/dumbbell/i.test(equipment)) return 'Weight per dumbbell'
  if (/barbell|ez bar|trap bar/i.test(equipment)) return 'Weight on the bar'
  if (/kettlebell/i.test(equipment)) return 'Kettlebell weight'
  return 'Added weight'
}

/** The main details in one breath — cue first, then the first two steps
    trimmed to their opening clause. Never the write-up verbatim. */
function shortHowTo(def: ExerciseDef): string {
  const bits = [def.cue, ...def.steps.slice(0, 2).map((s) => s.split(/[,.;—(]/)[0]?.trim())]
  return `${bits.filter(Boolean).join('. ')}.`
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
  // 'go' = the ready gate (weight confirm), 'live' = they're working
  const [phase, setPhase] = useState<'go' | 'live'>('go')
  const [caption, setCaption] = useState('')
  const data = useAppStore((s) => s.data)
  const update = useAppStore((s) => s.update)
  // Four sound levels: full voice / beeps + next-exercise name / beeps / silent
  const soundMode = data.settings.soundMode ?? ((data.settings.voiceCoach ?? true) ? 'voice' : 'silent')
  const [soundOpen, setSoundOpen] = useState(false)
  const soundRef = useRef(soundMode)
  soundRef.current = soundMode

  // Flipping the sound down mid-sentence must actually silence it
  useEffect(() => {
    if (soundMode !== 'voice') cancelSpeech()
  }, [soundMode])

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

  // ---- Countdown timers (the only scheduled audio left) ----
  const timers = useRef<number[]>([])
  const clearTimers = useCallback(() => {
    for (const id of timers.current) window.clearTimeout(id)
    timers.current = []
    cancelSpeech()
  }, [])

  // ---- Live clock for timed sets (audio-free pacing on screen) ----
  const liveStartRef = useRef(0)
  const [liveTick, setLiveTick] = useState(0)
  useEffect(() => {
    if (phase !== 'live' || !isTimed) return
    const id = window.setInterval(() => setLiveTick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [phase, isTimed])
  const liveSec = phase === 'live' && liveStartRef.current > 0 ? Math.max(0, Math.floor((Date.now() - liveStartRef.current) / 1000)) : 0
  void liveTick

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
  const advance = useCallback(() => {
    if (!current) return
    clearTimers()
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
      // Rapid-fire block: no break, no gate friction — roll straight on
      autoStartNext.current = true
    } else {
      setPhase('go')
    }
  }, [current, session, clearTimers])

  // New set position: back to the gate — unless a rapid-fire advance asked to roll
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
  // instruction reading — that only happens on request.
  const introFor = useRef<string | null>(null)
  useEffect(() => {
    if (!def || !set || !current || breakState || phase !== 'go') return
    if (introFor.current === posKey) return
    introFor.current = posKey
    const repsBit = isTimed
      ? set.targetReps
      : set.reps !== undefined
        ? `${set.reps} reps`
        : `${set.targetReps.replace(/[-–]/, ' to ')} reps`
    const weightBit = isLoaded && set.weightLb !== undefined ? ` at ${set.weightLb} pounds` : ''
    const intro = `${def.name}. Set ${current.setIdx + 1} of ${ex?.sets.length}: ${repsBit}${weightBit}.`
    const prompt = isLoaded ? `${loadLabel(def.equipment)} first, then say ready.` : 'Say ready when set.'
    setCaption(`${intro} ${prompt}`)
    if (soundRef.current === 'voice') say(`${intro} ${prompt}`, { interrupt: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posKey, breakState, phase])

  // Instructions only when asked — and shortened, not the write-up
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

  useEffect(() => {
    if (!voiceOn || !voiceSupported) return
    const stop = startEars({
      onGo: () => {
        if (breakRef.current) setBreakState(null) // back to the gate — weight first
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
    })
    return stop
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
              <div className="absolute right-0 top-9 z-20 w-56 overflow-hidden rounded-2xl border border-edge bg-surface shadow-2xl">
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
                    className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left ${i > 0 ? 'border-t border-edge/50' : ''} ${soundMode === id ? 'bg-accent/10' : ''}`}
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
              onClick={() => setVoiceOn(!voiceOn)}
              aria-label="Voice control"
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${voiceOn ? 'bg-lime text-black' : 'bg-surface-2 text-ink-dim'}`}
            >
              <svg viewBox="0 0 24 24" className="h-[13px] w-[13px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="2.5" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3.5" />
              </svg>
              {voiceOn ? 'on' : 'voice'}
            </button>
          )}
          <button onClick={() => onOpenGuide(def.id)} className="rounded-full bg-surface-2 px-3 py-1.5 text-[11px] font-black text-cyan">
            ?
          </button>
        </div>
      </div>

      {/* Exercise name + prescription — told, not picked */}
      <div className="mt-3 px-5 text-center">
        <h2 className="text-[25px] font-black leading-tight tracking-tight">{def.name}</h2>
        <div className="mt-1.5 text-[12px] font-black uppercase tracking-[0.14em] text-ink-dim">
          Set {current.setIdx + 1} of {totalSetsThisEx}
          <span className="text-accent-soft"> · {set.targetReps}{!isTimed && !/rep/i.test(set.targetReps) ? ' reps' : ''}</span>
          {resolved?.lightMode && <span className="text-gold"> · light</span>}
        </div>
      </div>

      {/* Middle: reference material (screen-followers live here) */}
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

      </div>

      {/* One quiet caption line + the single dominant button */}
      <div className="px-4 pt-2">
        {/* The gate: weight goes in BEFORE the set — always in view */}
        {phase === 'go' && isLoaded && (
          <div className="mx-auto mb-2 flex max-w-xs items-center justify-between rounded-2xl border border-accent/30 bg-surface px-4 py-2.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-ink-dim">{loadLabel(def.equipment)}</span>
            <Stepper
              value={set.weightLb}
              onChange={(v) => patchSet(session.date, current.exIdx, current.setIdx, { weightLb: v })}
              step={5}
              suffix="lb"
              width="w-16"
            />
          </div>
        )}

        {/* Live: a clean working state — timer for timed sets, otherwise quiet */}
        {phase === 'live' && (
          <div className="mb-2 text-center">
            {isTimed ? (
              <div className="font-display text-[44px] font-black leading-none tabular-nums text-accent">{liveSec}s</div>
            ) : (
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-ink-faint">
                working · tap or say done when finished
              </div>
            )}
          </div>
        )}
        {caption && (
          <p className="mb-1.5 truncate text-center text-[12px] font-semibold text-ink-faint">{caption}</p>
        )}
        {phase === 'go' ? (
          <button
            onClick={gateGo}
            className={`w-full rounded-2xl py-6 text-[19px] font-black tracking-wide text-black shadow-2xl active:scale-[0.985] ${
              needsWeight ? 'bg-lime/40 shadow-none' : 'bg-lime shadow-lime/25'
            }`}
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
          {staleOnFirst && (
            <button onClick={restartFresh} className="text-[11.5px] font-semibold text-cyan underline">
              ↻ restart with fresh time
            </button>
          )}
          <button onClick={speakInstructions} className="text-[11.5px] font-semibold text-ink-faint underline">
            how do I do this?
          </button>
          <button onClick={onSkip} className="text-[11.5px] font-semibold text-danger underline">
            can't finish
          </button>
        </div>
      </div>

      {breakState && (
        <BreakScreen
          brk={breakState}
          mode={soundMode}
          onDone={() => setBreakState(null)}
        />
      )}
    </div>
  )
}

// ---------- Break screen: countdown → back to the gate ----------

function BreakScreen({ brk, mode, onDone }: { brk: BreakState; mode: 'voice' | 'beeps-names' | 'beeps' | 'silent'; onDone: () => void }) {
  const endsAt = useRef(Date.now() + brk.seconds * 1000)
  const [remaining, setRemaining] = useState(brk.seconds)
  const buzzed = useRef(false)

  // Short and factual — the next gate handles weight + ready
  useEffect(() => {
    if (mode === 'voice') say(`Rest. Next: ${brk.nextName}, ${brk.nextSetLabel}.`)
    else if (mode === 'beeps-names') say(brk.nextName)
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
          tap to continue
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

// ---------- Volume icon: speaker + 0-3 sound waves ----------

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
