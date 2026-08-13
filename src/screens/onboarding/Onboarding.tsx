import { useMemo, useState } from 'react'
import type { CustomTarget, DietStyle, EquipTag, Goal, LifeEventKind, PlanConfig, RoutineGoal } from '../../types'

import { mondayOf, todayISO, formatShort, addDaysISO } from '../../engine/calendar'
import { useAppStore, uid } from '../../store/appStore'
import { saveMeasurement } from '../../logic/actions'
import { generatePlan, type FocusArea, type OnboardingAnswers } from '../../plan/generator'
import { makeEmptyByorPlan, normalizeBooklet } from '../../plan/bookletOps'
import { analyzeRoutine, type RoutineNote } from '../../plan/analyze'
import { Btn, Card, ChoiceChip, Stepper } from '../../components/ui'
import { Welcome } from './Welcome'
import { chipIndexForGoal, ENV_EXTRAS, GOAL_CHIPS, HOME_CHECKLIST, LIFE_CHIPS, QUICK_GOALS } from './onboardingData'
import { requestDurableStorage } from '../../platform/persistence'
import { PermissionsBlock } from './RoutineNotes'
import { GoalStep } from './GoalStep'
import { RoutineSteps } from './RoutineSteps'
import { PlanPreview } from './PlanPreview'
import { targetsFromAnswers } from '../../plan/followups'
import { FollowupStep } from './FollowupStep'
import { MealStep } from './MealStep'
import { GearStep } from './GearStep'

/**
 * The two screens added after the first eight. New ids rather than a
 * renumber, so every existing branch and back-step keeps meaning what
 * it meant; GEN_FLOW below is what actually decides the order.
 */
const FOLLOWUPS = 12
const MEALS = 13

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
  /** Extra detail typed AFTER picking a preset, rather than instead of it. */
  const [goalDetail, setGoalDetail] = useState('')
  const [goalAnswers, setGoalAnswers] = useState<Record<string, string>>({})
  // The "number to beat" moved into the follow-ups, where it is only
  // asked of goals a number actually fits. It is read back out of the
  // answers rather than kept as its own field.
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
  const [dairyFree, setDairyFree] = useState(false)
  const [allergies, setAllergies] = useState('')
  const [focusAreas, setFocusAreas] = useState<Set<FocusArea>>(new Set())
  const [weight, setWeight] = useState(180)
  const [vert, setVert] = useState(0)
  const [pickedStart, setPickedStart] = useState(mondayOf(todayISO()))

  const goal: Goal = goalChip !== null ? GOAL_CHIPS[goalChip].goal : 'general'

  /**
   * Their goal as one sentence, however they gave it.
   *
   * A preset carries its own plain sentence; anything they add is
   * appended rather than replacing it, so "lose weight and keep it off,
   * before my wedding in June" reaches the plan — and the follow-up
   * generator reads the June out of it and stops asking about dates.
   */
  const statement = useMemo(() => {
    const typed = goalStatement.trim()
    if (goalChip === null) return typed
    const base = typed || GOAL_CHIPS[goalChip].statement
    const extra = goalDetail.trim()
    return extra ? `${base}, ${extra}` : base
  }, [goalChip, goalStatement, goalDetail])

  const answers: OnboardingAnswers = useMemo(() => {
    const customTargets: CustomTarget[] = targetsFromAnswers(goal, goalAnswers)
    return {
      goal,
      goalStatement: statement,
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
      foodLimits: { dairyFree, allergies: allergies.trim() || undefined },
      skipMeals,
      focusAreas: [...focusAreas],
      sex: sex ?? undefined,
    }
  }, [goal, statement, goalAnswers, days, profile, extras, experience, weight, mealsPerDay, lifePicks, customLife, customLifeKind, dietStyle, dairyFree, allergies, skipMeals, focusAreas, sex])

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

  // The order of the generated-plan path, written down.
  //
  // It used to be `step + 1`, which meant the sequence lived in the
  // numbering and a new screen could only go on the end. These are
  // stable ids in the order somebody walks them, so the follow-ups sit
  // where a coach would ask them and food sits last where it can be
  // skipped.
  const GEN_FLOW = [0, 1, 2, FOLLOWUPS, 3, 4, 5, 6, MEALS, 7]
  const flowAt = (s: number) => GEN_FLOW.indexOf(s)

  const next = () =>
    setStep((s) => {
      const i = flowAt(s)
      return i >= 0 && i < GEN_FLOW.length - 1 ? GEN_FLOW[i + 1] : s + 1
    })
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
    const i = flowAt(step)
    if (i > 0) return setStep(GEN_FLOW[i - 1])
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
            {Array.from({ length: GEN_FLOW.length - 1 }, (_, i) => {
              const at = flowAt(step)
              const here = at <= 0 ? GEN_FLOW.length - 2 : at - 1
              return (
                <span
                  key={i}
                  className={`h-1 rounded-full transition-all ${i === here ? 'w-5 bg-accent' : i < here ? 'w-2 bg-accent/50' : 'w-2 bg-white/[0.07]'}`}
                />
              )
            })}
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
            setGoalChip(chipIndexForGoal(g.goal))
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
          <h2 className="headline text-center text-[26px]">What should we call you?</h2>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display name"
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
          goalChip={goalChip}
          setGoalChip={setGoalChip}
          routineGoals={routineGoals}
          toggleRoutineGoal={toggleRoutineGoal}
          goalStatement={goalStatement}
          setGoalStatement={setGoalStatement}
          goalDetail={goalDetail}
          setGoalDetail={setGoalDetail}
          focusAreas={focusAreas}
          setFocusAreas={setFocusAreas}
          onNext={() => (mode === 'byor' ? setStep(6) : next())}
        />
      )}
      {step === FOLLOWUPS && (
        <FollowupStep
          goal={goal}
          statement={statement}
          firstName={displayName.trim().split(/\s+/)[0] ?? ''}
          answers={goalAnswers}
          setAnswers={setGoalAnswers}
          onNext={next}
        />
      )}

      {step === MEALS && (
        <MealStep
          dietStyle={dietStyle}
          setDietStyle={setDietStyle}
          dairyFree={dairyFree}
          setDairyFree={setDairyFree}
          allergies={allergies}
          setAllergies={setAllergies}
          mealsPerDay={mealsPerDay}
          setMealsPerDay={setMealsPerDay}
          onBuild={() => {
            setSkipMeals(false)
            next()
          }}
          onSkip={() => {
            setSkipMeals(true)
            next()
          }}
        />
      )}

      {step === 3 && (
        <div className="flex flex-1 flex-col">
          <h2 className="headline text-center text-[26px]">How many days a week?</h2>
          <p className="mt-1 text-center text-[13px] text-ink-dim">A plan you stick to beats a bigger one you skip.</p>
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
            <div className="text-[14px] font-bold">What else is going on in your week?</div>
            <p className="mt-0.5 text-[11.5px] leading-snug text-ink-faint">
              Your plan works around whatever you pick.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {LIFE_CHIPS.map((c) => (
                <ChoiceChip
                  key={c.id}
                  selected={lifePicks.has(c.id)}
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
                </ChoiceChip>
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
                  <ChoiceChip key={k} selected={customLifeKind === k} onClick={() => setCustomLifeKind(k)}>
                    {l}
                  </ChoiceChip>
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
        <GearStep
          goal={goal}
          profile={profile}
          pickProfile={pickProfile}
          extras={extras}
          toggleItem={toggleItem}
          next={next}
        />
      )}

      {step === 5 && (
        <div className="flex flex-1 flex-col">
          <h2 className="headline text-center text-[26px]">Training age?</h2>
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
          <h2 className="headline text-center text-[26px]">Baseline numbers</h2>
          <p className="mt-1 text-center text-[13px] text-ink-dim">Weight sets your protein + calorie targets. The rest is your before picture.</p>
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
            {mode === 'byor' ? 'Next: build my week' : 'Next: food'}
          </Btn>
        </div>
      )}

      {step === 7 && preview && (
        <PlanPreview
          preview={preview}
          displayName={displayName}
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
