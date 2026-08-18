import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { MIN_AGE } from './MeStep'
import { emptyAppData } from '../../types'
import { parseEnvelope, serializeState } from '../../store/backup'

// ============================================================
// The minimum, and the shape of how it is said.
//
// The research pack that raised this recommended eighteen and a gate.
// The owner set it at eleven and asked for no gate: say it to the person
// it is about, at the moment they type a number below it, and let them
// carry on. So the thing worth pinning is not just the number. It is
// that the number never turns into a wall, a terms screen, or a sentence
// shown to somebody it does not concern.
// ============================================================

const HERE = import.meta.dirname
const meStep = readFileSync(join(HERE, 'MeStep.tsx'), 'utf8')

describe('the minimum age', () => {
  it('is eleven', () => {
    expect(MIN_AGE).toBe(11)
  })

  it('is said only when the number typed is under it', () => {
    // The line lives behind `tooYoung`, which is the age being below the
    // minimum. If it ever renders unconditionally, everybody gets told.
    expect(meStep).toMatch(/const tooYoung = age !== null && age < MIN_AGE/)
    expect(meStep).toMatch(/\{tooYoung && \(/)
  })

  it('never blocks the next button', () => {
    // The owner's call, and the whole point: a number under the minimum
    // is a thing the app mentions, not a thing it stops you for. If
    // `tooYoung` ever reaches `ready`, this is a gate and not a notice.
    const ready = meStep.match(/const ready = (.+)/)![1]
    expect(ready).not.toContain('tooYoung')
    expect(ready).not.toContain('MIN_AGE')
    expect(ready).toContain('age !== null')
  })

  it('states the number rather than hardcoding it into the sentence', () => {
    // Two places to change a minimum is one place to forget.
    expect(meStep).toMatch(/built for \{MIN_AGE\} and up/)
  })

  it("says it in the app's voice: short, no jargon, no dash", () => {
    const line = meStep.match(/BodyT is built for [^<]+/)![0]
    expect(line).not.toMatch(/—/)
    expect(line.length).toBeLessThan(120)
  })
})

describe('the age itself', () => {
  it('survives a save and a reload', () => {
    // A field collected and then lost on the next launch is the failure
    // this repo keeps finding. Round-trip it through the real envelope.
    const d = emptyAppData('2026-08-10', '2026-08-10')
    d.settings.onboarded = true
    d.profile.age = 11
    const back = parseEnvelope(serializeState(d))
    expect(back.data.profile.age).toBe(11)
  })

  it('parses an envelope written before the question existed', () => {
    // Optional, so no migration and no wiped account.
    const d = emptyAppData('2026-08-10', '2026-08-10')
    d.settings.onboarded = true
    expect(parseEnvelope(serializeState(d)).data.profile.age).toBeUndefined()
  })
})
