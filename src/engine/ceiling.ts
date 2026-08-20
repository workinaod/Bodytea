import type { AppData, ISODate } from '../types'
import type { DecisionRecord } from '../decisionTypes'
import type { MuscleRegion } from '../plan/muscleRegions'
import { musclesFor } from '../plan/muscles'
import { addDaysISO, daysBetween, mondayOf } from './calendar'
import { decisionRow, offerPolicy } from './decisions'
import { nextSessionSuggestions } from './fatigue'
import { CEILING_RULE_VERSION, CEILING_TYPE } from './proposals'
import { regionName } from './volume'

// ============================================================
// Moving a per-muscle ceiling is a claim about THIS athlete.
//
// R3 s5.3 is blunt that volume autoregulation is the under-evidenced
// half of the autoregulation literature, so: the step is one fractional
// set and never two, the drift is capped both ways, and the first move
// is DOWN. A raised ceiling is an invitation to more fatigue, and s5.2's
// own companion trial found that raising a trained lifter's volume 30 to
// 60 percent did not beat maintaining it. When the evidence is
// ambiguous, hold.
//
// Lowering needs ONE signal, raising needs six. Same asymmetry as the
// failing flag's hysteresis, deliberate for the same reason: the cost of
// being wrong is not symmetric.
//
// The delta lives in the ledger and the base stays the researched
// constant in volume.ts. R3 s5.5 guard 2, and the load-spiral family
// this repo already has a scar from: a lowered ceiling that becomes the
// new base walks a muscle to nothing one honest bad week at a time.
// ============================================================

/** Fractional sets a ceiling may ever drift from the researched base. */
export const CEILING_MAX_DRIFT = 2

/** One change per muscle per fortnight, so a change can be attributed. */
export const CEILING_MIN_DAYS_BETWEEN = 14

const clamp = (n: number) => Math.max(-CEILING_MAX_DRIFT, Math.min(CEILING_MAX_DRIFT, n))

/** Where every muscle's ceiling currently sits relative to its base. */
export function ceilingDeltas(data: AppData): Partial<Record<MuscleRegion, number>> {
  const out: Partial<Record<MuscleRegion, number>> = {}
  for (const d of data.decisions ?? []) {
    if (d.type !== CEILING_TYPE || d.response !== 'accepted') continue
    const region = d.target as MuscleRegion
    const step = d.evidence.direction === 'raise' ? 1 : -1
    out[region] = clamp((out[region] ?? 0) + step)
  }
  return out
}

/** Sessions in date order, newest first, that were actually trained. */
function trained(data: AppData, today: ISODate) {
  return Object.values(data.sessions)
    .filter((s) => s.date <= today && s.status !== 'skipped')
    .sort((a, b) => (a.date > b.date ? -1 : 1))
}

/** Primary regions a movement actually loads. */
const primaryOf = (exerciseId: string) => musclesFor(exerciseId).primary as MuscleRegion[]

/**
 * Weeks in which this region was prescribed sets it did not finish.
 *
 * R3 s5.3 lower-signal 2 wants two CONSECUTIVE such weeks, which is why
 * this returns the run rather than a count: a bad week either side of a
 * clean one is a bad week, not a dose the athlete cannot hold.
 */
function unfinishedWeekRun(data: AppData, region: MuscleRegion, today: ISODate): number {
  let run = 0
  for (let w = 0; w < 8; w++) {
    const monday = mondayOf(addDaysISO(today, -w * 7))
    let planned = 0
    let done = 0
    for (let i = 0; i < 7; i++) {
      const s = data.sessions[addDaysISO(monday, i)]
      if (!s || s.status === 'skipped') continue
      for (const ex of s.exercises) {
        if (ex.skipped || !primaryOf(ex.exerciseId).includes(region)) continue
        planned += ex.sets.length
        done += ex.sets.filter((x) => x.done).length
      }
    }
    if (planned === 0) break // nothing prescribed: says nothing either way
    if (done >= planned) break
    run++
  }
  return run
}

/** Downgraded or sleep-cut days in the last fortnight, whatever the muscle thinks. */
function roughWeeks(data: AppData, today: ISODate): number {
  const cut = new Set<ISODate>()
  for (const s of trained(data, today)) {
    if (daysBetween(s.date, today) > 14) continue
    if (s.readiness?.downgraded) cut.add(s.date)
  }
  for (const week of Object.values(data.weeks ?? {})) {
    for (const d of week.badSleepDates ?? []) {
      if (d <= today && daysBetween(d, today) <= 14) cut.add(d)
    }
  }
  return cut.size
}

export interface CeilingChange {
  region: MuscleRegion
  /** The athlete's word for the muscle. */
  label: string
  /** Why, in one clause, for the card. */
  because: string
}

/**
 * The muscle worth taking a set off, if there is one.
 *
 * Any ONE of R3 s5.3's four lower signals is enough. Ordered by how
 * directly each names the muscle: a region running out across three
 * movements is about that region, while a fortnight of bad sleep is
 * about the week and comes last.
 */
export function ceilingLowerOffer(data: AppData, today: ISODate): CeilingChange | null {
  const deltas = ceilingDeltas(data)
  const suggestions = nextSessionSuggestions(data, today)
  const rough = roughWeeks(data, today) >= 2

  const candidates: { region: MuscleRegion; because: string }[] = []
  for (const s of suggestions) {
    if (s.kind === 'watch-region') {
      for (const r of s.regions) candidates.push({ region: r, because: 'it keeps running out across different movements' })
    }
    if (s.kind === 'start-lighter' && s.exerciseId) {
      for (const r of primaryOf(s.exerciseId)) candidates.push({ region: r, because: 'a movement on it keeps coming up short' })
    }
  }
  const seen = new Set(candidates.map((c) => c.region))
  for (const r of seen) {
    if (unfinishedWeekRun(data, r, today) >= 2) candidates.push({ region: r, because: 'two weeks running you did not finish the sets' })
  }
  if (rough) for (const r of seen) candidates.push({ region: r, because: 'the last fortnight has taken a lot out of you' })

  // One ceiling change at a time, ANY muscle, not one per muscle. A
  // squat set serves quads and glutes both, so taking one off for the
  // quads has already cut the glutes' exposure: offering the glutes next
  // is the same fix counted twice, and neither change could then be
  // attributed. R3 s5.5 guard 4, read at the level the sets actually
  // work at rather than the level the ledger files them under.
  const anyRow = (data.decisions ?? []).filter((d) => d.type === CEILING_TYPE)
  const last = anyRow[anyRow.length - 1]
  if (last && daysBetween(last.respondedAt ?? last.offeredAt, today) < CEILING_MIN_DAYS_BETWEEN) return null

  for (const c of candidates) {
    // Already as low as the evidence is allowed to take it.
    if ((deltas[c.region] ?? 0) <= -CEILING_MAX_DRIFT) continue
    if (!offerPolicy(data, CEILING_TYPE, c.region, today).allowed) continue
    return { region: c.region, label: regionName(c.region), because: c.because }
  }
  return null
}

export function ceilingDecision(
  change: CeilingChange,
  direction: 'raise' | 'lower',
  response: 'accepted' | 'declined',
  at: ISODate,
  seq: number,
): DecisionRecord {
  return decisionRow({
    type: CEILING_TYPE,
    target: change.region,
    ruleVersion: CEILING_RULE_VERSION,
    evidence: { direction, because: change.because },
    response,
    at,
    seq,
  })
}

/** Short, because it is a card. */
export function ceilingLowerCopy(c: CeilingChange): string {
  return `One less ${c.label.toLowerCase()} set per session, because ${c.because}.`
}

// ---------------- Raising, which needs six things ----------------

/** At least this share of planned sessions done, over the window. */
export const RAISE_MIN_ADHERENCE = 0.75

/** A gap this long anywhere in the window disqualifies the claim. */
export const RAISE_MAX_GAP_DAYS = 10

/** Reps in reserve on the last set before there is headroom to spend. */
export const RAISE_MIN_RIR = 2

/** Weeks of evidence a raise is judged on. */
export const RAISE_WINDOW_DAYS = 28

/**
 * Goals a raise is even on the table for.
 *
 * R3 s5.6, from S18 and S7: strength gain plateaus at low volumes and is
 * much more sensitive to diminishing returns than hypertrophy, so volume
 * is size's first lever and strength's last one. For fat loss and
 * general health the pack says do not chase volume at all, and the
 * explosive goals live or die on freshness, which is the whole reason
 * this app protects Saturday. Refusing is the honest default: a raise is
 * an invitation to more fatigue and s5.4 says hold when it is ambiguous.
 */
const RAISE_GOALS: ReadonlySet<string> = new Set(['muscle', 'strength'])

/** Outer wall for a muscle's WEEKLY fractional total. R3 s5.2, S31. */
export const WEEKLY_BAND_TOP = 20

/** Fractional sets this region took in the last seven days. */
function weeklyFractional(data: AppData, region: MuscleRegion, today: ISODate): number {
  let n = 0
  for (const s of trained(data, today)) {
    if (daysBetween(s.date, today) > 7) break
    for (const ex of s.exercises) {
      if (ex.skipped) continue
      const m = musclesFor(ex.exerciseId)
      const w = (m.primary as MuscleRegion[]).includes(region)
        ? 1
        : (m.secondary as MuscleRegion[]).includes(region)
          ? 0.5
          : 0
      if (w) n += ex.sets.filter((x) => x.done).length * w
    }
  }
  return n
}

/**
 * Was the window clean enough that the tolerance was actually tested.
 *
 * R3 s5.5 guard 1 and s5.3 condition 6, which are the same rule twice:
 * a deload, a readiness downgrade or a bad-sleep cut means the athlete
 * was not carrying the current dose, so finishing everything says
 * nothing about whether they could carry more.
 */
function windowWasSoftened(data: AppData, today: ISODate): boolean {
  for (const s of trained(data, today)) {
    if (daysBetween(s.date, today) > 14) break
    if (s.readiness?.downgraded || s.status === 'downgraded-completed') return true
    if (s.exercises.some((ex) => ex.sets.some((x) => x.light))) return true
  }
  return roughWeeks(data, today) > 0
}

/** Adherence and the worst gap, over the raise window. */
function attendance(data: AppData, today: ISODate): { rate: number; worstGap: number } {
  const all = Object.values(data.sessions)
    .filter((s) => s.date <= today && daysBetween(s.date, today) <= RAISE_WINDOW_DAYS)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
  const kept = all.filter((s) => s.status !== 'skipped')
  if (!kept.length) return { rate: 0, worstGap: RAISE_WINDOW_DAYS }
  // Seeded from the NEWEST session, not the oldest. Reading it the other
  // way round measured the whole window as one gap, so nobody ever
  // cleared the bar and the raise could not fire at all.
  let worst = daysBetween(kept[kept.length - 1].date, today)
  for (let i = 1; i < kept.length; i++) {
    worst = Math.max(worst, daysBetween(kept[i - 1].date, kept[i].date))
  }
  return { rate: kept.length / all.length, worstGap: worst }
}

/**
 * The muscle worth offering one more set on, if there is one.
 *
 * Six conditions, all of them, and the goal has to be one volume is even
 * a lever for. R3 s5.3's asymmetry made concrete: this is the long half.
 */
export function ceilingRaiseOffer(data: AppData, today: ISODate): CeilingChange | null {
  if (!RAISE_GOALS.has(data.plan?.goal ?? '')) return null
  if (windowWasSoftened(data, today)) return null

  const { rate, worstGap } = attendance(data, today)
  if (rate < RAISE_MIN_ADHERENCE || worstGap > RAISE_MAX_GAP_DAYS) return null

  const anyRow = (data.decisions ?? []).filter((d) => d.type === CEILING_TYPE)
  const last = anyRow[anyRow.length - 1]
  if (last && daysBetween(last.respondedAt ?? last.offeredAt, today) < CEILING_MIN_DAYS_BETWEEN) return null

  const deltas = ceilingDeltas(data)
  const suggestions = nextSessionSuggestions(data, today)
  // Any shortfall or pain evidence at all disqualifies the region.
  const barred = new Set<MuscleRegion>()
  for (const s of suggestions) {
    for (const r of s.regions) barred.add(r)
    if (s.exerciseId) for (const r of primaryOf(s.exerciseId)) barred.add(r)
  }

  // Regions the athlete actually trains, with their reported effort.
  const rir = new Map<MuscleRegion, number[]>()
  for (const s of trained(data, today)) {
    if (daysBetween(s.date, today) > RAISE_WINDOW_DAYS) break
    for (const ex of s.exercises) {
      if (ex.skipped || ex.rir === undefined) continue
      for (const r of primaryOf(ex.exerciseId)) rir.set(r, [...(rir.get(r) ?? []), ex.rir])
    }
  }

  for (const [region, reported] of rir) {
    if (barred.has(region)) continue
    if ((deltas[region] ?? 0) >= CEILING_MAX_DRIFT) continue
    // Absent evidence is not permission: R3 s5.3 condition 4.
    if (reported.length < 2) continue
    const sorted = [...reported].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    if (median < RAISE_MIN_RIR) continue
    if (weeklyFractional(data, region, today) >= WEEKLY_BAND_TOP) continue
    if (!offerPolicy(data, CEILING_TYPE, region, today).allowed) continue
    return {
      region,
      label: regionName(region),
      because: 'it has finished clean with something left in the tank',
    }
  }
  return null
}

/** Short, because it is a card. */
export function ceilingRaiseCopy(c: CeilingChange): string {
  return `One more ${c.label.toLowerCase()} set per session, because ${c.because}.`
}
