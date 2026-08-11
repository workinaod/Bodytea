import type { RunLog } from '../types'

// ============================================================
// Post-run reactions: what the finish card celebrates. All
// tiers are positive or steady — the app never boos. "Good"
// is judged two ways at once: absolute pace bands per distance
// (what a strong recreational time IS), and the athlete's own
// history (PRs and longest days).
// ============================================================

export type ReactionTier = 'first' | 'shooting-star' | 'fireworks' | 'disco' | 'steady'

export interface Reaction {
  tier: ReactionTier
  /** One reassuring/pushing line, deterministic per date. */
  note: string
  /** Short label shown above the note ("PR PACE + DISTANCE"). */
  headline: string
}

/** A strong recreational run pace (sec/mi) for a given distance. */
export function greatRunPaceSec(distanceMi: number): number {
  if (distanceMi < 1.5) return 7.5 * 60
  if (distanceMi < 4) return 8 * 60
  if (distanceMi < 7) return 8.5 * 60
  return 9 * 60
}

/** A strong recreational ride speed (mph) for a given distance. */
export function greatBikeMph(distanceMi: number): number {
  return distanceMi < 10 ? 16 : 15
}

const NOTES: Record<ReactionTier, string[]> = {
  first: [
    'Benchmark set. Everything from here is a comparison you control.',
    'First one on the books. The hardest run is the one that starts the record.',
  ],
  'shooting-star': [
    'Pace AND distance in one outing. Not a good day, a new standard.',
    'You just moved both goalposts at once. Write this one down.',
  ],
  fireworks: [
    'That pace is legit for this distance. The engine is getting dangerous.',
    'Fast day. The kind future-you points back at.',
    'That was moving. Recover like it mattered, because it did.',
  ],
  disco: [
    'That is real distance. The long ones build the base everything else stands on.',
    'Farther than usual. The map needed a bigger screen today.',
    'Distance day banked. Endurance compounds quietly.',
  ],
  steady: [
    'Money in the bank. Volume now, fireworks later.',
    'Bad days build the good ones. Same shoes tomorrow.',
    'Showed up, logged it, moved on. That is the whole sport.',
  ],
}

const HEADLINES: Record<ReactionTier, string> = {
  first: 'FIRST ONE · BENCHMARK SET',
  'shooting-star': 'PR PACE + REAL DISTANCE',
  fireworks: 'FAST FOR THE DISTANCE',
  disco: 'DISTANCE DAY',
  steady: 'BANKED',
}

function hashStr(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null
  const s = [...nums].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

export function reactionForRun(log: RunLog, past: RunLog[]): Reaction {
  const history = past.filter((r) => r.activity === log.activity && r.id !== log.id && r.distanceMi > 0.1)
  const pick = (tier: ReactionTier): Reaction => ({
    tier,
    headline: HEADLINES[tier],
    note: NOTES[tier][hashStr(log.date + log.id) % NOTES[tier].length],
  })

  if (log.distanceMi <= 0.1) return pick('steady')
  if (history.length === 0) return pick('first')

  const mph = log.durationSec > 0 ? (log.distanceMi / log.durationSec) * 3600 : 0
  const greatPace =
    log.activity === 'run' ? log.avgPaceSec > 0 && log.avgPaceSec <= greatRunPaceSec(log.distanceMi) : mph >= greatBikeMph(log.distanceMi)

  const medPace = median(history.map((r) => r.avgPaceSec).filter((p) => p > 0))
  const bestPace = Math.min(...history.map((r) => r.avgPaceSec).filter((p) => p > 0), Infinity)
  const prPace = log.avgPaceSec > 0 && log.avgPaceSec < bestPace
  const fastVsSelf = medPace !== null && log.avgPaceSec > 0 && log.avgPaceSec <= medPace * 0.95

  const medDist = median(history.map((r) => r.distanceMi))
  const longest = Math.max(...history.map((r) => r.distanceMi))
  const bigDistance = log.distanceMi > longest || (medDist !== null && log.distanceMi >= medDist * 1.2)

  if ((prPace || greatPace) && bigDistance) return pick('shooting-star')
  if (greatPace || fastVsSelf || prPace) return pick('fireworks')
  if (bigDistance) return pick('disco')
  return pick('steady')
}
