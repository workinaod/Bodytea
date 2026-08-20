import { useMemo } from 'react'
import type { AppData, ISODate } from '../../types'
import { Tile } from '../../components/ui'
import { MuscleMap } from '../../components/MuscleMap'
import { GROUP_ORDER, GROUP_REGIONS, groupCoverage, staleGroups } from '../../engine/pickHelp'
import type { MuscleRegion } from '../../plan/muscleRegions'

// ============================================================
// Your body, this week.
//
// The app has known which muscle groups you trained since the
// day the anatomy figure landed. It only ever said so inside
// the exercise picker, as a hint about what to add next. Put
// the same figure at the top of Progress and it stops being a
// hint and becomes the answer to "what changed because I showed
// up": the week, replayed on your own body.
//
// Lit = trained in the last seven days. Dim = trained in the
// last month but not this week. Everything else is unlit, and
// unlit is information too.
//
// Under two sessions it says it is still assessing, because a
// figure with one muscle lit reads as a verdict and it is not.
// ============================================================

const WINDOW = 7

export function ProgressBody({ data, today }: { data: AppData; today: ISODate }) {
  const { primary, secondary, trained, stale, sessions } = useMemo(() => {
    const cover = groupCoverage(data, today, WINDOW)
    const hot: MuscleRegion[] = []
    const warm: MuscleRegion[] = []
    for (const g of cover) {
      if (g.sets > 0) hot.push(...GROUP_REGIONS[g.group])
      else if (g.daysSince !== null && g.daysSince <= 30) warm.push(...GROUP_REGIONS[g.group])
    }
    // How many real sessions the window actually contains, which is the
    // only thing that decides whether this figure is worth reading.
    let n = 0
    for (let i = 0; i < WINDOW; i++) {
      const d = new Date(`${today}T00:00:00`)
      d.setDate(d.getDate() - i)
      const s = data.sessions[d.toISOString().slice(0, 10)]
      if (s && s.status !== 'skipped' && s.exercises.some((e) => e.sets.some((x) => x.done))) n++
    }
    return {
      primary: hot,
      secondary: warm,
      trained: cover.filter((g) => g.sets > 0).length,
      stale: staleGroups(data, today)[0] ?? null,
      sessions: n,
    }
  }, [data, today])

  return (
    <Tile>
      <div className="eyebrow text-ink-faint">Your body this week</div>
      <div className="mt-1">
        <MuscleMap primary={primary} secondary={secondary} compact reveal />
      </div>
      {sessions < 2 ? (
        // The figure is lit from the first session, so "assessing" was the
        // copy disagreeing with the graphic right above it: a body blazing
        // orange under a line saying there is not enough data yet. There IS
        // data, it is one day of it, and saying how many more make it a week
        // is both true and a reason to train tomorrow.
        <p className="mt-1 text-center text-[12.5px] font-bold text-ink-dim">
          {sessions === 0 ? (
            'Nothing this week yet. One session starts drawing it.'
          ) : (
            <>
              One session in. <b className="text-ink">{2 - sessions} more</b> and this reads as a
              week rather than a day.
            </>
          )}
        </p>
      ) : (
        <>
          <p className="mt-1 text-center text-[12.5px] font-bold text-ink-dim">
            <b className="text-ink">
              {trained} of {GROUP_ORDER.length}
            </b>{' '}
            muscle groups trained this week
          </p>
          {stale && (
            <p className="mt-0.5 text-center text-[11px] font-bold text-ink-faint">
              {stale.label}{' '}
              {stale.daysSince === null
                ? 'has not been trained yet.'
                : `has waited ${stale.daysSince} days.`}
            </p>
          )}
        </>
      )}
    </Tile>
  )
}
