import { useState, type Dispatch, type SetStateAction } from 'react'
import type { RoutineGoal } from '../../types'
import { FOCUS_LABELS, type FocusArea } from '../../plan/generator'
import { ROUTINE_GOAL_LABELS } from '../../plan/bookletOps'
import { Reveal } from '../../components/ui'
import { GOAL_CHIPS, inferGoal, visibleGoalChips } from './onboardingData'
import { Bar, Kicker, Label, Tag, Title, fieldCls, fieldStyle } from './kit'

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
  const first = displayName.trim().split(/\s+/)[0]

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
      <Kicker>{mode === 'byor' ? 'Your routine' : `Good to meet you${first ? `, ${first}` : ''}`}</Kicker>
      <Title sub={mode === 'byor' ? 'Pick every one that applies.' : 'Pick one, or say it your own way.'}>
        {mode === 'byor' ? 'What is it chasing?' : 'So what are you after?'}
      </Title>

      <div className="enter-stagger mt-5 flex flex-wrap gap-1.5">
        {mode === 'byor'
          ? (Object.keys(ROUTINE_GOAL_LABELS) as RoutineGoal[]).map((g) => (
              <Tag key={g} selected={routineGoals.has(g)} onClick={() => toggleRoutineGoal(g)}>
                {ROUTINE_GOAL_LABELS[g]}
              </Tag>
            ))
          : visibleGoalChips({ heightIn: heightIn ?? undefined, weightLb }).map((i) => (
              <Tag key={GOAL_CHIPS[i].label} selected={goalChip === i} onClick={() => setGoalChip(i)}>
                {GOAL_CHIPS[i].label.replace(/^\S+\s/, '')}
              </Tag>
            ))}
      </div>

      {/* Two ways in, and only one is open at a time. Picking a goal has
          already answered the question, so what follows asks for MORE
          rather than asking again — the old screen made you choose a
          goal and then type the same goal out longhand. */}
      {mode !== 'byor' && goalChip !== null ? (
        <Reveal when className="mt-8">
          <Label note="optional">Anything we should know?</Label>
          <textarea
            value={goalDetail}
            onChange={(e) => setGoalDetail(e.target.value)}
            onFocus={() => setMovedOn(true)}
            placeholder={'"before my wedding in June" · "30 lb" · "my knees are bad"'}
            rows={2}
            className={`resize-none ${fieldCls} text-[15px]`} style={fieldStyle}
          />
        </Reveal>
      ) : (
        <div className="mt-8">
          <Label>Say it your own way</Label>
          <textarea
            value={goalStatement}
            onChange={(e) => {
              setGoalStatement(e.target.value)
              // The typed goal is the source of truth: infer the training
              // style from it so ANY goal works without hunting for a chip.
              const g = inferGoal(e.target.value)
              if (g !== null) setGoalChip(g)
            }}
            placeholder={'"lose 30 lb before the summer" · "run a 10K"'}
            rows={2}
            className={`resize-none ${fieldCls} text-[15px]`} style={fieldStyle}
          />
        </div>
      )}

      <Reveal when={showFocus} className="mt-8">
        <Label note="up to 4">Anywhere you want extra work?</Label>
        <div className="enter-stagger flex flex-wrap gap-1.5">
          {(Object.entries(FOCUS_LABELS) as [FocusArea, string][]).map(([id, label]) => (
            <Tag
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
            </Tag>
          ))}
        </div>
      </Reveal>

      {/* Never hidden. A section can wait its turn; the way out cannot. */}
      <div className="mt-auto pt-10">
        <Bar onClick={p.onNext} disabled={blocked}>
          {mode === 'byor' ? 'Next: build my week' : 'Next: a few questions'}
        </Bar>
      </div>
    </div>
  )
}
