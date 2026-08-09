import { useMemo, useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { addDaysISO, formatDayLabel } from '../../engine/calendar'
import { useToday } from '../../logic/clock'
import { kcalTargetFor, nutritionDayType } from '../../engine/resolveDay'
import { kcalBumpSuggestion, kcalFor, proteinFor, proteinStreak } from '../../engine/stats'
import { FOODS, GROCERY_LIST, LATE_NIGHT, MEAL_TEMPLATES, SUPPLEMENTS } from '../../plan/foods'
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

  const day = data.meals[date]
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

  const templates = MEAL_TEMPLATES.filter((m) => m.dayType === dayType)

  return (
    <div className="space-y-3 pb-6">
      <div className="flex items-center justify-between">
        <button className="rounded-xl bg-surface-2 px-3 py-2 text-sm font-bold text-ink-dim" onClick={() => setSelected(addDaysISO(date, -1))}>
          ‹
        </button>
        <button onClick={() => setSelected(null)} className="text-center">
          <div className="text-[17px] font-black tracking-tight">{date === today ? "Today's fuel" : formatDayLabel(date)}</div>
        </button>
        <button className="rounded-xl bg-surface-2 px-3 py-2 text-sm font-bold text-ink-dim" onClick={() => setSelected(addDaysISO(date, 1))}>
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
          {dayType === 'training' ? '🔥 Training day' : '🌙 Rest day'} · {kcalTarget} kcal
          {day?.dayTypeOverride ? ' (manual)' : ''}
        </Chip>
        <Chip tone="lime">protein never drops: {data.settings.proteinTargetG} g</Chip>
        {pStreak >= 2 && <Chip tone="gold">🔥 {pStreak}-day protein streak</Chip>}
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

      {/* Meal template chips — the primary path */}
      <SectionTitle right={<button onClick={() => setGroceryOpen(true)} className="text-[11px] font-bold text-cyan underline">grocery list</button>}>
        {dayType === 'training' ? 'Training-day meals' : 'Rest-day meals'} — one tap logs the whole meal
      </SectionTitle>
      <div className="grid grid-cols-1 gap-2">
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => addMealEntry(date, { label: `${t.slot}: ${t.name}`, proteinG: t.proteinG, kcal: t.kcal, source: 'mealTemplate' })}
            className="rounded-2xl border border-edge bg-surface p-3.5 text-left active:border-accent/40 active:bg-accent/5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13.5px] font-extrabold">{t.slot} — {t.name}</span>
              <span className="shrink-0 whitespace-nowrap font-mono text-[12px] font-bold text-accent-soft">+{t.proteinG}g P</span>
            </div>
            <div className="mt-0.5 flex items-center justify-between">
              <span className="pr-2 text-[11px] leading-snug text-ink-faint">{t.detail}</span>
              <span className="shrink-0 font-mono text-[11px] text-ink-faint">~{t.kcal} kcal</span>
            </div>
          </button>
        ))}
      </div>

      {/* Food chips */}
      <SectionTitle>Quick-add foods</SectionTitle>
      {(['protein', 'carb', 'fat', 'snack'] as const).map((cat) => (
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
      ))}

      {recents.length > 0 && (
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
      <div className="space-y-1.5">
        {(day?.entries ?? []).map((e) => (
          <div key={e.id} className="flex items-center justify-between gap-2 rounded-xl border border-edge bg-surface px-3.5 py-2.5">
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
              <button className="h-8 w-8 rounded-lg bg-danger/10 text-sm font-bold text-danger" onClick={() => removeMealEntry(date, e.id)}>✕</button>
            </div>
          </div>
        ))}
        {!day?.entries.length && (
          <p className="py-3 text-center text-[12.5px] text-ink-faint">Nothing logged yet. Five taps covers the whole day.</p>
        )}
      </div>

      {/* Supplements */}
      <SectionTitle>Supplements</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {SUPPLEMENTS.map((s) => {
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
      </div>

      <Card className="!py-3">
        <div className="text-[11px] font-black uppercase tracking-wider text-ink-faint">Late night?</div>
        <p className="mt-1 text-[11.5px] leading-snug text-ink-dim">
          <span className="font-bold text-lime">Yes:</span> {LATE_NIGHT.yes.join(', ')} ·{' '}
          <span className="font-bold text-danger">No:</span> {LATE_NIGHT.no.join(', ')}
        </p>
      </Card>

      {/* Custom entry sheet */}
      <CustomEntrySheet open={customOpen} onClose={() => setCustomOpen(false)} date={date} />

      {/* Grocery sheet */}
      <Sheet open={groceryOpen} onClose={() => setGroceryOpen(false)} title="Weekly grocery list">
        <GroceryList />
      </Sheet>
    </div>
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

function GroceryList() {
  // Checks live in AppData (schema v4) so they survive backups + sync.
  const grocery = useAppStore((s) => s.data.grocery)
  const update = useAppStore((s) => s.update)
  const checked: Record<string, boolean> = Object.fromEntries(grocery.map((g) => [g, true]))
  function toggle(item: string) {
    update((d) => {
      d.grocery = d.grocery.includes(item) ? d.grocery.filter((x) => x !== item) : [...d.grocery, item]
    })
  }
  return (
    <div className="space-y-4 pb-6">
      {GROCERY_LIST.map((g) => (
        <div key={g.category}>
          <div className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-accent">{g.category}</div>
          <div className="space-y-1">
            {g.items.map((item) => (
              <button
                key={item}
                onClick={() => toggle(item)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] ${
                  checked[item] ? 'text-ink-faint line-through' : 'text-ink'
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-md border text-[11px] font-black ${
                    checked[item] ? 'border-lime/50 bg-lime text-black' : 'border-edge bg-surface-2'
                  }`}
                >
                  {checked[item] ? '✓' : ''}
                </span>
                {item}
              </button>
            ))}
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
