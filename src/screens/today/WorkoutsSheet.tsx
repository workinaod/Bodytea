import { useMemo, useState } from 'react'
import type { DebriefData, ISODate } from '../../types'
import { useAppStore } from '../../store/appStore'
import { getExercise } from '../../plan/exercises'
import { FOCUS_LABEL, generalWorkoutsFor, type WorkoutFocus } from '../../plan/generalWorkouts'
import { Btn, Chip } from '../../components/ui'
import { Sheet } from '../../components/Sheet'
import { logExtraWork, startCustomSession } from '../../logic/sessionStart'
import { briefForItems } from '../../engine/workoutBrief'
import { WorkoutBriefSheet } from './WorkoutBriefSheet'

// ============================================================
// The general workouts shelf on screen: scroll it, open one,
// run it. Every workout arrives already fitted to this
// athlete's gear through the generator's substitution chains,
// so nothing on the shelf asks for equipment they don't own.
// ============================================================

export function WorkoutsSheet({
  open,
  date,
  onClose,
  onLive,
  onLogged,
}: {
  open: boolean
  date: ISODate
  onClose: () => void
  /** A live session now exists for `date`; close everything above. */
  onLive: () => void
  /** Logged after the fact; the debrief when there is one to show. */
  onLogged: (d: DebriefData | null) => void
}) {
  const equipment = useAppStore((s) => s.data.plan.equipment)
  const [focus, setFocus] = useState<WorkoutFocus | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [briefId, setBriefId] = useState<string | null>(null)

  const shelf = useMemo(() => generalWorkoutsFor(equipment), [equipment])
  const focuses = useMemo(
    () => [...new Set(shelf.map((w) => w.focus))] as WorkoutFocus[],
    [shelf],
  )
  const shown = focus ? shelf.filter((w) => w.focus === focus) : shelf
  // Built for the workout as this athlete's gear left it, never as authored.
  const briefWorkout = shelf.find((w) => w.id === briefId) ?? null
  const brief = useMemo(
    () => (briefWorkout ? briefForItems(briefWorkout.items, briefWorkout.tagline) : null),
    [briefWorkout],
  )

  return (
    <Sheet open={open} onClose={onClose} title="Workouts">
      <div className="pb-8">
        <p className="mb-2.5 px-0.5 text-[12px] leading-snug text-ink-dim">
          Ready-made sessions for any day, fitted to your gear. They log like real sessions,
          because they are.
        </p>
        {focuses.length > 1 && (
          <div className="no-scrollbar -mx-1 mb-3 overflow-x-auto px-1">
            <div className="flex w-max gap-1.5">
              {focuses.map((f) => (
                <Chip key={f} tone={focus === f ? 'accent' : 'default'} onClick={() => setFocus(focus === f ? null : f)}>
                  {FOCUS_LABEL[f]}
                </Chip>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {shown.map((w) => {
            const expanded = openId === w.id
            return (
              <div
                key={w.id}
                className={`rounded-2xl ring-1 transition-colors ${
                  expanded ? 'bg-white/[0.06] ring-accent/30' : 'bg-white/[0.045] ring-white/[0.05]'
                }`}
              >
                <button
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                  onClick={() => setOpenId(expanded ? null : w.id)}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[14.5px] font-extrabold">{w.title}</span>
                    <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-faint">
                      {FOCUS_LABEL[w.focus]} · ~{w.minutes} min · {w.items.length} movements
                    </span>
                  </span>
                  <span className="shrink-0 text-ink-faint">{expanded ? '▾' : '▸'}</span>
                </button>
                {expanded && (
                  <div className="space-y-2.5 border-t border-white/[0.05] px-4 pb-4 pt-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 text-[12px] leading-snug text-ink-dim">{w.tagline}</p>
                      <button
                        aria-label={`How ${w.title} works`}
                        onClick={() => setBriefId(w.id)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-[13px] font-black text-cyan active:bg-white/[0.11]"
                      >
                        ?
                      </button>
                    </div>
                    <div>
                      {w.items.map((item, i) => (
                        <div
                          key={item.exerciseId}
                          className={`flex items-center justify-between gap-3 py-2 ${i > 0 ? 'border-t border-edge/40' : ''}`}
                        >
                          <span className="min-w-0 truncate text-[13px] font-bold">
                            {getExercise(item.exerciseId).name}
                          </span>
                          <span className="num shrink-0 text-[12px] font-semibold text-ink-dim">
                            {item.sets > 1 ? `${item.sets} × ${item.repText}` : item.repText}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Btn
                        className="flex-[3]"
                        onClick={() => {
                          startCustomSession(date, w.title, w.items)
                          onLive()
                        }}
                      >
                        Start this workout
                      </Btn>
                      <Btn
                        kind="ghost"
                        className="flex-[2]"
                        onClick={() => {
                          onLogged(logExtraWork(date, w.title, w.items))
                        }}
                      >
                        Already did it
                      </Btn>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <WorkoutBriefSheet
        brief={brief}
        title={briefWorkout?.title ?? ''}
        onClose={() => setBriefId(null)}
      />
    </Sheet>
  )
}
