import { useMemo, useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { supplementRecord } from '../../plan/supplements'
import { addDaysISO, formatDayLabel } from '../../engine/calendar'
import { useToday } from '../../logic/clock'
import { kcalTargetFor, nutritionDayType } from '../../engine/dayType'
import { kcalBumpSuggestion, kcalFor, latestBodyweightLb, macrosFor, proteinFor, proteinStreak } from '../../engine/stats'
import { applyRecheck, learnedCopy, nutritionRecheck } from '../../engine/nutritionRecheck'
import { energyCheck, energyCopy } from '../../engine/energyAvailability'
import { calorieStep, stepCopy } from '../../engine/calorieStep'
import { learnedCopyFor, learnedMaintenance } from '../../engine/maintenanceLearned'
import { MIN_KCAL_REST } from '../../plan/kcalFloor'
import { macroTargets } from '../../plan/sportsNutrition'
import { Btn, Card, Chip, DayArrow, Ring, ScreenHeader, SectionTitle } from '../../components/ui'
import { cycleDayTypeOverride, removeMealEntry, setMealServings, toggleSupplement } from '../../logic/actions'
import { LogSheet } from './LogSheet'
import { PlanView } from './PlanView'
import { GroceryList } from './GroceryList'
import { MealPlanSetupSheet } from './MealPlanSetupSheet'
import { SupplementStackSheet } from './SupplementStackSheet'
// ============================================================
// Meals, restructured around three jobs a normal person has:
//   Today   , log what you actually ate, tick supplements
//   My plan . YOUR meals (bring your own), each with common-
//              grocery alternatives at matching macros
//   Grocery , the list that feeds the plan
// One primary action per view; everything else is one tap deep.
// ============================================================

type MealsView = 'today' | 'plan' | 'grocery'

export function MealsScreen() {
  const data = useAppStore((s) => s.data)
  const update = useAppStore((s) => s.update)
  const today = useToday()
  const [selected, setSelected] = useState<string | null>(null)
  const date = selected ?? today
  const [view, setView] = useState<MealsView>('today')
  const [logOpen, setLogOpen] = useState(false)
  const [stackOpen, setStackOpen] = useState(false)
  const [setupOpen, setSetupOpen] = useState(false)

  const day = data.meals[date]
  const mealPlan = data.plan.mealPlan
  const dayType = nutritionDayType(date, data)
  const kcalTarget = kcalTargetFor(data, dayType)
  const protein = proteinFor(data, date)
  const kcal = kcalFor(data, date)
  const macros = macrosFor(data, date)
  // No recorded weight yet means no per-kilogram target, so the macro card
  // stays away rather than guessing at somebody's bodyweight.
  const bodyweight = latestBodyweightLb(data)
  // Carbs take what protein and the fat floor leave, scaled to the day's
  // own calorie target. See plan/sportsNutrition.ts for why that is the
  // right order rather than fixed percentages.
  const macroTarget = useMemo(
    () =>
      macroTargets({
        bodyweightLb: bodyweight ?? 175,
        kcal: kcalTarget,
        protein: 'hypertrophy',
        load: dayType === 'training' ? 'moderate' : 'rest',
      }),
    [bodyweight, kcalTarget, dayType],
  )
  const pStreak = proteinStreak(data)
  const bump = useMemo(() => kcalBumpSuggestion(data), [data])
  const recheck = useMemo(() => nutritionRecheck(data, today), [data, today])
  const energy = useMemo(() => energyCheck(data, today), [data, today])
  const step = useMemo(() => calorieStep(data, today), [data, today])
  const learned = useMemo(() => {
    const m = learnedMaintenance(data, today)
    return m ? learnedCopyFor(m) : null
  }, [data, today])

  return (
    <div className="space-y-3 pb-6">
      <ScreenHeader
        title={date === today ? 'Fuel' : formatDayLabel(date)}
        onTitleTap={() => setSelected(null)}
        left={<DayArrow dir="prev" onClick={() => setSelected(addDaysISO(date, -1))} />}
        right={<DayArrow dir="next" onClick={() => setSelected(addDaysISO(date, 1))} />}
      />

      {/* The three jobs, one switch */}
      <div className="flex rounded-xl bg-white/[0.05] ring-1 ring-white/[0.05] p-1">
        {(
          [
            { id: 'today', label: 'Log' },
            { id: 'plan', label: 'My plan' },
            { id: 'grocery', label: 'Grocery' },
          ] as const
        ).map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`flex-1 rounded-lg py-2 text-[12.5px] font-bold transition-colors ${
              view === v.id ? 'bg-white/[0.07] text-ink' : 'text-ink-faint'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === 'today' && (
        <>
          <Card className="flex items-center justify-around !py-5">
            <Ring value={protein} target={data.settings.proteinTargetG} label="Protein" unit="g" color="var(--color-accent)" size={140} />
            <Ring value={kcal} target={kcalTarget} label="Calories" unit="kcal" color="var(--color-cyan)" size={112} />
          </Card>

          {/* Carbs and fat.
              Protein and calories are the two numbers the plan is built
              on, so they keep the big rings. These sit under them because
              they are the fuel and the floor rather than the target: carbs
              flex with how much work the day holds, and fat has a minimum
              below which hormones suffer, which is a thing to stay ABOVE
              rather than hit.
              Hidden entirely on a day with no macro data behind it. A ring
              at zero would read as "you ate no carbs" when what it means
              is "the app has no idea", and those are different sentences. */}
          {macros.coveredKcal > 0 && bodyweight !== null && (
            <Card className="!py-4">
              <div className="flex items-center justify-around">
                <Ring value={macros.carbsG} target={macroTarget.carbsG} label="Carbs" unit="g" color="var(--color-lime)" size={96} />
                <Ring value={macros.fatG} target={macroTarget.fatG} label="Fat" unit="g" color="var(--color-gold)" size={96} />
              </div>
              <p className="mt-2 text-center text-[10.5px] leading-snug text-ink-faint">
                {macros.coverage >= 0.95
                  ? 'Carbs flex with the work in the day. Fat is a floor, not a target.'
                  : `Based on the ${Math.round(macros.coverage * 100)}% of today's calories logged with full macros. Custom entries only carry protein and calories.`}
              </p>
            </Card>
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            <Chip tone={dayType === 'training' ? 'accent' : 'default'} onClick={() => cycleDayTypeOverride(date)}>
              {dayType === 'training' ? 'Training day' : 'Rest day'} · {kcalTarget} kcal
              {day?.dayTypeOverride ? ' (manual)' : ''}
            </Chip>
            <Chip tone="lime">protein never drops: {data.settings.proteinTargetG} g</Chip>
            {/* A floor, not a ring: nothing here logs fibre, so showing a
                progress arc against it would be inventing a number. */}
            <Chip tone="default">fibre floor: {macroTarget.fiberG} g</Chip>
            {pStreak >= 2 && <Chip tone="gold">{pStreak}-day protein streak</Chip>}
          </div>

          {learned && (
            <Card>
              <p className="text-[13px] font-bold text-ink">What your own weeks say</p>
              <p className="mt-1 text-[12.5px] leading-snug text-ink-dim">{learned}</p>
            </Card>
          )}

          {step && (
            <Card className="border-accent/40">
              <p className="text-[13px] font-bold text-accent-soft">What the scale is actually doing</p>
              <p className="mt-1 text-[12.5px] leading-snug text-ink-dim">{stepCopy(step)}</p>
              {/* One button, because the other one would have been a lie:
                  there is nowhere to record a decline, so a "hold" would
                  have set the number to what it already was and the card
                  would have come straight back. Not tapping is declining. */}
              <div className="mt-2.5">
                <Btn kind="subtle" className="w-full !py-2"
                  onClick={() => update((d) => {
                    const gap = d.plan.nutrition.kcalTraining - d.plan.nutrition.kcalRest
                    d.plan.nutrition.kcalTraining = step.toKcal
                    d.plan.nutrition.kcalRest = Math.max(MIN_KCAL_REST, step.toKcal - gap)
                  })}>
                  Move to {step.toKcal} kcal
                </Btn>
              </div>
            </Card>
          )}

          {energy && (
            <Card className="border-gold/40">
              <p className="text-[13px] font-bold text-gold">
                {energy.level === 'low' ? 'Not much left to run on' : 'Worth a look'}
              </p>
              <p className="mt-1 text-[12.5px] leading-snug text-ink-dim">{energyCopy(energy)}</p>
            </Card>
          )}

          {recheck && (
            <Card className="border-accent/40">
              <p className="text-[13px] font-bold text-accent-soft">
                {recheck.athleteSet ? 'Worth another look' : 'Your target was set before this'}
              </p>
              <p className="mt-1 text-[12.5px] leading-snug text-ink-dim">
                {learnedCopy(recheck.learned, recheck.athleteSet)} On what I know now your training days come out at{' '}
                {recheck.suggested.kcalTraining} kcal, not {recheck.current.kcalTraining}. Your call.
              </p>
              <div className="mt-2.5 flex gap-2">
                <Btn kind="subtle" className="flex-1 !py-2"
                  onClick={() => update((d) => {
                    const next = applyRecheck(d, today)
                    if (!next) return
                    d.plan.nutrition = next.nutrition
                    d.plan.nutritionBasis = next.nutritionBasis
                  })}>
                  Use {recheck.suggested.kcalTraining}
                </Btn>
                <Btn kind="subtle" className="flex-1 !py-2"
                  onClick={() => update((d) => { d.plan.nutritionBasis = recheck.basis })}>
                  Keep {recheck.current.kcalTraining}
                </Btn>
              </div>
            </Card>
          )}

          {bump && (
            <Card className="border-gold/40">
              <p className="text-[13px] font-bold text-gold">Check-in rule triggered</p>
              <p className="mt-1 text-[12.5px] leading-snug text-ink-dim">
                Strength up {bump.strengthGainPct}% while the scale moved {bump.weightChangeLb} lb over 3+
                weeks. The plan says: add 150–200 kcal to training days. Recomp is slow, don't panic-cut.
              </p>
              <div className="mt-2.5 flex gap-2">
                {[150, 200].map((b) => (
                  <Btn key={b} kind="subtle" className="flex-1 !py-2"
                    onClick={() => update((d) => { d.settings.trainingDayKcalBonus = b as 150 | 200 })}>
                    +{b} kcal
                  </Btn>
                ))}
              </div>
            </Card>
          )}

          {/* Skipped meal setup during onboarding? Do it here, anytime. */}
          {mealPlan.templates.length === 0 && (
            <button
              onClick={() => setSetupOpen(true)}
              className="w-full rounded-2xl border border-accent/35 bg-accent/8 px-4 py-3.5 text-left active:bg-accent/15"
            >
              <span className="block text-[13.5px] font-extrabold text-accent-soft">
                No meal plan yet. Build one in 20 seconds
              </span>
              <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-dim">
                How many meals a day, how you eat (vegetarian and vegan covered). The coach does the math.
                Or skip it and just log, the rings work either way.
              </span>
            </button>
          )}

          {/* THE action on this screen */}
          <Btn className="w-full py-4 text-[15px]" onClick={() => setLogOpen(true)}>
            + Log food
          </Btn>

          <SectionTitle>Eaten {day?.entries.length ? `(${day.entries.length})` : ''}</SectionTitle>
          <div className="overflow-hidden rounded-2xl bg-white/[0.045] ring-1 ring-white/[0.05]">
            {(day?.entries ?? []).map((e, i) => (
              <div
                key={e.id}
                className={`flex items-center justify-between gap-2 px-4 py-2.5 ${i > 0 ? 'border-t border-white/[0.05]' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-bold">{e.label}</div>
                  <div className="text-[11px] font-semibold text-ink-faint">
                    {Math.round(e.proteinG * e.servings)}g P · {Math.round(e.kcal * e.servings)} kcal
                    {e.servings !== 1 && ` · ${e.servings}×`}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="h-8 w-8 rounded-lg bg-white/[0.07] text-sm font-bold text-ink-dim" onClick={() => setMealServings(date, e.id, e.servings - 0.5)}>−</button>
                  <button className="h-8 w-8 rounded-lg bg-white/[0.07] text-sm font-bold text-ink-dim" onClick={() => setMealServings(date, e.id, e.servings + 0.5)}>+</button>
                  <button className="h-8 w-8 rounded-lg text-sm font-bold text-danger" onClick={() => removeMealEntry(date, e.id)}>✕</button>
                </div>
              </div>
            ))}
            {!day?.entries.length && (
              <p className="px-4 py-4 text-center text-[12.5px] text-ink-faint">
                Nothing logged yet. The button above covers the whole day in a few taps.
              </p>
            )}
          </div>

          {/* Supplements, daily tick-off */}
          {mealPlan.supplements.length > 0 && (
            <>
              <SectionTitle
                right={
                  <button onClick={() => setStackOpen(true)} className="text-[11px] font-bold text-accent underline">
                    edit stack
                  </button>
                }
              >
                Supplements
              </SectionTitle>
              <div className="grid grid-cols-2 gap-2">
                {mealPlan.supplements.map((s) => {
                  const on = day?.supplements[s.id] ?? false
                  const rec = s.source === 'app' ? supplementRecord(s.id) : undefined
                  const name = rec?.name ?? s.name ?? s.id
                  const detail = rec
                    ? [rec.dose.display, rec.when].filter(Boolean).join(' · ')
                    : [s.dose, s.when].filter(Boolean).join(' · ')
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleSupplement(date, s.id)}
                      className={`rounded-xl border p-3 text-left ${on ? 'border-lime/40 bg-lime/8' : 'border-edge bg-white/[0.05]'}`}
                    >
                      <div className={`text-[12.5px] font-bold ${on ? 'text-lime' : 'text-ink'}`}>
                        {on ? '✓ ' : ''}{name}
                      </div>
                      <div className="text-[10.5px] text-ink-faint">{detail}</div>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}

      {view === 'plan' && (
        <PlanView opensOn={dayType} onEditStack={() => setStackOpen(true)} onSetup={() => setSetupOpen(true)} />
      )}
      {view === 'grocery' && <GroceryList />}

      {logOpen && <LogSheet date={date} dayType={dayType} onClose={() => setLogOpen(false)} />}
      {stackOpen && <SupplementStackSheet onClose={() => setStackOpen(false)} />}
      {setupOpen && <MealPlanSetupSheet onClose={() => setSetupOpen(false)} />}
    </div>
  )
}
