import type { ISODate } from '../types'
import { BEFORE_TRACKING } from '../types'
import { athleteFacts } from '../engine/achievementFacts'
import { evaluateAchievements } from '../engine/achievements'
import { useAppStore } from '../store/appStore'
import { stampReachedStages } from './journeyActions'

// ============================================================
// Writing down WHEN a badge was earned.
//
// Everything else about an achievement is derived: the engine
// re-evaluates all 58 on every render from the raw history, and
// that is what keeps them honest. The date cannot be derived,
// for the same reason a journey stage cannot: the evidence
// moves. A badge cleared on a 30 day streak stays earned after
// the streak breaks, and by then nothing in the data says when.
//
// So it is stamped once, on the day it is first seen earned,
// and never rewritten.
//
// The awkward case is the accounts that already have badges.
// The app cannot know when those were cleared and it is not
// going to invent a date, so the first sweep marks them
// `before-tracking` and says exactly that on the badge.
// ============================================================

const store = () => useAppStore.getState()

/**
 * Stamp anything newly earned. Idempotent, additive, never removes a key.
 *
 * Private: `stampProgress` below is the entry point, because a caller
 * that stamps badges and forgets the journey is a bug waiting to happen.
 */
function stampEarnedAchievements(today: ISODate): void {
  const data = store().data
  const log = data.achievements ?? { earnedAt: {} }
  const earned = evaluateAchievements(data, today, athleteFacts(data, today))
    .filter((s) => s.earned)
    .map((s) => s.def.id)

  // First run on this account: everything standing is older than the
  // record of it, and saying so is the only honest option.
  const first = !log.trackingFrom
  const stamp = first ? BEFORE_TRACKING : today
  const fresh = earned.filter((id) => !log.earnedAt[id])
  if (!first && fresh.length === 0) return

  store().update((d) => {
    if (!d.achievements) d.achievements = { earnedAt: {} }
    if (!d.achievements.trackingFrom) d.achievements.trackingFrom = today
    for (const id of fresh) d.achievements.earnedAt[id] = stamp
  })
}

/**
 * Both permanent ladders, stamped together.
 *
 * The journey's stages and the badge dates are the same kind of fact
 * (something that happened, whose evidence will move) and they are
 * always wanted at the same moments, so the write paths call this
 * rather than remembering two functions and the order they go in.
 *
 * Called from the write paths (session finish, the daily sweep) rather
 * than from a render: evaluateAchievements is a pure read that runs on
 * every render, and writing from inside one would loop.
 */
export function stampProgress(today: ISODate): void {
  stampReachedStages(today)
  stampEarnedAchievements(today)
}
