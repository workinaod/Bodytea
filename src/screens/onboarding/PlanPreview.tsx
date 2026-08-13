import type { PlanConfig, Weekday } from '../../types'
import type { RoutineNote } from '../../plan/analyze'
import type { generatePlan } from '../../plan/generator'
import { Btn, Card, Chip } from '../../components/ui'
import { proteinPreview } from './RoutineNotes'
import { WD_SHORT } from './onboardingData'

// ============================================================
// The generated week, before anybody commits to it.
//
// The one screen in the wizard that shows its work: what the
// engine chose, why it chose it, and the numbers it will hold
// the athlete to. Its own file because it is the hand-off — the
// last thing between answering questions and training.
// ============================================================

export function PlanPreview(p: {
  preview: ReturnType<typeof generatePlan>
  displayName: string
  weight: number
  setStep: (n: number) => void
  back: () => void
  tuneDraft: PlanConfig | null
  setTuneDraft: (plan: PlanConfig) => void
  setTuneProblems: (p: string[]) => void
  commitPlan: (plan: PlanConfig, proteinTargetG: number, notes?: RoutineNote[], strategy?: string[]) => void
}) {
  const { preview, displayName, weight, setStep, tuneDraft, setTuneDraft, setTuneProblems, commitPlan, back } = p
  return (
          <div className="flex flex-1 flex-col">
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-accent">
              {displayName.trim() ? `Built for ${displayName.trim()}` : 'Your booklet'}
            </div>
            <h2 className="mt-1 text-[30px] font-black leading-tight tracking-tight">{preview.plan.name}</h2>
            <p className="mt-1 text-[13.5px] font-semibold italic text-gold">“{preview.plan.goalStatement}”</p>

            <Card className="mt-4 !p-3">
              <div className="space-y-1.5">
                {([1, 2, 3, 4, 5, 6, 0] as Weekday[]).map((wd) => {
                  const tid = preview.plan.tier1ByWeekday[wd]
                  const t = tid ? preview.plan.templates[tid] : null
                  return (
                    <div key={wd} className="flex items-center gap-3">
                      <span className="w-9 text-[11px] font-black uppercase text-ink-faint">{WD_SHORT[wd]}</span>
                      <span className={`text-[13px] font-bold ${t ? 'text-ink' : 'text-ink-faint'}`}>
                        {t ? t.title : 'Rest'}
                      </span>
                      {t?.cns && <Chip tone="cyan">max effort</Chip>}
                    </div>
                  )
                })}
              </div>
            </Card>

            <p className="mt-2 border-l-2 border-cyan/60 py-1 pl-3 text-[11.5px] leading-snug text-cyan/90">
              Plus conditioning: at least {({ lean: 3, muscle: 2, strength: 2, general: 2, vertical: 1, speed: 1, endurance: 4 } as const)[preview.plan.goal]}{' '}
              cardio session{({ lean: 3, muscle: 2, strength: 2, general: 2, vertical: 1, speed: 1, endurance: 4 } as const)[preview.plan.goal] > 1 ? 's' : ''} a week,
              scheduled in the Week tab. Sport, runs, and rides all count.
            </p>

            {preview.plan.lifeEvents.length > 0 && (
              <p className="mt-2 border-l-2 border-gold/60 py-1 pl-3 text-[11.5px] leading-snug text-gold/90">
                Knows your week: {preview.plan.lifeEvents.map((e) => e.label).join(' · ')}. Flag the days
                each week and the sessions adapt around them.
              </p>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Card className="!p-3 text-center">
                <div className="text-[20px] font-black text-accent">{proteinPreview(weight)}g</div>
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-faint">protein / day</div>
              </Card>
              <Card className="!p-3 text-center">
                <div className="text-[20px] font-black text-cyan">{preview.plan.nutrition.kcalTraining}</div>
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-faint">kcal training days</div>
              </Card>
            </div>

            {/* The plan's thinking, spelled out. Deep beats generic. */}
            {preview.strategy.length > 0 && (
              <div className="mt-3 rounded-2xl bg-white/[0.05] p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gold">How this plan thinks</p>
                <ul className="mt-2 space-y-2">
                  {preview.strategy.map((s, i) => (
                    <li key={i} className="flex gap-2 text-[12.5px] leading-snug text-ink-dim">
                      <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-gold/70" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="mt-3 text-center text-[12px] leading-relaxed text-ink-dim">
              4-week blocks with a built-in deload · exercises AND rep schemes rotate every block · A/B weeks ·
              busy-week fallback tiers · every movement with photo demos and muscle maps · a coach that keeps receipts.
            </p>

            <Btn
              className="mt-5 w-full py-4 text-[16px]"
              onClick={() => commitPlan(preview.plan, preview.proteinTargetG, [], preview.strategy)}
            >
              Start Week 1, let's work
            </Btn>
            <Btn
              kind="subtle"
              className="mt-3 w-full py-3.5"
              onClick={() => {
                if (!tuneDraft) setTuneDraft(structuredClone(preview.plan))
                setTuneProblems([])
                setStep(10)
              }}
            >
              Fine-tune it first, swap moves, sets, days
            </Btn>
            <button onClick={back} className="mt-3 text-center text-[12px] font-semibold text-ink-faint underline">
              change my answers
            </button>
          </div>
  )
}
