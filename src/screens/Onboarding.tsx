import { useMemo, useState } from 'react'
import type { CustomTarget, EquipTag, Goal, PlanConfig, Weekday } from '../types'
import { mondayOf, todayISO, formatShort, addDaysISO } from '../engine/calendar'
import { useAppStore, uid } from '../store/appStore'
import { saveMeasurement } from '../logic/actions'
import { generatePlan, buildNutrition, type OnboardingAnswers } from '../plan/generator'
import { makeEmptyByorPlan, normalizeBooklet, validateBooklet } from '../plan/bookletOps'
import { analyzeRoutine, type RoutineNote } from '../plan/analyze'
import { BookletEditor } from './booklet/BookletEditor'
import { Btn, Card, Chip, Stepper } from '../components/ui'

// ============================================================
// Onboarding v2: a goal-driven wizard that generates the user's
// own booklet. Every answer feeds generatePlan(); the last step
// previews the generated week before committing.
// ============================================================

const GOAL_CHIPS: { label: string; goal: Goal }[] = [
  { label: '🏀 Dunk a basketball', goal: 'vertical' },
  { label: '⬆️ Jump higher', goal: 'vertical' },
  { label: '⚡ Get faster', goal: 'speed' },
  { label: '💪 Build muscle', goal: 'muscle' },
  { label: '🏋️ Get strong', goal: 'strength' },
  { label: '🔥 Lean out', goal: 'lean' },
  { label: '🎯 All-around athlete', goal: 'general' },
]

const EXTRA_EQUIP: { tag: EquipTag; label: string }[] = [
  { tag: 'pullup-bar', label: 'Pull-up bar' },
  { tag: 'barbell', label: 'Barbell + plates' },
  { tag: 'bench', label: 'Bench' },
  { tag: 'incline-bench', label: 'Incline bench' },
  { tag: 'box', label: 'Box to jump on' },
  { tag: 'court', label: 'Hoop / court' },
  { tag: 'treadmill', label: 'Treadmill' },
  { tag: 'hill-stairs', label: 'Hill or stairs' },
]

const WD_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function Onboarding() {
  const update = useAppStore((s) => s.update)
  const [step, setStep] = useState(0)
  const [mode, setMode] = useState<'gen' | 'byor'>('gen')
  const [byorDraft, setByorDraft] = useState<PlanConfig | null>(null)
  const [byorProblems, setByorProblems] = useState<string[]>([])
  const [tuneDraft, setTuneDraft] = useState<PlanConfig | null>(null)
  const [tuneProblems, setTuneProblems] = useState<string[]>([])

  const [displayName, setDisplayName] = useState('')
  const [goalChip, setGoalChip] = useState<number | null>(null)
  const [goalStatement, setGoalStatement] = useState('')
  const [target1, setTarget1] = useState<{ label: string; target: string; unit: string }>({ label: '', target: '', unit: '' })
  const [days, setDays] = useState<3 | 4 | 5 | 6>(4)
  const [profile, setProfile] = useState<'gym' | 'home-db' | 'minimal'>('home-db')
  const [extras, setExtras] = useState<Set<EquipTag>>(new Set())
  const [experience, setExperience] = useState<'new' | 'returning' | 'trained'>('returning')
  const [weight, setWeight] = useState(180)
  const [vert, setVert] = useState(0)
  const [pickedStart, setPickedStart] = useState(mondayOf(todayISO()))

  const goal: Goal = goalChip !== null ? GOAL_CHIPS[goalChip].goal : 'general'

  const answers: OnboardingAnswers = useMemo(() => {
    const customTargets: CustomTarget[] = []
    if (target1.label.trim() && Number(target1.target) > 0) {
      customTargets.push({ label: target1.label.trim(), target: Number(target1.target), unit: target1.unit.trim() || '' })
    }
    return {
      goal,
      goalStatement: goalStatement.trim(),
      customTargets,
      daysPerWeek: days,
      equipProfile: profile,
      extraEquip: [...extras],
      experience,
      bodyweightLb: weight,
    }
  }, [goal, goalStatement, target1, days, profile, extras, experience, weight])

  const preview = useMemo(() => (step === 7 ? generatePlan(answers) : null), [step, answers])

  function toggleExtra(tag: EquipTag) {
    setExtras((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  function commitPlan(plan: PlanConfig, proteinTargetG: number, notes: RoutineNote[] = []) {
    const start = mondayOf(pickedStart)
    void navigator.storage?.persist?.().catch(() => {})
    update((d) => {
      d.settings.phaseStartDate = start
      d.settings.installedAt = todayISO()
      d.settings.onboarded = true
      d.plan = plan
      d.settings.proteinTargetG = proteinTargetG
      d.profile.displayName = displayName.trim() || undefined
      const at = new Date().toISOString()
      for (const n of notes.slice(0, 4)) {
        d.coach.feed.unshift({ id: uid(), at, kind: 'insight', text: `📓 Routine notes: ${n.text}` })
      }
    })
    if (weight > 0 || vert > 0) {
      saveMeasurement({
        date: todayISO(),
        weightLb: weight > 0 ? weight : undefined,
        vertIn: vert > 0 ? vert : undefined,
        photoIds: {},
      })
    }
  }

  /** BYOR: seed (or reuse) the empty booklet and open the builder step. */
  function enterBuilder() {
    if (!byorDraft) {
      const seeded = makeEmptyByorPlan(goal, goalStatement, answers.customTargets, weight)
      setByorDraft(seeded.plan)
    }
    setStep(8)
  }

  const byorNotes = useMemo(
    () => (step === 9 && byorDraft ? analyzeRoutine(normalizeBooklet(byorDraft)) : []),
    [step, byorDraft],
  )

  const next = () => setStep((s) => s + 1)
  const back = () => {
    if (step === 10) return setStep(7) // fine-tune → generated preview
    if (step === 8) return setStep(6) // builder → numbers
    if (step === 7) {
      setTuneDraft(null) // answers may change → stale tune draft
      return setStep(6)
    }
    if (step === 6 && mode === 'byor') return setStep(2) // byor skips days/gear/experience
    setStep((s) => Math.max(0, s - 1))
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-10 pt-[max(env(safe-area-inset-top),24px)]">
      {step > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <button onClick={back} className="rounded-full bg-surface-2 px-3 py-1.5 text-[12px] font-bold text-ink-dim">
            ‹ back
          </button>
          <div className="flex gap-1">
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i} className={`h-1 rounded-full transition-all ${i === Math.min(step, 7) ? 'w-5 bg-accent' : i < Math.min(step, 7) ? 'w-2 bg-accent/50' : 'w-2 bg-surface-2'}`} />
            ))}
          </div>
          <span className="w-14" />
        </div>
      )}

      {step === 0 && (
        <div className="flex flex-1 flex-col justify-center">
          <div className="text-[13px] font-black uppercase tracking-[0.3em] text-accent">Bodytea</div>
          <h1 className="mt-2 text-[40px] font-black leading-[1.05] tracking-tight">
            Your goal.
            <br />
            Your booklet.
            <br />
            No excuses.
          </h1>
          <p className="mt-4 text-[14.5px] leading-relaxed text-ink-dim">
            Answer a few questions straight and you get a full training booklet built for YOUR goal — workouts with
            photo demos, meals, deload weeks, and a coach that calls you out when you dodge.
          </p>
          <Btn className="mt-8 w-full py-4 text-[16px]" onClick={() => { setMode('gen'); next() }}>
            Build my plan
          </Btn>
          <Btn kind="subtle" className="mt-3 w-full py-4" onClick={() => { setMode('byor'); next() }}>
            I already have a routine
          </Btn>
          <p className="mt-2 text-center text-[11.5px] text-ink-faint">
            Bring your own — the app maps it, tracks it, and gives you straight notes on it.
          </p>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-1 flex-col">
          <h2 className="text-[26px] font-black tracking-tight">What do we call you?</h2>
          <p className="mt-1 text-[13px] text-ink-dim">Shows on your booklet and (later) the leaderboard.</p>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className="mt-5 w-full rounded-xl border border-edge bg-surface px-4 py-3.5 text-[15px] font-semibold text-ink outline-none focus:border-accent/60"
          />
          <Btn className="mt-6 w-full py-4" onClick={next}>
            Next — the goal
          </Btn>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-1 flex-col">
          <h2 className="text-[26px] font-black tracking-tight">What are you chasing?</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {GOAL_CHIPS.map((g, i) => (
              <Chip key={g.label} tone={goalChip === i ? 'accent' : 'default'} onClick={() => setGoalChip(i)}>
                {g.label}
              </Chip>
            ))}
          </div>
          <p className="mt-5 text-[12px] font-black uppercase tracking-wider text-ink-faint">Now say it in YOUR words</p>
          <textarea
            value={goalStatement}
            onChange={(e) => setGoalStatement(e.target.value)}
            placeholder={'"dunk on a 10-ft rim by June"  ·  "squat 315"  ·  "visible abs"'}
            rows={2}
            className="mt-2 w-full resize-none rounded-xl border border-edge bg-surface px-4 py-3 text-[14px] font-semibold text-ink outline-none focus:border-accent/60"
          />
          <p className="mt-1 text-[11px] text-ink-faint">This exact phrase follows you through the whole app — make it yours.</p>

          <p className="mt-5 text-[12px] font-black uppercase tracking-wider text-ink-faint">Optional: a number to beat</p>
          <div className="mt-2 flex gap-2">
            <input
              value={target1.label}
              onChange={(e) => setTarget1({ ...target1, label: e.target.value })}
              placeholder="e.g. Vert"
              className="min-w-0 flex-1 rounded-xl border border-edge bg-surface px-3 py-2.5 text-[13px] font-semibold outline-none focus:border-accent/60"
            />
            <input
              value={target1.target}
              onChange={(e) => setTarget1({ ...target1, target: e.target.value.replace(/[^0-9.]/g, '') })}
              placeholder="30"
              inputMode="decimal"
              className="w-16 rounded-xl border border-edge bg-surface px-3 py-2.5 text-[13px] font-semibold outline-none focus:border-accent/60"
            />
            <input
              value={target1.unit}
              onChange={(e) => setTarget1({ ...target1, unit: e.target.value })}
              placeholder="in"
              className="w-14 rounded-xl border border-edge bg-surface px-3 py-2.5 text-[13px] font-semibold outline-none focus:border-accent/60"
            />
          </div>
          <Btn
            className="mt-6 w-full py-4"
            onClick={() => (mode === 'byor' ? setStep(6) : next())}
            disabled={goalChip === null || goalStatement.trim().length < 4}
          >
            {mode === 'byor' ? 'Next — my numbers' : 'Next — my week'}
          </Btn>
          {(goalChip === null || goalStatement.trim().length < 4) && (
            <p className="mt-2 text-center text-[11.5px] text-ink-faint">Pick a goal AND write it in your own words.</p>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-1 flex-col">
          <h2 className="text-[26px] font-black tracking-tight">How many days can you actually train?</h2>
          <p className="mt-1 text-[13px] text-ink-dim">Be honest — a 4-day plan you keep beats a 6-day plan you dodge.</p>
          <div className="mt-5 grid grid-cols-4 gap-2">
            {([3, 4, 5, 6] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`rounded-2xl border py-5 text-center ${days === d ? 'border-accent bg-accent/15 text-accent' : 'border-edge bg-surface text-ink-dim'}`}
              >
                <div className="text-[24px] font-black">{d}</div>
                <div className="text-[10px] font-bold uppercase">days</div>
              </button>
            ))}
          </div>
          <Btn className="mt-6 w-full py-4" onClick={next}>
            Next — my gear
          </Btn>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-1 flex-col">
          <h2 className="text-[26px] font-black tracking-tight">What gear do you have?</h2>
          <div className="mt-4 space-y-2">
            {(
              [
                ['gym', 'Full gym', 'Racks, machines, cables — everything.'],
                ['home-db', 'Home setup', 'Dumbbells, a bench, maybe a pull-up bar.'],
                ['minimal', 'Almost nothing', 'Bodyweight + somewhere to move.'],
              ] as const
            ).map(([id, title, sub]) => (
              <Card key={id} onClick={() => setProfile(id)} className={profile === id ? '!border-accent/60' : ''}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[15px] font-black">{title}</div>
                    <div className="text-[12px] text-ink-dim">{sub}</div>
                  </div>
                  <span className={`h-4 w-4 rounded-full border-2 ${profile === id ? 'border-accent bg-accent' : 'border-edge'}`} />
                </div>
              </Card>
            ))}
          </div>
          {profile !== 'gym' && (
            <>
              <p className="mt-5 text-[12px] font-black uppercase tracking-wider text-ink-faint">Also have…</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {EXTRA_EQUIP.map((e) => (
                  <Chip key={e.tag} tone={extras.has(e.tag) ? 'accent' : 'default'} onClick={() => toggleExtra(e.tag)}>
                    {e.label}
                  </Chip>
                ))}
              </div>
            </>
          )}
          <Btn className="mt-6 w-full py-4" onClick={next}>
            Next — experience
          </Btn>
        </div>
      )}

      {step === 5 && (
        <div className="flex flex-1 flex-col">
          <h2 className="text-[26px] font-black tracking-tight">Training age?</h2>
          <div className="mt-4 space-y-2">
            {(
              [
                ['new', 'New to this', 'First year of real training.'],
                ['returning', 'Coming back', 'Trained before, been away a while.'],
                ['trained', 'Consistent', 'Training regularly right now.'],
              ] as const
            ).map(([id, title, sub]) => (
              <Card key={id} onClick={() => setExperience(id)} className={experience === id ? '!border-accent/60' : ''}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[15px] font-black">{title}</div>
                    <div className="text-[12px] text-ink-dim">{sub}</div>
                  </div>
                  <span className={`h-4 w-4 rounded-full border-2 ${experience === id ? 'border-accent bg-accent' : 'border-edge'}`} />
                </div>
              </Card>
            ))}
          </div>
          <Btn className="mt-6 w-full py-4" onClick={next}>
            Next — numbers
          </Btn>
        </div>
      )}

      {step === 6 && (
        <div className="flex flex-1 flex-col">
          <h2 className="text-[26px] font-black tracking-tight">Baseline numbers</h2>
          <p className="mt-1 text-[13px] text-ink-dim">Weight sets your protein + calorie targets. The rest is your before picture.</p>
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-bold">Bodyweight</span>
              <Stepper value={weight} onChange={setWeight} step={1} suffix="lb" width="w-20" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-bold">Standing reach / vert touch <span className="text-[11px] text-ink-faint">(optional)</span></span>
              <Stepper value={vert} onChange={setVert} step={0.5} suffix='"' width="w-20" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-bold">Week 1 starts</span>
              <input
                type="date"
                value={pickedStart}
                onChange={(e) => e.target.value && setPickedStart(mondayOf(e.target.value))}
                className="rounded-xl border border-edge bg-surface px-3 py-2 text-[13px] font-semibold outline-none"
              />
            </div>
            <p className="text-[11px] text-ink-faint">Weeks start Mondays — your pick snaps to {formatShort(mondayOf(pickedStart))} → first week runs through {formatShort(addDaysISO(mondayOf(pickedStart), 6))}.</p>
          </div>
          <Btn className="mt-6 w-full py-4" onClick={() => (mode === 'byor' ? enterBuilder() : next())}>
            {mode === 'byor' ? 'Next — build my week' : 'Generate my booklet'}
          </Btn>
        </div>
      )}

      {step === 7 && preview && (
        <div className="flex flex-1 flex-col">
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-accent">Your booklet</div>
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

          <p className="mt-3 text-[12px] leading-relaxed text-ink-dim">
            4-week blocks with a built-in deload · exercise rotation every block · A/B weeks · busy-week fallback tiers ·
            every movement with photo demos and muscle maps · a coach that keeps receipts.
          </p>

          <Btn className="mt-5 w-full py-4 text-[16px]" onClick={() => commitPlan(preview.plan, preview.proteinTargetG)}>
            Start Week 1 — let's work
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
            Fine-tune it first — swap moves, sets, days
          </Btn>
          <button onClick={back} className="mt-3 text-center text-[12px] font-semibold text-ink-faint underline">
            change my answers
          </button>
        </div>
      )}

      {step === 8 && byorDraft && (
        <div className="flex flex-1 flex-col">
          <h2 className="text-[26px] font-black tracking-tight">Build your week</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-dim">
            Lay out the routine you already run — pick your training days, name them, load each one with exercises,
            sets, and reps.
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
            Done — give me the notes
          </Btn>
        </div>
      )}

      {step === 9 && byorDraft && (
        <div className="flex flex-1 flex-col">
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-accent">The read on your routine</div>
          <h2 className="mt-1 text-[26px] font-black tracking-tight">Straight notes, no fluff</h2>
          <div className="mt-4 space-y-2">
            {byorNotes.map((n) => (
              <div key={n.id} className={`rounded-xl border px-3.5 py-2.5 ${NOTE_TONE[n.tone]}`}>
                <div className="text-[10px] font-black uppercase tracking-[0.14em]">{NOTE_LABEL[n.tone]}</div>
                <div className="mt-0.5 text-[13px] font-semibold leading-snug text-ink">{n.text}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-ink-dim">
            These land in your coach feed too, and refresh whenever you edit the booklet. Your routine, your call —
            the app tracks it exactly as you built it.
          </p>
          <Btn
            className="mt-5 w-full py-4 text-[16px]"
            onClick={() =>
              commitPlan(
                normalizeBooklet(byorDraft),
                buildNutrition(goal, weight).proteinTargetG,
                byorNotes.filter((n) => n.tone !== 'info'),
              )
            }
          >
            Start Week 1 — let's work
          </Btn>
          <button onClick={back} className="mt-3 text-center text-[12px] font-semibold text-ink-faint underline">
            keep editing
          </button>
        </div>
      )}

      {step === 10 && tuneDraft && (
        <div className="flex flex-1 flex-col">
          <h2 className="text-[26px] font-black tracking-tight">Fine-tune your booklet</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-dim">
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
            Lock it in — start Week 1
          </Btn>
        </div>
      )}
    </div>
  )
}

const NOTE_TONE: Record<RoutineNote['tone'], string> = {
  warn: 'border-danger/40 bg-danger/10 text-danger',
  good: 'border-lime/40 bg-lime/10 text-lime',
  info: 'border-cyan/30 bg-cyan/10 text-cyan',
}
const NOTE_LABEL: Record<RoutineNote['tone'], string> = { warn: 'Fix this', good: 'Solid', info: 'Heads up' }

/** Mirrors the generator's protein formula for the preview card. */
function proteinPreview(weightLb: number): number {
  return Math.min(260, Math.max(120, Math.round(Math.min(330, Math.max(90, weightLb || 175)))))
}
