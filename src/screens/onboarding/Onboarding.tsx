import { useMemo, useState } from 'react'
import type { CustomTarget, DietStyle, EquipTag, Goal, LifeEventKind, PlanConfig, RoutineGoal } from '../../types'

import { mondayOf, todayISO, formatShort, addDaysISO } from '../../engine/calendar'
import { useAppStore, uid } from '../../store/appStore'
import { saveMeasurement } from '../../logic/actions'
import { generatePlan, type FocusArea, type OnboardingAnswers } from '../../plan/generator'
import { makeEmptyByorPlan, normalizeBooklet } from '../../plan/bookletOps'
import { analyzeRoutine, type RoutineNote } from '../../plan/analyze'
import { Btn, Card, Chip, Stepper } from '../../components/ui'
import { Welcome } from './Welcome'
import { ENV_EXTRAS, GOAL_CHIPS, HOME_CHECKLIST, LIFE_CHIPS, QUICK_GOALS } from './onboardingData'
import { requestDurableStorage } from '../../platform/persistence'
import { PermissionsBlock } from './RoutineNotes'
import { GoalStep } from './GoalStep'
import { RoutineSteps } from './RoutineSteps'
import { PlanPreview } from './PlanPreview'

// ============================================================
// Onboarding v2: a goal-driven wizard that generates the user's
// own booklet. Every answer feeds generatePlan(); the last step
// previews the generated week before committing.
// ============================================================

export function Onboarding() {
  const update = useAppStore((s) => s.update)
  // Someone with history who lands here was reset onto the new engine
  // (schema v19). Say so, so it never reads as lost data.
  const rebuilding = useAppStore(
    (st) =>
      Object.keys(st.data.sessions).length > 0 ||
      Object.keys(st.data.meals).length > 0 ||
      st.data.runs.length > 0 ||
      st.data.measurements.length > 0,
  )
  const [step, setStep] = useState(0)
  const [mode, setMode] = useState<'gen' | 'byor'>('gen')
  const [byorDraft, setByorDraft] = useState<PlanConfig | null>(null)
  const [byorProblems, setByorProblems] = useState<string[]>([])
  const [tuneDraft, setTuneDraft] = useState<PlanConfig | null>(null)
  const [tuneProblems, setTuneProblems] = useState<string[]>([])

  const [displayName, setDisplayName] = useState('')
  const [goalChip, setGoalChip] = useState<number | null>(null)
  const [routineGoals, setRoutineGoals] = useState<Set<RoutineGoal>>(new Set())
  const [whyWorks, setWhyWorks] = useState('')
  const [goalStatement, setGoalStatement] = useState('')
  const [goalAnswers, setGoalAnswers] = useState<Record<string, string>>({})
  const [target1, setTarget1] = useState<{ label: string; target: string; unit: string }>({ label: '', target: '', unit: '' })
  const [days, setDays] = useState<3 | 4 | 5 | 6>(4)
  const [profile, setProfile] = useState<'gym' | 'home-db' | 'minimal'>('gym')
  const [extras, setExtras] = useState<Set<EquipTag>>(new Set())
  const [experience, setExperience] = useState<'new' | 'returning' | 'trained'>('returning')
  const [mealsPerDay, setMealsPerDay] = useState<2 | 3 | 4 | 5>(4)
  const [lifePicks, setLifePicks] = useState<Set<string>>(new Set())
  const [customLife, setCustomLife] = useState('')
  const [customLifeKind, setCustomLifeKind] = useState<LifeEventKind>('late-night')
  const [dietStyle, setDietStyle] = useState<DietStyle>('omnivore')
  const [sex, setSex] = useState<'male' | 'female' | null>(null)
  const [skipMeals, setSkipMeals] = useState(false)
  const [focusAreas, setFocusAreas] = useState<Set<FocusArea>>(new Set())
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
      goalAnswers,
      customTargets,
      daysPerWeek: days,
      equipProfile: profile,
      extraEquip: [...extras],
      experience,
      bodyweightLb: weight,
      mealsPerDay,
      lifeSeeds: [
        ...LIFE_CHIPS.filter((c) => lifePicks.has(c.id)).map((c) => ({ label: c.label, kind: c.kind })),
        ...(customLife.trim() ? [{ label: customLife.trim(), kind: customLifeKind }] : []),
      ],
      dietStyle,
      skipMeals,
      focusAreas: [...focusAreas],
      sex: sex ?? undefined,
    }
  }, [goal, goalStatement, goalAnswers, target1, days, profile, extras, experience, weight, mealsPerDay, lifePicks, customLife, customLifeKind, dietStyle, skipMeals, focusAreas, sex])

  const preview = useMemo(() => (step === 7 ? generatePlan(answers) : null), [step, answers])

  function toggleItem(tags: EquipTag[]) {
    setExtras((prev) => {
      const next = new Set(prev)
      const on = tags.every((t) => next.has(t))
      for (const t of tags) {
        if (on) next.delete(t)
        else next.add(t)
      }
      return next
    })
  }

  /** Switching profile drops selections that aren't offered under the new one. */
  function pickProfile(p: 'gym' | 'home-db' | 'minimal') {
    setProfile(p)
    const visible = new Set<EquipTag>([
      ...(p === 'home-db' ? HOME_CHECKLIST.flatMap((i) => i.tags) : []),
      ...ENV_EXTRAS[p].flatMap((i) => i.tags),
    ])
    setExtras((prev) => new Set([...prev].filter((t) => visible.has(t))))
  }

  function commitPlan(plan: PlanConfig, proteinTargetG: number, notes: RoutineNote[] = [], strategy: string[] = []) {
    const start = mondayOf(pickedStart)
    requestDurableStorage()
    update((d) => {
      d.settings.phaseStartDate = start
      d.settings.installedAt = todayISO()
      d.settings.onboarded = true
      d.plan = plan
      d.settings.proteinTargetG = proteinTargetG
      d.profile.displayName = displayName.trim() || undefined
      if (sex) d.profile.bfFormula = sex
      const at = new Date().toISOString()
      for (const n of notes.slice(0, 4)) {
        d.coach.feed.unshift({ id: uid(), at, kind: 'insight', text: `📓 Routine notes: ${n.text}` })
      }
      // The plan's strategy, pinned to the Record on day one
      for (const s of strategy.slice(0, 3).reverse()) {
        d.coach.feed.unshift({ id: uid(), at, kind: 'insight', text: `🧠 ${s}` })
      }
      if (plan.whyWorks?.trim()) {
        d.coach.feed.unshift({
          id: uid(),
          at,
          kind: 'insight',
          text: `🗣 On record, why your routine works, in your words: “${plan.whyWorks.trim()}”`,
        })
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

  function toggleRoutineGoal(g: RoutineGoal) {
    setRoutineGoals((prev) => {
      const next = new Set(prev)
      if (next.has(g)) next.delete(g)
      else next.add(g)
      return next
    })
  }

  /**
   * BYOR: seed the booklet (or overlay the latest goal answers onto an
   * existing draft, the built week survives a trip back to the goal step).
   */
  function enterBuilder() {
    const seeded = makeEmptyByorPlan({
      routineGoals: [...routineGoals],
      goalStatement,
      customTargets: answers.customTargets,
      bodyweightLb: weight,
      sex: sex ?? undefined,
      mealsPerDay,
      lifeSeeds: answers.lifeSeeds,
      dietStyle,
      skipMeals,
    })
    setByorDraft((prev) =>
      prev
        ? {
            ...prev,
            routineGoals: seeded.plan.routineGoals,
            goalStatement: seeded.plan.goalStatement,
            goal: seeded.plan.goal,
            copyFlavor: seeded.plan.copyFlavor,
            customTargets: seeded.plan.customTargets,
            nutrition: seeded.plan.nutrition,
          }
        : seeded.plan,
    )
    setStep(8)
  }

  const byorNotes = useMemo(
    () => (step === 11 && byorDraft ? analyzeRoutine(normalizeBooklet(byorDraft)) : []),
    [step, byorDraft],
  )

  const next = () => setStep((s) => s + 1)
  const back = () => {
    if (step === 11) return setStep(9) // notes → the why question
    if (step === 10) return setStep(7) // fine-tune → generated preview
    if (step === 9) return setStep(8) // why → builder
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
          <button onClick={back} className="rounded-full bg-white/[0.07] px-3 py-1.5 text-[12px] font-bold text-ink-dim">
            ‹ back
          </button>
          <div className="flex gap-1">
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i} className={`h-1 rounded-full transition-all ${i === Math.min(step, 7) ? 'w-5 bg-accent' : i < Math.min(step, 7) ? 'w-2 bg-accent/50' : 'w-2 bg-white/[0.07]'}`} />
            ))}
          </div>
          <span className="w-14" />
        </div>
      )}

      {step === 0 && (
        <Welcome
          rebuilding={rebuilding}
          quickGoals={QUICK_GOALS}
          onPickGoal={(g) => {
            // Seed the goal so the tap is a head start, not just a page turn.
            // Both stay editable at the goal step.
            setMode('gen')
            setGoalChip(g.chip)
            setGoalStatement(g.statement)
            next()
          }}
          onBuild={() => {
            setMode('gen')
            next()
          }}
          onOwnRoutine={() => {
            setMode('byor')
            next()
          }}
        />
      )}

      {step === 1 && (
        <div className="flex flex-1 flex-col">
          <h2 className="headline text-[26px]">What do we call you?</h2>
          <p className="mt-1 text-[13px] text-ink-dim">Shows on your booklet and (later) the leaderboard.</p>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className="mt-5 w-full rounded-xl bg-white/[0.05] ring-1 ring-white/[0.05] px-4 py-3.5 text-[15px] font-semibold text-ink outline-none focus:ring-accent/45"
          />
          <Btn className="mt-6 w-full py-4" onClick={next}>
            Next: the goal
          </Btn>
        </div>
      )}

      {step === 2 && (
        <GoalStep
          mode={mode}
          displayName={displayName}
          goal={goal}
          goalChip={goalChip}
          setGoalChip={setGoalChip}
          routineGoals={routineGoals}
          toggleRoutineGoal={toggleRoutineGoal}
          goalStatement={goalStatement}
          setGoalStatement={setGoalStatement}
          goalAnswers={goalAnswers}
          setGoalAnswers={setGoalAnswers}
          target1={target1}
          setTarget1={setTarget1}
          focusAreas={focusAreas}
          setFocusAreas={setFocusAreas}
          onNext={() => (mode === 'byor' ? setStep(6) : next())}
        />
      )}
      {step === 3 && (
        <div className="flex flex-1 flex-col">
          <h2 className="headline text-[26px]">How many days can you actually train?</h2>
          <p className="mt-1 text-[13px] text-ink-dim">Be honest. A 4-day plan you keep beats a 6-day plan you dodge.</p>
          <div className="mt-5 grid grid-cols-4 gap-2">
            {([3, 4, 5, 6] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`rounded-2xl border py-5 text-center ${days === d ? 'border-accent bg-accent/15 text-accent' : 'border-edge bg-white/[0.05] text-ink-dim'}`}
              >
                <div className="text-[24px] font-black">{d}</div>
                <div className="text-[10px] font-bold uppercase">days</div>
              </button>
            ))}
          </div>

          {/* Their real week, seeds life events so every coach note speaks their schedule */}
          <div className="mt-6">
            <div className="text-[14px] font-bold">What else does your week hold?</div>
            <p className="mt-0.5 text-[11.5px] leading-snug text-ink-faint">
              The plan bends around real life. Pick what's true and the coach's notes will talk about
              YOUR shifts and nights.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {LIFE_CHIPS.map((c) => (
                <Chip
                  key={c.id}
                  tone={lifePicks.has(c.id) ? 'accent' : 'default'}
                  onClick={() =>
                    setLifePicks((prev) => {
                      const n = new Set(prev)
                      if (n.has(c.id)) n.delete(c.id)
                      else n.add(c.id)
                      return n
                    })
                  }
                >
                  {c.chip}
                </Chip>
              ))}
            </div>
            <input
              value={customLife}
              onChange={(e) => setCustomLife(e.target.value)}
              placeholder="Your own: a DJ set, league night, choir…"
              className="mt-2 w-full rounded-xl bg-white/[0.05] ring-1 ring-white/[0.05] px-3 py-2.5 text-[13px] outline-none placeholder:text-ink-faint focus:ring-accent/45"
            />
            {customLife.trim() && (
              <div className="mt-1.5 flex gap-1.5">
                {(
                  [
                    ['late-night', '🌙 keeps me up late'],
                    ['on-feet', '🦵 hours on my feet'],
                  ] as const
                ).map(([k, l]) => (
                  <Chip key={k} tone={customLifeKind === k ? 'accent' : 'default'} onClick={() => setCustomLifeKind(k)}>
                    {l}
                  </Chip>
                ))}
              </div>
            )}
          </div>

          <Btn className="mt-6 w-full py-4" onClick={next}>
            Next: my gear
          </Btn>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-1 flex-col">
          <h2 className="headline text-[26px]">Where do you train?</h2>
          <div className="mt-4 space-y-2">
            {(
              [
                ['gym', 'Full gym', 'Racks, machines, cables, the works.'],
                ['home-db', 'Home gym', "You'll check off exactly what you've got."],
                ['minimal', 'No weights', 'Bodyweight + somewhere to move.'],
              ] as const
            ).map(([id, title, sub]) => (
              <Card key={id} onClick={() => pickProfile(id)} className={profile === id ? '!border-accent/60' : ''}>
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
          {profile === 'home-db' && (
            <>
              <p className="mt-5 text-[12px] font-black uppercase tracking-wider text-ink-faint">
                Check everything you have
              </p>
              <p className="mt-1 text-[11.5px] leading-snug text-ink-faint">
                Nothing is assumed. The plan only prescribes gear you check. Check nothing and you get
                a bodyweight plan.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {HOME_CHECKLIST.map((e) => (
                  <Chip
                    key={e.label}
                    tone={e.tags.every((t) => extras.has(t)) ? 'accent' : 'default'}
                    onClick={() => toggleItem(e.tags)}
                  >
                    {e.label}
                  </Chip>
                ))}
              </div>
            </>
          )}
          <p className="mt-5 text-[12px] font-black uppercase tracking-wider text-ink-faint">Also have access to…</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ENV_EXTRAS[profile].map((e) => (
              <Chip
                key={e.label}
                tone={e.tags.every((t) => extras.has(t)) ? 'accent' : 'default'}
                onClick={() => toggleItem(e.tags)}
              >
                {e.label}
              </Chip>
            ))}
          </div>
          <Btn className="mt-6 w-full py-4" onClick={next}>
            Next: experience
          </Btn>
        </div>
      )}

      {step === 5 && (
        <div className="flex flex-1 flex-col">
          <h2 className="headline text-[26px]">Training age?</h2>
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
            Next: numbers
          </Btn>
        </div>
      )}

      {step === 6 && (
        <div className="flex flex-1 flex-col">
          <h2 className="headline text-[26px]">Baseline numbers</h2>
          <p className="mt-1 text-[13px] text-ink-dim">Weight sets your protein + calorie targets. The rest is your before picture.</p>
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-bold">Bodyweight</span>
              <Stepper value={weight} onChange={setWeight} step={1} suffix="lb" width="w-20" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-[14px] font-bold">Sex</span>
                <p className="text-[10.5px] leading-snug text-ink-faint">Tunes calories + the body-fat tape formula. Optional.</p>
              </div>
              <div className="flex gap-1.5">
                {(
                  [
                    ['male', 'Male'],
                    ['female', 'Female'],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    onClick={() => setSex((prev) => (prev === v ? null : v))}
                    className={`rounded-lg px-3.5 py-2 text-[12px] font-bold ${
                      sex === v ? 'bg-accent text-black' : 'bg-white/[0.07] text-ink-faint'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-[14px] font-bold">How do you actually eat?</span>
              <p className="mt-0.5 text-[11px] leading-snug text-ink-faint">
                Your meal plan is built around this. Fewer meals just means bigger ones, protein stays the same.
              </p>
              <div className={skipMeals ? 'opacity-40' : ''}>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {(
                    [
                      [2, '2 big meals'],
                      [3, '3 square meals'],
                      [4, '3 meals + a snack'],
                      [5, 'Grazer (5 small)'],
                    ] as const
                  ).map(([n, label]) => (
                    <button
                      key={n}
                      onClick={() => {
                        setMealsPerDay(n)
                        setSkipMeals(false)
                      }}
                      className={`rounded-xl border px-3 py-2.5 text-[12.5px] font-bold ${
                        mealsPerDay === n && !skipMeals ? 'border-accent/60 bg-accent/12 text-accent-soft' : 'border-edge bg-white/[0.07] text-ink-dim'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(
                    [
                      ['omnivore', 'No restrictions'],
                      ['vegetarian', 'Vegetarian'],
                      ['vegan', 'Vegan'],
                    ] as const
                  ).map(([d, label]) => (
                    <Chip
                      key={d}
                      tone={dietStyle === d && !skipMeals ? 'accent' : 'default'}
                      onClick={() => {
                        setDietStyle(d)
                        setSkipMeals(false)
                      }}
                    >
                      {label}
                    </Chip>
                  ))}
                </div>
              </div>
              <button
                className="mt-2 text-[11.5px] font-semibold text-ink-faint underline"
                onClick={() => setSkipMeals((v) => !v)}
              >
                {skipMeals ? '↩ Actually, set my meals up now' : 'Skip meals for now, set them up anytime in the Meals tab'}
              </button>
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
                className="rounded-xl bg-white/[0.05] ring-1 ring-white/[0.05] px-3 py-2 text-[13px] font-semibold outline-none"
              />
            </div>
            <p className="text-[11px] text-ink-faint">Weeks start Mondays. Your pick snaps to {formatShort(mondayOf(pickedStart))} → first week runs through {formatShort(addDaysISO(mondayOf(pickedStart), 6))}.</p>
          </div>

          <PermissionsBlock />

          <Btn className="mt-6 w-full py-4" onClick={() => (mode === 'byor' ? enterBuilder() : next())}>
            {mode === 'byor' ? 'Next: build my week' : 'Generate my booklet'}
          </Btn>
        </div>
      )}

      {step === 7 && preview && (
        <PlanPreview
          preview={preview}
          displayName={displayName}
          weight={weight}
          setStep={setStep}
          back={back}
          tuneDraft={tuneDraft}
          setTuneDraft={setTuneDraft}
          setTuneProblems={setTuneProblems}
          commitPlan={commitPlan}
        />
      )}
      <RoutineSteps
        step={step}
        setStep={setStep}
        byorDraft={byorDraft}
        setByorDraft={setByorDraft}
        byorProblems={byorProblems}
        setByorProblems={setByorProblems}
        byorNotes={byorNotes}
        tuneDraft={tuneDraft}
        setTuneDraft={setTuneDraft}
        tuneProblems={tuneProblems}
        setTuneProblems={setTuneProblems}
        whyWorks={whyWorks}
        setWhyWorks={setWhyWorks}
        weight={weight}
        goal={goal}
        commitPlan={commitPlan}
      />
    </div>
  )
}
