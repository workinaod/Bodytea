import type { Dispatch, SetStateAction } from 'react'
import type { Goal } from '../../types'
import { buildFollowups, type GoalFollowup } from '../../plan/followups'
import { Bar, Kicker, Label, Tag, Title, fieldCls, fieldStyle } from './kit'

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

const field = fieldCls

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
      <Label>{fq.q}</Label>
      {fq.kind === 'number' ? (
        <div className="flex items-baseline gap-3">
          <input
            inputMode="decimal"
            value={value ?? ''}
            onChange={(e) => onPick(e.target.value)}
            placeholder={fq.placeholder}
            className={field} style={fieldStyle}
          />
          {fq.unit && (
            <span className="shrink-0 pb-3 text-[11px] font-black uppercase tracking-[0.18em] text-ink-faint">
              {fq.unit}
            </span>
          )}
        </div>
      ) : fq.kind === 'text' ? (
        <input
          value={value ?? ''}
          onChange={(e) => onPick(e.target.value)}
          placeholder={fq.placeholder}
          className={field} style={fieldStyle}
        />
      ) : (
        <div className="enter-stagger flex flex-wrap gap-1.5">
          {(fq.options ?? []).map((o) => (
            <Tag key={o} selected={value === o} onClick={() => onPick(o)}>
              {o}
            </Tag>
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
      <Kicker>Getting specific</Kicker>
      <Title sub="Every answer changes what we build you.">
        {firstName ? `A few things, ${firstName}` : 'A few things'}
      </Title>

      <div className="mt-7 space-y-8">
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
      <div className="mt-auto pt-10">
        <Bar onClick={onNext}>Next: my week</Bar>
      </div>
    </div>
  )
}
