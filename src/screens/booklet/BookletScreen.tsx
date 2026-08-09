import { useState } from 'react'
import type { PlanConfig } from '../../types'
import { useAppStore, uid } from '../../store/appStore'
import { analyzeRoutine } from '../../plan/analyze'
import { normalizeBooklet, validateBooklet } from '../../plan/bookletOps'
import { BookletEditor } from './BookletEditor'

// ============================================================
// "My booklet": full-screen fine-tune editor over the live plan.
// Save = validate → normalize → write plan + refresh coach notes.
// ============================================================

export function BookletScreen({ onClose }: { onClose: () => void }) {
  const plan = useAppStore((s) => s.data.plan)
  const update = useAppStore((s) => s.update)
  const [draft, setDraft] = useState<PlanConfig>(() => structuredClone(plan))
  const [problems, setProblems] = useState<string[]>([])

  const save = () => {
    const errs = validateBooklet(draft)
    if (errs.length) {
      setProblems(errs)
      return
    }
    const normalized = normalizeBooklet(draft)
    const notes = analyzeRoutine(normalized).filter((n) => n.tone !== 'info').slice(0, 3)
    update((d) => {
      d.plan = normalized
      const at = new Date().toISOString()
      for (const n of notes) {
        d.coach.feed.unshift({ id: uid(), at, kind: 'insight', text: `📓 Booklet check: ${n.text}` })
      }
      d.coach.feed = d.coach.feed.slice(0, 200)
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-bg">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col overflow-hidden px-4 pt-[max(env(safe-area-inset-top),16px)]">
        <div className="flex items-center justify-between pb-3">
          <button onClick={onClose} className="rounded-full bg-surface-2 px-3.5 py-1.5 text-[12px] font-bold text-ink-dim">
            Cancel
          </button>
          <h2 className="text-[16px] font-black tracking-tight">My Booklet</h2>
          <button onClick={save} className="rounded-full bg-accent px-4 py-1.5 text-[12px] font-black text-black">
            Save
          </button>
        </div>
        {problems.length > 0 && (
          <div className="mb-3 rounded-xl border border-danger/40 bg-danger/10 px-3.5 py-2.5">
            {problems.map((p) => (
              <div key={p} className="text-[12px] font-semibold text-danger">• {p}</div>
            ))}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto pb-10">
          <BookletEditor draft={draft} onDraft={(d) => { setDraft(d); setProblems([]) }} />
          <p className="mt-4 text-[11px] leading-relaxed text-ink-faint">
            Block rotation, deload weeks, A/B alternation, and busy-week tiers stay automatic — they rebuild themselves
            around whatever you change here.
          </p>
        </div>
      </div>
    </div>
  )
}
