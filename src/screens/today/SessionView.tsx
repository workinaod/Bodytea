import { useEffect, useState } from 'react'
import type { ResolvedDay, SessionLog } from '../../types'
import { getExercise } from '../../plan/exercises'
import { Btn, Chip, Stepper } from '../../components/ui'
import { RestTimer } from '../../components/RestTimer'
import { patchSet, restartSession, trimFromExercise } from '../../logic/actions'
import { useAppStore } from '../../store/appStore'

function fmtElapsed(startedAt?: string): string {
  if (!startedAt) return '0:00'
  const s = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** The in-session logger: cards per exercise, steppers per set, rest timer. */
export function SessionView({
  day,
  session,
  onOpenGuide,
  onFinish,
  onSkip,
}: {
  day: ResolvedDay
  session: SessionLog
  onOpenGuide: (exerciseId: string) => void
  onFinish: () => void
  onSkip: () => void
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  const [timer, setTimer] = useState<{ key: number; seconds: number } | null>(null)
  const restEnabled = useAppStore((s) => s.data.settings.restTimerEnabled)
  const [, force] = useState(0)

  useEffect(() => {
    const id = setInterval(() => force((x) => x + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const totalSets = session.exercises.reduce((n, e) => n + e.sets.length, 0)
  const doneSets = session.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)

  // Never got past the first exercise and 30+ min on the clock → offer a
  // clean restart with fresh time (same session, sets unticked).
  const firstUnpassed = session.exercises.findIndex((e) => e.sets.some((s) => !s.done))
  const startedMs = session.startedAt ? Date.parse(session.startedAt) : 0
  const staleOnFirst = firstUnpassed === 0 && startedMs > 0 && Date.now() - startedMs >= 30 * 60_000

  return (
    <div className="space-y-3 pb-40">
      <div className="flex items-center justify-between px-1">
        <div className="text-[12px] font-bold text-ink-faint">
          {doneSets}/{totalSets} sets · {fmtElapsed(session.startedAt)} elapsed
        </div>
        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%` }}
          />
        </div>
      </div>

      {staleOnFirst && (
        <button
          onClick={() => restartSession(session.date)}
          className="w-full rounded-xl border border-cyan/30 bg-cyan/8 px-3.5 py-2.5 text-left text-[12.5px] font-bold leading-snug text-cyan"
        >
          ↻ Still on the first exercise with the clock running — restart with fresh time
        </button>
      )}

      {session.exercises.map((ex, exIdx) => {
        const def = getExercise(ex.exerciseId)
        const resolved = day.exercises.find((r) => r.exerciseId === ex.exerciseId)
        const open = openIdx === exIdx
        const trimmed = session.trimmedFromIndex !== undefined && exIdx >= session.trimmedFromIndex
        const allDone = ex.sets.every((s) => s.done)
        const isLoaded = def.kind === 'lift' || def.kind === 'carry'
        const isTimed = /sec|min|hold/.test(ex.sets[0]?.targetReps ?? '')

        return (
          <div
            key={`${ex.exerciseId}-${exIdx}`}
            className={`rounded-2xl border transition-colors ${
              trimmed
                ? 'border-edge bg-surface opacity-40'
                : allDone
                  ? 'border-lime/30 bg-lime/5'
                  : open
                    ? 'border-accent/40 bg-surface'
                    : 'border-edge bg-surface'
            }`}
          >
            <button
              className="flex w-full items-center justify-between gap-2 p-4 text-left"
              onClick={() => setOpenIdx(open ? null : exIdx)}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`truncate text-[15px] font-extrabold ${allDone ? 'text-lime' : 'text-ink'}`}>
                    {def.name}
                  </span>
                  {resolved?.lightMode && <Chip tone="gold">light</Chip>}
                  {ex.skipped && <Chip tone="danger">skipped</Chip>}
                </div>
                <div className="mt-0.5 text-[12px] font-semibold text-ink-dim">
                  {ex.sets.length > 1 ? `${ex.sets.length} × ${ex.sets[0]?.targetReps}` : ex.sets[0]?.targetReps}
                  {isLoaded && ex.sets[0]?.weightLb !== undefined && (
                    <span className="text-ink-faint"> · last: {ex.sets[0].weightLb} lb</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenGuide(ex.exerciseId)
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-[13px] font-black text-cyan"
                >
                  ?
                </span>
                <span className="text-ink-faint">{open ? '▾' : '▸'}</span>
              </div>
            </button>

            {open && !trimmed && (
              <div className="space-y-2 border-t border-edge/60 px-4 pb-4 pt-3">
                {resolved?.lightMode && (
                  <div className="text-[11.5px] font-semibold text-gold">
                    Light mode — leave 3 in the tank, ~85% of usual weight.
                  </div>
                )}
                {ex.sets.map((set, setIdx) => (
                  <div key={setIdx} className="flex items-center justify-between gap-2">
                    <span className="w-8 text-[11px] font-black text-ink-faint">S{setIdx + 1}</span>
                    {isLoaded && (
                      <Stepper
                        value={set.weightLb}
                        onChange={(v) => patchSet(session.date, exIdx, setIdx, { weightLb: v })}
                        step={5}
                        suffix="lb"
                      />
                    )}
                    {!isTimed && (
                      <Stepper
                        value={set.reps}
                        onChange={(v) => patchSet(session.date, exIdx, setIdx, { reps: v })}
                        step={1}
                        suffix="reps"
                        width="w-12"
                      />
                    )}
                    {isTimed && (
                      <Stepper
                        value={set.seconds}
                        onChange={(v) => patchSet(session.date, exIdx, setIdx, { seconds: v })}
                        step={5}
                        suffix="sec"
                        width="w-12"
                      />
                    )}
                    <button
                      onClick={() => {
                        const next = !set.done
                        patchSet(session.date, exIdx, setIdx, { done: next })
                        if (next && restEnabled && def.restSec > 0) {
                          setTimer({ key: Date.now(), seconds: def.restSec })
                        }
                      }}
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-lg font-black transition-colors ${
                        set.done
                          ? 'border-lime/50 bg-lime text-black'
                          : 'border-edge bg-surface-2 text-ink-faint'
                      }`}
                    >
                      ✓
                    </button>
                  </div>
                ))}
                {exIdx > 0 && (
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => trimFromExercise(session.date, exIdx)}
                      className="text-[11.5px] font-semibold text-gold underline"
                    >
                      {session.trimmedFromIndex === exIdx ? 'restore the tail' : 'running long — cut from here down'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* The session's own bottom bar sits ON TOP of the nav's slot — only
          a glowing sliver of the tucked-away nav peeks below it (slide that
          to bring the real nav back) */}
      <div className="fixed inset-x-0 bottom-[calc(max(env(safe-area-inset-bottom),8px)+12px)] z-30 border-t border-edge bg-bg/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-lg gap-2">
          <Btn kind="ghost" className="flex-1" onClick={onSkip}>
            Can't finish
          </Btn>
          <Btn kind="lime" className="flex-[2]" onClick={onFinish}>
            Finish session → debrief
          </Btn>
        </div>
      </div>

      {timer && <RestTimer key={timer.key} seconds={timer.seconds} onDismiss={() => setTimer(null)} />}
    </div>
  )
}
