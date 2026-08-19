import type { Dispatch, SetStateAction } from 'react'
import type { Goal, PlanConfig } from '../../types'
import type { RoutineNote } from '../../plan/analyze'
import { buildNutrition } from '../../plan/generator'
import { normalizeBooklet, validateBooklet } from '../../plan/bookletOps'
import { BookletEditor } from '../booklet/BookletEditor'
import { Btn } from '../../components/ui'
import { NOTE_LABEL, NOTE_TONE } from './RoutineNotes'
import { buildFollowups } from '../../plan/followups'
import { Tag, fieldCls, fieldStyle } from './kit'

// ============================================================
// The four screens for a routine that already exists.
//
// Bring-your-own-routine is its own path through the wizard —
// build the week, say why it works, read the notes — and the
// fine-tune editor is the same shape for a generated plan. They
// share the booklet editor and the note styling, and they touch
// almost none of the wizard state the goal-driven steps do,
// which is what makes them separable at all.
// ============================================================

/**
 * The chips, taken from the question bank rather than retyped, so this
 * path and the generated one can never drift into offering different
 * answers to the same question.
 */
const HURT_OPTIONS =
  buildFollowups({ goal: 'general', answers: {} }).find((q) => q.id === 'injuries')?.options ?? []

export function RoutineSteps(p: {
  step: number
  setStep: (n: number) => void
  byorDraft: PlanConfig | null
  setByorDraft: Dispatch<SetStateAction<PlanConfig | null>>
  byorProblems: string[]
  setByorProblems: Dispatch<SetStateAction<string[]>>
  byorNotes: RoutineNote[]
  tuneDraft: PlanConfig | null
  setTuneDraft: Dispatch<SetStateAction<PlanConfig | null>>
  tuneProblems: string[]
  setTuneProblems: Dispatch<SetStateAction<string[]>>
  whyWorks: string
  setWhyWorks: (s: string) => void
  /**
   * The same goalAnswers object the generated path fills in.
   *
   * Only one key is written from here, `injuries`, and it is written into
   * the shared object rather than a private one so commitPlan's existing
   * limitationsFrom call picks it up with no second code path. Two ways
   * to record a bad knee is how one of them goes stale.
   */
  answers: Record<string, string>
  setAnswers: Dispatch<SetStateAction<Record<string, string>>>
  weight: number
  goal: Goal
  commitPlan: (plan: PlanConfig, proteinTargetG: number, notes?: RoutineNote[], strategy?: string[]) => void
  /** The last screen before the plan starts, shared with the generated path. */
  onReady: () => void
}) {
  const {
    step, setStep, byorDraft, setByorDraft, byorProblems, setByorProblems, byorNotes,
    tuneDraft, setTuneDraft, tuneProblems, setTuneProblems, whyWorks, setWhyWorks, weight,
    goal, commitPlan, onReady,
  } = p

  /**
   * Tapping the same chip twice clears it, so "Nothing" and "never
   * answered" stay different states. limitationsFrom treats them the
   * same way today, and that is its call to make, not this screen's.
   */
  const setHurt = (o: string) =>
    p.setAnswers((a) => {
      const next: Record<string, string> = { ...a, injuries: a.injuries === o ? '' : o }
      if (next.injuries !== 'Something else') delete next['injury-what']
      return next
    })

  return (
    <>
        {step === 8 && byorDraft && (
          <div className="flex flex-1 flex-col">
            <h2 className="headline text-center text-[26px]">Build your week</h2>
            <p className="mt-1 text-center text-[13px] leading-relaxed text-ink-dim">
              Lay out the routine you already run: training days, names, exercises, sets, reps.
            </p>
            {byorProblems.length > 0 && (
              <div className="mt-3 rounded-xl border border-danger/40 bg-danger/10 px-3.5 py-2.5">
                {byorProblems.map((p) => (
                  <div key={p} className="text-[12px] font-semibold text-danger">• {p}</div>
                ))}
              </div>
            )}
            <div className="mt-4">
              <BookletEditor
                draft={byorDraft}
                showMeta={false}
                onDraft={(d) => {
                  setByorDraft(d)
                  setByorProblems([])
                }}
              />
            </div>
            <Btn
              className="mt-6 w-full py-4"
              onClick={() => {
                const errs = validateBooklet(byorDraft)
                if (errs.length) setByorProblems(errs)
                else setStep(9)
              }}
            >
              My routine's in, next
            </Btn>
          </div>
        )}

        {step === 9 && byorDraft && (
          <div className="flex flex-1 flex-col">
            <div className="text-center text-[11px] font-black uppercase tracking-[0.2em] text-accent">Two things</div>
            <h2 className="headline mt-1 text-center text-[26px]">Why has this routine been working for you?</h2>
            <p className="mt-1 text-center text-[13px] leading-relaxed text-ink-dim">
              Be specific: “bench goes up every month”, “I actually show up when it's only 3 days”, “my
              knees stopped hurting”. The coach reads this before writing the notes.
            </p>
            <textarea
              value={whyWorks}
              onChange={(e) => setWhyWorks(e.target.value)}
              placeholder={'"I never miss because it\'s short"  ·  "squat added 40 lb this year"'}
              rows={3}
              className="mt-4 w-full resize-none rounded-xl bg-white/[0.05] ring-1 ring-white/[0.05] px-4 py-3 text-[14px] font-semibold text-ink outline-none focus:ring-accent/45"
            />
            <p className="mt-1 text-[11px] text-ink-faint">
              Goes on record in your coach feed. Empty is fine if it honestly hasn't been working. That's an answer too.
            </p>
            {/* The question every real coach asks in the first minute, and
                the one this path never asked. A bring-your-own-routine
                athlete was committed with prefs.limitations = [] every
                time, under a comment promising a bad knee is a bad knee
                whichever way the plan arrived. It is now. */}
            <div className="mt-7 border-t border-white/[0.08] pt-5">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-ink-faint">
                Anything that hurts right now?
              </div>
              <p className="mt-1 text-[11.5px] leading-snug text-ink-dim">
                Routes the plan around the joint from day one instead of waiting for it to flare.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {HURT_OPTIONS.map((o) => (
                  <Tag key={o} selected={p.answers.injuries === o} onClick={() => setHurt(o)}>
                    {o}
                  </Tag>
                ))}
              </div>
              {p.answers.injuries === 'Something else' && (
                <input
                  value={p.answers['injury-what'] ?? ''}
                  onChange={(e) => p.setAnswers((a) => ({ ...a, 'injury-what': e.target.value }))}
                  placeholder="What is it?"
                  className={`mt-3 ${fieldCls}`}
                  style={fieldStyle}
                />
              )}
            </div>
            <Btn
              className="mt-6 w-full py-4"
              onClick={() => {
                setByorDraft((prev) => (prev ? { ...prev, whyWorks: whyWorks.trim() || undefined } : prev))
                setStep(11)
              }}
            >
              Give me the notes
            </Btn>
          </div>
        )}

        {step === 11 && byorDraft && (
          <div className="flex flex-1 flex-col">
            <div className="text-center text-[11px] font-black uppercase tracking-[0.2em] text-accent">The read on your routine</div>
            <h2 className="headline mt-1 text-center text-[26px]">Straight notes, no fluff</h2>
            {byorDraft.whyWorks && (
              <div className="mt-3 rounded-xl border-l-2 border-gold/50 bg-white/[0.05] px-3.5 py-2.5">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-gold">Your read</div>
                <p className="mt-0.5 text-[12.5px] italic leading-snug text-ink-dim">“{byorDraft.whyWorks}”</p>
              </div>
            )}
            <div className="mt-4 space-y-2">
              {byorNotes.map((n) => (
                <div key={n.id} className={`rounded-xl border px-3.5 py-2.5 ${NOTE_TONE[n.tone]}`}>
                  <div className="text-[10px] font-black uppercase tracking-[0.14em]">{NOTE_LABEL[n.tone]}</div>
                  <div className="mt-0.5 text-[13px] font-semibold leading-snug text-ink">{n.text}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-ink-dim">
              These land in your coach feed too, and refresh whenever you edit the booklet. Your routine,
              your call. The app tracks it exactly as you built it.
            </p>
            {/* Bring-your-own-routine used to commit straight from here,
                which meant it was the one path that never got asked for
                notifications, motion or location at all. */}
            <Btn className="mt-5 w-full py-4 text-[16px]" onClick={onReady}>
              Start Week 1, let's work
            </Btn>
            <button onClick={() => setStep(8)} className="mt-3 text-center text-[12px] font-semibold text-ink-faint underline">
              keep editing
            </button>
          </div>
        )}

        {step === 10 && tuneDraft && (
          <div className="flex flex-1 flex-col">
            <h2 className="headline text-center text-[26px]">Fine-tune your booklet</h2>
            <p className="mt-1 text-center text-[13px] leading-relaxed text-ink-dim">
              Swap exercises, change sets and reps, rename days, move the week around. Blocks, deloads, and busy-week
              tiers rebuild themselves around your edits.
            </p>
            {tuneProblems.length > 0 && (
              <div className="mt-3 rounded-xl border border-danger/40 bg-danger/10 px-3.5 py-2.5">
                {tuneProblems.map((p) => (
                  <div key={p} className="text-[12px] font-semibold text-danger">• {p}</div>
                ))}
              </div>
            )}
            <div className="mt-4">
              <BookletEditor
                draft={tuneDraft}
                onDraft={(d) => {
                  setTuneDraft(d)
                  setTuneProblems([])
                }}
              />
            </div>
            <Btn
              className="mt-6 w-full py-4 text-[16px]"
              onClick={() => {
                const errs = validateBooklet(tuneDraft)
                if (errs.length) return setTuneProblems(errs)
                commitPlan(normalizeBooklet(tuneDraft), buildNutrition(goal, weight).proteinTargetG)
              }}
            >
              Lock it in, start Week 1
            </Btn>
          </div>
        )}
    </>
  )
}
