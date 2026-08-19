import { describe, expect, it } from 'vitest'
import { buildFollowups, type GoalFollowup } from './followups'
// The harness is plain JS with no types, which is the point: this test
// reads exactly what the simulation reads, not a typed copy of it.
// @ts-expect-error - untyped .mjs, deliberately imported as-is
import { PERSONAS } from '../../scripts/personas.mjs'
import type { Goal } from '../types'

// ============================================================
// The simulation harness only proves something if what it feeds the
// generator is what a real person could have answered.
//
// R11 found the speed persona seeding `'sprint-feel': 'Smooth'` and
// `'speed-for': 'My sport'`. Neither is an option any question offers,
// and `speed-for` is not a question at all. A wrong value is not a
// crash: the branch behind it simply never fires, so 20 personas across
// 20 weeks of simulation ran without ever exercising the gentler tendon
// ramp for somebody who has not sprinted in years. Green suite, dead
// branch.
//
// It was worse than one persona. This guard, run for the first time,
// returned 11 keys that are not questions and 13 values not on offer,
// spread across nearly every persona in the file. Not one goal-answer
// branch in the generator had ever been simulated.
//
// goalAnswerKeys.test.ts walks src/ for reads of keys that do not
// exist. This is the other half: the harness's own answers, checked
// against the questions AND the options, per persona, because which
// questions exist depends on what else they answered.
// ============================================================

interface Persona {
  id: string
  answers: { goal: Goal; goalAnswers?: Record<string, string> }
}

/** The questions this persona would actually have been shown. */
function shownTo(p: Persona): Map<string, GoalFollowup> {
  const answers = p.answers.goalAnswers ?? {}
  const out = new Map<string, GoalFollowup>()
  // Twice: the second pass picks up branches the first pass's answers open.
  for (const pass of [{}, answers]) {
    for (const q of buildFollowups({ goal: p.answers.goal, answers: pass })) out.set(q.id, q)
  }
  return out
}

const ALL = PERSONAS as Persona[]

describe('the simulation answers what a human could answer', () => {
  it('finds the personas at all', () => {
    // If this import breaks, every check below silently passes on nothing.
    expect(ALL.length).toBeGreaterThan(9)
    expect(ALL.filter((p) => p.answers.goalAnswers).length).toBeGreaterThan(9)
  })

  it('never seeds a question the athlete was not asked', () => {
    const ghosts: string[] = []
    for (const p of ALL) {
      const asked = shownTo(p)
      for (const key of Object.keys(p.answers.goalAnswers ?? {})) {
        if (!asked.has(key)) ghosts.push(`${p.id} answers '${key}', which it was never asked`)
      }
    }
    expect(ghosts).toEqual([])
  })

  it('never seeds an option the question does not offer', () => {
    const wrong: string[] = []
    for (const p of ALL) {
      const asked = shownTo(p)
      for (const [key, value] of Object.entries(p.answers.goalAnswers ?? {})) {
        const q = asked.get(key)
        // A free-text or number answer can be anything they typed.
        if (q?.options && !q.options.includes(value)) {
          wrong.push(`${p.id} answers '${key}' with '${value}', which is not on offer`)
        }
      }
    }
    expect(wrong).toEqual([])
  })

  it('actually exercises the branch that started all this', () => {
    // The gentle tendon ramp. Before this commit no persona could reach
    // it, because the only speed persona answered a value that does not
    // exist. Asserted so the coverage cannot quietly go away again.
    const seeds = ALL.flatMap((p) => Object.entries(p.answers.goalAnswers ?? {}))
    expect(seeds).toContainEqual(['sprint-feel', 'It has been years'])
  })
})
