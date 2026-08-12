import { useState } from 'react'
import type { FatigueReason, SessionLog } from '../../types'
import { Sheet } from '../../components/Sheet'
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
// Four answers because they want four different things, one word
// each, over one box you never have to use. Nothing here happens
// without a tap: the sheet offers, the athlete chooses.
// ============================================================

const REASONS: { id: FatigueReason; emoji: string; label: string; sub: string }[] = [
  { id: 'fried', emoji: '🔥', label: 'Fried', sub: 'The muscle is done. Nothing clean left.' },
  { id: 'form', emoji: '📉', label: 'Form', sub: 'Could grind it out. It would be ugly.' },
  { id: 'pain', emoji: '🩹', label: 'Hurts', sub: 'Sharp or wrong, not the normal burn.' },
  { id: 'empty', emoji: '🪫', label: 'Empty', sub: 'Whole body, not one muscle.' },
]

/** A thing the athlete can tap. `tone` marks the one that is being recommended. */
interface Offer {
  id: string
  label: string
  sub?: string
  tone?: 'lead' | 'quiet'
  run: () => void
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

  function finish(message: string) {
    setDone(message)
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
      finish('Done with that one. Next movement is up.')
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
            finish(`Down to ${lighter} lb. Finish the set.`)
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
    offers.push({ ...endIt, tone: 'lead' })
    if (dropIt) offers.push(dropIt)
  } else if (reason === 'pain') {
    offers.push({
      ...endIt,
      label: 'Stop this exercise',
      sub: 'Nothing is worth training through this.',
      tone: 'lead',
    })
    if (ahead.length) {
      offers.push({
        id: 'group',
        label: `Stop the other ${ahead.length} that ${ahead.length === 1 ? 'hits' : 'hit'} the same muscle`,
        sub: 'If it hurts now, it will hurt on those too.',
        run: () => {
          endExercise(session.date, exIdx)
          const n = endGroupAhead(session.date, exIdx)
          finish(`That muscle is done for today. ${n + 1} movements stood down.`)
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
        finish(cuts.length ? 'The rest of the day just got shorter.' : 'Nothing left worth cutting.')
      },
    })
    offers.push({
      id: 'finish',
      label: 'Finish here, log what I did',
      sub: 'Everything already done still counts.',
      tone: 'quiet',
      run: () => {
        close()
        onFinishSession()
      },
    })
  }

  return (
    <Sheet open={open} onClose={close} title={done ? 'Sorted' : reason ? 'What now?' : "What's stopping you?"}>
      {done ? (
        <div className="pb-6 pt-2">
          <p className="text-[15px] font-bold leading-snug text-lime">{done}</p>
          <button
            onClick={close}
            className="press mt-5 w-full rounded-2xl bg-white/[0.07] py-3.5 text-[14px] font-bold text-ink"
          >
            Back to the set
          </button>
        </div>
      ) : !reason ? (
        <div className="space-y-2 pb-5">
          {REASONS.map((r) => (
            <button
              key={r.id}
              onClick={() => choose(r.id)}
              className="press flex w-full items-center gap-3 rounded-2xl border border-edge bg-white/[0.05] px-4 py-3 text-left"
            >
              <span className="text-[20px]">{r.emoji}</span>
              <span className="min-w-0">
                <span className="block text-[15px] font-extrabold text-ink">{r.label}</span>
                <span className="block text-[11.5px] leading-snug text-ink-faint">{r.sub}</span>
              </span>
            </button>
          ))}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything else? Optional."
            rows={2}
            maxLength={200}
            className="mt-1 w-full resize-none rounded-2xl border border-edge bg-white/[0.05] px-4 py-3 text-[13px] text-ink outline-none placeholder:text-ink-faint"
          />
        </div>
      ) : (
        <div className="space-y-2 pb-5">
          <p className="pb-1 text-[12.5px] leading-snug text-ink-dim">
            {endsTheExercise(reason)
              ? `${def.name} has done its job today.`
              : `${def.name}, set ${setIdx + 1}.`}
          </p>
          {offers.map((o) => (
            <button
              key={o.id}
              onClick={o.run}
              className={`press block w-full rounded-2xl border px-4 py-3.5 text-left ${
                o.tone === 'lead'
                  ? 'border-accent/50 bg-accent/10'
                  : 'border-edge bg-white/[0.05]'
              }`}
            >
              <span
                className={`block text-[14.5px] font-extrabold ${
                  o.tone === 'lead' ? 'text-accent-soft' : 'text-ink'
                }`}
              >
                {o.label}
              </span>
              {o.sub && <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-faint">{o.sub}</span>}
            </button>
          ))}
          <button
            onClick={close}
            className="press mt-1 w-full rounded-2xl py-3 text-[13px] font-bold text-ink-dim"
          >
            Never mind, keep going
          </button>
        </div>
      )}
    </Sheet>
  )
}
