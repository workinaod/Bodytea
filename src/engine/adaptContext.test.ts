import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { defaultWeekState, emptyAppData, type AppData, type ResolvedExercise } from '../types'
import { getExercise } from '../plan/exercises'
import { adaptContext, planAdjustments, readSignals } from './adapt'

// ============================================================
// One call, two halves, and the half that was passing two of five.
//
// engine/adapt.ts takes the automatic adjustments off planAdjustments;
// AdaptProposals.tsx takes the rest and offers them. Both built the
// context themselves, and the screen's version was missing three fields.
//
// alreadyCutForSleep is the one that cost something. It is a guard, so
// leaving it out reads as "nothing has been cut", and on a day the
// resolver had already taken a third of the volume off for two bad
// nights, the screen went on to offer a set off every lift on top. Two
// reductions for one night's sleep. The field exists to stop exactly
// that, and it was never passed.
// ============================================================

const TODAY = '2026-08-14'
const MONDAY = '2026-08-10'

function badlySlept(): AppData {
  const d = emptyAppData(MONDAY, TODAY)
  d.settings.onboarded = true
  d.weeks[MONDAY] = defaultWeekState(MONDAY)
  d.weeks[MONDAY].badSleepDates = ['2026-08-12', '2026-08-13']
  return d
}

const ex = (exerciseId: string, sets = 3): ResolvedExercise => {
  const def = getExercise(exerciseId)
  return { exerciseId, name: def.name, kind: def.kind, restSec: def.restSec, sets, repText: '8' }
}

describe('the volume cut that used to land twice', () => {
  it('offers no second cut on a day the resolver already cut for sleep', () => {
    const d = badlySlept()
    const adj = planAdjustments([ex('goblet-squat')], adaptContext(d, TODAY, d.plan.equipment))
    expect(adj.some((a) => a.kind === 'reduce-volume')).toBe(false)
  })

  it('still offers the cut on the day after, when nothing was taken', () => {
    // The guard must be about THIS day, not about having slept badly at
    // some point. A rule that never offers again is not a fix.
    const d = badlySlept()
    const adj = planAdjustments([ex('goblet-squat')], adaptContext(d, '2026-08-15', d.plan.equipment))
    expect(adj.some((a) => a.kind === 'reduce-volume')).toBe(true)
  })

  it('is the context that makes the difference, not the signals', () => {
    // Same day, same signals, the only change being the field the screen
    // was not passing. This is the bug, reproduced.
    const d = badlySlept()
    const short = { owned: new Set(d.plan.equipment), signals: readSignals(d, TODAY) }
    expect(planAdjustments([ex('goblet-squat')], short).some((a) => a.kind === 'reduce-volume')).toBe(true)
  })

  it("carries the athlete's stated limits into the offers too", () => {
    const d = badlySlept()
    d.prefs.blocked = [{ exerciseId: 'goblet-squat', reason: 'dislike', since: MONDAY }]
    d.prefs.limitations = [{ label: 'Bad knee', joints: ['knee'], since: MONDAY }]
    const ctx = adaptContext(d, TODAY, d.plan.equipment)
    expect(ctx.blocked?.has('goblet-squat')).toBe(true)
    expect(ctx.limited).toContain('knee')
  })
})

const SRC = join(import.meta.dirname, '..')
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return walk(full)
    return /\.tsx?$/.test(name) ? [full] : []
  })
}

describe('nobody builds that context by hand again', () => {
  it('passes adaptContext at every call site', () => {
    // The two halves drifted because both wrote the object out. A test
    // that only checked the behaviour would pass again the moment a
    // third caller appeared and got it wrong the same way.
    const offenders: string[] = []
    for (const full of walk(SRC)) {
      const path = relative(SRC, full).replaceAll('\\', '/')
      if (/\.test\.tsx?$/.test(path)) continue
      const text = readFileSync(full, 'utf8')
      for (const m of text.matchAll(/planAdjustments\(\s*[^,]+,\s*([a-zA-Z{])/g)) {
        // adapt.ts declares it; everybody else must call it with the builder.
        if (m[1] !== 'a' && !text.slice(m.index).startsWith('planAdjustments(\n')) {
          offenders.push(`${path}: planAdjustments called with a hand-built context`)
        }
      }
    }
    expect(offenders).toEqual([])
  })
})
