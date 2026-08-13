import { beforeEach, describe, expect, it } from 'vitest'
import { emptyAppData, type Measurement } from '../types'
import { useAppStore } from '../store/appStore'
import { stampReachedStages } from './journeyActions'
import { buildJourney } from '../engine/journey'

// ============================================================
// The one write in the whole feature.
//
// Everything the path shows is derived except this: the DAY a
// stage was reached. It exists because "reached" is not
// re-derivable — the evidence for it is not permanent — and the
// two things that can go wrong are both silent. Forget to write
// it and the stage goes out when the scale comes back up. Rewrite
// it and the athlete's history says they hit their first 225 last
// Tuesday.
// ============================================================

const TODAY = '2026-08-14'

const weighIn = (date: string, weightLb: number): Measurement => ({ date, weightLb, photoIds: {} })

function seed(mutate: (d: ReturnType<typeof emptyAppData>) => void) {
  const d = emptyAppData('2026-01-05', TODAY)
  d.settings.onboarded = true
  d.plan.goal = 'lean'
  mutate(d)
  useAppStore.setState({ data: d })
}

describe('stamping a stage the moment it is reached', () => {
  beforeEach(() => {
    seed(() => {})
  })

  it('writes nothing when nothing has been reached', () => {
    stampReachedStages(TODAY)
    expect(useAppStore.getState().data.journey.hits).toEqual({})
  })

  it('records the day a stage was reached', () => {
    seed((d) => {
      d.measurements = [
        weighIn('2026-04-01', 218),
        weighIn('2026-05-01', 211),
        weighIn('2026-06-01', 204),
        weighIn('2026-07-01', 201),
        weighIn('2026-08-08', 198.5),
        weighIn('2026-08-14', 198),
      ]
    })
    stampReachedStages(TODAY)
    const hits = useAppStore.getState().data.journey.hits
    expect(Object.keys(hits).length).toBeGreaterThan(0)
    for (const day of Object.values(hits)) expect(day).toBe(TODAY)
  })

  it('never rewrites the day a stage was FIRST reached', () => {
    // The one that matters. This runs on every finished session and
    // every check-in, so an unguarded write would drag every date on
    // the path forward to today and erase the shape of the whole climb
    // — the athlete's first 225 would read as having happened this
    // morning, every morning.
    seed((d) => {
      d.measurements = [
        weighIn('2026-04-01', 218),
        weighIn('2026-05-01', 211),
        weighIn('2026-06-01', 204),
        weighIn('2026-07-01', 201),
        weighIn('2026-08-08', 198.5),
        weighIn('2026-08-14', 198),
      ]
    })
    stampReachedStages('2026-08-14')
    const first = { ...useAppStore.getState().data.journey.hits }
    expect(Object.keys(first).length).toBeGreaterThan(0)

    // Run it again on a later day, as the app will, many times.
    stampReachedStages('2026-09-30')
    expect(useAppStore.getState().data.journey.hits).toEqual(first)
  })

  it('is safe to call over and over, which is how it is actually called', () => {
    stampReachedStages(TODAY)
    stampReachedStages(TODAY)
    stampReachedStages(TODAY)
    expect(useAppStore.getState().data.journey.hits).toEqual({})
  })

  it('makes the path read done off the stamp alone', () => {
    seed((d) => {
      d.measurements = [
        weighIn('2026-04-01', 218),
        weighIn('2026-05-01', 211),
        weighIn('2026-06-01', 204),
        weighIn('2026-07-01', 201),
        weighIn('2026-08-08', 198.5),
        weighIn('2026-08-14', 198),
      ]
    })
    stampReachedStages(TODAY)
    const stamped = Object.keys(useAppStore.getState().data.journey.hits)

    // Now regain the weight. The current number no longer satisfies a
    // single one of them, and every one of them still happened.
    const d = useAppStore.getState().data
    d.measurements.push(weighIn('2026-08-20', 214))
    const j = buildJourney(d, '2026-08-20')
    for (const id of stamped) {
      expect(j.path.find((r) => r.id === id)?.state).toBe('done')
    }
  })
})
