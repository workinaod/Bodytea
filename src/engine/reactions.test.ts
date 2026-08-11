import { describe, expect, it } from 'vitest'
import { greatBikeMph, greatRunPaceSec, reactionForRun } from './reactions'
import type { RunLog } from '../types'

function run(over: Partial<RunLog>): RunLog {
  return {
    id: over.id ?? 'r1',
    activity: 'run',
    date: '2026-08-10',
    startedAt: 'x',
    durationSec: 1800,
    distanceMi: 3,
    avgPaceSec: 600,
    splits: [],
    points: [],
    ...over,
  }
}

describe('pace bands know what good is per distance', () => {
  it('run bands tighten for short, loosen for long', () => {
    expect(greatRunPaceSec(1)).toBe(450)
    expect(greatRunPaceSec(3)).toBe(480)
    expect(greatRunPaceSec(5)).toBe(510)
    expect(greatRunPaceSec(10)).toBe(540)
    expect(greatBikeMph(5)).toBe(16)
    expect(greatBikeMph(20)).toBe(15)
  })
})

describe('reactionForRun', () => {
  const history = [
    run({ id: 'h1', avgPaceSec: 620, distanceMi: 2.5 }),
    run({ id: 'h2', avgPaceSec: 600, distanceMi: 3 }),
    run({ id: 'h3', avgPaceSec: 640, distanceMi: 2.8 }),
  ]

  it('first ever outing → first', () => {
    expect(reactionForRun(run({}), []).tier).toBe('first')
  })

  it('great absolute pace for the distance → fireworks', () => {
    expect(reactionForRun(run({ id: 'x', avgPaceSec: 470, durationSec: 1410 }), history).tier).toBe('fireworks')
  })

  it('personal longest at normal pace → disco', () => {
    expect(reactionForRun(run({ id: 'x', distanceMi: 5.5, avgPaceSec: 610, durationSec: 3355 }), history).tier).toBe('disco')
  })

  it('PR pace AND big distance → shooting-star', () => {
    expect(reactionForRun(run({ id: 'x', distanceMi: 5.5, avgPaceSec: 560, durationSec: 3080 }), history).tier).toBe('shooting-star')
  })

  it('ordinary day → steady, and never a negative tier', () => {
    const r = reactionForRun(run({ id: 'x', avgPaceSec: 700, durationSec: 2100 }), history)
    expect(r.tier).toBe('steady')
    expect(r.note.length).toBeGreaterThan(10)
  })

  it('deterministic note per date+id', () => {
    const a = reactionForRun(run({ id: 'x' }), history)
    const b = reactionForRun(run({ id: 'x' }), history)
    expect(a.note).toBe(b.note)
  })
})
