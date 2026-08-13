import type { Dispatch, SetStateAction } from 'react'
import type { Goal, PlanConfig } from '../../types'
import type { RoutineNote } from '../../plan/analyze'
import { buildNutrition } from '../../plan/generator'
import { byorNutrition, normalizeBooklet, validateBooklet } from '../../plan/bookletOps'
import { BookletEditor } from '../booklet/BookletEditor'
import { Btn } from '../../components/ui'
import { NOTE_LABEL, NOTE_TONE } from './RoutineNotes'

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
  weight: number
  goal: Goal
  commitPlan: (plan: PlanConfig, proteinTargetG: number, notes?: RoutineNote[], strategy?: string[]) => void
}) {
  const {
    step, setStep, byorDraft, setByorDraft, byorProblems, setByorProblems, byorNotes,
    tuneDraft, setTuneDraft, tuneProblems, setTuneProblems, whyWorks, setWhyWorks, weight,
    goal, commitPlan,
  } = p
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
            <div className="text-center text-[11px] font-black uppercase tracking-[0.2em] text-accent">One honest question</div>
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
            <Btn
              className="mt-5 w-full py-4 text-[16px]"
              onClick={() =>
                commitPlan(
                  normalizeBooklet(byorDraft),
                  byorNutrition(byorDraft.routineGoals ?? [], weight).proteinTargetG,
                  byorNotes.filter((n) => n.tone !== 'info'),
                )
              }
            >
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
