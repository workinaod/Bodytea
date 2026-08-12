import type { SessionLog, SessionStatus } from '../types'
import { GRADE_LABEL, sessionGrade } from './stats'

// ============================================================
// Ending a session: what it becomes, and what you are told.
//
// What quitting actually costs you, said out loud.
//
// The dialog used to say "Yes, quit and log what's done" no
// matter what, including when nothing was done. There is
// nothing to log at zero sets, and the session goes down as
// skipped, so the button was promising the opposite of what
// happened.
//
// The copy is derived from the same numbers the status is
// derived from, so the two cannot drift apart.
// ============================================================

/** The sets that count: not skipped, not trimmed off the end. */
function considered(session: SessionLog) {
  return session.exercises.filter(
    (e, i) => !e.skipped && (session.trimmedFromIndex === undefined || i < session.trimmedFromIndex),
  )
}

/**
 * What a session becomes when it ends.
 *
 * Nothing logged is not a partial session, it is a session that did not
 * happen. Calling it "partial" kept the streak alive for opening the app
 * and quitting, which is exactly the kind of hollow number the flame
 * counter must never be able to show.
 */
export function finalStatus(session: SessionLog): SessionStatus {
  const list = considered(session)
  const allDone = list.length > 0 && list.every((e) => e.sets.every((x) => x.done))
  const anyDone = list.some((e) => e.sets.some((x) => x.done))
  if (!anyDone) return 'skipped'
  const eased = session.readiness?.downgraded || (session.intensity !== undefined && session.intensity !== 'full')
  if (!allDone) return 'partial'
  return eased ? 'downgraded-completed' : 'completed'
}

export type QuitCopy = {
  title: string
  body: string
  /** The stay-in-the-session button. */
  stay: string
  /** The quit button. */
  go: string
}

export function quitCopy(session: SessionLog, streak = 0): QuitCopy {
  const considered = session.exercises.filter(
    (e, i) => !e.skipped && (session.trimmedFromIndex === undefined || i < session.trimmedFromIndex),
  )
  const sets = considered.flatMap((e) => e.sets)
  const total = sets.length
  const done = sets.filter((s) => s.done).length

  if (done === 0) {
    // Nothing logged means nothing to log. Say the real consequence,
    // including the streak, because that is the part that stings.
    const streakLine = streak > 0 ? ` Your ${streak} day streak ends here.` : ''
    return {
      title: 'Log this as skipped?',
      body: `Nothing is in yet, so there is nothing to save. This one goes down as skipped.${streakLine}`,
      stay: "No, I'll run one set",
      go: 'Yes, log it as skipped',
    }
  }

  const label = GRADE_LABEL[sessionGrade(session)].toLowerCase()
  return {
    title: 'Quit the session?',
    body: `${done} of ${total} sets are in. Ending now grades the day ${label}, not a completion.`,
    stay: 'No, keep training',
    go: "Yes, quit and log what's done",
  }
}
