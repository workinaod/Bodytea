import { useState, type Dispatch, type SetStateAction } from 'react'
import type { RoutineGoal } from '../../types'
import { FOCUS_LABELS, type FocusArea } from '../../plan/generator'
import { ROUTINE_GOAL_LABELS } from '../../plan/bookletOps'
import { Btn, ChoiceChip, Reveal } from '../../components/ui'
import { GOAL_CHIPS, inferGoal, visibleGoalChips } from './onboardingData'

// ============================================================
// The step the whole plan is built from.
//
// Everything downstream — the split, the rep waves, the protein
// number, the wording — is chosen from what happens on this
// screen, which is why it is the longest one and why it earns
// its own file.
//
// It arrives in three beats rather than all at once: the goals,
// then a box for the detail, then where you want the extra work.
// Each one appears when the one before it is done with.
// ============================================================

export function GoalStep(p: {
  mode: 'gen' | 'byor'
  displayName: string
  /** What the app already knows, which decides which goals it offers. */
  heightIn: number | null
  weightLb: number
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
    mode, displayName, heightIn, weightLb, goalChip, setGoalChip, routineGoals, toggleRoutineGoal,
    goalStatement, setGoalStatement, goalDetail, setGoalDetail, focusAreas, setFocusAreas,
  } = p

  // The detail box is optional, so it cannot be the thing that unlocks
  // what follows. Typing in it counts, and so does tapping anywhere
  // once it is on screen — which is what somebody with nothing to add
  // does next anyway.
  const [movedOn, setMovedOn] = useState(false)
  const picked = mode === 'byor' ? routineGoals.size > 0 : goalChip !== null
  const detailDone = movedOn || goalDetail.trim().length > 0
  const showFocus = mode !== 'byor' && picked && detailDone

  const blocked = mode === 'byor'
    ? routineGoals.size === 0 || goalStatement.trim().length < 4
    : goalChip === null

  return (
    <div
      className="flex flex-1 flex-col"
      // A tap anywhere, once a goal is chosen, is somebody saying "that
      // is all". The guard reads the value from THIS render, so the tap
      // that picks the goal cannot also skip past the box it opens.
      onClick={() => {
        if (picked) setMovedOn(true)
      }}
    >
      <h2 className="headline text-center text-[30px]">
        {mode === 'byor'
          ? 'What is this routine chasing?'
          : `What are your goals${displayName.trim() ? `, ${displayName.trim().split(/\s+/)[0]}` : ''}?`}
      </h2>
      <p className="mt-1 text-center text-[13px] text-ink-dim">
        {mode === 'byor' ? 'Pick every one that applies.' : 'Pick one, or type your own.'}
      </p>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {mode === 'byor'
          ? (Object.keys(ROUTINE_GOAL_LABELS) as RoutineGoal[]).map((g) => (
              <ChoiceChip key={g} selected={routineGoals.has(g)} onClick={() => toggleRoutineGoal(g)}>
                {ROUTINE_GOAL_LABELS[g]}
              </ChoiceChip>
            ))
          : visibleGoalChips({ heightIn: heightIn ?? undefined, weightLb }).map((i) => (
              <ChoiceChip key={GOAL_CHIPS[i].label} selected={goalChip === i} onClick={() => setGoalChip(i)}>
                {GOAL_CHIPS[i].label}
              </ChoiceChip>
            ))}
      </div>

      {/* Two ways in, and only one is open at a time. Picking a goal has
          already answered the question, so what follows asks for MORE
          rather than asking again — the old screen made you choose a
          goal and then type the same goal out longhand. */}
      {mode !== 'byor' && goalChip !== null ? (
        <Reveal when className="mt-5">
          <p className="text-center text-[12px] font-black uppercase tracking-[0.16em] text-ink-faint">Let's get specific</p>
          <textarea
            value={goalDetail}
            onChange={(e) => setGoalDetail(e.target.value)}
            onFocus={() => setMovedOn(true)}
            placeholder={'"before my wedding in June"  ·  "30 lb"  ·  "my knees are bad"'}
            rows={2}
            className="mt-2.5 w-full resize-none rounded-2xl bg-white/[0.05] px-4 py-3 text-center text-[14px] font-semibold text-ink outline-none ring-1 ring-white/[0.07] transition-[background,box-shadow] focus:bg-white/[0.08] focus:ring-accent/55"
          />
        </Reveal>
      ) : (
        <>
          <p className="mt-6 text-center text-[12px] font-black uppercase tracking-[0.16em] text-ink-faint">Or say it yourself</p>
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
            className="mt-2.5 w-full resize-none rounded-2xl bg-white/[0.05] px-4 py-3 text-center text-[14px] font-semibold text-ink outline-none ring-1 ring-white/[0.07] transition-[background,box-shadow] focus:bg-white/[0.08] focus:ring-accent/55"
          />
        </>
      )}

      <Reveal when={showFocus} className="mt-5">
        <p className="text-center text-[12px] font-black uppercase tracking-[0.16em] text-ink-faint">
          Anywhere you want to focus on <span className="font-semibold normal-case tracking-normal">(up to 4)</span>
        </p>
        <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
          {(Object.entries(FOCUS_LABELS) as [FocusArea, string][]).map(([id, label]) => (
            <ChoiceChip
              key={id}
              selected={focusAreas.has(id)}
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
            </ChoiceChip>
          ))}
        </div>
      </Reveal>

      {/* Never hidden. A section can wait its turn; the way out cannot. */}
      <Btn className="mt-6 w-full py-4" onClick={p.onNext} disabled={blocked}>
        {mode === 'byor' ? 'Next: build my week' : 'Next: a few questions'}
      </Btn>
      {blocked && (
        <p className="mt-2 text-center text-[11.5px] text-ink-faint">
          {mode === 'byor' ? 'Pick one, and say it in your own words.' : 'Pick one, or type your own.'}
        </p>
      )}
    </div>
  )
}
