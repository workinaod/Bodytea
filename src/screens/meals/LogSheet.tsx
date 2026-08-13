import { useMemo, useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { FOODS } from '../../plan/foods'
import { Btn } from '../../components/ui'
import { Sheet } from '../../components/Sheet'
import { addMealEntry, loggableTemplates } from '../../logic/actions'

// ============================================================
// Log sheet, every way food gets logged, one place:
// plan meals (one tap), recents, food search, custom numbers.
// ============================================================

export function LogSheet({ date, dayType, onClose }: { date: string; dayType: 'training' | 'rest'; onClose: () => void }) {
  const data = useAppStore((s) => s.data)
  const [foodQuery, setFoodQuery] = useState('')
  const [added, setAdded] = useState(0)
  const [name, setName] = useState('')
  const [protein, setProtein] = useState('')
  const [kcal, setKcal] = useState('')

  const { list: templates, borrowed } = loggableTemplates(data.plan.mealPlan.templates, dayType)

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
              {borrowed ? `From my ${dayType === 'training' ? 'rest' : 'training'}-day plan` : 'From my plan, one tap'}
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
