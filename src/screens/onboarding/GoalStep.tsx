import type { Dispatch, SetStateAction } from 'react'
import type { Goal, RoutineGoal } from '../../types'
import { FOCUS_LABELS, GOAL_FOLLOWUPS, type FocusArea } from '../../plan/generator'
import { ROUTINE_GOAL_LABELS } from '../../plan/bookletOps'
import { Btn, Chip } from '../../components/ui'
import { GOAL_CHIPS, inferGoal } from './onboardingData'

// ============================================================
// The step the whole plan is built from.
//
// Everything downstream — the split, the rep waves, the protein
// number, the wording — is chosen from what happens on this
// screen, which is why it is the longest one and why it earns
// its own file.
// ============================================================

export function GoalStep(p: {
  mode: 'gen' | 'byor'
  displayName: string
  goal: Goal
  goalChip: number | null
  setGoalChip: (n: number | null) => void
  routineGoals: Set<RoutineGoal>
  toggleRoutineGoal: (g: RoutineGoal) => void
  goalStatement: string
  setGoalStatement: (s: string) => void
  goalAnswers: Record<string, string>
  setGoalAnswers: Dispatch<SetStateAction<Record<string, string>>>
  target1: { label: string; target: string; unit: string }
  setTarget1: Dispatch<SetStateAction<{ label: string; target: string; unit: string }>>
  focusAreas: Set<FocusArea>
  setFocusAreas: Dispatch<SetStateAction<Set<FocusArea>>>
  onNext: () => void
}) {
  const {
    mode, displayName, goal, goalChip, setGoalChip, routineGoals, toggleRoutineGoal,
    goalStatement, setGoalStatement, goalAnswers, setGoalAnswers, target1, setTarget1,
    focusAreas, setFocusAreas,
  } = p
  return (
          <div className="flex flex-1 flex-col">
            <h2 className="headline text-[26px]">
              {mode === 'byor'
                ? 'What is this routine chasing?'
                : `What are you chasing${displayName.trim() ? `, ${displayName.trim().split(/\s+/)[0]}` : ''}?`}
            </h2>
            {mode === 'byor' && (
              <p className="mt-1 text-[13px] text-ink-dim">Pick every one that applies. The notes check your routine against them.</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {mode === 'byor'
                ? (Object.keys(ROUTINE_GOAL_LABELS) as RoutineGoal[]).map((g) => (
                    <Chip key={g} tone={routineGoals.has(g) ? 'accent' : 'default'} onClick={() => toggleRoutineGoal(g)}>
                      {ROUTINE_GOAL_LABELS[g]}
                    </Chip>
                  ))
                : GOAL_CHIPS.map((g, i) => (
                    <Chip key={g.label} tone={goalChip === i ? 'accent' : 'default'} onClick={() => setGoalChip(i)}>
                      {g.label}
                    </Chip>
                  ))}
            </div>
            <p className="mt-5 text-[12px] font-black uppercase tracking-wider text-ink-faint">Now say it in YOUR words. Anything.</p>
            <textarea
              value={goalStatement}
              onChange={(e) => {
                setGoalStatement(e.target.value)
                // The typed goal is the source of truth: infer the training
                // category from it so any goal Just Works without hunting chips
                if (goalChip === null) {
                  const g = inferGoal(e.target.value)
                  if (g !== null) setGoalChip(g)
                }
              }}
              placeholder={'"dunk on a 10-ft rim"  ·  "run my first 50K"  ·  "lose 40 lb"  ·  "bench 225"'}
              rows={2}
              className="mt-2 w-full resize-none rounded-xl bg-white/[0.05] ring-1 ring-white/[0.05] px-4 py-3 text-[14px] font-semibold text-ink outline-none focus:ring-accent/45"
            />
            <p className="mt-1 text-[11px] text-ink-faint">
              The whole plan gets built around this exact sentence. The chips above just tell the engine which training style carries it.
            </p>

            {/* The coach's follow-ups: "gain 20 lbs" alone can't build a
                great plan. One tap each, every answer shapes the build. */}
            {mode !== 'byor' && goalChip !== null && (
              <div className="mt-5 rounded-2xl bg-white/[0.05] p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-accent">Coach follow-ups</p>
                <p className="mt-0.5 text-[11px] text-ink-faint">One tap each. Every answer changes how your plan gets built.</p>
                {GOAL_FOLLOWUPS[goal].map((fq) => (
                  <div key={fq.id} className="mt-3.5">
                    <p className="text-[12.5px] font-bold">{fq.q}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {fq.options.map((o) => (
                        <Chip
                          key={o}
                          tone={goalAnswers[fq.id] === o ? 'accent' : 'default'}
                          onClick={() =>
                            setGoalAnswers((p) => {
                              const n = { ...p }
                              if (n[fq.id] === o) delete n[fq.id]
                              else n[fq.id] = o
                              return n
                            })
                          }
                        >
                          {o}
                        </Chip>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-5 text-[12px] font-black uppercase tracking-wider text-ink-faint">Optional: a number to beat</p>
            <div className="mt-2 flex gap-2">
              <input
                value={target1.label}
                onChange={(e) => setTarget1({ ...target1, label: e.target.value })}
                placeholder="e.g. Vert"
                className="min-w-0 flex-1 rounded-xl bg-white/[0.05] ring-1 ring-white/[0.05] px-3 py-2.5 text-[13px] font-semibold outline-none focus:ring-accent/45"
              />
              <input
                value={target1.target}
                onChange={(e) => setTarget1({ ...target1, target: e.target.value.replace(/[^0-9.]/g, '') })}
                placeholder="30"
                inputMode="decimal"
                className="w-16 rounded-xl bg-white/[0.05] ring-1 ring-white/[0.05] px-3 py-2.5 text-[13px] font-semibold outline-none focus:ring-accent/45"
              />
              <input
                value={target1.unit}
                onChange={(e) => setTarget1({ ...target1, unit: e.target.value })}
                placeholder="in"
                className="w-14 rounded-xl bg-white/[0.05] ring-1 ring-white/[0.05] px-3 py-2.5 text-[13px] font-semibold outline-none focus:ring-accent/45"
              />
            </div>
            {mode !== 'byor' && (
              <>
                <p className="mt-5 text-[12px] font-black uppercase tracking-wider text-ink-faint">
                  Want extra attention anywhere? <span className="font-semibold normal-case tracking-normal">(pick up to 2)</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(Object.entries(FOCUS_LABELS) as [FocusArea, string][]).map(([id, label]) => (
                    <Chip
                      key={id}
                      tone={focusAreas.has(id) ? 'accent' : 'default'}
                      onClick={() =>
                        setFocusAreas((prev) => {
                          const n = new Set(prev)
                          if (n.has(id)) n.delete(id)
                          else if (n.size < 2) n.add(id)
                          return n
                        })
                      }
                    >
                      {label}
                    </Chip>
                  ))}
                </div>
                {focusAreas.size > 0 && (
                  <p className="mt-1 text-[11px] text-ink-faint">
                    Direct {[...focusAreas].map((f) => FOCUS_LABELS[f].toLowerCase()).join(' + ')} work gets written into the plan every week.
                  </p>
                )}
              </>
            )}

            <Btn
              className="mt-6 w-full py-4"
              onClick={p.onNext}
              disabled={(mode === 'byor' ? routineGoals.size === 0 : goalChip === null) || goalStatement.trim().length < 4}
            >
              {mode === 'byor' ? 'Next: my numbers' : 'Next: my week'}
            </Btn>
            {((mode === 'byor' ? routineGoals.size === 0 : goalChip === null) || goalStatement.trim().length < 4) && (
              <p className="mt-2 text-center text-[11.5px] text-ink-faint">
                {mode === 'byor' ? 'Pick at least one AND write the goal in your own words.' : 'Pick a goal AND write it in your own words.'}
              </p>
            )}
          </div>
  )
}
