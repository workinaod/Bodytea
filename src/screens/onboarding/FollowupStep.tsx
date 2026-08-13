import type { Dispatch, SetStateAction } from 'react'
import type { Goal } from '../../types'
import { buildFollowups, type GoalFollowup } from '../../plan/followups'
import { Btn, ChoiceChip } from '../../components/ui'

// ============================================================
// The coach's questions, on their own screen.
//
// It reveals rather than dumps: one question at a time, the next
// appearing as the last is answered. Seven questions on screen at
// once is a form and people bail on forms; seven questions that
// arrive one at a time is a conversation, and the same person
// answers all of them.
//
// It also adapts. Say basketball and you get asked your position;
// say swimming and that question never existed. That is the whole
// difference between a questionnaire and somebody paying
// attention.
// ============================================================

const field =
  'w-full rounded-2xl bg-white/[0.05] px-4 py-3 text-[15px] text-ink outline-none ring-1 ring-white/[0.07] transition-[background,box-shadow] placeholder:text-ink-faint/60 focus:bg-white/[0.08] focus:ring-accent/55'

function Question({
  fq,
  value,
  onPick,
}: {
  fq: GoalFollowup
  value: string | undefined
  onPick: (v: string) => void
}) {
  return (
    <div>
      <p className="text-center text-[15px] font-bold text-ink">{fq.q}</p>
      {fq.kind === 'number' ? (
        <div className="mx-auto mt-2.5 flex max-w-[15rem] gap-2">
          <input
            inputMode="decimal"
            value={value ?? ''}
            onChange={(e) => onPick(e.target.value)}
            placeholder={fq.placeholder}
            className={field}
          />
          {fq.unit && (
            <span className="flex items-center rounded-xl bg-white/[0.05] px-3 text-[13px] font-bold text-ink-faint">
              {fq.unit}
            </span>
          )}
        </div>
      ) : fq.kind === 'text' ? (
        <input
          value={value ?? ''}
          onChange={(e) => onPick(e.target.value)}
          placeholder={fq.placeholder}
          className={`mx-auto mt-2.5 block max-w-[19rem] text-center ${field}`}
        />
      ) : (
        <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
          {(fq.options ?? []).map((o) => (
            <ChoiceChip key={o} selected={value === o} onClick={() => onPick(o)}>
              {o}
            </ChoiceChip>
          ))}
        </div>
      )}
    </div>
  )
}

export function FollowupStep({
  goal,
  statement,
  firstName,
  answers,
  setAnswers,
  onNext,
}: {
  goal: Goal
  /** Their goal in their own words — read, so nothing is asked twice. */
  statement: string
  firstName: string
  answers: Record<string, string>
  setAnswers: Dispatch<SetStateAction<Record<string, string>>>
  onNext: () => void
}) {
  const questions = buildFollowups({ goal, statement, answers })

  // Show everything answered, plus the next one. A chip question counts
  // as answered on tap; a typed one counts once there is something in
  // it, so an empty optional box never blocks the screen from moving on.
  const answered = (fq: GoalFollowup) => (answers[fq.id] ?? '').trim().length > 0
  let revealed = 0
  for (const q of questions) {
    revealed++
    if (!answered(q)) break
  }
  const shown = questions.slice(0, revealed)

  return (
    <div className="flex flex-1 flex-col">
      <h2 className="headline text-center text-[30px]">
        {firstName ? `A few things, ${firstName}` : 'A few things'}
      </h2>
      <p className="mt-1 text-center text-[13px] text-ink-dim">Every answer changes your plan.</p>

      <div className="mt-6 space-y-6">
        {shown.map((fq) => (
          <div key={fq.id + (fq.showIf?.id ?? '')} className="enter">
            <Question
              fq={fq}
              value={answers[fq.id]}
              onPick={(v) =>
                setAnswers((prev) => {
                  const next = { ...prev, [fq.id]: v }
                  // Changing an answer that other questions hang off
                  // clears what it revealed, so a basketball position
                  // does not survive switching to swimming.
                  for (const other of questions) {
                    if (other.showIf?.id === fq.id && !other.showIf.is.includes(v)) delete next[other.id]
                  }
                  return next
                })
              }
            />
          </div>
        ))}
      </div>

      {/* Always the same label. Every question here is optional, so
          there is nothing to "skip" — offering skip made answering two
          of six look like giving up rather than being finished. */}
      <Btn className="mt-7 w-full py-4" onClick={onNext}>
        Next: my week
      </Btn>
    </div>
  )
}
