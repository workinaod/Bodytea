import { useEffect, useMemo, useState } from 'react'
import type { CustomTarget, DietStyle, EquipTag, Goal, LifeEventKind, PlanConfig, RoutineGoal, Weekday } from '../types'

// The real-life checklist: each pick seeds a life event with a label the
// engine's notes will use, so the coaching speaks this user's schedule.
const LIFE_CHIPS: { id: string; chip: string; label: string; kind: LifeEventKind }[] = [
  { id: 'night-shift', chip: '🌙 Night shifts', label: 'Night shift', kind: 'late-night' },
  { id: 'late-gig', chip: '🎤 Gigs / late events', label: 'Late gig', kind: 'late-night' },
  { id: 'on-feet', chip: '🦵 On my feet at work', label: 'On-feet shift', kind: 'on-feet' },
  { id: 'kids', chip: '👶 Up nights with kids', label: 'Up with the kids', kind: 'late-night' },
]
import { mondayOf, todayISO, formatShort, addDaysISO } from '../engine/calendar'
import { useAppStore, uid } from '../store/appStore'
import { saveMeasurement } from '../logic/actions'
import { generatePlan, buildNutrition, FOCUS_LABELS, type FocusArea, type OnboardingAnswers } from '../plan/generator'
import { byorNutrition, makeEmptyByorPlan, normalizeBooklet, validateBooklet, ROUTINE_GOAL_LABELS } from '../plan/bookletOps'
import { analyzeRoutine, type RoutineNote } from '../plan/analyze'
import { BookletEditor } from './booklet/BookletEditor'
import { Btn, Card, Chip, Stepper } from '../components/ui'
import { enableReminders } from '../logic/reminders'

// ============================================================
// Onboarding v2: a goal-driven wizard that generates the user's
// own booklet. Every answer feeds generatePlan(); the last step
// previews the generated week before committing.
// ============================================================

const GOAL_CHIPS: { label: string; goal: Goal }[] = [
  { label: '💪 Build muscle', goal: 'muscle' },
  { label: '🔥 Lose weight', goal: 'lean' },
  { label: '🏋️ Get strong', goal: 'strength' },
  { label: '✂️ Get lean & defined', goal: 'lean' },
  { label: '🫀 Health & energy', goal: 'general' },
  { label: '🧍 Get moving again', goal: 'general' },
  { label: '⚡ Get faster', goal: 'speed' },
  { label: '🏅 Dominate my sport', goal: 'speed' },
  { label: '🏃 Endurance / go further', goal: 'general' },
  { label: '🎯 All-around athlete', goal: 'general' },
  { label: '⬆️ Jump higher', goal: 'vertical' },
  { label: '🏀 Dunk a basketball', goal: 'vertical' },
]

/** Home-gym checklist: nothing is assumed — each item grants its tags. */
const HOME_CHECKLIST: { tags: EquipTag[]; label: string }[] = [
  { tags: ['dumbbell'], label: 'Dumbbells' },
  { tags: ['barbell', 'plate'], label: 'Barbell + plates' },
  { tags: ['rack'], label: 'Squat rack' },
  { tags: ['bench'], label: 'Flat bench' },
  { tags: ['incline-bench'], label: 'Incline bench' },
  { tags: ['pullup-bar'], label: 'Pull-up bar' },
  { tags: ['box'], label: 'Plyo box' },
  { tags: ['kettlebell'], label: 'Kettlebell' },
  { tags: ['trap-bar'], label: 'Trap bar' },
  { tags: ['med-ball'], label: 'Med ball' },
  { tags: ['band'], label: 'Bands' },
  { tags: ['machine'], label: 'Machines / cables' },
  { tags: ['treadmill'], label: 'Treadmill' },
  { tags: ['sled'], label: 'Sled' },
  { tags: ['cones'], label: 'Cones' },
  { tags: ['hurdle'], label: 'Mini hurdles' },
]

/** Environment access, asked per profile on top of the gear itself. */
const ENV_EXTRAS: Record<'gym' | 'home-db' | 'minimal', { tags: EquipTag[]; label: string }[]> = {
  gym: [
    { tags: ['court'], label: 'Hoop / court' },
  ],
  'home-db': [
    { tags: ['court'], label: 'Hoop / court' },
    { tags: ['hill-stairs'], label: 'Hill or stairs' },
  ],
  minimal: [
    { tags: ['pullup-bar'], label: 'Park pull-up bar' },
    { tags: ['box'], label: 'Box / ledge to jump on' },
    { tags: ['court'], label: 'Hoop / court' },
    { tags: ['hill-stairs'], label: 'Hill or stairs' },
  ],
}

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
  const [routineGoals, setRoutineGoals] = useState<Set<RoutineGoal>>(new Set())
  const [whyWorks, setWhyWorks] = useState('')
  const [goalStatement, setGoalStatement] = useState('')
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
    }
  }, [goal, goalStatement, target1, days, profile, extras, experience, weight, mealsPerDay, lifePicks, customLife, customLifeKind, dietStyle, skipMeals, focusAreas])

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
      if (plan.whyWorks?.trim()) {
        d.coach.feed.unshift({
          id: uid(),
          at,
          kind: 'insight',
          text: `🗣 On record — why your routine works, in your words: “${plan.whyWorks.trim()}”`,
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
   * existing draft — the built week survives a trip back to the goal step).
   */
  function enterBuilder() {
    const seeded = makeEmptyByorPlan({
      routineGoals: [...routineGoals],
      goalStatement,
      customTargets: answers.customTargets,
      bodyweightLb: weight,
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
            Two minutes of straight answers gets you a coach, not another app:
          </p>
          <div className="mt-3 space-y-2 border-l-2 border-edge pl-3 text-[13px] leading-snug text-ink-dim">
            <p>A training booklet built around YOUR goal, gear, and week — photo demos and muscle maps on every movement.</p>
            <p>Meals sized to how you actually eat — 2 big plates or 5 small, with common-grocery swaps.</p>
            <p>GPS run &amp; ride tracking, PRs, streaks, a global leaderboard, and 3 / 6 / 12-month reviews.</p>
            <p>A sergeant that bends the plan around real life — and accepts calendar proof, nothing less.</p>
          </div>
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
          <h2 className="text-[26px] font-black tracking-tight">
            {mode === 'byor'
              ? 'What is this routine chasing?'
              : `What are you chasing${displayName.trim() ? `, ${displayName.trim().split(/\s+/)[0]}` : ''}?`}
          </h2>
          {mode === 'byor' && (
            <p className="mt-1 text-[13px] text-ink-dim">Pick every one that applies — the notes check your routine against them.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {mode === 'byor'
              ? (Object.keys(ROUTINE_GOAL_LABELS) as RoutineGoal[]).map((g) => (
                  <Chip key={g} tone={routineGoals.has(g) ? 'accent' : 'default'} onClick={() => toggleRoutineGoal(g)}>
                    {ROUTINE_GOAL_LABELS[g]}
                  </Chip>
                ))
              : GOAL_CHIPS.map((g, i) => (
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
          {mode !== 'byor' && (
            <>
              <p className="mt-5 text-[12px] font-black uppercase tracking-wider text-ink-faint">
                Want extra attention anywhere? <span className="font-semibold normal-case tracking-normal">(pick up to 2)</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(Object.entries(FOCUS_LABELS) as [FocusArea, string][]).map(([id, label]) => (
                  <Chip
                    key={id}
                    tone={focusAreas.has(id) ? 'accent' : 'default'}
                    onClick={() =>
                      setFocusAreas((prev) => {
                        const n = new Set(prev)
                        if (n.has(id)) n.delete(id)
                        else if (n.size < 2) n.add(id)
                        return n
                      })
                    }
                  >
                    {label}
                  </Chip>
                ))}
              </div>
              {focusAreas.size > 0 && (
                <p className="mt-1 text-[11px] text-ink-faint">
                  Direct {[...focusAreas].map((f) => FOCUS_LABELS[f].toLowerCase()).join(' + ')} work gets written into the plan every week.
                </p>
              )}
            </>
          )}

          <Btn
            className="mt-6 w-full py-4"
            onClick={() => (mode === 'byor' ? setStep(6) : next())}
            disabled={(mode === 'byor' ? routineGoals.size === 0 : goalChip === null) || goalStatement.trim().length < 4}
          >
            {mode === 'byor' ? 'Next — my numbers' : 'Next — my week'}
          </Btn>
          {((mode === 'byor' ? routineGoals.size === 0 : goalChip === null) || goalStatement.trim().length < 4) && (
            <p className="mt-2 text-center text-[11.5px] text-ink-faint">
              {mode === 'byor' ? 'Pick at least one AND write the goal in your own words.' : 'Pick a goal AND write it in your own words.'}
            </p>
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

          {/* Their real week — seeds life events so every coach note speaks their schedule */}
          <div className="mt-6">
            <div className="text-[14px] font-bold">What else does your week hold?</div>
            <p className="mt-0.5 text-[11.5px] leading-snug text-ink-faint">
              The plan bends around real life. Pick what's true and the coach's notes will talk about YOUR
              shifts and nights — not somebody else's.
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
              placeholder="Your own — a DJ set, league night, choir…"
              className="mt-2 w-full rounded-xl border border-edge bg-surface px-3 py-2.5 text-[13px] outline-none placeholder:text-ink-faint focus:border-accent/60"
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
            Next — my gear
          </Btn>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-1 flex-col">
          <h2 className="text-[26px] font-black tracking-tight">Where do you train?</h2>
          <div className="mt-4 space-y-2">
            {(
              [
                ['gym', 'Full gym', 'Racks, machines, cables — the works.'],
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
                Nothing is assumed — the plan only prescribes gear you check. Check nothing and you get a
                bodyweight plan.
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
            <div>
              <span className="text-[14px] font-bold">How do you actually eat?</span>
              <p className="mt-0.5 text-[11px] leading-snug text-ink-faint">
                Your meal plan is built around this — fewer meals just means bigger ones. Protein stays the same.
              </p>
              <div className={skipMeals ? 'opacity-40' : ''}>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {(
                    [
                      [2, '2 big meals'],
                      [3, '3 square meals'],
                      [4, '3 meals + a snack'],
                      [5, 'Grazer — 5 small'],
                    ] as const
                  ).map(([n, label]) => (
                    <button
                      key={n}
                      onClick={() => {
                        setMealsPerDay(n)
                        setSkipMeals(false)
                      }}
                      className={`rounded-xl border px-3 py-2.5 text-[12.5px] font-bold ${
                        mealsPerDay === n && !skipMeals ? 'border-accent/60 bg-accent/12 text-accent-soft' : 'border-edge bg-surface-2 text-ink-dim'
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
                {skipMeals ? '↩ Actually, set my meals up now' : 'Skip meals for now — set them up anytime in the Meals tab'}
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
                className="rounded-xl border border-edge bg-surface px-3 py-2 text-[13px] font-semibold outline-none"
              />
            </div>
            <p className="text-[11px] text-ink-faint">Weeks start Mondays — your pick snaps to {formatShort(mondayOf(pickedStart))} → first week runs through {formatShort(addDaysISO(mondayOf(pickedStart), 6))}.</p>
          </div>

          <PermissionsBlock />

          <Btn className="mt-6 w-full py-4" onClick={() => (mode === 'byor' ? enterBuilder() : next())}>
            {mode === 'byor' ? 'Next — build my week' : 'Generate my booklet'}
          </Btn>
        </div>
      )}

      {step === 7 && preview && (
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
            Plus conditioning: at least {({ lean: 3, muscle: 2, strength: 2, general: 2, vertical: 1, speed: 1 } as const)[preview.plan.goal]}{' '}
            cardio session{({ lean: 3, muscle: 2, strength: 2, general: 2, vertical: 1, speed: 1 } as const)[preview.plan.goal] > 1 ? 's' : ''} a week —
            scheduled in the Week tab. Sport, runs, and rides all count; the plan enforces the minimum.
          </p>

          {preview.plan.lifeEvents.length > 0 && (
            <p className="mt-2 border-l-2 border-gold/60 py-1 pl-3 text-[11.5px] leading-snug text-gold/90">
              Knows your week: {preview.plan.lifeEvents.map((e) => e.label).join(' · ')} — flag the days each
              week and the sessions adapt around them.
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
            My routine's in — next
          </Btn>
        </div>
      )}

      {step === 9 && byorDraft && (
        <div className="flex flex-1 flex-col">
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-accent">One honest question</div>
          <h2 className="mt-1 text-[26px] font-black tracking-tight">Why has this routine been working for you?</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-dim">
            Be specific — “bench goes up every month”, “I actually show up when it's only 3 days”, “my knees stopped
            hurting”. The coach reads your answer before writing the notes.
          </p>
          <textarea
            value={whyWorks}
            onChange={(e) => setWhyWorks(e.target.value)}
            placeholder={'"I never miss because it\'s short"  ·  "squat added 40 lb this year"'}
            rows={3}
            className="mt-4 w-full resize-none rounded-xl border border-edge bg-surface px-4 py-3 text-[14px] font-semibold text-ink outline-none focus:border-accent/60"
          />
          <p className="mt-1 text-[11px] text-ink-faint">
            Goes on record in your coach feed. Leave it empty if it honestly hasn't been working — that's an answer too.
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
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-accent">The read on your routine</div>
          <h2 className="mt-1 text-[26px] font-black tracking-tight">Straight notes, no fluff</h2>
          {byorDraft.whyWorks && (
            <div className="mt-3 rounded-xl border-l-2 border-gold/50 bg-surface px-3.5 py-2.5">
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
            These land in your coach feed too, and refresh whenever you edit the booklet. Your routine, your call —
            the app tracks it exactly as you built it.
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
            Start Week 1 — let's work
          </Btn>
          <button onClick={() => setStep(8)} className="mt-3 text-center text-[12px] font-semibold text-ink-faint underline">
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

/** Ask for what the app needs, in context, before the plan starts. */
function PermissionsBlock() {
  const [notif, setNotif] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  )
  const [geo, setGeo] = useState<'granted' | 'denied' | 'prompt' | 'unsupported'>('prompt')

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGeo('unsupported')
      return
    }
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((st) => setGeo(st.state as 'granted' | 'denied' | 'prompt'))
      .catch(() => {})
  }, [])

  const row = 'flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left'
  return (
    <div className="mt-5 space-y-2">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-ink-faint">
        Set up now, never think about it again
      </p>
      <button
        disabled={notif === 'granted' || notif === 'unsupported'}
        onClick={() => {
          void enableReminders().then(() =>
            setNotif(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission),
          )
        }}
        className={`${row} ${notif === 'granted' ? 'border-lime/40 bg-lime/8' : 'border-edge bg-surface-2'}`}
      >
        <span>
          <span className={`block text-[13.5px] font-bold ${notif === 'granted' ? 'text-lime' : 'text-ink'}`}>
            {notif === 'granted' ? '✓ Notifications on' : 'Turn on notifications'}
          </span>
          <span className="mt-0.5 block text-[11px] leading-snug text-ink-faint">
            Two workout nudges a day max, weekly check-in day, milestone reviews. Never spam.
          </span>
        </span>
      </button>
      <button
        disabled={geo === 'granted' || geo === 'unsupported'}
        onClick={() =>
          navigator.geolocation.getCurrentPosition(
            () => setGeo('granted'),
            () => setGeo('denied'),
            { timeout: 10000 },
          )
        }
        className={`${row} ${geo === 'granted' ? 'border-lime/40 bg-lime/8' : 'border-edge bg-surface-2'}`}
      >
        <span>
          <span className={`block text-[13.5px] font-bold ${geo === 'granted' ? 'text-lime' : 'text-ink'}`}>
            {geo === 'granted' ? '✓ Location on' : 'Allow location'}
          </span>
          <span className="mt-0.5 block text-[11px] leading-snug text-ink-faint">
            Only for the GPS run/ride tracker — maps your route, measures distance and pace.
          </span>
        </span>
      </button>
      <p className="text-[10.5px] leading-snug text-ink-faint">
        Both optional — you can do this later in Settings. Nothing leaves your phone.
      </p>
    </div>
  )
}
