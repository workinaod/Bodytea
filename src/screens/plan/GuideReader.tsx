import { useMemo, useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { EXERCISES } from '../../plan/exercises'
import { GUIDE_SECTIONS } from '../../plan/guide'
import { planBrief } from '../../engine/workoutBrief'
import { Chip } from '../../components/ui'

// ============================================================
// The Plan, read back to you.
//
// Your week day by day, how it progresses, and every movement
// with its guide. It lived on the Coach tab, two taps away from
// the week it describes; it belongs next to that week.
//
// Two voices in here on purpose: `planBrief` describes YOUR
// booklet from the booklet itself, and GUIDE_SECTIONS is the
// owner's original NAOD prose, shown only to accounts actually
// running that preset. Printing somebody else's programming
// notes over a generated plan would be the app quoting a book
// the reader is not in.
// ============================================================

export function GuideReader({ onOpenExercise }: { onOpenExercise: (id: string) => void }) {
  const [open, setOpen] = useState<string | null>(null)
  const [libOpen, setLibOpen] = useState(false)
  const groups = useMemo(() => {
    const byKind: Record<string, { id: string; name: string }[]> = {}
    for (const e of Object.values(EXERCISES)) {
      const k =
        e.kind === 'sprint' || e.kind === 'jump'
          ? 'Speed & jumps'
          : e.kind === 'lift' || e.kind === 'carry' || e.kind === 'core'
            ? 'Lifts & strength'
            : e.kind === 'mobility'
              ? 'Mobility'
              : 'Conditioning'
      ;(byKind[k] ??= []).push({ id: e.id, name: e.name })
    }
    return byKind
  }, [])

  // The booklet the athlete actually trains on, described from itself.
  // GUIDE_SECTIONS below is the OWNER's NAOD prose: real, but about
  // dunking and DJ Fridays, so it only shows to the plan it was written
  // for. Everyone else was reading somebody else's booklet.
  const data = useAppStore((st) => st.data)
  const bp = useMemo(() => planBrief(data), [data])
  const ownerPlan = data.plan.sportMode === 'ball'

  return (
    <div className="space-y-2 pb-6">
      <div className="rounded-2xl border-2 border-accent-deep bg-surface px-4 py-3.5 shadow-[0_3px_0_var(--lip-accent)]">
        <div className="text-[13.5px] font-extrabold">{bp.name}</div>
        <p className="mt-0.5 text-[12px] leading-snug text-ink-dim">{bp.headline}</p>
        {bp.goalStatement && (
          <p className="mt-1.5 text-[12px] leading-snug text-accent-soft">
            Your words: {bp.goalStatement}
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border-2 border-edge bg-surface shadow-[0_3px_0_var(--color-edge)]">
        <button
          className="flex w-full items-center justify-between px-4 py-3 text-left"
          onClick={() => setOpen(open === 'your-week' ? null : 'your-week')}
        >
          <span className="text-[13.5px] font-extrabold">Your week, day by day</span>
          <span className="text-ink-faint">{open === 'your-week' ? '▾' : '▸'}</span>
        </button>
        {open === 'your-week' && (
          <div className="space-y-2.5 border-t-2 border-edge-soft px-4 py-3">
            {bp.week.map((d) => (
              <div key={d.weekday} className="flex gap-3">
                <span className="w-[74px] shrink-0 text-[11px] font-black uppercase tracking-wide text-ink-faint">
                  {d.weekday.slice(0, 3)}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold">{d.title}</span>
                  <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-faint">{d.tagline}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border-2 border-edge bg-surface shadow-[0_3px_0_var(--color-edge)]">
        <button
          className="flex w-full items-center justify-between px-4 py-3 text-left"
          onClick={() => setOpen(open === 'your-rules' ? null : 'your-rules')}
        >
          <span className="text-[13.5px] font-extrabold">How it progresses</span>
          <span className="text-ink-faint">{open === 'your-rules' ? '▾' : '▸'}</span>
        </button>
        {open === 'your-rules' && (
          <div className="space-y-3 border-t-2 border-edge-soft px-4 py-3">
            {bp.rules.map((r) => (
              <div key={r.title}>
                <div className="text-[12.5px] font-extrabold text-accent-soft">{r.title}</div>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-dim">{r.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {ownerPlan && GUIDE_SECTIONS.map((s) => (
        <div key={s.id} className="overflow-hidden rounded-2xl border-2 border-edge bg-surface shadow-[0_3px_0_var(--color-edge)]">
          <button
            className="flex w-full items-center justify-between px-4 py-3 text-left"
            onClick={() => setOpen(open === s.id ? null : s.id)}
          >
            <span className="text-[13.5px] font-extrabold">{s.title}</span>
            <span className="text-ink-faint">{open === s.id ? '▾' : '▸'}</span>
          </button>
          {open === s.id && (
            <div className="space-y-2.5 border-t-2 border-edge-soft px-4 py-3">
              {s.paragraphs.map((p, i) => (
                <p key={i} className="text-[13px] leading-relaxed text-ink-dim">{p}</p>
              ))}
              {s.bullets && (
                <ul className="space-y-1.5">
                  {s.bullets.map((b, i) => (
                    <li key={i} className="flex gap-2 text-[13px] leading-snug text-ink-dim">
                      <span className="text-accent">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      ))}

      <div className="overflow-hidden rounded-2xl border-2 border-[var(--lip-ice)] bg-surface shadow-[0_3px_0_var(--lip-ice)]">
        <button
          className="flex w-full items-center justify-between px-4 py-3 text-left"
          onClick={() => setLibOpen(!libOpen)}
        >
          <span className="text-[13.5px] font-extrabold text-cyan">Exercise library, every guide</span>
          <span className="text-ink-faint">{libOpen ? '▾' : '▸'}</span>
        </button>
        {libOpen && (
          <div className="space-y-3 border-t-2 border-edge-soft px-4 py-3">
            {Object.entries(groups).map(([group, list]) => (
              <div key={group}>
                <div className="mb-1 text-[10.5px] font-black uppercase tracking-wider text-ink-faint">{group}</div>
                <div className="flex flex-wrap gap-1.5">
                  {list.map((e) => (
                    <Chip key={e.id} onClick={() => onOpenExercise(e.id)}>{e.name}</Chip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
