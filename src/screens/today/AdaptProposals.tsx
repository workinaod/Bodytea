import { useEffect, useMemo } from 'react'
import type { ISODate } from '../../types'
import { useAppStore } from '../../store/appStore'
import { resolveDay } from '../../engine/resolveDay'
import { adaptContext, planAdjustments } from '../../engine/adapt'
import { acceptAdaptation, undoAdaptation } from '../../logic/fatigueActions'
import { useAppStore as useStore } from '../../store/appStore'
import { dueForVerdict, freshVerdict, settleDue, verdictCopy } from '../../engine/outcomes'
import { ADAPT_TYPE, DELOAD_TYPE } from '../../engine/proposals'
import { settleDeloads } from '../../engine/deloadOutcome'
import { limitStepCopy, limitStepDecision, limitStepOffer } from '../../engine/limitLoad'
import { MOVEMENT } from '../../plan/movement'
import { earlyFlagCopy, earlyFlagOffer, readinessDecision } from '../../engine/readiness'
import { appendDecision } from '../../engine/decisions'

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

  // An accepted adaptation gets its answer here, on the screen where it
  // was taken. Judging is global but a verdict about the size of a
  // session has no business on the food screen.
  const update = useStore((st) => st.update)
  const dueCount = useMemo(() => dueForVerdict(data, date).length, [data, date])
  // Deloads are judged here too. Nobody accepts one, so there is no
  // moment to hang the work off except the screen that shows what the
  // coach noticed.
  const deloadsDue = useMemo(() => {
    const probe = { ...data, decisions: [...(data.decisions ?? [])] }
    return settleDeloads(probe, date)
  }, [data, date])
  useEffect(() => {
    if (dueCount > 0 || deloadsDue > 0) {
      update((d) => { settleDue(d, date); settleDeloads(d, date) })
    }
  }, [dueCount, deloadsDue, date, update])
  const verdict = useMemo(() => freshVerdict(data, date, [ADAPT_TYPE, DELOAD_TYPE]), [data, date])

  // Weight back on a joint the athlete told us about, once it has been
  // quiet long enough to have earned it. Its own card rather than a
  // planAdjustment, because it is not about today's session: it is a
  // standing reduction being partly lifted.
  const limit = useMemo(() => {
    const resolved = resolveDay(date, data)
    if (resolved.kind !== 'session') return null
    // Only the movements the limitation is actually HOLDING DOWN today,
    // which is the lightMode ones. Reading every exercise's stress meant
    // offering weight back on a joint whose movements had all been
    // swapped away, so there was nothing on screen for the answer to
    // change. Caught by seeding every card at once.
    const joints = new Set(
      resolved.exercises.filter((e) => e.lightMode).flatMap((e) => MOVEMENT[e.exerciseId]?.stress ?? []),
    )
    return limitStepOffer(data, date, joints)
  }, [data, date])

  // The readiness flags themselves, once enough dialled-back days have
  // turned out fine. Pattern-level and offered only: turning down the
  // weight the app gives somebody's own answers is not its call.
  const earlyRaw = useMemo(() => earlyFlagOffer(data, date), [data, date])
  // ONE offer at a time. The Meals screen learned this in the J7 review
  // and this screen had not: seeding every card at once put a verdict,
  // two offers and a proposal on top of two banners, which is a wall of
  // apology rather than a coach. Load back outranks the readiness
  // question because it is about today's bar; the flags are a standing
  // preference and will keep.
  const early = limit ? null : earlyRaw

  const proposals = useMemo(() => {
    const resolved = resolveDay(date, data)
    if (resolved.kind !== 'session') return []
    return planAdjustments(resolved.exercises, adaptContext(data, date, data.plan.equipment)).filter(
      (a) => !a.automatic,
    )
  }, [data, date])

  // Nothing to offer, the day is already under way (a session in progress
  // is not the moment to renegotiate its size), or the athlete waved the
  // whole thing away. Ignoring an offer was always free, but free is not
  // the same as gone: a card that cannot be closed sits on the screen all
  // day arguing with a decision already made.
  const waved = taken.includes('dismissed')
  const verdictLine = verdict ? verdictCopy(verdict) : null
  // A follow-up on something already taken outlives the offers: it is the
  // answer to a question the athlete asked a fortnight ago. It is also
  // NOT an offer, so it renders outside the block the dismiss button
  // owns. Reading these two as one card is what broke the ✕ for the week
  // after every verdict: the guard said "waved AND no follow-up", so a
  // follow-up on screen meant waving the offers away did nothing.
  const offering = !waved && proposals.length > 0 && !(session?.startedAt && !session.endedAt)
  if (!offering && !verdictLine && !limit && !early) return null

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
      {verdictLine && (
        <div className="rounded-2xl bg-white/[0.05] px-4 py-3 ring-1 ring-white/[0.08]">
          <p className="text-[12.5px] font-black tracking-tight text-ink">
            {verdict!.verdict === 'worked' ? 'That worked' : 'Following up'}
          </p>
          <p className="mt-1 text-[11.5px] leading-snug text-ink-dim">{verdictLine}</p>
        </div>
      )}
      {limit && (
        <div className="rounded-2xl bg-lime/[0.07] px-4 py-3 ring-1 ring-lime/25">
          <p className="text-[12.5px] font-black tracking-tight text-ink">Some weight back?</p>
          <p className="mt-1 text-[11.5px] leading-snug text-ink-dim">{limitStepCopy(limit)}</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() =>
                update((d) => appendDecision(d, limitStepDecision(limit, 'accepted', date, d.decisions.length)))
              }
              className="press rounded-full bg-accent px-3.5 py-2 text-[12px] font-bold text-black"
            >
              Give it a go
            </button>
            <button
              onClick={() =>
                update((d) => appendDecision(d, limitStepDecision(limit, 'declined', date, d.decisions.length)))
              }
              className="press rounded-full bg-white/[0.07] px-3.5 py-2 text-[12px] font-bold text-ink-dim"
            >
              Not yet
            </button>
          </div>
        </div>
      )}
      {early && (
        <div className="rounded-2xl bg-white/[0.05] px-4 py-3 ring-1 ring-white/[0.08]">
          <p className="text-[12.5px] font-black tracking-tight text-ink">Are these flags early?</p>
          <p className="mt-1 text-[11.5px] leading-snug text-ink-dim">{earlyFlagCopy(early)}</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() =>
                update((d) => appendDecision(d, readinessDecision(early, 'accepted', date, d.decisions.length)))
              }
              className="press rounded-full bg-accent px-3.5 py-2 text-[12px] font-bold text-black"
            >
              Only when it is bad
            </button>
            <button
              onClick={() =>
                update((d) => appendDecision(d, readinessDecision(early, 'declined', date, d.decisions.length)))
              }
              className="press rounded-full bg-white/[0.07] px-3.5 py-2 text-[12px] font-bold text-ink-dim"
            >
              Leave it
            </button>
          </div>
        </div>
      )}
      {offering && (
        <div className="relative space-y-2">
          <button
            aria-label="Dismiss what the coach noticed"
            onClick={() => acceptAdaptation(date, 'dismissed')}
            className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full text-[15px] font-bold text-ink-faint active:bg-white/[0.09] active:text-ink"
          >
            ✕
          </button>
          {notices.map((p) => (
            <div key={p.exerciseId ?? p.kind} className="rounded-2xl bg-gold/[0.07] px-4 py-3 ring-1 ring-gold/25">
              <p className="pr-7 text-[12.5px] font-black tracking-tight text-ink">Go lighter here, don't drop it</p>
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
                <p className="pr-7 text-[12.5px] font-black tracking-tight text-ink">
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
      )}
    </div>
  )
}
