import { useMemo } from 'react'
import type { EquipTag, ISODate } from '../../types'
import { useAppStore } from '../../store/appStore'
import { resolveDay } from '../../engine/resolveDay'
import { planAdjustments, readSignals } from '../../engine/adapt'
import { acceptAdaptation, undoAdaptation } from '../../logic/fatigueActions'

/**
 * What the coach has noticed, and what it is offering to do about it.
 *
 * The headline used to read "Hold the weights today", which everybody
 * parses as "hold OFF on the weights today" — skip the session. It never
 * meant that: it cancels the progression step and nothing else, so the
 * session runs in full at last week's weight. A title that can be read
 * as "take a day off" on a card the athlete taps in two seconds is a
 * title that WILL be read that way.
 *
 * OFFERING. engine/adapt.ts already applies the changes that are not a
 * choice — a movement whose equipment is missing, one loading a joint
 * flagged twice — and those arrive as banners above. Everything here is
 * an inference drawn from the athlete's week rather than something they
 * told us, and an inference does not get to quietly resize their session.
 * They tap, or they do not.
 *
 * A declined proposal leaves no trace. The offer is re-derived from the
 * signals each time the day resolves, so ignoring one costs nothing and
 * changes nothing about next week.
 */
export function AdaptProposals({ date }: { date: ISODate }) {
  const data = useAppStore((s) => s.data)
  const session = data.sessions[date]
  const taken = data.adapt[date] ?? []

  const proposals = useMemo(() => {
    const resolved = resolveDay(date, data)
    if (resolved.kind !== 'session') return []
    return planAdjustments(resolved.exercises, {
      owned: new Set<EquipTag>(['none', ...data.plan.equipment]),
      signals: readSignals(data, date),
    }).filter((a) => !a.automatic)
  }, [data, date])

  // Nothing to offer, or the day is already under way: a session in
  // progress is not the moment to renegotiate its size.
  if (proposals.length === 0 || (session?.startedAt && !session.endedAt)) return null

  // reduce-load is the one proposal with no switch behind it. "Take a
  // third off the pressing" is not a shape the plan can hold — there is
  // no per-movement load override — so it renders as something the coach
  // SAYS rather than something the athlete taps. Giving it the same
  // button as the others would be worse than useless: the accept path
  // writes reduce-volume, so tapping a card that reads "go lighter"
  // would cut a set off every lift in the session instead.
  const offers = proposals.filter((p) => p.kind !== 'reduce-load')
  const notices = proposals.filter((p) => p.kind === 'reduce-load')

  return (
    <div className="space-y-2">
      {notices.map((p) => (
        <div key={p.exerciseId ?? p.kind} className="rounded-2xl bg-gold/[0.07] px-4 py-3 ring-1 ring-gold/25">
          <p className="text-[12.5px] font-black tracking-tight text-ink">Go lighter here, don't drop it</p>
          <p className="mt-1 text-[11.5px] leading-snug text-ink-dim">{p.because}</p>
        </div>
      ))}
      {offers.map((p) => {
        const choice = p.kind === 'hold-load' ? 'hold-load' : 'reduce-volume'
        const accepted = taken.includes(choice)
        return (
          <div
            key={p.kind}
            className={`rounded-2xl px-4 py-3 ring-1 ${
              accepted ? 'bg-lime/10 ring-lime/30' : 'bg-white/[0.05] ring-white/[0.08]'
            }`}
          >
            <p className="text-[12.5px] font-black tracking-tight text-ink">
              {accepted ? '✓ ' : ''}
              {p.kind === 'hold-load' ? 'Same weight as last time' : 'A set off each lift'}
            </p>
            <p className="mt-1 text-[11.5px] leading-snug text-ink-dim">{p.because}</p>
            <button
              onClick={() =>
                accepted ? undoAdaptation(date, choice) : acceptAdaptation(date, choice)
              }
              className={`press mt-2 rounded-full px-3.5 py-2 text-[12px] font-bold ${
                accepted ? 'bg-white/[0.07] text-ink-dim' : 'bg-accent text-black'
              }`}
            >
              {accepted ? 'Never mind, run it as planned' : 'Do that'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
