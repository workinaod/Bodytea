import { useMemo, useState } from 'react'
import type { MealTemplateDef, SupplementDef } from '../../types'
import { uid, useAppStore } from '../../store/appStore'
import { addDaysISO, formatDayLabel } from '../../engine/calendar'
import { useToday } from '../../logic/clock'
import { kcalTargetFor, nutritionDayType } from '../../engine/resolveDay'
import { kcalBumpSuggestion, kcalFor, proteinFor, proteinStreak } from '../../engine/stats'
import { FOODS, SUPPLEMENT_CATALOG } from '../../plan/foods'
import { Btn, Card, Chip, Ring, SectionTitle } from '../../components/ui'
import { Sheet } from '../../components/Sheet'
import {
  addMealEntry,
  cycleDayTypeOverride,
  removeMealEntry,
  setMealServings,
  toggleSupplement,
} from '../../logic/actions'

export function MealsScreen() {
  const data = useAppStore((s) => s.data)
  const update = useAppStore((s) => s.update)
  const today = useToday()
  const [selected, setSelected] = useState<string | null>(null)
  const date = selected ?? today
  const [customOpen, setCustomOpen] = useState(false)
  const [groceryOpen, setGroceryOpen] = useState(false)
  const [myMealsOpen, setMyMealsOpen] = useState(false)
  const [stackOpen, setStackOpen] = useState(false)
  const [foodQuery, setFoodQuery] = useState('')

  const day = data.meals[date]
  const mealPlan = data.plan.mealPlan
  const dayType = nutritionDayType(date, data)
  const kcalTarget = kcalTargetFor(data, dayType)
  const protein = proteinFor(data, date)
  const kcal = kcalFor(data, date)
  const pStreak = proteinStreak(data)
  const bump = useMemo(() => kcalBumpSuggestion(data), [data])

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

  const templates = mealPlan.templates.filter((m) => m.dayType === dayType)
  const foodMatches = useMemo(() => {
    const q = foodQuery.trim().toLowerCase()
    if (!q) return null
    return FOODS.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 12)
  }, [foodQuery])

  return (
    <div className="space-y-3 pb-6">
      <div className="flex items-center justify-between">
        <button className="px-3 py-2 text-[17px] font-bold text-ink-faint" onClick={() => setSelected(addDaysISO(date, -1))}>
          ‹
        </button>
        <button onClick={() => setSelected(null)} className="text-center">
          <div className="text-[13px] font-bold uppercase tracking-[0.18em] text-ink-dim">
            {date === today ? 'Fuel' : formatDayLabel(date)}
          </div>
        </button>
        <button className="px-3 py-2 text-[17px] font-bold text-ink-faint" onClick={() => setSelected(addDaysISO(date, 1))}>
          ›
        </button>
      </div>

      {/* Rings */}
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
            weeks. The plan says: add 150–200 kcal to training days. Recomp is slow — don't panic-cut.
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

      {/* One-tap meal templates — the user's own, editable */}
      <SectionTitle
        right={
          <div className="flex items-center gap-3">
            <button onClick={() => setGroceryOpen(true)} className="text-[11px] font-bold text-cyan underline">
              grocery
            </button>
            <button onClick={() => setMyMealsOpen(true)} className="text-[11px] font-bold text-accent underline">
              edit my meals
            </button>
          </div>
        }
      >
        {dayType === 'training' ? 'Training-day meals' : 'Rest-day meals'}
      </SectionTitle>
      <div className="overflow-hidden rounded-2xl border border-edge/80 bg-surface">
        {templates.map((t, i) => (
          <button
            key={t.id}
            onClick={() => addMealEntry(date, { label: `${t.slot}: ${t.name}`, proteinG: t.proteinG, kcal: t.kcal, source: 'mealTemplate' })}
            className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left active:bg-surface-2 ${
              i > 0 ? 'border-t border-edge/50' : ''
            }`}
          >
            <span className="min-w-0">
              <span className="block truncate text-[13.5px] font-extrabold">
                {t.slot} — {t.name}
              </span>
              {t.detail && <span className="mt-0.5 block text-[11px] leading-snug text-ink-faint">{t.detail}</span>}
            </span>
            <span className="shrink-0 text-right">
              <span className="block font-mono text-[12.5px] font-bold text-accent-soft">+{t.proteinG}g P</span>
              <span className="block font-mono text-[10.5px] text-ink-faint">~{t.kcal} kcal</span>
            </span>
          </button>
        ))}
        {templates.length === 0 && (
          <p className="px-4 py-4 text-center text-[12.5px] text-ink-faint">
            No meals for this day type yet — build yours with “edit my meals”.
          </p>
        )}
      </div>

      {/* Food library — search-first, big enough for anyone's diet */}
      <SectionTitle>Quick-add foods</SectionTitle>
      <input
        className="w-full rounded-xl border border-edge bg-surface-2 px-3.5 py-2.5 text-[13px] outline-none placeholder:text-ink-faint"
        placeholder={`Search ${FOODS.length} foods…`}
        value={foodQuery}
        onChange={(e) => setFoodQuery(e.target.value)}
      />
      {foodMatches ? (
        <div className="flex flex-wrap gap-1.5">
          {foodMatches.map((f) => (
            <button
              key={f.id}
              onClick={() => addMealEntry(date, { label: `${f.name} (${f.serving})`, proteinG: f.proteinG, kcal: f.kcal, source: 'chip', foodId: f.id })}
              className="rounded-xl border border-edge bg-surface-2 px-3 py-2 text-left active:border-accent/40"
            >
              <div className="text-[12px] font-bold leading-tight">{f.name}</div>
              <div className="text-[10px] font-semibold text-ink-faint">
                {f.serving} · {f.proteinG}g P · {f.kcal} kcal
              </div>
            </button>
          ))}
          {foodMatches.length === 0 && (
            <p className="w-full py-2 text-center text-[12px] text-ink-faint">
              Nothing matches — log it as a custom entry below.
            </p>
          )}
        </div>
      ) : (
        (['protein', 'carb', 'fat', 'snack'] as const).map((cat) => (
          <div key={cat} className="mb-1">
            <div className="mb-1 px-1 text-[10px] font-black uppercase tracking-wider text-ink-faint">
              {cat === 'protein' ? 'Proteins (the priority)' : cat === 'carb' ? 'Carbs' : cat === 'fat' ? 'Fats' : 'Snacks & veg'}
            </div>
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
              {FOODS.filter((f) => (cat === 'snack' ? f.category === 'snack' || f.category === 'veg' : f.category === cat)).map((f) => (
                <button
                  key={f.id}
                  onClick={() => addMealEntry(date, { label: `${f.name} (${f.serving})`, proteinG: f.proteinG, kcal: f.kcal, source: 'chip', foodId: f.id })}
                  className="shrink-0 rounded-xl border border-edge bg-surface-2 px-3 py-2 text-left active:border-accent/40"
                >
                  <div className="text-[12px] font-bold leading-tight">{f.name}</div>
                  <div className="text-[10px] font-semibold text-ink-faint">
                    {f.serving} · {f.proteinG}g P · {f.kcal} kcal
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      {recents.length > 0 && !foodMatches && (
        <>
          <div className="mb-1 px-1 text-[10px] font-black uppercase tracking-wider text-ink-faint">Your recents</div>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
            {recents.map((r) => (
              <button
                key={r.label}
                onClick={() => addMealEntry(date, { label: r.label, proteinG: r.proteinG, kcal: r.kcal, source: 'recent' })}
                className="shrink-0 rounded-xl border border-cyan/25 bg-cyan/5 px-3 py-2 text-left"
              >
                <div className="text-[12px] font-bold leading-tight text-cyan">{r.label}</div>
                <div className="text-[10px] font-semibold text-ink-faint">{r.proteinG}g P · {r.kcal} kcal</div>
              </button>
            ))}
          </div>
        </>
      )}

      <Btn kind="subtle" className="w-full" onClick={() => setCustomOpen(true)}>
        + Custom entry
      </Btn>

      {/* Logged entries */}
      <SectionTitle>Logged {day?.entries.length ? `(${day.entries.length})` : ''}</SectionTitle>
      <div className="overflow-hidden rounded-2xl border border-edge/80 bg-surface">
        {(day?.entries ?? []).map((e, i) => (
          <div
            key={e.id}
            className={`flex items-center justify-between gap-2 px-4 py-2.5 ${i > 0 ? 'border-t border-edge/50' : ''}`}
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-bold">{e.label}</div>
              <div className="text-[11px] font-semibold text-ink-faint">
                {Math.round(e.proteinG * e.servings)}g P · {Math.round(e.kcal * e.servings)} kcal
                {e.servings !== 1 && ` · ${e.servings}×`}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button className="h-8 w-8 rounded-lg bg-surface-2 text-sm font-bold text-ink-dim" onClick={() => setMealServings(date, e.id, e.servings - 0.5)}>−</button>
              <button className="h-8 w-8 rounded-lg bg-surface-2 text-sm font-bold text-ink-dim" onClick={() => setMealServings(date, e.id, e.servings + 0.5)}>+</button>
              <button className="h-8 w-8 rounded-lg text-sm font-bold text-danger" onClick={() => removeMealEntry(date, e.id)}>✕</button>
            </div>
          </div>
        ))}
        {!day?.entries.length && (
          <p className="px-4 py-4 text-center text-[12.5px] text-ink-faint">Nothing logged yet. Five taps covers the whole day.</p>
        )}
      </div>

      {/* Supplements — the user's stack */}
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
              className={`rounded-xl border p-3 text-left ${on ? 'border-lime/40 bg-lime/8' : 'border-edge bg-surface'}`}
            >
              <div className={`text-[12.5px] font-bold ${on ? 'text-lime' : 'text-ink'}`}>
                {on ? '✓ ' : ''}{s.name}
              </div>
              <div className="text-[10.5px] text-ink-faint">{s.dose} · {s.when}</div>
            </button>
          )
        })}
        {mealPlan.supplements.length === 0 && (
          <p className="col-span-2 py-2 text-center text-[12px] text-ink-faint">
            No stack — add what you actually take with “edit stack”.
          </p>
        )}
      </div>

      <div className="border-l-2 border-edge py-1 pl-3">
        <div className="text-[10.5px] font-black uppercase tracking-wider text-ink-faint">Late night?</div>
        <p className="mt-0.5 text-[11.5px] leading-snug text-ink-dim">
          <span className="font-bold text-lime">Yes:</span> {mealPlan.lateNight.yes.join(', ')} ·{' '}
          <span className="font-bold text-danger">No:</span> {mealPlan.lateNight.no.join(', ')}
        </p>
      </div>

      <CustomEntrySheet open={customOpen} onClose={() => setCustomOpen(false)} date={date} />
      <Sheet open={groceryOpen} onClose={() => setGroceryOpen(false)} title="Grocery list">
        <GroceryList />
      </Sheet>
      {myMealsOpen && <MyMealsSheet onClose={() => setMyMealsOpen(false)} />}
      {stackOpen && <SupplementStackSheet onClose={() => setStackOpen(false)} />}
    </div>
  )
}

/** Add / edit / delete the plan's one-tap meals — they're YOURS. */
function MyMealsSheet({ onClose }: { onClose: () => void }) {
  const templates = useAppStore((s) => s.data.plan.mealPlan.templates)
  const update = useAppStore((s) => s.update)
  const [editing, setEditing] = useState<MealTemplateDef | null>(null)

  function save(t: MealTemplateDef) {
    update((d) => {
      const list = d.plan.mealPlan.templates
      const at = list.findIndex((x) => x.id === t.id)
      if (at >= 0) list[at] = t
      else list.push(t)
    })
    setEditing(null)
  }

  function remove(id: string) {
    update((d) => {
      d.plan.mealPlan.templates = d.plan.mealPlan.templates.filter((x) => x.id !== id)
    })
    setEditing(null)
  }

  if (editing) {
    return (
      <MealForm
        value={editing}
        onSave={save}
        onDelete={templates.some((t) => t.id === editing.id) ? () => remove(editing.id) : undefined}
        onClose={() => setEditing(null)}
      />
    )
  }

  return (
    <Sheet open onClose={onClose} title="My meals">
      <div className="space-y-4 pb-6">
        <p className="text-[12px] leading-snug text-ink-faint">
          These are the one-tap meals on your Fuel screen — make them YOUR real food. Protein and
          calories are what count; the name is for you.
        </p>
        {(['training', 'rest'] as const).map((dt) => (
          <div key={dt}>
            <div className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-ink-faint">
              {dt === 'training' ? 'Training days' : 'Rest days'}
            </div>
            <div className="overflow-hidden rounded-2xl border border-edge/80 bg-surface">
              {templates.filter((t) => t.dayType === dt).map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => setEditing({ ...t })}
                  className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-left ${i > 0 ? 'border-t border-edge/50' : ''}`}
                >
                  <span className="min-w-0 truncate text-[13px] font-bold">
                    {t.slot} — {t.name}
                  </span>
                  <span className="shrink-0 font-mono text-[11.5px] text-ink-faint">
                    {t.proteinG}g · {t.kcal} kcal
                  </span>
                </button>
              ))}
              {templates.filter((t) => t.dayType === dt).length === 0 && (
                <p className="px-4 py-3 text-center text-[12px] text-ink-faint">None yet.</p>
              )}
            </div>
          </div>
        ))}
        <Btn
          className="w-full"
          onClick={() =>
            setEditing({ id: uid(), dayType: 'training', slot: 'Meal', name: '', detail: '', proteinG: 40, kcal: 500 })
          }
        >
          + New meal
        </Btn>
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
  const field = 'w-full rounded-xl border border-edge bg-surface-2 px-3.5 py-3 text-[14px] outline-none placeholder:text-ink-faint'
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
  const field = 'rounded-xl border border-edge bg-surface-2 px-3 py-2.5 text-[13px] outline-none placeholder:text-ink-faint'

  function add(s: SupplementDef) {
    update((d) => {
      if (!d.plan.mealPlan.supplements.some((x) => x.id === s.id)) d.plan.mealPlan.supplements.push(s)
    })
  }

  return (
    <Sheet open onClose={onClose} title="My supplement stack">
      <div className="space-y-4 pb-6">
        <div className="overflow-hidden rounded-2xl border border-edge/80 bg-surface">
          {stack.map((s, i) => (
            <div key={s.id} className={`flex items-center justify-between gap-2 px-4 py-3 ${i > 0 ? 'border-t border-edge/50' : ''}`}>
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
            add({ id: uid(), name: name.trim(), dose: dose.trim() || '—', when: when.trim() || 'Daily' })
            setName(''); setDose(''); setWhen('')
          }}
        >
          Add to stack
        </Btn>
      </div>
    </Sheet>
  )
}

function CustomEntrySheet({ open, onClose, date }: { open: boolean; onClose: () => void; date: string }) {
  const [name, setName] = useState('')
  const [protein, setProtein] = useState('')
  const [kcal, setKcal] = useState('')
  return (
    <Sheet open={open} onClose={onClose} title="Custom entry">
      <div className="space-y-3 pb-6">
        <input
          className="w-full rounded-xl border border-edge bg-surface-2 px-3.5 py-3 text-[14px] outline-none placeholder:text-ink-faint"
          placeholder="What was it?"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex gap-2">
          <input
            inputMode="numeric"
            className="flex-1 rounded-xl border border-edge bg-surface-2 px-3.5 py-3 text-[14px] outline-none placeholder:text-ink-faint"
            placeholder="Protein (g)"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
          />
          <input
            inputMode="numeric"
            className="flex-1 rounded-xl border border-edge bg-surface-2 px-3.5 py-3 text-[14px] outline-none placeholder:text-ink-faint"
            placeholder="Calories"
            value={kcal}
            onChange={(e) => setKcal(e.target.value)}
          />
        </div>
        <Btn
          className="w-full"
          disabled={!name || !protein}
          onClick={() => {
            addMealEntry(date, {
              label: name,
              proteinG: parseFloat(protein) || 0,
              kcal: parseFloat(kcal) || 0,
              source: 'custom',
            })
            setName('')
            setProtein('')
            setKcal('')
            onClose()
          }}
        >
          Log it
        </Btn>
        <p className="text-[11px] text-ink-faint">Saved to your recents for one-tap next time.</p>
      </div>
    </Sheet>
  )
}

/** The grocery list is plan data too — check off, add, remove. */
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
        <p className="text-[11.5px] text-ink-faint">Your list — from your meal plan, yours to change.</p>
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
                      checked[item] ? 'border-lime/50 bg-lime text-black' : 'border-edge bg-surface-2'
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
                  className="flex-1 rounded-lg border border-edge bg-surface-2 px-2.5 py-1.5 text-[12.5px] outline-none placeholder:text-ink-faint"
                  placeholder={`Add to ${g.category.toLowerCase()}…`}
                  value={drafts[g.category] ?? ''}
                  onChange={(e) => setDrafts((p) => ({ ...p, [g.category]: e.target.value }))}
                />
                <button
                  className="rounded-lg bg-surface-2 px-3 text-[12px] font-bold text-ink-dim"
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
