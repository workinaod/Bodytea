import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GOAL_FOLLOWUPS, buildFollowups, type GoalFollowup } from './followups'
import type { Goal } from '../types'

// ============================================================
// Answers the app reads have to be answers the app asks for.
//
// Two reads had drifted off their questions and nothing noticed, because a
// missing key is not a crash: `goalAnswers?.['speed-now']` is simply always
// undefined, so the branch behind it silently never runs.
//
//   generator.ts read 'speed-now' === 'Have not sprinted in years'
//   the question is  'sprint-feel' === 'It has been years'
//
// which meant an athlete who said their last flat-out run was years ago
// never got the gentler tendon ramp, under a comment promising that the
// plan "actually does it".
//
//   runs.ts read 'race-distance', the question is 'race-what'
//
// so picking Marathon from the list did nothing and only the goal sentence
// still worked. Its own test seeded the phantom key, so the suite was
// proving the bug rather than catching it.
//
// The existing dead-export guard covers engine/ and logic/ only, which is
// why plan/ hid these. This walks the source instead: every quoted key in a
// goalAnswers read, checked against the questions that exist.
// ============================================================

const SRC = new URL('..', import.meta.url).pathname

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const full = join(dir, f)
    if (statSync(full).isDirectory()) return walk(full)
    return /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) ? [full] : []
  })
}

/**
 * Every question id the interview can actually produce, asked of the real
 * builder rather than a list kept here. Walking each goal picks up the
 * universal questions and the branches, and seeding a sport picks up the
 * position question that only some sports open.
 */
function everyQuestion(): GoalFollowup[] {
  const goals = Object.keys(GOAL_FOLLOWUPS) as Goal[]
  const out: GoalFollowup[] = []
  for (const goal of goals) {
    out.push(...buildFollowups({ goal, answers: {} }))
    // Answers that open branch questions: a named sport opens the position
    // question, and the rest unlock their own follow-ups.
    out.push(...buildFollowups({ goal, answers: { sport: 'Soccer', 'race-what': 'Marathon', injuries: 'Knees', 'run-goal': 'A time I want' } }))
  }
  return out
}

function askedIds(): Set<string> {
  return new Set(everyQuestion().map((q) => q.id))
}

/** `goalAnswers?.['x']`, `goalAnswers['x']`, and `ans['x']` after a destructure. */
const READ = /goalAnswers\s*\??\.?\s*\[\s*'([a-z0-9-]+)'\s*\]/g

describe('goal answers', () => {
  it('every key the code reads is a question the interview asks', () => {
    const asked = askedIds()
    const strays: string[] = []
    for (const file of walk(SRC)) {
      const text = readFileSync(file, 'utf8')
      for (const m of text.matchAll(READ)) {
        if (!asked.has(m[1])) strays.push(`${file.slice(SRC.length)} reads '${m[1]}'`)
      }
    }
    expect(strays).toEqual([])
  })

  it('the two keys that had drifted are the real ones', () => {
    const asked = askedIds()
    expect(asked.has('sprint-feel')).toBe(true)
    expect(asked.has('race-what')).toBe(true)
    expect(asked.has('speed-now')).toBe(false)
    expect(asked.has('race-distance')).toBe(false)
  })

  it('the option the gentle ramp compares against is one the athlete can pick', () => {
    const qs = everyQuestion()
    const sprint = qs.find((q) => q.id === 'sprint-feel')
    const jump = qs.find((q) => q.id === 'jump-history')
    expect(sprint?.options).toContain('It has been years')
    expect(jump?.options).toContain('Never')
  })
})
