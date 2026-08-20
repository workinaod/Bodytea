import { useState } from 'react'
import { useAppStore } from '../../store/appStore'

/** The grocery list is plan data too, check off, add, remove. */
export function GroceryList() {
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
                  className="flex-1 rounded-lg bg-surface-2 px-2.5 py-1.5 text-[12.5px] outline-none placeholder:text-ink-faint"
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
