import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildFollowups, GOAL_FOLLOWUPS, qualitiesForSport, readStatement, SPORTS, SPORT_QUALITIES, targetsFromAnswers } from './followups'
import type { Goal } from '../types'

const GOALS: Goal[] = ['vertical', 'speed', 'muscle', 'strength', 'lean', 'general', 'endurance']

// ============================================================
// The questions, and the wiring behind them.
//
// The first test here is the important one, and it exists
// because this exact bug shipped: the follow-up options were
// reworded, the generator kept comparing against the OLD
// strings, and every branch behind them went dead. Nothing went
// red, because the generator's own tests fed it the old strings
// directly — so the tests and the code agreed with each other
// and both disagreed with the app.
//
// Two files holding the same string literals will drift. This
// reads the generator's source and checks that every answer it
// switches on is one a user can actually give.
// ============================================================

describe('the generator only ever tests for answers a user can give', () => {
  it('has no dead branches behind a reworded option', () => {
    const src = readFileSync(join(import.meta.dirname, 'generator.ts'), 'utf8')
    const optionsById = new Map<string, Set<string>>()
    for (const list of Object.values(GOAL_FOLLOWUPS)) {
      for (const q of list) {
        const set = optionsById.get(q.id) ?? new Set<string>()
        for (const o of q.options ?? []) set.add(o)
        optionsById.set(q.id, set)
      }
    }

    const dead: string[] = []
    for (const m of src.matchAll(/ans\['([a-z-]+)'\] === '([^']+)'/g)) {
      const [, id, value] = m
      const options = optionsById.get(id)
      if (!options) {
        dead.push(`ans['${id}'] — no question with that id asks anything`)
      } else if (!options.has(value)) {
        dead.push(`ans['${id}'] === '${value}' — never offered; options are ${[...options].join(' | ')}`)
      }
    }
    expect(dead).toEqual([])
  })
})

describe('asking as much as the plan needs', () => {
  it('asks more than the three it used to be stuck at', () => {
    // Three was never a considered number: it was what fitted under the
    // goal box. These have their own screen now.
    for (const g of GOALS) {
      expect(buildFollowups({ goal: g, answers: {} }).length).toBeGreaterThan(3)
    }
  })

  it('asks everybody about injuries, which no goal used to', () => {
    // The question a real coach asks in the first minute, and it was
    // missing from all seven goals.
    for (const g of GOALS) {
      const ids = buildFollowups({ goal: g, answers: {} }).map((q) => q.id)
      expect(ids).toContain('injuries')
    }
  })

  it('gives every question a job', () => {
    // A question whose answer changes nothing is worse than no question:
    // it costs the user a tap and buys them nothing.
    for (const list of Object.values(GOAL_FOLLOWUPS)) {
      for (const q of list) expect(q.informs.length).toBeGreaterThan(15)
    }
  })
})

describe('reading what they already typed', () => {
  it('does not ask again about something they just said', () => {
    const asked = buildFollowups({ goal: 'lean', statement: 'lose 30 lb before my wedding in June', answers: {} })
    expect(asked.map((q) => q.id)).not.toContain('lose-amount')
    expect(asked.map((q) => q.id)).not.toContain('deadline')
  })

  it('reads the race out of the sentence', () => {
    expect(readStatement('finish my first marathon')['race-what']).toBe('Marathon')
    expect(readStatement('run a half marathon')['race-what']).toBe('Half marathon')
    expect(readStatement('run my first 5k')['race-what']).toBe('5K')
  })

  it('reads the lift out of the sentence', () => {
    expect(readStatement('bench 225')['lift-focus']).toBe('Bench press')
    expect(readStatement('squat three plates')['lift-focus']).toBe('Squat')
  })

  it('reads kilos as well as pounds', () => {
    // Half the world weighs in kilos, and 20 kg read as 20 lb would put
    // somebody in the wrong plan entirely.
    expect(readStatement('lose 20 kg')['lose-amount']).toBe('30 to 60 lb')
  })

  it('still asks when the sentence is vague, rather than guessing', () => {
    // The cost of a wrong pre-fill is higher than an extra question: the
    // athlete has to notice it to correct it.
    const asked = buildFollowups({ goal: 'lean', statement: 'get in better shape', answers: {} })
    expect(asked.map((q) => q.id)).toContain('lose-amount')
  })

  it('never confirms a NUMBER off their sentence', () => {
    // A chip answer can be inferred; a target number cannot. "lose 30 lb"
    // is a range, not a goal weight, and quietly setting one would put a
    // finish line on their plan they never chose.
    const asked = buildFollowups({ goal: 'lean', statement: 'lose 30 lb', answers: {} })
    expect(asked.map((q) => q.id)).toContain('goal-weight')
  })
})

describe('the sport question, which was missing entirely', () => {
  it('asks it', () => {
    expect(buildFollowups({ goal: 'speed', answers: {} }).map((q) => q.id)).toContain('sport')
  })

  it('asks the position only where position changes the training', () => {
    const withBall = buildFollowups({ goal: 'speed', answers: { sport: 'Basketball' } })
    expect(withBall.map((q) => q.id)).toContain('sport-role')
    // Nobody has a position in golf.
    const golf = buildFollowups({ goal: 'speed', answers: { sport: 'Golf' } })
    expect(golf.map((q) => q.id)).not.toContain('sport-role')
  })

  it('offers the sports people outside a stadium actually do', () => {
    // The list was eleven team sports. A climber, a snowboarder and a
    // dancer are athletes too, and they all download fitness apps.
    for (const s of ['Climbing', 'Snowboard / ski', 'Dance', 'Gymnastics', 'Bodybuilding', 'CrossFit', 'Rowing']) {
      expect(SPORTS).toContain(s)
    }
  })

  it('knows what every sport it lists is made of', () => {
    for (const s of SPORTS) {
      if (s === 'Something else') continue
      expect(SPORT_QUALITIES[s], `${s} has no quality profile`).toBeTruthy()
      expect(SPORT_QUALITIES[s].length).toBeGreaterThan(1)
    }
  })

  it('still produces a coherent plan for a sport it has never heard of', () => {
    // There will always be one. The answer is not to keep adding sports,
    // it is that an unknown sport still lands on real qualities.
    const q = qualitiesForSport('Korfball')
    expect(q.length).toBeGreaterThan(2)
    expect(qualitiesForSport('Climbing')).toContain('athletic-strength')
    expect(qualitiesForSport(null)).toEqual([])
  })
})

describe('the number they name', () => {
  it('only asks for one where a number is the natural way to say it', () => {
    // "A number to beat" used to be three boxes shown to everybody,
    // including people whose goal was "get my energy back".
    const numeric = (g: Goal) => (GOAL_FOLLOWUPS[g] ?? []).filter((q) => q.kind === 'number')
    expect(numeric('general')).toHaveLength(0)
    expect(numeric('lean').length).toBeGreaterThan(0)
    expect(numeric('strength').length).toBeGreaterThan(0)
  })

  it('turns what they typed into a target the plan can score', () => {
    const t = targetsFromAnswers('strength', { 'lift-target': '225' })
    expect(t).toEqual([{ label: 'Target lift', target: 225, unit: 'lb' }])
  })

  it('ignores an empty or junk box rather than inventing a target', () => {
    expect(targetsFromAnswers('strength', { 'lift-target': '' })).toEqual([])
    expect(targetsFromAnswers('strength', { 'lift-target': 'soon' })).toEqual([])
  })
})
