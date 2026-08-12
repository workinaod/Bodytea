import { useEffect, useRef, useState } from 'react'
import type { SessionFeel } from '../../types'
import { say } from '../../platform/speech'
import { Stepper } from '../../components/ui'
import { ExerciseDemo } from '../../components/ExerciseDemo'
import { MuscleMap } from '../../components/MuscleMap'
import { demoFor } from '../../plan/demos'
import { photosFor } from '../../plan/demoPhotos'
import { musclesFor } from '../../plan/muscles'
import { buzzRestOver } from '../../platform/haptics'

/** What the rest screen needs to know about the gap it is filling. */
export interface BreakState {
  seconds: number
  nextName: string
  nextSetLabel: string
  /** Set once, at the halfway point: ask how the whole session is sitting. */
  askSessionFeel?: boolean
  /** The weight came down inside the exercise that just finished. */
  easeOffer?: boolean
  /** Drives the preview of what is coming. */
  nextExerciseId?: string
}

// ============================================================
// The rest screen between sets: a countdown, what is coming
// next, and ONE check-in at the halfway point of the session.
//
// It used to ask "how was the weight?" on the middle set of an
// exercise, once a fortnight. Wrong moment and wrong scope:
// "early on you can feel good but by the third workout your
// dead". Halfway through the whole day is when the answer means
// something, and one answer about the day beats several guesses
// about single lifts.
//
// Its own file because it is a whole screen, not a step in the
// set loop.
// ============================================================

export function BreakScreen({
  brk,
  mode,
  onDone,
  onSessionFeel,
  onEase,
  weightLb,
  loadLabel,
  onWeight,
}: {
  brk: BreakState
  /** The weight already set for the set that is coming up. */
  weightLb?: number
  /** What that weight is per, e.g. "weight per dumbbell". */
  loadLabel?: string
  /** Absent for bodyweight work, where there is nothing to rerack. */
  onWeight?: (v: number) => void
  mode: 'voice' | 'beeps-names' | 'beeps' | 'silent'
  onDone: () => void
  onSessionFeel?: (f: SessionFeel) => void
  /** Shorten what is left. Returns a line describing what changed. */
  onEase?: () => string
}) {
  const endsAt = useRef(Date.now() + brk.seconds * 1000)
  const [remaining, setRemaining] = useState(brk.seconds)
  const [feelDone, setFeelDone] = useState(false)
  const [eased, setEased] = useState<string | null>(null)
  const buzzed = useRef(false)

  // Short and factual, the next gate handles weight + ready
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
          buzzRestOver()
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
  // The green screen is a question, so ask it out loud. Without this the
  // coach talks you into the rest and then goes silent at the one moment
  // you are waiting to be told to move.
  const asked = useRef(false)
  useEffect(() => {
    if (!ready || asked.current) return
    asked.current = true
    if (mode === 'voice' || mode === 'beeps-names') say('Ready?')
  }, [ready, mode])
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
      {/* Rest is exactly when you change the plates or grab different
          bells. Making people wait for the gate to do it means walking
          back to the rack after the countdown has already finished. */}
      {onWeight && (
        <div className="mt-7 flex items-center gap-3 rounded-2xl border border-white/[0.09] bg-white/[0.05] px-4 py-2.5">
          <span className="text-[11px] font-black uppercase tracking-wider text-ink-dim">
            {loadLabel ?? 'weight'}
          </span>
          <Stepper value={weightLb} onChange={onWeight} step={5} suffix="lb" width="w-16" />
        </div>
      )}

      {/* The weight dropped, which is fatigue with a number on it. Offer
          the cut here, during the rest, because that is when a coach
          standing next to you would say it. One tap, never automatic. */}
      {brk.easeOffer && onEase && !eased && (
        <div className="mt-7 w-full max-w-[280px] rounded-2xl border border-gold/30 bg-gold/[0.07] px-4 py-3 text-center">
          <p className="text-[12.5px] leading-snug text-gold/90">
            The weight came down that set. Want me to shorten what is left?
          </p>
          <button
            onClick={() => setEased(onEase() || 'Nothing left worth cutting.')}
            className="press mt-2 rounded-full bg-gold/20 px-4 py-1.5 text-[12px] font-black text-gold"
          >
            Yes, shorten it
          </button>
        </div>
      )}
      {eased && <div className="mt-7 max-w-[280px] text-center text-[11.5px] font-bold text-lime">{eased}</div>}

      {onSessionFeel && !feelDone && (
        <div className="mt-7 text-center">
          <div className="text-[11.5px] font-bold text-ink-dim">How is this session sitting?</div>
          <div className="mt-2 flex gap-1.5">
            {/* The stored value stays 'right', only the word changes.
                It is the id the load rules read and the id already on
                disk, so renaming it would be a migration for a label. */}
            {(
              [
                ['light', 'Light'],
                ['right', 'Perfect'],
                ['heavy', 'Heavy'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => {
                  onSessionFeel(id)
                  setFeelDone(true)
                }}
                className="rounded-full bg-white/[0.07] px-4 py-2 text-[12px] font-bold text-ink-dim active:bg-white/[0.14]"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      {feelDone && <div className="mt-7 text-[11.5px] font-bold text-lime">Got it. Next session adjusts.</div>}
      <button onClick={onDone} className="mt-8 rounded-full bg-white/[0.07] px-5 py-2.5 text-[12.5px] font-bold text-ink-dim">
        skip the rest, I'm ready
      </button>
      <p className="mt-3 max-w-[260px] text-center text-[11px] leading-snug text-ink-faint">
        Full rest is part of the program. Rushing it kills explosive quality.
      </p>

      {/* What is coming, so the rest is spent looking at the movement
          instead of at a number counting down. Same flat dark panel and
          quiet ring as the rest of this screen, nothing shouting. */}
      {brk.nextExerciseId && (
        <div className="mt-7 w-full max-w-sm px-5">
          <div className="rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/[0.06]">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <ExerciseDemo
                  compact
                  spec={demoFor(brk.nextExerciseId)}
                  photos={photosFor(brk.nextExerciseId)}
                />
              </div>
              <div className="w-[34%] shrink-0">
                <MuscleMap
                  compact
                  primary={musclesFor(brk.nextExerciseId).primary}
                  secondary={musclesFor(brk.nextExerciseId).secondary}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- Volume icon: speaker + 0-3 sound waves ----------
