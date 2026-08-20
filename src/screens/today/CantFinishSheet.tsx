import { useState } from 'react'
import type { FatigueReason, SessionLog } from '../../types'
import { Sheet } from '../../components/Sheet'
import { Btn } from '../../components/ui'
import { dropTo, endsTheExercise, sameGroupAhead } from '../../engine/fatigue'
import { getExercise } from '../../plan/exercises'
import { setWeightForward } from '../../logic/actions'
import { easeRemaining } from '../../logic/volumeActions'
import { endExercise, endGroupAhead, logFatigue } from '../../logic/fatigueActions'

// ============================================================
// "Can't finish" asks why, then offers a way through.
//
// It used to open the whole-day skip flow, which is a different
// problem: this button means the WORK is too hard, not that the
// day has to be abandoned. And it asked nothing, so every reason
// a set dies got the same response, which is no response.
//
// Four answers because they want four different things, named as
// plainly as they can be, over one box you never have to use.
// Nothing here happens without a tap: the sheet offers, the
// athlete chooses.
//
// Built from the kit rather than from raw boxes. Translucent
// glass and a hairline ring, never an opaque grey with a border,
// which is the look Button.tsx calls cheap and is right about.
// ============================================================

// Ids are the stored values and never change: they are what the engine
// reads and what is already on disk. Labels are free to say it better.
const REASONS: { id: FatigueReason; emoji: string; label: string; sub: string }[] = [
  { id: 'fried', emoji: '🔥', label: 'Muscle fatigue', sub: 'This muscle is done. Nothing clean left.' },
  { id: 'form', emoji: '📉', label: 'Form', sub: 'Could grind it out. It would be ugly.' },
  { id: 'pain', emoji: '🩹', label: 'Hurts', sub: 'Sharp or wrong, not the normal burn.' },
  { id: 'empty', emoji: '🪫', label: 'No energy', sub: 'Whole body, not one muscle.' },
]

/** A thing the athlete can tap. `tone` decides how loudly it is offered. */
interface Offer {
  id: string
  label: string
  sub?: string
  /** 'lead' is the recommendation, 'stop' is a lead that ends something. */
  tone?: 'lead' | 'stop'
  run: () => void
}

/**
 * The three offers, as flat tiles.
 *
 * These were the last translucent gradients in the app: two ring-1 glass
 * panels with an inset highlight, which is the exact look
 * research/OP12-visual-law.md replaced. A row you can tap gets an edge
 * and a lip, not a sheen.
 */
const QUIET = 'border-2 border-edge bg-surface shadow-[0_3px_0_var(--color-edge)]'

const OFFER_TONE: Record<'lead' | 'stop' | 'quiet', string> = {
  lead: 'border-2 border-accent-deep bg-surface shadow-[0_3px_0_var(--lip-accent)]',
  stop: 'border-2 border-danger/60 bg-surface shadow-[0_3px_0_var(--lip-danger)]',
  quiet: QUIET,
}

const OFFER_TEXT: Record<'lead' | 'stop' | 'quiet', string> = {
  lead: 'text-accent-soft',
  stop: 'text-danger',
  quiet: 'text-ink',
}

export function CantFinishSheet({
  open,
  onClose,
  session,
  exIdx,
  setIdx,
  weightLb,
  onFinishSession,
}: {
  open: boolean
  onClose: () => void
  session: SessionLog
  exIdx: number
  setIdx: number
  /** The load on the set that just died, when there is one. */
  weightLb?: number
  /** Ends the session through the existing quit gate. */
  onFinishSession: () => void
}) {
  const [reason, setReason] = useState<FatigueReason | null>(null)
  const [note, setNote] = useState('')
  const [done, setDone] = useState<string | null>(null)

  const ex = session.exercises[exIdx]
  const def = ex ? getExercise(ex.exerciseId) : null

  function choose(r: FatigueReason) {
    setReason(r)
    if (ex) logFatigue(session.date, ex.exerciseId, r, setIdx, note)
  }

  function close() {
    setReason(null)
    setNote('')
    setDone(null)
    onClose()
  }

  if (!ex || !def) return null

  const ahead = sameGroupAhead(session, exIdx)
  const lighter = weightLb !== undefined && weightLb > 0 ? dropTo(weightLb) : null

  const endIt: Offer = {
    id: 'end',
    label: 'Call this exercise done',
    sub: ahead.length
      ? `${ahead.length} more ${ahead.length === 1 ? 'movement' : 'movements'} today lean on the same muscle.`
      : 'The rest of the day asks a different muscle.',
    run: () => {
      endExercise(session.date, exIdx)
      setDone('Done with that one. Next movement is up.')
    },
  }

  const dropIt: Offer | null =
    lighter !== null && lighter < weightLb!
      ? {
          id: 'drop',
          label: `Drop to ${lighter} lb and finish the set`,
          sub: 'Same movement, a load you can still own.',
          run: () => {
            setWeightForward(session.date, exIdx, setIdx, lighter)
            setDone(`Down to ${lighter} lb. Finish the set.`)
          },
        }
      : null

  const offers: Offer[] = []
  if (reason === 'fried') {
    if (dropIt) offers.push({ ...dropIt, tone: 'lead' })
    offers.push(endIt)
  } else if (reason === 'form') {
    // Form first, because grinding ugly reps is how people get hurt
    // for no stimulus. The lighter set is still there if they want it.
    offers.push({ ...endIt, tone: 'stop' })
    if (dropIt) offers.push(dropIt)
  } else if (reason === 'pain') {
    offers.push({
      ...endIt,
      label: 'Stop this exercise',
      sub: 'Nothing is worth training through this.',
      tone: 'stop',
    })
    if (ahead.length) {
      offers.push({
        id: 'group',
        label: `Stop the other ${ahead.length} that ${ahead.length === 1 ? 'hits' : 'hit'} the same muscle`,
        sub: 'If it hurts now, it will hurt on those too.',
        run: () => {
          endExercise(session.date, exIdx)
          const n = endGroupAhead(session.date, exIdx)
          setDone(`That muscle is done for today. ${n + 1} movements stood down.`)
        },
      })
    }
  } else if (reason === 'empty') {
    offers.push({
      id: 'ease',
      label: 'Lighten what is left',
      sub: 'Trim the rest of the day down to what still counts.',
      tone: 'lead',
      run: () => {
        const cuts = easeRemaining(session.date)
        setDone(cuts.length ? 'The rest of the day just got shorter.' : 'Nothing left worth cutting.')
      },
    })
    offers.push({
      id: 'finish',
      label: 'Finish here, log what I did',
      sub: 'Everything already done still counts.',
      run: () => {
        close()
        onFinishSession()
      },
    })
  }

  const where = `${def.name} · set ${setIdx + 1} of ${ex.sets.length}`

  return (
    <Sheet
      open={open}
      onClose={close}
      title={done ? 'Sorted' : reason ? 'What now?' : "What's stopping you?"}
    >
      {done ? (
        <div className="pb-7 pt-1">
          <div className="rounded-2xl bg-surface px-4 py-4 border-2 border-[var(--lip-lime)] shadow-[0_3px_0_var(--lip-lime)]">
            <p className="text-[15px] font-extrabold leading-snug text-lime">{done}</p>
          </div>
          <Btn kind="subtle" size="lg" className="mt-3 w-full" onClick={close}>
            Back to the set
          </Btn>
        </div>
      ) : !reason ? (
        <div className="pb-7">
          <p className="px-0.5 pb-3 text-[11px] font-black uppercase tracking-[0.14em] text-ink-faint">
            {where}
          </p>
          <div className="space-y-2">
            {REASONS.map((r) => (
              <button
                key={r.id}
                onClick={() => choose(r.id)}
                className={`press flex w-full items-center gap-3.5 rounded-2xl px-4 py-3.5 text-left ${QUIET}`}
              >
                {/* Fixed slot: emoji glyphs differ in width, and without it
                    the four labels do not share a left edge. */}
                <span className="w-7 shrink-0 text-center text-[22px] leading-none">{r.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-extrabold leading-tight text-ink">{r.label}</span>
                  <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-faint">{r.sub}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="mt-2 rounded-2xl bg-surface-2 px-4 py-3 border-2 border-edge focus-within:ring-accent/40">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything else? Optional."
              rows={2}
              maxLength={200}
              className="w-full resize-none bg-transparent text-[13px] font-semibold text-ink outline-none placeholder:font-semibold placeholder:text-ink-dim"
            />
          </div>
        </div>
      ) : (
        <div className="pb-7">
          <p className="px-0.5 pb-3 text-[11px] font-black uppercase tracking-[0.14em] text-ink-faint">
            {endsTheExercise(reason) ? `${def.name} · done its job today` : where}
          </p>
          <div className="space-y-2">
            {offers.map((o) => {
              const tone = o.tone ?? 'quiet'
              return (
                <button
                  key={o.id}
                  onClick={o.run}
                  className={`press block w-full rounded-2xl px-4 py-3.5 text-left ${OFFER_TONE[tone]}`}
                >
                  <span className={`block text-[14.5px] font-extrabold leading-tight ${OFFER_TEXT[tone]}`}>
                    {o.label}
                  </span>
                  {o.sub && (
                    <span className="mt-1 block text-[11.5px] leading-snug text-ink-faint">{o.sub}</span>
                  )}
                </button>
              )
            })}
          </div>
          <Btn kind="ghost" size="md" className="mt-3 w-full" onClick={close}>
            Never mind, keep going
          </Btn>
        </div>
      )}
    </Sheet>
  )
}
