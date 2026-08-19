import { describe, expect, it } from 'vitest'
import { EXERCISES } from './exercises'
import { MISSING_CUES } from './cues'
import { speakable } from '../platform/speakable'
import { CUE_MAX } from './visuals.test'

// ============================================================
// The cue is the one line an athlete reads with a bar in their
// hands. 65 of 194 movements did not have one, and the reason
// nobody noticed is in data.test.ts: it checks steps, muscles,
// qualities, why, mistakes, a video query and a rest time, and
// never asks for a cue. A missing optional field is not a crash.
//
// These guards are the ones R10 s10.4 names. Each was fed a
// known-bad input and watched to fail before being trusted.
// ============================================================

const withCues = () => Object.values(EXERCISES).filter((e) => e.cue?.trim())
const cues = () => withCues().map((e) => ({ id: e.id, cue: e.cue as string }))

describe('every movement has something to say', () => {
  it('leaves no exercise without a cue', () => {
    // The guard that did not exist, which is why 65 could go missing.
    const silent = Object.values(EXERCISES)
      .filter((e) => !e.cue?.trim())
      .map((e) => e.id)
    expect(silent).toEqual([])
  })

  it('keeps exactly one home for any given cue', () => {
    // A def carries its own cue OR appears in MISSING_CUES. Both would
    // be a fork: two places to edit and one of them silently ignored.
    const doubled = Object.keys(MISSING_CUES).filter((id) => {
      const raw = Object.values(EXERCISES).find((e) => e.id === id)
      return raw === undefined
    })
    expect(doubled, 'MISSING_CUES names an exercise that does not exist').toEqual([])
    for (const [id, cue] of Object.entries(MISSING_CUES)) {
      expect(EXERCISES[id].cue, `${id} did not take its cue`).toBe(cue)
    }
  })
})

describe('a cue fits where it has to go', () => {
  it('fits the two-line box', () => {
    const over = cues().filter((c) => c.cue.length > CUE_MAX).map((c) => `${c.id}: ${c.cue.length} chars`)
    expect(over).toEqual([])
  })

  it('fits a breath, for the ones the coach says out loud', () => {
    // speech.ts estimates words / 2.8 seconds plus 0.7. Twelve words is
    // about five seconds, which is already the top of what somebody
    // wants read to them between sets.
    const wordy = cues()
      .map((c) => ({ ...c, words: c.cue.split(/\s+/).length }))
      .filter((c) => c.words > 12)
      .map((c) => `${c.id}: ${c.words} words`)
    expect(wordy).toEqual([])
  })

  it('survives the voice layer with no shorthand left in it', () => {
    // A synthesizer handed "3x8 @ 70%" says "three ex eight at seventy
    // percent sign". speakable() fixes that one, so testing for it
    // proves nothing: the first version of this guard checked exactly
    // the symbols speakable already expands and could never fail.
    //
    // What it does NOT fix is a digit glued to letters. `RPE` and the
    // rest are matched on a word boundary, so "RPE7" and "30s" go
    // through untouched and come out as "erpee seven" and "thirty ess".
    // That is the residue worth guarding, and it bites.
    const RESIDUE = /\d[a-z]|[a-z]\d|[@%×·§#^~|]|\\/i
    const noisy = cues()
      .filter((c) => RESIDUE.test(speakable(c.cue)))
      .map((c) => `${c.id}: "${c.cue}" becomes "${speakable(c.cue)}"`)
    expect(noisy).toEqual([])
  })
})

describe('a cue never claims to see anybody', () => {
  it('makes no observation about what the body is doing', () => {
    // BodyT has no camera and never will have one on the web. "Your
    // knees are caving in" is a diagnosis it cannot make. Telling
    // somebody where to aim is fine; telling them what they just did
    // wrong is not.
    const BODY = 'knee|knees|back|hips|shoulders|elbows|chest|heels|toes|spine|form'
    const OBSERVES = new RegExp(`your (${BODY}) (is|are|were|was|keep|keeps|look|looks)\\b`, 'i')
    const seen = cues().filter((c) => OBSERVES.test(c.cue)).map((c) => `${c.id}: "${c.cue}"`)
    expect(seen).toEqual([])
  })

  it('promises nobody that a cue prevents an injury', () => {
    // R10 is explicit: an injury-prevention claim needs a citation, and
    // a cue is the wrong surface for one either way.
    const CLAIMS = /(prevent|protect|avoid|stop|save)\w*\s+(you|your)?\s*\w*\s*(injur|hurt|pain|damage)/i
    const claimed = cues().filter((c) => CLAIMS.test(c.cue)).map((c) => `${c.id}: "${c.cue}"`)
    expect(claimed).toEqual([])
  })

  it('keeps the house copy rules', () => {
    const dashed = cues().filter((c) => c.cue.includes('—')).map((c) => c.id)
    expect(dashed).toEqual([])
  })
})
