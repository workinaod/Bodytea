import type { Dispatch, SetStateAction } from 'react'
import type { RoutineGoal } from '../../types'
import { FOCUS_LABELS, type FocusArea } from '../../plan/generator'
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
  goalChip: number | null
  setGoalChip: (n: number | null) => void
  routineGoals: Set<RoutineGoal>
  toggleRoutineGoal: (g: RoutineGoal) => void
  goalStatement: string
  setGoalStatement: (s: string) => void
  goalDetail: string
  setGoalDetail: (s: string) => void
  focusAreas: Set<FocusArea>
  setFocusAreas: Dispatch<SetStateAction<Set<FocusArea>>>
  onNext: () => void
}) {
  const {
    mode, displayName, goalChip, setGoalChip, routineGoals, toggleRoutineGoal,
    goalStatement, setGoalStatement, goalDetail, setGoalDetail, focusAreas, setFocusAreas,
  } = p
  return (
          <div className="flex flex-1 flex-col">
            <h2 className="headline text-center text-[26px]">
              {mode === 'byor'
                ? 'What is this routine chasing?'
                : `What do you want${displayName.trim() ? `, ${displayName.trim().split(/\s+/)[0]}` : ''}?`}
            </h2>
            <p className="mt-1 text-center text-[13px] text-ink-dim">
              {mode === 'byor' ? 'Pick every one that applies.' : 'Pick one to start from, or type your own below.'}
            </p>
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
            {/* Two ways in, and only one is open at a time.
                Picking a chip has already answered the question, so what
                follows asks for EXTRA rather than asking again — the old
                screen made you choose a goal and then type the same goal
                out longhand before it would let you continue. */}
            {mode !== 'byor' && goalChip !== null ? (
              <div className="enter mt-5">
                <p className="text-[12px] font-black uppercase tracking-wider text-ink-faint">
                  Anything else? <span className="font-semibold normal-case tracking-normal">(optional)</span>
                </p>
                <textarea
                  value={goalDetail}
                  onChange={(e) => setGoalDetail(e.target.value)}
                  placeholder={'"before my wedding in June"  ·  "30 lb"  ·  "my knees are bad"'}
                  rows={2}
                  className="mt-2 w-full resize-none rounded-xl bg-white/[0.05] px-4 py-3 text-[14px] font-semibold text-ink outline-none ring-1 ring-white/[0.05] focus:ring-accent/45"
                />
              </div>
            ) : (
              <>
            <p className="mt-5 text-[12px] font-black uppercase tracking-wider text-ink-faint">Or tell us in your own words</p>
            <textarea
              value={goalStatement}
              onChange={(e) => {
                setGoalStatement(e.target.value)
                // The typed goal is the source of truth: infer the training
                // style from it so ANY goal works without hunting for a chip.
                const g = inferGoal(e.target.value)
                if (g !== null) setGoalChip(g)
              }}
              placeholder={'"lose 30 lb before the summer"  ·  "keep up with my kids"  ·  "run a 10K"'}
              rows={2}
              className="mt-2 w-full resize-none rounded-xl bg-white/[0.05] ring-1 ring-white/[0.05] px-4 py-3 text-[14px] font-semibold text-ink outline-none focus:ring-accent/45"
            />
              </>
            )}

            {mode !== 'byor' && (
              <>
                <p className="mt-5 text-[12px] font-black uppercase tracking-wider text-ink-faint">
                  Anywhere you want extra work? <span className="font-semibold normal-case tracking-normal">(up to 4)</span>
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
                          else if (n.size < 4) n.add(id)
                          return n
                        })
                      }
                    >
                      {label}
                    </Chip>
                  ))}
                </div>
              </>
            )}

            <Btn
              className="mt-6 w-full py-4"
              onClick={p.onNext}
              disabled={mode === 'byor' ? routineGoals.size === 0 || goalStatement.trim().length < 4 : goalChip === null}
            >
              {mode === 'byor' ? 'Next: my numbers' : 'Next: a few questions'}
            </Btn>
            {(mode === 'byor' ? routineGoals.size === 0 || goalStatement.trim().length < 4 : goalChip === null) && (
              <p className="mt-2 text-center text-[11.5px] text-ink-faint">
                {mode === 'byor' ? 'Pick one, and say it in your own words.' : 'Pick one, or type your own.'}
              </p>
            )}
          </div>
  )
}
