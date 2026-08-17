import type { PlanConfig, Weekday } from '../../types'
import type { RoutineNote } from '../../plan/analyze'
import type { generatePlan } from '../../plan/generator'
import { WD_SHORT } from './onboardingData'
import { Bar, Kicker, Label, Perf, Quiet, RED, Title } from './kit'

// ============================================================
// The generated week, before anybody commits to it.
//
// The one screen in the wizard that shows its work: what the
// engine chose, why it chose it, and the numbers it will hold
// the athlete to. Its own file because it is the hand-off — the
// last thing between answering questions and training.
//
// It is the results sheet at the bottom of the bib: their name,
// the week ruled out day by day, the two numbers, and the short
// version of the reasoning. Everything longer goes to the coach
// feed, where there is room to read it.
// ============================================================

const CARDIO: Record<string, number> = {
  lean: 3, muscle: 2, strength: 2, general: 2, vertical: 1, speed: 1, endurance: 4,
}

export function PlanPreview(p: {
  preview: ReturnType<typeof generatePlan>
  displayName: string
  setStep: (n: number) => void
  back: () => void
  tuneDraft: PlanConfig | null
  setTuneDraft: (plan: PlanConfig) => void
  setTuneProblems: (p: string[]) => void
  commitPlan: (plan: PlanConfig, proteinTargetG: number, notes?: RoutineNote[], strategy?: string[]) => void
}) {
  const { preview, displayName, setStep, tuneDraft, setTuneDraft, setTuneProblems, commitPlan, back } = p
  const sessions = CARDIO[preview.plan.goal] ?? 2

  return (
    <div className="flex flex-1 flex-col">
      <Kicker>{displayName.trim() ? `Here you go, ${displayName.trim()}` : 'Here you go'}</Kicker>
      <Title>{preview.plan.name}</Title>
      <p className="mt-3 text-[14px] font-bold italic leading-snug" style={{ color: RED }}>
        “{preview.plan.goalStatement}”
      </p>

      {/* The week, ruled out. A start list, not a stack of cards. */}
      <div className="mt-7">
        <Label>Your week</Label>
        {([1, 2, 3, 4, 5, 6, 0] as Weekday[]).map((wd) => {
          const tid = preview.plan.tier1ByWeekday[wd]
          const t = tid ? preview.plan.templates[tid] : null
          return (
            <div
              key={wd}
              className="flex items-baseline justify-between py-2.5"
              style={{ borderBottom: '1px solid rgba(13,13,12,0.14)' }}
            >
              <span className="w-11 shrink-0 text-[10px] font-black uppercase tracking-[0.16em] opacity-45">
                {WD_SHORT[wd]}
              </span>
              <span
                className={`headline flex-1 text-[17px] uppercase leading-none tracking-[-0.02em] ${t ? '' : 'opacity-30'}`}
              >
                {t ? t.title : 'Rest'}
              </span>
              {t?.cns && (
                <span className="shrink-0 text-[9px] font-black uppercase tracking-[0.16em]" style={{ color: RED }}>
                  Max effort
                </span>
              )}
            </div>
          )
        })}
        <p className="mt-3 text-[12px] leading-snug opacity-55">
          Plus {sessions} cardio session{sessions > 1 ? 's' : ''} a week, scheduled in the Week tab. Sport, runs
          and rides all count.
        </p>
      </div>

      {preview.plan.lifeEvents.length > 0 && (
        <p className="mt-3 border-l-2 py-1 pl-3 text-[12px] leading-snug" style={{ borderColor: RED }}>
          <span className="font-black uppercase tracking-[0.06em]">Knows your week:</span>{' '}
          {preview.plan.lifeEvents.map((e) => e.label).join(' · ')}.
        </p>
      )}

      {/* The two numbers, printed big, the way a bib prints a time. */}
      <div className="mt-7 grid grid-cols-2 gap-4">
        <div>
          <div className="num text-[38px] font-black leading-none tracking-[-0.04em]">{preview.proteinTargetG}g</div>
          <div className="mt-1.5 text-[9.5px] font-black uppercase tracking-[0.18em] opacity-50">Protein / day</div>
        </div>
        <div>
          <div className="num text-[38px] font-black leading-none tracking-[-0.04em]">
            {preview.plan.nutrition.kcalTraining}
          </div>
          <div className="mt-1.5 text-[9.5px] font-black uppercase tracking-[0.18em] opacity-50">
            Kcal, training days
          </div>
        </div>
      </div>

      {/* Three, not six. The rest go to the coach feed, where there is
          room to read them. Six paragraphs between somebody and their
          first session is a wall, and the two that were about THEM sat
          at the bottom of it — see deepGoalStrategy for the reordering. */}
      {preview.strategy.length > 0 && (
        <div className="mt-7">
          <Label>Why it looks like this</Label>
          <ul className="space-y-2.5">
            {preview.strategy.slice(0, 3).map((s, i) => (
              <li key={i} className="flex gap-2.5 text-[12.5px] leading-snug opacity-75">
                <span className="num shrink-0 font-black tabular-nums" style={{ color: RED }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Perf />

      <Bar onClick={() => commitPlan(preview.plan, preview.proteinTargetG, [], preview.strategy)}>
        Start Week 1
      </Bar>
      <div className="mt-1">
        <Quiet
          onClick={() => {
            if (!tuneDraft) setTuneDraft(structuredClone(preview.plan))
            setTuneProblems([])
            setStep(10)
          }}
        >
          Fine-tune it first
        </Quiet>
      </div>
      <div className="-mt-1">
        <Quiet onClick={back}>Change my answers</Quiet>
      </div>
    </div>
  )
}
