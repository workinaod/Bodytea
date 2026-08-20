import { useMemo, useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { useToday } from '../../logic/clock'
import { daysBetween } from '../../engine/calendar'
import { fuelVideosFor, MOTIVATION_QUOTES } from '../../plan/messages'
import { Btn, Chip, SectionTitle, Tile } from '../../components/ui'
import { Sheet } from '../../components/Sheet'
import { coachLineFor } from '../../logic/actions'

// ============================================================
// The Sergeant, where the decision is.
//
// He used to have a whole tab, which meant the daily quote and
// the "push me" button lived one destination away from the only
// moment they matter: standing on Today, deciding whether to
// train. Coaching is not a place you visit. It is a line that
// appears next to a choice.
//
// The quote rotates by date, so it is the same line all day and
// a new one tomorrow. The push sheet is unchanged, word for
// word: Sergeant copy needs owner approval and none of it is
// being rewritten here.
// ============================================================

export function TodayCoachLine() {
  const data = useAppStore((s) => s.data)
  const today = useToday()
  const [open, setOpen] = useState(false)
  const [line, setLine] = useState('')

  const quote = useMemo(
    () => MOTIVATION_QUOTES[daysBetween('2026-01-01', today) % MOTIVATION_QUOTES.length],
    [today],
  )

  return (
    <>
      <Tile className="!py-3">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold italic leading-snug">“{quote.text}”</p>
            <div className="eyebrow mt-0.5 text-[9px] text-ink-faint">
              {quote.source ?? 'The Sergeant'} · daily
            </div>
          </div>
          <Chip
            tone="accent"
            onClick={() => {
              // A pep talk on demand, spoken, not written into the Record
              setLine(coachLineFor('push', { goal: data.plan.goalStatement || 'getting better than yesterday' }))
              setOpen(true)
            }}
          >
            Push me
          </Chip>
        </div>
      </Tile>

      <Sheet open={open} onClose={() => setOpen(false)} title="Alright. Listen.">
        <div className="space-y-3 pb-6">
          <div className="rounded-2xl border-2 border-accent-deep bg-surface px-5 pb-5 pt-6 shadow-[0_3px_0_var(--lip-accent)]">
            <div className="eyebrow text-accent-soft">The Sergeant · read it twice</div>
            <p className="headline mt-3 text-[24px] leading-[1.18]">{line}</p>
            {data.plan.goalStatement && (
              <div className="mt-4 border-l-2 border-accent-deep pl-3">
                <div className="eyebrow text-[9.5px] text-ink-faint">
                  What this is all for, in your words
                </div>
                <div className="mt-0.5 text-[13.5px] font-bold italic text-accent-soft">
                  “{data.plan.goalStatement}”
                </div>
              </div>
            )}
          </div>
          <SectionTitle>Fuel (videos)</SectionTitle>
          <div className="space-y-2">
            {fuelVideosFor(data.plan.copyFlavor).map((v) => (
              <a
                key={v.title}
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(v.query)}`}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl border-2 border-edge bg-surface px-3.5 py-3"
              >
                <div className="text-[13px] font-bold text-ink">▶ {v.title}</div>
                <div className="text-[11px] text-ink-faint">{v.note}</div>
              </a>
            ))}
          </div>
          <Btn kind="lime" className="w-full py-4 text-[15px]" onClick={() => setOpen(false)}>
            Fine. I'm going.
          </Btn>
        </div>
      </Sheet>
    </>
  )
}
