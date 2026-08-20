import type { AppData } from '../types'

// ============================================================
// "How do I compare?"
//
// The honest version of the Wrapped stat. There is no server
// aggregating other Bodytea users yet (that is the cloud lane),
// so inventing "you beat 84% of Bodytea users" would be a
// fabricated number attached to a real name. Instead every band
// below comes from published population data, and the copy says
// what the comparison actually is: adults, gym members, people
// who START a program. Swap the tables for real aggregates the
// day the cloud can serve them; nothing else has to change.
//
// Sources, all public:
// - CDC NHIS: about 24% of US adults meet BOTH the aerobic and
//   the muscle-strengthening guideline; about 31% do any
//   muscle-strengthening on 2+ days a week.
// - Dropout research (Dishman and successors, replicated for
//   decades): roughly half of people who start a structured
//   exercise program have stopped within six months.
// - Gym-operator reporting: the average member visits about
//   twice a week, and a minority visit four or more times.
// - Protein intake surveys: most adults eat well under
//   1.6 g/kg; hitting a protein target most days is a minority
//   behaviour among people who are not tracking.
//
// Every band is deliberately COARSE. A percentile printed to
// the decimal from a table like this would be a lie told
// precisely. Ranges, and a plain statement of who is being
// compared, are what these numbers can honestly support.
// ============================================================

export interface CohortStat {
  /** Short label for the card: 'Training days'. */
  label: string
  /** What the athlete actually did, as text: '4 a week'. */
  value: string
  /** The comparison, already worded: 'ahead of about 9 in 10 adults'. */
  standing: string
  /** Who the comparison is against, said plainly. Never omitted. */
  against: string
  /** Rough percentile, for ordering and for the bar. 0-100. */
  percentile: number
}

interface Band {
  /** Lower bound of the measured value, inclusive. */
  min: number
  percentile: number
  standing: string
}

/** Highest band whose min the value clears. Bands must be ascending. */
function bandFor(bands: Band[], value: number): Band {
  let hit = bands[0]
  for (const b of bands) if (value >= b.min) hit = b
  return hit
}

// Sessions a week, against adults who do any muscle-strengthening work.
const FREQUENCY: Band[] = [
  { min: 0, percentile: 20, standing: 'a quiet week, and a quiet week is still logged' },
  { min: 1, percentile: 55, standing: 'ahead of about half of adults' },
  { min: 2, percentile: 70, standing: 'clearing the guideline most adults miss' },
  { min: 3, percentile: 85, standing: 'ahead of roughly 8 in 10 adults' },
  { min: 4, percentile: 92, standing: 'ahead of roughly 9 in 10 adults' },
  { min: 6, percentile: 97, standing: 'in the top few percent for training volume' },
]

// Weeks still training, against people who START a program.
const RETENTION: Band[] = [
  { min: 0, percentile: 50, standing: 'week one, where everybody is still here' },
  { min: 4, percentile: 65, standing: 'past the month where a third have already stopped' },
  { min: 12, percentile: 80, standing: 'past three months, where most starters have quit' },
  { min: 26, percentile: 90, standing: 'past six months, where about half the field is gone' },
  { min: 52, percentile: 96, standing: 'a full year in, which most people never see' },
]

// Percentage of logged days hitting the protein target.
const PROTEIN: Band[] = [
  { min: 0, percentile: 30, standing: 'behind where most people who track end up' },
  { min: 40, percentile: 55, standing: 'around the middle for people who track at all' },
  { min: 60, percentile: 72, standing: 'ahead of most people who track' },
  { min: 80, percentile: 88, standing: 'ahead of roughly 9 in 10, tracking or not' },
]

// Session adherence: done and part-done against scheduled.
const ADHERENCE: Band[] = [
  { min: 0, percentile: 25, standing: 'below where a program starts paying' },
  { min: 50, percentile: 55, standing: 'about average for a program in progress' },
  { min: 70, percentile: 75, standing: 'the range where plans actually work' },
  { min: 90, percentile: 93, standing: 'near-perfect, which almost nobody sustains' },
]

const ADULTS = 'US adults, CDC survey data'
const STARTERS = 'people who start a structured program'
const TRACKERS = 'people who track their food'

/**
 * The comparison cards for a period.
 *
 * `sessionsPerWeek` is the rate over the period, not the raw count, so a
 * month and a week can be compared to the same table without a month
 * looking like superhuman volume.
 */
export function cohortStats(input: {
  sessionsPerWeek: number
  weeksTraining: number
  adherencePct: number | null
  proteinPct: number | null
}): CohortStat[] {
  const out: CohortStat[] = []
  const freq = bandFor(FREQUENCY, input.sessionsPerWeek)
  const rate = Math.round(input.sessionsPerWeek * 10) / 10
  out.push({
    label: 'Training days',
    value: `${rate} a week`,
    standing: freq.standing,
    against: ADULTS,
    percentile: freq.percentile,
  })

  if (input.weeksTraining >= 1) {
    const ret = bandFor(RETENTION, input.weeksTraining)
    out.push({
      label: 'Still here',
      value: `${input.weeksTraining} ${input.weeksTraining === 1 ? 'week' : 'weeks'} in`,
      standing: ret.standing,
      against: STARTERS,
      percentile: ret.percentile,
    })
  }

  if (input.adherencePct !== null) {
    const adh = bandFor(ADHERENCE, input.adherencePct)
    out.push({
      label: 'Sessions kept',
      value: `${input.adherencePct}%`,
      standing: adh.standing,
      against: STARTERS,
      percentile: adh.percentile,
    })
  }

  if (input.proteinPct !== null) {
    const pro = bandFor(PROTEIN, input.proteinPct)
    out.push({
      label: 'Protein hit',
      value: `${input.proteinPct}% of days`,
      standing: pro.standing,
      against: TRACKERS,
      percentile: pro.percentile,
    })
  }

  return out
}

/** Whole weeks between the phase start and a date, floored at 0. */
export function weeksTraining(data: AppData, to: string): number {
  const start = data.settings.phaseStartDate
  if (!start || to < start) return 0
  const ms = Date.parse(`${to}T00:00:00`) - Date.parse(`${start}T00:00:00`)
  return Math.max(0, Math.floor(ms / (7 * 24 * 60 * 60 * 1000)))
}
