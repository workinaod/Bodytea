import { describe, expect, it } from 'vitest'
import type { SessionLog } from '../types'
import { quitCopy } from './quit'

function session(sets: boolean[][]): SessionLog {
  return {
    date: '2026-08-10',
    templateId: 't',
    status: 'partial',
    exercises: sets.map((done, i) => ({
      exerciseId: `e${i}`,
      sets: done.map((d) => ({ done: d, targetReps: '8-10', weightLb: 40 })),
    })),
  } as SessionLog
}

describe('quitting mid-session', () => {
  it('at zero sets it says skipped, not "log what is done"', () => {
    const c = quitCopy(session([[false, false], [false, false]]))
    expect(c.go).toMatch(/skipped/i)
    expect(c.go).not.toMatch(/save/i) // there is nothing to save
    expect(c.body).toMatch(/nothing to save/i)
  })

  it('at zero sets it names the streak that is about to die', () => {
    expect(quitCopy(session([[false]]), 23).body).toContain('23 day streak')
  })

  it('with no streak it does not invent one', () => {
    const body = quitCopy(session([[false]]), 0).body
    expect(body).not.toMatch(/streak/i)
  })

  it('with work in, it counts the sets and grades them', () => {
    const c = quitCopy(session([[true, true, true, true], [false, false, false, false]]))
    expect(c.body).toContain('4 of 8 sets done')
    expect(c.body).toContain('the other 4')
    expect(c.go).toContain('4 sets')
    expect(c.body).not.toMatch(/skipped/i)
  })

  it('a skipped exercise is not counted against you', () => {
    const s = session([[true], [false, false]])
    s.exercises[1].skipped = true
    expect(quitCopy(s).body).toContain('1 of 1 sets')
  })

  it('says it in words a tired person can parse', () => {
    // "Ending now grades the day light, not a completion" shipped, and
    // the owner said plainly that they could not tell what it meant.
    const c = quitCopy(session([[true, false]]))
    for (const line of [c.title, c.body, c.stay, c.go]) {
      expect(line, `jargon in: ${line}`).not.toMatch(/grade|completion|partial session|downgrade/i)
    }
  })

  it('never uses an em dash', () => {
    for (const c of [quitCopy(session([[false]]), 9), quitCopy(session([[true, false]]))]) {
      for (const line of [c.title, c.body, c.stay, c.go]) expect(line).not.toContain('—')
    }
  })
})
