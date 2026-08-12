import { useMemo, useState } from 'react'
import type { DietStyle, MealTemplateDef, SupplementDef } from '../../types'
import { uid, useAppStore } from '../../store/appStore'
import { addDaysISO, formatDayLabel } from '../../engine/calendar'
import { useToday } from '../../logic/clock'
import { kcalTargetFor, nutritionDayType } from '../../engine/resolveDay'
import { kcalBumpSuggestion, kcalFor, proteinFor, proteinStreak } from '../../engine/stats'
import { buildMealPlan, FOODS, SUPPLEMENT_CATALOG, type MealsPerDay } from '../../plan/foods'
import { mealAlternatives } from '../../plan/mealAlts'
import { Btn, Card, Chip, DayArrow, Ring, ScreenHeader, SectionTitle } from '../../components/ui'
import { Sheet } from '../../components/Sheet'
import {
  addMealEntry,
  cycleDayTypeOverride,
  removeMealEntry,
  setMealServings,
  toggleSupplement,
} from '../../logic/actions'

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
  const pStreak = proteinStreak(data)
  const bump = useMemo(() => kcalBumpSuggestion(data), [data])

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

          <div className="flex flex-wrap items-center gap-1.5">
            <Chip tone={dayType === 'training' ? 'accent' : 'default'} onClick={() => cycleDayTypeOverride(date)}>
              {dayType === 'training' ? 'Training day' : 'Rest day'} · {kcalTarget} kcal
              {day?.dayTypeOverride ? ' (manual)' : ''}
            </Chip>
            <Chip tone="lime">protein never drops: {data.settings.proteinTargetG} g</Chip>
            {pStreak >= 2 && <Chip tone="gold">{pStreak}-day protein streak</Chip>}
          </div>

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
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleSupplement(date, s.id)}
                      className={`rounded-xl border p-3 text-left ${on ? 'border-lime/40 bg-lime/8' : 'border-edge bg-white/[0.05]'}`}
                    >
                      <div className={`text-[12.5px] font-bold ${on ? 'text-lime' : 'text-ink'}`}>
                        {on ? '✓ ' : ''}{s.name}
                      </div>
                      <div className="text-[10.5px] text-ink-faint">{s.dose} · {s.when}</div>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}

      {view === 'plan' && <PlanView onEditStack={() => setStackOpen(true)} onSetup={() => setSetupOpen(true)} />}
      {view === 'grocery' && <GroceryList />}

      {logOpen && <LogSheet date={date} dayType={dayType} onClose={() => setLogOpen(false)} />}
      {stackOpen && <SupplementStackSheet onClose={() => setStackOpen(false)} />}
      {setupOpen && <MealPlanSetupSheet onClose={() => setSetupOpen(false)} />}
    </div>
  )
}

// ============================================================
// Log sheet, every way food gets logged, one place:
// plan meals (one tap), recents, food search, custom numbers.
// ============================================================

function LogSheet({ date, dayType, onClose }: { date: string; dayType: 'training' | 'rest'; onClose: () => void }) {
  const data = useAppStore((s) => s.data)
  const [foodQuery, setFoodQuery] = useState('')
  const [added, setAdded] = useState(0)
  const [name, setName] = useState('')
  const [protein, setProtein] = useState('')
  const [kcal, setKcal] = useState('')

  const templates = data.plan.mealPlan.templates.filter((m) => m.dayType === dayType)

  const recents = useMemo(() => {
    const freq = new Map<string, { label: string; proteinG: number; kcal: number; count: number }>()
    for (const m of Object.values(data.meals)) {
      for (const e of m.entries) {
        if (e.source !== 'custom') continue
        const cur = freq.get(e.label) ?? { label: e.label, proteinG: e.proteinG, kcal: e.kcal, count: 0 }
        cur.count++
        freq.set(e.label, cur)
      }
    }
    return [...freq.values()].sort((a, b) => b.count - a.count).slice(0, 8)
  }, [data.meals])

  const foodMatches = useMemo(() => {
    const q = foodQuery.trim().toLowerCase()
    if (!q) return null
    return FOODS.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 12)
  }, [foodQuery])

  const field = 'rounded-xl bg-white/[0.07] px-3.5 py-3 text-[14px] outline-none placeholder:text-ink-faint'

  return (
    <Sheet open onClose={onClose} title="Log food">
      <div className="space-y-4 pb-8">
        {added > 0 && (
          <div className="border-l-2 border-lime/70 py-1 pl-3 text-[12.5px] font-bold text-lime/90">
            {added} logged ✓. Keep going or swipe down when you're done.
          </div>
        )}

        {/* One-tap: the user's own plan meals for this day type */}
        {templates.length > 0 && (
          <div>
            <div className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-ink-faint">
              From my plan, one tap
            </div>
            <div className="overflow-hidden rounded-2xl bg-white/[0.045] ring-1 ring-white/[0.05]">
              {templates.map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => {
                    addMealEntry(date, { label: `${t.slot} · ${t.name}`, proteinG: t.proteinG, kcal: t.kcal, source: 'mealTemplate' })
                    onClose()
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left active:bg-white/[0.07] ${
                    i > 0 ? 'border-t border-white/[0.05]' : ''
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-extrabold">
                      {t.slot} · {t.name}
                    </span>
                    {t.detail && <span className="mt-0.5 block truncate text-[11px] leading-snug text-ink-faint">{t.detail}</span>}
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-mono text-[12.5px] font-bold text-accent-soft">+{t.proteinG}g P</span>
                    <span className="block font-mono text-[10.5px] text-ink-faint">~{t.kcal} kcal</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {recents.length > 0 && (
          <div>
            <div className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-ink-faint">Your recents</div>
            <div className="flex flex-wrap gap-1.5">
              {recents.map((r) => (
                <button
                  key={r.label}
                  onClick={() => {
                    addMealEntry(date, { label: r.label, proteinG: r.proteinG, kcal: r.kcal, source: 'recent' })
                    onClose()
                  }}
                  className="rounded-xl border border-cyan/25 bg-cyan/5 px-3 py-2 text-left"
                >
                  <div className="text-[12px] font-bold leading-tight text-cyan">{r.label}</div>
                  <div className="text-[10px] font-semibold text-ink-faint">{r.proteinG}g P · {r.kcal} kcal</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Single foods, search first, browse as fallback */}
        <div>
          <div className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-ink-faint">Single foods</div>
          <input
            className="w-full rounded-xl bg-white/[0.07] px-3.5 py-2.5 text-[13px] outline-none placeholder:text-ink-faint"
            placeholder={`Search ${FOODS.length} foods…`}
            value={foodQuery}
            onChange={(e) => setFoodQuery(e.target.value)}
          />
          {foodMatches ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {foodMatches.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    addMealEntry(date, { label: `${f.name} (${f.serving})`, proteinG: f.proteinG, kcal: f.kcal, source: 'chip', foodId: f.id })
                    setAdded((n) => n + 1)
                  }}
                  className="rounded-xl bg-white/[0.07] px-3 py-2 text-left active:bg-white/[0.09]"
                >
                  <div className="text-[12px] font-bold leading-tight">{f.name}</div>
                  <div className="text-[10px] font-semibold text-ink-faint">
                    {f.serving} · {f.proteinG}g P · {f.kcal} kcal
                  </div>
                </button>
              ))}
              {foodMatches.length === 0 && (
                <p className="w-full py-2 text-center text-[12px] text-ink-faint">
                  Nothing matches. Log it with your own numbers below.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              {(['protein', 'carb', 'fat', 'snack'] as const).map((cat) => (
                <div key={cat}>
                  <div className="mb-1 px-1 text-[10px] font-black uppercase tracking-wider text-ink-faint">
                    {cat === 'protein' ? 'Proteins (the priority)' : cat === 'carb' ? 'Carbs' : cat === 'fat' ? 'Fats' : 'Snacks & veg'}
                  </div>
                  <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
                    {FOODS.filter((f) => (cat === 'snack' ? f.category === 'snack' || f.category === 'veg' : f.category === cat)).map((f) => (
                      <button
                        key={f.id}
                        onClick={() => {
                          addMealEntry(date, { label: `${f.name} (${f.serving})`, proteinG: f.proteinG, kcal: f.kcal, source: 'chip', foodId: f.id })
                          setAdded((n) => n + 1)
                        }}
                        className="shrink-0 rounded-xl bg-white/[0.07] px-3 py-2 text-left active:bg-white/[0.09]"
                      >
                        <div className="text-[12px] font-bold leading-tight">{f.name}</div>
                        <div className="text-[10px] font-semibold text-ink-faint">
                          {f.serving} · {f.proteinG}g P · {f.kcal} kcal
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Custom numbers, takeout, restaurant, whatever */}
        <div>
          <div className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-ink-faint">Anything else</div>
          <div className="space-y-2">
            <input className={`${field} w-full`} placeholder="What was it?" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="flex gap-2">
              <input inputMode="numeric" className={`${field} flex-1`} placeholder="Protein (g)" value={protein} onChange={(e) => setProtein(e.target.value)} />
              <input inputMode="numeric" className={`${field} flex-1`} placeholder="Calories" value={kcal} onChange={(e) => setKcal(e.target.value)} />
            </div>
            <Btn
              kind="subtle"
              className="w-full"
              disabled={!name || !protein}
              onClick={() => {
                addMealEntry(date, { label: name, proteinG: parseFloat(protein) || 0, kcal: parseFloat(kcal) || 0, source: 'custom' })
                onClose()
              }}
            >
              Log it
            </Btn>
            <p className="text-[11px] text-ink-faint">Custom entries land in your recents for one-tap next time.</p>
          </div>
        </div>
      </div>
    </Sheet>
  )
}

// ============================================================
// My plan, the user's meals as first-class data. Tap any meal
// for common-grocery alternatives at matching macros; bring your
// own plan by clearing the starter meals and adding yours.
// ============================================================

function PlanView({ onEditStack, onSetup }: { onEditStack: () => void; onSetup: () => void }) {
  const plan = useAppStore((s) => s.data.plan.mealPlan)
  const diet = useAppStore((s) => s.data.plan.dietStyle)
  const update = useAppStore((s) => s.update)
  const [dt, setDt] = useState<'training' | 'rest'>('training')
  const [openMeal, setOpenMeal] = useState<MealTemplateDef | null>(null)
  const [editing, setEditing] = useState<MealTemplateDef | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  const meals = plan.templates.filter((t) => t.dayType === dt)
  const totals = meals.reduce((a, t) => ({ p: a.p + t.proteinG, k: a.k + t.kcal }), { p: 0, k: 0 })

  function save(t: MealTemplateDef) {
    update((d) => {
      const list = d.plan.mealPlan.templates
      const at = list.findIndex((x) => x.id === t.id)
      if (at >= 0) list[at] = t
      else list.push(t)
    })
    setEditing(null)
    setOpenMeal(null)
  }

  function remove(id: string) {
    update((d) => {
      d.plan.mealPlan.templates = d.plan.mealPlan.templates.filter((x) => x.id !== id)
    })
    setEditing(null)
    setOpenMeal(null)
  }

  return (
    <div className="space-y-3">
      <div className="border-l-2 border-cyan/60 py-1 pl-3 text-[12.5px] leading-snug text-cyan/90">
        Your day of eating, as one-tap meals. Already have a plan? Add it here, rough protein
        and calories are enough. Tap any meal for swaps built from common groceries.
      </div>

      <div className="flex gap-2">
        {(['training', 'rest'] as const).map((x) => (
          <Chip key={x} tone={dt === x ? 'accent' : 'default'} onClick={() => setDt(x)}>
            {x === 'training' ? 'Training days' : 'Rest days'}
          </Chip>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl bg-white/[0.045] ring-1 ring-white/[0.05]">
        {meals.map((t, i) => (
          <button
            key={t.id}
            onClick={() => setOpenMeal(t)}
            className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-left active:bg-white/[0.07] ${i > 0 ? 'border-t border-white/[0.05]' : ''}`}
          >
            <span className="min-w-0">
              <span className="block truncate text-[13.5px] font-extrabold">
                {t.slot} · {t.name}
              </span>
              {t.detail && <span className="mt-0.5 block truncate text-[11px] text-ink-faint">{t.detail}</span>}
            </span>
            <span className="shrink-0 text-right font-mono text-[11.5px] text-ink-faint">
              {t.proteinG}g · {t.kcal} kcal
            </span>
          </button>
        ))}
        {meals.length === 0 && (
          <p className="px-4 py-5 text-center text-[12.5px] text-ink-faint">
            No meals yet for {dt === 'training' ? 'training' : 'rest'} days. Add your first below.
          </p>
        )}
      </div>

      {meals.length > 0 && (
        <p className="px-1 text-[11px] font-semibold text-ink-faint">
          Day adds up to {totals.p}g protein · ~{totals.k} kcal
        </p>
      )}

      {plan.templates.length === 0 && (
        <Btn className="w-full" onClick={onSetup}>
          Build my meal plan (20 seconds)
        </Btn>
      )}

      <Btn
        kind={plan.templates.length === 0 ? 'subtle' : 'primary'}
        className="w-full"
        onClick={() =>
          setEditing({ id: uid(), dayType: dt, slot: 'Meal', name: '', detail: '', proteinG: 40, kcal: 500 })
        }
      >
        + Add a meal
      </Btn>

      {plan.templates.length > 0 && (
        <button
          className="w-full py-1 text-center text-[11.5px] font-semibold text-ink-faint underline"
          onClick={() => {
            if (!confirmClear) {
              setConfirmClear(true)
              setTimeout(() => setConfirmClear(false), 4000)
              return
            }
            update((d) => {
              d.plan.mealPlan.templates = []
            })
            setConfirmClear(false)
          }}
        >
          {confirmClear
            ? `Tap again to clear all ${plan.templates.length} meals and start from yours`
            : 'Bringing your own plan? Clear these and build yours'}
        </button>
      )}

      {/* Stack + late-night live with the plan, not the daily log */}
      <SectionTitle
        right={
          <button onClick={onEditStack} className="text-[11px] font-bold text-accent underline">
            edit stack
          </button>
        }
      >
        Supplement stack
      </SectionTitle>
      <div className="overflow-hidden rounded-2xl bg-white/[0.045] ring-1 ring-white/[0.05]">
        {plan.supplements.map((s, i) => (
          <div key={s.id} className={`flex items-center justify-between px-4 py-2.5 ${i > 0 ? 'border-t border-white/[0.05]' : ''}`}>
            <span className="text-[13px] font-bold">{s.name}</span>
            <span className="text-[11px] text-ink-faint">{s.dose} · {s.when}</span>
          </div>
        ))}
        {plan.supplements.length === 0 && (
          <p className="px-4 py-3 text-center text-[12px] text-ink-faint">No stack yet. Add what you actually take.</p>
        )}
      </div>

      <div className="border-l-2 border-edge py-1 pl-3">
        <div className="text-[10.5px] font-black uppercase tracking-wider text-ink-faint">Late night?</div>
        <p className="mt-0.5 text-[11.5px] leading-snug text-ink-dim">
          <span className="font-bold text-lime">Yes:</span> {plan.lateNight.yes.join(', ')} ·{' '}
          <span className="font-bold text-danger">No:</span> {plan.lateNight.no.join(', ')}
        </p>
      </div>

      {openMeal && !editing && (
        <MealDetailSheet
          diet={diet}
          meal={openMeal}
          onEdit={() => setEditing({ ...openMeal })}
          onReplace={(alt) =>
            save({
              ...openMeal,
              name: alt.name,
              detail: alt.ingredients.join(', '),
              proteinG: alt.proteinG,
              kcal: alt.kcal,
            })
          }
          onAddAlt={(alt) =>
            save({
              id: uid(),
              dayType: openMeal.dayType,
              slot: openMeal.slot,
              name: alt.name,
              detail: alt.ingredients.join(', '),
              proteinG: alt.proteinG,
              kcal: alt.kcal,
            })
          }
          onClose={() => setOpenMeal(null)}
        />
      )}
      {editing && (
        <MealForm
          value={editing}
          onSave={save}
          onDelete={plan.templates.some((t) => t.id === editing.id) ? () => remove(editing.id) : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

/**
 * Meal-plan setup, doable any time, the same two questions onboarding
 * asks, for people who skipped them (or want a rebuild).
 */
function MealPlanSetupSheet({ onClose }: { onClose: () => void }) {
  const update = useAppStore((s) => s.update)
  const proteinTarget = useAppStore((s) => s.data.settings.proteinTargetG)
  const [count, setCount] = useState<MealsPerDay>(4)
  const [diet, setDiet] = useState<DietStyle>('omnivore')

  return (
    <Sheet open onClose={onClose} title="Build my meal plan">
      <div className="space-y-4 pb-8">
        <div>
          <div className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-ink-faint">
            How do you actually eat?
          </div>
          <div className="grid grid-cols-2 gap-1.5">
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
                onClick={() => setCount(n)}
                className={`rounded-xl border px-3 py-2.5 text-[12.5px] font-bold ${
                  count === n ? 'border-accent/60 bg-accent/12 text-accent-soft' : 'border-edge bg-white/[0.07] text-ink-dim'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-ink-faint">Any restrictions?</div>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['omnivore', 'No restrictions'],
                ['vegetarian', 'Vegetarian'],
                ['vegan', 'Vegan'],
              ] as const
            ).map(([d, label]) => (
              <Chip key={d} tone={diet === d ? 'accent' : 'default'} onClick={() => setDiet(d)}>
                {label}
              </Chip>
            ))}
          </div>
        </div>
        <Btn
          className="w-full py-3.5"
          onClick={() => {
            update((d) => {
              d.plan.mealPlan = buildMealPlan(d.plan.goal, proteinTarget, d.plan.nutrition, count, diet)
              d.plan.dietStyle = diet
            })
            onClose()
          }}
        >
          Build it around my {proteinTarget}g protein target
        </Btn>
        <p className="text-[11px] leading-snug text-ink-faint">
          Every meal comes with a common-grocery example and swaps. Edit or replace any of them
          after, it's your plan.
        </p>
      </div>
    </Sheet>
  )
}

/** One meal up close: its numbers, edit access, and grocery-store swaps. */
function MealDetailSheet({
  meal,
  diet,
  onEdit,
  onReplace,
  onAddAlt,
  onClose,
}: {
  meal: MealTemplateDef
  diet: DietStyle | undefined
  onEdit: () => void
  onReplace: (alt: { name: string; ingredients: string[]; proteinG: number; kcal: number }) => void
  onAddAlt: (alt: { name: string; ingredients: string[]; proteinG: number; kcal: number }) => void
  onClose: () => void
}) {
  const alts = useMemo(
    () => mealAlternatives({ proteinG: meal.proteinG, kcal: meal.kcal, slot: meal.slot, excludeName: meal.name, diet }),
    [meal, diet],
  )

  return (
    <Sheet open onClose={onClose} title={`${meal.slot} · ${meal.name}`}>
      <div className="space-y-4 pb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-[20px] font-black text-accent-soft">{meal.proteinG}g protein</div>
            <div className="font-mono text-[12px] text-ink-faint">~{meal.kcal} kcal</div>
          </div>
          <Btn kind="subtle" className="!py-2" onClick={onEdit}>
            Edit meal
          </Btn>
        </div>
        {meal.detail && <p className="text-[12.5px] leading-snug text-ink-dim">{meal.detail}</p>}

        <div>
          <div className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-ink-faint">
            Same macros, common groceries
          </div>
          <div className="overflow-hidden rounded-2xl bg-white/[0.045] ring-1 ring-white/[0.05]">
            {alts.map((a, i) => (
              <div key={a.id} className={`px-4 py-3 ${i > 0 ? 'border-t border-white/[0.05]' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-[13.5px] font-extrabold">{a.name}</span>
                  <span className="shrink-0 font-mono text-[11.5px] text-ink-faint">
                    {a.proteinG}g · {a.kcal} kcal
                  </span>
                </div>
                <p className="mt-0.5 text-[11.5px] leading-snug text-ink-faint">{a.ingredients.join(' · ')}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    className="flex-1 rounded-lg border border-accent/35 bg-accent/10 py-2 text-[12px] font-bold text-accent-soft"
                    onClick={() => onReplace(a)}
                  >
                    Use instead
                  </button>
                  <button
                    className="flex-1 rounded-lg bg-white/[0.07] py-2 text-[12px] font-bold text-ink-dim"
                    onClick={() => onAddAlt(a)}
                  >
                    + Add to plan
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-1.5 px-1 text-[11px] leading-snug text-ink-faint">
            Swaps match this meal's protein and calories as closely as possible using everyday
            ingredients. The plan holds even when the fridge changes.
          </p>
        </div>
      </div>
    </Sheet>
  )
}

function MealForm({
  value,
  onSave,
  onDelete,
  onClose,
}: {
  value: MealTemplateDef
  onSave: (t: MealTemplateDef) => void
  onDelete?: () => void
  onClose: () => void
}) {
  const [t, setT] = useState(value)
  const field = 'w-full rounded-xl bg-white/[0.07] px-3.5 py-3 text-[14px] outline-none placeholder:text-ink-faint'
  return (
    <Sheet open onClose={onClose} title={value.name ? 'Edit meal' : 'New meal'}>
      <div className="space-y-3 pb-6">
        <div className="flex gap-2">
          {(['training', 'rest'] as const).map((dt) => (
            <Chip key={dt} tone={t.dayType === dt ? 'accent' : 'default'} onClick={() => setT({ ...t, dayType: dt })}>
              {dt === 'training' ? 'Training day' : 'Rest day'}
            </Chip>
          ))}
        </div>
        <div className="flex gap-2">
          <input className={`${field} !w-32`} placeholder="Slot" value={t.slot} onChange={(e) => setT({ ...t, slot: e.target.value })} />
          <input className={field} placeholder="Meal name" value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre / Post', 'Late night'].map((s) => (
            <Chip key={s} tone={t.slot === s ? 'accent' : 'default'} onClick={() => setT({ ...t, slot: s })}>
              {s}
            </Chip>
          ))}
        </div>
        <input className={field} placeholder="What's in it (optional)" value={t.detail} onChange={(e) => setT({ ...t, detail: e.target.value })} />
        <div className="flex gap-2">
          <input
            inputMode="numeric"
            className={field}
            placeholder="Protein (g)"
            value={t.proteinG || ''}
            onChange={(e) => setT({ ...t, proteinG: parseFloat(e.target.value) || 0 })}
          />
          <input
            inputMode="numeric"
            className={field}
            placeholder="Calories"
            value={t.kcal || ''}
            onChange={(e) => setT({ ...t, kcal: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <Btn className="w-full" disabled={!t.name.trim() || t.proteinG <= 0} onClick={() => onSave({ ...t, name: t.name.trim() })}>
          Save meal
        </Btn>
        {onDelete && (
          <Btn kind="danger" className="w-full" onClick={onDelete}>
            Delete this meal
          </Btn>
        )}
      </div>
    </Sheet>
  )
}

/** The supplement stack is per-user: keep only what you actually take. */
function SupplementStackSheet({ onClose }: { onClose: () => void }) {
  const stack = useAppStore((s) => s.data.plan.mealPlan.supplements)
  const update = useAppStore((s) => s.update)
  const [name, setName] = useState('')
  const [dose, setDose] = useState('')
  const [when, setWhen] = useState('')
  const available = SUPPLEMENT_CATALOG.filter((c) => !stack.some((s) => s.id === c.id))
  const field = 'rounded-xl bg-white/[0.07] px-3 py-2.5 text-[13px] outline-none placeholder:text-ink-faint'

  function add(s: SupplementDef) {
    update((d) => {
      if (!d.plan.mealPlan.supplements.some((x) => x.id === s.id)) d.plan.mealPlan.supplements.push(s)
    })
  }

  return (
    <Sheet open onClose={onClose} title="My supplement stack">
      <div className="space-y-4 pb-6">
        <div className="overflow-hidden rounded-2xl bg-white/[0.045] ring-1 ring-white/[0.05]">
          {stack.map((s, i) => (
            <div key={s.id} className={`flex items-center justify-between gap-2 px-4 py-3 ${i > 0 ? 'border-t border-white/[0.05]' : ''}`}>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-bold">{s.name}</div>
                <div className="text-[10.5px] text-ink-faint">{s.dose} · {s.when}</div>
              </div>
              <button
                className="shrink-0 text-[12px] font-bold text-danger"
                onClick={() => update((d) => { d.plan.mealPlan.supplements = d.plan.mealPlan.supplements.filter((x) => x.id !== s.id) })}
              >
                remove
              </button>
            </div>
          ))}
          {stack.length === 0 && <p className="px-4 py-3 text-center text-[12px] text-ink-faint">Empty stack.</p>}
        </div>

        {available.length > 0 && (
          <>
            <div className="text-[11px] font-black uppercase tracking-wider text-ink-faint">Common options</div>
            <div className="flex flex-wrap gap-1.5">
              {available.map((c) => (
                <Chip key={c.id} onClick={() => add({ ...c })}>+ {c.name}</Chip>
              ))}
            </div>
          </>
        )}

        <div className="text-[11px] font-black uppercase tracking-wider text-ink-faint">Add your own</div>
        <div className="flex gap-2">
          <input className={`${field} flex-1`} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={`${field} w-24`} placeholder="Dose" value={dose} onChange={(e) => setDose(e.target.value)} />
        </div>
        <input className={`${field} w-full`} placeholder="When (e.g. with breakfast)" value={when} onChange={(e) => setWhen(e.target.value)} />
        <Btn
          kind="subtle"
          className="w-full"
          disabled={!name.trim()}
          onClick={() => {
            add({ id: uid(), name: name.trim(), dose: dose.trim() || ', ', when: when.trim() || 'Daily' })
            setName(''); setDose(''); setWhen('')
          }}
        >
          Add to stack
        </Btn>
      </div>
    </Sheet>
  )
}

/** The grocery list is plan data too, check off, add, remove. */
function GroceryList() {
  const groceryPlan = useAppStore((s) => s.data.plan.mealPlan.grocery)
  const checkedList = useAppStore((s) => s.data.grocery)
  const update = useAppStore((s) => s.update)
  const [editing, setEditing] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const checked: Record<string, boolean> = Object.fromEntries(checkedList.map((g) => [g, true]))

  function toggle(item: string) {
    update((d) => {
      d.grocery = d.grocery.includes(item) ? d.grocery.filter((x) => x !== item) : [...d.grocery, item]
    })
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <p className="text-[11.5px] text-ink-faint">Your list, from your meal plan. Yours to change.</p>
        <button className="text-[11.5px] font-bold text-accent underline" onClick={() => setEditing((v) => !v)}>
          {editing ? 'done' : 'edit list'}
        </button>
      </div>
      {groceryPlan.map((g) => (
        <div key={g.category}>
          <div className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-accent">{g.category}</div>
          <div className="space-y-1">
            {g.items.map((item) => (
              <div key={item} className="flex items-center gap-1">
                <button
                  onClick={() => toggle(item)}
                  className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] ${
                    checked[item] ? 'text-ink-faint line-through' : 'text-ink'
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px] font-black ${
                      checked[item] ? 'border-lime/50 bg-lime text-black' : 'border-edge bg-white/[0.07]'
                    }`}
                  >
                    {checked[item] ? '✓' : ''}
                  </span>
                  <span className="truncate">{item}</span>
                </button>
                {editing && (
                  <button
                    className="shrink-0 px-2 text-[13px] font-bold text-danger"
                    onClick={() =>
                      update((d) => {
                        const cat = d.plan.mealPlan.grocery.find((x) => x.category === g.category)
                        if (cat) cat.items = cat.items.filter((x) => x !== item)
                        d.grocery = d.grocery.filter((x) => x !== item)
                      })
                    }
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {editing && (
              <div className="flex gap-1.5 pt-1">
                <input
                  className="flex-1 rounded-lg bg-white/[0.07] px-2.5 py-1.5 text-[12.5px] outline-none placeholder:text-ink-faint"
                  placeholder={`Add to ${g.category.toLowerCase()}…`}
                  value={drafts[g.category] ?? ''}
                  onChange={(e) => setDrafts((p) => ({ ...p, [g.category]: e.target.value }))}
                />
                <button
                  className="rounded-lg bg-white/[0.07] px-3 text-[12px] font-bold text-ink-dim"
                  onClick={() => {
                    const item = (drafts[g.category] ?? '').trim()
                    if (!item) return
                    update((d) => {
                      const cat = d.plan.mealPlan.grocery.find((x) => x.category === g.category)
                      if (cat && !cat.items.includes(item)) cat.items.push(item)
                    })
                    setDrafts((p) => ({ ...p, [g.category]: '' }))
                  }}
                >
                  add
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
      <button
        className="text-[11.5px] font-semibold text-ink-faint underline"
        onClick={() => update((d) => { d.grocery = [] })}
      >
        Reset all checks
      </button>
    </div>
  )
}
